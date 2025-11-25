/**
 * Spatial System Types
 * 
 * Coordinate System:
 * - Grid-based with 5-foot squares (standard D&D)
 * - Origin (0,0) at top-left of current map
 * - X increases rightward, Y increases downward
 * - Each grid cell is 1 unit = 5 feet in game
 * 
 * Movement:
 * - Standard movement: 1 square = 5 feet
 * - Diagonal movement: Uses 5-10-5-10 rule (first diagonal 5ft, second 10ft, alternating)
 * - Difficult terrain: 2 movement per square
 */

// Basic coordinate
export interface GridPosition {
  x: number;
  y: number;
}

// Direction for movement and facing
export type Direction = 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';

// Size categories affect space occupied
export type CreatureSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';

// How many squares a creature occupies (side length)
export const SIZE_TO_SQUARES: Record<CreatureSize, number> = {
  tiny: 1,      // Shares space, 2.5 ft
  small: 1,     // 5 ft
  medium: 1,    // 5 ft
  large: 2,     // 10 ft
  huge: 3,      // 15 ft
  gargantuan: 4 // 20 ft
};

// Tile terrain types
export type TerrainType = 
  | 'normal'           // Standard movement
  | 'difficult'        // Costs 2x movement
  | 'water_shallow'    // Difficult terrain
  | 'water_deep'       // Requires swimming
  | 'wall'             // Impassable, blocks LoS
  | 'pit'              // Impassable without flight/jump
  | 'door_closed'      // Blocks movement until opened
  | 'door_open'        // Normal terrain
  | 'stairs_up'        // Connects to level above
  | 'stairs_down';     // Connects to level below

// Visual representation for rendering
export type TileVisual = 
  | 'stone_floor'
  | 'wood_floor'
  | 'grass'
  | 'dirt'
  | 'water'
  | 'stone_wall'
  | 'wood_wall'
  | 'door'
  | 'stairs'
  | 'void';  // Off-map

// A single tile on the map
export interface MapTile {
  position: GridPosition;
  terrain: TerrainType;
  visual: TileVisual;
  elevation: number;       // Height in 5ft increments (0 = ground level)
  isRevealed: boolean;     // Has party seen this tile?
  isVisible: boolean;      // Currently visible (light/LoS)?
  objects: TileObject[];   // Items, furniture, etc. on this tile
  notes?: string;          // DM notes
}

// Objects that can be on tiles
export interface TileObject {
  id: string;
  name: string;
  type: 'furniture' | 'item' | 'trap' | 'hazard' | 'interactable';
  blocksMovement: boolean;
  blocksLoS: boolean;
  description?: string;
  interactionDC?: number;  // DC to interact (open, disarm, etc.)
}

// A positioned entity on the map (character, monster, NPC)
export interface MapEntity {
  id: string;
  entityType: 'player' | 'enemy' | 'ally' | 'neutral' | 'object';
  name: string;
  position: GridPosition;
  size: CreatureSize;
  facing?: Direction;
  speed: number;           // Movement speed in feet
  movementUsed: number;    // Movement used this turn
  conditions: string[];    // Conditions affecting movement
  isVisible: boolean;      // Is entity visible to players?
  tokenColor?: string;     // Color for map token
  sourceId?: string;       // Link to Character or Combatant ID
}

// Light source on the map
export interface LightSource {
  id: string;
  position: GridPosition;
  brightRadius: number;    // Bright light radius in squares
  dimRadius: number;       // Dim light radius in squares
  color?: string;          // Light color for rendering
  isActive: boolean;
}

// Area of effect template
export interface AreaOfEffect {
  id: string;
  shape: 'circle' | 'cone' | 'line' | 'cube' | 'sphere' | 'cylinder';
  origin: GridPosition;
  direction?: Direction;   // For cones and lines
  size: number;            // Radius, length, or side in feet
  color?: string;
  label?: string;
  expiresOnRound?: number; // Combat round when effect ends
}

// Complete map definition
export interface GameMap {
  id: string;
  name: string;
  width: number;           // Width in grid squares
  height: number;          // Height in grid squares
  tiles: MapTile[][];      // 2D array [y][x]
  entities: MapEntity[];
  lightSources: LightSource[];
  activeEffects: AreaOfEffect[];
  ambientLight: 'bright' | 'dim' | 'dark';
  defaultTerrain: TerrainType;
  defaultVisual: TileVisual;
}

// Location that can contain a map
export interface Location {
  id: string;
  name: string;
  description: string;
  locationType: 'dungeon' | 'town' | 'wilderness' | 'building' | 'cave' | 'other';
  map?: GameMap;
  connectedLocations: { locationId: string; direction: string; description: string }[];
  npcsPresent: string[];
  isExplored: boolean;
}

// Movement request and result
export interface MovementRequest {
  entityId: string;
  path: GridPosition[];    // Sequence of positions to move through
  allowOpportunityAttacks?: boolean;
}

export interface MovementResult {
  success: boolean;
  finalPosition: GridPosition;
  movementUsed: number;    // Total feet of movement consumed
  path: GridPosition[];    // Actual path taken (may differ if blocked)
  opportunityAttacks: { attackerId: string; attackerName: string }[];
  triggeredTraps: string[];
  blockedAt?: GridPosition; // Where movement was blocked
  reason?: string;         // Reason if movement failed/blocked
}

// Distance calculation result
export interface DistanceResult {
  squares: number;         // Distance in grid squares
  feet: number;            // Distance in feet
  canReach: boolean;       // Can reach with current movement
  movementRequired: number; // Feet of movement needed
  pathExists: boolean;     // Is there an unblocked path?
}

// Line of sight result
export interface LineOfSightResult {
  hasLoS: boolean;
  distance: number;
  cover: 'none' | 'half' | 'three_quarters' | 'full';
  blockedBy?: string;      // What's blocking LoS
  lightLevel: 'bright' | 'dim' | 'dark';
}

// Spatial query for finding entities/tiles
export interface SpatialQuery {
  center: GridPosition;
  radius: number;          // In squares
  shape?: 'circle' | 'square';
  includeEntities?: boolean;
  includeTiles?: boolean;
  entityTypes?: MapEntity['entityType'][];
  terrainTypes?: TerrainType[];
}

export interface SpatialQueryResult {
  tiles: MapTile[];
  entities: MapEntity[];
  positions: GridPosition[];
}

// Constants
export const FEET_PER_SQUARE = 5;
export const DIAGONAL_COST_ODD = 5;   // First diagonal
export const DIAGONAL_COST_EVEN = 10; // Second diagonal

// Direction vectors for movement
export const DIRECTION_VECTORS: Record<Direction, GridPosition> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
  northeast: { x: 1, y: -1 },
  northwest: { x: -1, y: -1 },
  southeast: { x: 1, y: 1 },
  southwest: { x: -1, y: 1 },
};

// Opposite directions
export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
  northeast: 'southwest',
  northwest: 'southeast',
  southeast: 'northwest',
  southwest: 'northeast',
};
