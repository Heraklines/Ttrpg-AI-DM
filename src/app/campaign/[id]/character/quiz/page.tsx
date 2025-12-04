'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { QuizQuestion, BigFiveScores } from '@/lib/quiz/types';

type QuizState = 'loading' | 'welcome' | 'quiz' | 'completing' | 'result' | 'locked' | 'error';

// Debug log interface
interface DebugLog {
    timestamp: string;
    type: 'info' | 'error' | 'api' | 'state';
    message: string;
    data?: unknown;
}

interface QuizResult {
    id: string;
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
    alignment: string;
    suggestedRace: string;
    suggestedClass: string;
    suggestedBackground: string;
    suggestedAbilities: Record<string, number>;
    backstory?: string;
    personalityTraits?: string[];
    ideal?: string;
    bond?: string;
    flaw?: string;
    originHook?: string;
    shareToken: string;
}

interface Recommendation {
    alignment: string;
    race: string;
    raceReasoning: string;
    class: string;
    classConfidences: Array<{ className: string; confidence: number; reasoning: string }>;
    background: string;
    backgroundReasoning: string;
    suggestedAbilities: Record<string, number>;
    abilityReasoning: string;
}

export default function SoulMirrorQuiz() {
    const params = useParams();
    const router = useRouter();
    const campaignId = params.id as string;

    const [state, setState] = useState<QuizState>('loading');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(15);
    const [retakeNumber, setRetakeNumber] = useState(1);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<QuizResult | null>(null);
    const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showReveal, setShowReveal] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
    const [runningScores, setRunningScores] = useState<{ O: number; C: number; E: number; A: number; N: number } | null>(null);
    const [showNameModal, setShowNameModal] = useState(false);
    const [characterName, setCharacterName] = useState('');
    const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);

    // Debug logger
    const addLog = useCallback((type: DebugLog['type'], message: string, data?: unknown) => {
        const log: DebugLog = {
            timestamp: new Date().toISOString().split('T')[1].slice(0, 12),
            type,
            message,
            data,
        };
        console.log(`[${log.type.toUpperCase()}] ${log.message}`, data || '');
        setDebugLogs(prev => [...prev.slice(-50), log]);
    }, []);

    // Check for existing session or locked state
    useEffect(() => {
        checkQuizStatus();
    }, [campaignId]);

    const checkQuizStatus = async () => {
        try {
            // For now, just go to welcome state
            // In future, could check for existing in-progress session
            setState('welcome');
        } catch (err) {
            setError('Failed to check quiz status');
            setState('error');
        }
    };

    const startQuiz = async () => {
        addLog('state', 'Starting quiz...', { campaignId });
        setState('loading');
        try {
            addLog('api', 'POST /api/quiz/start');
            const res = await fetch('/api/quiz/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campaignId }),
            });

            const data = await res.json();
            addLog('api', `Response: ${res.status}`, data);

            if (!res.ok) {
                if (data.error?.code === 'RETAKE_LIMIT_REACHED') {
                    addLog('state', 'Retake limit reached');
                    setState('locked');
                    return;
                }
                throw new Error(data.error?.message || 'Failed to start quiz');
            }

            setSessionId(data.session.id);
            setCurrentQuestion(data.currentQuestion);
            setCurrentIndex(data.session.currentIndex);
            setTotalQuestions(data.session.totalQuestions);
            setRetakeNumber(data.retakeNumber);
            addLog('state', 'Quiz started', { sessionId: data.session.id, resumed: data.resumed });
            setState('quiz');
        } catch (err) {
            addLog('error', 'Failed to start quiz', err);
            setError(err instanceof Error ? err.message : 'Failed to start quiz');
            setState('error');
        }
    };

    const submitAnswer = async (answerIndex: number) => {
        if (!sessionId || isSubmitting) return;

        addLog('info', `Submitting answer ${answerIndex} for question ${currentIndex + 1}`);
        setSelectedAnswer(answerIndex);
        setIsSubmitting(true);

        try {
            addLog('api', `POST /api/quiz/${sessionId}`, { answerIndex });
            const res = await fetch(`/api/quiz/${sessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answerIndex }),
            });

            const data = await res.json();
            addLog('api', `Response: ${res.status}`, data);

            if (!res.ok) {
                throw new Error(data.error?.message || 'Failed to submit answer');
            }

            // Update running scores for debug
            if (data.scores) {
                setRunningScores(data.scores);
                addLog('info', 'Scores updated', data.scores);
            }

            // Animate transition
            await new Promise(resolve => setTimeout(resolve, 500));

            if (data.isComplete) {
                addLog('state', 'Quiz complete! Moving to completion phase...');
                setState('completing');
                await completeQuiz();
            } else {
                addLog('info', `Moving to question ${data.currentIndex + 1}`);
                setCurrentQuestion(data.nextQuestion);
                setCurrentIndex(data.currentIndex);
                setSelectedAnswer(null);
            }
        } catch (err) {
            addLog('error', 'Failed to submit answer', err);
            setError(err instanceof Error ? err.message : 'Failed to submit answer');
            setState('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const completeQuiz = async () => {
        if (!sessionId) {
            addLog('error', 'No sessionId for completeQuiz!');
            return;
        }

        addLog('api', `POST /api/quiz/${sessionId}/complete`);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                addLog('error', 'Request timeout after 90s');
                controller.abort();
            }, 90000); // 90 second timeout for AI backstory generation

            const res = await fetch(`/api/quiz/${sessionId}/complete`, {
                method: 'POST',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            addLog('api', `Complete response status: ${res.status}`);
            
            const data = await res.json();
            addLog('api', 'Complete response data', data);

            if (!res.ok) {
                throw new Error(data.error?.message || 'Failed to complete quiz');
            }

            addLog('info', 'Setting result and recommendation');
            setResult(data.result);
            setRecommendation(data.recommendation);

            // Start reveal animation
            addLog('state', 'Starting reveal animation');
            setShowReveal(true);
            await new Promise(resolve => setTimeout(resolve, 2000));
            setShowReveal(false); // Clear reveal so result screen shows
            addLog('state', 'Showing result screen');
            setState('result');
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                addLog('error', 'Request was aborted (timeout)');
                setError('Request timed out. Please try again.');
            } else {
                addLog('error', 'Failed to complete quiz', err);
                setError(err instanceof Error ? err.message : 'Failed to complete quiz');
            }
            setState('error');
        }
    };

    const proceedToCharacterCreation = () => {
        setShowNameModal(true);
    };

    const createCharacter = async () => {
        if (!sessionId || !characterName.trim()) return;
        
        setIsCreatingCharacter(true);
        addLog('api', `Creating character: ${characterName}`);
        
        try {
            const res = await fetch(`/api/quiz/${sessionId}/create-character`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: characterName.trim() }),
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error?.message || 'Failed to create character');
            }
            
            addLog('info', `Character created! ID: ${data.character.id}`);
            
            // Redirect to campaign setup with the new character
            router.push(data.redirectUrl);
        } catch (err) {
            addLog('error', 'Failed to create character', err);
            setError(err instanceof Error ? err.message : 'Failed to create character');
            setIsCreatingCharacter(false);
        }
    };

    // Progress runes (visual indicator)
    const renderProgressRunes = () => {
        const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛈ', 'ᛇ', 'ᛉ'];
        return (
            <div className="flex justify-center gap-2 my-6">
                {runes.slice(0, totalQuestions).map((rune, i) => (
                    <span
                        key={i}
                        className={`text-2xl transition-all duration-500 ${i < currentIndex
                                ? 'text-primary drop-shadow-[0_0_10px_rgba(196,163,90,0.8)]'
                                : i === currentIndex
                                    ? 'text-primary/80 animate-pulse'
                                    : 'text-parchment/20'
                            }`}
                    >
                        {rune}
                    </span>
                ))}
            </div>
        );
    };

    // Debug toggle button (always visible)
    const DebugToggle = () => (
        <button
            onClick={() => setShowDebug(!showDebug)}
            className="fixed bottom-4 right-4 z-50 w-10 h-10 bg-black/80 text-green-400 rounded-full border border-green-500/50 hover:bg-green-900/50 flex items-center justify-center text-lg"
            title="Toggle Debug Panel"
        >
            🔧
        </button>
    );

    // Debug panel component
    const DebugPanel = () => {
        if (!showDebug) return null;
        return (
            <div className="fixed bottom-0 right-0 w-[500px] max-h-[500px] bg-black/95 text-green-400 font-mono text-xs p-4 overflow-auto z-50 border-l border-t border-green-500/30">
                <div className="flex justify-between items-center mb-2 border-b border-green-500/30 pb-2">
                    <span className="text-green-300 font-bold">🔧 Debug Panel</span>
                    <button onClick={() => setShowDebug(false)} className="text-red-400 hover:text-red-300">✕</button>
                </div>
                <div className="space-y-1 mb-3">
                    <div><span className="text-yellow-400">State:</span> {state} | <span className="text-yellow-400">showReveal:</span> {String(showReveal)}</div>
                    <div><span className="text-yellow-400">SessionId:</span> {sessionId || 'null'}</div>
                    <div><span className="text-yellow-400">Question:</span> {currentIndex + 1}/{totalQuestions}</div>
                    <div><span className="text-yellow-400">result:</span> {result ? 'SET' : 'null'} | <span className="text-yellow-400">recommendation:</span> {recommendation ? 'SET' : 'null'}</div>
                    {runningScores && (
                        <div className="grid grid-cols-5 gap-1 mt-1">
                            <span>O:{runningScores.O}</span>
                            <span>C:{runningScores.C}</span>
                            <span>E:{runningScores.E}</span>
                            <span>A:{runningScores.A}</span>
                            <span>N:{runningScores.N}</span>
                        </div>
                    )}
                </div>
                {result && (
                    <div className="border-t border-green-500/30 pt-2 mb-2">
                        <div className="text-cyan-300 mb-1">Result Data:</div>
                        <div className="text-cyan-400 whitespace-pre-wrap break-all max-h-24 overflow-auto bg-black/50 p-1 rounded">
                            {JSON.stringify(result, null, 2)}
                        </div>
                    </div>
                )}
                {recommendation && (
                    <div className="border-t border-green-500/30 pt-2 mb-2">
                        <div className="text-purple-300 mb-1">Recommendation Data:</div>
                        <div className="text-purple-400 whitespace-pre-wrap break-all max-h-24 overflow-auto bg-black/50 p-1 rounded">
                            {JSON.stringify(recommendation, null, 2)}
                        </div>
                    </div>
                )}
                <div className="border-t border-green-500/30 pt-2">
                    <div className="text-green-300 mb-1">Logs ({debugLogs.length}):</div>
                    <div className="space-y-0.5 max-h-32 overflow-auto">
                        {debugLogs.slice(-20).map((log, i) => (
                            <div key={i} className={`${
                                log.type === 'error' ? 'text-red-400' :
                                log.type === 'api' ? 'text-blue-400' :
                                log.type === 'state' ? 'text-yellow-400' : 'text-green-400'
                            }`}>
                                <span className="text-gray-500">{log.timestamp}</span> {log.message}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // Welcome screen
    if (state === 'welcome') {
        return (
            <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background via-surface to-background">
                <div className="max-w-lg w-full text-center">
                    {/* Mystical mirror visual */}
                    <div className="relative mx-auto w-64 h-80 mb-8">
                        {/* Outer glow */}
                        <div className="absolute inset-0 rounded-[50%] bg-gradient-to-b from-primary/20 via-tertiary/10 to-transparent blur-xl animate-pulse" />

                        {/* Mirror frame */}
                        <div className="absolute inset-4 rounded-[45%] border-4 border-primary/60 bg-gradient-to-b from-surface via-background to-surface shadow-2xl">
                            {/* Mirror surface */}
                            <div className="absolute inset-4 rounded-[40%] bg-gradient-to-br from-tertiary/20 via-background to-secondary/10 overflow-hidden">
                                {/* Mystical swirls */}
                                <div className="absolute inset-0 opacity-50">
                                    <div className="absolute w-full h-full animate-spin-slow">
                                        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full bg-gradient-to-r from-primary/30 to-transparent blur-lg" />
                                    </div>
                                </div>
                                {/* Stars/particles */}
                                {[...Array(12)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute w-1 h-1 bg-primary rounded-full animate-pulse"
                                        style={{
                                            top: `${20 + Math.random() * 60}%`,
                                            left: `${20 + Math.random() * 60}%`,
                                            animationDelay: `${i * 0.2}s`,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Corner ornaments */}
                        <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-primary/60 rounded-tl-lg" />
                        <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-primary/60 rounded-tr-lg" />
                        <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-primary/60 rounded-bl-lg" />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-primary/60 rounded-br-lg" />
                    </div>

                    <h1 className="text-4xl font-medieval text-primary mb-4 drop-shadow-lg">
                        The Soul Mirror
                    </h1>

                    <p className="text-parchment/80 mb-2 text-lg">
                        Gaze into the depths and discover your true nature...
                    </p>

                    <p className="text-parchment/50 mb-8 text-sm">
                        Answer 15 questions to reveal your destined character
                    </p>

                    <button
                        onClick={startQuiz}
                        className="px-8 py-4 bg-gradient-to-r from-primary via-primary-light to-primary text-background font-medieval text-xl rounded-lg shadow-lg hover:shadow-primary/30 hover:scale-105 transition-all duration-300"
                    >
                        ✨ Begin the Vision
                    </button>

                    <p className="text-parchment/40 mt-6 text-sm">
                        Attempt {retakeNumber} of 3
                    </p>

                    <Link
                        href={`/campaign/${campaignId}/character/new`}
                        className="block mt-4 text-primary/60 hover:text-primary transition-colors"
                    >
                        or create character manually →
                    </Link>
                </div>
            </main>
        );
    }

    // Quiz in progress
    if (state === 'quiz' && currentQuestion) {
        return (
            <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background via-surface to-background">
                <DebugToggle />
                <DebugPanel />
                <div className="max-w-2xl w-full">
                    {/* Progress indicator */}
                    {renderProgressRunes()}

                    {/* Question card */}
                    <div className="relative bg-surface rounded-xl border border-primary/30 p-8 shadow-2xl">
                        {/* Decorative corners */}
                        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-primary/40 rounded-tl-xl" />
                        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-primary/40 rounded-tr-xl" />
                        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-primary/40 rounded-bl-xl" />
                        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-primary/40 rounded-br-xl" />

                        {/* Question number */}
                        <div className="text-center mb-6">
                            <span className="text-primary/60 text-sm uppercase tracking-widest">
                                Vision {currentIndex + 1} of {totalQuestions}
                            </span>
                        </div>

                        {/* Question text */}
                        <p className="text-xl text-parchment text-center mb-8 leading-relaxed">
                            {currentQuestion.text}
                        </p>

                        {/* Answer options */}
                        <div className="space-y-4">
                            {currentQuestion.answers.map((answer, index) => (
                                <button
                                    key={index}
                                    onClick={() => submitAnswer(index)}
                                    disabled={isSubmitting}
                                    className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-300 ${selectedAnswer === index
                                            ? 'border-primary bg-primary/20 text-parchment scale-[0.98]'
                                            : 'border-primary/20 bg-background/50 text-parchment/80 hover:border-primary/50 hover:bg-primary/10'
                                        } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-full border-2 border-primary/40 flex items-center justify-center text-primary font-medieval">
                                            {['I', 'II', 'III', 'IV'][index]}
                                        </span>
                                        <span>{answer.text}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Back link */}
                    <div className="text-center mt-6">
                        <Link href={`/campaign/${campaignId}`} className="text-parchment/40 hover:text-parchment/60 text-sm">
                            ← Exit quiz (progress will be saved)
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // Completing/reveal animation
    if (state === 'completing' || showReveal) {
        return (
            <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background via-surface to-background">
                <DebugToggle />
                <DebugPanel />
                <div className="text-center">
                    {/* Animating mirror */}
                    <div className="relative mx-auto w-48 h-48 mb-8">
                        <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl animate-pulse" />
                        <div className="absolute inset-4 rounded-full border-4 border-primary bg-gradient-to-br from-tertiary/30 via-background to-secondary/20 flex items-center justify-center">
                            <div className="text-6xl animate-spin-slow">🔮</div>
                        </div>
                    </div>

                    <h2 className="text-2xl font-medieval text-primary mb-4 animate-pulse">
                        The mirror reveals your destiny...
                    </h2>

                    <p className="text-parchment/60">Your true nature emerges from the mist</p>
                    
                    {/* Debug info during completion */}
                    <p className="text-parchment/30 text-xs mt-8">State: {state} | Session: {sessionId?.slice(0, 8)}...</p>
                </div>
            </main>
        );
    }

    // Result screen
    if (state === 'result' && result && recommendation) {
        return (
            <main className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-background via-surface to-background">
                <DebugToggle />
                <DebugPanel />
                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-medieval text-primary mb-2 drop-shadow-lg">
                            Your Soul Revealed
                        </h1>
                        <p className="text-parchment/60">The mirror has spoken</p>
                    </div>

                    {/* Main result card */}
                    <div className="relative bg-surface rounded-xl border-2 border-primary/40 p-8 shadow-2xl mb-8">
                        {/* Decorative elements */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-surface border border-primary/40 rounded-full">
                            <span className="text-primary font-medieval">{result.alignment}</span>
                        </div>

                        {/* Character preview */}
                        <div className="text-center mt-4 mb-8">
                            <h2 className="text-5xl font-medieval text-primary mb-2">
                                {result.suggestedRace} {result.suggestedClass}
                            </h2>
                            <p className="text-xl text-parchment/70">{result.suggestedBackground}</p>
                        </div>

                        {/* Reasoning sections */}
                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-background/50 rounded-lg p-4">
                                <h3 className="text-primary font-semibold mb-2">Your Path</h3>
                                <p className="text-parchment/80 text-sm">{recommendation.classConfidences[0].reasoning}</p>
                            </div>
                            <div className="bg-background/50 rounded-lg p-4">
                                <h3 className="text-primary font-semibold mb-2">Your Heritage</h3>
                                <p className="text-parchment/80 text-sm">{recommendation.raceReasoning}</p>
                            </div>
                        </div>

                        {/* Backstory Section */}
                        {result.backstory && (
                            <div className="mb-8">
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 px-3 py-1 bg-surface border border-secondary/40 rounded-full z-10">
                                        <span className="text-secondary font-medieval text-sm">📜 Your Story</span>
                                    </div>
                                    <div className="bg-gradient-to-br from-background/80 via-surface/50 to-background/80 rounded-lg border border-secondary/30 p-6 pt-8">
                                        <div className="scroll-container-md prose prose-invert prose-sm max-w-none pr-2">
                                            {result.backstory.split('\n\n').map((paragraph, i) => (
                                                <p key={i} className="text-parchment/85 leading-relaxed mb-4 last:mb-0">
                                                    {paragraph}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Character Traits (Ideal, Bond, Flaw) */}
                        {(result.ideal || result.bond || result.flaw) && (
                            <div className="grid md:grid-cols-3 gap-4 mb-8">
                                {result.ideal && (
                                    <div className="bg-forest/10 border border-forest/30 rounded-lg p-4">
                                        <h4 className="text-forest font-semibold text-sm mb-2 flex items-center gap-2">
                                            <span>⚖️</span> Ideal
                                        </h4>
                                        <p className="text-parchment/80 text-sm italic">&quot;{result.ideal}&quot;</p>
                                    </div>
                                )}
                                {result.bond && (
                                    <div className="bg-tertiary/10 border border-tertiary/30 rounded-lg p-4">
                                        <h4 className="text-tertiary font-semibold text-sm mb-2 flex items-center gap-2">
                                            <span>🔗</span> Bond
                                        </h4>
                                        <p className="text-parchment/80 text-sm italic">&quot;{result.bond}&quot;</p>
                                    </div>
                                )}
                                {result.flaw && (
                                    <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4">
                                        <h4 className="text-secondary font-semibold text-sm mb-2 flex items-center gap-2">
                                            <span>💔</span> Flaw
                                        </h4>
                                        <p className="text-parchment/80 text-sm italic">&quot;{result.flaw}&quot;</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Personality Traits */}
                        {result.personalityTraits && result.personalityTraits.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-center text-primary font-semibold mb-3">Personality Traits</h3>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {result.personalityTraits.map((trait, i) => (
                                        <span 
                                            key={i}
                                            className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-full text-parchment/80 text-sm"
                                        >
                                            {trait}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Big Five scores visualization */}
                        <div className="mb-8">
                            <h3 className="text-center text-primary font-semibold mb-4">Soul Aspects</h3>
                            <div className="grid grid-cols-5 gap-2">
                                {[
                                    { key: 'O', label: 'Openness', value: result.openness },
                                    { key: 'C', label: 'Discipline', value: result.conscientiousness },
                                    { key: 'E', label: 'Energy', value: result.extraversion },
                                    { key: 'A', label: 'Empathy', value: result.agreeableness },
                                    { key: 'N', label: 'Intensity', value: result.neuroticism },
                                ].map(({ key, label, value }) => (
                                    <div key={key} className="text-center">
                                        <div className="relative h-24 bg-background/50 rounded-lg overflow-hidden mx-auto w-full">
                                            <div
                                                className="absolute bottom-0 w-full bg-gradient-to-t from-primary via-primary-light to-primary/50 transition-all duration-1000"
                                                style={{ height: `${value}%` }}
                                            />
                                            <span className="absolute inset-0 flex items-center justify-center text-parchment font-bold text-lg">
                                                {value}
                                            </span>
                                        </div>
                                        <span className="text-xs text-parchment/60 mt-1 block">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Suggested abilities */}
                        <div className="mb-6">
                            <h3 className="text-center text-primary font-semibold mb-3">Suggested Abilities</h3>
                            <div className="grid grid-cols-6 gap-2">
                                {Object.entries(result.suggestedAbilities).map(([ability, value]) => (
                                    <div key={ability} className="text-center bg-background/50 rounded-lg p-2">
                                        <div className="text-xs text-parchment/60 uppercase">{ability.slice(0, 3)}</div>
                                        <div className="text-xl font-bold text-parchment">{value}</div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-center text-parchment/50 text-xs mt-2">{recommendation.abilityReasoning}</p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={proceedToCharacterCreation}
                            className="px-8 py-4 bg-gradient-to-r from-forest via-forest to-forest/80 text-parchment font-medieval text-xl rounded-lg shadow-lg hover:shadow-forest/30 hover:scale-105 transition-all duration-300"
                        >
                            ✨ Create This Character
                        </button>

                        <Link
                            href={`/campaign/${campaignId}/character/new`}
                            className="px-8 py-4 border-2 border-primary/40 text-primary font-medieval text-xl rounded-lg hover:bg-primary/10 transition-all duration-300 text-center"
                        >
                            Customize Manually
                        </Link>
                    </div>

                    {/* Share section */}
                    <div className="text-center mt-8">
                        <p className="text-parchment/40 text-sm mb-2">Share your result</p>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(
                                    `I am a ${result.alignment} ${result.suggestedRace} ${result.suggestedClass}! Discover your D&D destiny with the Soul Mirror.`
                                );
                            }}
                            className="text-primary/60 hover:text-primary transition-colors text-sm"
                        >
                            📋 Copy to clipboard
                        </button>
                    </div>
                </div>

                {/* Name Modal */}
                {showNameModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-surface border-2 border-primary/40 rounded-xl p-8 max-w-md w-full shadow-2xl">
                            <h2 className="text-2xl font-medieval text-primary mb-4 text-center">
                                Name Your Character
                            </h2>
                            <p className="text-parchment/70 text-center mb-6">
                                What shall this {result.suggestedRace} {result.suggestedClass} be called?
                            </p>
                            
                            <input
                                type="text"
                                value={characterName}
                                onChange={(e) => setCharacterName(e.target.value)}
                                placeholder="Enter a name..."
                                className="w-full px-4 py-3 bg-background border-2 border-primary/30 rounded-lg text-parchment text-center text-xl font-medieval focus:border-primary focus:outline-none mb-6"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && characterName.trim()) {
                                        createCharacter();
                                    }
                                }}
                            />
                            
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowNameModal(false)}
                                    disabled={isCreatingCharacter}
                                    className="flex-1 px-6 py-3 border-2 border-parchment/30 text-parchment/70 rounded-lg hover:bg-parchment/10 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createCharacter}
                                    disabled={!characterName.trim() || isCreatingCharacter}
                                    className="flex-1 px-6 py-3 bg-forest text-parchment font-semibold rounded-lg hover:bg-forest/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCreatingCharacter ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="animate-spin">⏳</span> Creating...
                                        </span>
                                    ) : (
                                        '✨ Create Character'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        );
    }

    // Locked state (retake limit reached)
    if (state === 'locked') {
        return (
            <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background via-surface to-background">
                <div className="max-w-lg w-full text-center">
                    <div className="text-8xl mb-6 opacity-40">🔒</div>

                    <h1 className="text-3xl font-medieval text-parchment/60 mb-4">
                        The Mirror Grows Dim...
                    </h1>

                    <p className="text-parchment/50 mb-8">
                        You have gazed into the Soul Mirror 3 times for this campaign.
                        Its power needs time to recover.
                    </p>

                    <Link
                        href={`/campaign/${campaignId}/character/new`}
                        className="inline-block px-8 py-4 bg-primary/20 text-primary font-medieval text-xl rounded-lg hover:bg-primary/30 transition-all duration-300"
                    >
                        Create Character Manually
                    </Link>

                    <p className="text-parchment/30 mt-8 text-sm">
                        ✨ Premium unlock coming soon
                    </p>
                </div>
            </main>
        );
    }

    // Loading state
    if (state === 'loading') {
        return (
            <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background via-surface to-background">
                <div className="text-center">
                    <div className="text-6xl animate-pulse mb-4">🔮</div>
                    <p className="text-parchment/60">The mirror awakens...</p>
                </div>
            </main>
        );
    }

    // Error state
    if (state === 'error') {
        return (
            <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background via-surface to-background">
                <div className="max-w-lg w-full text-center">
                    <div className="text-6xl mb-6">⚠️</div>

                    <h1 className="text-2xl font-medieval text-ember mb-4">
                        The Mirror Is Clouded
                    </h1>

                    <p className="text-parchment/60 mb-8">
                        {error || 'An unexpected error occurred'}
                    </p>

                    <button
                        onClick={() => {
                            setError(null);
                            setState('welcome');
                        }}
                        className="px-6 py-3 bg-primary text-background font-semibold rounded-lg hover:bg-primary-light transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </main>
        );
    }

    // Fallback
    return null;
}
