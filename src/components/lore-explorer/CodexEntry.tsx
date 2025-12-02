'use client';

import { useMemo } from 'react';

type EntityType = 'faction' | 'npc' | 'location' | 'conflict' | 'secret' | 'cosmology';

interface CodexEntryProps {
  entityType: EntityType;
  entity: Record<string, unknown>;
  isDmMode: boolean;
  onNavigate: (entityType: EntityType, entityName: string) => void;
  onShowOnMap?: (locationId: string) => void;
}

interface TierBadgeProps {
  tier: string;
}

function TierBadge({ tier }: TierBadgeProps) {
  const colors: Record<string, string> = {
    major: 'bg-primary-gold text-background-dark',
    supporting: 'bg-tertiary-blue text-parchment',
    minor: 'bg-surface-brown text-parchment',
  };

  return (
    <span className={`px-2 py-0.5 text-xs rounded ${colors[tier] || colors.minor}`}>
      {tier}
    </span>
  );
}

function parseHyperlinks(
  text: string,
  onNavigate: (type: EntityType, name: string) => void
): React.ReactNode[] {
  if (!text) return [];
  
  const linkPattern = /\[([^\]]+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const entityName = match[1];
    parts.push(
      <button
        key={match.index}
        onClick={() => onNavigate('npc', entityName)}
        className="text-primary-gold hover:underline cursor-pointer"
      >
        {entityName}
      </button>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function CodexEntry({
  entityType,
  entity,
  isDmMode,
  onNavigate,
  onShowOnMap,
}: CodexEntryProps) {
  const tier = (entity.tier as string) || 'minor';
  const name = entity.name as string;
  const isDiscovered = entity.isDiscovered as boolean;

  const renderContent = useMemo(() => {
    switch (entityType) {
      case 'faction':
        return <FactionContent entity={entity} isDmMode={isDmMode} onNavigate={onNavigate} />;
      case 'npc':
        return <NpcContent entity={entity} isDmMode={isDmMode} onNavigate={onNavigate} />;
      case 'location':
        return <LocationContent entity={entity} isDmMode={isDmMode} onNavigate={onNavigate} onShowOnMap={onShowOnMap} />;
      case 'conflict':
        return <ConflictContent entity={entity} isDmMode={isDmMode} onNavigate={onNavigate} />;
      case 'secret':
        return <SecretContent entity={entity} isDmMode={isDmMode} onNavigate={onNavigate} />;
      default:
        return <div>Unknown entity type</div>;
    }
  }, [entityType, entity, isDmMode, onNavigate, onShowOnMap]);

  if (!isDmMode && !isDiscovered) {
    return (
      <article className="bg-surface-brown rounded-lg p-6 border border-primary-gold/20">
        <div className="text-center text-parchment/50">
          <span className="text-4xl">❓</span>
          <p className="mt-2">Undiscovered</p>
        </div>
      </article>
    );
  }

  return (
    <article className="bg-surface-brown rounded-lg border border-primary-gold/20 overflow-hidden">
      <header className="bg-background-dark px-6 py-4 border-b border-primary-gold/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-medieval text-primary-gold">{name}</h2>
            <TierBadge tier={tier} />
          </div>
          <span className="text-sm text-parchment/60 capitalize">{entityType}</span>
        </div>
      </header>
      <div className="p-6">{renderContent}</div>
    </article>
  );
}

function FactionContent({
  entity,
  isDmMode,
  onNavigate,
}: {
  entity: Record<string, unknown>;
  isDmMode: boolean;
  onNavigate: (type: EntityType, name: string) => void;
}) {
  const tensionStances = JSON.parse((entity.tensionStances as string) || '[]');
  const resources = JSON.parse((entity.resources as string) || '[]');

  return (
    <div className="space-y-4 text-parchment">
      <div>
        <span className="text-primary-gold text-sm">Type:</span>{' '}
        <span className="capitalize">{entity.type as string}</span>
      </div>

      {(entity.philosophy as string) && (
        <div>
          <span className="text-primary-gold text-sm">Philosophy:</span>
          <p className="mt-1 italic">&quot;{entity.philosophy as string}&quot;</p>
        </div>
      )}

      {Boolean(entity.publicImage) && (
        <div>
          <span className="text-primary-gold text-sm">Public Image:</span>
          <p className="mt-1">{parseHyperlinks(entity.publicImage as string, onNavigate)}</p>
        </div>
      )}

      {tensionStances.length > 0 && (
        <div>
          <span className="text-primary-gold text-sm">Tension Stances:</span>
          <ul className="mt-1 space-y-1">
            {tensionStances.map((stance: { tensionName: string; stance: string }, i: number) => (
              <li key={i} className="text-sm">
                <span className="font-semibold">{stance.tensionName}:</span> {stance.stance}
              </li>
            ))}
          </ul>
        </div>
      )}

      {Boolean(entity.motto) && (
        <div className="border-l-2 border-primary-gold pl-3 italic">
          &quot;{entity.motto as string}&quot;
        </div>
      )}

      {resources.length > 0 && (
        <div>
          <span className="text-primary-gold text-sm">Resources:</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {resources.map((resource: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-background-dark rounded text-sm">
                {resource}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-sm">
        <span>
          <span className="text-primary-gold">Influence:</span> {entity.influence as number}/10
        </span>
        {Boolean(entity.symbol) && <span>⚑ {entity.symbol as string}</span>}
      </div>
    </div>
  );
}

function NpcContent({
  entity,
  isDmMode,
  onNavigate,
}: {
  entity: Record<string, unknown>;
  isDmMode: boolean;
  onNavigate: (type: EntityType, name: string) => void;
}) {
  const personality = JSON.parse((entity.personality as string) || '{}');
  const tensionRole = JSON.parse((entity.tensionRole as string) || '[]');
  const fears = JSON.parse((entity.fears as string) || '[]');

  return (
    <div className="space-y-4 text-parchment">
      <div className="flex gap-4">
        {Boolean(entity.race) && (
          <div>
            <span className="text-primary-gold text-sm">Race:</span> {entity.race as string}
          </div>
        )}
        {Boolean(entity.occupation) && (
          <div>
            <span className="text-primary-gold text-sm">Occupation:</span> {entity.occupation as string}
          </div>
        )}
      </div>

      {Boolean(entity.appearance) && (
        <div>
          <span className="text-primary-gold text-sm">Appearance:</span>
          <p className="mt-1">{entity.appearance as string}</p>
        </div>
      )}

      {personality.traits?.length > 0 && (
        <div>
          <span className="text-primary-gold text-sm">Personality:</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {personality.traits.map((trait: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-background-dark rounded text-sm">
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      {Boolean(entity.speakingStyle) && (
        <div>
          <span className="text-primary-gold text-sm">Speaking Style:</span>{' '}
          <span className="italic">{entity.speakingStyle as string}</span>
        </div>
      )}

      {Boolean(entity.publicGoal) && (
        <div>
          <span className="text-primary-gold text-sm">Goal:</span>
          <p className="mt-1">{parseHyperlinks(entity.publicGoal as string, onNavigate)}</p>
        </div>
      )}

      {isDmMode && Boolean(entity.privateGoal) && entity.privateGoal !== entity.publicGoal && (
        <div className="border border-ember-red/30 rounded p-3 bg-ember-red/5">
          <span className="text-ember-red text-sm">🔒 True Goal (DM Only):</span>
          <p className="mt-1">{parseHyperlinks(entity.privateGoal as string, onNavigate)}</p>
        </div>
      )}

      {tensionRole.length > 0 && (
        <div>
          <span className="text-primary-gold text-sm">Role in Tensions:</span>
          <ul className="mt-1 space-y-1">
            {tensionRole.map((role: { tensionName: string; role: string; commitment: string }, i: number) => (
              <li key={i} className="text-sm">
                <span className="font-semibold">{role.tensionName}:</span> {role.role} ({role.commitment})
              </li>
            ))}
          </ul>
        </div>
      )}

      {fears.length > 0 && isDmMode && (
        <div>
          <span className="text-primary-gold text-sm">Fears:</span>
          <ul className="mt-1 list-disc list-inside">
            {fears.map((fear: string, i: number) => (
              <li key={i} className="text-sm">{fear}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LocationContent({
  entity,
  isDmMode,
  onNavigate,
  onShowOnMap,
}: {
  entity: Record<string, unknown>;
  isDmMode: boolean;
  onNavigate: (type: EntityType, name: string) => void;
  onShowOnMap?: (locationId: string) => void;
}) {
  const sensoryDetails = JSON.parse((entity.sensoryDetails as string) || '{}');
  const currentEvents = JSON.parse((entity.currentEvents as string) || '[]');
  const rumors = JSON.parse((entity.rumors as string) || '[]');

  return (
    <div className="space-y-4 text-parchment">
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          {Boolean(entity.type) && (
            <div>
              <span className="text-primary-gold text-sm">Type:</span>{' '}
              <span className="capitalize">{entity.type as string}</span>
            </div>
          )}
          {Boolean(entity.terrain) && (
            <div>
              <span className="text-primary-gold text-sm">Terrain:</span> {entity.terrain as string}
            </div>
          )}
        </div>
        {onShowOnMap && (
          <button
            onClick={() => onShowOnMap(entity.id as string)}
            className="px-3 py-1 bg-tertiary-blue/20 text-tertiary-blue rounded hover:bg-tertiary-blue/30 text-sm"
          >
            📍 Show on Map
          </button>
        )}
      </div>

      {Boolean(entity.description) && (
        <div>
          <p>{parseHyperlinks(entity.description as string, onNavigate)}</p>
        </div>
      )}

      {Boolean(entity.atmosphere) && (
        <div className="border-l-2 border-primary-gold/50 pl-3 italic text-parchment/80">
          {entity.atmosphere as string}
        </div>
      )}

      {(sensoryDetails.sights || sensoryDetails.sounds || sensoryDetails.smells) && (
        <div className="grid grid-cols-3 gap-4 text-sm">
          {sensoryDetails.sights && (
            <div>
              <span className="text-primary-gold">👁 Sights:</span>
              <p className="mt-1">{sensoryDetails.sights}</p>
            </div>
          )}
          {sensoryDetails.sounds && (
            <div>
              <span className="text-primary-gold">👂 Sounds:</span>
              <p className="mt-1">{sensoryDetails.sounds}</p>
            </div>
          )}
          {sensoryDetails.smells && (
            <div>
              <span className="text-primary-gold">👃 Smells:</span>
              <p className="mt-1">{sensoryDetails.smells}</p>
            </div>
          )}
        </div>
      )}

      {currentEvents.length > 0 && (
        <div>
          <span className="text-primary-gold text-sm">Current Events:</span>
          <ul className="mt-1 space-y-1">
            {currentEvents.map((event: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-amber">•</span>
                {parseHyperlinks(event, onNavigate)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {rumors.length > 0 && (
        <div>
          <span className="text-primary-gold text-sm">Rumors:</span>
          <ul className="mt-1 space-y-1 italic">
            {rumors.map((rumor: string, i: number) => (
              <li key={i} className="text-sm text-parchment/70">
                &quot;{rumor}&quot;
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-4 text-sm">
        {Boolean(entity.climate) && <span><span className="text-primary-gold">Climate:</span> {entity.climate as string}</span>}
        {Boolean(entity.explorationLevel) && (
          <span><span className="text-primary-gold">Exploration:</span> {entity.explorationLevel as string}</span>
        )}
      </div>
    </div>
  );
}

function ConflictContent({
  entity,
  isDmMode,
  onNavigate,
}: {
  entity: Record<string, unknown>;
  isDmMode: boolean;
  onNavigate: (type: EntityType, name: string) => void;
}) {
  const sides = JSON.parse((entity.sides as string) || '[]');
  const possibleOutcomes = JSON.parse((entity.possibleOutcomes as string) || '[]');

  const statusColors: Record<string, string> = {
    brewing: 'text-amber',
    active: 'text-ember-red',
    climax: 'text-secondary-burgundy',
    resolved: 'text-forest-green',
  };

  return (
    <div className="space-y-4 text-parchment">
      <div className="flex gap-4 items-center">
        <div>
          <span className="text-primary-gold text-sm">Type:</span>{' '}
          <span className="capitalize">{entity.type as string}</span>
        </div>
        <div>
          <span className="text-primary-gold text-sm">Status:</span>{' '}
          <span className={`capitalize font-semibold ${statusColors[entity.status as string] || ''}`}>
            {entity.status as string}
          </span>
        </div>
        <div>
          <span className="text-primary-gold text-sm">Scope:</span>{' '}
          <span className="capitalize">{entity.scope as string}</span>
        </div>
      </div>

      {Boolean(entity.rootTension) && (
        <div className="border border-primary-gold/30 rounded p-3 bg-primary-gold/5">
          <span className="text-primary-gold text-sm">Root Tension:</span>
          <p className="mt-1 font-semibold">{entity.rootTension as string}</p>
        </div>
      )}

      {Boolean(entity.publicNarrative) && (
        <div>
          <span className="text-primary-gold text-sm">What People Know:</span>
          <p className="mt-1">{parseHyperlinks(entity.publicNarrative as string, onNavigate)}</p>
        </div>
      )}

      {isDmMode && entity.trueNature && entity.trueNature !== entity.publicNarrative && (
        <div className="border border-ember-red/30 rounded p-3 bg-ember-red/5">
          <span className="text-ember-red text-sm">🔒 True Nature (DM Only):</span>
          <p className="mt-1">{parseHyperlinks(entity.trueNature as string, onNavigate)}</p>
        </div>
      )}

      {Boolean(entity.stakes) && (
        <div>
          <span className="text-primary-gold text-sm">Stakes:</span>
          <p className="mt-1 font-semibold">{entity.stakes as string}</p>
        </div>
      )}

      {sides.length > 0 && (
        <div>
          <span className="text-primary-gold text-sm">Sides:</span>
          <div className="mt-2 grid gap-3">
            {sides.map((side: { name: string; factions?: string[]; npcs?: string[]; goals?: string }, i: number) => (
              <div key={i} className="bg-background-dark rounded p-3">
                <div className="font-semibold text-primary-gold">{side.name}</div>
                {side.goals && <p className="text-sm mt-1">{side.goals}</p>}
                {side.factions?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {side.factions.map((f, j) => (
                      <button
                        key={j}
                        onClick={() => onNavigate('faction', f)}
                        className="text-xs px-2 py-0.5 bg-tertiary-blue/20 rounded text-tertiary-blue hover:bg-tertiary-blue/30"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {possibleOutcomes.length > 0 && isDmMode && (
        <div>
          <span className="text-primary-gold text-sm">Possible Outcomes:</span>
          <ul className="mt-1 space-y-1">
            {possibleOutcomes.map((outcome: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-amber">→</span>
                {outcome}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SecretContent({
  entity,
  isDmMode,
  onNavigate,
}: {
  entity: Record<string, unknown>;
  isDmMode: boolean;
  onNavigate: (type: EntityType, name: string) => void;
}) {
  const tensionImpact = JSON.parse((entity.tensionImpact as string) || '[]');
  const hints = JSON.parse((entity.hints as string) || '[]');
  const knownBy = JSON.parse((entity.knownBy as string) || '[]');

  if (!isDmMode) {
    return (
      <div className="text-center text-parchment/50 py-8">
        <span className="text-4xl">🔒</span>
        <p className="mt-2">This information is hidden from players</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-parchment">
      <div className="bg-ember-red/10 border border-ember-red/30 rounded p-4">
        <span className="text-ember-red font-semibold">🔒 SECRET CONTENT</span>
        <p className="mt-2">{parseHyperlinks(entity.content as string, onNavigate)}</p>
      </div>

      {Boolean(entity.implications) && (
        <div>
          <span className="text-primary-gold text-sm">Implications:</span>
          <p className="mt-1 italic">{entity.implications as string}</p>
        </div>
      )}

      {tensionImpact.length > 0 && (
        <div>
          <span className="text-primary-gold text-sm">Impact on Tensions:</span>
          <ul className="mt-1 space-y-1">
            {tensionImpact.map((impact: { tensionName: string; howItChanges: string }, i: number) => (
              <li key={i} className="text-sm">
                <span className="font-semibold">{impact.tensionName}:</span> {impact.howItChanges}
              </li>
            ))}
          </ul>
        </div>
      )}

      {knownBy.length > 0 && (
        <div>
          <span className="text-primary-gold text-sm">Known By:</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {knownBy.map((knower: { entityName: string; wouldTell: boolean }, i: number) => (
              <span
                key={i}
                className={`px-2 py-1 rounded text-sm ${
                  knower.wouldTell
                    ? 'bg-forest-green/20 text-forest-green'
                    : 'bg-secondary-burgundy/20 text-secondary-burgundy'
                }`}
              >
                {knower.entityName} {knower.wouldTell ? '(would tell)' : '(silent)'}
              </span>
            ))}
          </div>
        </div>
      )}

      {hints.length > 0 && (
        <div>
          <span className="text-primary-gold text-sm">Hints:</span>
          <ul className="mt-1 space-y-2">
            {hints.map((hint: { hint: string; whereFound: string; obviousness: string }, i: number) => (
              <li key={i} className="text-sm bg-background-dark rounded p-2">
                <div>{hint.hint}</div>
                <div className="flex gap-4 mt-1 text-xs text-parchment/60">
                  <span>📍 {hint.whereFound}</span>
                  <span>👁 {hint.obviousness}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

