'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

// Reusable star component
function Star({ 
    size = 'md', 
    top, 
    left, 
    delay = 0 
}: { 
    size?: 'sm' | 'md' | 'lg'; 
    top: string; 
    left: string; 
    delay?: number;
}) {
    const sizeClasses = {
        sm: 'w-1 h-1',
        md: 'w-1.5 h-1.5',
        lg: 'w-2 h-2'
    };
    
    return (
        <div 
            className={`absolute ${sizeClasses[size]} bg-gold-light rounded-full shadow-gold-glow-sm`}
            style={{ 
                top, 
                left,
                animationDelay: `${delay}s`,
            }}
        >
            <div className={`w-full h-full animate-twinkle`} style={{ animationDelay: `${delay}s` }} />
        </div>
    );
}

// Shooting star component - actual streak across the sky
function ShootingStar({ 
    id,
    startTop, 
    startLeft,
    onComplete 
}: { 
    id: number;
    startTop: number; 
    startLeft: number;
    onComplete: (id: number) => void;
}) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete(id);
        }, 1000);
        return () => clearTimeout(timer);
    }, [id, onComplete]);

    return (
        <div 
            className="absolute pointer-events-none"
            style={{ 
                top: `${startTop}%`, 
                left: `${startLeft}%`,
                animation: 'shootingStar 1s ease-out forwards',
            }}
        >
            {/* Single trail element with bright tip at the end */}
            <div
                style={{
                    width: '45px',
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(250, 221, 146, 0.2) 30%, rgba(255, 255, 255, 0.8) 90%, #fff 100%)',
                    borderRadius: '1px',
                }}
            />
        </div>
    );
}

// Ghost ship component - dark silhouette of a dilapidated ship on the horizon
function GhostShip({ 
    id,
    startFromRight,
    onComplete 
}: { 
    id: number;
    startFromRight: boolean;
    onComplete: (id: number) => void;
}) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete(id);
        }, 50000); // 50 second animation
        return () => clearTimeout(timer);
    }, [id, onComplete]);

    return (
        <div 
            className="absolute"
            style={{ 
                bottom: '12%',
                animation: startFromRight 
                    ? 'ghostShipDrift 50s linear forwards'
                    : 'ghostShipDriftReverse 50s linear forwards',
            }}
        >
            <div 
                style={{ 
                    animation: 'ghostShipFade 50s ease-in-out forwards',
                }}
            >
                {/* Dark silhouette skeleton ship */}
                <svg 
                    width="100" 
                    height="60" 
                    viewBox="0 0 100 60" 
                    fill="none"
                    style={{ opacity: 0.7 }}
                >
                    {/* Hull - broken, skeletal */}
                    <path 
                        d="M8 48 L15 52 L85 52 L92 48 L88 46 L75 44 L70 46 L55 44 L45 46 L30 44 L20 46 L12 44 Z" 
                        fill="#0a0c10"
                    />
                    {/* Hull ribs/damage */}
                    <path d="M25 46 L27 50" stroke="#0a0c10" strokeWidth="2" />
                    <path d="M40 45 L42 50" stroke="#0a0c10" strokeWidth="2" />
                    <path d="M60 45 L62 50" stroke="#0a0c10" strokeWidth="2" />
                    <path d="M75 46 L77 50" stroke="#0a0c10" strokeWidth="2" />
                    
                    {/* Main mast - broken/tilted */}
                    <path d="M50 8 L52 44" stroke="#0a0c10" strokeWidth="3" />
                    {/* Cross beam */}
                    <path d="M35 18 L65 16" stroke="#0a0c10" strokeWidth="2" />
                    
                    {/* Front mast - broken off */}
                    <path d="M28 22 L30 44" stroke="#0a0c10" strokeWidth="2" />
                    <path d="M28 22 L24 18" stroke="#0a0c10" strokeWidth="2" />
                    
                    {/* Rear mast - tilted */}
                    <path d="M72 15 L70 44" stroke="#0a0c10" strokeWidth="2" />
                    <path d="M62 24 L78 22" stroke="#0a0c10" strokeWidth="1.5" />
                    
                    {/* Tattered sail remnants - main */}
                    <path 
                        d="M38 20 L50 12 L52 32 L42 35 L38 28 Z" 
                        fill="#080a0e"
                        opacity="0.8"
                    />
                    
                    {/* Tattered sail - rear */}
                    <path 
                        d="M64 25 L72 18 L71 35 L66 34 Z" 
                        fill="#080a0e"
                        opacity="0.7"
                    />
                    
                    {/* Crow's nest - damaged */}
                    <path d="M46 8 L54 8" stroke="#0a0c10" strokeWidth="2" />
                    
                    {/* Bowsprit */}
                    <path d="M8 44 L2 40" stroke="#0a0c10" strokeWidth="2" />
                    
                    {/* Stern detail */}
                    <path d="M88 44 L92 40 L90 38" stroke="#0a0c10" strokeWidth="1.5" />
                    
                    {/* Rigging lines - broken/hanging */}
                    <path d="M50 10 L35 20" stroke="#0a0c10" strokeWidth="0.5" opacity="0.6" />
                    <path d="M50 10 L62 22" stroke="#0a0c10" strokeWidth="0.5" opacity="0.6" />
                    <path d="M30 24 L28 35" stroke="#0a0c10" strokeWidth="0.5" opacity="0.5" />
                    <path d="M65 16 L70 28" stroke="#0a0c10" strokeWidth="0.5" opacity="0.5" />
                </svg>
            </div>
        </div>
    );
}

// Pixel cloud component
function PixelCloud({ 
    width, 
    height, 
    top, 
    left, 
    opacity = 0.6 
}: { 
    width: number; 
    height: number; 
    top: string; 
    left: string; 
    opacity?: number;
}) {
    return (
        <div 
            className="pixel-cloud absolute animate-drift"
            style={{ 
                width: `${width}px`, 
                height: `${height}px`, 
                top, 
                left,
                opacity,
            }}
        />
    );
}

export default function HomePage() {
    // Shooting stars state
    const [shootingStars, setShootingStars] = useState<Array<{id: number; top: number; left: number}>>([]);
    const [ghostShips, setGhostShips] = useState<Array<{id: number; fromRight: boolean}>>([]);
    
    const removeShootingStar = useCallback((id: number) => {
        setShootingStars(prev => prev.filter(star => star.id !== id));
    }, []);

    const removeGhostShip = useCallback((id: number) => {
        setGhostShips(prev => prev.filter(ship => ship.id !== id));
    }, []);

    // Spawn shooting stars randomly across the sky
    useEffect(() => {
        const spawnShootingStar = () => {
            const id = Date.now() + Math.random();
            const top = Math.random() * 35 + 3; // 3-38% from top (sky area only)
            const left = Math.random() * 70 + 5; // 5-75% from left
            setShootingStars(prev => [...prev, { id, top, left }]);
        };

        // Initial delay then spawn every 3-5 seconds for testing
        const initialDelay = setTimeout(() => {
            spawnShootingStar();
        }, 1500);

        const interval = setInterval(() => {
            if (Math.random() > 0.1) { // 90% chance to spawn for testing
                spawnShootingStar();
            }
        }, 3000 + Math.random() * 2000);

        return () => {
            clearTimeout(initialDelay);
            clearInterval(interval);
        };
    }, []);

    // Spawn ghost ships - increased rate for testing
    useEffect(() => {
        const spawnGhostShip = () => {
            const id = Date.now() + Math.random();
            const fromRight = Math.random() > 0.5; // Random direction
            setGhostShips(prev => [...prev, { id, fromRight }]);
        };

        // First ghost ship after 5 seconds for testing
        const initialDelay = setTimeout(() => {
            spawnGhostShip();
        }, 5000);

        // Then every 15-20 seconds for testing
        const interval = setInterval(() => {
            if (Math.random() > 0.2) { // 80% chance for testing
                spawnGhostShip();
            }
        }, 15000 + Math.random() * 5000);

        return () => {
            clearTimeout(initialDelay);
            clearInterval(interval);
        };
    }, []);

    return (
        <main className="min-h-screen relative overflow-hidden">
            {/* === DREAMY SKY BACKGROUND === */}
            <div className="fixed inset-0 z-0 bg-fantasy-sky-warm" />
            
            {/* === DITHERED OVERLAY === */}
            <div 
                className="fixed inset-0 z-[1] pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'radial-gradient(#182028 1px, transparent 1px)',
                    backgroundSize: '4px 4px',
                }}
            />

            {/* === PIXEL MOON === */}
            <div className="fixed top-[10%] right-[15%] z-[2] animate-float">
                <div className="pixel-moon w-20 h-20 md:w-28 md:h-28" />
            </div>

            {/* === PIXEL CLOUDS === */}
            <div className="fixed inset-0 z-[3] pointer-events-none overflow-hidden">
                <PixelCloud width={180} height={40} top="15%" left="5%" opacity={0.7} />
                <PixelCloud width={120} height={30} top="25%" left="70%" opacity={0.5} />
                <PixelCloud width={200} height={50} top="60%" left="-5%" opacity={0.4} />
                <PixelCloud width={150} height={35} top="70%" left="60%" opacity={0.3} />
                <PixelCloud width={100} height={25} top="45%" left="80%" opacity={0.5} />
            </div>

            {/* === STARFIELD === */}
            <div className="fixed inset-0 z-[4] pointer-events-none">
                <Star size="lg" top="8%" left="20%" delay={0} />
                <Star size="sm" top="12%" left="45%" delay={0.5} />
                <Star size="md" top="5%" left="65%" delay={1} />
                <Star size="sm" top="18%" left="30%" delay={1.5} />
                <Star size="md" top="22%" left="10%" delay={2} />
                <Star size="sm" top="30%" left="25%" delay={1.2} />
                <Star size="sm" top="35%" left="90%" delay={0.3} />
                <Star size="md" top="8%" left="35%" delay={1.8} />
                <Star size="sm" top="25%" left="5%" delay={2.2} />
                
                {/* === SHOOTING STARS === */}
                {shootingStars.map(star => (
                    <ShootingStar 
                        key={star.id} 
                        id={star.id}
                        startTop={star.top} 
                        startLeft={star.left}
                        onComplete={removeShootingStar}
                    />
                ))}
            </div>

            {/* === GHOST SHIPS === */}
            <div className="fixed inset-0 z-[2] pointer-events-none overflow-hidden">
                {ghostShips.map(ship => (
                    <GhostShip 
                        key={ship.id} 
                        id={ship.id}
                        startFromRight={ship.fromRight}
                        onComplete={removeGhostShip}
                    />
                ))}
            </div>

            {/* === SCANLINE OVERLAY === */}
            <div className="fixed inset-0 z-[5] pointer-events-none scanlines opacity-50" />

            {/* === MAIN CONTENT === */}
            <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8">
                
                {/* Main Panel - Pixel Art Style */}
                <div className="w-full max-w-lg">
                    {/* Outer frame with pixel border */}
                    <div className="pixel-panel-dark p-1 md:p-1.5">
                        {/* Inner parchment panel */}
                        <div className="pixel-panel corner-flourish">
                            
                            {/* === HEADER === */}
                            <div className="bg-gradient-to-b from-[#d4c6b0] to-[#e8dcca] px-4 py-5 md:px-6 md:py-6 text-center border-b-4 border-b-[#c69c48]">
                                {/* Pixel art title */}
                                <h1 className="text-pixel text-[10px] md:text-xs text-[#2a1d17] tracking-wider mb-3 leading-relaxed">
                                    ⚔ ARCANE GAMEMASTER ⚔
                                </h1>
                                
                                {/* Subtitle in elegant serif */}
                                <p className="font-medieval text-sm md:text-base text-[#4a3d37] tracking-wide">
                                    Your AI-Powered D&D 5e Companion
                                </p>
                            </div>

                            {/* === BODY === */}
                            <div className="px-4 py-6 md:px-6 md:py-8 bg-parchment-grain">
                                {/* Tagline */}
                                <div className="text-center mb-6">
                                    <p className="font-quest text-sm md:text-base text-[#2a1d17] leading-relaxed max-w-sm mx-auto">
                                        Focus on the story while the system handles all the mechanics.
                                        Roll dice, track combat, and manage your party — automatically.
                                    </p>
                                </div>

                                {/* Ornate Divider */}
                                <div className="divider-ornate mb-6">
                                    <span className="text-gold-base text-lg">✦</span>
                                </div>

                                {/* === BUTTONS === */}
                                <div className="space-y-4">
                                    {/* Primary CTA */}
                                    <Link href="/campaigns" className="block">
                                        <button className="btn-pixel btn-pixel-danger w-full py-4 text-[9px] md:text-[10px]">
                                            BEGIN ADVENTURE
                                        </button>
                                    </Link>

                                    {/* Secondary - Settings */}
                                    <Link href="/settings" className="block">
                                        <button className="btn-pixel btn-pixel-secondary w-full py-3 text-[8px] md:text-[9px]">
                                            ⚙ SETTINGS
                                        </button>
                                    </Link>
                                </div>

                                {/* Stats/Version Display */}
                                <div className="mt-6 pt-4 border-t-2 border-dashed border-[#c69c48]/40">
                                    <div className="flex justify-center gap-6 text-retro text-xs text-[#7a5923]">
                                        <span>◆ D&D 5E</span>
                                        <span>◆ AI DM</span>
                                        <span>◆ v1.0</span>
                                    </div>
                                </div>
                            </div>

                            {/* === FOOTER === */}
                            <div className="bg-[#d4c6b0] px-4 py-3 text-center border-t-2 border-[#c69c48]/50">
                                <p className="text-retro text-sm text-[#5a4313] italic">
                                    "The dice gods await your command..."
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Decorative bottom shadow */}
                    <div 
                        className="h-4 mx-4 bg-gradient-to-b from-black/40 to-transparent"
                        style={{ filter: 'blur(4px)' }}
                    />
                </div>
            </div>

            {/* === BOTTOM GRADIENT FADE === */}
            <div className="fixed bottom-0 left-0 right-0 h-32 z-[6] pointer-events-none bg-gradient-to-t from-[#05080a] to-transparent" />
        </main>
    );
}
