'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type LoreStatusState = {
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'not_started';
  phase?: string;
  error?: string | null;
};

interface LoreGenerationStatusProps {
  campaignId: string;
  initialStatus: LoreStatusState['status'];
  initialPhase?: string | null;
  initialError?: string | null;
}

export function LoreGenerationStatus({
  campaignId,
  initialStatus,
  initialPhase,
  initialError,
}: LoreGenerationStatusProps) {
  const router = useRouter();
  const [status, setStatus] = useState<LoreStatusState>({
    status: initialStatus,
    phase: initialPhase || undefined,
    error: initialError || null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const phaseOrder = useMemo(
    () => ['tensions', 'cosmology', 'factions', 'npcs', 'conflicts', 'locations', 'secrets', 'coherence'],
    []
  );
  const phaseLabels: Record<string, string> = {
    tensions: 'Extracting Tensions',
    cosmology: 'Forging Cosmology',
    factions: 'Generating Factions',
    npcs: 'Populating NPCs',
    conflicts: 'Charting Conflicts',
    locations: 'Mapping Locations',
    secrets: 'Weaving Secrets',
    coherence: 'Checking Coherence',
  };

  const phaseIndex = status.phase ? phaseOrder.indexOf(status.phase) : -1;
  const phaseProgress = phaseIndex >= 0 ? `${phaseIndex + 1}/${phaseOrder.length}` : '—';
  const phaseText = status.phase ? phaseLabels[status.phase] || status.phase : 'Queued';
  const isFailed = status.status === 'failed';

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaign/${campaignId}/lore-status`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus({
        status: data.status,
        phase: data.phase,
        error: data.error || null,
      });
      if (data.status === 'completed') {
        setIsRefreshing(true);
        setTimeout(() => {
          router.refresh();
        }, 300);
      }
    } catch (err) {
      console.error('Failed to poll lore status', err);
    }
  }, [campaignId, router]);

  useEffect(() => {
    if (initialStatus === 'completed') return;
    fetchStatus();
    const id = window.setInterval(fetchStatus, 5000);
    return () => clearInterval(id);
  }, [fetchStatus, initialStatus]);

  const statusTone =
    status.status === 'failed'
      ? 'text-red-200'
      : status.status === 'generating'
      ? 'text-primary-gold'
      : 'text-parchment';

  const headline =
    status.status === 'failed'
      ? 'Lore generation failed.'
      : status.status === 'generating'
      ? 'Generating World Lore...'
      : status.status === 'pending'
      ? 'Lore generation pending...'
      : 'Checking lore status...';

  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center px-6">
      <div className="text-center text-parchment max-w-md space-y-4">
        <h1 className={`text-2xl font-medieval ${statusTone}`}>{headline}</h1>
        {status.status !== 'failed' && (
          <p className="text-sm text-parchment/80">
            Phase: {phaseText} ({phaseProgress})
          </p>
        )}
        {status.error && (
          <p className="text-sm text-red-200 bg-red-900/30 border border-red-800 rounded p-3">
            {status.error}
          </p>
        )}
        {isRefreshing && (
          <p className="text-sm text-parchment/70">Loading completed lore...</p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href={`/campaign/${campaignId}`}
            className="px-4 py-2 rounded bg-surface-brown border border-primary-gold/30 hover:border-primary-gold transition-colors"
          >
            Return to Campaign
          </Link>
          <button
            onClick={fetchStatus}
            className="px-4 py-2 rounded border border-primary-gold/30 hover:border-primary-gold transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
