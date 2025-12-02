import { prisma } from '@/lib/db';
import { LoreExplorer } from '@/components/lore-explorer/LoreExplorer';
import { LoreGenerationStatus } from '@/components/lore-explorer/LoreGenerationStatus';
import Link from 'next/link';

export default async function LorePage({ params }: { params: { id: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      worldSeed: true,
    },
  });

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center text-parchment">
          <h1 className="text-2xl font-medieval text-primary-gold mb-4">Campaign Not Found</h1>
          <Link href="/campaigns" className="text-tertiary-blue hover:underline">
            Return to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  const worldSeed = campaign.worldSeed;
  if (!worldSeed || worldSeed.generationStatus !== 'completed') {
    return (
      <LoreGenerationStatus
        campaignId={params.id}
        initialStatus={worldSeed?.generationStatus || 'pending'}
        initialPhase={worldSeed?.currentPhase || null}
        initialError={worldSeed?.generationError || null}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background-dark">
      <div className="fixed top-4 left-4 z-50">
        <Link
          href={`/campaign/${params.id}`}
          className="flex items-center gap-2 px-4 py-2 bg-surface-brown border border-primary-gold/30 rounded-lg text-parchment hover:border-primary-gold transition-colors"
        >
          <span>←</span>
          <span>Back to Campaign</span>
        </Link>
      </div>
      <div className="h-screen pt-16">
        <LoreExplorer
          campaignId={params.id}
          worldSeedId={campaign.worldSeed.id}
          worldName={campaign.worldSeed.name || campaign.name}
          initialMode="dm"
        />
      </div>
    </div>
  );
}
