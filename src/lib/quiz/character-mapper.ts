/**
 * Soul Mirror - Character Mapper
 * 
 * Maps Big Five personality scores to D&D character recommendations.
 * Uses research-backed correlations between personality traits and character archetypes.
 */

import {
    BigFiveScores,
    Alignment,
    DndClass,
    DndRace,
    DndBackground,
    AbilityScores,
    CharacterRecommendation,
    ClassRecommendation,
} from './types';

// ==========================================
// ALIGNMENT DERIVATION
// ==========================================

/**
 * Derive D&D alignment from Big Five scores.
 * 
 * Conscientiousness → Law/Chaos axis (discipline vs spontaneity)
 * Agreeableness → Good/Evil axis (altruism vs self-interest)
 */
export function deriveAlignment(scores: BigFiveScores): Alignment {
    const { C, A } = scores;

    // Law/Chaos axis (Conscientiousness)
    let lawChaos: 'Lawful' | 'Neutral' | 'Chaotic';
    if (C >= 60) {
        lawChaos = 'Lawful';
    } else if (C <= 40) {
        lawChaos = 'Chaotic';
    } else {
        lawChaos = 'Neutral';
    }

    // Good/Evil axis (Agreeableness)
    let goodEvil: 'Good' | 'Neutral' | 'Evil';
    if (A >= 60) {
        goodEvil = 'Good';
    } else if (A <= 40) {
        goodEvil = 'Evil';
    } else {
        goodEvil = 'Neutral';
    }

    // Combine into alignment
    if (lawChaos === 'Neutral' && goodEvil === 'Neutral') {
        return 'True Neutral';
    }

    return `${lawChaos} ${goodEvil}` as Alignment;
}

// ==========================================
// CLASS RECOMMENDATION
// ==========================================

/**
 * Class affinity patterns - each class has preferred Big Five scores.
 * Values are ideal scores (0-100), null means "doesn't matter".
 */
interface ClassPattern {
    O: number | null;  // Openness
    C: number | null;  // Conscientiousness
    E: number | null;  // Extraversion
    A: number | null;  // Agreeableness
    N: number | null;  // Neuroticism
    weight: number;    // How important personality match is (0-1)
}

const CLASS_PATTERNS: Record<DndClass, ClassPattern> = {
    // Martial Classes
    Barbarian: { O: 40, C: 30, E: 70, A: 40, N: 60, weight: 0.7 },
    Fighter: { O: 50, C: 65, E: 55, A: 50, N: 40, weight: 0.6 },
    Monk: { O: 60, C: 75, E: 35, A: 55, N: 25, weight: 0.8 },
    Paladin: { O: 45, C: 80, E: 60, A: 70, N: 30, weight: 0.9 },
    Ranger: { O: 65, C: 60, E: 35, A: 55, N: 40, weight: 0.7 },
    Rogue: { O: 70, C: 45, E: 50, A: 35, N: 45, weight: 0.7 },

    // Divine Classes
    Cleric: { O: 50, C: 70, E: 50, A: 75, N: 35, weight: 0.8 },
    Druid: { O: 70, C: 55, E: 30, A: 65, N: 40, weight: 0.8 },

    // Arcane Classes
    Bard: { O: 80, C: 40, E: 80, A: 55, N: 50, weight: 0.85 },
    Sorcerer: { O: 75, C: 35, E: 55, A: 45, N: 60, weight: 0.75 },
    Warlock: { O: 70, C: 50, E: 45, A: 35, N: 55, weight: 0.8 },
    Wizard: { O: 85, C: 75, E: 30, A: 50, N: 45, weight: 0.85 },
};

/**
 * Calculate class confidence score based on Big Five profile.
 * Returns 0-100 confidence for a specific class.
 */
function calculateClassConfidence(scores: BigFiveScores, pattern: ClassPattern): number {
    let totalDiff = 0;
    let count = 0;

    if (pattern.O !== null) {
        totalDiff += Math.abs(scores.O - pattern.O);
        count++;
    }
    if (pattern.C !== null) {
        totalDiff += Math.abs(scores.C - pattern.C);
        count++;
    }
    if (pattern.E !== null) {
        totalDiff += Math.abs(scores.E - pattern.E);
        count++;
    }
    if (pattern.A !== null) {
        totalDiff += Math.abs(scores.A - pattern.A);
        count++;
    }
    if (pattern.N !== null) {
        totalDiff += Math.abs(scores.N - pattern.N);
        count++;
    }

    if (count === 0) return 50;

    // Average difference (0-100 range)
    const avgDiff = totalDiff / count;

    // Convert to confidence (lower diff = higher confidence)
    // Max diff is ~50 on average, so 100 - (avgDiff * 2) gives us a reasonable spread
    const rawConfidence = Math.max(0, 100 - (avgDiff * 1.8));

    // Apply class weight (some classes are more personality-driven)
    return Math.round(rawConfidence * pattern.weight + (100 * (1 - pattern.weight) * 0.5));
}

/**
 * Generate reasoning for why a class was recommended.
 */
function generateClassReasoning(className: DndClass, scores: BigFiveScores): string {
    const pattern = CLASS_PATTERNS[className];
    const reasons: string[] = [];

    // Identify strongest trait matches
    if (pattern.O !== null && Math.abs(scores.O - pattern.O) < 15) {
        if (scores.O >= 65) reasons.push('your creative and curious nature');
        else if (scores.O <= 35) reasons.push('your practical and grounded approach');
    }

    if (pattern.C !== null && Math.abs(scores.C - pattern.C) < 15) {
        if (scores.C >= 65) reasons.push('your disciplined and organized mindset');
        else if (scores.C <= 35) reasons.push('your spontaneous and flexible spirit');
    }

    if (pattern.E !== null && Math.abs(scores.E - pattern.E) < 15) {
        if (scores.E >= 65) reasons.push('your outgoing and energetic personality');
        else if (scores.E <= 35) reasons.push('your thoughtful and introspective nature');
    }

    if (pattern.A !== null && Math.abs(scores.A - pattern.A) < 15) {
        if (scores.A >= 65) reasons.push('your compassionate and cooperative spirit');
        else if (scores.A <= 35) reasons.push('your independent and decisive nature');
    }

    if (pattern.N !== null && Math.abs(scores.N - pattern.N) < 15) {
        if (scores.N >= 65) reasons.push('your passionate and intense emotions');
        else if (scores.N <= 35) reasons.push('your calm and steady temperament');
    }

    if (reasons.length === 0) {
        return `Your balanced personality makes ${className} a versatile choice.`;
    }

    return `Your soul resonates with the ${className} path due to ${reasons.slice(0, 2).join(' and ')}.`;
}

/**
 * Get all class recommendations ranked by confidence.
 */
export function rankClasses(scores: BigFiveScores): ClassRecommendation[] {
    const recommendations: ClassRecommendation[] = [];

    for (const className of Object.keys(CLASS_PATTERNS) as DndClass[]) {
        const pattern = CLASS_PATTERNS[className];
        const confidence = calculateClassConfidence(scores, pattern);
        const reasoning = generateClassReasoning(className, scores);

        recommendations.push({ className, confidence, reasoning });
    }

    // Sort by confidence descending
    recommendations.sort((a, b) => b.confidence - a.confidence);

    return recommendations;
}

/**
 * Get the top recommended class.
 */
export function recommendClass(scores: BigFiveScores): ClassRecommendation {
    return rankClasses(scores)[0];
}

// ==========================================
// RACE RECOMMENDATION
// ==========================================

/**
 * Race affinity based on personality extremes.
 */
interface RacePattern {
    traits: { dimension: keyof BigFiveScores; threshold: number; above: boolean }[];
    description: string;
}

const RACE_PATTERNS: Record<DndRace, RacePattern> = {
    Elf: {
        traits: [
            { dimension: 'O', threshold: 60, above: true },
            { dimension: 'E', threshold: 50, above: false },
        ],
        description: 'your appreciation for beauty, tradition, and thoughtful contemplation',
    },
    Gnome: {
        traits: [
            { dimension: 'O', threshold: 65, above: true },
            { dimension: 'E', threshold: 55, above: true },
        ],
        description: 'your boundless curiosity and enthusiastic nature',
    },
    Dwarf: {
        traits: [
            { dimension: 'C', threshold: 60, above: true },
            { dimension: 'A', threshold: 50, above: true },
        ],
        description: 'your steadfast loyalty and dedication to craft',
    },
    Halfling: {
        traits: [
            { dimension: 'A', threshold: 60, above: true },
            { dimension: 'N', threshold: 50, above: false },
        ],
        description: 'your warmth, cheerfulness, and community spirit',
    },
    Human: {
        traits: [], // Humans match well with balanced profiles
        description: 'your adaptability and drive to excel in any path',
    },
    Dragonborn: {
        traits: [
            { dimension: 'C', threshold: 60, above: true },
            { dimension: 'E', threshold: 55, above: true },
        ],
        description: 'your sense of honor and commanding presence',
    },
    'Half-Elf': {
        traits: [
            { dimension: 'E', threshold: 55, above: true },
            { dimension: 'O', threshold: 55, above: true },
        ],
        description: 'your social grace and ability to bridge different worlds',
    },
    'Half-Orc': {
        traits: [
            { dimension: 'A', threshold: 45, above: false },
            { dimension: 'N', threshold: 55, above: true },
        ],
        description: 'your fierce determination and emotional intensity',
    },
    Tiefling: {
        traits: [
            { dimension: 'O', threshold: 60, above: true },
            { dimension: 'A', threshold: 45, above: false },
        ],
        description: 'your independent spirit and comfort with being different',
    },
};

/**
 * Calculate race match score based on trait patterns.
 */
function calculateRaceScore(scores: BigFiveScores, pattern: RacePattern): number {
    if (pattern.traits.length === 0) {
        // Human: score based on how balanced traits are
        const values = Object.values(scores);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.abs(v - avg), 0) / values.length;
        return 100 - variance; // Lower variance = better Human fit
    }

    let matchScore = 0;
    for (const trait of pattern.traits) {
        const value = scores[trait.dimension];
        const matches = trait.above ? value >= trait.threshold : value <= trait.threshold;
        if (matches) {
            matchScore += 100 / pattern.traits.length;
        } else {
            // Partial credit for close matches
            const diff = trait.above
                ? trait.threshold - value
                : value - trait.threshold;
            matchScore += Math.max(0, (50 - diff)) / pattern.traits.length;
        }
    }

    return Math.round(matchScore);
}

/**
 * Recommend a race based on personality.
 */
export function recommendRace(scores: BigFiveScores): { race: DndRace; reasoning: string } {
    let bestRace: DndRace = 'Human';
    let bestScore = 0;

    for (const race of Object.keys(RACE_PATTERNS) as DndRace[]) {
        const score = calculateRaceScore(scores, RACE_PATTERNS[race]);
        if (score > bestScore) {
            bestScore = score;
            bestRace = race;
        }
    }

    return {
        race: bestRace,
        reasoning: `The mirror reveals ${bestRace} blood in your spirit, reflecting ${RACE_PATTERNS[bestRace].description}.`,
    };
}

// ==========================================
// BACKGROUND RECOMMENDATION
// ==========================================

/**
 * Background patterns based on personality.
 */
const BACKGROUND_PATTERNS: Record<DndBackground, { preferred: Partial<BigFiveScores>; description: string }> = {
    Acolyte: { preferred: { C: 70, A: 65 }, description: 'devotion to faith and service' },
    Charlatan: { preferred: { E: 65, A: 30, O: 60 }, description: 'quick wit and flexible morals' },
    Criminal: { preferred: { A: 30, C: 35 }, description: 'pragmatic approach to rules' },
    Entertainer: { preferred: { E: 80, O: 70 }, description: 'love of performance and attention' },
    'Folk Hero': { preferred: { A: 70, E: 55 }, description: 'desire to help the common folk' },
    'Guild Artisan': { preferred: { C: 65, O: 55 }, description: 'dedication to craft and trade' },
    Hermit: { preferred: { E: 25, O: 65, C: 55 }, description: 'preference for solitude and contemplation' },
    Noble: { preferred: { E: 60, C: 60 }, description: 'natural leadership and social confidence' },
    Outlander: { preferred: { E: 35, O: 55, N: 40 }, description: 'comfort in the wilderness' },
    Sage: { preferred: { O: 80, C: 70, E: 30 }, description: 'thirst for knowledge' },
    Sailor: { preferred: { E: 60, O: 55, N: 45 }, description: 'love of freedom and adventure' },
    Soldier: { preferred: { C: 70, E: 55 }, description: 'discipline and martial spirit' },
    Urchin: { preferred: { A: 40, N: 55, O: 50 }, description: 'streetwise survival instincts' },
};

/**
 * Recommend a background based on personality.
 */
export function recommendBackground(scores: BigFiveScores): { background: DndBackground; reasoning: string } {
    let bestBackground: DndBackground = 'Folk Hero';
    let bestScore = 0;

    for (const bg of Object.keys(BACKGROUND_PATTERNS) as DndBackground[]) {
        const pattern = BACKGROUND_PATTERNS[bg];
        let score = 0;
        let count = 0;

        for (const [dim, target] of Object.entries(pattern.preferred)) {
            const actual = scores[dim as keyof BigFiveScores];
            const diff = Math.abs(actual - target);
            score += Math.max(0, 100 - diff * 2);
            count++;
        }

        const avgScore = count > 0 ? score / count : 50;
        if (avgScore > bestScore) {
            bestScore = avgScore;
            bestBackground = bg;
        }
    }

    return {
        background: bestBackground,
        reasoning: `Your past echoes with ${BACKGROUND_PATTERNS[bestBackground].description}.`,
    };
}

// ==========================================
// ABILITY SCORE SUGGESTION
// ==========================================

/**
 * Suggest ability score allocation based on personality and class.
 */
export function suggestAbilityScores(
    scores: BigFiveScores,
    recommendedClass: DndClass
): { abilities: AbilityScores; reasoning: string } {
    // Base point-buy values (27 points total)
    // Standard array equivalent: 15, 14, 13, 12, 10, 8

    // Map personality to ability priorities
    const priorities: (keyof AbilityScores)[] = [];

    // High Openness → Intelligence or Wisdom
    if (scores.O >= 60) {
        priorities.push('intelligence');
        if (scores.E <= 45) priorities.push('wisdom');
    }

    // High Conscientiousness → Wisdom or Constitution
    if (scores.C >= 60) {
        priorities.push('wisdom');
        priorities.push('constitution');
    }

    // High Extraversion → Charisma
    if (scores.E >= 60) {
        priorities.push('charisma');
    }

    // Low Agreeableness → Strength (dominance)
    if (scores.A <= 40) {
        priorities.push('strength');
    }

    // High Agreeableness → Wisdom or Charisma
    if (scores.A >= 60) {
        if (!priorities.includes('wisdom')) priorities.push('wisdom');
        if (!priorities.includes('charisma')) priorities.push('charisma');
    }

    // Class-based adjustments
    const classAbilityPriority: Record<DndClass, (keyof AbilityScores)[]> = {
        Barbarian: ['strength', 'constitution', 'dexterity'],
        Bard: ['charisma', 'dexterity', 'constitution'],
        Cleric: ['wisdom', 'constitution', 'strength'],
        Druid: ['wisdom', 'constitution', 'dexterity'],
        Fighter: ['strength', 'constitution', 'dexterity'],
        Monk: ['dexterity', 'wisdom', 'constitution'],
        Paladin: ['strength', 'charisma', 'constitution'],
        Ranger: ['dexterity', 'wisdom', 'constitution'],
        Rogue: ['dexterity', 'intelligence', 'constitution'],
        Sorcerer: ['charisma', 'constitution', 'dexterity'],
        Warlock: ['charisma', 'constitution', 'dexterity'],
        Wizard: ['intelligence', 'constitution', 'dexterity'],
    };

    // Merge class priorities with personality priorities
    const classPriorities = classAbilityPriority[recommendedClass];
    const finalPriorities: (keyof AbilityScores)[] = [];

    // Class primary ability first
    finalPriorities.push(classPriorities[0]);

    // Then personality-based
    for (const p of priorities) {
        if (!finalPriorities.includes(p) && finalPriorities.length < 3) {
            finalPriorities.push(p);
        }
    }

    // Fill remaining with class priorities
    for (const p of classPriorities) {
        if (!finalPriorities.includes(p) && finalPriorities.length < 6) {
            finalPriorities.push(p);
        }
    }

    // Fill any remaining slots
    const allAbilities: (keyof AbilityScores)[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    for (const a of allAbilities) {
        if (!finalPriorities.includes(a)) {
            finalPriorities.push(a);
        }
    }

    // Assign scores based on priority (15, 14, 13, 12, 10, 8)
    const scoreValues = [15, 14, 13, 12, 10, 8];
    const abilities: AbilityScores = {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
    };

    for (let i = 0; i < 6; i++) {
        abilities[finalPriorities[i]] = scoreValues[i];
    }

    // Generate reasoning
    const topTwo = finalPriorities.slice(0, 2);
    const reasoning = `Your ${topTwo.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(' and ')} shine brightest, reflecting your inner nature.`;

    return { abilities, reasoning };
}

// ==========================================
// COMPLETE RECOMMENDATION
// ==========================================

/**
 * Generate a complete character recommendation from Big Five scores.
 */
export function generateCharacterRecommendation(scores: BigFiveScores): CharacterRecommendation {
    const alignment = deriveAlignment(scores);
    const classConfidences = rankClasses(scores);
    const topClass = classConfidences[0];
    const { race, reasoning: raceReasoning } = recommendRace(scores);
    const { background, reasoning: backgroundReasoning } = recommendBackground(scores);
    const { abilities, reasoning: abilityReasoning } = suggestAbilityScores(scores, topClass.className);

    return {
        alignment,
        race,
        raceReasoning,
        class: topClass.className,
        classConfidences,
        background,
        backgroundReasoning,
        suggestedAbilities: abilities,
        abilityReasoning,
    };
}

// ==========================================
// PERSONALITY PROFILE DESCRIPTION
// ==========================================

/**
 * Generate a narrative description of the personality profile.
 */
export function describePersonality(scores: BigFiveScores): string {
    const descriptions: string[] = [];

    // Openness
    if (scores.O >= 70) {
        descriptions.push('You possess a vibrant imagination and hunger for new experiences.');
    } else if (scores.O >= 55) {
        descriptions.push('You balance creativity with practicality, open to new ideas when they prove useful.');
    } else if (scores.O <= 30) {
        descriptions.push('You value tradition and proven methods over untested innovations.');
    } else {
        descriptions.push('You approach change thoughtfully, neither seeking nor avoiding the unfamiliar.');
    }

    // Conscientiousness
    if (scores.C >= 70) {
        descriptions.push('Discipline flows through you naturally—you plan ahead and honor your commitments.');
    } else if (scores.C >= 55) {
        descriptions.push('You strike a balance between structure and flexibility in pursuing your goals.');
    } else if (scores.C <= 30) {
        descriptions.push('You prefer to follow inspiration over plans, adapting freely to each moment.');
    } else {
        descriptions.push('You value both spontaneity and responsibility in measured portions.');
    }

    // Extraversion
    if (scores.E >= 70) {
        descriptions.push('You draw energy from others, thriving in company and conversation.');
    } else if (scores.E >= 55) {
        descriptions.push('You enjoy both companionship and solitude in healthy measure.');
    } else if (scores.E <= 30) {
        descriptions.push('You find peace in solitude, your inner world rich and sustaining.');
    } else {
        descriptions.push('You move between social engagement and quiet reflection as needed.');
    }

    // Agreeableness
    if (scores.A >= 70) {
        descriptions.push('Compassion guides your hand—you naturally consider others\' needs.');
    } else if (scores.A >= 55) {
        descriptions.push('You balance helpfulness with healthy boundaries.');
    } else if (scores.A <= 30) {
        descriptions.push('You trust your own judgment above the opinions of others.');
    } else {
        descriptions.push('You weigh cooperation and independence carefully in each situation.');
    }

    // Neuroticism
    if (scores.N >= 70) {
        descriptions.push('You feel deeply, experiencing both joys and sorrows with intensity.');
    } else if (scores.N >= 55) {
        descriptions.push('Your emotions run strong but you\'ve learned to channel them.');
    } else if (scores.N <= 30) {
        descriptions.push('You remain calm under pressure, a steady presence amid chaos.');
    } else {
        descriptions.push('You experience life\'s ups and downs with measured responses.');
    }

    return descriptions.join(' ');
}
