import { NextRequest, NextResponse } from 'next/server';
import { relationshipService, EntityType } from '@/lib/world/relationship-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { worldSeedId: string } }
) {
  try {
    const { worldSeedId } = params;
    const { searchParams } = new URL(request.url);
    
    const centerId = searchParams.get('center');
    const centerType = searchParams.get('type') as EntityType | null;
    const depthParam = searchParams.get('depth');
    const playerMode = searchParams.get('playerMode') === 'true';
    
    if (!centerId || !centerType) {
      return NextResponse.json(
        { error: 'center and type query parameters are required' },
        { status: 400 }
      );
    }
    
    const depth = depthParam ? Math.min(Math.max(parseInt(depthParam), 1), 3) : 2;
    
    const graphData = await relationshipService.getRelationshipGraph(
      worldSeedId,
      centerId,
      centerType,
      depth,
      playerMode
    );
    
    return NextResponse.json({ success: true, graph: graphData });
  } catch (error) {
    console.error('Get relationship graph error:', error);
    return NextResponse.json(
      { error: 'Failed to get relationship graph' },
      { status: 500 }
    );
  }
}
