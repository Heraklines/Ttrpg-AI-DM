'use client';

import { useState, useEffect, useCallback } from 'react';
import { NavigationSidebar, LoreCategory } from './NavigationSidebar';
import { CodexEntry, EntityType } from './CodexEntry';
import { MapView } from './MapView';
import { RelationshipGraph } from './RelationshipGraph';
import { TimelineView, TimelineEvent, TimelineEra } from './TimelineView';

type GraphEntityType = 'npc' | 'faction' | 'location' | 'deity';
type RelationshipType = 'ally' | 'enemy' | 'rival' | 'servant' | 'patron' | 'family' | 'trade_partner' | 'neutral';

interface GraphNode {
  id: string;
  type: GraphEntityType;
  name: string;
  tier?: string;
  isDiscovered: boolean;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  strength: number;
  isPublic: boolean;
  isDiscovered: boolean;
}

interface LoreExplorerProps {
  campaignId: string;
  worldSeedId?: string;
  worldName: string;
  initialMode?: 'player' | 'dm';
}

interface EntityListItem {
  id: string;
  name: string;
  tier: string;
  type?: string;
  isDiscovered: boolean;
}

interface MapLocation {
  id: string;
  name: string;
  type: string;
  tier: string;
  coordinates: { x: number; y: number };
  controllingFaction?: string;
  isDiscovered: boolean;
}

type ViewMode = 'codex' | 'map' | 'relationships' | 'timeline';

export function LoreExplorer({
  campaignId,
  worldSeedId,
  worldName,
  initialMode = 'dm',
}: LoreExplorerProps) {
  const [mode, setMode] = useState<'player' | 'dm'>(initialMode);
  const [viewMode, setViewMode] = useState<ViewMode>('codex');
  const [selectedCategory, setSelectedCategory] = useState<LoreCategory>('factions');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [entities, setEntities] = useState<EntityListItem[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Record<string, unknown> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapLocations, setMapLocations] = useState<MapLocation[]>([]);
  const [factionColors, setFactionColors] = useState<Record<string, string>>({});
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [selectedGraphEntity, setSelectedGraphEntity] = useState<{ type: GraphEntityType; id: string } | null>(null);
  const [timelineEras, setTimelineEras] = useState<TimelineEra[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [entityCounts, setEntityCounts] = useState({
    geography: 0,
    factions: 0,
    people: 0,
    history: 0,
    conflicts: 0,
    cosmology: 0,
    secrets: 0,
  });

  const fetchEntities = useCallback(async () => {
    if (!worldSeedId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/campaign/${campaignId}/lore?category=${selectedCategory}&worldSeedId=${worldSeedId}`);
      if (res.ok) {
        const data = await res.json();
        setEntities(data.entities || []);
      }
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    }
    setLoading(false);
  }, [campaignId, selectedCategory, worldSeedId]);

  const fetchEntityCounts = useCallback(async () => {
    if (!worldSeedId) return;
    
    try {
      const res = await fetch(`/api/campaign/${campaignId}/lore/counts?worldSeedId=${worldSeedId}`);
      if (res.ok) {
        const data = await res.json();
        setEntityCounts((prev) => data.counts || prev);
      }
    } catch (error) {
      console.error('Failed to fetch entity counts:', error);
    }
  }, [campaignId, worldSeedId]);

  const fetchEntityDetails = useCallback(async (entityId: string) => {
    if (!worldSeedId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/campaign/${campaignId}/lore/${entityId}?category=${selectedCategory}&worldSeedId=${worldSeedId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedEntity(data.entity);
      }
    } catch (error) {
      console.error('Failed to fetch entity details:', error);
    }
    setLoading(false);
  }, [campaignId, selectedCategory, worldSeedId]);

  const fetchMapData = useCallback(async () => {
    if (!worldSeedId) return;
    
    try {
      // Fetch locations for the map
      const locRes = await fetch(`/api/campaign/${campaignId}/lore?category=geography&worldSeedId=${worldSeedId}`);
      if (locRes.ok) {
        const locData = await locRes.json();
        const locations: MapLocation[] = (locData.entities || []).map((loc: EntityListItem & { mapCoordinates?: string; controllingFaction?: string }) => ({
          id: loc.id,
          name: loc.name,
          type: loc.type || 'location',
          tier: loc.tier,
          coordinates: loc.mapCoordinates ? JSON.parse(loc.mapCoordinates) : { x: Math.random() * 80 + 10, y: Math.random() * 60 + 10 },
          controllingFaction: loc.controllingFaction,
          isDiscovered: loc.isDiscovered,
        }));
        setMapLocations(locations);
      }
      
      // Fetch factions for color coding
      const facRes = await fetch(`/api/campaign/${campaignId}/lore?category=factions&worldSeedId=${worldSeedId}`);
      if (facRes.ok) {
        const facData = await facRes.json();
        const colors: Record<string, string> = {};
        const palette = ['#6B1C23', '#1E4D6B', '#4A6741', '#8B4513', '#4B0082', '#B8860B', '#2F4F4F', '#8B0000'];
        (facData.entities || []).forEach((fac: EntityListItem, i: number) => {
          colors[fac.name] = palette[i % palette.length];
        });
        setFactionColors(colors);
      }
    } catch (error) {
      console.error('Failed to fetch map data:', error);
    }
  }, [campaignId, worldSeedId]);

  const fetchRelationshipData = useCallback(async () => {
    if (!worldSeedId) return;

    try {
      // Fetch all factions with their relationships
      const facRes = await fetch(`/api/campaign/${campaignId}/lore?category=factions&worldSeedId=${worldSeedId}&includeDetails=true`);
      const npcRes = await fetch(`/api/campaign/${campaignId}/lore?category=people&worldSeedId=${worldSeedId}&includeDetails=true`);
      
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      const processedRelations = new Set<string>();
      
      if (facRes.ok) {
        const facData = await facRes.json();
        (facData.entities || []).forEach((fac: EntityListItem & { alliances?: string[]; enemies?: string[]; rivalries?: string[] }) => {
          nodes.push({
            id: `faction:${fac.id}`,
            type: 'faction',
            name: fac.name,
            tier: fac.tier,
            isDiscovered: fac.isDiscovered,
          });
          
          // Add alliance edges
          (fac.alliances || []).forEach((allyName: string, idx: number) => {
            const edgeKey = [fac.name, allyName].sort().join('::');
            if (!processedRelations.has(edgeKey)) {
              edges.push({
                id: `ally-${fac.id}-${idx}`,
                source: `faction:${fac.id}`,
                target: `faction:${allyName}`, // Will be resolved by name
                type: 'ally',
                strength: 7,
                isPublic: true,
                isDiscovered: fac.isDiscovered,
              });
              processedRelations.add(edgeKey);
            }
          });
          
          // Add enemy edges
          (fac.enemies || []).forEach((enemyName: string, idx: number) => {
            const edgeKey = [fac.name, enemyName].sort().join('::');
            if (!processedRelations.has(edgeKey)) {
              edges.push({
                id: `enemy-${fac.id}-${idx}`,
                source: `faction:${fac.id}`,
                target: `faction:${enemyName}`,
                type: 'enemy',
                strength: 8,
                isPublic: true,
                isDiscovered: fac.isDiscovered,
              });
              processedRelations.add(edgeKey);
            }
          });
          
          // Add rivalry edges
          (fac.rivalries || []).forEach((rivalName: string, idx: number) => {
            const edgeKey = [fac.name, rivalName].sort().join('::');
            if (!processedRelations.has(edgeKey)) {
              edges.push({
                id: `rival-${fac.id}-${idx}`,
                source: `faction:${fac.id}`,
                target: `faction:${rivalName}`,
                type: 'rival',
                strength: 5,
                isPublic: true,
                isDiscovered: fac.isDiscovered,
              });
              processedRelations.add(edgeKey);
            }
          });
        });
      }
      
      if (npcRes.ok) {
        const npcData = await npcRes.json();
        (npcData.entities || []).forEach((npc: EntityListItem & { factionId?: string; loyalties?: string[] }) => {
          nodes.push({
            id: `npc:${npc.id}`,
            type: 'npc',
            name: npc.name,
            tier: npc.tier,
            isDiscovered: npc.isDiscovered,
          });
          
          // Add faction membership edge
          if (npc.factionId) {
            edges.push({
              id: `member-${npc.id}`,
              source: `npc:${npc.id}`,
              target: `faction:${npc.factionId}`,
              type: 'servant',
              strength: 6,
              isPublic: npc.isDiscovered,
              isDiscovered: npc.isDiscovered,
            });
          }
        });
      }

      // Resolve target names to IDs where needed
      const resolvedEdges = edges.map(edge => {
        if (edge.target.startsWith('faction:') && !nodes.some(n => n.id === edge.target)) {
          // Try to find the faction by name
          const targetName = edge.target.replace('faction:', '');
          const foundNode = nodes.find(n => n.type === 'faction' && n.name.toLowerCase() === targetName.toLowerCase());
          if (foundNode) {
            return { ...edge, target: foundNode.id };
          }
        }
        return edge;
      }).filter(edge => {
        // Only keep edges where both source and target exist
        return nodes.some(n => n.id === edge.source) && nodes.some(n => n.id === edge.target);
      });

      setGraphNodes(nodes);
      setGraphEdges(resolvedEdges);
      
      // Default to first faction as center
      if (nodes.length > 0) {
        const firstFaction = nodes.find(n => n.type === 'faction');
        if (firstFaction) {
          const [type, id] = firstFaction.id.split(':');
          setSelectedGraphEntity({ type: type as GraphEntityType, id });
        }
      }
    } catch (error) {
      console.error('Failed to fetch relationship data:', error);
    }
  }, [campaignId, worldSeedId]);

  const fetchTimelineData = useCallback(async () => {
    if (!worldSeedId) return;

    try {
      const res = await fetch(`/api/campaign/${campaignId}/lore?category=history&worldSeedId=${worldSeedId}`);
      if (res.ok) {
        const data = await res.json();
        
        // Process eras from WorldHistory model
        const eras: TimelineEra[] = (data.eras || []).map((era: { id: string; name: string; startYear: number; endYear: number; description: string; isDiscovered?: boolean }) => ({
          id: era.id,
          name: era.name,
          startYear: era.startYear,
          endYear: era.endYear,
          description: era.description,
          isDiscovered: era.isDiscovered ?? true,
        }));

        // Process major events from WorldHistory model
        const events: TimelineEvent[] = (data.majorEvents || []).map((event: { id: string; name: string; year: number; description: string; significance: string; isPlayerVisible?: boolean; isDMOnly?: boolean; isDiscovered?: boolean }) => ({
          id: event.id,
          name: event.name,
          year: event.year,
          description: event.description,
          significance: event.significance || 'major',
          isPlayerVisible: event.isPlayerVisible ?? true,
          isDMOnly: event.isDMOnly ?? false,
          isDiscovered: event.isDiscovered ?? true,
        }));

        setTimelineEras(eras);
        setTimelineEvents(events);
      }
    } catch (error) {
      console.error('Failed to fetch timeline data:', error);
    }
  }, [campaignId, worldSeedId]);

  useEffect(() => {
    fetchEntities();
    fetchEntityCounts();
    fetchMapData();
    fetchRelationshipData();
    fetchTimelineData();
  }, [fetchEntities, fetchEntityCounts, fetchMapData, fetchRelationshipData, fetchTimelineData]);

  useEffect(() => {
    if (selectedEntityId) {
      fetchEntityDetails(selectedEntityId);
    } else {
      setSelectedEntity(null);
    }
  }, [selectedEntityId, fetchEntityDetails]);

  const handleNavigate = (entityType: string, entityName: string) => {
    const categoryMap: Record<string, LoreCategory> = {
      faction: 'factions',
      npc: 'people',
      location: 'geography',
      conflict: 'conflicts',
      secret: 'secrets',
    };
    
    const targetCategory = categoryMap[entityType] || selectedCategory;
    setSelectedCategory(targetCategory);
    setViewMode('codex');
    
    const found = entities.find((e) => e.name.toLowerCase().includes(entityName.toLowerCase()));
    if (found) {
      setSelectedEntityId(found.id);
    }
  };

  const handleShowOnMap = (locationId: string) => {
    setViewMode('map');
    // Find the location and highlight it
    const location = mapLocations.find(l => l.id === locationId);
    if (location) {
      setSelectedEntityId(locationId);
      setSelectedCategory('geography');
    }
  };

  const handleMapLocationClick = (locationId: string) => {
    setSelectedEntityId(locationId);
    setSelectedCategory('geography');
    setViewMode('codex');
  };

  const filteredEntities = entities.filter((entity) => {
    if (mode === 'player' && !entity.isDiscovered) return false;
    if (!searchQuery) return true;
    return entity.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const categoryToEntityType = (category: LoreCategory): EntityType => {
    const map: Record<LoreCategory, EntityType> = {
      geography: 'location',
      factions: 'faction',
      people: 'npc',
      history: 'history',
      conflicts: 'conflict',
      cosmology: 'cosmology',
      secrets: 'secret',
    };
    return map[category];
  };

  return (
    <div className="flex h-full bg-background-dark">
      <NavigationSidebar
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          setSelectedEntityId(null);
          setSelectedEntity(null);
        }}
        entityCounts={entityCounts}
        isDmMode={mode === 'dm'}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-surface-brown border-b border-primary-gold/30 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-medieval text-primary-gold">{worldName}</h1>
              <span className="text-sm text-parchment/60">World Lore Explorer</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search lore..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 bg-background-dark border border-primary-gold/30 rounded-lg px-4 py-2 text-parchment placeholder:text-parchment/40 focus:outline-none focus:border-primary-gold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment/40">🔍</span>
              </div>

              <div className="flex items-center gap-2 bg-background-dark rounded-lg p-1">
                <button
                  onClick={() => setMode('player')}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    mode === 'player'
                      ? 'bg-tertiary-blue text-parchment'
                      : 'text-parchment/60 hover:text-parchment'
                  }`}
                >
                  👁️ Player
                </button>
                <button
                  onClick={() => setMode('dm')}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    mode === 'dm'
                      ? 'bg-primary-gold text-background-dark'
                      : 'text-parchment/60 hover:text-parchment'
                  }`}
                >
                  📖 DM
                </button>
              </div>
            </div>
          </div>
          
          {/* View Mode Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('codex')}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                viewMode === 'codex'
                  ? 'bg-background-dark text-primary-gold border-t border-l border-r border-primary-gold/30'
                  : 'text-parchment/60 hover:text-parchment hover:bg-background-dark/50'
              }`}
            >
              📜 Codex
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-background-dark text-primary-gold border-t border-l border-r border-primary-gold/30'
                  : 'text-parchment/60 hover:text-parchment hover:bg-background-dark/50'
              }`}
            >
              🗺️ World Map
            </button>
            <button
              onClick={() => setViewMode('relationships')}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                viewMode === 'relationships'
                  ? 'bg-background-dark text-primary-gold border-t border-l border-r border-primary-gold/30'
                  : 'text-parchment/60 hover:text-parchment hover:bg-background-dark/50'
              }`}
            >
              🔗 Relationships
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-background-dark text-primary-gold border-t border-l border-r border-primary-gold/30'
                  : 'text-parchment/60 hover:text-parchment hover:bg-background-dark/50'
              }`}
            >
              📅 Timeline
            </button>
          </div>
        </header>

        {/* Codex View */}
        {viewMode === 'codex' && (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 border-r border-primary-gold/20 overflow-y-auto bg-surface-brown/50">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-primary-gold mb-3 capitalize">
                {selectedCategory}
              </h3>
              {loading && !filteredEntities.length ? (
                <div className="text-center text-parchment/50 py-8">Loading...</div>
              ) : filteredEntities.length === 0 ? (
                <div className="text-center text-parchment/50 py-8">No entries found</div>
              ) : (
                <ul className="space-y-1">
                  {filteredEntities.map((entity) => (
                    <li key={entity.id}>
                      <button
                        onClick={() => setSelectedEntityId(entity.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedEntityId === entity.id
                            ? 'bg-primary-gold/20 text-primary-gold'
                            : 'text-parchment hover:bg-primary-gold/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{entity.name}</span>
                          {entity.tier === 'major' && (
                            <span className="text-xs text-primary-gold">★</span>
                          )}
                        </div>
                        {entity.type && (
                          <span className="text-xs text-parchment/50 capitalize">
                            {entity.type}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {selectedEntity ? (
                <CodexEntry
                  entityType={categoryToEntityType(selectedCategory)}
                  entity={selectedEntity}
                  isDmMode={mode === 'dm'}
                  onNavigate={handleNavigate}
                  onShowOnMap={handleShowOnMap}
                />
            ) : (
              <div className="flex items-center justify-center h-full text-parchment/50">
                <div className="text-center">
                  <span className="text-6xl">📜</span>
                  <p className="mt-4">Select an entry to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="flex-1 overflow-hidden">
            {mapLocations.length > 0 ? (
              <MapView
                worldSeedId={worldSeedId || ''}
                locations={mapLocations}
                mode={mode}
                onLocationClick={handleMapLocationClick}
                factionColors={factionColors}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-parchment/50">
                <div className="text-center">
                  <span className="text-6xl">🗺️</span>
                  <p className="mt-4">No locations generated yet</p>
                  <p className="text-sm mt-2">Locations will appear here once world generation is complete</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Relationships View */}
        {viewMode === 'relationships' && (
          <div className="flex-1 overflow-hidden p-6">
            {graphNodes.length > 0 && selectedGraphEntity ? (
              <div className="h-full flex flex-col">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medieval text-primary-gold">Faction & NPC Relationships</h3>
                    <p className="text-sm text-parchment/60">
                      {graphNodes.length} entities • {graphEdges.length} connections
                    </p>
                  </div>
                  
                  {/* Entity selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-parchment/60">Center on:</span>
                    <select
                      value={`${selectedGraphEntity.type}:${selectedGraphEntity.id}`}
                      onChange={(e) => {
                        const [type, id] = e.target.value.split(':');
                        setSelectedGraphEntity({ type: type as GraphEntityType, id });
                      }}
                      className="bg-background-dark border border-primary-gold/30 rounded px-3 py-1 text-parchment text-sm"
                    >
                      <optgroup label="Factions">
                        {graphNodes.filter(n => n.type === 'faction').map(node => (
                          <option key={node.id} value={node.id}>
                            {node.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="NPCs">
                        {graphNodes.filter(n => n.type === 'npc').map(node => (
                          <option key={node.id} value={node.id}>
                            {node.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center bg-background-dark/50 rounded-lg border border-primary-gold/20">
                  <RelationshipGraph
                    centerId={selectedGraphEntity.id}
                    centerType={selectedGraphEntity.type}
                    nodes={graphNodes}
                    edges={graphEdges}
                    mode={mode}
                    onNodeClick={(entityType, entityId) => {
                      // Navigate to the entity in codex
                      const categoryMap: Record<GraphEntityType, LoreCategory> = {
                        faction: 'factions',
                        npc: 'people',
                        location: 'geography',
                        deity: 'cosmology',
                      };
                      setSelectedCategory(categoryMap[entityType]);
                      setSelectedEntityId(entityId);
                      setViewMode('codex');
                    }}
                  />
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 justify-center">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-parchment/60">Entity Types:</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C4A35A' }} />
                      <span className="text-xs text-parchment/80">NPC</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1E4D6B' }} />
                      <span className="text-xs text-parchment/80">Faction</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4CAF50' }} />
                      <span className="text-xs text-parchment/80">Location</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-parchment/50">
                <div className="text-center">
                  <span className="text-6xl">🔗</span>
                  <p className="mt-4">No relationship data available</p>
                  <p className="text-sm mt-2">
                    {graphNodes.length === 0 
                      ? 'Complete world generation to see faction and NPC relationships'
                      : 'Select an entity to center the graph'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="flex-1 overflow-hidden">
            {timelineEras.length > 0 || timelineEvents.length > 0 ? (
              <TimelineView
                eras={timelineEras}
                events={timelineEvents}
                mode={mode}
                onEventClick={(eventId) => {
                  // Navigate to history category and select event
                  setSelectedCategory('history');
                  setSelectedEntityId(eventId);
                  setViewMode('codex');
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-parchment/50">
                <div className="text-center">
                  <span className="text-6xl">📅</span>
                  <p className="mt-4">No timeline data available</p>
                  <p className="text-sm mt-2">World history will appear here once generation is complete</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
