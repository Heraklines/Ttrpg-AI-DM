/**
 * Spatial Engine
 * 
 * Handles all spatial calculations:
 * - Distance measurement (5-10-5-10 diagonal rule)
 * - Pathfinding (A* algorithm)
 * - Line of sight (Bresenham's line algorithm)
 * - Cover calculations
 * - Movement validation
 * - Area of effect calculations
 */

import {
  GridPosition,
  Direction,
  CreatureSize,
  TerrainType,
  TileVisual,
  MapTile,
  MapEntity,
  GameMap,
  AreaOfEffect,
  MovementRequest,
  MovementResult,
  DistanceResult,
  LineOfSightResult,
  SpatialQuery,
  SpatialQueryResult,
  FEET_PER_SQUARE,
  DIRECTION_VECTORS,
  SIZE_TO_SQUARES,
} from './spatial-types';

// Priority queue for A* pathfinding
class PriorityQueue<T> {
  private items: { item: T; priority: number }[] = [];

  enqueue(item: T, priority: number): void {
    this.items.push({ item, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): T | undefined {
    return this.items.shift()?.item;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

export class SpatialEngine {
  /**
   * Calculate distance between two points using D&D 5e diagonal rules
   * Uses 5-10-5-10 alternating diagonal cost
   */
  static calculateDistance(from: GridPosition, to: GridPosition): DistanceResult {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    
    // Number of diagonal moves needed
    const diagonals = Math.min(dx, dy);
    // Number of straight moves needed
    const straights = Math.abs(dx - dy);
    
    // Calculate feet using 5-10-5-10 rule for diagonals
    // Every other diagonal costs 10 feet instead of 5
    const diagonalCost = Math.floor(diagonals / 2) * 15 + (diagonals % 2) * 5;
    const straightCost = straights * 5;
    const totalFeet = diagonalCost + straightCost;
    
    return {
      squares: Math.max(dx, dy), // Chebyshev distance
      feet: totalFeet,
      canReach: true, // Will be updated by movement check
      movementRequired: totalFeet,
      pathExists: true, // Will be updated by pathfinding
    };
  }

  /**
   * Calculate simple Euclidean distance (for LoS, not movement)
   */
  static euclideanDistance(from: GridPosition, to: GridPosition): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if a position is within map bounds
   */
  static isInBounds(pos: GridPosition, map: GameMap): boolean {
    return pos.x >= 0 && pos.x < map.width && pos.y >= 0 && pos.y < map.height;
  }

  /**
   * Get tile at position (returns undefined if out of bounds)
   */
  static getTile(pos: GridPosition, map: GameMap): MapTile | undefined {
    if (!this.isInBounds(pos, map)) return undefined;
    return map.tiles[pos.y]?.[pos.x];
  }

  /**
   * Check if a tile is passable for a given entity
   */
  static isTilePassable(tile: MapTile | undefined, entity?: MapEntity): boolean {
    if (!tile) return false;
    
    const impassableTerrain: TerrainType[] = ['wall', 'pit', 'door_closed', 'water_deep'];
    if (impassableTerrain.includes(tile.terrain)) {
      return false;
    }
    
    // Check for blocking objects
    if (tile.objects.some(obj => obj.blocksMovement)) {
      return false;
    }
    
    return true;
  }

  /**
   * Get movement cost for a tile (in feet)
   */
  static getMovementCost(tile: MapTile | undefined, isDiagonal: boolean, diagonalCount: number): number {
    if (!tile || !this.isTilePassable(tile)) return Infinity;
    
    let baseCost: number;
    if (isDiagonal) {
      // 5-10-5-10 rule
      baseCost = (diagonalCount % 2 === 0) ? 5 : 10;
    } else {
      baseCost = 5;
    }
    
    // Difficult terrain doubles movement cost
    const difficultTerrain: TerrainType[] = ['difficult', 'water_shallow'];
    if (difficultTerrain.includes(tile.terrain)) {
      baseCost *= 2;
    }
    
    return baseCost;
  }

  /**
   * Check if movement is diagonal
   */
  static isDiagonalMove(from: GridPosition, to: GridPosition): boolean {
    return from.x !== to.x && from.y !== to.y;
  }

  /**
   * Get neighbors for pathfinding (8-directional movement)
   */
  static getNeighbors(pos: GridPosition, map: GameMap): GridPosition[] {
    const neighbors: GridPosition[] = [];
    
    for (const dir of Object.values(DIRECTION_VECTORS)) {
      const neighbor = { x: pos.x + dir.x, y: pos.y + dir.y };
      if (this.isInBounds(neighbor, map)) {
        neighbors.push(neighbor);
      }
    }
    
    return neighbors;
  }

  /**
   * A* pathfinding algorithm
   * Returns shortest path from start to goal, or empty array if no path exists
   */
  static findPath(
    start: GridPosition,
    goal: GridPosition,
    map: GameMap,
    entity?: MapEntity,
    maxCost: number = Infinity
  ): GridPosition[] {
    const openSet = new PriorityQueue<GridPosition>();
    const cameFrom = new Map<string, GridPosition>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    
    const posKey = (p: GridPosition) => `${p.x},${p.y}`;
    
    gScore.set(posKey(start), 0);
    fScore.set(posKey(start), this.heuristic(start, goal));
    openSet.enqueue(start, fScore.get(posKey(start))!);
    
    let diagonalCount = 0;
    
    while (!openSet.isEmpty()) {
      const current = openSet.dequeue()!;
      const currentKey = posKey(current);
      
      if (current.x === goal.x && current.y === goal.y) {
        // Reconstruct path
        const path: GridPosition[] = [current];
        let pathNode = current;
        while (cameFrom.has(posKey(pathNode))) {
          pathNode = cameFrom.get(posKey(pathNode))!;
          path.unshift(pathNode);
        }
        return path;
      }
      
      for (const neighbor of this.getNeighbors(current, map)) {
        const neighborKey = posKey(neighbor);
        const tile = this.getTile(neighbor, map);
        
        // Check if tile is passable
        if (!this.isTilePassable(tile, entity)) {
          continue;
        }
        
        // Check for entity blocking (except goal)
        if (neighbor.x !== goal.x || neighbor.y !== goal.y) {
          const blockingEntity = map.entities.find(e => 
            e.id !== entity?.id &&
            e.position.x === neighbor.x && 
            e.position.y === neighbor.y
          );
          if (blockingEntity) continue;
        }
        
        const isDiagonal = this.isDiagonalMove(current, neighbor);
        const moveCost = this.getMovementCost(tile, isDiagonal, diagonalCount);
        if (isDiagonal) diagonalCount++;
        
        const tentativeGScore = (gScore.get(currentKey) ?? Infinity) + moveCost;
        
        // Check if exceeds max cost
        if (tentativeGScore > maxCost) continue;
        
        if (tentativeGScore < (gScore.get(neighborKey) ?? Infinity)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeGScore);
          fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, goal));
          openSet.enqueue(neighbor, fScore.get(neighborKey)!);
        }
      }
    }
    
    // No path found
    return [];
  }

  /**
   * Heuristic for A* (using D&D distance estimation)
   */
  private static heuristic(from: GridPosition, to: GridPosition): number {
    return this.calculateDistance(from, to).feet;
  }

  /**
   * Calculate line of sight using Bresenham's line algorithm
   */
  static checkLineOfSight(
    from: GridPosition,
    to: GridPosition,
    map: GameMap
  ): LineOfSightResult {
    const points = this.bresenhamLine(from, to);
    
    let cover: LineOfSightResult['cover'] = 'none';
    let blockedBy: string | undefined;
    let lightLevel: LineOfSightResult['lightLevel'] = map.ambientLight;
    
    // Skip the starting position
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      const tile = this.getTile(point, map);
      
      if (!tile) {
        return {
          hasLoS: false,
          distance: this.calculateDistance(from, to).feet,
          cover: 'full',
          blockedBy: 'map edge',
          lightLevel,
        };
      }
      
      // Check for walls and LoS-blocking terrain
      if (tile.terrain === 'wall') {
        // If it's the target tile, we can see it but have full cover
        if (point.x === to.x && point.y === to.y) {
          cover = 'full';
        } else {
          return {
            hasLoS: false,
            distance: this.calculateDistance(from, to).feet,
            cover: 'full',
            blockedBy: 'wall',
            lightLevel,
          };
        }
      }
      
      // Check for LoS-blocking objects
      const blockingObject = tile.objects.find(obj => obj.blocksLoS);
      if (blockingObject && !(point.x === to.x && point.y === to.y)) {
        return {
          hasLoS: false,
          distance: this.calculateDistance(from, to).feet,
          cover: 'full',
          blockedBy: blockingObject.name,
          lightLevel,
        };
      }
      
      // Check for entities providing cover (not at target position)
      if (!(point.x === to.x && point.y === to.y)) {
        const entityAtPoint = map.entities.find(e => 
          e.position.x === point.x && e.position.y === point.y
        );
        if (entityAtPoint && entityAtPoint.size !== 'tiny') {
          // Creatures provide half cover
          if (cover === 'none') cover = 'half';
        }
      }
      
      // Check for partial cover from objects
      const partialCoverObject = tile.objects.find(obj => 
        !obj.blocksLoS && obj.blocksMovement
      );
      if (partialCoverObject) {
        if (cover === 'none') cover = 'half';
        else if (cover === 'half') cover = 'three_quarters';
      }
    }
    
    return {
      hasLoS: true,
      distance: this.calculateDistance(from, to).feet,
      cover,
      blockedBy,
      lightLevel,
    };
  }

  /**
   * Bresenham's line algorithm for grid-based line drawing
   */
  private static bresenhamLine(from: GridPosition, to: GridPosition): GridPosition[] {
    const points: GridPosition[] = [];
    
    let x0 = from.x;
    let y0 = from.y;
    const x1 = to.x;
    const y1 = to.y;
    
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    while (true) {
      points.push({ x: x0, y: y0 });
      
      if (x0 === x1 && y0 === y1) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
    
    return points;
  }

  /**
   * Execute a movement request
   */
  static executeMovement(
    request: MovementRequest,
    map: GameMap
  ): MovementResult {
    const entity = map.entities.find(e => e.id === request.entityId);
    if (!entity) {
      return {
        success: false,
        finalPosition: { x: 0, y: 0 },
        movementUsed: 0,
        path: [],
        opportunityAttacks: [],
        triggeredTraps: [],
        reason: 'Entity not found',
      };
    }
    
    const result: MovementResult = {
      success: true,
      finalPosition: entity.position,
      movementUsed: 0,
      path: [entity.position],
      opportunityAttacks: [],
      triggeredTraps: [],
    };
    
    const availableMovement = entity.speed - entity.movementUsed;
    let currentPos = { ...entity.position };
    let diagonalCount = 0;
    
    for (const targetPos of request.path) {
      // Skip if same position
      if (targetPos.x === currentPos.x && targetPos.y === currentPos.y) {
        continue;
      }
      
      // Check if adjacent
      const dx = Math.abs(targetPos.x - currentPos.x);
      const dy = Math.abs(targetPos.y - currentPos.y);
      if (dx > 1 || dy > 1) {
        result.success = false;
        result.blockedAt = targetPos;
        result.reason = 'Path contains non-adjacent positions';
        break;
      }
      
      // Get tile and check passability
      const tile = this.getTile(targetPos, map);
      if (!this.isTilePassable(tile, entity)) {
        result.success = false;
        result.blockedAt = targetPos;
        result.reason = `Blocked by ${tile?.terrain || 'impassable terrain'}`;
        break;
      }
      
      // Check for blocking entities
      const blockingEntity = map.entities.find(e =>
        e.id !== entity.id &&
        e.position.x === targetPos.x &&
        e.position.y === targetPos.y &&
        e.entityType !== 'object'
      );
      if (blockingEntity) {
        result.success = false;
        result.blockedAt = targetPos;
        result.reason = `Space occupied by ${blockingEntity.name}`;
        break;
      }
      
      // Calculate movement cost
      const isDiagonal = this.isDiagonalMove(currentPos, targetPos);
      const moveCost = this.getMovementCost(tile, isDiagonal, diagonalCount);
      if (isDiagonal) diagonalCount++;
      
      // Check if enough movement
      if (result.movementUsed + moveCost > availableMovement) {
        result.success = false;
        result.blockedAt = targetPos;
        result.reason = 'Insufficient movement';
        break;
      }
      
      // Check for opportunity attacks (leaving threatened squares)
      if (request.allowOpportunityAttacks !== false) {
        const hostiles = map.entities.filter(e =>
          e.id !== entity.id &&
          e.entityType === 'enemy' &&
          this.isAdjacent(currentPos, e.position)
        );
        
        for (const hostile of hostiles) {
          // If moving away from hostile (not still adjacent after move)
          if (!this.isAdjacent(targetPos, hostile.position)) {
            result.opportunityAttacks.push({
              attackerId: hostile.id,
              attackerName: hostile.name,
            });
          }
        }
      }
      
      // Check for traps
      const trap = tile?.objects.find(obj => obj.type === 'trap');
      if (trap) {
        result.triggeredTraps.push(trap.name);
      }
      
      // Move successful
      currentPos = targetPos;
      result.movementUsed += moveCost;
      result.path.push(targetPos);
    }
    
    result.finalPosition = currentPos;
    return result;
  }

  /**
   * Check if two positions are adjacent (including diagonals)
   */
  static isAdjacent(pos1: GridPosition, pos2: GridPosition): boolean {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
  }

  /**
   * Get all positions affected by an area of effect
   */
  static getAffectedPositions(aoe: AreaOfEffect, map: GameMap): GridPosition[] {
    const positions: GridPosition[] = [];
    const radiusInSquares = Math.ceil(aoe.size / FEET_PER_SQUARE);
    
    switch (aoe.shape) {
      case 'circle':
      case 'sphere':
        for (let y = aoe.origin.y - radiusInSquares; y <= aoe.origin.y + radiusInSquares; y++) {
          for (let x = aoe.origin.x - radiusInSquares; x <= aoe.origin.x + radiusInSquares; x++) {
            const pos = { x, y };
            if (this.isInBounds(pos, map)) {
              const dist = this.euclideanDistance(aoe.origin, pos);
              if (dist <= radiusInSquares) {
                positions.push(pos);
              }
            }
          }
        }
        break;
        
      case 'cube':
      case 'cylinder':
        for (let y = aoe.origin.y; y < aoe.origin.y + radiusInSquares; y++) {
          for (let x = aoe.origin.x; x < aoe.origin.x + radiusInSquares; x++) {
            const pos = { x, y };
            if (this.isInBounds(pos, map)) {
              positions.push(pos);
            }
          }
        }
        break;
        
      case 'line':
        if (aoe.direction) {
          const dir = DIRECTION_VECTORS[aoe.direction];
          const lengthInSquares = Math.ceil(aoe.size / FEET_PER_SQUARE);
          for (let i = 0; i < lengthInSquares; i++) {
            const pos = {
              x: aoe.origin.x + dir.x * i,
              y: aoe.origin.y + dir.y * i,
            };
            if (this.isInBounds(pos, map)) {
              positions.push(pos);
            }
          }
        }
        break;
        
      case 'cone':
        if (aoe.direction) {
          const dir = DIRECTION_VECTORS[aoe.direction];
          const lengthInSquares = Math.ceil(aoe.size / FEET_PER_SQUARE);
          
          for (let dist = 0; dist < lengthInSquares; dist++) {
            const width = dist + 1; // Cone widens
            for (let w = -Math.floor(width / 2); w <= Math.floor(width / 2); w++) {
              let pos: GridPosition;
              if (dir.x === 0) {
                // Vertical cone
                pos = { x: aoe.origin.x + w, y: aoe.origin.y + dir.y * dist };
              } else if (dir.y === 0) {
                // Horizontal cone
                pos = { x: aoe.origin.x + dir.x * dist, y: aoe.origin.y + w };
              } else {
                // Diagonal cone (simplified)
                pos = { x: aoe.origin.x + dir.x * dist, y: aoe.origin.y + dir.y * dist };
              }
              if (this.isInBounds(pos, map)) {
                positions.push(pos);
              }
            }
          }
        }
        break;
    }
    
    return positions;
  }

  /**
   * Query entities and tiles within an area
   */
  static spatialQuery(query: SpatialQuery, map: GameMap): SpatialQueryResult {
    const result: SpatialQueryResult = {
      tiles: [],
      entities: [],
      positions: [],
    };
    
    const shape = query.shape || 'circle';
    
    for (let y = query.center.y - query.radius; y <= query.center.y + query.radius; y++) {
      for (let x = query.center.x - query.radius; x <= query.center.x + query.radius; x++) {
        const pos = { x, y };
        
        // Check if position is within query shape
        let inShape = false;
        if (shape === 'circle') {
          inShape = this.euclideanDistance(query.center, pos) <= query.radius;
        } else {
          inShape = Math.abs(x - query.center.x) <= query.radius &&
                    Math.abs(y - query.center.y) <= query.radius;
        }
        
        if (!inShape) continue;
        if (!this.isInBounds(pos, map)) continue;
        
        result.positions.push(pos);
        
        if (query.includeTiles !== false) {
          const tile = this.getTile(pos, map);
          if (tile) {
            if (!query.terrainTypes || query.terrainTypes.includes(tile.terrain)) {
              result.tiles.push(tile);
            }
          }
        }
      }
    }
    
    if (query.includeEntities !== false) {
      for (const entity of map.entities) {
        const inShape = query.shape === 'circle'
          ? this.euclideanDistance(query.center, entity.position) <= query.radius
          : Math.abs(entity.position.x - query.center.x) <= query.radius &&
            Math.abs(entity.position.y - query.center.y) <= query.radius;
        
        if (inShape) {
          if (!query.entityTypes || query.entityTypes.includes(entity.entityType)) {
            result.entities.push(entity);
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Create an empty map with default tiles
   */
  static createEmptyMap(
    width: number,
    height: number,
    name: string = 'New Map',
    defaultTerrain: TerrainType = 'normal',
    defaultVisual: TileVisual = 'stone_floor'
  ): GameMap {
    const tiles: MapTile[][] = [];
    
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        tiles[y][x] = {
          position: { x, y },
          terrain: defaultTerrain,
          visual: defaultVisual,
          elevation: 0,
          isRevealed: false,
          isVisible: false,
          objects: [],
        };
      }
    }
    
    return {
      id: crypto.randomUUID(),
      name,
      width,
      height,
      tiles,
      entities: [],
      lightSources: [],
      activeEffects: [],
      ambientLight: 'bright',
      defaultTerrain,
      defaultVisual,
    };
  }

  /**
   * Place an entity on the map
   */
  static placeEntity(
    map: GameMap,
    entity: Omit<MapEntity, 'id'>,
    position?: GridPosition
  ): MapEntity | null {
    const pos = position || entity.position;
    
    // Validate position
    if (!this.isInBounds(pos, map)) {
      return null;
    }
    
    const tile = this.getTile(pos, map);
    if (!this.isTilePassable(tile)) {
      return null;
    }
    
    // Check for existing entity
    const existing = map.entities.find(e => 
      e.position.x === pos.x && e.position.y === pos.y
    );
    if (existing) {
      return null;
    }
    
    const newEntity: MapEntity = {
      ...entity,
      id: crypto.randomUUID(),
      position: pos,
    };
    
    map.entities.push(newEntity);
    return newEntity;
  }

  /**
   * Remove an entity from the map
   */
  static removeEntity(map: GameMap, entityId: string): boolean {
    const index = map.entities.findIndex(e => e.id === entityId);
    if (index === -1) return false;
    map.entities.splice(index, 1);
    return true;
  }

  /**
   * Get direction from one position to another
   */
  static getDirection(from: GridPosition, to: GridPosition): Direction | null {
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);
    
    if (dx === 0 && dy === -1) return 'north';
    if (dx === 0 && dy === 1) return 'south';
    if (dx === 1 && dy === 0) return 'east';
    if (dx === -1 && dy === 0) return 'west';
    if (dx === 1 && dy === -1) return 'northeast';
    if (dx === -1 && dy === -1) return 'northwest';
    if (dx === 1 && dy === 1) return 'southeast';
    if (dx === -1 && dy === 1) return 'southwest';
    
    return null;
  }

  /**
   * Reveal tiles around a position (fog of war)
   */
  static revealArea(map: GameMap, center: GridPosition, radius: number): void {
    for (let y = center.y - radius; y <= center.y + radius; y++) {
      for (let x = center.x - radius; x <= center.x + radius; x++) {
        const pos = { x, y };
        if (!this.isInBounds(pos, map)) continue;
        
        // Check if within radius
        if (this.euclideanDistance(center, pos) > radius) continue;
        
        // Check line of sight
        const los = this.checkLineOfSight(center, pos, map);
        if (los.hasLoS) {
          const tile = map.tiles[y][x];
          tile.isRevealed = true;
          tile.isVisible = true;
        }
      }
    }
  }

  /**
   * Update visibility (which tiles are currently visible vs just revealed)
   */
  static updateVisibility(map: GameMap, viewerPositions: GridPosition[], visionRadius: number = 12): void {
    // First, mark all tiles as not currently visible
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        map.tiles[y][x].isVisible = false;
      }
    }
    
    // Then reveal from each viewer position
    for (const viewerPos of viewerPositions) {
      this.revealArea(map, viewerPos, visionRadius);
    }
  }
}
