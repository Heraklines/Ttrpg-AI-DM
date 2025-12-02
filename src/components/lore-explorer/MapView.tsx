'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface MapLocation {
  id: string;
  name: string;
  type: string;
  tier: string;
  coordinates: { x: number; y: number };
  controllingFaction?: string;
  isDiscovered: boolean;
}

interface MapViewProps {
  worldSeedId: string;
  locations: MapLocation[];
  mode: 'player' | 'dm';
  onLocationClick: (locationId: string) => void;
  onRegionHover?: (regionId: string | null) => void;
  factionColors?: Record<string, string>;
}

interface InfoCardProps {
  location: MapLocation | null;
  position: { x: number; y: number };
  onOpenDetails: () => void;
}

function InfoCard({ location, position, onOpenDetails }: InfoCardProps) {
  if (!location) return null;

  return (
    <div
      className="absolute bg-surface-brown border border-primary-gold/50 rounded-lg shadow-lg p-4 z-50 min-w-[200px]"
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
      <p className="text-sm text-parchment/80 capitalize">{location.type}</p>
      {location.controllingFaction && (
        <p className="text-xs text-parchment/60 mt-1">
          Controlled by: {location.controllingFaction}
        </p>
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
};

export function MapView({
  worldSeedId,
  locations,
  mode,
  onLocationClick,
  onRegionHover,
  factionColors = {},
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 800 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredLocation, setHoveredLocation] = useState<MapLocation | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [activeLayers, setActiveLayers] = useState({
    political: true,
    geographic: true,
    factions: true,
    routes: false,
  });

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
        width: Math.min(Math.max(newWidth, 200), 4000),
        height: Math.min(Math.max(newHeight, 160), 3200),
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
      const dy = (e.clientY - dragStart.y) * (viewBox.height / 800);
      
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

  const visibleLocations = locations.filter((loc) => {
    if (mode === 'player' && !loc.isDiscovered) return false;
    return true;
  });

  const getFactionColor = (factionName?: string) => {
    if (!factionName) return '#4a4a4a';
    return factionColors[factionName] || '#6B1C23';
  };

  return (
    <div className="relative w-full h-full bg-background-dark">
      <div className="absolute top-4 right-4 z-40 bg-surface-brown rounded-lg p-3 border border-primary-gold/30">
        <h4 className="text-sm font-semibold text-primary-gold mb-2">Layers</h4>
        <div className="space-y-1">
          {Object.entries(activeLayers).map(([layer, active]) => (
            <label key={layer} className="flex items-center gap-2 text-sm text-parchment cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActiveLayers((prev) => ({ ...prev, [layer]: e.target.checked }))}
                className="rounded border-primary-gold/50"
              />
              <span className="capitalize">{layer}</span>
            </label>
          ))}
        </div>
      </div>

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
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(196, 163, 90, 0.1)" strokeWidth="0.5" />
            </pattern>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="fog">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>

          <rect x="-1000" y="-1000" width="3000" height="2600" fill="url(#grid)" />

          {visibleLocations.map((loc) => {
            const x = loc.coordinates.x * 10 || Math.random() * 800 + 100;
            const y = loc.coordinates.y * 10 || Math.random() * 600 + 100;
            const icon = locationIcons[loc.type] || '📍';
            const isUndiscovered = mode === 'player' && !loc.isDiscovered;
            
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
                className={`cursor-pointer transition-transform ${isUndiscovered ? 'opacity-30' : 'hover:scale-110'}`}
                filter={isUndiscovered ? 'url(#fog)' : undefined}
              >
                {activeLayers.factions && loc.controllingFaction && (
                  <circle
                    r={loc.tier === 'major' ? 30 : loc.tier === 'supporting' ? 20 : 15}
                    fill={getFactionColor(loc.controllingFaction)}
                    opacity={0.3}
                  />
                )}

                <circle
                  r={loc.tier === 'major' ? 20 : loc.tier === 'supporting' ? 15 : 10}
                  fill="#2D241E"
                  stroke={loc.tier === 'major' ? '#C4A35A' : '#666'}
                  strokeWidth={loc.tier === 'major' ? 2 : 1}
                />

                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={loc.tier === 'major' ? 16 : 12}
                  className="pointer-events-none"
                >
                  {icon}
                </text>

                {loc.tier !== 'minor' && (
                  <text
                    y={loc.tier === 'major' ? 35 : 25}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#F4E4BC"
                    className="pointer-events-none"
                  >
                    {isUndiscovered ? '???' : loc.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <InfoCard
        location={hoveredLocation}
        position={hoverPosition}
        onOpenDetails={() => hoveredLocation && onLocationClick(hoveredLocation.id)}
      />

      <div className="absolute bottom-4 left-4 bg-surface-brown/80 rounded-lg px-3 py-2 text-xs text-parchment/60">
        Scroll to zoom • Drag to pan • Click location for details
      </div>
    </div>
  );
}
