'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

interface MapLocation {
  id: string;
  name: string;
  type: string;
  tier: string;
  coordinates: { x: number; y: number };
  controllingFaction?: string;
  isDiscovered: boolean;
  terrain?: string;
  population?: number;
  description?: string;
}

interface TerrainRegion {
  id: string;
  type: 'mountains' | 'forest' | 'plains' | 'desert' | 'swamp' | 'tundra' | 'ocean' | 'lake';
  points: { x: number; y: number }[];
}

interface MapViewProps {
  worldSeedId: string;
  locations: MapLocation[];
  mode: 'player' | 'dm';
  onLocationClick: (locationId: string) => void;
  onRegionHover?: (regionId: string | null) => void;
  factionColors?: Record<string, string>;
  terrainRegions?: TerrainRegion[];
}

interface InfoCardProps {
  location: MapLocation | null;
  position: { x: number; y: number };
  onOpenDetails: () => void;
  factionColor?: string;
}

function InfoCard({ location, position, onOpenDetails, factionColor }: InfoCardProps) {
  if (!location) return null;

  return (
    <div
      className="absolute bg-surface-brown border border-primary-gold/50 rounded-lg shadow-xl p-4 z-50 min-w-[220px] max-w-[300px]"
      style={{ left: position.x + 10, top: position.y + 10 }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-primary-gold font-medieval">{location.name}</h3>
        <button
          onClick={onOpenDetails}
          className="text-xs text-tertiary-blue hover:underline"
        >
          Open →
        </button>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{locationIcons[location.type] || '📍'}</span>
        <span className="text-sm text-parchment/80 capitalize">{location.type}</span>
        {location.tier === 'major' && <span className="text-xs text-primary-gold">★ Major</span>}
      </div>
      {location.terrain && (
        <p className="text-xs text-parchment/60 mb-1">
          Terrain: <span className="capitalize">{location.terrain}</span>
        </p>
      )}
      {location.controllingFaction && (
        <div className="flex items-center gap-2 text-xs text-parchment/60 mb-1">
          <span>Controlled by:</span>
          <span className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: factionColor || '#6B1C23' }}
            />
            {location.controllingFaction}
          </span>
        </div>
      )}
      {location.population && (
        <p className="text-xs text-parchment/60 mb-1">
          Population: {location.population.toLocaleString()}
        </p>
      )}
      {location.description && (
        <p className="text-xs text-parchment/70 mt-2 line-clamp-2">{location.description}</p>
      )}
    </div>
  );
}

const locationIcons: Record<string, string> = {
  city: '🏰',
  town: '🏘️',
  village: '🏠',
  dungeon: '⚔️',
  ruins: '🏚️',
  landmark: '⛰️',
  fortress: '🏯',
  continent: '🌍',
  nation: '👑',
  region: '📍',
  port: '⚓',
  temple: '🛕',
  tower: '🗼',
  cave: '🕳️',
  forest: '🌲',
  mountain: '🏔️',
  capital: '👑',
};

const terrainColors: Record<string, { fill: string; stroke: string; pattern?: string }> = {
  mountains: { fill: '#5D5348', stroke: '#3D3530', pattern: 'mountains' },
  forest: { fill: '#2D4A2D', stroke: '#1D3A1D', pattern: 'trees' },
  plains: { fill: '#4A6741', stroke: '#3A5731' },
  desert: { fill: '#C4A35A', stroke: '#A48340', pattern: 'dots' },
  swamp: { fill: '#3D4A3D', stroke: '#2D3A2D', pattern: 'marsh' },
  tundra: { fill: '#8BA4B0', stroke: '#7B94A0' },
  ocean: { fill: '#1E4D6B', stroke: '#0E3D5B', pattern: 'waves' },
  lake: { fill: '#2E5D7B', stroke: '#1E4D6B' },
};

// Generate procedural terrain background based on seed
function generateTerrainNoise(seed: string) {
  // Simple hash function for seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  
  // Pseudo-random number generator based on seed
  const seededRandom = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + hash) * 43758.5453;
    return n - Math.floor(n);
  };

  return { seededRandom, hash };
}

export function MapView({
  worldSeedId,
  locations,
  mode,
  onLocationClick,
  onRegionHover,
  factionColors = {},
  terrainRegions = [],
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: -100, y: -100, width: 1200, height: 900 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredLocation, setHoveredLocation] = useState<MapLocation | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [activeLayers, setActiveLayers] = useState({
    terrain: true,
    political: true,
    labels: true,
    factions: true,
    routes: false,
    fogOfWar: mode === 'player',
  });

  // Generate procedural terrain regions if none provided
  const proceduralTerrain = useMemo(() => {
    if (terrainRegions.length > 0) return terrainRegions;
    
    const { seededRandom, hash } = generateTerrainNoise(worldSeedId);
    const regions: TerrainRegion[] = [];
    const terrainTypes: TerrainRegion['type'][] = ['forest', 'mountains', 'plains', 'desert', 'swamp'];
    
    // Generate terrain blobs
    for (let i = 0; i < 8; i++) {
      const centerX = ((hash + i * 1234) % 800) + 100;
      const centerY = ((hash + i * 5678) % 600) + 100;
      const terrainType = terrainTypes[Math.abs((hash + i) % terrainTypes.length)];
      const points: { x: number; y: number }[] = [];
      const numPoints = 8 + Math.floor(seededRandom(i, 0) * 8);
      const baseRadius = 80 + seededRandom(i, 1) * 120;
      
      for (let j = 0; j < numPoints; j++) {
        const angle = (j / numPoints) * Math.PI * 2;
        const radiusVariation = 0.6 + seededRandom(i, j) * 0.8;
        const radius = baseRadius * radiusVariation;
        points.push({
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        });
      }
      
      regions.push({ id: `terrain-${i}`, type: terrainType, points });
    }
    
    // Add water bodies
    const waterX = ((hash * 3) % 600) + 200;
    const waterY = ((hash * 7) % 400) + 200;
    regions.push({
      id: 'lake-main',
      type: 'lake',
      points: [
        { x: waterX, y: waterY },
        { x: waterX + 100, y: waterY - 30 },
        { x: waterX + 150, y: waterY + 40 },
        { x: waterX + 80, y: waterY + 100 },
        { x: waterX - 20, y: waterY + 60 },
      ],
    });
    
    return regions;
  }, [worldSeedId, terrainRegions]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 1.1 : 0.9;
    
    setViewBox((prev) => {
      const newWidth = prev.width * scaleFactor;
      const newHeight = prev.height * scaleFactor;
      const widthDiff = newWidth - prev.width;
      const heightDiff = newHeight - prev.height;
      
      return {
        x: prev.x - widthDiff / 2,
        y: prev.y - heightDiff / 2,
        width: Math.min(Math.max(newWidth, 300), 5000),
        height: Math.min(Math.max(newHeight, 225), 3750),
      };
    });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = (e.clientX - dragStart.x) * (viewBox.width / 1000);
      const dy = (e.clientY - dragStart.y) * (viewBox.height / 750);
      
      setViewBox((prev) => ({
        ...prev,
        x: prev.x - dx,
        y: prev.y - dy,
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Update fog of war based on mode
  useEffect(() => {
    setActiveLayers((prev) => ({ ...prev, fogOfWar: mode === 'player' }));
  }, [mode]);

  const visibleLocations = locations.filter((loc) => {
    if (mode === 'player' && !loc.isDiscovered) return false;
    return true;
  });

  const getFactionColor = (factionName?: string) => {
    if (!factionName) return '#4a4a4a';
    return factionColors[factionName] || '#6B1C23';
  };

  // Create path from points
  const createPath = (points: { x: number; y: number }[]) => {
    if (points.length < 3) return '';
    return points.reduce((path, point, i) => {
      return path + (i === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
    }, '') + ' Z';
  };

  return (
    <div className="relative w-full h-full bg-background-dark">
      {/* Layer Controls */}
      <div className="absolute top-4 right-4 z-40 bg-surface-brown rounded-lg p-3 border border-primary-gold/30 shadow-lg">
        <h4 className="text-sm font-semibold text-primary-gold mb-2">Map Layers</h4>
        <div className="space-y-1">
          {Object.entries(activeLayers).map(([layer, active]) => (
            <label key={layer} className="flex items-center gap-2 text-sm text-parchment cursor-pointer hover:text-primary-gold">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActiveLayers((prev) => ({ ...prev, [layer]: e.target.checked }))}
                className="rounded border-primary-gold/50 accent-primary-gold"
              />
              <span className="capitalize">{layer === 'fogOfWar' ? 'Fog of War' : layer}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Minimap */}
      <div className="absolute bottom-4 right-4 z-40 w-32 h-24 bg-surface-brown/90 rounded border border-primary-gold/30 overflow-hidden">
        <svg viewBox="0 0 1000 800" className="w-full h-full">
          {/* Simplified terrain in minimap */}
          {activeLayers.terrain && proceduralTerrain.map((region) => (
            <path
              key={region.id}
              d={createPath(region.points)}
              fill={terrainColors[region.type]?.fill || '#4a4a4a'}
              opacity={0.5}
            />
          ))}
          {/* Location dots */}
          {visibleLocations.map((loc) => (
            <circle
              key={loc.id}
              cx={loc.coordinates.x * 10}
              cy={loc.coordinates.y * 10}
              r={loc.tier === 'major' ? 4 : 2}
              fill="#C4A35A"
            />
          ))}
          {/* Viewport indicator */}
          <rect
            x={viewBox.x}
            y={viewBox.y}
            width={viewBox.width}
            height={viewBox.height}
            fill="none"
            stroke="#C4A35A"
            strokeWidth={2}
            opacity={0.8}
          />
        </svg>
      </div>

      {/* Main Map Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          className="select-none"
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(196, 163, 90, 0.08)" strokeWidth="0.5" />
            </pattern>
            
            {/* Hex Grid Pattern */}
            <pattern id="hexgrid" width="86.6" height="100" patternUnits="userSpaceOnUse">
              <path 
                d="M 43.3 0 L 86.6 25 L 86.6 75 L 43.3 100 L 0 75 L 0 25 Z" 
                fill="none" 
                stroke="rgba(196, 163, 90, 0.05)" 
                strokeWidth="0.5" 
              />
            </pattern>

            {/* Glow Filter */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Fog Filter */}
            <filter id="fog">
              <feGaussianBlur stdDeviation="15" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
            </filter>

            {/* Mountain Pattern */}
            <pattern id="mountains-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 0 40 L 20 10 L 40 40" fill="none" stroke="#3D3530" strokeWidth="1" opacity="0.3" />
              <path d="M 10 40 L 25 20 L 40 40" fill="none" stroke="#3D3530" strokeWidth="1" opacity="0.2" />
            </pattern>

            {/* Tree Pattern */}
            <pattern id="trees-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r="5" fill="#1D3A1D" opacity="0.3" />
              <circle cx="5" cy="5" r="3" fill="#1D3A1D" opacity="0.2" />
              <circle cx="25" cy="8" r="4" fill="#1D3A1D" opacity="0.25" />
            </pattern>

            {/* Wave Pattern for Water */}
            <pattern id="waves-pattern" width="60" height="20" patternUnits="userSpaceOnUse">
              <path d="M 0 10 Q 15 0 30 10 T 60 10" fill="none" stroke="#0E3D5B" strokeWidth="1" opacity="0.3" />
            </pattern>

            {/* Location Markers */}
            <symbol id="marker-major" viewBox="-20 -20 40 40">
              <circle r="18" fill="#2D241E" stroke="#C4A35A" strokeWidth="2" />
              <circle r="12" fill="#3D342E" />
            </symbol>
            
            <symbol id="marker-supporting" viewBox="-15 -15 30 30">
              <circle r="13" fill="#2D241E" stroke="#888" strokeWidth="1.5" />
              <circle r="9" fill="#3D342E" />
            </symbol>
            
            <symbol id="marker-minor" viewBox="-10 -10 20 20">
              <circle r="8" fill="#2D241E" stroke="#666" strokeWidth="1" />
            </symbol>
          </defs>

          {/* Background */}
          <rect x="-2000" y="-2000" width="5000" height="4000" fill="#1A1714" />
          <rect x="-2000" y="-2000" width="5000" height="4000" fill="url(#grid)" />

          {/* Terrain Regions */}
          {activeLayers.terrain && proceduralTerrain.map((region) => {
            const terrain = terrainColors[region.type];
            return (
              <g key={region.id}>
                <path
                  d={createPath(region.points)}
                  fill={terrain?.fill || '#4a4a4a'}
                  stroke={terrain?.stroke || '#3a3a3a'}
                  strokeWidth={2}
                  opacity={0.7}
                />
                {terrain?.pattern && (
                  <path
                    d={createPath(region.points)}
                    fill={`url(#${terrain.pattern}-pattern)`}
                    opacity={0.5}
                  />
                )}
              </g>
            );
          })}

          {/* Faction Territories */}
          {activeLayers.factions && visibleLocations
            .filter((loc) => loc.controllingFaction)
            .map((loc) => {
              const x = loc.coordinates.x * 10;
              const y = loc.coordinates.y * 10;
              const radius = loc.tier === 'major' ? 60 : loc.tier === 'supporting' ? 40 : 25;
              
              return (
                <circle
                  key={`territory-${loc.id}`}
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={getFactionColor(loc.controllingFaction)}
                  opacity={0.15}
                  stroke={getFactionColor(loc.controllingFaction)}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
              );
            })}

          {/* Location Markers */}
          {visibleLocations.map((loc) => {
            const x = loc.coordinates.x * 10;
            const y = loc.coordinates.y * 10;
            const icon = locationIcons[loc.type] || '📍';
            const isUndiscovered = mode === 'player' && !loc.isDiscovered;
            const markerSize = loc.tier === 'major' ? 40 : loc.tier === 'supporting' ? 30 : 20;
            
            return (
              <g
                key={loc.id}
                transform={`translate(${x}, ${y})`}
                onClick={() => !isUndiscovered && onLocationClick(loc.id)}
                onMouseEnter={(e) => {
                  if (!isUndiscovered) {
                    setHoveredLocation(loc);
                    setHoverPosition({ x: e.clientX, y: e.clientY });
                    onRegionHover?.(loc.id);
                  }
                }}
                onMouseLeave={() => {
                  setHoveredLocation(null);
                  onRegionHover?.(null);
                }}
                className={`cursor-pointer transition-all duration-200 ${
                  isUndiscovered ? 'opacity-20' : 'hover:opacity-100'
                }`}
                filter={hoveredLocation?.id === loc.id ? 'url(#glow)' : undefined}
                opacity={hoveredLocation && hoveredLocation.id !== loc.id ? 0.6 : 1}
              >
                {/* Use marker symbol */}
                <use
                  href={`#marker-${loc.tier}`}
                  x={-markerSize / 2}
                  y={-markerSize / 2}
                  width={markerSize}
                  height={markerSize}
                />

                {/* Location Icon */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={loc.tier === 'major' ? 18 : loc.tier === 'supporting' ? 14 : 10}
                  className="pointer-events-none"
                >
                  {icon}
                </text>

                {/* Location Name Label */}
                {activeLayers.labels && loc.tier !== 'minor' && (
                  <g>
                    <rect
                      x={-50}
                      y={markerSize / 2 + 4}
                      width={100}
                      height={16}
                      fill="rgba(26, 23, 20, 0.8)"
                      rx={3}
                    />
                    <text
                      y={markerSize / 2 + 15}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#F4E4BC"
                      className="pointer-events-none"
                      fontWeight={loc.tier === 'major' ? 'bold' : 'normal'}
                    >
                      {isUndiscovered ? '???' : loc.name.length > 12 ? loc.name.slice(0, 11) + '…' : loc.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Fog of War Overlay */}
          {activeLayers.fogOfWar && mode === 'player' && (
            <g>
              {/* Full fog layer */}
              <rect
                x="-2000"
                y="-2000"
                width="5000"
                height="4000"
                fill="#0a0908"
                opacity={0.7}
                mask="url(#fog-mask)"
              />
              {/* Reveal circles around discovered locations */}
              <defs>
                <mask id="fog-mask">
                  <rect x="-2000" y="-2000" width="5000" height="4000" fill="white" />
                  {locations
                    .filter((loc) => loc.isDiscovered)
                    .map((loc) => {
                      const x = loc.coordinates.x * 10;
                      const y = loc.coordinates.y * 10;
                      const radius = loc.tier === 'major' ? 150 : loc.tier === 'supporting' ? 100 : 60;
                      return (
                        <circle
                          key={`fog-reveal-${loc.id}`}
                          cx={x}
                          cy={y}
                          r={radius}
                          fill="black"
                        />
                      );
                    })}
                </mask>
              </defs>
            </g>
          )}
        </svg>
      </div>

      {/* Info Card */}
      <InfoCard
        location={hoveredLocation}
        position={hoverPosition}
        onOpenDetails={() => hoveredLocation && onLocationClick(hoveredLocation.id)}
        factionColor={hoveredLocation?.controllingFaction ? getFactionColor(hoveredLocation.controllingFaction) : undefined}
      />

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-surface-brown/90 rounded-lg px-4 py-3 border border-primary-gold/30">
        <div className="text-xs text-parchment/60 space-y-1">
          <div className="flex items-center gap-4 mb-2">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-primary-gold border border-primary-gold" /> Major
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-surface-brown border border-gray-500" /> Supporting
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-surface-brown border border-gray-600" /> Minor
            </span>
          </div>
          <p>Scroll to zoom • Drag to pan • Click location for details</p>
        </div>
      </div>
    </div>
  );
}
