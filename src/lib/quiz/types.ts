/**
 * Soul Mirror Quiz System - Types
 * 
 * TypeScript interfaces for the personality-driven D&D character generator.
 * Based on Big Five (OCEAN) personality model.
 */

// ==========================================
// BIG FIVE PERSONALITY TYPES
// ==========================================

/** Big Five personality dimensions (OCEAN model) */
export type BigFiveDimension = 'O' | 'C' | 'E' | 'A' | 'N';

/** Full dimension names for display */
export const BIG_FIVE_NAMES: Record<BigFiveDimension, string> = {
    O: 'Openness',
    C: 'Conscientiousness',
    E: 'Extraversion',
    A: 'Agreeableness',
    N: 'Neuroticism',
};

/** Big Five scores object (each 0-100, starts at 50) */
export interface BigFiveScores {
    O: number; // Openness to Experience
    C: number; // Conscientiousness
    E: number; // Extraversion
    A: number; // Agreeableness
    N: number; // Neuroticism (Emotional Stability inverse)
}

/** Score adjustments from an answer (-15 to +15 range per dimension) */
export interface ScoreAdjustment {
    O?: number;
    C?: number;
    E?: number;
    A?: number;
    N?: number;
}

// ==========================================
// QUIZ QUESTION TYPES
// ==========================================

/** Question categories */
export type QuestionCategory = 'fantasy_scenario' | 'real_life' | 'dnd_hypothetical';

/** A single answer option for a quiz question */
export interface QuizAnswer {
    text: string;
    scores: ScoreAdjustment;
    classHints?: string[];  // Classes this answer suggests (e.g., ['Wizard', 'Bard'])
    raceHints?: string[];   // Races this answer suggests (e.g., ['Elf', 'Gnome'])
}

/** A complete quiz question with its answers */
export interface QuizQuestion {
    id: string;
    text: string;
    category: QuestionCategory;
    dimension: BigFiveDimension;  // Primary dimension being tested
    answers: QuizAnswer[];
}

/** Question from database (answers are JSON string) */
export interface QuizQuestionDB {
    id: string;
    text: string;
    category: string;
    dimension: string;
    answers: string;  // JSON string of QuizAnswer[]
    isActive: boolean;
    createdAt: Date;
}

// ==========================================
// QUIZ SESSION TYPES
// ==========================================

export type QuizStatus = 'in_progress' | 'completed' | 'abandoned';

/** Quiz session state */
export interface QuizSession {
    id: string;
    campaignId: string;
    usedQuestionIds: string[];
    currentIndex: number;
    totalQuestions: number;
    scores: BigFiveScores;
    status: QuizStatus;
    completedAt: Date | null;
    createdAt: Date;
}

/** Session from database (JSON fields are strings) */
export interface QuizSessionDB {
    id: string;
    campaignId: string;
    usedQuestionIds: string;  // JSON string
    currentIndex: number;
    totalQuestions: number;
    scoreO: number;
    scoreC: number;
    scoreE: number;
    scoreA: number;
    scoreN: number;
    status: string;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

// ==========================================
// CHARACTER RECOMMENDATION TYPES
// ==========================================

/** D&D alignment options */
export type Alignment =
    | 'Lawful Good' | 'Neutral Good' | 'Chaotic Good'
    | 'Lawful Neutral' | 'True Neutral' | 'Chaotic Neutral'
    | 'Lawful Evil' | 'Neutral Evil' | 'Chaotic Evil';

/** D&D class options */
export type DndClass =
    | 'Barbarian' | 'Bard' | 'Cleric' | 'Druid'
    | 'Fighter' | 'Monk' | 'Paladin' | 'Ranger'
    | 'Rogue' | 'Sorcerer' | 'Warlock' | 'Wizard';

/** D&D race options */
export type DndRace =
    | 'Human' | 'Elf' | 'Dwarf' | 'Halfling'
    | 'Dragonborn' | 'Gnome' | 'Half-Elf' | 'Half-Orc' | 'Tiefling';

/** D&D background options */
export type DndBackground =
    | 'Acolyte' | 'Charlatan' | 'Criminal' | 'Entertainer'
    | 'Folk Hero' | 'Guild Artisan' | 'Hermit' | 'Noble'
    | 'Outlander' | 'Sage' | 'Sailor' | 'Soldier' | 'Urchin';

/** Ability scores */
export interface AbilityScores {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
}

/** Class recommendation with confidence score */
export interface ClassRecommendation {
    className: DndClass;
    confidence: number;  // 0-100
    reasoning: string;
}

/** Complete character recommendation from quiz */
export interface CharacterRecommendation {
    alignment: Alignment;
    race: DndRace;
    raceReasoning: string;
    class: DndClass;
    classConfidences: ClassRecommendation[];  // All classes ranked
    background: DndBackground;
    backgroundReasoning: string;
    suggestedAbilities: AbilityScores;
    abilityReasoning: string;
}

// ==========================================
// QUIZ RESULT TYPES
// ==========================================

/** Complete quiz result */
export interface QuizResult {
    id: string;
    sessionId: string;

    // Big Five scores
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;

    // D&D attributes
    alignment: Alignment;
    suggestedRace: DndRace;
    suggestedClass: DndClass;
    suggestedBackground: DndBackground;

    // AI-generated content
    backstory: string | null;
    personalityTraits: string[];
    ideal: string | null;
    bond: string | null;
    flaw: string | null;

    // Ability suggestion
    suggestedAbilities: AbilityScores;

    // Share functionality
    shareToken: string | null;
    shareImageUrl: string | null;

    createdAt: Date;
}

/** Result from database (JSON fields are strings) */
export interface QuizResultDB {
    id: string;
    sessionId: string;
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
    alignment: string;
    suggestedRace: string;
    suggestedClass: string;
    suggestedBackground: string;
    backstory: string | null;
    personalityTraits: string;  // JSON string
    ideal: string | null;
    bond: string | null;
    flaw: string | null;
    suggestedAbilities: string;  // JSON string
    shareToken: string | null;
    shareImageUrl: string | null;
    createdAt: Date;
}

// ==========================================
// API TYPES
// ==========================================

/** Start quiz request */
export interface StartQuizRequest {
    campaignId: string;
}

/** Start quiz response */
export interface StartQuizResponse {
    session: QuizSession;
    firstQuestion: QuizQuestion;
    retakeNumber: number;  // 1, 2, or 3
    maxRetakes: number;    // 3
}

/** Submit answer request */
export interface SubmitAnswerRequest {
    answerIndex: number;  // 0-3
}

/** Submit answer response */
export interface SubmitAnswerResponse {
    nextQuestion: QuizQuestion | null;  // null if quiz complete
    currentIndex: number;
    totalQuestions: number;
    isComplete: boolean;
}

/** Complete quiz response */
export interface CompleteQuizResponse {
    result: QuizResult;
    recommendation: CharacterRecommendation;
}

/** Generate backstory request */
export interface GenerateBackstoryRequest {
    resultId: string;
}

/** Generate backstory response */
export interface GenerateBackstoryResponse {
    backstory: string;
    personalityTraits: string[];
    ideal: string;
    bond: string;
    flaw: string;
    suggestedAbilities: AbilityScores;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/** Convert DB session to typed session */
export function parseQuizSession(db: QuizSessionDB): QuizSession {
    return {
        id: db.id,
        campaignId: db.campaignId,
        usedQuestionIds: JSON.parse(db.usedQuestionIds),
        currentIndex: db.currentIndex,
        totalQuestions: db.totalQuestions,
        scores: {
            O: db.scoreO,
            C: db.scoreC,
            E: db.scoreE,
            A: db.scoreA,
            N: db.scoreN,
        },
        status: db.status as QuizStatus,
        completedAt: db.completedAt,
        createdAt: db.createdAt,
    };
}

/** Convert DB question to typed question */
export function parseQuizQuestion(db: QuizQuestionDB): QuizQuestion {
    return {
        id: db.id,
        text: db.text,
        category: db.category as QuestionCategory,
        dimension: db.dimension as BigFiveDimension,
        answers: JSON.parse(db.answers),
    };
}

/** Convert DB result to typed result */
export function parseQuizResult(db: QuizResultDB): QuizResult {
    return {
        id: db.id,
        sessionId: db.sessionId,
        openness: db.openness,
        conscientiousness: db.conscientiousness,
        extraversion: db.extraversion,
        agreeableness: db.agreeableness,
        neuroticism: db.neuroticism,
        alignment: db.alignment as Alignment,
        suggestedRace: db.suggestedRace as DndRace,
        suggestedClass: db.suggestedClass as DndClass,
        suggestedBackground: db.suggestedBackground as DndBackground,
        backstory: db.backstory,
        personalityTraits: JSON.parse(db.personalityTraits),
        ideal: db.ideal,
        bond: db.bond,
        flaw: db.flaw,
        suggestedAbilities: JSON.parse(db.suggestedAbilities),
        shareToken: db.shareToken,
        shareImageUrl: db.shareImageUrl,
        createdAt: db.createdAt,
    };
}

/** Clamp score to 0-100 range */
export function clampScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
}

/** Apply score adjustments to current scores */
export function applyScoreAdjustment(
    current: BigFiveScores,
    adjustment: ScoreAdjustment
): BigFiveScores {
    return {
        O: clampScore(current.O + (adjustment.O ?? 0)),
        C: clampScore(current.C + (adjustment.C ?? 0)),
        E: clampScore(current.E + (adjustment.E ?? 0)),
        A: clampScore(current.A + (adjustment.A ?? 0)),
        N: clampScore(current.N + (adjustment.N ?? 0)),
    };
}
