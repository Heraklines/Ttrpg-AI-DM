'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MiniMap } from '@/components/mini-map';
import type { GameMap, GridPosition, MapEntity } from '@/lib/engine/spatial-types';
import { CharacterPartyView } from '@/lib/engine/types';

interface GameState {
  mode: string;
  gameDay: number;
  gameHour: number;
  gameMinute: number;
  activeCombat: string | null;
  activeMap: string | null;
  currentLocation?: string;
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  characters: CharacterPartyView[];
  gameState: GameState;
}

interface DiceRoll {
  type: string;
  notation: string;
  result: number;
  details: string;
  success?: boolean;
  timestamp: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  diceRolls?: DiceRoll[];
}

type LoreStatus =
  | {
      status: 'pending' | 'generating' | 'completed' | 'failed' | 'not_started';
      phase?: string;
      error?: string;
      startedAt?: string;
      completedAt?: string;
    }
  | null;

// Safe JSON parse helper to prevent crashes on corrupted data
function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    console.warn('Failed to parse JSON in campaign page');
    return fallback;
  }
}

export default function AdventurePage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loreStatus, setLoreStatus] = useState<LoreStatus>(null);
  const [hideLoreBanner, setHideLoreBanner] = useState(false);
  const [showLoreToast, setShowLoreToast] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  
  // UI State
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [diceHistory, setDiceHistory] = useState<DiceRoll[]>([]);
  const [rightPanel, setRightPanel] = useState<'dice' | 'inventory' | 'map' | 'spells' | null>(null);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const fetchLoreStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaign/${campaignId}/lore-status`);
      if (!res.ok) return null;
      const data = await res.json();
      setLoreStatus((prev) => {
        const wasGenerating = prev?.status === 'generating';
        const isNowComplete = data?.status === 'completed';
        if (wasGenerating && isNowComplete) {
          setShowLoreToast(true);
          setTimeout(() => setShowLoreToast(false), 4000);
        }
        return data;
      });
      return data as LoreStatus;
    } catch (err) {
      console.error('Failed to fetch lore status', err);
      return null;
    }
  }, [campaignId]);

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaign/${campaignId}`);
      if (!res.ok) {
        setError(res.status === 404 ? 'Campaign not found' : 'Failed to load campaign');
        return;
      }
      const data = await res.json();
      
      if (!data.campaign.characters || data.campaign.characters.length === 0) {
        router.replace(`/campaign/${campaignId}/setup`);
        return;
      }
      
      setCampaign(data.campaign);

      const hasExistingMessages = data.campaign.gameState?.recentMessages && 
        JSON.parse(data.campaign.gameState.recentMessages).length > 0;

      if (!hasExistingMessages && data.campaign.characters?.length > 0) {
        setMessages([{
          id: 'loading',
          role: 'assistant',
          content: 'The Dungeon Master is preparing your adventure...',
          timestamp: Date.now(),
        }]);
        
        try {
          const introRes = await fetch('/api/adventure/intro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId }),
          });
          const introData = await introRes.json();
          
          if (introData.intro) {
            setMessages([{
              id: 'intro',
              role: 'assistant',
              content: introData.intro,
              timestamp: Date.now(),
            }]);
          } else {
            throw new Error('No intro generated');
          }
        } catch {
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: `Welcome to **${data.campaign.name}**!\n\n${data.campaign.description || 'Your adventure awaits...'}\n\nWhat would you like to do?`,
            timestamp: Date.now(),
          }]);
        }
      } else if (hasExistingMessages) {
        const existingMessages = JSON.parse(data.campaign.gameState.recentMessages);
        setMessages(existingMessages.map((msg: { role: string; content: string; timestamp: number }, i: number) => ({
          id: `msg-${i}`,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.timestamp,
        })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [campaignId, router]);

  useEffect(() => {
    fetchCampaign();
    fetchLoreStatus();

    let intervalId: number | undefined;

    const poll = async () => {
      const status = await fetchLoreStatus();
      if (!status) return;
      if (status.status === 'completed' || status.status === 'failed') {
        if (intervalId) {
          clearInterval(intervalId);
        }
      }
    };

    intervalId = window.setInterval(poll, 5000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchCampaign, fetchLoreStatus]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (campaign?.characters.length && !selectedCharacterId) {
      setSelectedCharacterId(campaign.characters[0].id);
    }
  }, [campaign, selectedCharacterId]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);
    setStreamingText('');
    setStreamingStatus(null);

    // Add placeholder message for streaming
    const assistantMessageId = `assistant-${Date.now()}`;
    
    if (streamingEnabled) {
      // Streaming mode
      setMessages((prev) => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }]);

      try {
        const response = await fetch('/api/adventure/action/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId,
            playerInput: userMessage.content,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error('Failed to start streaming');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedText = '';
        let newRolls: DiceRoll[] = [];
        let currentEventType: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          // Proper SSE parsing - track event type across lines
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEventType = line.slice(7).trim();
            } else if (line.startsWith('data: ') && currentEventType) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (currentEventType) {
                  case 'status':
                    setStreamingStatus(data.message);
                    break;
                  case 'dice':
                    newRolls = (data || []).map((roll: { name?: string; displayText?: string }) => ({
                      type: roll.name || 'roll',
                      notation: roll.displayText?.match(/\d+d\d+[+-]?\d*/)?.[0] || '',
                      result: parseInt(roll.displayText?.match(/= (\d+)/)?.[1] || '0'),
                      details: roll.displayText || '',
                      success: roll.displayText?.includes('SUCCESS') ? true : roll.displayText?.includes('FAIL') ? false : undefined,
                      timestamp: Date.now(),
                    }));
                    if (newRolls.length > 0) {
                      setDiceHistory(prev => [...newRolls, ...prev].slice(0, 50));
                    }
                    break;
                  case 'chunk':
                    accumulatedText += data.text;
                    setStreamingText(accumulatedText);
                    setMessages((prev) => prev.map(m =>
                      m.id === assistantMessageId
                        ? { ...m, content: accumulatedText }
                        : m
                    ));
                    break;
                  case 'complete':
                    setMessages((prev) => prev.map(m =>
                      m.id === assistantMessageId
                        ? { ...m, content: data.narrative, diceRolls: newRolls }
                        : m
                    ));
                    if (data.gameState) {
                      setCampaign((prev) => prev ? {
                        ...prev,
                        gameState: { ...prev.gameState, ...data.gameState },
                      } : prev);
                    }
                    break;
                  case 'error':
                    throw new Error(data.message);
                }
                currentEventType = null; // Reset after processing
              } catch (parseError) {
                // Ignore parse errors for incomplete data
              }
            } else if (line === '') {
              // Empty line marks end of event, reset
              currentEventType = null;
            }
          }
        }

        // Refresh campaign data
        const refreshRes = await fetch(`/api/campaign/${campaignId}`);
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setCampaign(refreshData.campaign);
        }
      } catch (err) {
        setMessages((prev) => prev.filter(m => m.id !== assistantMessageId).concat({
          id: `error-${Date.now()}`,
          role: 'system',
          content: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}`,
          timestamp: Date.now(),
        }));
      } finally {
        setSending(false);
        setStreamingStatus(null);
        setStreamingText('');
      }
    } else {
      // Non-streaming mode (original behavior)
      try {
        const res = await fetch('/api/adventure/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId,
            playerInput: userMessage.content,
          }),
        });

        const data = await res.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        const newRolls: DiceRoll[] = (data.diceRolls || []).map((roll: { name?: string; displayText?: string }) => ({
          type: roll.name || 'roll',
          notation: roll.displayText?.match(/\d+d\d+[+-]?\d*/)?.[0] || '',
          result: parseInt(roll.displayText?.match(/= (\d+)/)?.[1] || '0'),
          details: roll.displayText || '',
          success: roll.displayText?.includes('SUCCESS') ? true : roll.displayText?.includes('FAIL') ? false : undefined,
          timestamp: Date.now(),
        }));
        
        if (newRolls.length > 0) {
          setDiceHistory(prev => [...newRolls, ...prev].slice(0, 50));
        }

        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: data.narrative,
          timestamp: Date.now(),
          diceRolls: newRolls,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (data.gameState) {
          setCampaign((prev) => prev ? {
            ...prev,
            gameState: { ...prev.gameState, ...data.gameState },
          } : prev);
        }

        const refreshRes = await fetch(`/api/campaign/${campaignId}`);
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setCampaign(refreshData.campaign);
        }
      } catch (err) {
        setMessages((prev) => [...prev, {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}`,
          timestamp: Date.now(),
        }]);
      } finally {
        setSending(false);
      }
    }
  }

  const getHpPercent = (current: number, max: number) => Math.round((current / max) * 100);
  const getHpColor = (percent: number) => percent > 50 ? 'bg-green-500' : percent > 25 ? 'bg-yellow-500' : 'bg-red-500';
  const getModifier = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  if (loading) {
    return (
      <main className="h-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚔️</div>
          <div className="text-gray-400">Preparing your adventure...</div>
        </div>
      </main>
    );
  }

  if (error || !campaign) {
    return (
      <main className="h-screen flex flex-col items-center justify-center p-8 bg-[#1a1a1a]">
        <div className="text-red-400 text-xl mb-4">{error || 'Campaign not found'}</div>
        <Link href="/campaigns" className="text-amber-400 hover:text-amber-300">
          ← Back to Campaigns
        </Link>
      </main>
    );
  }

  const { gameState } = campaign;
  const selectedChar = campaign.characters.find(c => c.id === selectedCharacterId);
  const hour = gameState.gameHour;
  const timeIcon = hour >= 6 && hour < 18 ? '☀️' : '🌙';
  const timeStr = `${hour % 12 || 12}:${String(gameState.gameMinute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
  const phaseOrder = ['tensions', 'cosmology', 'factions', 'npcs', 'conflicts', 'locations', 'secrets', 'coherence'];
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
  const phaseIndex = loreStatus?.phase ? phaseOrder.indexOf(loreStatus.phase) : -1;
  const phaseText = loreStatus?.phase ? (phaseLabels[loreStatus.phase] || loreStatus.phase) : 'Queued';
  const phaseProgress = phaseIndex >= 0 ? `${phaseIndex + 1}/${phaseOrder.length}` : '—';
  const showLoreBanner = !!loreStatus && !hideLoreBanner && loreStatus.status !== 'completed' && loreStatus.status !== 'not_started';
  const loreIsFailed = loreStatus?.status === 'failed';

  return (
    <main className="h-screen flex flex-col bg-[#0d0d0d] text-gray-100 overflow-hidden">
      {/* ══════════════════════════════════════════════════════════════════════
          TOP BAR - Minimal, essential info only
          ══════════════════════════════════════════════════════════════════════ */}
      <header className="h-12 flex-shrink-0 bg-[#1a1a1a] border-b border-gray-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns" className="text-gray-500 hover:text-amber-400 transition-colors">
            ←
          </Link>
          <h1 className="font-semibold text-amber-400 truncate max-w-[200px]">{campaign.name}</h1>
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <span>{timeIcon} Day {gameState.gameDay}, {timeStr}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Mode Badge */}
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            gameState.mode === 'combat' 
              ? 'bg-red-900/50 text-red-400 border border-red-800' 
              : 'bg-green-900/30 text-green-400 border border-green-800/50'
          }`}>
            {gameState.mode === 'combat' ? '⚔️ Combat' : '🌲 Exploration'}
          </span>
          
          {/* Quick Toggles */}
          <button
            onClick={() => setRightPanel(rightPanel === 'dice' ? null : 'dice')}
            className={`p-1.5 rounded transition-colors ${rightPanel === 'dice' ? 'bg-amber-900/50 text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}
            title="Dice Log"
          >
            🎲
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'inventory' ? null : 'inventory')}
            className={`p-1.5 rounded transition-colors ${rightPanel === 'inventory' ? 'bg-amber-900/50 text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}
            title="Inventory"
          >
            🎒
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'map' ? null : 'map')}
            className={`p-1.5 rounded transition-colors ${rightPanel === 'map' ? 'bg-amber-900/50 text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}
            title="Map"
          >
            🗺️
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'spells' ? null : 'spells')}
            className={`p-1.5 rounded transition-colors ${rightPanel === 'spells' ? 'bg-amber-900/50 text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}
            title="Spells"
          >
            ✨
          </button>
          <Link 
            href={`/campaign/${campaignId}/lore`} 
            className="px-3 py-1.5 rounded border border-amber-700/40 bg-amber-900/30 text-amber-200 hover:bg-amber-900/50 transition-colors" 
            title="World Lore"
          >
            Lore
          </Link>
          <Link href={`/campaign/${campaignId}/settings`} className="p-1.5 text-gray-500 hover:text-gray-300" title="Settings">
            ⚙️
          </Link>
        </div>
      </header>

      {showLoreBanner && (
        <div
          className={`px-4 py-3 border-b ${
            loreIsFailed
              ? 'bg-red-900/30 border-red-700/60 text-red-100'
              : 'bg-amber-900/30 border-amber-700/40 text-amber-50'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-semibold">
                {loreIsFailed ? 'World lore generation failed.' : 'World lore is being generated...'}
              </p>
              <p className="text-sm opacity-80">
                {loreIsFailed
                  ? loreStatus?.error || 'Something went wrong. Please try again.'
                  : `Phase: ${phaseText} (${phaseProgress})`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/campaign/${campaignId}/lore`}
                className="px-3 py-1.5 rounded bg-amber-700 text-background-dark hover:bg-amber-600 text-sm font-semibold"
              >
                View Progress
              </Link>
              {!loreIsFailed && (
                <button
                  onClick={() => setHideLoreBanner(true)}
                  className="px-3 py-1.5 rounded border border-amber-600/50 text-amber-100 hover:bg-amber-800/40 text-sm"
                >
                  Continue to Adventure
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showLoreToast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg bg-emerald-700 text-white border border-emerald-500">
          <div className="font-semibold">World lore ready</div>
          <div className="text-sm opacity-90">Open the Lore Explorer to explore your world.</div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN AREA
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ────────────────────────────────────────────────────────────────────
            LEFT PANEL - Party Status (Always Visible)
            ──────────────────────────────────────────────────────────────────── */}
        <aside className="w-56 flex-shrink-0 bg-[#141414] border-r border-gray-800 flex flex-col overflow-hidden">
          {/* Party Header */}
          <div className="p-3 border-b border-gray-800">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Party</h2>
          </div>
          
          {/* Character Cards */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {campaign.characters.map((char) => {
              const hpPercent = getHpPercent(char.currentHp, char.maxHp);
              const isSelected = char.id === selectedCharacterId;
              const conditions = safeJsonParse<Array<{ condition: string }>>(char.conditions, []);
              
              return (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharacterId(char.id)}
                  className={`w-full text-left p-2 rounded-lg transition-all ${
                    isSelected 
                      ? 'bg-amber-900/20 border border-amber-700/50' 
                      : 'bg-[#1a1a1a] border border-transparent hover:border-gray-700'
                  }`}
                >
                  {/* Name & Level */}
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm text-gray-200 truncate">{char.name}</span>
                    <span className="text-xs text-gray-500">Lv{char.level}</span>
                  </div>
                  
                  {/* HP Bar */}
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-1">
                    <div 
                      className={`h-full ${getHpColor(hpPercent)} transition-all`}
                      style={{ width: `${hpPercent}%` }}
                    />
                  </div>
                  
                  {/* Stats Row */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{char.currentHp}/{char.maxHp}</span>
                    <span className="text-gray-700">|</span>
                    <span>AC {char.armorClass}</span>
                  </div>
                  
                  {/* Conditions */}
                  {conditions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {conditions.slice(0, 2).map((c: { condition: string }, i: number) => (
                        <span key={i} className="px-1 py-0.5 bg-red-900/30 text-red-400 text-[10px] rounded">
                          {c.condition}
                        </span>
                      ))}
                      {conditions.length > 2 && (
                        <span className="text-[10px] text-gray-600">+{conditions.length - 2}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Selected Character Details (Expandable) */}
          {selectedChar && (
            <div className="border-t border-gray-800 p-3 bg-[#111]">
              <div className="text-xs text-gray-500 mb-2">{selectedChar.race} {selectedChar.className}</div>
              
              {/* Ability Scores - Compact */}
              <div className="grid grid-cols-6 gap-1 text-center mb-2">
                {[
                  { label: 'STR', value: selectedChar.strength },
                  { label: 'DEX', value: selectedChar.dexterity },
                  { label: 'CON', value: selectedChar.constitution },
                  { label: 'INT', value: selectedChar.intelligence },
                  { label: 'WIS', value: selectedChar.wisdom },
                  { label: 'CHA', value: selectedChar.charisma },
                ].map(stat => (
                  <div key={stat.label} className="bg-[#1a1a1a] rounded p-1">
                    <div className="text-[9px] text-gray-600">{stat.label}</div>
                    <div className="text-xs font-medium text-amber-400">{getModifier(stat.value)}</div>
                  </div>
                ))}
              </div>
              
              {/* Quick Stats */}
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Speed: <span className="text-gray-300">{selectedChar.speed}ft</span></span>
                <span className="text-gray-500">Gold: <span className="text-amber-400">{selectedChar.gold}</span></span>
              </div>
              
              <Link 
                href={`/character/${selectedChar.id}`}
                className="block text-center text-xs text-amber-600 hover:text-amber-400 mt-2"
              >
                Full Sheet →
              </Link>
            </div>
          )}
        </aside>

        {/* ────────────────────────────────────────────────────────────────────
            CENTER - Chat Area
            ──────────────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'system' ? (
                  <div className="bg-red-900/20 text-red-400 text-sm px-4 py-2 rounded-lg border border-red-900/50">
                    {msg.content}
                  </div>
                ) : msg.role === 'user' ? (
                  <div className="max-w-[70%] bg-amber-900/20 border border-amber-800/30 rounded-lg p-3">
                    <p className="text-gray-200 text-sm">{msg.content}</p>
                  </div>
                ) : (
                  <div className="max-w-[85%] bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
                    <div className="prose prose-invert prose-sm max-w-none">
                      <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    </div>
                    
                    {/* Inline Dice Results - Collapsible */}
                    {msg.diceRolls && msg.diceRolls.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-800">
                        <button
                          onClick={() => setExpandedMessageId(expandedMessageId === msg.id ? null : msg.id)}
                          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-400"
                        >
                          <span>🎲 {msg.diceRolls.length} roll{msg.diceRolls.length > 1 ? 's' : ''}</span>
                          <span>{expandedMessageId === msg.id ? '▼' : '▶'}</span>
                        </button>
                        {expandedMessageId === msg.id && (
                          <div className="mt-2 space-y-1">
                            {msg.diceRolls.map((roll, i) => (
                              <div key={i} className={`text-xs px-2 py-1 rounded ${
                                roll.success === true ? 'bg-green-900/20 text-green-400' :
                                roll.success === false ? 'bg-red-900/20 text-red-400' :
                                'bg-gray-800 text-gray-400'
                              }`}>
                                {roll.details}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {sending && !streamingEnabled && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse delay-100">●</span>
                    <span className="animate-pulse delay-200">●</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 p-4 bg-[#141414] border-t border-gray-800">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mb-3">
              {gameState.mode === 'combat' ? (
                <>
                  <QuickBtn onClick={() => setInput('I attack!')} icon="⚔️">Attack</QuickBtn>
                  <QuickBtn onClick={() => setInput('I cast a spell')} icon="✨">Cast</QuickBtn>
                  <QuickBtn onClick={() => setInput('I dodge')} icon="🛡️">Dodge</QuickBtn>
                  <QuickBtn onClick={() => setInput('I disengage and move')} icon="↩️">Disengage</QuickBtn>
                  <QuickBtn onClick={() => setInput('I dash')} icon="🏃">Dash</QuickBtn>
                </>
              ) : (
                <>
                  <QuickBtn onClick={() => setInput('I look around')} icon="👀">Look</QuickBtn>
                  <QuickBtn onClick={() => setInput('I search the area')} icon="🔍">Search</QuickBtn>
                  <QuickBtn onClick={() => setInput('I move forward cautiously')} icon="🚶">Move</QuickBtn>
                  <QuickBtn onClick={() => setInput('I want to talk')} icon="💬">Talk</QuickBtn>
                  <QuickBtn onClick={() => setInput('I take a short rest')} icon="⏸️">Rest</QuickBtn>
                </>
              )}
            </div>
            
            {/* Input Form */}
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What do you do?"
                disabled={sending}
                className="flex-1 px-4 py-2.5 bg-[#0d0d0d] border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-700 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setStreamingEnabled(!streamingEnabled)}
                className={`px-3 py-2.5 rounded-lg transition-colors ${
                  streamingEnabled 
                    ? 'bg-green-900/30 text-green-400 border border-green-800/50' 
                    : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
                title={streamingEnabled ? 'Streaming enabled (click to disable)' : 'Streaming disabled (click to enable)'}
              >
                ⚡
              </button>
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="px-5 py-2.5 bg-amber-700 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
            {/* Streaming Status */}
            {streamingStatus && (
              <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                <span className="animate-pulse">●</span>
                {streamingStatus}
              </div>
            )}
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────────
            RIGHT PANEL - Togglable (Dice Log / Inventory)
            ──────────────────────────────────────────────────────────────────── */}
        {rightPanel && (
          <aside className="w-64 flex-shrink-0 bg-[#141414] border-l border-gray-800 flex flex-col overflow-hidden">
            {rightPanel === 'dice' && (
              <>
                <div className="p-3 border-b border-gray-800 flex justify-between items-center">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase">Dice Log</h3>
                  <button onClick={() => setDiceHistory([])} className="text-xs text-gray-600 hover:text-gray-400">Clear</button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {diceHistory.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-4">No rolls yet</p>
                  ) : (
                    diceHistory.map((roll, i) => (
                      <div key={i} className={`p-2 rounded text-xs ${
                        roll.success === true ? 'bg-green-900/20 text-green-400 border border-green-900/30' :
                        roll.success === false ? 'bg-red-900/20 text-red-400 border border-red-900/30' :
                        'bg-[#1a1a1a] text-gray-400 border border-gray-800'
                      }`}>
                        <div>{roll.details}</div>
                        <div className="text-[10px] text-gray-600 mt-1">
                          {new Date(roll.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
            
            {rightPanel === 'inventory' && selectedChar && (
              <>
                <div className="p-3 border-b border-gray-800">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase">{selectedChar.name}&apos;s Inventory</h3>
                </div>
                
                {/* Equipped Items */}
                <div className="p-3 border-b border-gray-800 bg-slate-900/50">
                  <div className="text-xs text-gray-500 mb-2">Equipped</div>
                  {(() => {
                    const equipped = safeJsonParse<Record<string, string>>(selectedChar.equippedItems, {});
                    const slots = [
                      { key: 'mainHand', label: 'Main Hand', icon: '⚔️' },
                      { key: 'offHand', label: 'Off Hand', icon: '🛡️' },
                      { key: 'armor', label: 'Armor', icon: '🥋' },
                      { key: 'shield', label: 'Shield', icon: '🛡️' },
                    ];
                    const hasEquipped = slots.some(s => equipped[s.key]);
                    
                    if (!hasEquipped) {
                      return <p className="text-gray-600 text-xs">Nothing equipped</p>;
                    }
                    
                    return (
                      <div className="space-y-1">
                        {slots.map(slot => equipped[slot.key] && (
                          <div key={slot.key} className="flex items-center gap-2 text-xs">
                            <span>{slot.icon}</span>
                            <span className="text-gray-500">{slot.label}:</span>
                            <span className="text-green-400">{equipped[slot.key]}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                
                {/* Gold */}
                <div className="p-3 border-b border-gray-800 bg-amber-900/10">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-lg">💰</span>
                    <span className="text-amber-400 font-bold text-lg">{selectedChar.gold}</span>
                    <span className="text-amber-600 text-sm">gold</span>
                  </div>
                </div>
                
                {/* Items */}
                <div className="flex-1 overflow-y-auto p-2">
                  {(() => {
                    const inventory = safeJsonParse<Array<{ name: string; quantity: number }>>(selectedChar.inventory, []);
                    if (inventory.length === 0) {
                      return <p className="text-gray-600 text-sm text-center py-4">No items</p>;
                    }
                    return (
                      <div className="space-y-1">
                        {inventory.map((item: { name: string; quantity: number }, i: number) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-[#1a1a1a] rounded border border-gray-800">
                            <span className="text-gray-300 text-sm">{item.name}</span>
                            {item.quantity > 1 && (
                              <span className="text-gray-500 text-xs">×{item.quantity}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            {rightPanel === 'map' && (
              <>
                <div className="p-3 border-b border-gray-800">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase">Map</h3>
                </div>
                <div className="flex-1 overflow-auto p-2">
                  {gameState.activeMap ? (
                    (() => {
                      try {
                        const mapData = JSON.parse(gameState.activeMap) as GameMap;
                        return (
                          <MiniMap
                            map={mapData}
                            selectedEntityId={selectedCharacterId || undefined}
                            onEntityClick={(entity: MapEntity) => {
                              if (entity.entityType === 'player') {
                                const char = campaign.characters.find(c => c.name === entity.name);
                                if (char) setSelectedCharacterId(char.id);
                              }
                            }}
                            onTileClick={(pos: GridPosition) => {
                              console.log('Tile clicked:', pos);
                            }}
                            cellSize={20}
                            showGrid={true}
                          />
                        );
                      } catch {
                        return <p className="text-gray-600 text-sm text-center py-4">Invalid map data</p>;
                      }
                    })()
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">🗺️</div>
                      <p className="text-gray-500 text-sm">No map active</p>
                      <p className="text-gray-600 text-xs mt-2">
                        Maps are created during combat<br />or exploration encounters
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {rightPanel === 'spells' && selectedChar && (
              <>
                <div className="p-3 border-b border-gray-800">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase">{selectedChar.name}&apos;s Spells</h3>
                </div>
                
                {/* Spell Slots */}
                <div className="p-3 border-b border-gray-800">
                  <div className="text-xs text-gray-500 mb-2">Spell Slots</div>
                  {(() => {
                    const slots = safeJsonParse<Record<number, { current: number; max: number }>>(selectedChar.spellSlots, {});
                    const slotLevels = Object.keys(slots).map(Number).sort((a, b) => a - b);
                    
                    if (slotLevels.length === 0) {
                      return <p className="text-gray-600 text-xs">No spell slots</p>;
                    }
                    
                    return (
                      <div className="space-y-2">
                        {slotLevels.map(level => {
                          const slot = slots[level];
                          return (
                            <div key={level} className="flex items-center justify-between">
                              <span className="text-gray-400 text-xs">Level {level}</span>
                              <div className="flex gap-1">
                                {Array.from({ length: slot.max }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-3 h-3 rounded-full border ${
                                      i < slot.current
                                        ? 'bg-purple-500 border-purple-400'
                                        : 'bg-gray-800 border-gray-700'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
                
                {/* Known/Prepared Spells */}
                <div className="flex-1 overflow-y-auto p-2">
                  {(() => {
                    const knownSpells = safeJsonParse<string[]>(selectedChar.knownSpells, []);
                    const preparedSpells = safeJsonParse<string[]>(selectedChar.preparedSpells, []);
                    const allSpells = Array.from(new Set([...preparedSpells, ...knownSpells]));
                    
                    if (allSpells.length === 0) {
                      return (
                        <div className="text-center py-4">
                          <p className="text-gray-600 text-sm">No spells known</p>
                          <p className="text-gray-700 text-xs mt-1">
                            Spellcasters learn spells<br />during character creation
                          </p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-1">
                        {allSpells.map((spell, i) => {
                          const isPrepared = preparedSpells.includes(spell);
                          return (
                            <button
                              key={i}
                              onClick={() => setInput(`I cast ${spell}`)}
                              className={`w-full text-left p-2 rounded text-sm transition-colors ${
                                isPrepared
                                  ? 'bg-purple-900/20 border border-purple-800/50 text-purple-300 hover:bg-purple-900/30'
                                  : 'bg-[#1a1a1a] border border-gray-800 text-gray-400 hover:border-gray-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{spell}</span>
                                {isPrepared && <span className="text-[10px] text-purple-500">PREPARED</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </aside>
        )}
      </div>
    </main>
  );
}

function QuickBtn({ children, onClick, icon }: { children: React.ReactNode; onClick: () => void; icon: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 bg-[#1a1a1a] border border-gray-700 text-gray-400 text-xs rounded hover:border-gray-600 hover:text-gray-300 transition-colors"
    >
      <span>{icon}</span>
      <span>{children}</span>
    </button>
  );
}
