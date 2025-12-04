'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CharacterSetupSummary } from '@/lib/engine/types';
import { GenerationDebugPanel } from '@/components/lore-explorer';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  characters: CharacterSetupSummary[];
}

interface LoreStatus {
  status: 'not_started' | 'pending' | 'generating' | 'completed' | 'failed';
  phase?: string;
  error?: string;
  reason?: string; // Why generation hasn't started
  summary?: {
    worldName: string;
    tone: string;
    npcs: number;
    factions: number;
    locations: number;
    conflicts: number;
    secrets: number;
  };
}

const MIN_DESCRIPTION_LENGTH = 50;

const GENERATION_PHASES = [
  { id: 'tensions', label: 'Extracting Core Tensions', icon: '⚡' },
  { id: 'cosmology', label: 'Creating Cosmology & Gods', icon: '✨' },
  { id: 'factions', label: 'Generating Factions', icon: '⚔️' },
  { id: 'npcs', label: 'Populating with NPCs', icon: '👤' },
  { id: 'conflicts', label: 'Weaving Conflicts', icon: '🔥' },
  { id: 'locations', label: 'Building Locations', icon: '🏰' },
  { id: 'secrets', label: 'Hiding Secrets', icon: '🔒' },
  { id: 'coherence', label: 'Final Coherence Check', icon: '🔮' },
];

export default function CampaignSetupPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [allCharacters, setAllCharacters] = useState<CharacterSetupSummary[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  
  // Lore generation state
  const [loreStatus, setLoreStatus] = useState<LoreStatus>({ status: 'not_started' });
  const [lorePolling, setLorePolling] = useState(false);
  
  // World description editing state
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);
  const [triggeringGeneration, setTriggeringGeneration] = useState(false);

  // Debug panel state
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Load campaign and character data
  const loadData = useCallback(async () => {
    try {
      const campaignRes = await fetch(`/api/campaign/${campaignId}`);
      if (!campaignRes.ok) throw new Error('Campaign not found');
      const campaignData = await campaignRes.json();
      setCampaign(campaignData.campaign);

      const existingIds = new Set<string>(
        (campaignData.campaign.characters || []).map((c: CharacterSetupSummary) => c.id)
      );
      setSelectedCharacters(existingIds);

      const charsRes = await fetch('/api/character');
      if (charsRes.ok) {
        const charsData = await charsRes.json();
        setAllCharacters(charsData.characters || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  // Poll lore generation status
  const pollLoreStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaign/${campaignId}/lore-status`);
      if (res.ok) {
        const data = await res.json();
        setLoreStatus(data);
        
        // Keep polling if still generating
        if (data.status === 'generating' || data.status === 'pending') {
          setLorePolling(true);
        } else {
          setLorePolling(false);
        }
      }
    } catch (err) {
      console.error('Failed to poll lore status:', err);
    }
  }, [campaignId]);

  // Save world description
  const saveDescription = async () => {
    if (!campaign) return;
    
    setSavingDescription(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/campaign/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editedDescription }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to save description');
      }
      
      const data = await res.json();
      setCampaign({ ...campaign, description: editedDescription });
      setIsEditingDescription(false);
      
      // If description is now long enough, offer to start generation
      if (editedDescription.trim().length >= MIN_DESCRIPTION_LENGTH && loreStatus.status === 'not_started') {
        // Refresh lore status to see if we can now generate
        await pollLoreStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save description');
    } finally {
      setSavingDescription(false);
    }
  };

  // Manually trigger lore generation
  const triggerGeneration = async () => {
    setTriggeringGeneration(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/campaign/${campaignId}/generate-lore`, {
        method: 'POST',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start generation');
      }
      
      setLoreStatus({ status: 'pending' });
      setLorePolling(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation');
    } finally {
      setTriggeringGeneration(false);
    }
  };

  // Start editing description
  const startEditingDescription = () => {
    setEditedDescription(campaign?.description || '');
    setIsEditingDescription(true);
  };

  // Cancel editing
  const cancelEditingDescription = () => {
    setIsEditingDescription(false);
    setEditedDescription('');
  };

  useEffect(() => {
    loadData();
    pollLoreStatus();
  }, [loadData, pollLoreStatus]);

  // Poll every 2 seconds while generating
  useEffect(() => {
    if (lorePolling) {
      const interval = setInterval(pollLoreStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [lorePolling, pollLoreStatus]);

  function toggleCharacter(charId: string) {
    const newSelected = new Set(selectedCharacters);
    if (newSelected.has(charId)) {
      newSelected.delete(charId);
    } else {
      newSelected.add(charId);
    }
    setSelectedCharacters(newSelected);
  }

  async function startAdventure() {
    if (selectedCharacters.size === 0) {
      setError('Please select at least one character for this adventure');
      return;
    }

    if (loreStatus.status !== 'completed' && loreStatus.status !== 'not_started') {
      setError('Please wait for world generation to complete');
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const selectedArray = Array.from(selectedCharacters);
      for (const charId of selectedArray) {
        const char = allCharacters.find(c => c.id === charId);
        if (char && char.campaignId !== campaignId) {
          await fetch(`/api/character/${charId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId }),
          });
        }
      }
      router.push(`/campaign/${campaignId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start adventure');
      setJoining(false);
    }
  }

  // Determine if we can start the adventure
  const canStartAdventure = 
    selectedCharacters.size > 0 && 
    (loreStatus.status === 'completed' || loreStatus.status === 'not_started');

  const isGenerating = loreStatus.status === 'generating' || loreStatus.status === 'pending';

  // Get current phase index for progress bar
  const getCurrentPhaseIndex = () => {
    if (!loreStatus.phase) return 0;
    const idx = GENERATION_PHASES.findIndex(p => p.id === loreStatus.phase);
    return idx >= 0 ? idx : 0;
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0d0d0d]">
        <div className="text-amber-400/60 flex items-center gap-3">
          <div className="animate-spin">⚔️</div>
          <span>Loading campaign...</span>
        </div>
      </main>
    );
  }

  if (!campaign) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#0d0d0d]">
        <div className="text-red-400 text-xl mb-4">{error || 'Campaign not found'}</div>
        <Link href="/campaigns" className="text-amber-400 hover:text-amber-300">
          ← Back to Campaigns
        </Link>
      </main>
    );
  }

  const charactersInCampaign = allCharacters.filter(c => c.campaignId === campaignId);
  const availableCharacters = allCharacters.filter(c => c.campaignId !== campaignId);

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#0d0d0d]">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/campaigns" className="text-amber-400 hover:text-amber-300">
            ← Back to Campaigns
          </Link>
        </div>

        {/* Campaign Header */}
        <header className="bg-[#1a1a1a] rounded-lg p-6 border border-amber-900/30 mb-8">
          <h1 className="text-3xl font-bold text-amber-400 mb-2">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-gray-400 italic">{campaign.description}</p>
          )}
        </header>

        {/* ═══════════════════════════════════════════════════════════════════
            WORLD GENERATION PROGRESS
            ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-[#1a1a1a] rounded-lg p-6 border border-amber-900/30 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-xl text-amber-400 flex items-center gap-2">
              <span>🌍</span> World Generation
            </h2>
            <button
              onClick={() => setShowDebugPanel(true)}
              className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-300 rounded border border-gray-700"
            >
              🔧 Debug Panel
            </button>
          </div>

          {/* World Description Editor - Always shown when not generating */}
          {!isGenerating && loreStatus.status !== 'completed' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-400 font-semibold text-sm">
                  World Description
                </label>
                {!isEditingDescription && campaign?.description && (
                  <button
                    onClick={startEditingDescription}
                    className="text-xs text-amber-400 hover:text-amber-300"
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>
              
              {isEditingDescription ? (
                <div className="space-y-3">
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Describe your world in detail... What is the setting? What conflicts exist? What makes this world unique? The more detail you provide, the richer the generated lore will be."
                    className="w-full h-40 px-4 py-3 bg-[#0d0d0d] border border-amber-700/30 rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-600 resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <div className={`text-sm ${
                      editedDescription.trim().length >= MIN_DESCRIPTION_LENGTH 
                        ? 'text-green-400' 
                        : 'text-amber-400'
                    }`}>
                      {editedDescription.trim().length} / {MIN_DESCRIPTION_LENGTH} characters
                      {editedDescription.trim().length < MIN_DESCRIPTION_LENGTH && (
                        <span className="text-gray-500 ml-2">
                          ({MIN_DESCRIPTION_LENGTH - editedDescription.trim().length} more needed for world generation)
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={cancelEditingDescription}
                        className="px-3 py-1.5 text-gray-400 hover:text-gray-300 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveDescription}
                        disabled={savingDescription}
                        className="px-4 py-1.5 bg-amber-700 text-white rounded hover:bg-amber-600 disabled:opacity-50 text-sm"
                      >
                        {savingDescription ? 'Saving...' : 'Save Description'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : campaign?.description ? (
                <div className="bg-[#0d0d0d] rounded-lg p-4 border border-gray-800">
                  <div className="scroll-container-sm">
                    <p className="text-gray-400 italic whitespace-pre-wrap pr-2">{campaign.description}</p>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    {campaign.description.trim().length} characters
                  </div>
                </div>
              ) : (
                <button
                  onClick={startEditingDescription}
                  className="w-full py-8 border-2 border-dashed border-amber-700/30 rounded-lg text-center text-amber-400 hover:bg-amber-900/10 transition-colors"
                >
                  <div className="text-2xl mb-2">📝</div>
                  <div>Click to add a world description</div>
                  <div className="text-xs text-gray-500 mt-1">
                    At least {MIN_DESCRIPTION_LENGTH} characters required for world generation
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Status: Not Started - Show why and how to start */}
          {loreStatus.status === 'not_started' && !isEditingDescription && (
            <div className="text-center py-4">
              {campaign?.description && campaign.description.trim().length >= MIN_DESCRIPTION_LENGTH ? (
                // Description is sufficient but generation hasn't started
                <div className="space-y-4">
                  <div className="text-green-400 flex items-center justify-center gap-2">
                    <span>✓</span>
                    <span>World description ready for generation</span>
                  </div>
                  <button
                    onClick={triggerGeneration}
                    disabled={triggeringGeneration}
                    className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold rounded-lg hover:from-amber-500 hover:to-amber-400 transition-all disabled:opacity-50 shadow-lg shadow-amber-900/30"
                  >
                    {triggeringGeneration ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span> Starting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>✨</span> Generate World Lore
                      </span>
                    )}
                  </button>
                  <p className="text-xs text-gray-500">
                    This will create factions, NPCs, locations, conflicts, and secrets based on your description
                  </p>
                </div>
              ) : campaign?.description ? (
                // Description exists but is too short
                <div className="space-y-3">
                  <div className="text-amber-400 flex items-center justify-center gap-2">
                    <span>⚠️</span>
                    <span>Description too short for world generation</span>
                  </div>
                  <p className="text-gray-500 text-sm">
                    Add at least {MIN_DESCRIPTION_LENGTH - (campaign.description?.trim().length || 0)} more characters to enable automatic world building
                  </p>
                  <button
                    onClick={startEditingDescription}
                    className="px-4 py-2 border border-amber-700/50 text-amber-400 rounded hover:bg-amber-900/20"
                  >
                    Expand Description
                  </button>
                </div>
              ) : (
                // No description at all
                <div className="text-gray-500">
                  <p>Add a world description above to generate rich lore</p>
                </div>
              )}
            </div>
          )}

          {isGenerating && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="relative">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                    style={{ width: `${((getCurrentPhaseIndex() + 1) / GENERATION_PHASES.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Phase List */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {GENERATION_PHASES.map((phase, idx) => {
                  const currentIdx = getCurrentPhaseIndex();
                  const isComplete = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  const isPending = idx > currentIdx;

                  return (
                    <div
                      key={phase.id}
                      className={`flex items-center gap-2 p-2 rounded text-sm ${
                        isCurrent 
                          ? 'bg-amber-900/30 text-amber-400 border border-amber-700/50' 
                          : isComplete 
                            ? 'text-green-400' 
                            : 'text-gray-600'
                      }`}
                    >
                      <span className={isCurrent ? 'animate-pulse' : ''}>
                        {isComplete ? '✓' : phase.icon}
                      </span>
                      <span className="truncate">{phase.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Current Phase Detail */}
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-amber-900/20 rounded-lg border border-amber-700/30">
                  <div className="animate-spin text-amber-400">⏳</div>
                  <span className="text-amber-300">
                    {GENERATION_PHASES[getCurrentPhaseIndex()]?.label || 'Initializing...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {loreStatus.status === 'completed' && loreStatus.summary && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400 mb-4">
                <span className="text-2xl">✓</span>
                <span className="font-semibold">World Generation Complete!</span>
              </div>

              {/* World Summary */}
              <div className="bg-[#0d0d0d] rounded-lg p-4 border border-green-900/30">
                <h3 className="text-lg text-amber-400 mb-3">
                  {loreStatus.summary.worldName || campaign.name}
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                  <StatBadge icon="⚔️" label="Factions" value={loreStatus.summary.factions} />
                  <StatBadge icon="👤" label="NPCs" value={loreStatus.summary.npcs} />
                  <StatBadge icon="🏰" label="Locations" value={loreStatus.summary.locations} />
                  <StatBadge icon="🔥" label="Conflicts" value={loreStatus.summary.conflicts} />
                  <StatBadge icon="🔒" label="Secrets" value={loreStatus.summary.secrets} />
                  <StatBadge icon="🎭" label="Tone" value={loreStatus.summary.tone} isText />
                </div>
              </div>

              <Link
                href={`/campaign/${campaignId}/lore`}
                className="block text-center text-amber-400 hover:text-amber-300 text-sm"
              >
                📜 Explore World Lore →
              </Link>
            </div>
          )}

          {loreStatus.status === 'failed' && (
            <div className="text-center py-6">
              <div className="text-red-400 mb-2">⚠️ Generation Failed</div>
              <p className="text-gray-500 text-sm">{loreStatus.error || 'Unknown error'}</p>
              <button
                onClick={() => {
                  fetch(`/api/campaign/${campaignId}/generate-lore`, { method: 'POST' });
                  setLoreStatus({ status: 'pending' });
                  setLorePolling(true);
                }}
                className="mt-4 px-4 py-2 bg-amber-700 text-white rounded hover:bg-amber-600"
              >
                Retry Generation
              </button>
            </div>
          )}
        </section>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            CHARACTER SELECTION
            ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-[#1a1a1a] rounded-lg p-6 border border-amber-900/30 mb-6">
          <h2 className="font-bold text-xl text-amber-400 mb-4 flex items-center gap-2">
            <span>👥</span> Select Your Party
          </h2>
          <p className="text-gray-500 mb-6">
            Choose which characters will join this adventure.
          </p>

          {/* Characters Already in Campaign */}
          {charactersInCampaign.length > 0 && (
            <div className="mb-6">
              <h3 className="text-gray-400 font-semibold mb-3 text-sm uppercase tracking-wide">
                Current Party Members
              </h3>
              <div className="grid gap-3">
                {charactersInCampaign.map((char) => (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    selected={selectedCharacters.has(char.id)}
                    onToggle={() => toggleCharacter(char.id)}
                    inCampaign={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Available Characters */}
          {availableCharacters.length > 0 && (
            <div className="mb-6">
              <h3 className="text-gray-400 font-semibold mb-3 text-sm uppercase tracking-wide">
                Available Characters
              </h3>
              <div className="grid gap-3">
                {availableCharacters.map((char) => (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    selected={selectedCharacters.has(char.id)}
                    onToggle={() => toggleCharacter(char.id)}
                    inCampaign={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No Characters */}
          {allCharacters.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                No characters available. Create your first hero!
              </p>
            </div>
          )}

          {/* Create New Character Link */}
          <Link
            href={`/campaign/${campaignId}/character/new`}
            className="block w-full py-4 border-2 border-dashed border-amber-700/30 rounded-lg text-center text-amber-400 hover:bg-amber-900/10 transition-colors"
          >
            + Create New Character
          </Link>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            ACTION BUTTONS
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex gap-4">
          <button
            onClick={startAdventure}
            disabled={!canStartAdventure || joining}
            className={`flex-1 px-8 py-4 font-semibold rounded-lg transition-all text-lg ${
              canStartAdventure
                ? 'bg-amber-600 text-white hover:bg-amber-500'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {joining ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Preparing Adventure...
              </span>
            ) : isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-pulse">🌍</span> Waiting for World Generation...
              </span>
            ) : selectedCharacters.size === 0 ? (
              'Select Characters to Continue'
            ) : (
              `Begin Adventure with ${selectedCharacters.size} Character${selectedCharacters.size > 1 ? 's' : ''}`
            )}
          </button>
        </div>

        {/* Skip Link (only if already has characters in campaign) */}
        {campaign.characters.length > 0 && loreStatus.status === 'completed' && (
          <div className="mt-6 text-center">
            <Link
              href={`/campaign/${campaignId}`}
              className="text-gray-500 hover:text-amber-400 text-sm"
            >
              Skip setup and continue existing adventure →
            </Link>
          </div>
        )}
      </div>

      {/* Debug Panel */}
      <GenerationDebugPanel
        campaignId={campaignId}
        isOpen={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
      />
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function StatBadge({ 
  icon, 
  label, 
  value, 
  isText = false 
}: { 
  icon: string; 
  label: string; 
  value: number | string; 
  isText?: boolean;
}) {
  return (
    <div className="bg-[#1a1a1a] rounded p-2">
      <div className="text-lg">{icon}</div>
      <div className={`font-bold ${isText ? 'text-sm capitalize' : 'text-xl'} text-gray-200`}>
        {value}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function CharacterCard({
  character,
  selected,
  onToggle,
  inCampaign,
}: {
  character: CharacterSetupSummary;
  selected: boolean;
  onToggle: () => void;
  inCampaign: boolean;
}) {
  const hpPercent = Math.round((character.currentHp / character.maxHp) * 100);

  return (
    <button
      onClick={onToggle}
      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
        selected
          ? 'border-amber-600 bg-amber-900/20'
          : 'border-gray-700 bg-[#0d0d0d] hover:border-gray-600'
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-gray-200">{character.name}</h4>
          <p className="text-gray-500 text-sm">
            Level {character.level} {character.race} {character.className}
          </p>
          {character.backstory && (
            <p className="text-gray-600 text-xs mt-1 line-clamp-1">
              {character.backstory}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {inCampaign && (
            <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded">
              In Party
            </span>
          )}
          <div className="text-right">
            <div className="text-sm text-gray-300">
              {character.currentHp}/{character.maxHp} HP
            </div>
            <div className="w-20 h-1.5 bg-gray-800 rounded-full mt-1">
              <div
                className={`h-full rounded-full ${
                  hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              selected ? 'border-amber-500 bg-amber-500' : 'border-gray-600'
            }`}
          >
            {selected && <span className="text-black text-sm font-bold">✓</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
