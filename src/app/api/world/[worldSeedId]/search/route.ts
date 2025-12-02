import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { worldSeedId: string } }
) {
  try {
    const { worldSeedId } = params;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const searchType = searchParams.get('type') || 'name';
    const filter = searchParams.get('filter') || 'all';
    const mode = searchParams.get('mode') || 'dm';

    const results: Array<{
      id: string;
      type: string;
      name: string;
      description: string;
      tier: string;
      matchReason?: string;
    }> = [];

    const discoveryFilter = mode === 'player' ? { isDiscovered: true } : {};

    if (filter === 'all' || filter === 'faction') {
      const factions = await prisma.worldFaction.findMany({
        where: {
          worldSeedId,
          name: { contains: query },
          ...discoveryFilter,
        },
        take: 10,
      });
      factions.forEach((f) => {
        results.push({
          id: f.id,
          type: 'faction',
          name: f.name,
          description: f.publicImage || f.philosophy || '',
          tier: f.tier,
        });
      });
    }

    if (filter === 'all' || filter === 'npc') {
      const npcs = await prisma.worldNpc.findMany({
        where: {
          worldSeedId,
          name: { contains: query },
          ...discoveryFilter,
        },
        take: 10,
      });
      npcs.forEach((n) => {
        results.push({
          id: n.id,
          type: 'npc',
          name: n.name,
          description: n.publicGoal || n.occupation || '',
          tier: n.tier,
        });
      });
    }

    if (filter === 'all' || filter === 'location') {
      const locations = await prisma.worldLocation.findMany({
        where: {
          worldSeedId,
          name: { contains: query },
          ...discoveryFilter,
        },
        take: 10,
      });
      locations.forEach((l) => {
        results.push({
          id: l.id,
          type: 'location',
          name: l.name,
          description: l.description || l.atmosphere || '',
          tier: l.tier,
        });
      });
    }

    if (filter === 'all' || filter === 'conflict') {
      const conflicts = await prisma.worldConflict.findMany({
        where: {
          worldSeedId,
          name: { contains: query },
          ...discoveryFilter,
        },
        take: 10,
      });
      conflicts.forEach((c) => {
        results.push({
          id: c.id,
          type: 'conflict',
          name: c.name,
          description: c.publicNarrative || c.stakes || '',
          tier: c.tier,
        });
      });
    }

    results.sort((a, b) => {
      const tierOrder: Record<string, number> = { major: 0, supporting: 1, minor: 2 };
      return (tierOrder[a.tier] || 2) - (tierOrder[b.tier] || 2);
    });

    return NextResponse.json({ success: true, results: results.slice(0, 20) });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
