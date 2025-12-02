'use client';

import { useState, useRef, useCallback } from 'react';

interface HistoricalEvent {
  id: string;
  name: string;
  description: string;
  yearsAgo: number;
  era: string;
  tensionInvolved?: string;
  involvedEntities: { type: string; name: string }[];
  locations: string[];
  isDiscovered: boolean;
  isSecret?: boolean;
}

interface Era {
  name: string;
  startYear: number;
  endYear: number;
  color: string;
  description?: string;
}

interface TimelineViewProps {
  worldSeedId: string;
  eras: Era[];
  events: HistoricalEvent[];
  currentYear: number;
  mode: 'player' | 'dm';
  onEventClick: (eventId: string) => void;
  onEntityClick: (entityType: string, entityName: string) => void;
}

export function TimelineView({
  worldSeedId,
  eras,
  events,
  currentYear,
  mode,
  onEventClick,
  onEntityClick,
}: TimelineViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<'overview' | 'detailed'>('overview');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const visibleEvents = events.filter((event) => {
    if (mode === 'player') {
      if (!event.isDiscovered) return false;
      if (event.isSecret) return false;
    }
    return true;
  });

  const sortedEras = [...eras].sort((a, b) => b.startYear - a.startYear);

  const getEventsByEra = (eraName: string) => {
    return visibleEvents
      .filter((e) => e.era === eraName)
      .sort((a, b) => b.yearsAgo - a.yearsAgo);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart(e.clientX);
    setScrollLeft(containerRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const delta = dragStart - e.clientX;
    containerRef.current.scrollLeft = scrollLeft + delta;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleEvent = (eventId: string) => {
    setExpandedEvent(expandedEvent === eventId ? null : eventId);
  };

  const formatYear = (yearsAgo: number) => {
    if (yearsAgo === 0) return 'Present';
    if (yearsAgo < 0) return `${Math.abs(yearsAgo)} years hence`;
    return `${yearsAgo} years ago`;
  };

  return (
    <div className="flex flex-col h-full bg-background-dark">
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary-gold/20">
        <h3 className="text-lg font-medieval text-primary-gold">World History</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-surface-brown rounded-lg p-1">
            <button
              onClick={() => setZoomLevel('overview')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                zoomLevel === 'overview'
                  ? 'bg-primary-gold text-background-dark'
                  : 'text-parchment/60 hover:text-parchment'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setZoomLevel('detailed')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                zoomLevel === 'detailed'
                  ? 'bg-primary-gold text-background-dark'
                  : 'text-parchment/60 hover:text-parchment'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex h-full min-w-max p-4 gap-1">
          {sortedEras.map((era, eraIndex) => {
            const eraEvents = getEventsByEra(era.name);
            const eraWidth = zoomLevel === 'overview' ? 200 : 300;
            
            return (
              <div
                key={era.name}
                className="flex flex-col h-full"
                style={{ minWidth: eraWidth }}
              >
                <div
                  className="px-4 py-2 rounded-t-lg text-center border-b-2"
                  style={{ 
                    backgroundColor: `${era.color}20`,
                    borderColor: era.color 
                  }}
                >
                  <h4 className="font-medieval text-primary-gold">{era.name}</h4>
                  <span className="text-xs text-parchment/60">
                    {formatYear(era.startYear)} — {formatYear(era.endYear)}
                  </span>
                </div>

                <div 
                  className="flex-1 relative border-l-2 ml-4 pl-4 py-4 space-y-3"
                  style={{ borderColor: `${era.color}40` }}
                >
                  {era.name === sortedEras[0]?.name && currentYear >= era.endYear && currentYear <= era.startYear && (
                    <div className="absolute -left-2 top-4 w-4 h-4 rounded-full bg-forest-green border-2 border-background-dark z-10">
                      <span className="absolute left-6 top-0 text-xs text-forest-green whitespace-nowrap">
                        NOW
                      </span>
                    </div>
                  )}

                  {eraEvents.length === 0 ? (
                    <div className="text-parchment/30 text-sm italic">No known events</div>
                  ) : (
                    eraEvents.map((event) => (
                      <div key={event.id} className="relative">
                        <div
                          className="absolute -left-6 top-2 w-3 h-3 rounded-full border-2 border-surface-brown"
                          style={{ backgroundColor: era.color }}
                        />
                        
                        <div
                          onClick={() => toggleEvent(event.id)}
                          className={`bg-surface-brown rounded-lg p-3 cursor-pointer transition-all hover:border-primary-gold/50 border ${
                            expandedEvent === event.id
                              ? 'border-primary-gold'
                              : 'border-primary-gold/20'
                          } ${!event.isDiscovered && mode === 'player' ? 'opacity-50 blur-sm' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {event.isSecret ? '🔒' : '⚔️'}
                              </span>
                              <span className="font-medieval text-primary-gold text-sm">
                                {event.isDiscovered || mode === 'dm' ? event.name : '???'}
                              </span>
                            </div>
                            <span className="text-xs text-parchment/50 whitespace-nowrap">
                              {formatYear(event.yearsAgo)}
                            </span>
                          </div>

                          {expandedEvent === event.id && (event.isDiscovered || mode === 'dm') && (
                            <div className="mt-3 pt-3 border-t border-primary-gold/20 space-y-3">
                              <p className="text-sm text-parchment leading-relaxed">
                                {event.description}
                              </p>

                              {event.tensionInvolved && (
                                <div className="text-xs">
                                  <span className="text-primary-gold">Tension:</span>{' '}
                                  <span className="text-parchment/80">{event.tensionInvolved}</span>
                                </div>
                              )}

                              {event.involvedEntities.length > 0 && (
                                <div className="text-xs">
                                  <span className="text-primary-gold">Involved:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {event.involvedEntities.map((entity, i) => (
                                      <button
                                        key={i}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEntityClick(entity.type, entity.name);
                                        }}
                                        className="px-2 py-0.5 bg-tertiary-blue/20 text-tertiary-blue rounded hover:bg-tertiary-blue/30 transition-colors"
                                      >
                                        {entity.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {event.locations.length > 0 && (
                                <div className="text-xs">
                                  <span className="text-primary-gold">Locations:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {event.locations.map((loc, i) => (
                                      <button
                                        key={i}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEntityClick('location', loc);
                                        }}
                                        className="px-2 py-0.5 bg-forest-green/20 text-forest-green rounded hover:bg-forest-green/30 transition-colors"
                                      >
                                        📍 {loc}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {mode === 'dm' && event.isSecret && (
                                <div className="text-xs text-ember-red flex items-center gap-1 mt-2">
                                  <span>🔒</span>
                                  <span>Secret event (hidden from players)</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-2 border-t border-primary-gold/20 text-xs text-parchment/50">
        Drag to scroll • Click event to expand • {visibleEvents.length} events shown
      </div>
    </div>
  );
}
