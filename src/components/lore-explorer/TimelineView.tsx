'use client';

import { useState, useMemo } from 'react';

export type TimelineEventType = 'era' | 'war' | 'discovery' | 'founding' | 'catastrophe' | 'political' | 'magical' | 'divine';

export interface TimelineEra {
  id: string;
  name: string;
  startYear: number;
  endYear: number | null;
  description?: string;
  tone?: string;
  isDiscovered?: boolean;
}

export interface TimelineEvent {
  id: string;
  name: string;
  year: number;
  type?: TimelineEventType;
  description?: string;
  significance: 'major' | 'supporting' | 'minor' | string;
  involvedFactions?: string[];
  involvedNpcs?: string[];
  isDiscovered?: boolean;
  isPlayerVisible?: boolean;
  isDMOnly?: boolean;
}

interface TimelineViewProps {
  worldSeedId?: string;
  eras: TimelineEra[];
  events: TimelineEvent[];
  mode: 'player' | 'dm';
  onEventClick?: (eventId: string) => void;
  onEraClick?: (eraId: string) => void;
}

const eventTypeIcons: Record<TimelineEventType, string> = {
  era: '📜',
  war: '⚔️',
  discovery: '🔮',
  founding: '🏰',
  catastrophe: '💥',
  political: '👑',
  magical: '✨',
  divine: '🌟',
};

const eventTypeColors: Record<TimelineEventType, string> = {
  era: '#C4A35A',
  war: '#CF6679',
  discovery: '#4CAF50',
  founding: '#1E4D6B',
  catastrophe: '#FF5722',
  political: '#9C27B0',
  magical: '#00BCD4',
  divine: '#FFC107',
};

const significanceSize: Record<string, { dot: number; text: string }> = {
  major: { dot: 16, text: 'text-sm' },
  supporting: { dot: 12, text: 'text-xs' },
  minor: { dot: 8, text: 'text-xs' },
};

export function TimelineView({
  worldSeedId,
  eras,
  events,
  mode,
  onEventClick,
  onEraClick,
}: TimelineViewProps) {
  const [selectedEraFilter, setSelectedEraFilter] = useState<string | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<TimelineEventType | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<'overview' | 'detailed'>('overview');

  // Filter events based on player/dm mode and visibility
  const visibleEvents = useMemo(() => {
    return events.filter((event) => {
      if (mode === 'player' && !event.isDiscovered) return false;
      if (selectedEraFilter) {
        const era = eras.find((e) => e.id === selectedEraFilter);
        if (era && (event.year < era.startYear || (era.endYear && event.year > era.endYear))) {
          return false;
        }
      }
      if (selectedTypeFilter && event.type !== selectedTypeFilter) return false;
      return true;
    });
  }, [events, mode, selectedEraFilter, selectedTypeFilter, eras]);

  // Calculate timeline bounds
  const timelineBounds = useMemo(() => {
    const allYears = [
      ...eras.map((e) => e.startYear),
      ...eras.map((e) => e.endYear).filter((y): y is number => y !== null),
      ...visibleEvents.map((e) => e.year),
    ];
    
    if (allYears.length === 0) return { min: -1000, max: 0 };
    
    const min = Math.min(...allYears);
    const max = Math.max(...allYears);
    const padding = Math.max(100, (max - min) * 0.1);
    
    return { min: min - padding, max: max + padding };
  }, [eras, visibleEvents]);

  // Get position on timeline (0-100%)
  const getTimelinePosition = (year: number) => {
    const { min, max } = timelineBounds;
    return ((year - min) / (max - min)) * 100;
  };

  // Format year display
  const formatYear = (year: number) => {
    if (year < 0) return `${Math.abs(year)} BCE`;
    if (year === 0) return 'Year 0';
    return `${year} CE`;
  };

  // Group events by significance for layered display
  const eventsBySignificance = useMemo(() => {
    return {
      major: visibleEvents.filter((e) => e.significance === 'major'),
      supporting: visibleEvents.filter((e) => e.significance === 'supporting'),
      minor: visibleEvents.filter((e) => e.significance === 'minor'),
    };
  }, [visibleEvents]);

  if (eras.length === 0 && events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-parchment/50">
        <div className="text-center">
          <span className="text-6xl">📜</span>
          <p className="mt-4">No history recorded yet</p>
          <p className="text-sm mt-2">
            World history will appear here once generation is complete
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background-dark p-4 overflow-hidden">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h3 className="text-lg font-medieval text-primary-gold">World Timeline</h3>
          <p className="text-sm text-parchment/60">
            {eras.length} eras • {visibleEvents.length} events
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Era Filter */}
          <select
            value={selectedEraFilter || ''}
            onChange={(e) => setSelectedEraFilter(e.target.value || null)}
            className="bg-surface-brown border border-primary-gold/30 rounded px-3 py-1.5 text-sm text-parchment"
          >
            <option value="">All Eras</option>
            {eras.map((era) => (
              <option key={era.id} value={era.id}>
                {era.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedTypeFilter || ''}
            onChange={(e) => setSelectedTypeFilter((e.target.value as TimelineEventType) || null)}
            className="bg-surface-brown border border-primary-gold/30 rounded px-3 py-1.5 text-sm text-parchment"
          >
            <option value="">All Types</option>
            {Object.entries(eventTypeIcons).map(([type, icon]) => (
              <option key={type} value={type}>
                {icon} {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>

          {/* Zoom Toggle */}
          <div className="flex items-center gap-1 bg-surface-brown rounded p-1">
            <button
              onClick={() => setZoomLevel('overview')}
              className={`px-2 py-1 rounded text-xs ${
                zoomLevel === 'overview'
                  ? 'bg-primary-gold text-background-dark'
                  : 'text-parchment/60 hover:text-parchment'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setZoomLevel('detailed')}
              className={`px-2 py-1 rounded text-xs ${
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

      {/* Era Bands */}
      <div className="relative mb-2 h-8 bg-surface-brown/50 rounded-lg overflow-hidden flex-shrink-0">
        {eras.map((era) => {
          const start = getTimelinePosition(era.startYear);
          const end = getTimelinePosition(era.endYear || timelineBounds.max);
          const width = end - start;
          
          return (
            <div
              key={era.id}
              className={`absolute h-full cursor-pointer transition-opacity ${
                selectedEraFilter && selectedEraFilter !== era.id ? 'opacity-30' : ''
              }`}
              style={{
                left: `${start}%`,
                width: `${width}%`,
                backgroundColor: `hsla(${(era.startYear % 360)}, 50%, 30%, 0.6)`,
                borderLeft: '2px solid rgba(196, 163, 90, 0.5)',
              }}
              onClick={() => onEraClick?.(era.id)}
              title={`${era.name}: ${formatYear(era.startYear)} - ${era.endYear ? formatYear(era.endYear) : 'Present'}`}
            >
              <span className="absolute inset-0 flex items-center justify-center text-xs text-parchment truncate px-2">
                {width > 10 && era.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Timeline */}
      <div className="flex-1 relative overflow-x-auto overflow-y-hidden">
        <div className="relative min-w-full h-full" style={{ minWidth: zoomLevel === 'detailed' ? '200%' : '100%' }}>
          {/* Timeline Axis */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-primary-gold/30 -translate-y-1/2" />

          {/* Year Markers */}
          {Array.from({ length: 11 }).map((_, i) => {
            const year = timelineBounds.min + ((timelineBounds.max - timelineBounds.min) * i) / 10;
            const roundedYear = Math.round(year / 100) * 100;
            
            return (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2"
                style={{ left: `${(i / 10) * 100}%` }}
              >
                <div className="w-0.5 h-4 bg-primary-gold/50 mx-auto" />
                <span className="absolute top-6 left-1/2 -translate-x-1/2 text-xs text-parchment/50 whitespace-nowrap">
                  {formatYear(roundedYear)}
                </span>
              </div>
            );
          })}

          {/* Event Markers - Major */}
          <div className="absolute top-0 left-0 right-0" style={{ height: '40%' }}>
            {eventsBySignificance.major.map((event) => (
              <EventMarker
                key={event.id}
                event={event}
                position={getTimelinePosition(event.year)}
                isHovered={hoveredEvent === event.id}
                onHover={setHoveredEvent}
                onClick={() => onEventClick?.(event.id)}
                layer="top"
                formatYear={formatYear}
              />
            ))}
          </div>

          {/* Event Markers - Supporting (middle) */}
          <div className="absolute left-0 right-0" style={{ top: '35%', height: '30%' }}>
            {eventsBySignificance.supporting.map((event) => (
              <EventMarker
                key={event.id}
                event={event}
                position={getTimelinePosition(event.year)}
                isHovered={hoveredEvent === event.id}
                onHover={setHoveredEvent}
                onClick={() => onEventClick?.(event.id)}
                layer="middle"
                formatYear={formatYear}
              />
            ))}
          </div>

          {/* Event Markers - Minor (bottom) */}
          <div className="absolute bottom-0 left-0 right-0" style={{ height: '35%' }}>
            {eventsBySignificance.minor.map((event) => (
              <EventMarker
                key={event.id}
                event={event}
                position={getTimelinePosition(event.year)}
                isHovered={hoveredEvent === event.id}
                onHover={setHoveredEvent}
                onClick={() => onEventClick?.(event.id)}
                layer="bottom"
                formatYear={formatYear}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-primary-gold/20 justify-center flex-shrink-0">
        {Object.entries(eventTypeIcons).map(([type, icon]) => (
          <button
            key={type}
            onClick={() => setSelectedTypeFilter(
              selectedTypeFilter === type ? null : type as TimelineEventType
            )}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
              selectedTypeFilter === type
                ? 'bg-primary-gold/20 text-primary-gold'
                : 'text-parchment/60 hover:text-parchment'
            }`}
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: eventTypeColors[type as TimelineEventType] }}
            />
            <span>{icon}</span>
            <span className="capitalize">{type}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Individual Event Marker Component
interface EventMarkerProps {
  event: TimelineEvent;
  position: number;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
  layer: 'top' | 'middle' | 'bottom';
  formatYear: (year: number) => string;
}

function EventMarker({
  event,
  position,
  isHovered,
  onHover,
  onClick,
  layer,
  formatYear,
}: EventMarkerProps) {
  const size = significanceSize[event.significance as 'major' | 'supporting' | 'minor'] || significanceSize.minor;
  const eventType = event.type || 'era';
  const color = eventTypeColors[eventType];
  const icon = eventTypeIcons[eventType];

  return (
    <div
      className="absolute cursor-pointer transition-transform"
      style={{
        left: `${position}%`,
        transform: `translateX(-50%) ${isHovered ? 'scale(1.2)' : ''}`,
        top: layer === 'top' ? '10%' : layer === 'middle' ? '50%' : '70%',
      }}
      onMouseEnter={() => onHover(event.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
    >
      {/* Connector Line */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-px bg-primary-gold/30"
        style={{
          height: layer === 'top' ? '60%' : layer === 'middle' ? '30%' : '40%',
          top: layer === 'top' ? '100%' : layer === 'middle' ? '-20%' : '-50%',
        }}
      />

      {/* Event Dot */}
      <div
        className="rounded-full flex items-center justify-center shadow-lg"
        style={{
          width: size.dot,
          height: size.dot,
          backgroundColor: color,
          boxShadow: isHovered ? `0 0 12px ${color}` : 'none',
        }}
      >
        <span style={{ fontSize: size.dot * 0.6 }}>{icon}</span>
      </div>

      {/* Tooltip */}
      {isHovered && (
        <div
          className="absolute z-50 bg-surface-brown border border-primary-gold/50 rounded-lg shadow-xl p-3 min-w-[200px]"
          style={{
            top: layer === 'bottom' ? 'auto' : '100%',
            bottom: layer === 'bottom' ? '100%' : 'auto',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: layer !== 'bottom' ? '8px' : '0',
            marginBottom: layer === 'bottom' ? '8px' : '0',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color }}>{icon}</span>
            <h4 className="font-medieval text-primary-gold">{event.name}</h4>
          </div>
          <p className="text-xs text-parchment/60 mb-1">{formatYear(event.year)}</p>
          {event.description && (
            <p className="text-sm text-parchment/80 line-clamp-3">{event.description}</p>
          )}
          {event.involvedFactions && event.involvedFactions.length > 0 && (
            <p className="text-xs text-parchment/50 mt-2">
              Factions: {event.involvedFactions.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
