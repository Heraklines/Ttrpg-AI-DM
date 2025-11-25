import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { combatEngine } from '@/lib/engine/combat-engine';
import type { Combat } from '@/lib/engine/types';

const NextTurnSchema = z.object({
  campaignId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = NextTurnSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid input', details: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const { campaignId } = parsed.data;

    // Load game state
    const gameState = await prisma.gameState.findUnique({
      where: { campaignId },
    });

    if (!gameState || !gameState.activeCombat) {
      return NextResponse.json(
        { error: { code: 'NOT_IN_COMBAT', message: 'No active combat' } },
        { status: 400 }
      );
    }

    // Parse current combat state
    const combat: Combat = JSON.parse(gameState.activeCombat);

    if (!combat.active) {
      return NextResponse.json(
        { error: { code: 'COMBAT_ENDED', message: 'Combat has already ended' } },
        { status: 400 }
      );
    }

    // Advance to next turn
    const updatedCombat = combatEngine.nextTurn(combat);

    // Check if combat should end
    const endCheck = combatEngine.checkCombatEnd(updatedCombat);
    if (endCheck.shouldEnd) {
      const { combat: endedCombat, xpAwarded } = combatEngine.endCombat(updatedCombat, endCheck.outcome!);

      await prisma.gameState.update({
        where: { id: gameState.id },
        data: {
          mode: 'exploration',
          activeCombat: JSON.stringify(endedCombat),
        },
      });

      return NextResponse.json({
        combatEnded: true,
        outcome: endCheck.outcome,
        xpAwarded,
        message: `Combat ended: ${endCheck.outcome}! ${xpAwarded > 0 ? `Party earned ${xpAwarded} XP.` : ''}`,
      });
    }

    // Save updated combat state
    await prisma.gameState.update({
      where: { id: gameState.id },
      data: {
        activeCombat: JSON.stringify(updatedCombat),
      },
    });

    const currentCombatant = updatedCombat.initiativeOrder[updatedCombat.currentTurnIndex];

    return NextResponse.json({
      combatEnded: false,
      round: updatedCombat.round,
      currentTurn: {
        id: currentCombatant.id,
        name: currentCombatant.name,
        type: currentCombatant.type,
        hp: currentCombatant.currentHp,
        maxHp: currentCombatant.maxHp,
      },
      initiativeOrder: updatedCombat.initiativeOrder.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        initiative: c.initiative,
        hp: c.currentHp,
        maxHp: c.maxHp,
        status: c.status,
      })),
      message: `Round ${updatedCombat.round}. ${currentCombatant.name}'s turn.`,
    });
  } catch (error) {
    console.error('Next turn failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to advance turn' } },
      { status: 500 }
    );
  }
}
