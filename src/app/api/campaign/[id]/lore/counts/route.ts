import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const worldSeedId = searchParams.get('worldSeedId');
    
    if (!worldSeedId) {
      return NextResponse.json({ error: 'worldSeedId required' }, { status: 400 });
    }

    const [factions, npcs, locations, conflicts, secrets] = await Promise.all([
      prisma.worldFaction.count({ where: { worldSeedId } }),
      prisma.worldNpc.count({ where: { worldSeedId } }),
      prisma.worldLocation.count({ where: { worldSeedId } }),
      prisma.worldConflict.count({ where: { worldSeedId } }),
      prisma.worldSecret.count({ where: { worldSeedId } }),
    ]);

    return NextResponse.json({
      success: true,
      counts: {
        geography: locations,
        factions,
        people: npcs,
        history: 0,
        conflicts,
        cosmology: 1,
        secrets,
      },
    });
  } catch (error) {
    console.error('Fetch lore counts error:', error);
    return NextResponse.json({ error: 'Failed to fetch counts' }, { status: 500 });
  }
}
