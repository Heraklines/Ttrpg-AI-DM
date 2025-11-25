import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center max-w-4xl">
        <h1 className="text-5xl font-medieval text-primary mb-4">
          Arcane Gamemaster
        </h1>
        <p className="text-xl text-parchment/80 mb-8 narrative-text">
          Your AI-powered D&D 5e companion with true mechanical accuracy.
          Every dice roll is real. Every outcome is fair.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/campaigns"
            className="px-8 py-3 bg-primary text-background font-semibold rounded-lg hover:bg-primary-light transition-colors"
          >
            Start Adventure
          </Link>
          <Link
            href="/settings"
            className="px-8 py-3 bg-surface border border-primary/50 text-primary rounded-lg hover:bg-surface-light transition-colors"
          >
            Settings
          </Link>
        </div>
      </div>
    </main>
  );
}
