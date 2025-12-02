import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const safeParseArray = (value: unknown) => {
  if (!value || typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

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

    const [factions, npcs, locations, conflicts, secrets, history, cosmology] = await Promise.all([
      prisma.worldFaction.count({ where: { worldSeedId } }),
      prisma.worldNpc.count({ where: { worldSeedId } }),
      prisma.worldLocation.count({ where: { worldSeedId } }),
      prisma.worldConflict.count({ where: { worldSeedId } }),
      prisma.worldSecret.count({ where: { worldSeedId } }),
      prisma.worldHistory.findUnique({ where: { worldSeedId } }),
      prisma.worldCosmology.findUnique({ where: { worldSeedId } }),
    ]);

    const historyEras = history ? safeParseArray(history.eras) : [];
    const historyEvents = history ? safeParseArray(history.majorEvents) : [];
    const pantheon = cosmology ? safeParseArray(cosmology.pantheon) : [];

    return NextResponse.json({
      success: true,
      counts: {
        geography: locations,
        factions,
        people: npcs,
        history: historyEras.length + historyEvents.length,
        conflicts,
        cosmology: pantheon.length + (cosmology ? 1 : 0),
        secrets,
      },
    });
  } catch (error) {
    console.error('Fetch lore counts error:', error);
    return NextResponse.json({ error: 'Failed to fetch counts' }, { status: 500 });
  }
}
