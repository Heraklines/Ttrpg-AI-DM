'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Session {
  id: string;
  sessionNumber: number;
  startedAt: string;
  endedAt: string | null;
  summary: string | null;
  transcript: Array<{ role: string; content: string; timestamp?: string }>;
}

interface Campaign {
  id: string;
  name: string;
}

export default function SessionHistoryPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [campaignRes, sessionsRes] = await Promise.all([
          fetch(`/api/campaign/${campaignId}`),
          fetch(`/api/campaign/${campaignId}/sessions`),
        ]);

        if (!campaignRes.ok) throw new Error('Campaign not found');
        
        const campaignData = await campaignRes.json();
        setCampaign(campaignData);

        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json();
          setSessions(sessionsData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campaignId]);

  function formatDuration(start: string, end: string | null): string {
    if (!end) return 'In progress';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-parchment/60">Loading session history...</div>
      </main>
    );
  }

  if (error || !campaign) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-ember text-xl mb-4">{error || 'Campaign not found'}</div>
        <Link href="/campaigns" className="text-primary hover:text-primary-light">
          &larr; Back to Campaigns
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/campaign/${campaignId}`} className="text-primary hover:text-primary-light">
            &larr; Back to Adventure
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-medieval text-primary mb-2">Session History</h1>
          <p className="text-parchment/60">{campaign.name}</p>
        </header>

        {sessions.length === 0 ? (
          <div className="bg-surface rounded-lg p-8 text-center border border-primary/20">
            <p className="text-parchment/60 mb-4">No sessions recorded yet.</p>
            <Link
              href={`/campaign/${campaignId}`}
              className="px-6 py-3 bg-primary text-background font-semibold rounded-lg hover:bg-primary-light inline-block"
            >
              Start Your First Session
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-surface rounded-lg border border-primary/20 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedSession(
                    expandedSession === session.id ? null : session.id
                  )}
                  className="w-full p-4 flex justify-between items-center hover:bg-surface-light transition-colors"
                >
                  <div className="text-left">
                    <h3 className="font-medieval text-lg text-primary">
                      Session {session.sessionNumber}
                    </h3>
                    <p className="text-parchment/60 text-sm">
                      {formatDate(session.startedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      session.endedAt
                        ? 'bg-forest/20 text-forest'
                        : 'bg-amber/20 text-amber'
                    }`}>
                      {session.endedAt ? 'Completed' : 'Active'}
                    </span>
                    <span className="text-parchment/50 text-sm">
                      {formatDuration(session.startedAt, session.endedAt)}
                    </span>
                    <span className="text-primary">
                      {expandedSession === session.id ? '▼' : '▶'}
                    </span>
                  </div>
                </button>

                {expandedSession === session.id && (
                  <div className="border-t border-primary/10 p-4">
                    {/* Summary */}
                    {session.summary && (
                      <div className="mb-4">
                        <h4 className="text-parchment/60 text-sm mb-2">Summary</h4>
                        <p className="text-parchment/80 narrative-text">{session.summary}</p>
                      </div>
                    )}

                    {/* Transcript */}
                    <div>
                      <h4 className="text-parchment/60 text-sm mb-2">
                        Transcript ({session.transcript.length} messages)
                      </h4>
                      <div className="max-h-96 overflow-y-auto space-y-3 bg-background rounded-lg p-3">
                        {session.transcript.map((msg, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-lg ${
                              msg.role === 'user'
                                ? 'bg-tertiary/10 border-l-2 border-tertiary ml-8'
                                : 'bg-surface border-l-2 border-primary mr-8'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-xs font-semibold ${
                                msg.role === 'user' ? 'text-tertiary' : 'text-primary'
                              }`}>
                                {msg.role === 'user' ? 'You' : 'Dungeon Master'}
                              </span>
                              {msg.timestamp && (
                                <span className="text-xs text-parchment/40">
                                  {new Date(msg.timestamp).toLocaleTimeString()}
                                </span>
                              )}
                            </div>
                            <p className="text-parchment/80 text-sm narrative-text">
                              {msg.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
