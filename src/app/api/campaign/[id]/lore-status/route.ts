// src/app/api/campaign/[id]/lore-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loreGenerationQueue } from '@/lib/lore';

const MIN_DESCRIPTION_LENGTH = 50;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    // First, get the campaign to check its description
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, description: true, name: true }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

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

    // If no job and no worldSeed, determine why not started
    if (!job && !worldSeed) {
      // Check if description is too short
      const descLength = campaign.description?.trim().length || 0;
      
      if (descLength === 0) {
        return NextResponse.json({
          status: 'not_started',
          reason: 'no_description',
          message: 'No world description provided. Add a description to enable world generation.',
          descriptionLength: 0,
          minRequired: MIN_DESCRIPTION_LENGTH
        });
      } else if (descLength < MIN_DESCRIPTION_LENGTH) {
        return NextResponse.json({
          status: 'not_started',
          reason: 'description_too_short',
          message: `Description is ${descLength} characters. Need at least ${MIN_DESCRIPTION_LENGTH} for world generation.`,
          descriptionLength: descLength,
          minRequired: MIN_DESCRIPTION_LENGTH,
          charsNeeded: MIN_DESCRIPTION_LENGTH - descLength
        });
      } else {
        // Description is sufficient but generation hasn't been triggered
        return NextResponse.json({
          status: 'not_started',
          reason: 'ready',
          message: 'World description is ready. Click "Generate World Lore" to begin.',
          descriptionLength: descLength,
          minRequired: MIN_DESCRIPTION_LENGTH
        });
      }
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
