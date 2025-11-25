'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameMap, MapTile, MapEntity, GridPosition, AreaOfEffect } from '@/lib/engine/spatial-types';

interface MiniMapProps {
  map: GameMap;
  selectedEntityId?: string;
  onTileClick?: (position: GridPosition) => void;
  onEntityClick?: (entity: MapEntity) => void;
  onMoveRequest?: (entityId: string, path: GridPosition[]) => void;
  showGrid?: boolean;
  showCoordinates?: boolean;
  cellSize?: number;
  className?: string;
}

const TERRAIN_COLORS: Record<string, string> = {
  normal: '#4a4a4a',
  difficult: '#5c4a32',
  water_shallow: '#1e4d6b',
  water_deep: '#0d2f4a',
  wall: '#2d2d2d',
  pit: '#0a0a0a',
  door_closed: '#6b4423',
  door_open: '#8b6243',
  stairs_up: '#5a5a5a',
  stairs_down: '#3a3a3a',
};

const ENTITY_COLORS: Record<string, string> = {
  player: '#4CAF50',
  enemy: '#CF6679',
  ally: '#1E4D6B',
  neutral: '#C4A35A',
  object: '#888888',
};

export function MiniMap({
  map,
  selectedEntityId,
  onTileClick,
  onEntityClick,
  onMoveRequest,
  showGrid = true,
  showCoordinates = false,
  cellSize = 24,
  className = '',
}: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredTile, setHoveredTile] = useState<GridPosition | null>(null);
  const [dragPath, setDragPath] = useState<GridPosition[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Convert mouse position to grid position
  const mouseToGrid = useCallback((e: React.MouseEvent<HTMLCanvasElement>): GridPosition => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    
    return {
      x: Math.max(0, Math.min(map.width - 1, x)),
      y: Math.max(0, Math.min(map.height - 1, y)),
    };
  }, [cellSize, map.width, map.height]);

  // Render the map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1A1714';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y]?.[x];
        if (!tile) continue;

        const px = x * cellSize;
        const py = y * cellSize;

        // Base terrain color
        if (tile.isRevealed) {
          ctx.fillStyle = tile.isVisible
            ? TERRAIN_COLORS[tile.terrain] || TERRAIN_COLORS.normal
            : adjustBrightness(TERRAIN_COLORS[tile.terrain] || TERRAIN_COLORS.normal, -0.5);
        } else {
          ctx.fillStyle = '#0a0a0a'; // Fog of war
        }
        ctx.fillRect(px, py, cellSize, cellSize);

        // Grid lines
        if (showGrid && tile.isRevealed) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px, py, cellSize, cellSize);
        }

        // Hover highlight
        if (hoveredTile && hoveredTile.x === x && hoveredTile.y === y) {
          ctx.fillStyle = 'rgba(196, 163, 90, 0.3)';
          ctx.fillRect(px, py, cellSize, cellSize);
        }

        // Tile objects (small indicator)
        if (tile.objects.length > 0 && tile.isVisible) {
          ctx.fillStyle = '#C4A35A';
          ctx.beginPath();
          ctx.arc(px + cellSize - 4, py + 4, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw area effects
    for (const effect of map.activeEffects) {
      ctx.fillStyle = effect.color || 'rgba(255, 100, 100, 0.3)';
      ctx.strokeStyle = effect.color || 'rgba(255, 100, 100, 0.6)';
      ctx.lineWidth = 2;

      // Simple circle for now
      if (effect.shape === 'circle' || effect.shape === 'sphere') {
        const radiusSquares = Math.ceil(effect.size / 5);
        ctx.beginPath();
        ctx.arc(
          effect.origin.x * cellSize + cellSize / 2,
          effect.origin.y * cellSize + cellSize / 2,
          radiusSquares * cellSize,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
      }
    }

    // Draw drag path
    if (dragPath.length > 1) {
      ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(
        dragPath[0].x * cellSize + cellSize / 2,
        dragPath[0].y * cellSize + cellSize / 2
      );
      for (let i = 1; i < dragPath.length; i++) {
        ctx.lineTo(
          dragPath[i].x * cellSize + cellSize / 2,
          dragPath[i].y * cellSize + cellSize / 2
        );
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw entities
    for (const entity of map.entities) {
      if (!entity.isVisible) continue;

      const px = entity.position.x * cellSize;
      const py = entity.position.y * cellSize;
      const isSelected = entity.id === selectedEntityId;

      // Entity circle
      const color = ENTITY_COLORS[entity.entityType] || ENTITY_COLORS.neutral;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px + cellSize / 2, py + cellSize / 2, cellSize / 2 - 2, 0, Math.PI * 2);
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = '#FFC107';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Entity initial
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${cellSize * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        entity.name.charAt(0).toUpperCase(),
        px + cellSize / 2,
        py + cellSize / 2
      );
    }

    // Coordinates overlay
    if (showCoordinates && hoveredTile) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, 60, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${hoveredTile.x}, ${hoveredTile.y}`, 4, 4);
    }
  }, [map, cellSize, showGrid, showCoordinates, hoveredTile, dragPath, selectedEntityId]);

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = mouseToGrid(e);
    setHoveredTile(pos);

    if (isDragging && selectedEntityId) {
      // Add to drag path if not already there
      const lastPos = dragPath[dragPath.length - 1];
      if (!lastPos || lastPos.x !== pos.x || lastPos.y !== pos.y) {
        setDragPath(prev => [...prev, pos]);
      }
    }
  }, [mouseToGrid, isDragging, selectedEntityId, dragPath]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = mouseToGrid(e);
    
    // Check if clicking on an entity
    const clickedEntity = map.entities.find(entity =>
      entity.position.x === pos.x && entity.position.y === pos.y
    );

    if (clickedEntity) {
      onEntityClick?.(clickedEntity);
      if (clickedEntity.entityType === 'player') {
        setIsDragging(true);
        setDragPath([pos]);
      }
    } else {
      onTileClick?.(pos);
    }
  }, [mouseToGrid, map.entities, onEntityClick, onTileClick]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragPath.length > 1 && selectedEntityId) {
      onMoveRequest?.(selectedEntityId, dragPath);
    }
    setIsDragging(false);
    setDragPath([]);
  }, [isDragging, dragPath, selectedEntityId, onMoveRequest]);

  const handleMouseLeave = useCallback(() => {
    setHoveredTile(null);
    setIsDragging(false);
    setDragPath([]);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={map.width * cellSize}
        height={map.height * cellSize}
        className="border border-primary/30 rounded cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-background/90 rounded p-2 text-xs">
        <div className="flex items-center gap-1 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ENTITY_COLORS.player }} />
          <span className="text-parchment/70">Player</span>
        </div>
        <div className="flex items-center gap-1 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ENTITY_COLORS.enemy }} />
          <span className="text-parchment/70">Enemy</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ENTITY_COLORS.ally }} />
          <span className="text-parchment/70">Ally</span>
        </div>
      </div>
    </div>
  );
}

// Helper to adjust color brightness
function adjustBrightness(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const adjust = (c: number) => Math.max(0, Math.min(255, Math.round(c + c * factor)));
  
  return `#${adjust(r).toString(16).padStart(2, '0')}${adjust(g).toString(16).padStart(2, '0')}${adjust(b).toString(16).padStart(2, '0')}`;
}

// Map info panel component
export function MapInfoPanel({ map, selectedEntity }: { map: GameMap; selectedEntity?: MapEntity }) {
  const hoveredTile = null; // Would be passed from parent

  return (
    <div className="bg-surface rounded-lg p-4 border border-primary/20">
      <h3 className="font-medieval text-lg text-primary mb-3">{map.name}</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-parchment/60">Size:</span>
          <span className="text-parchment">{map.width * 5}ft x {map.height * 5}ft</span>
        </div>
        <div className="flex justify-between">
          <span className="text-parchment/60">Light:</span>
          <span className="text-parchment capitalize">{map.ambientLight}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-parchment/60">Entities:</span>
          <span className="text-parchment">{map.entities.length}</span>
        </div>
      </div>

      {selectedEntity && (
        <div className="mt-4 pt-4 border-t border-primary/10">
          <h4 className="text-primary mb-2">{selectedEntity.name}</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-parchment/60">Position:</span>
              <span className="text-parchment">({selectedEntity.position.x}, {selectedEntity.position.y})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-parchment/60">Speed:</span>
              <span className="text-parchment">{selectedEntity.speed} ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-parchment/60">Movement:</span>
              <span className="text-parchment">{selectedEntity.speed - selectedEntity.movementUsed} ft remaining</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
