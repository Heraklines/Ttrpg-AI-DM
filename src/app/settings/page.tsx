'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    // In a real app, this would save to the database
    // For now, we'll just store in localStorage
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-primary hover:text-primary-light mb-4 inline-block">
          &larr; Back to Home
        </Link>

        <h1 className="text-4xl font-medieval text-primary mb-8">Settings</h1>

        <div className="space-y-8">
          <section className="p-6 bg-surface rounded-lg border border-primary/20">
            <h2 className="text-2xl font-medieval text-primary mb-4">AI Configuration</h2>
            <p className="text-parchment/70 mb-4">
              Enter your Google Gemini API key to enable AI-powered game mastering.
              Your key is stored locally and never sent to our servers.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-parchment/80 mb-2">
                  Gemini API Key
                </label>
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-primary/30 rounded-lg text-parchment focus:outline-none focus:border-primary"
                  placeholder="Enter your API key..."
                />
              </div>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-primary text-background font-semibold rounded-lg hover:bg-primary-light transition-colors"
              >
                Save API Key
              </button>
              {saved && (
                <span className="ml-4 text-forest">API key saved!</span>
              )}
            </div>
          </section>

          <section className="p-6 bg-surface rounded-lg border border-primary/20">
            <h2 className="text-2xl font-medieval text-primary mb-4">Display Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-parchment/80 mb-2">Theme</label>
                <select
                  className="w-full px-4 py-2 bg-background border border-primary/30 rounded-lg text-parchment focus:outline-none focus:border-primary"
                  defaultValue="dark"
                >
                  <option value="dark">Dark (Default)</option>
                  <option value="light" disabled>Light (Coming Soon)</option>
                </select>
              </div>
              <div>
                <label className="block text-parchment/80 mb-2">Font Size</label>
                <select
                  className="w-full px-4 py-2 bg-background border border-primary/30 rounded-lg text-parchment focus:outline-none focus:border-primary"
                  defaultValue="medium"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>
          </section>

          <section className="p-6 bg-surface rounded-lg border border-primary/20">
            <h2 className="text-2xl font-medieval text-primary mb-4">About</h2>
            <p className="text-parchment/70">
              <strong className="text-parchment">Arcane Gamemaster</strong> is an AI-powered D&D 5e companion
              that handles all mechanical aspects of the game, allowing the AI to focus purely on storytelling
              and roleplay. Every dice roll is real, every outcome is fair.
            </p>
            <p className="text-parchment/50 mt-4 text-sm">Version 1.0.0</p>
          </section>
        </div>
      </div>
    </main>
  );
}
