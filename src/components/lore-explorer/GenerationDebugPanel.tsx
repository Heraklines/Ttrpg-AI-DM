'use client';

import { useState, useEffect, useCallback } from 'react';

interface GenerationLog {
  id: string;
  phase: string;
  status: string;
  prompt: string | null;
  response: string | null;
  parsedData: string | null;
  error: string | null;
  tokenCount: number | null;
  durationMs: number | null;
  createdAt: string;
}

interface GenerationDebugPanelProps {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  tensions: 'Core Tensions',
  cosmology: 'Cosmology & Foundations',
  factions: 'Factions',
  npcs: 'NPCs',
  conflicts: 'Conflicts',
  locations: 'Locations',
  secrets: 'Secrets',
  coherence: 'Coherence Check',
};

const STATUS_COLORS: Record<string, string> = {
  started: 'text-yellow-400 bg-yellow-900/30',
  completed: 'text-green-400 bg-green-900/30',
  failed: 'text-red-400 bg-red-900/30',
};

export function GenerationDebugPanel({
  campaignId,
  isOpen,
  onClose,
}: GenerationDebugPanelProps) {
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/campaign/${campaignId}/generation-logs`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data.logs || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);

  useEffect(() => {
    if (autoRefresh && isOpen) {
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isOpen, fetchLogs]);

  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all generation logs?')) return;
    try {
      await fetch(`/api/campaign/${campaignId}/generation-logs`, { method: 'DELETE' });
      setLogs([]);
    } catch (e) {
      setError('Failed to clear logs');
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatJson = (jsonStr: string | null) => {
    if (!jsonStr) return null;
    try {
      return JSON.stringify(JSON.parse(jsonStr), null, 2);
    } catch {
      return jsonStr;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-amber-900/30 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-amber-900/30">
          <h2 className="text-xl font-medieval text-amber-400">
            Generation Debug Panel
          </h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded bg-gray-800 border-gray-600"
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-3 py-1 text-sm bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 rounded"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={clearLogs}
              className="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800/50 text-red-300 rounded"
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-300">
              {error}
            </div>
          )}

          {logs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No generation logs yet. Start generating world lore to see debug output.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* Phase Header */}
                  <button
                    onClick={() => togglePhase(log.id)}
                    className="w-full flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {expandedPhases.has(log.id) ? '▼' : '▶'}
                      </span>
                      <span className="font-semibold text-gray-200">
                        {PHASE_LABELS[log.phase] || log.phase}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          STATUS_COLORS[log.status] || 'text-gray-400 bg-gray-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {log.tokenCount && (
                        <span>~{log.tokenCount.toLocaleString()} tokens</span>
                      )}
                      <span>{formatDuration(log.durationMs)}</span>
                      <span>
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {expandedPhases.has(log.id) && (
                    <div className="p-4 space-y-4 bg-[#0d0d0d]">
                      {log.error && (
                        <div className="p-3 bg-red-900/30 border border-red-700 rounded">
                          <h4 className="font-semibold text-red-400 mb-1">Error</h4>
                          <pre className="text-sm text-red-300 whitespace-pre-wrap">
                            {log.error}
                          </pre>
                        </div>
                      )}

                      {log.prompt && (
                        <div>
                          <h4 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
                            <span>Prompt</span>
                            <span className="text-xs text-gray-500 font-normal">
                              ({log.prompt.length.toLocaleString()} chars)
                            </span>
                          </h4>
                          <pre className="p-3 bg-gray-900 rounded text-sm text-gray-300 overflow-auto max-h-60 whitespace-pre-wrap font-mono">
                            {log.prompt}
                          </pre>
                        </div>
                      )}

                      {log.response && (
                        <div>
                          <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                            <span>Raw Response</span>
                            <span className="text-xs text-gray-500 font-normal">
                              ({log.response.length.toLocaleString()} chars)
                            </span>
                          </h4>
                          <pre className="p-3 bg-gray-900 rounded text-sm text-gray-300 overflow-auto max-h-60 whitespace-pre-wrap font-mono">
                            {log.response}
                          </pre>
                        </div>
                      )}

                      {log.parsedData && (
                        <div>
                          <h4 className="font-semibold text-green-400 mb-2">
                            Parsed Data
                          </h4>
                          <pre className="p-3 bg-gray-900 rounded text-sm text-green-300 overflow-auto max-h-80 whitespace-pre-wrap font-mono">
                            {formatJson(log.parsedData)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="border-t border-amber-900/30 p-3 bg-gray-900/50 flex items-center justify-between text-sm text-gray-400">
          <span>
            {logs.length} phase{logs.length !== 1 ? 's' : ''} logged
          </span>
          <span>
            Total:{' '}
            {formatDuration(logs.reduce((sum, l) => sum + (l.durationMs || 0), 0))}
          </span>
        </div>
      </div>
    </div>
  );
}
