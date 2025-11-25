'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Character {
  id: string;
  name: string;
  race: string;
  className: string;
  level: number;
  currentHp: number;
  maxHp: number;
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  characters: Character[];
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDesc, setNewCampaignDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const res = await fetch('/api/campaign');
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      setCampaigns(data.campaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCampaignName.trim(),
          description: newCampaignDesc.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      setCampaigns([data.campaign, ...campaigns]);
      setNewCampaignName('');
      setNewCampaignDesc('');
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Are you sure you want to delete this campaign? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/campaign/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      setCampaigns(campaigns.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete campaign');
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-parchment/60">Loading campaigns...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/" className="text-primary hover:text-primary-light mb-2 inline-block">
              &larr; Back to Home
            </Link>
            <h1 className="text-4xl font-medieval text-primary">Your Campaigns</h1>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-6 py-2 bg-primary text-background font-semibold rounded-lg hover:bg-primary-light transition-colors"
          >
            {showCreate ? 'Cancel' : 'New Campaign'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-ember/20 border border-ember rounded-lg text-ember">
            {error}
            <button onClick={() => setError(null)} className="ml-4 underline">
              Dismiss
            </button>
          </div>
        )}

        {showCreate && (
          <form onSubmit={createCampaign} className="mb-8 p-6 bg-surface rounded-lg border border-primary/30">
            <h2 className="text-2xl font-medieval text-primary mb-4">Create New Campaign</h2>
            <div className="mb-4">
              <label htmlFor="name" className="block text-parchment/80 mb-2">
                Campaign Name *
              </label>
              <input
                id="name"
                type="text"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-primary/30 rounded-lg text-parchment focus:outline-none focus:border-primary"
                placeholder="Enter campaign name..."
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-parchment/80 mb-2">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={newCampaignDesc}
                onChange={(e) => setNewCampaignDesc(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-primary/30 rounded-lg text-parchment focus:outline-none focus:border-primary"
                placeholder="Describe your campaign..."
                rows={3}
              />
            </div>
            <button
              type="submit"
              disabled={creating || !newCampaignName.trim()}
              className="px-6 py-2 bg-primary text-background font-semibold rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Campaign'}
            </button>
          </form>
        )}

        {campaigns.length === 0 ? (
          <div className="text-center py-12 text-parchment/60">
            <p className="text-xl mb-4">No campaigns yet</p>
            <p>Create your first campaign to begin your adventure!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="p-6 bg-surface rounded-lg border border-primary/20 hover:border-primary/40 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-2xl font-medieval text-primary mb-2">{campaign.name}</h3>
                    {campaign.description && (
                      <p className="text-parchment/70 mb-4 narrative-text">{campaign.description}</p>
                    )}
                    <div className="flex gap-4 text-sm text-parchment/50">
                      <span>{(campaign.characters || []).length} character(s)</span>
                      <span>Last played: {new Date(campaign.updatedAt).toLocaleDateString()}</span>
                    </div>
                    {(campaign.characters || []).length > 0 && (
                      <div className="mt-4 flex gap-2 flex-wrap">
                        {campaign.characters.map((char) => (
                          <span
                            key={char.id}
                            className="px-3 py-1 bg-background rounded-full text-sm text-parchment/80"
                          >
                            {char.name} (Lvl {char.level} {char.className})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {(campaign.characters || []).length > 0 ? (
                      <Link
                        href={`/campaign/${campaign.id}`}
                        className="px-4 py-2 bg-primary text-background font-semibold rounded-lg hover:bg-primary-light transition-colors"
                      >
                        Continue
                      </Link>
                    ) : (
                      <Link
                        href={`/campaign/${campaign.id}/setup`}
                        className="px-4 py-2 bg-primary text-background font-semibold rounded-lg hover:bg-primary-light transition-colors"
                      >
                        Setup Party
                      </Link>
                    )}
                    <Link
                      href={`/campaign/${campaign.id}/setup`}
                      className="px-4 py-2 border border-primary/30 text-primary rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      Manage
                    </Link>
                    <button
                      onClick={() => deleteCampaign(campaign.id)}
                      className="px-4 py-2 bg-ember/20 text-ember rounded-lg hover:bg-ember/30 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
