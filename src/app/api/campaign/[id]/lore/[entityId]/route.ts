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

const safeParseObject = (value: unknown) => {
  if (!value || typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; entityId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const worldSeedId = searchParams.get('worldSeedId');
    
    if (!worldSeedId) {
      return NextResponse.json({ error: 'worldSeedId required' }, { status: 400 });
    }

    let entity = null;

    switch (category) {
      case 'factions':
        entity = await prisma.worldFaction.findFirst({
          where: { id: params.entityId, worldSeedId },
        });
        break;

      case 'people':
        entity = await prisma.worldNpc.findFirst({
          where: { id: params.entityId, worldSeedId },
        });
        break;

      case 'geography':
        entity = await prisma.worldLocation.findFirst({
          where: { id: params.entityId, worldSeedId },
        });
        break;

      case 'conflicts':
        entity = await prisma.worldConflict.findFirst({
          where: { id: params.entityId, worldSeedId },
        });
        break;

      case 'secrets':
        entity = await prisma.worldSecret.findFirst({
          where: { id: params.entityId, worldSeedId },
        });
        break;

      case 'history': {
        const history = await prisma.worldHistory.findUnique({
          where: { worldSeedId },
        });

        if (history) {
          const [_, recordId, kind, indexPart] = params.entityId.split(':');
          const index = Number.parseInt(indexPart ?? '-1', 10);

          if (recordId === history.id && !Number.isNaN(index)) {
            if (kind === 'era') {
              const eras = safeParseArray(history.eras);
              const era = eras[index] as Record<string, unknown> | undefined;
              if (era) {
                entity = {
                  ...era,
                  id: params.entityId,
                  type: 'era',
                  tier: (era?.tier as string) || 'major',
                  isDiscovered: true,
                };
              }
            } else if (kind === 'event') {
              const events = safeParseArray(history.majorEvents);
              const event = events[index] as Record<string, unknown> | undefined;
              if (event) {
                entity = {
                  ...event,
                  id: params.entityId,
                  type: (event?.type as string) || 'event',
                  tier: (event?.tier as string) || 'supporting',
                  isDiscovered: true,
                };
              }
            }
          }
        }
        break;
      }

      case 'cosmology': {
        const cosmology = await prisma.worldCosmology.findUnique({
          where: { worldSeedId },
        });

        if (cosmology) {
          if (params.entityId.endsWith(':magic')) {
            entity = {
              id: params.entityId,
              type: 'system',
              tier: 'major',
              pantheon: safeParseArray(cosmology.pantheon),
              magicSystem: safeParseObject(cosmology.magicSystem),
              planarStructure: safeParseObject(cosmology.planarStructure),
              creationStory: cosmology.creationStory,
              prophecies: safeParseArray(cosmology.prophecies),
              isDiscovered: true,
            };
          } else {
            const [_, recordId, kind, indexPart] = params.entityId.split(':');
            const index = Number.parseInt(indexPart ?? '-1', 10);
            if (recordId === cosmology.id && kind === 'deity' && !Number.isNaN(index)) {
              const pantheon = safeParseArray(cosmology.pantheon);
              const deity = pantheon[index] as Record<string, unknown> | undefined;
              if (deity) {
                entity = {
                  ...deity,
                  id: params.entityId,
                  type: (deity.domain as string) || 'deity',
                  tier: (deity.tier as string) || 'major',
                  isDiscovered: true,
                };
              }
            }
          }
        }
        break;
      }
    }

    if (!entity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, entity });
  } catch (error) {
    console.error('Fetch entity error:', error);
    return NextResponse.json({ error: 'Failed to fetch entity' }, { status: 500 });
  }
}
