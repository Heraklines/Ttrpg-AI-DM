import { NextRequest, NextResponse } from 'next/server';
import { relationshipService, EntityType } from '@/lib/world/relationship-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { worldSeedId: string } }
) {
  try {
    const { worldSeedId } = params;
    const { searchParams } = new URL(request.url);
    
    const entityType = searchParams.get('entity') as EntityType | null;
    const entityId = searchParams.get('id');
    
    if (entityType && entityId) {
      const relationships = await relationshipService.getRelationshipsFor(
        worldSeedId,
        entityType,
        entityId
      );
      return NextResponse.json({ success: true, relationships });
    }
    
    const allRelationships = await relationshipService.getAllRelationshipsForWorld(worldSeedId);
    return NextResponse.json({ success: true, relationships: allRelationships });
  } catch (error) {
    console.error('Get relationships error:', error);
    return NextResponse.json(
      { error: 'Failed to get relationships' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { worldSeedId: string } }
) {
  try {
    const { worldSeedId } = params;
    const body = await request.json();
    
    const relationship = await relationshipService.createRelationship({
      worldSeedId,
      sourceType: body.sourceType,
      sourceId: body.sourceId,
      targetType: body.targetType,
      targetId: body.targetId,
      type: body.type,
      strength: body.strength || 5,
      isPublic: body.isPublic ?? true,
      description: body.description,
      history: body.history,
      instability: body.instability,
    });
    
    return NextResponse.json({ success: true, relationship });
  } catch (error) {
    console.error('Create relationship error:', error);
    return NextResponse.json(
      { error: 'Failed to create relationship' },
      { status: 500 }
    );
  }
}
