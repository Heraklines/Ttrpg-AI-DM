import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
