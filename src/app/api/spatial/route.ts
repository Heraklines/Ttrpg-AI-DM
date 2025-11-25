import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { SpatialEngine } from '@/lib/engine/spatial-engine';
import type { GameMap, GridPosition, MapEntity } from '@/lib/engine/spatial-types';

const CreateMapSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().min(1).max(100),
  width: z.number().int().min(5).max(100),
  height: z.number().int().min(5).max(100),
  defaultTerrain: z.enum(['normal', 'difficult', 'water_shallow', 'stone_floor']).optional(),
});

const MoveEntitySchema = z.object({
  campaignId: z.string().uuid(),
  entityId: z.string(),
  targetX: z.number().int(),
  targetY: z.number().int(),
});

const QuerySchema = z.object({
  campaignId: z.string().uuid(),
  centerX: z.number().int(),
  centerY: z.number().int(),
  radius: z.number().int().min(1).max(50),
  entityTypes: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const campaignId = searchParams.get('campaignId');
  
  if (!campaignId) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'campaignId is required' } },
      { status: 400 }
    );
  }

  try {
    const gameState = await prisma.gameState.findUnique({
      where: { campaignId },
    });

    if (!gameState) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Game state not found' } },
        { status: 404 }
      );
    }

    const activeMap = gameState.activeMap ? JSON.parse(gameState.activeMap) : null;
    const entityPositions = JSON.parse(gameState.entityPositions || '{}');

    return NextResponse.json({
      map: activeMap,
      entityPositions,
      hasMap: !!activeMap,
    });
  } catch (error) {
    console.error('Failed to get spatial data:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get spatial data' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create_map': {
        const parsed = CreateMapSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: { code: 'VALIDATION_FAILED', message: 'Invalid input', details: parsed.error.flatten() } },
            { status: 422 }
          );
        }

        const { campaignId, name, width, height, defaultTerrain } = parsed.data;

        const map = SpatialEngine.createEmptyMap(
          width,
          height,
          name,
          defaultTerrain as any || 'normal',
          'stone_floor'
        );

        await prisma.gameState.update({
          where: { campaignId },
          data: { activeMap: JSON.stringify(map) },
        });

        return NextResponse.json({ success: true, map });
      }

      case 'move_entity': {
        const parsed = MoveEntitySchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: { code: 'VALIDATION_FAILED', message: 'Invalid input', details: parsed.error.flatten() } },
            { status: 422 }
          );
        }

        const { campaignId, entityId, targetX, targetY } = parsed.data;

        const gameState = await prisma.gameState.findUnique({
          where: { campaignId },
        });

        if (!gameState?.activeMap) {
          return NextResponse.json(
            { error: { code: 'NO_MAP', message: 'No active map' } },
            { status: 400 }
          );
        }

        const map: GameMap = JSON.parse(gameState.activeMap);
        const entity = map.entities.find(e => e.id === entityId);

        if (!entity) {
          return NextResponse.json(
            { error: { code: 'NOT_FOUND', message: 'Entity not found on map' } },
            { status: 404 }
          );
        }

        // Find path to target
        const path = SpatialEngine.findPath(
          entity.position,
          { x: targetX, y: targetY },
          map,
          entity,
          entity.speed - entity.movementUsed
        );

        if (path.length === 0) {
          return NextResponse.json(
            { error: { code: 'NO_PATH', message: 'No valid path to target' } },
            { status: 400 }
          );
        }

        // Execute movement
        const result = SpatialEngine.executeMovement(
          { entityId, path: path.slice(1) }, // Skip starting position
          map
        );

        // Update entity position
        if (result.success || result.path.length > 1) {
          const entityIndex = map.entities.findIndex(e => e.id === entityId);
          map.entities[entityIndex].position = result.finalPosition;
          map.entities[entityIndex].movementUsed += result.movementUsed;

          await prisma.gameState.update({
            where: { campaignId },
            data: { activeMap: JSON.stringify(map) },
          });
        }

        return NextResponse.json({
          success: result.success,
          result,
          updatedEntity: map.entities.find(e => e.id === entityId),
        });
      }

      case 'place_entity': {
        const { campaignId, entity, position } = body;

        const gameState = await prisma.gameState.findUnique({
          where: { campaignId },
        });

        if (!gameState?.activeMap) {
          return NextResponse.json(
            { error: { code: 'NO_MAP', message: 'No active map' } },
            { status: 400 }
          );
        }

        const map: GameMap = JSON.parse(gameState.activeMap);
        const newEntity = SpatialEngine.placeEntity(map, entity, position);

        if (!newEntity) {
          return NextResponse.json(
            { error: { code: 'INVALID_POSITION', message: 'Cannot place entity at this position' } },
            { status: 400 }
          );
        }

        await prisma.gameState.update({
          where: { campaignId },
          data: { activeMap: JSON.stringify(map) },
        });

        return NextResponse.json({ success: true, entity: newEntity });
      }

      case 'query_area': {
        const parsed = QuerySchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: { code: 'VALIDATION_FAILED', message: 'Invalid input', details: parsed.error.flatten() } },
            { status: 422 }
          );
        }

        const { campaignId, centerX, centerY, radius, entityTypes } = parsed.data;

        const gameState = await prisma.gameState.findUnique({
          where: { campaignId },
        });

        if (!gameState?.activeMap) {
          return NextResponse.json({ tiles: [], entities: [], positions: [] });
        }

        const map: GameMap = JSON.parse(gameState.activeMap);
        const result = SpatialEngine.spatialQuery(
          {
            center: { x: centerX, y: centerY },
            radius,
            includeEntities: true,
            includeTiles: true,
            entityTypes: entityTypes as any,
          },
          map
        );

        return NextResponse.json(result);
      }

      case 'calculate_distance': {
        const { fromX, fromY, toX, toY } = body;
        const result = SpatialEngine.calculateDistance(
          { x: fromX, y: fromY },
          { x: toX, y: toY }
        );
        return NextResponse.json(result);
      }

      case 'check_los': {
        const { campaignId, fromX, fromY, toX, toY } = body;

        const gameState = await prisma.gameState.findUnique({
          where: { campaignId },
        });

        if (!gameState?.activeMap) {
          return NextResponse.json({ hasLoS: true, distance: 0, cover: 'none', lightLevel: 'bright' });
        }

        const map: GameMap = JSON.parse(gameState.activeMap);
        const result = SpatialEngine.checkLineOfSight(
          { x: fromX, y: fromY },
          { x: toX, y: toY },
          map
        );

        return NextResponse.json(result);
      }

      case 'update_visibility': {
        const { campaignId } = body;

        const gameState = await prisma.gameState.findUnique({
          where: { campaignId },
        });

        if (!gameState?.activeMap) {
          return NextResponse.json({ success: false, message: 'No active map' });
        }

        const map: GameMap = JSON.parse(gameState.activeMap);
        
        // Get player positions
        const playerPositions = map.entities
          .filter(e => e.entityType === 'player')
          .map(e => e.position);

        SpatialEngine.updateVisibility(map, playerPositions);

        await prisma.gameState.update({
          where: { campaignId },
          data: { activeMap: JSON.stringify(map) },
        });

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: { code: 'INVALID_ACTION', message: `Unknown action: ${action}` } },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Spatial action failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to process spatial action' } },
      { status: 500 }
    );
  }
}
