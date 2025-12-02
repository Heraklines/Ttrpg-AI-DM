/**
 * AI Orchestrator
 * 
 * Manages the conversation loop with the AI, handling:
 * 1. Context injection (game state, party status)
 * 2. Function calling loop (execute functions, feed results back)
 * 3. State Guardian validation
 * 4. Retry logic for invalid responses
 */

import { generateContent } from './client';
import { executeFunction, stripFunctionCalls, parseFunctionCalls, executeLoreFunction } from './function-executor';
import { StateGuardian, ValidationResult } from './state-guardian';
import { DM_SYSTEM_PROMPT_FULL } from './system-prompt';
import type { Character, Combat } from '@/lib/engine/types';

const MAX_FUNCTION_ITERATIONS = 10;
const MAX_VALIDATION_RETRIES = 3;

export interface OrchestratorContext {
  campaignId: string;
  campaignName: string;
  campaignDescription: string | null;
  characters: Character[];
  gameState: {
    mode: string;
    gameDay: number;
    gameHour: number;
    gameMinute: number;
    activeCombat: Combat | null;
    recentMessages: Array<{ role: string; content: string }>;
  };
}

export interface OrchestratorResult {
  narrative: string;
  functionResults: Array<{ name: string; displayText: string }>;
  stateUpdates: {
    characterUpdates: Record<string, Partial<Character>>;
    combatUpdate: Combat | null;
    modeChange: string | null;
  };
  warnings: string[];
}

export class AIOrchestrator {
  private stateGuardian: StateGuardian;

  constructor() {
    this.stateGuardian = new StateGuardian();
  }

  /**
   * Process a player action through the full AI loop
   */
  async processAction(
    playerInput: string,
    context: OrchestratorContext
  ): Promise<OrchestratorResult> {
    const functionResults: Array<{ name: string; displayText: string }> = [];
    const characterUpdates: Record<string, Partial<Character>> = {};
    let combatUpdate: Combat | null = context.gameState.activeCombat;
    let modeChange: string | null = null;
    const warnings: string[] = [];

    // Build character map for function execution
    const characterMap = new Map<string, Character>();
    for (const char of context.characters) {
      characterMap.set(char.id, char);
      characterMap.set(char.name, char);
      characterMap.set(char.name.toLowerCase(), char);
    }

    // Create execution context
    const executionContext = {
      characters: characterMap,
      combat: combatUpdate,
      campaignId: context.campaignId,  // Add campaignId for lore functions
      updateCharacter: (id: string, updates: Partial<Character>) => {
        characterUpdates[id] = { ...characterUpdates[id], ...updates };
        // Also update in map for subsequent calls
        const char = characterMap.get(id);
        if (char) {
          Object.assign(char, updates);
        }
      },
      updateCombat: (combat: Combat | null) => {
        combatUpdate = combat;
        if (!combat) {
          modeChange = 'exploration';
        }
      },
    };

    // Generate context injection (includes lore if available)
    const loreContext = await this.stateGuardian.getLoreContext(context.campaignId);
    const contextBlock = this.stateGuardian.generateContextInjection({
      ...context,
      loreContext
    });

    // Build the full prompt
    const fullPrompt = `${contextBlock}

PLAYER ACTION: "${playerInput}"

Remember: You MUST use function calls for ANY mechanical action (dice rolls, damage, HP changes). 
Execute the appropriate functions, then narrate the results naturally without mentioning game mechanics.`;

    let narrative = '';
    let validationAttempts = 0;
    let isValid = false;

    while (!isValid && validationAttempts < MAX_VALIDATION_RETRIES) {
      validationAttempts++;

      // Generate AI response
      let aiResponse = await generateContent(fullPrompt, DM_SYSTEM_PROMPT_FULL);

      // Check for function calls in the response (text-based since we're not using native function calling)
      const functionCalls = parseFunctionCalls(aiResponse);

      // Execute any function calls found
      let iterations = 0;
      while (functionCalls.length > 0 && iterations < MAX_FUNCTION_ITERATIONS) {
        iterations++;

        for (const call of functionCalls) {
          const result = executeFunction(call, executionContext);
          
          // Handle async lore functions
          if (result.success && result.result && typeof result.result === 'object' && 
              (result.result as Record<string, unknown>).async === true) {
            const loreResult = await executeLoreFunction(
              call.name, 
              result.result as Record<string, unknown>
            );
            // Update display text with actual lore data
            functionResults.push({ 
              name: result.name, 
              displayText: loreResult.success 
                ? `${result.displayText}\n${loreResult.data}`
                : result.displayText
            });
          } else {
            functionResults.push({ name: result.name, displayText: result.displayText });
          }
        }

        // Clear the parsed calls
        functionCalls.length = 0;

        // Strip function calls from response
        aiResponse = stripFunctionCalls(aiResponse);

        // Check for more function calls (shouldn't be any after stripping)
        const moreCalls = parseFunctionCalls(aiResponse);
        functionCalls.push(...moreCalls);
      }

      // Clean up the narrative
      narrative = this.cleanNarrative(aiResponse);

      // Check if narrative is meaningful (more than just whitespace or trivial content)
      const isMeaningfulNarrative = narrative && 
        narrative.trim().length >= 50 && 
        !narrative.trim().match(/^(okay|done|completed|finished|success|roll)/i);

      // If narrative is empty/trivial but we have function results, ask AI to narrate the outcome
      if (!isMeaningfulNarrative && functionResults.length > 0) {
        const successResults = functionResults.filter(r => r.displayText.includes('SUCCESS') || r.displayText.includes('HIT'));
        const failResults = functionResults.filter(r => r.displayText.includes('FAIL') || r.displayText.includes('MISS'));
        const damageResults = functionResults.filter(r => r.displayText.includes('damage') || r.displayText.includes('💔'));
        const healResults = functionResults.filter(r => r.displayText.includes('heals') || r.displayText.includes('💚'));

        const outcomeHints = [];
        if (successResults.length > 0) outcomeHints.push('the action succeeded');
        if (failResults.length > 0) outcomeHints.push('something went wrong or missed');
        if (damageResults.length > 0) outcomeHints.push('damage was dealt');
        if (healResults.length > 0) outcomeHints.push('healing occurred');

        const narrativePrompt = `The player tried to: "${playerInput}"

The mechanical results were:
${functionResults.map(r => r.displayText).join('\n')}

${outcomeHints.length > 0 ? `Summary: ${outcomeHints.join(', ')}.` : ''}

Write a vivid 2-3 paragraph narrative describing what happened. Rules:
- Describe the ACTION and its consequences dramatically
- Use sensory details (what they see, hear, feel)
- Show character reactions and emotions
- NEVER mention dice, rolls, numbers, DCs, or game mechanics
- Write in present tense, second person for the party ("You see...")
- End with what the characters perceive or what happens next`;

        const narrativeResponse = await generateContent(narrativePrompt, DM_SYSTEM_PROMPT_FULL);
        narrative = this.cleanNarrative(stripFunctionCalls(narrativeResponse));
      }

      // Final fallback: if still no narrative, create a minimal one
      if (!narrative || narrative.trim().length < 20) {
        const hasSuccess = functionResults.some(r => r.displayText.includes('SUCCESS') || r.displayText.includes('HIT'));
        narrative = hasSuccess 
          ? 'Your action succeeds. The party awaits what comes next.'
          : 'The attempt yields uncertain results. You remain alert, watching for what follows.';
      }

      // Validate the response
      const validation = this.stateGuardian.validateResponse(
        narrative,
        functionResults.map(f => f.name),
        context.gameState.mode === 'combat'
      );

      if (validation.isValid) {
        isValid = true;
      } else {
        // Collect warnings
        const highSeverityIssues = validation.issues.filter(i => i.severity === 'high');
        const mediumSeverityIssues = validation.issues.filter(i => i.severity === 'medium');

        // Only retry on high severity issues
        if (highSeverityIssues.length > 0 && validationAttempts < MAX_VALIDATION_RETRIES) {
          // Get correction message and retry
          const correctionMessage = this.stateGuardian.generateCorrectionMessage(validation.issues);
          console.log(`[Orchestrator] Validation failed (attempt ${validationAttempts}), retrying with correction: ${correctionMessage}`);
          
          // We'll retry with the same prompt - the validation failure means
          // the AI included mechanical terms or invalid content
          warnings.push(`Response corrected on attempt ${validationAttempts}`);
          continue;
        }
        
        // Accept with warnings if we've exhausted retries or only have medium issues
        for (const issue of highSeverityIssues) {
          warnings.push(issue.message);
        }
        for (const issue of mediumSeverityIssues) {
          warnings.push(`[Minor] ${issue.message}`);
        }
        isValid = true;
      }
    }

    return {
      narrative,
      functionResults,
      stateUpdates: {
        characterUpdates,
        combatUpdate,
        modeChange,
      },
      warnings,
    };
  }

  /**
   * Generate a rich campaign introduction
   */
  async generateCampaignIntro(context: OrchestratorContext): Promise<string> {
    const introPrompt = `You are beginning a new D&D 5th Edition adventure.

═══════════════════════════════════════════════
CAMPAIGN: ${context.campaignName}
SETTING: ${context.campaignDescription || 'A mysterious fantasy world full of danger and wonder'}
═══════════════════════════════════════════════

THE PARTY:
${context.characters.map(c => {
  const strMod = Math.floor((c.abilityScores.strength - 10) / 2);
  const dexMod = Math.floor((c.abilityScores.dexterity - 10) / 2);
  const conMod = Math.floor((c.abilityScores.constitution - 10) / 2);
  const intMod = Math.floor((c.abilityScores.intelligence - 10) / 2);
  const wisMod = Math.floor((c.abilityScores.wisdom - 10) / 2);
  const chaMod = Math.floor((c.abilityScores.charisma - 10) / 2);
  
  // Determine character's notable traits based on stats
  const strengths: string[] = [];
  if (strMod >= 2) strengths.push('physically powerful');
  if (dexMod >= 2) strengths.push('nimble and quick');
  if (conMod >= 2) strengths.push('remarkably hardy');
  if (intMod >= 2) strengths.push('sharp-minded');
  if (wisMod >= 2) strengths.push('perceptive and wise');
  if (chaMod >= 2) strengths.push('naturally charismatic');
  
  const weaknesses: string[] = [];
  if (strMod <= -1) weaknesses.push('physically weak');
  if (dexMod <= -1) weaknesses.push('somewhat clumsy');
  if (intMod <= -1) weaknesses.push('not academically inclined');
  if (wisMod <= -1) weaknesses.push('sometimes oblivious');
  if (chaMod <= -1) weaknesses.push('socially awkward');

  return `
▸ ${c.name} - Level ${c.level} ${c.race} ${c.className}
  Background: ${c.backstory || 'A mysterious past shrouded in shadow'}
  Notable Traits: ${strengths.length > 0 ? strengths.join(', ') : 'still discovering themselves'}
  ${weaknesses.length > 0 ? `Challenges: ${weaknesses.join(', ')}` : ''}
`;
}).join('\n')}

═══════════════════════════════════════════════

Create a rich, immersive introduction to this adventure. You must:

1. ESTABLISH THE WORLD (1-2 paragraphs)
   - Paint a vivid picture of the setting based on the campaign description
   - Include sensory details: what do they see, hear, smell, feel?
   - Hint at the larger world - its history, conflicts, mysteries
   - Make it feel like a real, living place

2. INTRODUCE THE CHARACTERS (1 paragraph)
   - Weave each character's backstory into WHY they are here
   - Reference their race, class, and background naturally
   - Create a sense of how the party came together
   - Show how their abilities might matter in this world

3. SET THE STAKES (1 paragraph)
   - Establish the central conflict, mystery, or opportunity
   - Create tension and intrigue
   - Make the players WANT to engage with this world
   - Hint at both danger and reward

4. THE HOOK (final paragraph)
   - End with an immediate situation demanding attention
   - Something they can see, hear, or encounter RIGHT NOW
   - Give them a clear first choice to make
   - Make it personal and urgent

STYLE RULES:
- Write in rich, evocative prose like a fantasy novel opening
- Use second person for shared experiences ("You stand before...")
- Use third person when describing individual characters
- NEVER mention game mechanics, dice, stats, HP, or AC
- Create atmosphere through sensory detail
- Be dramatic but not overwrought
- 4-6 paragraphs total`;

    const introSystemPrompt = `You are a master fantasy storyteller crafting the opening of an epic D&D adventure.

Your writing should be:
- Richly descriptive with sensory details
- Atmospheric and immersive
- Character-focused, weaving backstories naturally
- Dramatic with clear stakes
- Ending with an actionable hook

NEVER mention:
- Game mechanics or stats
- Dice or rolls
- HP, AC, or any numbers
- "Roll for" anything
- Meta-gaming concepts

Write as if this is the opening pages of a beloved fantasy novel.`;

    return await generateContent(introPrompt, introSystemPrompt);
  }

  /**
   * Clean mechanical language from narrative
   */
  private cleanNarrative(text: string): string {
    let cleaned = text;

    // Remove explicit function call patterns
    cleaned = stripFunctionCalls(cleaned);

    // Remove common mechanical phrases
    const mechanicalPatterns = [
      /\b(roll(ed|ing)?|make|making)\s+(a\s+)?(d\d+|dice|check|save|saving throw|ability check|skill check)/gi,
      /\bDC\s*\d+/gi,
      /\b\d+\s*\+\s*\d+\s*=\s*\d+/g,
      /\bvs\.?\s*(AC|DC)\s*\d+/gi,
      /\bnatural\s+(1|20)/gi,
      /\b(success|failure)\s+on\s+(the|your)\s+\w+\s*(check|save)/gi,
      /\bmodifier|proficiency bonus|ability score/gi,
      /\broll_\w+\([^)]*\)/g,
    ];

    for (const pattern of mechanicalPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Clean up whitespace
    cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

    return cleaned;
  }
}

// Export singleton instance
export const orchestrator = new AIOrchestrator();
