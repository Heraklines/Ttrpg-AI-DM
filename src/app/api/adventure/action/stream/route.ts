import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { orchestrator } from '@/lib/ai/orchestrator';
import type { Character, Combat } from '@/lib/engine/types';

const ActionSchema = z.object({
  campaignId: z.string().uuid(),
  playerInput: z.string().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      function sendError(code: string, message: string) {
        sendEvent('error', { code, message });
        controller.close();
      }

      try {
        const body = await request.json();
        const parsed = ActionSchema.safeParse(body);

        if (!parsed.success) {
          sendError('VALIDATION_FAILED', 'Invalid input');
          return;
        }

        const { campaignId, playerInput } = parsed.data;

        sendEvent('status', { phase: 'loading', message: 'Loading campaign...' });

        const campaign = await prisma.campaign.findUnique({
          where: { id: campaignId },
          include: {
            characters: true,
            gameState: true,
          },
        });

        if (!campaign || !campaign.gameState) {
          sendError('NOT_FOUND', 'Campaign not found');
          return;
        }

        const gameState = campaign.gameState;

        sendEvent('status', { phase: 'thinking', message: 'The Dungeon Master considers your action...' });

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

        let activeCombat: Combat | null = null;
        if (gameState.activeCombat) {
          try {
            activeCombat = JSON.parse(gameState.activeCombat);
          } catch {
            activeCombat = null;
          }
        }

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

        sendEvent('status', { phase: 'processing', message: 'Rolling dice and resolving mechanics...' });

        const result = await orchestrator.processAction(playerInput, orchestratorContext);

        if (result.functionResults.length > 0) {
          sendEvent('dice', result.functionResults);
        }

        sendEvent('status', { phase: 'narrating', message: 'Crafting the narrative...' });

        // Stream the narrative in chunks for better UX
        const words = result.narrative.split(' ');
        const chunkSize = 10;
        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(' ');
          sendEvent('chunk', { text: chunk + (i + chunkSize < words.length ? ' ' : '') });
          await new Promise((r) => setTimeout(r, 50)); // Small delay for streaming effect
        }

        sendEvent('status', { phase: 'saving', message: 'Updating game state...' });

        // Apply state updates
        const { characterUpdates, combatUpdate, modeChange } = result.stateUpdates;

        for (const [charId, updates] of Object.entries(characterUpdates)) {
          const updateData: Record<string, unknown> = {};
          if (updates.currentHp !== undefined) updateData.currentHp = updates.currentHp;
          if (updates.tempHp !== undefined) updateData.tempHp = updates.tempHp;
          if (updates.conditions !== undefined) updateData.conditions = JSON.stringify(updates.conditions);
          
          if (Object.keys(updateData).length > 0) {
            await prisma.character.update({
              where: { id: charId },
              data: updateData,
            });
          }
        }

        const gameStateUpdate: Record<string, unknown> = {};
        const recentMessages = JSON.parse(gameState.recentMessages || '[]');
        recentMessages.push({ role: 'user', content: playerInput, timestamp: Date.now() });
        recentMessages.push({ role: 'assistant', content: result.narrative, timestamp: Date.now() });
        gameStateUpdate.recentMessages = JSON.stringify(recentMessages.slice(-20));

        if (combatUpdate !== undefined) {
          gameStateUpdate.activeCombat = combatUpdate ? JSON.stringify(combatUpdate) : null;
        }

        if (modeChange) {
          gameStateUpdate.mode = modeChange;
        }

        await prisma.gameState.update({
          where: { id: gameState.id },
          data: gameStateUpdate,
        });

        sendEvent('complete', {
          narrative: result.narrative,
          gameState: {
            mode: modeChange || gameState.mode,
            gameDay: gameState.gameDay,
            gameHour: gameState.gameHour,
            gameMinute: gameState.gameMinute,
          },
          warnings: result.warnings.length > 0 ? result.warnings : undefined,
        });

        controller.close();
      } catch (error) {
        console.error('Streaming adventure action failed:', error);
        sendError('AI_ERROR', error instanceof Error ? error.message : 'Failed to process action');
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
