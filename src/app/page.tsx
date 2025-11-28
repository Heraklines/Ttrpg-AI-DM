'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <div className="text-center max-w-2xl">
        {/* Logo/Title */}
        <h1 className="text-6xl font-medieval text-primary mb-4">
          Arcane Gamemaster
        </h1>
        <p className="text-xl text-parchment/70 mb-8">
          Your AI-powered D&D 5th Edition companion
        </p>

        {/* Tagline */}
        <p className="text-parchment/60 mb-12 max-w-lg mx-auto">
          Focus on the story while the system handles all the mechanics. 
          Roll dice, track combat, and manage your party - all automatically.
        </p>

        {/* Main CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href="/campaigns"
            className="px-8 py-4 bg-primary text-background font-semibold rounded-lg hover:bg-primary-light transition-colors text-lg"
          >
            Start Adventure
          </Link>
          <Link
            href="/settings"
            className="px-8 py-4 border border-primary/30 text-primary rounded-lg hover:bg-primary/10 transition-colors text-lg"
          >
            Settings
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="p-4 bg-surface rounded-lg border border-primary/20">
            <div className="text-2xl mb-2">🎲</div>
            <h3 className="text-primary font-semibold mb-1">Automatic Dice</h3>
            <p className="text-parchment/60 text-sm">
              All rolls happen behind the scenes. Just describe what you want to do.
            </p>
          </div>
          <div className="p-4 bg-surface rounded-lg border border-primary/20">
            <div className="text-2xl mb-2">⚔️</div>
            <h3 className="text-primary font-semibold mb-1">Combat Tracking</h3>
            <p className="text-parchment/60 text-sm">
              Initiative, HP, conditions - all managed automatically.
            </p>
          </div>
          <div className="p-4 bg-surface rounded-lg border border-primary/20">
            <div className="text-2xl mb-2">📖</div>
            <h3 className="text-primary font-semibold mb-1">Pure Narrative</h3>
            <p className="text-parchment/60 text-sm">
              The AI tells the story without breaking immersion with numbers.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
