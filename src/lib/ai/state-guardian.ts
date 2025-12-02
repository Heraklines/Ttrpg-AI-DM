/**
 * State Guardian
 * 
 * The State Guardian is responsible for:
 * 1. Generating context injection (combat status, party HP, reminders)
 * 2. Validating AI responses against rules
 * 3. Detecting when the AI claims outcomes without proper function calls
 */

import type { Character, Combat } from '@/lib/engine/types';
import type { GameMap, MapEntity } from '@/lib/engine/spatial-types';
import { loreContextManager } from '@/lib/lore';

export interface ValidationIssue {
  ruleId: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

interface ValidationRule {
  id: string;
  triggers: RegExp[];
  requiredFunction: string | string[];
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
  contextCondition?: 'combat' | 'exploration' | 'any';
}

const VALIDATION_RULES: ValidationRule[] = [
  // High severity - MUST enforce
  {
    id: 'ATTACK_WITHOUT_ROLL',
    triggers: [
      /\b(attacks?|swings?|strikes?|slashes?|stabs?|shoots?)\b/i,
      /\b(hits?|misses?|connects?|lands?)\s+(the|a|an)?\s*(blow|strike|attack)/i,
    ],
    requiredFunction: 'roll_attack',
    severity: 'high',
    message: 'An attack was described but no attack roll was made',
    suggestion: 'Use roll_attack() before narrating attack outcomes',
  },
  {
    id: 'DAMAGE_WITHOUT_ROLL',
    triggers: [
      /\b(takes?|deals?|suffers?|receives?)\s+\d+\s*(points?\s+of\s+)?damage/i,
      /\bfor\s+\d+\s*damage/i,
      /\b\d+\s*(slashing|piercing|bludgeoning|fire|cold|lightning|thunder|acid|poison|necrotic|radiant|force|psychic)\s+damage/i,
    ],
    requiredFunction: ['roll_damage', 'apply_damage'],
    severity: 'high',
    message: 'Damage was mentioned without proper damage roll and application',
    suggestion: 'Use roll_damage() then apply_damage() for all damage',
  },
  {
    id: 'CHECK_WITHOUT_ROLL',
    triggers: [
      /\b(succeeds?|fails?|passes?)\s+(on\s+)?(the|a|an)?\s*(check|save|saving throw)/i,
      /\b(roll(ed)?|make)\s+(a\s+)?\w+\s+(check|save)/i,
    ],
    requiredFunction: ['roll_ability_check', 'roll_saving_throw'],
    severity: 'high',
    message: 'A check or save result was declared without rolling',
    suggestion: 'Use roll_ability_check() or roll_saving_throw() before declaring results',
  },
  
  // Medium severity - should enforce
  {
    id: 'COMBAT_START_WITHOUT_INITIATIVE',
    triggers: [
      /\bcombat\s+begins/i,
      /\broll\s+for\s+initiative/i,
      /\binitiative\s+order/i,
    ],
    requiredFunction: 'start_combat',
    severity: 'medium',
    message: 'Combat appears to have started without proper initialization',
    suggestion: 'Use start_combat() to begin combat encounters',
    contextCondition: 'exploration',
  },
  {
    id: 'HEALING_WITHOUT_FUNCTION',
    triggers: [
      /\bheals?\s+\d+\s*(hit\s+)?points?/i,
      /\bregains?\s+\d+\s*(HP|hit\s+points?)/i,
    ],
    requiredFunction: 'apply_healing',
    severity: 'medium',
    message: 'Healing was mentioned without using the healing function',
    suggestion: 'Use apply_healing() to restore HP',
  },
  {
    id: 'CONDITION_WITHOUT_FUNCTION',
    triggers: [
      /\b(is\s+now|becomes?|now)\s+(blinded|charmed|deafened|frightened|grappled|incapacitated|invisible|paralyzed|petrified|poisoned|prone|restrained|stunned|unconscious)/i,
    ],
    requiredFunction: 'add_condition',
    severity: 'medium',
    message: 'A condition was applied without using the condition function',
    suggestion: 'Use add_condition() to apply status effects',
  },
];

export class StateGuardian {
  /**
   * Fetch lore context for a campaign (call this before generateContextInjection)
   */
  async getLoreContext(campaignId: string, currentLocation?: string): Promise<string | null> {
    try {
      const loreContext = await loreContextManager.getRelevantLore(campaignId, {
        currentLocation
      });
      
      if (!loreContext) return null;
      
      return `
═══ WORLD LORE ═══
${loreContext.tier1}

${loreContext.tier2 ? `═══ LOCAL CONTEXT ═══\n${loreContext.tier2}` : ''}`;
    } catch (error) {
      console.error('Error fetching lore context:', error);
      return null;
    }
  }

  /**
   * Generate context injection for the AI prompt
   */
  generateContextInjection(context: {
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
      activeMap?: GameMap | null;
      currentLocationId?: string | null;
    };
    loreContext?: string | null; // Pre-fetched lore context
  }): string {
    const sections: string[] = [];

    // Header
    sections.push(`
═══════════════════════════════════════════════
📊 CURRENT GAME STATE - READ THIS CAREFULLY
═══════════════════════════════════════════════`);

    // Basic info and LOCATION (critical for sanity checks)
    // Use persisted location if available, otherwise infer from messages
    const currentLocation = context.gameState.currentLocationId 
      ? `Location: ${context.gameState.currentLocationId}\n(Explicitly tracked location)`
      : this.inferCurrentLocation(context.gameState.recentMessages, context.campaignDescription);
    sections.push(`
CAMPAIGN: ${context.campaignName}
MODE: ${context.gameState.mode.toUpperCase()}
TIME: Day ${context.gameState.gameDay}, ${this.getTimeOfDay(context.gameState.gameHour)}

⚠️ CURRENT LOCATION & SURROUNDINGS:
${currentLocation}

IMPORTANT: Before allowing ANY player action, verify it makes sense given the above location.
If the player tries to interact with something NOT present, redirect them to what IS available.`);

    // Party status
    sections.push(`
═══ PARTY STATUS ═══
${this.generatePartyStatus(context.characters)}`);

    // Combat context if in combat
    if (context.gameState.mode === 'combat' && context.gameState.activeCombat) {
      sections.push(this.generateCombatContext(context.gameState.activeCombat));
    }

    // Spatial/Map context if available
    if (context.gameState.activeMap) {
      sections.push(this.generateSpatialContext(context.gameState.activeMap, context.characters));
    }

    // Recent context
    if (context.gameState.recentMessages.length > 0) {
      const recentSummary = context.gameState.recentMessages
        .slice(-4)
        .map(m => m.role === 'user' ? `Player: "${m.content}"` : '[Previous narration]')
        .join('\n');
      sections.push(`
═══ RECENT EVENTS ═══
${recentSummary}`);
    }

    // Inject world lore context if available
    if (context.loreContext) {
      sections.push(`
${context.loreContext}`);
    }

    // Reminders based on state
    const reminders = this.generateReminders(context);
    if (reminders) {
      sections.push(reminders);
    }

    sections.push(`
═══════════════════════════════════════════════`);

    return sections.join('\n');
  }

  /**
   * Validate an AI response against rules
   */
  validateResponse(
    responseText: string,
    functionsCalled: string[],
    isInCombat: boolean
  ): ValidationResult {
    const issues: ValidationIssue[] = [];

    for (const rule of VALIDATION_RULES) {
      // Check context condition
      if (rule.contextCondition === 'combat' && !isInCombat) continue;
      if (rule.contextCondition === 'exploration' && isInCombat) continue;

      // Check if any trigger matches
      const triggered = rule.triggers.some(pattern => pattern.test(responseText));
      if (!triggered) continue;

      // Check if required function was called
      const requiredFunctions = Array.isArray(rule.requiredFunction) 
        ? rule.requiredFunction 
        : [rule.requiredFunction];
      
      const hasRequired = requiredFunctions.some(fn => 
        functionsCalled.includes(fn)
      );

      if (!hasRequired) {
        issues.push({
          ruleId: rule.id,
          severity: rule.severity,
          message: rule.message,
          suggestion: rule.suggestion,
        });
      }
    }

    return {
      isValid: issues.filter(i => i.severity === 'high').length === 0,
      issues,
    };
  }

  /**
   * Generate a correction message for invalid responses
   */
  generateCorrectionMessage(issues: ValidationIssue[]): string {
    const highSeverity = issues.filter(i => i.severity === 'high');
    const mediumSeverity = issues.filter(i => i.severity === 'medium');

    let message = `
═══ SYSTEM CORRECTION ═══

Your response had issues that must be addressed:
`;

    let num = 1;
    for (const issue of highSeverity) {
      message += `
${num}. ⚠️ ${issue.message}
   → ${issue.suggestion}
`;
      num++;
    }

    for (const issue of mediumSeverity) {
      message += `
${num}. ⚡ ${issue.message}
   → ${issue.suggestion}
`;
      num++;
    }

    message += `
Please correct these issues. ALWAYS use function calls for mechanics.
Remember: You determine what checks are needed, execute the functions, then narrate based on results.
`;

    return message;
  }

  private generatePartyStatus(characters: Character[]): string {
    if (characters.length === 0) {
      return 'No party members';
    }

    return characters.map(c => {
      const hpPercent = (c.currentHp / c.maxHp) * 100;
      let hpIndicator = '💚';
      if (hpPercent <= 25) hpIndicator = '💔';
      else if (hpPercent <= 50) hpIndicator = '💛';

      const tempHpStr = c.tempHp > 0 ? `+${c.tempHp}` : '';
      const conditionStr = c.conditions.length > 0 
        ? `\n  Conditions: ${c.conditions.map(cond => cond.condition).join(', ')}`
        : '';

      return `${c.name} (${c.className} ${c.level}): ${hpIndicator} ${c.currentHp}${tempHpStr}/${c.maxHp} HP, AC ${c.armorClass}${conditionStr}`;
    }).join('\n');
  }

  private generateCombatContext(combat: Combat): string {
    const currentCombatant = combat.initiativeOrder[combat.currentTurnIndex];

    const initiativeList = combat.initiativeOrder.map((c, i) => {
      const isCurrent = i === combat.currentTurnIndex;
      const marker = isCurrent ? '▶' : ' ';
      const hpDisplay = c.status === 'defeated' 
        ? '[Defeated]' 
        : `(${c.currentHp}/${c.maxHp} HP)`;
      const bloodied = c.currentHp > 0 && c.currentHp <= c.maxHp / 2 ? ' [Bloodied]' : '';
      const typeIcon = c.type === 'player_character' ? '🛡️' : c.type === 'enemy' ? '👹' : '👤';

      return `${marker} ${c.initiative} | ${typeIcon} ${c.name} ${hpDisplay}${bloodied}`;
    }).join('\n');

    return `
═══════════════════════════════════════════════
⚔️ COMBAT STATUS - Round ${combat.round}
═══════════════════════════════════════════════

CURRENT TURN: ${currentCombatant?.name || 'Unknown'}
${currentCombatant ? `  HP: ${currentCombatant.currentHp}/${currentCombatant.maxHp}
  Actions: ${currentCombatant.turnResources.hasAction ? '✓' : '✗'} Action | ${currentCombatant.turnResources.hasBonusAction ? '✓' : '✗'} Bonus | Movement: ${currentCombatant.turnResources.movementRemaining}ft` : ''}

INITIATIVE ORDER:
${initiativeList}
═══════════════════════════════════════════════`;
  }

  private generateReminders(context: {
    characters: Character[];
    gameState: {
      mode: string;
      activeCombat: Combat | null;
    };
  }): string | null {
    const reminders: string[] = [];

    // Combat reminders
    if (context.gameState.mode === 'combat' && context.gameState.activeCombat) {
      const combat = context.gameState.activeCombat;
      const current = combat.initiativeOrder[combat.currentTurnIndex];
      
      if (current && !current.turnResources.hasAction) {
        reminders.push('💡 Action has been used. Consider calling next_turn() if turn is complete.');
      }
    }

    // Concentration reminders
    const concentrating = context.characters.filter(c => 
      c.conditions.some(cond => cond.condition === 'concentrating')
    );
    for (const char of concentrating) {
      reminders.push(`⚠️ ${char.name} is concentrating. Taking damage requires a CON save.`);
    }

    // Low HP warnings
    const lowHp = context.characters.filter(c => 
      c.currentHp > 0 && c.currentHp <= c.maxHp * 0.25
    );
    for (const char of lowHp) {
      reminders.push(`🩸 ${char.name} is critically wounded (${char.currentHp}/${char.maxHp} HP).`);
    }

    if (reminders.length === 0) return null;

    return `
═══ REMINDERS ═══
${reminders.join('\n')}`;
  }

  private getTimeOfDay(hour: number): string {
    if (hour >= 5 && hour < 8) return 'Early Morning';
    if (hour >= 8 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 14) return 'Midday';
    if (hour >= 14 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 20) return 'Evening';
    if (hour >= 20 && hour < 23) return 'Night';
    return 'Late Night';
  }

  /**
   * Generate spatial context for AI prompt
   */
  private generateSpatialContext(map: GameMap, characters: Character[]): string {
    const lines: string[] = [];
    
    lines.push(`
═══ MAP: ${map.name} ═══
Size: ${map.width * 5}ft x ${map.height * 5}ft (${map.width}x${map.height} squares)
Light: ${map.ambientLight}`);

    // List entity positions
    const playerEntities = map.entities.filter(e => e.entityType === 'player');
    const enemyEntities = map.entities.filter(e => e.entityType === 'enemy');
    const otherEntities = map.entities.filter(e => !['player', 'enemy'].includes(e.entityType));

    if (playerEntities.length > 0) {
      lines.push('\n📍 PARTY POSITIONS:');
      for (const entity of playerEntities) {
        const movementLeft = entity.speed - entity.movementUsed;
        lines.push(`  ${entity.name}: (${entity.position.x}, ${entity.position.y}) - ${movementLeft}ft movement remaining`);
      }
    }

    if (enemyEntities.length > 0) {
      lines.push('\n👹 ENEMY POSITIONS:');
      for (const entity of enemyEntities) {
        if (entity.isVisible) {
          lines.push(`  ${entity.name}: (${entity.position.x}, ${entity.position.y})`);
        } else {
          lines.push(`  ${entity.name}: [Hidden]`);
        }
      }
    }

    // Calculate distances between players and enemies
    if (playerEntities.length > 0 && enemyEntities.length > 0) {
      lines.push('\n📏 DISTANCES:');
      for (const player of playerEntities) {
        for (const enemy of enemyEntities) {
          if (!enemy.isVisible) continue;
          const dx = Math.abs(player.position.x - enemy.position.x);
          const dy = Math.abs(player.position.y - enemy.position.y);
          const squares = Math.max(dx, dy);
          // Rough feet calculation (actual uses 5-10-5-10 rule)
          const feet = squares * 5;
          const adjacentText = squares <= 1 ? ' [ADJACENT]' : '';
          lines.push(`  ${player.name} → ${enemy.name}: ~${feet}ft${adjacentText}`);
        }
      }
    }

    // Note any area effects
    if (map.activeEffects.length > 0) {
      lines.push('\n✨ ACTIVE EFFECTS:');
      for (const effect of map.activeEffects) {
        lines.push(`  ${effect.label || effect.shape}: ${effect.size}ft at (${effect.origin.x}, ${effect.origin.y})`);
      }
    }

    // Spatial function hints
    lines.push(`\n🗺️ SPATIAL FUNCTIONS:
  Use move_entity(entity_id, target_x, target_y) to move characters
  Use get_distance(from_id, to_id) to calculate exact distance
  Use check_line_of_sight(from_id, to_id) for cover/visibility
  Use get_entities_in_range(center_id, range_feet) for area queries`);

    return lines.join('\n');
  }

  /**
   * Infer the current location from recent messages and campaign context
   * This helps the AI maintain world consistency
   */
  private inferCurrentLocation(
    recentMessages: Array<{ role: string; content: string }>,
    campaignDescription: string | null
  ): string {
    // Look for location hints in recent DM narrations
    const dmMessages = recentMessages
      .filter(m => m.role === 'assistant')
      .slice(-5);
    
    // Common location keywords to look for
    const locationKeywords = {
      tavern: ['tavern', 'inn', 'bar', 'pub', 'ale', 'bartender', 'innkeeper', 'mug', 'drink'],
      forest: ['forest', 'trees', 'woods', 'path', 'trail', 'undergrowth', 'clearing', 'grove'],
      dungeon: ['dungeon', 'corridor', 'chamber', 'stone walls', 'torch', 'darkness', 'crypt'],
      town: ['town', 'village', 'market', 'street', 'square', 'shop', 'merchant', 'crowd'],
      castle: ['castle', 'throne', 'keep', 'tower', 'fortress', 'battlements', 'guards'],
      cave: ['cave', 'cavern', 'stalactite', 'stalagmite', 'underground', 'echoes'],
      road: ['road', 'highway', 'wagon', 'travelers', 'milestone', 'journey'],
      wilderness: ['wilderness', 'plains', 'grassland', 'hills', 'open sky', 'horizon'],
      temple: ['temple', 'altar', 'shrine', 'priest', 'prayers', 'holy', 'sacred'],
      ship: ['ship', 'deck', 'sail', 'ocean', 'sea', 'waves', 'captain', 'crew'],
    };

    // Analyze recent messages for location clues
    const combinedText = dmMessages.map(m => m.content.toLowerCase()).join(' ');
    
    let detectedLocation = 'Unknown location';
    let locationDetails: string[] = [];
    let presentEntities: string[] = [];
    let availableInteractions: string[] = [];

    for (const [location, keywords] of Object.entries(locationKeywords)) {
      const matches = keywords.filter(kw => combinedText.includes(kw));
      if (matches.length >= 2) {
        detectedLocation = location.charAt(0).toUpperCase() + location.slice(1);
        break;
      }
    }

    // Extract mentioned NPCs and objects from recent DM text
    const npcPatterns = [
      /(?:the|a|an)\s+(\w+(?:\s+\w+)?)\s+(?:says|asks|tells|greets|looks|watches|stands|sits)/gi,
      /(?:named|called)\s+"?([^"]+)"?/gi,
    ];
    
    for (const pattern of npcPatterns) {
      let match;
      while ((match = pattern.exec(combinedText)) !== null) {
        if (match[1] && match[1].length > 2 && match[1].length < 30) {
          presentEntities.push(match[1]);
        }
      }
    }

    // Dedupe and limit
    presentEntities = Array.from(new Set(presentEntities)).slice(0, 5);

    // Build the location summary
    let summary = `Location: ${detectedLocation}`;
    
    if (dmMessages.length > 0) {
      // Get the most recent description snippet
      const lastDM = dmMessages[dmMessages.length - 1]?.content || '';
      const firstSentence = lastDM.split(/[.!?]/)[0]?.trim();
      if (firstSentence && firstSentence.length > 20) {
        summary += `\nScene: "${firstSentence.slice(0, 150)}${firstSentence.length > 150 ? '...' : ''}"`;
      }
    }

    if (presentEntities.length > 0) {
      summary += `\nNotable presences: ${presentEntities.join(', ')}`;
    }

    // Add context-appropriate reminders
    switch (detectedLocation.toLowerCase()) {
      case 'tavern':
        summary += '\nTypical elements: Patrons, bartender, tables, drinks, fireplace';
        summary += '\nNOT typically present: Merchants selling goods, wild animals';
        break;
      case 'forest':
        summary += '\nTypical elements: Trees, wildlife, paths, clearings';
        summary += '\nNOT typically present: Shops, merchants, buildings';
        break;
      case 'dungeon':
        summary += '\nTypical elements: Stone corridors, doors, traps, monsters';
        summary += '\nNOT typically present: Friendly NPCs, shops, daylight';
        break;
      case 'town':
        summary += '\nTypical elements: Buildings, citizens, possibly shops (if daytime)';
        break;
      default:
        if (campaignDescription) {
          summary += `\nCampaign context: ${campaignDescription.slice(0, 100)}`;
        }
    }

    return summary;
  }
}

export const stateGuardian = new StateGuardian();
