'use client';

import { DiscoveryLevel } from '@/lib/world/discovery-service';

interface DiscoveryIndicatorProps {
  level: DiscoveryLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const levelConfig: Record<DiscoveryLevel, { icon: string; label: string; color: string; bgColor: string }> = {
  undiscovered: { icon: '🔒', label: 'Not yet discovered', color: 'text-parchment/40', bgColor: 'bg-parchment/10' },
  rumored: { icon: '👁️', label: 'Heard rumors only', color: 'text-amber', bgColor: 'bg-amber/10' },
  known: { icon: '✓', label: 'Known', color: 'text-forest-green', bgColor: 'bg-forest-green/10' },
  detailed: { icon: '★', label: 'Fully explored', color: 'text-primary-gold', bgColor: 'bg-primary-gold/10' },
};

export function DiscoveryIndicator({ level, showLabel = true, size = 'md' }: DiscoveryIndicatorProps) {
  const config = levelConfig[level];
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded ${config.bgColor} ${config.color} ${sizeClasses[size]}`}>
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

interface ViewModeToggleProps {
  mode: 'player' | 'dm';
  onModeChange: (mode: 'player' | 'dm') => void;
}

export function ViewModeToggle({ mode, onModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-background-dark rounded-lg p-1 border border-primary-gold/20">
      <button
        onClick={() => onModeChange('player')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${
          mode === 'player'
            ? 'bg-tertiary-blue text-parchment shadow-sm'
            : 'text-parchment/60 hover:text-parchment hover:bg-tertiary-blue/10'
        }`}
      >
        <span>👁️</span>
        <span>Player View</span>
      </button>
      <button
        onClick={() => onModeChange('dm')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${
          mode === 'dm'
            ? 'bg-primary-gold text-background-dark shadow-sm'
            : 'text-parchment/60 hover:text-parchment hover:bg-primary-gold/10'
        }`}
      >
        <span>📖</span>
        <span>DM View</span>
      </button>
    </div>
  );
}

interface MarkDiscoveredButtonProps {
  onMark: (level: DiscoveryLevel) => void;
  currentLevel: DiscoveryLevel;
}

export function MarkDiscoveredButton({ onMark, currentLevel }: MarkDiscoveredButtonProps) {
  const levels: DiscoveryLevel[] = ['undiscovered', 'rumored', 'known', 'detailed'];
  const currentIndex = levels.indexOf(currentLevel);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-parchment/60">Discovery:</span>
      <div className="flex gap-1">
        {levels.map((level, index) => {
          const config = levelConfig[level];
          const isActive = index <= currentIndex;
          return (
            <button
              key={level}
              onClick={() => onMark(level)}
              className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                isActive ? config.bgColor : 'bg-surface-brown'
              } ${isActive ? config.color : 'text-parchment/30'} hover:scale-110`}
              title={config.label}
            >
              {config.icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface EntityCardWrapperProps {
  discoveryLevel: DiscoveryLevel;
  mode: 'player' | 'dm';
  children: React.ReactNode;
  teaserText?: string;
}

export function EntityCardWrapper({ discoveryLevel, mode, children, teaserText }: EntityCardWrapperProps) {
  if (mode === 'dm') {
    return (
      <div className="relative">
        <DiscoveryIndicator level={discoveryLevel} size="sm" />
        {children}
      </div>
    );
  }

  switch (discoveryLevel) {
    case 'undiscovered':
      return (
        <div className="relative bg-surface-brown rounded-lg p-6 border border-primary-gold/20">
          <div className="text-center">
            <span className="text-4xl opacity-50">❓</span>
            <p className="mt-3 text-parchment/50 italic">{teaserText || 'Unknown entity'}</p>
            <DiscoveryIndicator level="undiscovered" size="sm" />
          </div>
        </div>
      );

    case 'rumored':
      return (
        <div className="relative opacity-80">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface-brown/50 pointer-events-none rounded-lg" />
          <div className="italic">
            <DiscoveryIndicator level="rumored" size="sm" />
            {children}
          </div>
        </div>
      );

    case 'known':
    case 'detailed':
    default:
      return (
        <div className="relative">
          <DiscoveryIndicator level={discoveryLevel} size="sm" />
          {children}
        </div>
      );
  }
}
