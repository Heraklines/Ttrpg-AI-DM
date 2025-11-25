import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { diceEngine } from '@/lib/engine/dice-engine';

const RollDiceSchema = z.object({
  notation: z.string().regex(/^\d+d\d+([+-]\d+)?$/i, 'Invalid dice notation'),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RollDiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid input', details: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const result = diceEngine.roll(parsed.data.notation, parsed.data.reason);

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Failed to roll dice:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to roll dice' } },
      { status: 500 }
    );
  }
}
