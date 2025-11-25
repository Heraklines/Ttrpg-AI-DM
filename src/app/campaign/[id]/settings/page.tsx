'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  settings: {
    difficulty: string;
    deathRules: string;
    restRules: string;
    encumbrance: boolean;
    criticalHitTables: boolean;
  };
}

const DEFAULT_SETTINGS = {
  difficulty: 'standard',
  deathRules: 'standard',
  restRules: 'standard',
  encumbrance: false,
  criticalHitTables: false,
};

export default function CampaignSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/campaign/${campaignId}`);
        if (!res.ok) throw new Error('Campaign not found');
        const data = await res.json();
        setCampaign(data);
        setName(data.name);
        setDescription(data.description || '');
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(data.settings || '{}') });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campaignId]);

  async function saveSettings() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/campaign/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          settings: JSON.stringify(settings),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to save');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCampaign() {
    try {
      const res = await fetch(`/api/campaign/${campaignId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/campaigns');
      } else {
        throw new Error('Failed to delete campaign');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-parchment/60">Loading settings...</div>
      </main>
    );
  }

  if (error && !campaign) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-ember text-xl mb-4">{error}</div>
        <Link href="/campaigns" className="text-primary hover:text-primary-light">
          &larr; Back to Campaigns
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/campaign/${campaignId}`} className="text-primary hover:text-primary-light">
            &larr; Back to Adventure
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-medieval text-primary mb-2">Campaign Settings</h1>
        </header>

        {/* Status Messages */}
        {error && (
          <div className="bg-ember/20 border border-ember rounded-lg p-4 mb-6">
            <p className="text-ember">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-forest/20 border border-forest rounded-lg p-4 mb-6">
            <p className="text-forest">Settings saved successfully!</p>
          </div>
        )}

        {/* Basic Info */}
        <section className="bg-surface rounded-lg p-6 border border-primary/20 mb-6">
          <h2 className="font-medieval text-xl text-primary mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-parchment/70 mb-2">Campaign Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-primary/30 rounded-lg text-parchment focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-parchment/70 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-background border border-primary/30 rounded-lg text-parchment focus:outline-none focus:border-primary resize-none"
              />
            </div>
          </div>
        </section>

        {/* Game Rules */}
        <section className="bg-surface rounded-lg p-6 border border-primary/20 mb-6">
          <h2 className="font-medieval text-xl text-primary mb-4">Game Rules</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-parchment/70 mb-2">Difficulty</label>
              <select
                value={settings.difficulty}
                onChange={(e) => setSettings({ ...settings, difficulty: e.target.value })}
                className="w-full px-4 py-3 bg-background border border-primary/30 rounded-lg text-parchment focus:outline-none focus:border-primary"
              >
                <option value="easy">Easy - Encounters are less deadly</option>
                <option value="standard">Standard - By the book</option>
                <option value="hard">Hard - Tougher enemies, fewer resources</option>
                <option value="deadly">Deadly - Unforgiving, high stakes</option>
              </select>
            </div>

            <div>
              <label className="block text-parchment/70 mb-2">Death & Dying</label>
              <select
                value={settings.deathRules}
                onChange={(e) => setSettings({ ...settings, deathRules: e.target.value })}
                className="w-full px-4 py-3 bg-background border border-primary/30 rounded-lg text-parchment focus:outline-none focus:border-primary"
              >
                <option value="heroic">Heroic - Stabilize at 0 HP after combat</option>
                <option value="standard">Standard - Death saves as normal</option>
                <option value="gritty">Gritty - Failed saves don&apos;t reset</option>
              </select>
            </div>

            <div>
              <label className="block text-parchment/70 mb-2">Rest Rules</label>
              <select
                value={settings.restRules}
                onChange={(e) => setSettings({ ...settings, restRules: e.target.value })}
                className="w-full px-4 py-3 bg-background border border-primary/30 rounded-lg text-parchment focus:outline-none focus:border-primary"
              >
                <option value="epic">Epic Heroism - Short rest 5 min, long rest 1 hour</option>
                <option value="standard">Standard - Short rest 1 hour, long rest 8 hours</option>
                <option value="gritty">Gritty Realism - Short rest 8 hours, long rest 7 days</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-parchment">Encumbrance Rules</span>
                <p className="text-parchment/50 text-sm">Track carry weight and movement penalties</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, encumbrance: !settings.encumbrance })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.encumbrance ? 'bg-primary' : 'bg-background'
                }`}
              >
                <div className={`w-5 h-5 bg-parchment rounded-full transition-transform ${
                  settings.encumbrance ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-parchment">Critical Hit Tables</span>
                <p className="text-parchment/50 text-sm">Add extra effects on natural 20s</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, criticalHitTables: !settings.criticalHitTables })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.criticalHitTables ? 'bg-primary' : 'bg-background'
                }`}
              >
                <div className={`w-5 h-5 bg-parchment rounded-full transition-transform ${
                  settings.criticalHitTables ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-primary text-background font-semibold rounded-lg hover:bg-primary-light disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Danger Zone */}
        <section className="bg-secondary/10 rounded-lg p-6 border border-secondary/30">
          <h2 className="font-medieval text-xl text-ember mb-4">Danger Zone</h2>
          
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-3 bg-secondary text-parchment font-semibold rounded-lg hover:bg-secondary-light transition-colors"
            >
              Delete Campaign
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-ember">
                Are you sure? This will permanently delete the campaign, all characters, and session history.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={deleteCampaign}
                  className="px-6 py-3 bg-ember text-background font-semibold rounded-lg hover:bg-ember/80 transition-colors"
                >
                  Yes, Delete Forever
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-3 border border-parchment/30 text-parchment rounded-lg hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
