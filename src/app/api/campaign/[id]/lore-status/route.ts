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

    const job = await loreGenerationQueue.getStatus(campaignId);

    if (!job) {
      return NextResponse.json({
        status: 'not_started',
        message: 'Lore generation has not been initiated for this campaign'
      });
    }

    // Get summary counts if completed
    let summary = null;
    if (job.status === 'completed') {
      const lore = await prisma.campaignLore.findUnique({
        where: { campaignId },
        include: {
          _count: {
            select: {
              npcs: true,
              factions: true,
              locations: true,
              conflicts: true,
              secrets: true
            }
          }
        }
      });

      if (lore) {
        summary = {
          worldName: lore.worldName,
          tone: lore.tone,
          npcs: lore._count.npcs,
          factions: lore._count.factions,
          locations: lore._count.locations,
          conflicts: lore._count.conflicts,
          secrets: lore._count.secrets
        };
      }
    }

    return NextResponse.json({
      status: job.status,
      phase: job.phase,
      error: job.error,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
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
