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

      case 'history': {
        const history = await prisma.worldHistory.findUnique({
          where: { worldSeedId },
        });

        if (history) {
          const eras = safeParseArray(history.eras);
          const majorEvents = safeParseArray(history.majorEvents);

          const eraEntities = eras.map((era: Record<string, unknown>, index: number) => ({
            id: `history:${history.id}:era:${index}`,
            name: (era.name as string) || `Era ${index + 1}`,
            tier: (era.tier as string) || 'major',
            type: 'era',
            isDiscovered: true,
          }));

          const eventEntities = majorEvents.map((evt: Record<string, unknown>, index: number) => ({
            id: `history:${history.id}:event:${index}`,
            name: (evt.name as string) || (evt.title as string) || `Event ${index + 1}`,
            tier: (evt.tier as string) || 'supporting',
            type: (evt.type as string) || 'event',
            isDiscovered: true,
          }));

          entities = [...eraEntities, ...eventEntities];
        }
        break;
      }

      case 'cosmology': {
        const cosmology = await prisma.worldCosmology.findUnique({
          where: { worldSeedId },
        });

        if (cosmology) {
          const pantheon = safeParseArray(cosmology.pantheon);

          const deityEntities = pantheon.map((deity: Record<string, unknown>, index: number) => ({
            id: `cosmology:${cosmology.id}:deity:${index}`,
            name: (deity.name as string) || `Deity ${index + 1}`,
            tier: (deity.tier as string) || 'major',
            type: (deity.domain as string) || 'deity',
            isDiscovered: true,
          }));

          const systemEntity = {
            id: `cosmology:${cosmology.id}:magic`,
            name: 'Magic & Planes',
            tier: 'major',
            type: 'system',
            isDiscovered: true,
          };

          entities = [...deityEntities, systemEntity];
        }
        break;
      }

      default:
        return NextResponse.json({ entities: [] });
    }

    return NextResponse.json({ success: true, entities });
  } catch (error) {
    console.error('Fetch lore error:', error);
    return NextResponse.json({ error: 'Failed to fetch lore' }, { status: 500 });
  }
}
