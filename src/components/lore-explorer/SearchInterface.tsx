'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type SearchResultType = 'faction' | 'npc' | 'location' | 'conflict' | 'secret';

interface SearchResult {
  id: string;
  type: SearchResultType;
  name: string;
  description: string;
  tier: string;
  matchReason?: string;
  relationshipInfo?: {
    type: string;
    strength: number;
  };
}

interface SearchInterfaceProps {
  worldSeedId: string;
  mode: 'player' | 'dm';
  onResultSelect: (entityType: SearchResultType, entityId: string) => void;
}

const typeIcons: Record<SearchResultType, string> = {
  faction: '⚔️',
  npc: '👤',
  location: '📍',
  conflict: '🔥',
  secret: '🔒',
};

const quickFilters: { label: string; value: SearchResultType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Factions', value: 'faction' },
  { label: 'NPCs', value: 'npc' },
  { label: 'Locations', value: 'location' },
  { label: 'Conflicts', value: 'conflict' },
];

export function SearchInterface({
  worldSeedId,
  mode,
  onResultSelect,
}: SearchInterfaceProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<SearchResultType | 'all'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAiSearch, setIsAiSearch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const saved = localStorage.getItem(`lore-recent-searches-${worldSeedId}`);
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, [worldSeedId]);

  const saveRecentSearch = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(`lore-recent-searches-${worldSeedId}`, JSON.stringify(updated));
  };

  const detectSearchType = (q: string): { type: string; cleanQuery: string } => {
    if (q.startsWith('faction:')) return { type: 'faction_filter', cleanQuery: q.slice(8) };
    if (q.startsWith('npc:')) return { type: 'npc_filter', cleanQuery: q.slice(4) };
    if (q.startsWith('location:')) return { type: 'location_filter', cleanQuery: q.slice(9) };
    if (q.startsWith('allies of ')) return { type: 'relationship', cleanQuery: q.slice(10) };
    if (q.startsWith('enemies of ')) return { type: 'relationship', cleanQuery: q.slice(11) };
    if (q.startsWith('in ')) return { type: 'location_search', cleanQuery: q.slice(3) };
    if (q.startsWith('tension:')) return { type: 'tension_filter', cleanQuery: q.slice(8) };
    if (q.includes('who knows') || q.includes('what is') || q.includes('why did')) {
      return { type: 'ai_semantic', cleanQuery: q };
    }
    return { type: 'name', cleanQuery: q };
  };

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const { type, cleanQuery } = detectSearchType(searchQuery.toLowerCase());
    setIsAiSearch(type === 'ai_semantic');

    try {
      const params = new URLSearchParams({
        q: cleanQuery,
        type,
        filter: activeFilter,
        mode,
      });
      
      const res = await fetch(`/api/world/${worldSeedId}/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    }
    
    setLoading(false);
  }, [worldSeedId, activeFilter, mode]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setShowSuggestions(true);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveRecentSearch(query.trim());
      performSearch(query);
      setShowSuggestions(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onResultSelect(result.type, result.id);
    setShowSuggestions(false);
  };

  const handleRecentClick = (search: string) => {
    setQuery(search);
    performSearch(search);
    setShowSuggestions(false);
  };

  const filteredResults = activeFilter === 'all' 
    ? results 
    : results.filter(r => r.type === activeFilter);

  return (
    <div className="relative w-full max-w-2xl">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search lore... (try 'allies of Crown' or 'who knows about the prophecy')"
            className="w-full bg-surface-brown border border-primary-gold/30 rounded-lg pl-10 pr-12 py-3 text-parchment placeholder:text-parchment/40 focus:outline-none focus:border-primary-gold transition-colors"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-parchment/50">🔍</span>
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-gold animate-spin">⟳</span>
          )}
          {isAiSearch && !loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary-blue text-xs">✨ AI</span>
          )}
        </div>
      </form>

      {showSuggestions && (query || recentSearches.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-brown border border-primary-gold/30 rounded-lg shadow-xl z-50 overflow-hidden">
          {!query && recentSearches.length > 0 && (
            <div className="p-3 border-b border-primary-gold/20">
              <span className="text-xs text-parchment/50">Recent searches</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {recentSearches.map((search, i) => (
                  <button
                    key={i}
                    onClick={() => handleRecentClick(search)}
                    className="px-2 py-1 text-sm bg-background-dark text-parchment/70 rounded hover:text-primary-gold transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-2 border-b border-primary-gold/20 flex flex-wrap gap-1">
            {quickFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  activeFilter === filter.value
                    ? 'bg-primary-gold text-background-dark'
                    : 'bg-background-dark text-parchment/60 hover:text-parchment'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {filteredResults.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {filteredResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left px-4 py-3 hover:bg-primary-gold/10 transition-colors border-b border-primary-gold/10 last:border-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span>{typeIcons[result.type]}</span>
                      <span className="font-medieval text-primary-gold">{result.name}</span>
                      {result.tier === 'major' && <span className="text-xs text-amber">★</span>}
                    </div>
                    <span className="text-xs text-parchment/50 capitalize">{result.type}</span>
                  </div>
                  <p className="text-sm text-parchment/70 mt-1 line-clamp-2">{result.description}</p>
                  {result.matchReason && (
                    <span className="text-xs text-tertiary-blue mt-1 block">{result.matchReason}</span>
                  )}
                  {result.relationshipInfo && (
                    <span className="text-xs text-parchment/50 mt-1 block">
                      Relationship: {result.relationshipInfo.type} (strength: {result.relationshipInfo.strength}/10)
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : query && !loading ? (
            <div className="p-4 text-center text-parchment/50">
              No results found for &quot;{query}&quot;
            </div>
          ) : null}
        </div>
      )}

      {showSuggestions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}
