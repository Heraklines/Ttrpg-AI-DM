import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { orchestrator } from '@/lib/ai/orchestrator';
import type { Character, Combat } from '@/lib/engine/types';

const ActionSchema = z.object({
  campaignId: z.string().uuid(),
  playerInput: z.string().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid input', details: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const { campaignId, playerInput } = parsed.data;

    // Load campaign with characters and game state
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        characters: true,
        gameState: true,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    if (!campaign.gameState) {
      return NextResponse.json(
        { error: { code: 'INVALID_STATE', message: 'Campaign has no game state' } },
        { status: 400 }
      );
    }

    const gameState = campaign.gameState;

    // Convert database characters to Character type
    const characters: Character[] = campaign.characters.map((c) => ({
      id: c.id,
      campaignId: c.campaignId || '',
      name: c.name,
      race: c.race,
      className: c.className,
      level: c.level,
      abilityScores: {
        strength: c.strength,
        dexterity: c.dexterity,
        constitution: c.constitution,
        intelligence: c.intelligence,
        wisdom: c.wisdom,
        charisma: c.charisma,
      },
      maxHp: c.maxHp,
      currentHp: c.currentHp,
      tempHp: c.tempHp,
      armorClass: c.armorClass,
      speed: c.speed,
      hitDiceType: c.hitDiceType as 6 | 8 | 10 | 12,
      hitDiceRemaining: c.hitDiceRemaining,
      deathSaveSuccesses: c.deathSaveSuccesses,
      deathSaveFailures: c.deathSaveFailures,
      savingThrowProficiencies: JSON.parse(c.savingThrowProficiencies || '[]'),
      skillProficiencies: JSON.parse(c.skillProficiencies || '[]'),
      skillExpertise: JSON.parse(c.skillExpertise || '[]'),
      spellSlots: JSON.parse(c.spellSlots || '{}'),
      knownSpells: JSON.parse(c.knownSpells || '[]'),
      preparedSpells: JSON.parse(c.preparedSpells || '[]'),
      classResources: JSON.parse(c.classResources || '[]'),
      inventory: JSON.parse(c.inventory || '[]'),
      equippedItems: JSON.parse(c.equippedItems || '{}'),
      gold: c.gold,
      conditions: JSON.parse(c.conditions || '[]'),
      features: JSON.parse(c.features || '[]'),
      backstory: c.backstory || undefined,
    }));

    // Parse combat if exists
    let activeCombat: Combat | null = null;
    if (gameState.activeCombat) {
      try {
        activeCombat = JSON.parse(gameState.activeCombat);
      } catch {
        activeCombat = null;
      }
    }

    // Build orchestrator context
    const orchestratorContext = {
      campaignId,
      campaignName: campaign.name,
      campaignDescription: campaign.description,
      characters,
      gameState: {
        mode: gameState.mode,
        gameDay: gameState.gameDay,
        gameHour: gameState.gameHour,
        gameMinute: gameState.gameMinute,
        activeCombat,
        recentMessages: JSON.parse(gameState.recentMessages || '[]'),
      },
    };

    // Process through orchestrator
    const result = await orchestrator.processAction(playerInput, orchestratorContext);

    // Apply state updates
    const { characterUpdates, combatUpdate, modeChange } = result.stateUpdates;

    // Update characters if needed
    for (const [charId, updates] of Object.entries(characterUpdates)) {
      const updateData: Record<string, unknown> = {};
      if (updates.currentHp !== undefined) updateData.currentHp = updates.currentHp;
      if (updates.tempHp !== undefined) updateData.tempHp = updates.tempHp;
      if (updates.hitDiceRemaining !== undefined) updateData.hitDiceRemaining = updates.hitDiceRemaining;
      if (updates.conditions !== undefined) updateData.conditions = JSON.stringify(updates.conditions);
      if (updates.inventory !== undefined) updateData.inventory = JSON.stringify(updates.inventory);
      if (updates.gold !== undefined) updateData.gold = updates.gold;
      if (updates.spellSlots !== undefined) updateData.spellSlots = JSON.stringify(updates.spellSlots);
      if (updates.classResources !== undefined) updateData.classResources = JSON.stringify(updates.classResources);
      if (updates.equippedItems !== undefined) updateData.equippedItems = JSON.stringify(updates.equippedItems);
      
      if (Object.keys(updateData).length > 0) {
        await prisma.character.update({
          where: { id: charId },
          data: updateData,
        });
      }
    }

    // Update game state
    const gameStateUpdate: Record<string, unknown> = {};
    
    // Update recent messages
    const recentMessages = JSON.parse(gameState.recentMessages || '[]');
    recentMessages.push({ role: 'user', content: playerInput, timestamp: Date.now() });
    recentMessages.push({ role: 'assistant', content: result.narrative, timestamp: Date.now() });
    gameStateUpdate.recentMessages = JSON.stringify(recentMessages.slice(-20));

    // Update combat if changed
    if (combatUpdate !== undefined) {
      gameStateUpdate.activeCombat = combatUpdate ? JSON.stringify(combatUpdate) : null;
    }

    // Update mode if changed
    if (modeChange) {
      gameStateUpdate.mode = modeChange;
    }

    // Check for location changes from function results - use structured result data
    const locationChange = result.functionResults.find(
      (r) => r.name === 'set_location'
    );
    if (locationChange && typeof locationChange.result === 'object' && locationChange.result !== null) {
      const locResult = locationChange.result as { locationName?: string };
      if (locResult.locationName) {
        gameStateUpdate.currentLocationId = locResult.locationName;
      }
    }

    await prisma.gameState.update({
      where: { id: gameState.id },
      data: gameStateUpdate,
    });

    return NextResponse.json({
      narrative: result.narrative,
      diceRolls: result.functionResults.length > 0 ? result.functionResults : undefined,
      gameState: {
        mode: modeChange || gameState.mode,
        gameDay: gameState.gameDay,
        gameHour: gameState.gameHour,
        gameMinute: gameState.gameMinute,
      },
      warnings: result.warnings.length > 0 ? result.warnings : undefined,
    });
  } catch (error) {
    console.error('Adventure action failed:', error);
    return NextResponse.json(
      {
        error: {
          code: 'AI_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process action',
        },
      },
      { status: 500 }
    );
  }
}
