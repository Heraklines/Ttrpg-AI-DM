import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const worldSeedId = searchParams.get('worldSeedId');
    
    if (!worldSeedId) {
      return NextResponse.json({ error: 'worldSeedId required' }, { status: 400 });
    }

    let entities: { id: string; name: string; tier: string; type?: string; isDiscovered: boolean }[] = [];

    switch (category) {
      case 'factions':
        const factions = await prisma.worldFaction.findMany({
          where: { worldSeedId },
          select: { id: true, name: true, tier: true, type: true, isDiscovered: true },
          orderBy: [{ tier: 'asc' }, { name: 'asc' }],
        });
        entities = factions;
        break;

      case 'people':
        const npcs = await prisma.worldNpc.findMany({
          where: { worldSeedId },
          select: { id: true, name: true, tier: true, occupation: true, isDiscovered: true },
          orderBy: [{ tier: 'asc' }, { name: 'asc' }],
        });
        entities = npcs.map((n) => ({ ...n, type: n.occupation || undefined }));
        break;

      case 'geography':
        const locations = await prisma.worldLocation.findMany({
          where: { worldSeedId },
          select: { id: true, name: true, tier: true, type: true, isDiscovered: true },
          orderBy: [{ tier: 'asc' }, { name: 'asc' }],
        });
        entities = locations;
        break;

      case 'conflicts':
        const conflicts = await prisma.worldConflict.findMany({
          where: { worldSeedId },
          select: { id: true, name: true, tier: true, type: true, isDiscovered: true },
          orderBy: [{ tier: 'asc' }, { name: 'asc' }],
        });
        entities = conflicts;
        break;

      case 'secrets':
        const secrets = await prisma.worldSecret.findMany({
          where: { worldSeedId },
          select: { id: true, name: true, tier: true, type: true, isRevealed: true },
          orderBy: [{ tier: 'asc' }, { name: 'asc' }],
        });
        entities = secrets.map((s) => ({ ...s, isDiscovered: s.isRevealed }));
        break;

      default:
        return NextResponse.json({ entities: [] });
    }

    return NextResponse.json({ success: true, entities });
  } catch (error) {
    console.error('Fetch lore error:', error);
    return NextResponse.json({ error: 'Failed to fetch lore' }, { status: 500 });
  }
}
