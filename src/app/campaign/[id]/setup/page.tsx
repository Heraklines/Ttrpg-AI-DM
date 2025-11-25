'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Character {
  id: string;
  name: string;
  race: string;
  className: string;
  level: number;
  currentHp: number;
  maxHp: number;
  backstory: string | null;
  campaignId: string | null;
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  characters: Character[];
}

export default function CampaignSetupPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadData();
  }, [campaignId]);

  async function loadData() {
    try {
      // Load campaign
      const campaignRes = await fetch(`/api/campaign/${campaignId}`);
      if (!campaignRes.ok) throw new Error('Campaign not found');
      const campaignData = await campaignRes.json();
      setCampaign(campaignData.campaign);

      // Characters already in this campaign are pre-selected
      const existingIds = new Set<string>(
        (campaignData.campaign.characters || []).map((c: Character) => c.id)
      );
      setSelectedCharacters(existingIds);

      // Load ALL characters that either belong to this campaign or have no campaign
      const charsRes = await fetch('/api/character');
      if (charsRes.ok) {
        const charsData = await charsRes.json();
        // Filter to show: characters in this campaign OR characters without a campaign
        const available = charsData.filter(
          (c: Character) => c.campaignId === campaignId || !c.campaignId
        );
        setAllCharacters(available);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

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

    setJoining(true);
    setError(null);

    try {
      // Assign selected characters to this campaign
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

      // Navigate to adventure
      router.push(`/campaign/${campaignId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start adventure');
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-parchment/60">Loading campaign...</div>
      </main>
    );
  }

  if (!campaign) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-ember text-xl mb-4">{error || 'Campaign not found'}</div>
        <Link href="/campaigns" className="text-primary hover:text-primary-light">
          &larr; Back to Campaigns
        </Link>
      </main>
    );
  }

  const charactersInCampaign = allCharacters.filter(c => c.campaignId === campaignId);
  const availableCharacters = allCharacters.filter(c => !c.campaignId);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/campaigns" className="text-primary hover:text-primary-light">
            &larr; Back to Campaigns
          </Link>
        </div>

        {/* Campaign Header */}
        <header className="bg-surface rounded-lg p-6 border border-primary/20 mb-8">
          <h1 className="text-3xl font-medieval text-primary mb-2">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-parchment/70 narrative-text">{campaign.description}</p>
          )}
        </header>

        {/* Error Display */}
        {error && (
          <div className="bg-ember/20 border border-ember rounded-lg p-4 mb-6">
            <p className="text-ember">{error}</p>
          </div>
        )}

        {/* Character Selection */}
        <section className="bg-surface rounded-lg p-6 border border-primary/20 mb-6">
          <h2 className="font-medieval text-xl text-primary mb-4">Select Your Party</h2>
          <p className="text-parchment/60 mb-6">
            Choose which characters will join this adventure. You can select existing characters or create new ones.
          </p>

          {/* Characters Already in Campaign */}
          {charactersInCampaign.length > 0 && (
            <div className="mb-6">
              <h3 className="text-parchment/80 font-semibold mb-3">Current Party Members</h3>
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
              <h3 className="text-parchment/80 font-semibold mb-3">Available Characters</h3>
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
              <p className="text-parchment/60 mb-4">
                No characters available. Create your first hero to begin the adventure!
              </p>
            </div>
          )}

          {/* Create New Character Link */}
          <Link
            href={`/campaign/${campaignId}/character/new`}
            className="block w-full py-4 border-2 border-dashed border-primary/30 rounded-lg text-center text-primary hover:bg-primary/10 transition-colors"
          >
            + Create New Character
          </Link>
        </section>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={startAdventure}
            disabled={selectedCharacters.size === 0 || joining}
            className="flex-1 px-8 py-4 bg-primary text-background font-semibold rounded-lg hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
          >
            {joining ? 'Preparing Adventure...' : selectedCharacters.size === 0 ? 'Select Characters to Continue' : `Begin Adventure with ${selectedCharacters.size} Character${selectedCharacters.size > 1 ? 's' : ''}`}
          </button>
        </div>

        {/* Quick Actions */}
        {campaign.characters.length > 0 && (
          <div className="mt-6 text-center">
            <Link
              href={`/campaign/${campaignId}`}
              className="text-parchment/50 hover:text-primary text-sm"
            >
              Skip setup and continue existing adventure &rarr;
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function CharacterCard({
  character,
  selected,
  onToggle,
  inCampaign,
}: {
  character: Character;
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
          ? 'border-primary bg-primary/10'
          : 'border-primary/20 bg-background hover:border-primary/40'
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-parchment">{character.name}</h4>
          <p className="text-parchment/60 text-sm">
            Level {character.level} {character.race} {character.className}
          </p>
          {character.backstory && (
            <p className="text-parchment/40 text-xs mt-1 line-clamp-1">
              {character.backstory}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {inCampaign && (
            <span className="text-xs px-2 py-1 bg-tertiary/20 text-tertiary rounded">
              In Party
            </span>
          )}
          <div className="text-right">
            <div className="text-sm text-parchment">
              {character.currentHp}/{character.maxHp} HP
            </div>
            <div className="w-20 h-1.5 bg-background rounded-full mt-1">
              <div
                className={`h-full rounded-full ${
                  hpPercent > 50 ? 'bg-forest' : hpPercent > 25 ? 'bg-amber' : 'bg-ember'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              selected ? 'border-primary bg-primary' : 'border-parchment/30'
            }`}
          >
            {selected && <span className="text-background text-sm">✓</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
