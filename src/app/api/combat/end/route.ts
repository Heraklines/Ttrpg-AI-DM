import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { combatEngine } from '@/lib/engine/combat-engine';
import type { Combat, CombatOutcome } from '@/lib/engine/types';

const EndCombatSchema = z.object({
  campaignId: z.string().uuid(),
  outcome: z.enum(['victory', 'defeat', 'fled', 'negotiated']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = EndCombatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid input', details: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const { campaignId, outcome } = parsed.data;

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

    // End combat
    const { combat: endedCombat, xpAwarded } = combatEngine.endCombat(combat, outcome as CombatOutcome);

    // Update game state
    await prisma.gameState.update({
      where: { id: gameState.id },
      data: {
        mode: 'exploration',
        activeCombat: JSON.stringify(endedCombat),
      },
    });

    return NextResponse.json({
      success: true,
      outcome,
      xpAwarded,
      message: `Combat ended: ${outcome}. ${xpAwarded > 0 ? `Party earned ${xpAwarded} XP!` : ''}`,
    });
  } catch (error) {
    console.error('End combat failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to end combat' } },
      { status: 500 }
    );
  }
}
