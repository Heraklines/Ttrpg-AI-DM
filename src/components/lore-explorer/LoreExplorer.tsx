'use client';

import { useState, useEffect, useCallback } from 'react';
import { NavigationSidebar, LoreCategory } from './NavigationSidebar';
import { CodexEntry } from './CodexEntry';

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

export function LoreExplorer({
  campaignId,
  worldSeedId,
  worldName,
  initialMode = 'dm',
}: LoreExplorerProps) {
  const [mode, setMode] = useState<'player' | 'dm'>(initialMode);
  const [selectedCategory, setSelectedCategory] = useState<LoreCategory>('factions');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [entities, setEntities] = useState<EntityListItem[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Record<string, unknown> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
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
        setEntityCounts(data.counts || entityCounts);
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

  useEffect(() => {
    fetchEntities();
    fetchEntityCounts();
  }, [fetchEntities, fetchEntityCounts]);

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
    
    const found = entities.find((e) => e.name.toLowerCase().includes(entityName.toLowerCase()));
    if (found) {
      setSelectedEntityId(found.id);
    }
  };

  const handleShowOnMap = (locationId: string) => {
    console.log('Show on map:', locationId);
  };

  const filteredEntities = entities.filter((entity) => {
    if (mode === 'player' && !entity.isDiscovered) return false;
    if (!searchQuery) return true;
    return entity.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const categoryToEntityType = (category: LoreCategory) => {
    const map: Record<LoreCategory, string> = {
      geography: 'location',
      factions: 'faction',
      people: 'npc',
      history: 'history',
      conflicts: 'conflict',
      cosmology: 'cosmology',
      secrets: 'secret',
    };
    return map[category] || 'unknown';
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
          <div className="flex items-center justify-between">
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
        </header>

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
                entityType={categoryToEntityType(selectedCategory) as 'faction' | 'npc' | 'location' | 'conflict' | 'secret'}
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
      </div>
    </div>
  );
}
