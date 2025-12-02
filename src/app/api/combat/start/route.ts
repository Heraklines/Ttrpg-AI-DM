import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { combatEngine } from '@/lib/engine/combat-engine';
import type { MonsterStatBlock } from '@/lib/engine/types';

const StartCombatSchema = z.object({
  campaignId: z.string().uuid(),
  enemies: z.array(z.object({
    name: z.string(),
    hp: z.number().int().positive(),
    ac: z.number().int().positive(),
    dexterity: z.number().int().min(1).max(30).default(10),
    count: z.number().int().positive().default(1),
  })),
  surprisedIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = StartCombatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid input', details: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const { campaignId, enemies, surprisedIds } = parsed.data;

    // Load campaign with characters
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        characters: true,
        gameState: true,
      },
    });

    if (!campaign || !campaign.gameState) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    // Convert characters to combat format
    const playerCharacters = campaign.characters.map((c) => ({
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
      hitDiceType: c.hitDiceType,
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
    }));

    // Convert enemies to monster stat blocks
    const enemyStatBlocks = enemies.map((e) => ({
      statBlock: {
        name: e.name,
        size: 'Medium',
        type: 'humanoid',
        alignment: 'neutral',
        armorClass: e.ac,
        hitPoints: e.hp,
        hitDice: `${Math.ceil(e.hp / 5)}d8`,
        speed: { walk: 30 },
        abilityScores: {
          strength: 10,
          dexterity: e.dexterity,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
        challengeRating: 0.25,
        xp: 50,
        actions: [],
      } as MonsterStatBlock,
      count: e.count,
    }));

    // Start combat using the engine
    const combat = combatEngine.startCombat({
      playerCharacters,
      enemies: enemyStatBlocks,
      surprisedIds,
    });

    // Update game state with combat
    await prisma.gameState.update({
      where: { id: campaign.gameState.id },
      data: {
        mode: 'combat',
        activeCombat: JSON.stringify(combat),
      },
    });

    // Build initiative order display
    const initiativeOrder = combat.initiativeOrder.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      initiative: c.initiative,
      hp: c.currentHp,
      maxHp: c.maxHp,
      ac: c.armorClass,
      status: c.status,
    }));

    return NextResponse.json({
      combat: {
        id: combat.id,
        round: combat.round,
        currentTurn: combat.initiativeOrder[combat.currentTurnIndex]?.name,
        initiativeOrder,
      },
      message: `Combat started! Round ${combat.round}. ${combat.initiativeOrder[0]?.name}'s turn.`,
    });
  } catch (error) {
    console.error('Start combat failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to start combat' } },
      { status: 500 }
    );
  }
}
