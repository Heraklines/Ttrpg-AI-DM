'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CharacterSummary } from '@/lib/engine/types';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  characters: CharacterSummary[];
}

interface CampaignTemplate {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDesc, setNewCampaignDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
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

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/campaign-template');
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      // Don't set error state for templates - they're optional
    }
  }

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId);
    if (templateId) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setNewCampaignName(template.name);
        setNewCampaignDesc(template.description || '');
      }
    }
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    setCreating(true);
    try {
      // If saveAsTemplate is checked, create the template first
      if (saveAsTemplate) {
        const templateRes = await fetch('/api/campaign-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newCampaignName.trim(),
            description: newCampaignDesc.trim() || undefined,
          }),
        });
        const templateData = await templateRes.json();
        if (templateData.error) {
          throw new Error(templateData.error.message);
        }
        // Add the new template to the list
        setTemplates([templateData.template, ...templates]);
      }

      // Create the campaign
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
      setSelectedTemplateId('');
      setSaveAsTemplate(false);
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

  async function deleteTemplate(id: string) {
    if (!confirm('Are you sure you want to delete this template? Existing campaigns will not be affected.')) {
      return;
    }

    try {
      const res = await fetch(`/api/campaign-template/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      setTemplates(templates.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowTemplateManager(!showTemplateManager)}
              className="px-4 py-2 border border-primary/30 text-primary rounded-lg hover:bg-primary/10 transition-colors"
            >
              {showTemplateManager ? 'Hide Templates' : 'Manage Templates'}
            </button>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="btn-ornate px-8 py-3 font-medieval font-bold tracking-wider"
            >
              {showCreate ? 'Cancel' : 'New Campaign'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-ember/20 border border-ember rounded-lg text-ember">
            {error}
            <button onClick={() => setError(null)} className="ml-4 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Template Manager Section */}
        {showTemplateManager && (
          <div className="mb-8 p-6 bg-surface rounded-lg border border-primary/30">
            <h2 className="text-2xl font-medieval text-primary mb-4">Campaign Templates</h2>
            {templates.length === 0 ? (
              <p className="text-parchment/60">No templates saved yet. Create a campaign and check &quot;Save as template&quot; to save it for reuse.</p>
            ) : (
              <div className="grid gap-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex justify-between items-center p-4 bg-background rounded-lg border border-primary/20"
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-parchment">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-parchment/60 mt-1">{template.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="px-3 py-1 bg-ember/20 text-ember rounded hover:bg-ember/30 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showCreate && (
          <form onSubmit={createCampaign} className="mb-8 p-6 bg-surface rounded-lg border border-primary/30">
            <h2 className="text-2xl font-medieval text-primary mb-4">Create New Campaign</h2>

            {/* Template Selector */}
            {templates.length > 0 && (
              <div className="mb-4">
                <label htmlFor="template" className="block text-parchment/80 mb-2">
                  Start from Template (optional)
                </label>
                <select
                  id="template"
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-primary/30 rounded-lg text-parchment focus:outline-none focus:border-primary"
                >
                  <option value="">-- Select a template --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

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

            {/* Save as Template Checkbox */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="w-4 h-4 rounded border-primary/30 bg-background text-primary focus:ring-primary"
                />
                <span className="text-parchment/80">Save this configuration as a template for future campaigns</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={creating || !newCampaignName.trim()}
              className="btn-ornate px-8 py-3 font-medieval font-bold tracking-wider disabled:opacity-50"
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
                      <div className="scroll-container-sm mb-4">
                        <p className="text-parchment/70 narrative-text pr-2">{campaign.description}</p>
                      </div>
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
                        className="btn-ornate px-6 py-3 font-medieval font-bold tracking-wider"
                      >
                        Continue
                      </Link>
                    ) : (
                      <Link
                        href={`/campaign/${campaign.id}/setup`}
                        className="btn-ornate px-6 py-3 font-medieval font-bold tracking-wider"
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
