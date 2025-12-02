'use client';

import { useState } from 'react';

export type LoreCategory = 'geography' | 'factions' | 'people' | 'history' | 'conflicts' | 'cosmology' | 'secrets';

interface EntityCount {
  geography: number;
  factions: number;
  people: number;
  history: number;
  conflicts: number;
  cosmology: number;
  secrets: number;
}

interface NavigationSidebarProps {
  selectedCategory: LoreCategory;
  onSelectCategory: (category: LoreCategory) => void;
  entityCounts: EntityCount;
  isDmMode: boolean;
}

interface CategoryItem {
  id: LoreCategory;
  label: string;
  icon: string;
  dmOnly?: boolean;
}

const categories: CategoryItem[] = [
  { id: 'geography', label: 'Geography', icon: '📍' },
  { id: 'factions', label: 'Factions', icon: '⚔️' },
  { id: 'people', label: 'People', icon: '👤' },
  { id: 'history', label: 'History', icon: '📜' },
  { id: 'conflicts', label: 'Conflicts', icon: '🔥' },
  { id: 'cosmology', label: 'Cosmology', icon: '✨' },
  { id: 'secrets', label: 'Secrets', icon: '🔒', dmOnly: true },
];

export function NavigationSidebar({
  selectedCategory,
  onSelectCategory,
  entityCounts,
  isDmMode,
}: NavigationSidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const visibleCategories = categories.filter(
    (cat) => !cat.dmOnly || isDmMode
  );

  return (
    <nav className="w-64 bg-surface-brown border-r border-primary-gold/30 h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-medieval text-primary-gold mb-4">World Codex</h2>
        <ul className="space-y-1">
          {visibleCategories.map((category) => (
            <li key={category.id}>
              <button
                onClick={() => onSelectCategory(category.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-primary-gold/20 text-primary-gold'
                    : 'text-parchment hover:bg-primary-gold/10'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{category.icon}</span>
                  <span>{category.label}</span>
                </span>
                <span className="text-sm opacity-60">
                  {entityCounts[category.id] || 0}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {isDmMode && (
        <div className="p-4 border-t border-primary-gold/20">
          <div className="flex items-center gap-2 text-xs text-ember-red">
            <span>🔓</span>
            <span>DM Mode Active</span>
          </div>
        </div>
      )}
    </nav>
  );
}
