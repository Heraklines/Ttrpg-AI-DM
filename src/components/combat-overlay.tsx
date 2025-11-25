'use client';

import { useState } from 'react';

interface Combatant {
  id: string;
  name: string;
  type: 'player' | 'enemy';
  initiative: number;
  currentHp: number;
  maxHp: number;
  armorClass: number;
  status: 'active' | 'dead' | 'unconscious' | 'fled';
  conditions?: string[];
}

interface Combat {
  id: string;
  round: number;
  currentTurnIndex: number;
  initiativeOrder: Combatant[];
  active: boolean;
}

interface CombatOverlayProps {
  combat: Combat;
  campaignId: string;
  onCombatUpdate: (combat: Combat) => void;
  onCombatEnd: () => void;
}

export function CombatOverlay({ combat, campaignId, onCombatUpdate, onCombatEnd }: CombatOverlayProps) {
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const currentCombatant = combat.initiativeOrder[combat.currentTurnIndex];

  async function nextTurn() {
    setLoading(true);
    try {
      const res = await fetch('/api/combat/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();

      if (data.combatEnded) {
        onCombatEnd();
      } else {
        onCombatUpdate({
          ...combat,
          round: data.round,
          currentTurnIndex: combat.initiativeOrder.findIndex(
            (c) => c.id === data.currentTurn.id
          ),
        });
      }
    } catch (err) {
      console.error('Failed to advance turn:', err);
    } finally {
      setLoading(false);
    }
  }

  async function endCombat(outcome: string) {
    setLoading(true);
    try {
      await fetch('/api/combat/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, outcome }),
      });
      onCombatEnd();
    } catch (err) {
      console.error('Failed to end combat:', err);
    } finally {
      setLoading(false);
    }
  }

  function getHpColor(current: number, max: number): string {
    const percent = (current / max) * 100;
    if (percent > 50) return 'bg-forest';
    if (percent > 25) return 'bg-amber';
    return 'bg-ember';
  }

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 bg-ember text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 hover:bg-ember/90"
      >
        <span className="animate-pulse">⚔️</span>
        Round {combat.round} - {currentCombatant?.name}&apos;s turn
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-surface border-2 border-ember rounded-lg shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-ember px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-medieval">
          <span>⚔️</span>
          <span>Combat - Round {combat.round}</span>
        </div>
        <button
          onClick={() => setMinimized(true)}
          className="text-white/70 hover:text-white"
        >
          ―
        </button>
      </div>

      {/* Current Turn Banner */}
      {currentCombatant && (
        <div className="bg-ember/20 px-4 py-2 border-b border-ember/30">
          <div className="text-sm text-parchment/70">Current Turn:</div>
          <div className="text-lg font-semibold text-parchment flex items-center gap-2">
            <span className={currentCombatant.type === 'player' ? 'text-forest' : 'text-ember'}>
              {currentCombatant.type === 'player' ? '🛡️' : '👹'}
            </span>
            {currentCombatant.name}
          </div>
        </div>
      )}

      {/* Initiative Order */}
      <div className="max-h-64 overflow-y-auto p-2">
        {combat.initiativeOrder.map((combatant, index) => {
          const isCurrent = index === combat.currentTurnIndex;
          const isDeadOrFled = combatant.status === 'dead' || combatant.status === 'fled';

          return (
            <div
              key={combatant.id}
              className={`flex items-center gap-2 p-2 rounded mb-1 transition-colors ${
                isCurrent
                  ? 'bg-primary/20 border border-primary/40'
                  : isDeadOrFled
                  ? 'bg-background/30 opacity-50'
                  : 'bg-background/50'
              }`}
            >
              {/* Initiative */}
              <div className="w-8 text-center text-sm font-bold text-primary">
                {combatant.initiative}
              </div>

              {/* Icon */}
              <div className={combatant.type === 'player' ? 'text-forest' : 'text-ember'}>
                {combatant.status === 'dead' ? '💀' : combatant.type === 'player' ? '🛡️' : '👹'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${isDeadOrFled ? 'line-through text-parchment/50' : 'text-parchment'}`}>
                  {combatant.name}
                </div>
                {!isDeadOrFled && (
                  <div className="flex items-center gap-2">
                    {/* HP Bar */}
                    <div className="flex-1 h-1.5 bg-background rounded overflow-hidden">
                      <div
                        className={`h-full ${getHpColor(combatant.currentHp, combatant.maxHp)}`}
                        style={{ width: `${(combatant.currentHp / combatant.maxHp) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-parchment/60">
                      {combatant.currentHp}/{combatant.maxHp}
                    </span>
                  </div>
                )}
              </div>

              {/* AC */}
              {!isDeadOrFled && (
                <div className="text-xs bg-surface px-1.5 py-0.5 rounded text-parchment/70">
                  AC {combatant.armorClass}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="border-t border-primary/20 p-3 flex gap-2">
        <button
          onClick={nextTurn}
          disabled={loading}
          className="flex-1 py-2 bg-primary text-background font-semibold rounded hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'Next Turn'}
        </button>
        <div className="relative group">
          <button className="py-2 px-3 border border-primary/30 text-primary rounded hover:bg-primary/10">
            End
          </button>
          <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block">
            <div className="bg-surface border border-primary/20 rounded shadow-lg p-1">
              <button
                onClick={() => endCombat('victory')}
                className="block w-full px-3 py-1 text-sm text-forest hover:bg-forest/10 rounded text-left"
              >
                Victory
              </button>
              <button
                onClick={() => endCombat('fled')}
                className="block w-full px-3 py-1 text-sm text-amber hover:bg-amber/10 rounded text-left"
              >
                Flee
              </button>
              <button
                onClick={() => endCombat('negotiated')}
                className="block w-full px-3 py-1 text-sm text-tertiary hover:bg-tertiary/10 rounded text-left"
              >
                Negotiate
              </button>
              <button
                onClick={() => endCombat('defeat')}
                className="block w-full px-3 py-1 text-sm text-ember hover:bg-ember/10 rounded text-left"
              >
                Defeat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
