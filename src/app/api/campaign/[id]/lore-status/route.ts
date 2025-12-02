// src/app/api/campaign/[id]/lore-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loreGenerationQueue } from '@/lib/lore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    // Check the generation queue first
    const job = await loreGenerationQueue.getStatus(campaignId);

    // Also check the WorldSeed directly for status
    const worldSeed = await prisma.worldSeed.findUnique({
      where: { campaignId },
      include: {
        _count: {
          select: {
            factions: true,
            npcs: true,
            locations: true,
            conflicts: true,
            secrets: true,
          }
        }
      }
    });

    // If no job and no worldSeed, not started
    if (!job && !worldSeed) {
      return NextResponse.json({
        status: 'not_started',
        message: 'Lore generation has not been initiated for this campaign'
      });
    }

    // Determine status from worldSeed if available
    let status = job?.status || 'not_started';
    let phase = job?.phase || worldSeed?.currentPhase;
    
    if (worldSeed) {
      if (worldSeed.generationStatus === 'completed') {
        status = 'completed';
      } else if (worldSeed.generationStatus === 'generating') {
        status = 'generating';
      } else if (worldSeed.generationStatus === 'failed') {
        status = 'failed';
      } else if (worldSeed.generationStatus === 'pending') {
        status = 'pending';
      }
      phase = worldSeed.currentPhase || phase;
    }

    // Build summary if completed
    let summary = null;
    if (status === 'completed' && worldSeed) {
      summary = {
        worldName: worldSeed.name,
        tone: worldSeed.tone,
        factions: worldSeed._count.factions,
        npcs: worldSeed._count.npcs,
        locations: worldSeed._count.locations,
        conflicts: worldSeed._count.conflicts,
        secrets: worldSeed._count.secrets,
      };
    }

    return NextResponse.json({
      status,
      phase,
      error: worldSeed?.generationError || job?.error,
      startedAt: job?.startedAt,
      completedAt: job?.completedAt,
      summary
    });

  } catch (error) {
    console.error('Error fetching lore status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lore status' },
      { status: 500 }
    );
  }
}
