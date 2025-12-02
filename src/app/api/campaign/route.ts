import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { loreGenerationQueue, loreGenerationService } from '@/lib/lore';

const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        characters: {
          select: {
            id: true,
            name: true,
            race: true,
            className: true,
            level: true,
            currentHp: true,
            maxHp: true,
          },
        },
      },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch campaigns' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateCampaignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid input', details: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        gameState: {
          create: {
            mode: 'exploration',
            gameDay: 1,
            gameHour: 8,
            gameMinute: 0,
          },
        },
      },
      include: {
        gameState: true,
        characters: {
          select: {
            id: true,
            name: true,
            race: true,
            className: true,
            level: true,
            currentHp: true,
            maxHp: true,
          },
        },
      },
    });

    // Auto-trigger lore generation if description is substantial (>= 50 chars)
    if (parsed.data.description && parsed.data.description.length >= 50) {
      // Enqueue and start generation asynchronously (don't block response)
      loreGenerationQueue.enqueue(campaign.id).then(async (result) => {
        if (result.success && !result.alreadyExists) {
          console.log(`Starting lore generation for campaign ${campaign.id}`);
          // Run generation in background
          loreGenerationService.generateLore(campaign.id).then((genResult) => {
            if (genResult.success) {
              console.log(`Lore generation completed for campaign ${campaign.id}`);
            } else {
              console.error(`Lore generation failed for campaign ${campaign.id}:`, genResult.error);
            }
          });
        }
      });
    }

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Failed to create campaign:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create campaign' } },
      { status: 500 }
    );
  }
}
