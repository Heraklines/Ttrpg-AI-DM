import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialEngine } from './spatial-engine';
import type { GameMap, MapEntity, GridPosition, MapTile, TerrainType, TileVisual } from './spatial-types';

describe('SpatialEngine', () => {
  let testMap: GameMap;

  beforeEach(() => {
    // Create a 10x10 test map
    testMap = SpatialEngine.createEmptyMap(10, 10, 'Test Map', 'normal', 'stone_floor');
  });

  describe('calculateDistance', () => {
    it('calculates straight line distance correctly', () => {
      const result = SpatialEngine.calculateDistance({ x: 0, y: 0 }, { x: 5, y: 0 });
      expect(result.squares).toBe(5);
      expect(result.feet).toBe(25); // 5 squares * 5 feet
    });

    it('calculates vertical distance correctly', () => {
      const result = SpatialEngine.calculateDistance({ x: 0, y: 0 }, { x: 0, y: 4 });
      expect(result.squares).toBe(4);
      expect(result.feet).toBe(20);
    });

    it('calculates diagonal distance using 5-10-5-10 rule', () => {
      // 2 diagonals: first costs 5, second costs 10 = 15 feet
      const result = SpatialEngine.calculateDistance({ x: 0, y: 0 }, { x: 2, y: 2 });
      expect(result.squares).toBe(2);
      expect(result.feet).toBe(15);
    });

    it('calculates mixed diagonal and straight correctly', () => {
      // 3 squares diagonal (5+10+5=20) + 2 straight (10) = 30
      const result = SpatialEngine.calculateDistance({ x: 0, y: 0 }, { x: 5, y: 3 });
      expect(result.squares).toBe(5); // Chebyshev distance
      // 3 diagonals (5+10+5=20) + 2 straight (10) = 30
      expect(result.feet).toBe(30);
    });

    it('returns zero for same position', () => {
      const result = SpatialEngine.calculateDistance({ x: 5, y: 5 }, { x: 5, y: 5 });
      expect(result.squares).toBe(0);
      expect(result.feet).toBe(0);
    });
  });

  describe('isInBounds', () => {
    it('returns true for valid positions', () => {
      expect(SpatialEngine.isInBounds({ x: 0, y: 0 }, testMap)).toBe(true);
      expect(SpatialEngine.isInBounds({ x: 5, y: 5 }, testMap)).toBe(true);
      expect(SpatialEngine.isInBounds({ x: 9, y: 9 }, testMap)).toBe(true);
    });

    it('returns false for out of bounds positions', () => {
      expect(SpatialEngine.isInBounds({ x: -1, y: 0 }, testMap)).toBe(false);
      expect(SpatialEngine.isInBounds({ x: 0, y: -1 }, testMap)).toBe(false);
      expect(SpatialEngine.isInBounds({ x: 10, y: 0 }, testMap)).toBe(false);
      expect(SpatialEngine.isInBounds({ x: 0, y: 10 }, testMap)).toBe(false);
    });
  });

  describe('isTilePassable', () => {
    it('returns true for normal terrain', () => {
      const tile = testMap.tiles[0][0];
      expect(SpatialEngine.isTilePassable(tile)).toBe(true);
    });

    it('returns false for walls', () => {
      testMap.tiles[0][0].terrain = 'wall';
      expect(SpatialEngine.isTilePassable(testMap.tiles[0][0])).toBe(false);
    });

    it('returns false for pits', () => {
      testMap.tiles[0][0].terrain = 'pit';
      expect(SpatialEngine.isTilePassable(testMap.tiles[0][0])).toBe(false);
    });

    it('returns false for closed doors', () => {
      testMap.tiles[0][0].terrain = 'door_closed';
      expect(SpatialEngine.isTilePassable(testMap.tiles[0][0])).toBe(false);
    });

    it('returns true for difficult terrain', () => {
      testMap.tiles[0][0].terrain = 'difficult';
      expect(SpatialEngine.isTilePassable(testMap.tiles[0][0])).toBe(true);
    });
  });

  describe('getMovementCost', () => {
    it('returns 5 for straight movement on normal terrain', () => {
      const tile = testMap.tiles[0][0];
      expect(SpatialEngine.getMovementCost(tile, false, 0)).toBe(5);
    });

    it('returns 5 for first diagonal on normal terrain', () => {
      const tile = testMap.tiles[0][0];
      expect(SpatialEngine.getMovementCost(tile, true, 0)).toBe(5);
    });

    it('returns 10 for second diagonal on normal terrain', () => {
      const tile = testMap.tiles[0][0];
      expect(SpatialEngine.getMovementCost(tile, true, 1)).toBe(10);
    });

    it('doubles cost for difficult terrain', () => {
      testMap.tiles[0][0].terrain = 'difficult';
      expect(SpatialEngine.getMovementCost(testMap.tiles[0][0], false, 0)).toBe(10);
    });

    it('returns Infinity for impassable terrain', () => {
      testMap.tiles[0][0].terrain = 'wall';
      expect(SpatialEngine.getMovementCost(testMap.tiles[0][0], false, 0)).toBe(Infinity);
    });
  });

  describe('findPath', () => {
    it('finds a straight path', () => {
      const path = SpatialEngine.findPath({ x: 0, y: 0 }, { x: 3, y: 0 }, testMap);
      expect(path.length).toBe(4); // Start + 3 steps
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[path.length - 1]).toEqual({ x: 3, y: 0 });
    });

    it('finds a diagonal path', () => {
      const path = SpatialEngine.findPath({ x: 0, y: 0 }, { x: 2, y: 2 }, testMap);
      expect(path.length).toBeGreaterThan(0);
      expect(path[path.length - 1]).toEqual({ x: 2, y: 2 });
    });

    it('paths around walls', () => {
      // Create a wall in the way
      testMap.tiles[0][1].terrain = 'wall';
      testMap.tiles[1][1].terrain = 'wall';
      testMap.tiles[2][1].terrain = 'wall';

      const path = SpatialEngine.findPath({ x: 0, y: 0 }, { x: 2, y: 0 }, testMap);
      
      // Should find a path going around
      expect(path.length).toBeGreaterThan(0);
      expect(path[path.length - 1]).toEqual({ x: 2, y: 0 });
      
      // Path should not go through walls
      for (const pos of path) {
        expect(testMap.tiles[pos.y][pos.x].terrain).not.toBe('wall');
      }
    });

    it('returns empty array when no path exists', () => {
      // Surround the start with walls
      testMap.tiles[0][1].terrain = 'wall';
      testMap.tiles[1][0].terrain = 'wall';
      testMap.tiles[1][1].terrain = 'wall';

      const path = SpatialEngine.findPath({ x: 0, y: 0 }, { x: 5, y: 5 }, testMap);
      expect(path.length).toBe(0);
    });

    it('respects max movement cost', () => {
      const path = SpatialEngine.findPath({ x: 0, y: 0 }, { x: 5, y: 0 }, testMap, undefined, 15);
      
      // With 15 feet max, should only go 3 squares (15 feet)
      if (path.length > 0) {
        const cost = SpatialEngine.calculateDistance(path[0], path[path.length - 1]).feet;
        expect(cost).toBeLessThanOrEqual(15);
      }
    });
  });

  describe('checkLineOfSight', () => {
    it('returns true for clear line of sight', () => {
      const result = SpatialEngine.checkLineOfSight({ x: 0, y: 0 }, { x: 5, y: 0 }, testMap);
      expect(result.hasLoS).toBe(true);
      expect(result.cover).toBe('none');
    });

    it('returns false when blocked by wall', () => {
      testMap.tiles[0][2].terrain = 'wall';
      const result = SpatialEngine.checkLineOfSight({ x: 0, y: 0 }, { x: 5, y: 0 }, testMap);
      expect(result.hasLoS).toBe(false);
      expect(result.blockedBy).toBe('wall');
    });

    it('provides cover from entities', () => {
      // Place an entity in the way
      testMap.entities.push({
        id: 'blocker',
        entityType: 'neutral',
        name: 'Blocker',
        position: { x: 2, y: 0 },
        size: 'medium',
        speed: 30,
        movementUsed: 0,
        conditions: [],
        isVisible: true,
      });

      const result = SpatialEngine.checkLineOfSight({ x: 0, y: 0 }, { x: 5, y: 0 }, testMap);
      expect(result.hasLoS).toBe(true);
      expect(result.cover).toBe('half');
    });
  });

  describe('isAdjacent', () => {
    it('returns true for horizontally adjacent', () => {
      expect(SpatialEngine.isAdjacent({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(true);
    });

    it('returns true for vertically adjacent', () => {
      expect(SpatialEngine.isAdjacent({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(true);
    });

    it('returns true for diagonally adjacent', () => {
      expect(SpatialEngine.isAdjacent({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(true);
    });

    it('returns false for same position', () => {
      expect(SpatialEngine.isAdjacent({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(false);
    });

    it('returns false for non-adjacent', () => {
      expect(SpatialEngine.isAdjacent({ x: 0, y: 0 }, { x: 2, y: 0 })).toBe(false);
    });
  });

  describe('executeMovement', () => {
    let entity: MapEntity;

    beforeEach(() => {
      entity = {
        id: 'test-entity',
        entityType: 'player',
        name: 'Test',
        position: { x: 0, y: 0 },
        size: 'medium',
        speed: 30,
        movementUsed: 0,
        conditions: [],
        isVisible: true,
      };
      testMap.entities.push(entity);
    });

    it('executes simple movement', () => {
      const result = SpatialEngine.executeMovement(
        { entityId: 'test-entity', path: [{ x: 1, y: 0 }, { x: 2, y: 0 }] },
        testMap
      );

      expect(result.success).toBe(true);
      expect(result.finalPosition).toEqual({ x: 2, y: 0 });
      expect(result.movementUsed).toBe(10); // 2 squares * 5 feet
    });

    it('stops at impassable terrain', () => {
      testMap.tiles[0][2].terrain = 'wall';

      const result = SpatialEngine.executeMovement(
        { entityId: 'test-entity', path: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }] },
        testMap
      );

      expect(result.success).toBe(false);
      expect(result.finalPosition).toEqual({ x: 1, y: 0 });
      expect(result.blockedAt).toEqual({ x: 2, y: 0 });
    });

    it('detects opportunity attacks', () => {
      // Place an enemy adjacent to path
      testMap.entities.push({
        id: 'enemy',
        entityType: 'enemy',
        name: 'Goblin',
        position: { x: 1, y: 1 },
        size: 'small',
        speed: 30,
        movementUsed: 0,
        conditions: [],
        isVisible: true,
      });

      const result = SpatialEngine.executeMovement(
        { entityId: 'test-entity', path: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }] },
        testMap
      );

      expect(result.opportunityAttacks.length).toBe(1);
      expect(result.opportunityAttacks[0].attackerName).toBe('Goblin');
    });

    it('stops when movement exhausted', () => {
      entity.movementUsed = 25; // Only 5 feet left

      const result = SpatialEngine.executeMovement(
        { entityId: 'test-entity', path: [{ x: 1, y: 0 }, { x: 2, y: 0 }] },
        testMap
      );

      expect(result.success).toBe(false);
      expect(result.finalPosition).toEqual({ x: 1, y: 0 });
      expect(result.reason).toBe('Insufficient movement');
    });
  });

  describe('spatialQuery', () => {
    beforeEach(() => {
      // Add some entities
      testMap.entities = [
        { id: '1', entityType: 'player', name: 'Player', position: { x: 5, y: 5 }, size: 'medium', speed: 30, movementUsed: 0, conditions: [], isVisible: true },
        { id: '2', entityType: 'enemy', name: 'Goblin', position: { x: 6, y: 5 }, size: 'small', speed: 30, movementUsed: 0, conditions: [], isVisible: true },
        { id: '3', entityType: 'enemy', name: 'Orc', position: { x: 8, y: 5 }, size: 'medium', speed: 30, movementUsed: 0, conditions: [], isVisible: true },
      ];
    });

    it('finds entities within radius', () => {
      const result = SpatialEngine.spatialQuery(
        { center: { x: 5, y: 5 }, radius: 2, includeEntities: true },
        testMap
      );

      expect(result.entities.length).toBe(2); // Player and Goblin
    });

    it('filters by entity type', () => {
      const result = SpatialEngine.spatialQuery(
        { center: { x: 5, y: 5 }, radius: 5, entityTypes: ['enemy'] },
        testMap
      );

      expect(result.entities.length).toBe(2); // Both enemies
      expect(result.entities.every(e => e.entityType === 'enemy')).toBe(true);
    });

    it('returns tiles within radius', () => {
      const result = SpatialEngine.spatialQuery(
        { center: { x: 5, y: 5 }, radius: 1, includeTiles: true },
        testMap
      );

      // Circle of radius 1 includes center and adjacent (5 tiles typically)
      expect(result.tiles.length).toBeGreaterThan(0);
    });
  });

  describe('placeEntity and removeEntity', () => {
    it('places entity at valid position', () => {
      const entity = SpatialEngine.placeEntity(testMap, {
        entityType: 'player',
        name: 'New Player',
        position: { x: 0, y: 0 },
        size: 'medium',
        speed: 30,
        movementUsed: 0,
        conditions: [],
        isVisible: true,
      });

      expect(entity).not.toBeNull();
      expect(entity?.id).toBeDefined();
      expect(testMap.entities.length).toBe(1);
    });

    it('fails to place at occupied position', () => {
      SpatialEngine.placeEntity(testMap, {
        entityType: 'player',
        name: 'First',
        position: { x: 0, y: 0 },
        size: 'medium',
        speed: 30,
        movementUsed: 0,
        conditions: [],
        isVisible: true,
      });

      const second = SpatialEngine.placeEntity(testMap, {
        entityType: 'player',
        name: 'Second',
        position: { x: 0, y: 0 },
        size: 'medium',
        speed: 30,
        movementUsed: 0,
        conditions: [],
        isVisible: true,
      });

      expect(second).toBeNull();
    });

    it('removes entity', () => {
      const entity = SpatialEngine.placeEntity(testMap, {
        entityType: 'player',
        name: 'Test',
        position: { x: 0, y: 0 },
        size: 'medium',
        speed: 30,
        movementUsed: 0,
        conditions: [],
        isVisible: true,
      });

      expect(testMap.entities.length).toBe(1);
      
      const removed = SpatialEngine.removeEntity(testMap, entity!.id);
      expect(removed).toBe(true);
      expect(testMap.entities.length).toBe(0);
    });
  });

  describe('getDirection', () => {
    it('returns correct cardinal directions', () => {
      expect(SpatialEngine.getDirection({ x: 0, y: 0 }, { x: 0, y: -1 })).toBe('north');
      expect(SpatialEngine.getDirection({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe('south');
      expect(SpatialEngine.getDirection({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe('east');
      expect(SpatialEngine.getDirection({ x: 0, y: 0 }, { x: -1, y: 0 })).toBe('west');
    });

    it('returns correct diagonal directions', () => {
      expect(SpatialEngine.getDirection({ x: 0, y: 0 }, { x: 1, y: -1 })).toBe('northeast');
      expect(SpatialEngine.getDirection({ x: 0, y: 0 }, { x: -1, y: -1 })).toBe('northwest');
      expect(SpatialEngine.getDirection({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe('southeast');
      expect(SpatialEngine.getDirection({ x: 0, y: 0 }, { x: -1, y: 1 })).toBe('southwest');
    });

    it('returns null for same position', () => {
      expect(SpatialEngine.getDirection({ x: 0, y: 0 }, { x: 0, y: 0 })).toBeNull();
    });
  });
});
