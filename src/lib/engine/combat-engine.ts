// CombatEngine - Manages D&D 5e combat encounters

import { v4 as uuid } from 'uuid';
import type {
  Combat,
  Combatant,
  CombatantType,
  CombatantStatus,
  CombatOutcome,
  Character,
  MonsterStatBlock,
  ActiveCondition,
  TurnResources,
  InitiativeRollResult,
  DamageType,
} from './types';
import { getAbilityModifier, clampHp } from './types';
import { DiceEngine, diceEngine } from './dice-engine';

export interface CombatStartParams {
  playerCharacters: Character[];
  enemies: { statBlock: MonsterStatBlock; count?: number; id?: string }[];
  allies?: { statBlock: MonsterStatBlock; count?: number; id?: string }[];
  surprisedIds?: string[];
  environmentalEffects?: string[];
}

export interface DamageApplicationResult {
  targetId: string;
  targetName: string;
  previousHp: number;
  damageDealt: number;
  currentHp: number;
  isDefeated: boolean;
  wasAlreadyDefeated: boolean;
  resistanceApplied?: DamageType;
  immunityApplied?: DamageType;
  vulnerabilityApplied?: DamageType;
}

export interface HealingApplicationResult {
  targetId: string;
  targetName: string;
  previousHp: number;
  healingApplied: number;
  currentHp: number;
  maxHp: number;
  wasAtZero: boolean;
}

export class CombatEngine {
  private dice: DiceEngine;

  constructor(diceEngine?: DiceEngine) {
    this.dice = diceEngine ?? new DiceEngine();
  }

  /**
   * Create a combatant from a player character
   */
  createCombatantFromCharacter(character: Character, initiative: InitiativeRollResult['combatants'][0]): Combatant {
    return {
      id: character.id,
      name: character.name,
      type: 'player_character',
      initiative: initiative.total,
      initiativeModifier: initiative.modifier,
      initiativeRoll: initiative.roll,
      currentHp: character.currentHp,
      maxHp: character.maxHp,
      armorClass: character.armorClass,
      speed: character.speed,
      conditions: [...character.conditions],
      status: character.currentHp > 0 ? 'active' : 'defeated',
      turnResources: this.createFreshTurnResources(character.speed),
      sourceId: character.id,
      isMonster: false,
    };
  }

  /**
   * Create a combatant from a monster stat block
   */
  createCombatantFromMonster(
    statBlock: MonsterStatBlock,
    type: CombatantType,
    initiative: InitiativeRollResult['combatants'][0],
    instanceId?: string
  ): Combatant {
    const hp = this.rollMonsterHp(statBlock);
    return {
      id: instanceId ?? uuid(),
      name: statBlock.name,
      type,
      initiative: initiative.total,
      initiativeModifier: initiative.modifier,
      initiativeRoll: initiative.roll,
      currentHp: hp,
      maxHp: hp,
      armorClass: statBlock.armorClass,
      speed: statBlock.speed.walk ?? 30,
      conditions: [],
      status: 'active',
      turnResources: this.createFreshTurnResources(statBlock.speed.walk ?? 30),
      isMonster: true,
      monsterStatBlock: statBlock,
    };
  }

  /**
   * Roll HP for a monster from hit dice
   */
  rollMonsterHp(statBlock: MonsterStatBlock): number {
    try {
      const result = this.dice.roll(statBlock.hitDice);
      return Math.max(1, result.total);
    } catch {
      // If hit dice parsing fails, use static HP
      return statBlock.hitPoints;
    }
  }

  /**
   * Create fresh turn resources
   */
  createFreshTurnResources(speed: number): TurnResources {
    return {
      hasAction: true,
      hasBonusAction: true,
      hasReaction: true,
      movementRemaining: speed,
    };
  }

  /**
   * Start a new combat encounter
   */
  startCombat(params: CombatStartParams): Combat {
    const allInitiativeInputs: { id: string; name: string; type: CombatantType; dexterityModifier: number }[] = [];

    // Add player characters
    for (const pc of params.playerCharacters) {
      allInitiativeInputs.push({
        id: pc.id,
        name: pc.name,
        type: 'player_character',
        dexterityModifier: getAbilityModifier(pc.abilityScores.dexterity),
      });
    }

    // Add enemies
    for (const enemy of params.enemies) {
      const count = enemy.count ?? 1;
      for (let i = 0; i < count; i++) {
        const instanceId = enemy.id ?? `${enemy.statBlock.name.toLowerCase().replace(/\s+/g, '_')}_${i + 1}`;
        allInitiativeInputs.push({
          id: instanceId,
          name: count > 1 ? `${enemy.statBlock.name} ${i + 1}` : enemy.statBlock.name,
          type: 'enemy',
          dexterityModifier: getAbilityModifier(enemy.statBlock.abilityScores.dexterity),
        });
      }
    }

    // Add allies
    if (params.allies) {
      for (const ally of params.allies) {
        const count = ally.count ?? 1;
        for (let i = 0; i < count; i++) {
          const instanceId = ally.id ?? `${ally.statBlock.name.toLowerCase().replace(/\s+/g, '_')}_ally_${i + 1}`;
          allInitiativeInputs.push({
            id: instanceId,
            name: count > 1 ? `${ally.statBlock.name} ${i + 1}` : ally.statBlock.name,
            type: 'ally',
            dexterityModifier: getAbilityModifier(ally.statBlock.abilityScores.dexterity),
          });
        }
      }
    }

    // Roll initiative
    const initiativeResult = this.dice.rollInitiative(allInitiativeInputs);

    // Create combatants
    const combatants: Combatant[] = [];
    const initiativeMap = new Map(initiativeResult.combatants.map((c) => [c.id, c]));

    // Add player characters
    for (const pc of params.playerCharacters) {
      const init = initiativeMap.get(pc.id)!;
      combatants.push(this.createCombatantFromCharacter(pc, init));
    }

    // Add enemies
    for (const enemy of params.enemies) {
      const count = enemy.count ?? 1;
      for (let i = 0; i < count; i++) {
        const instanceId = enemy.id ?? `${enemy.statBlock.name.toLowerCase().replace(/\s+/g, '_')}_${i + 1}`;
        const init = initiativeMap.get(instanceId)!;
        combatants.push(this.createCombatantFromMonster(enemy.statBlock, 'enemy', init, instanceId));
      }
    }

    // Add allies
    if (params.allies) {
      for (const ally of params.allies) {
        const count = ally.count ?? 1;
        for (let i = 0; i < count; i++) {
          const instanceId = ally.id ?? `${ally.statBlock.name.toLowerCase().replace(/\s+/g, '_')}_ally_${i + 1}`;
          const init = initiativeMap.get(instanceId)!;
          combatants.push(this.createCombatantFromMonster(ally.statBlock, 'ally', init, instanceId));
        }
      }
    }

    // Sort by initiative (already sorted from dice.rollInitiative)
    combatants.sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      return b.initiativeModifier - a.initiativeModifier;
    });

    return {
      id: uuid(),
      round: 1,
      initiativeOrder: combatants,
      currentTurnIndex: 0,
      surprisedCombatants: params.surprisedIds ?? [],
      environmentalEffects: params.environmentalEffects ?? [],
      active: true,
    };
  }

  /**
   * Get the current combatant whose turn it is
   */
  getCurrentCombatant(combat: Combat): Combatant | null {
    if (!combat.active || combat.initiativeOrder.length === 0) {
      return null;
    }
    return combat.initiativeOrder[combat.currentTurnIndex] ?? null;
  }

  /**
   * Advance to the next turn
   */
  nextTurn(combat: Combat): Combat {
    if (!combat.active) {
      return combat;
    }

    const activeCombatants = combat.initiativeOrder.filter((c) => c.status === 'active');
    if (activeCombatants.length === 0) {
      return { ...combat, active: false };
    }

    // Reset current combatant's turn resources for next round
    const currentCombatant = combat.initiativeOrder[combat.currentTurnIndex];
    if (currentCombatant) {
      currentCombatant.turnResources = this.createFreshTurnResources(currentCombatant.speed);
    }

    // Find next active combatant
    let nextIndex = combat.currentTurnIndex;
    let roundIncrement = 0;
    let iterations = 0;
    const maxIterations = combat.initiativeOrder.length + 1;

    do {
      nextIndex = (nextIndex + 1) % combat.initiativeOrder.length;
      if (nextIndex === 0) {
        roundIncrement = 1;
      }
      iterations++;
      if (iterations > maxIterations) {
        // Safety: prevent infinite loop
        return { ...combat, active: false };
      }
    } while (combat.initiativeOrder[nextIndex].status !== 'active');

    // Process round change effects
    const newRound = combat.round + roundIncrement;
    let updatedOrder = combat.initiativeOrder;

    if (roundIncrement > 0) {
      // Process condition durations at round end
      updatedOrder = this.processRoundEndConditions(combat.initiativeOrder);

      // Clear surprised status after round 1
      if (combat.round === 1) {
        return {
          ...combat,
          round: newRound,
          currentTurnIndex: nextIndex,
          initiativeOrder: updatedOrder,
          surprisedCombatants: [],
        };
      }
    }

    return {
      ...combat,
      round: newRound,
      currentTurnIndex: nextIndex,
      initiativeOrder: updatedOrder,
    };
  }

  /**
   * Process condition durations at round end
   */
  processRoundEndConditions(combatants: Combatant[]): Combatant[] {
    return combatants.map((c) => {
      const updatedConditions = c.conditions
        .map((cond) => {
          if (cond.durationType === 'rounds' && cond.durationValue !== undefined) {
            const newDuration = cond.durationValue - 1;
            if (newDuration <= 0) {
              return null; // Remove expired condition
            }
            return { ...cond, durationValue: newDuration };
          }
          return cond;
        })
        .filter((c): c is ActiveCondition => c !== null);

      return { ...c, conditions: updatedConditions };
    });
  }

  /**
   * Apply damage to a combatant
   */
  applyDamage(
    combat: Combat,
    targetId: string,
    amount: number,
    damageType: DamageType,
    _source: string
  ): { combat: Combat; result: DamageApplicationResult } {
    const targetIndex = combat.initiativeOrder.findIndex((c) => c.id === targetId);
    if (targetIndex === -1) {
      throw new Error(`Combatant with id ${targetId} not found`);
    }

    const target = combat.initiativeOrder[targetIndex];
    const wasAlreadyDefeated = target.status === 'defeated';

    let actualDamage = amount;

    // Check for damage resistances/immunities/vulnerabilities
    if (target.isMonster && target.monsterStatBlock) {
      const statBlock = target.monsterStatBlock;
      if (statBlock.damageImmunities?.includes(damageType)) {
        actualDamage = 0;
      } else if (statBlock.damageResistances?.includes(damageType)) {
        actualDamage = Math.floor(amount / 2);
      } else if (statBlock.damageVulnerabilities?.includes(damageType)) {
        actualDamage = amount * 2;
      }
    }

    const previousHp = target.currentHp;
    const newHp = clampHp(previousHp - actualDamage, target.maxHp);
    const isDefeated = newHp <= 0;

    const updatedTarget: Combatant = {
      ...target,
      currentHp: newHp,
      status: isDefeated ? 'defeated' : target.status,
    };

    const updatedOrder = [...combat.initiativeOrder];
    updatedOrder[targetIndex] = updatedTarget;

    const result: DamageApplicationResult = {
      targetId,
      targetName: target.name,
      previousHp,
      damageDealt: actualDamage,
      currentHp: newHp,
      isDefeated,
      wasAlreadyDefeated,
    };

    if (actualDamage === 0 && target.isMonster && target.monsterStatBlock?.damageImmunities?.includes(damageType)) {
      result.immunityApplied = damageType;
    } else if (actualDamage < amount && target.isMonster && target.monsterStatBlock?.damageResistances?.includes(damageType)) {
      result.resistanceApplied = damageType;
    } else if (actualDamage > amount && target.isMonster && target.monsterStatBlock?.damageVulnerabilities?.includes(damageType)) {
      result.vulnerabilityApplied = damageType;
    }

    return {
      combat: { ...combat, initiativeOrder: updatedOrder },
      result,
    };
  }

  /**
   * Apply healing to a combatant
   */
  applyHealing(
    combat: Combat,
    targetId: string,
    amount: number,
    _source: string
  ): { combat: Combat; result: HealingApplicationResult } {
    const targetIndex = combat.initiativeOrder.findIndex((c) => c.id === targetId);
    if (targetIndex === -1) {
      throw new Error(`Combatant with id ${targetId} not found`);
    }

    const target = combat.initiativeOrder[targetIndex];
    const previousHp = target.currentHp;
    const wasAtZero = previousHp === 0;
    const newHp = clampHp(previousHp + amount, target.maxHp);
    const actualHealing = newHp - previousHp;

    const updatedTarget: Combatant = {
      ...target,
      currentHp: newHp,
      status: newHp > 0 ? 'active' : target.status,
    };

    const updatedOrder = [...combat.initiativeOrder];
    updatedOrder[targetIndex] = updatedTarget;

    return {
      combat: { ...combat, initiativeOrder: updatedOrder },
      result: {
        targetId,
        targetName: target.name,
        previousHp,
        healingApplied: actualHealing,
        currentHp: newHp,
        maxHp: target.maxHp,
        wasAtZero,
      },
    };
  }

  /**
   * Add a condition to a combatant
   */
  addCondition(combat: Combat, targetId: string, condition: ActiveCondition): Combat {
    const targetIndex = combat.initiativeOrder.findIndex((c) => c.id === targetId);
    if (targetIndex === -1) {
      throw new Error(`Combatant with id ${targetId} not found`);
    }

    const target = combat.initiativeOrder[targetIndex];

    // Check for condition immunity
    if (target.isMonster && target.monsterStatBlock?.conditionImmunities?.includes(condition.condition)) {
      return combat; // Immune, no effect
    }

    // Remove existing instance of same condition
    const filteredConditions = target.conditions.filter((c) => c.condition !== condition.condition);

    const updatedTarget: Combatant = {
      ...target,
      conditions: [...filteredConditions, condition],
    };

    const updatedOrder = [...combat.initiativeOrder];
    updatedOrder[targetIndex] = updatedTarget;

    return { ...combat, initiativeOrder: updatedOrder };
  }

  /**
   * Remove a condition from a combatant
   */
  removeCondition(combat: Combat, targetId: string, conditionName: string): Combat {
    const targetIndex = combat.initiativeOrder.findIndex((c) => c.id === targetId);
    if (targetIndex === -1) {
      throw new Error(`Combatant with id ${targetId} not found`);
    }

    const target = combat.initiativeOrder[targetIndex];
    const updatedConditions = target.conditions.filter((c) => c.condition !== conditionName);

    const updatedTarget: Combatant = {
      ...target,
      conditions: updatedConditions,
    };

    const updatedOrder = [...combat.initiativeOrder];
    updatedOrder[targetIndex] = updatedTarget;

    return { ...combat, initiativeOrder: updatedOrder };
  }

  /**
   * Check if combat should end
   */
  checkCombatEnd(combat: Combat): { shouldEnd: boolean; outcome?: CombatOutcome } {
    const activePlayers = combat.initiativeOrder.filter(
      (c) => c.type === 'player_character' && c.status === 'active'
    );
    const activeEnemies = combat.initiativeOrder.filter(
      (c) => c.type === 'enemy' && c.status === 'active'
    );

    if (activeEnemies.length === 0 && activePlayers.length > 0) {
      return { shouldEnd: true, outcome: 'victory' };
    }

    if (activePlayers.length === 0 && activeEnemies.length > 0) {
      return { shouldEnd: true, outcome: 'defeat' };
    }

    if (activePlayers.length === 0 && activeEnemies.length === 0) {
      return { shouldEnd: true, outcome: 'defeat' }; // Everyone down, party loses
    }

    return { shouldEnd: false };
  }

  /**
   * End combat
   */
  endCombat(combat: Combat, outcome: CombatOutcome): { combat: Combat; xpAwarded: number } {
    let xpAwarded = 0;

    if (outcome === 'victory') {
      // Calculate XP from defeated enemies
      for (const combatant of combat.initiativeOrder) {
        if (combatant.type === 'enemy' && combatant.status === 'defeated' && combatant.monsterStatBlock) {
          xpAwarded += combatant.monsterStatBlock.xp;
        }
      }
    }

    return {
      combat: { ...combat, active: false },
      xpAwarded,
    };
  }

  /**
   * Get a combatant by ID
   */
  getCombatant(combat: Combat, id: string): Combatant | undefined {
    return combat.initiativeOrder.find((c) => c.id === id);
  }

  /**
   * Update a combatant's position
   */
  setPosition(combat: Combat, targetId: string, x: number, y: number): Combat {
    const targetIndex = combat.initiativeOrder.findIndex((c) => c.id === targetId);
    if (targetIndex === -1) {
      throw new Error(`Combatant with id ${targetId} not found`);
    }

    const target = combat.initiativeOrder[targetIndex];
    const updatedTarget: Combatant = {
      ...target,
      position: { x, y },
    };

    const updatedOrder = [...combat.initiativeOrder];
    updatedOrder[targetIndex] = updatedTarget;

    return { ...combat, initiativeOrder: updatedOrder };
  }

  /**
   * Calculate distance between two combatants (in feet, assuming 5ft grid)
   */
  getDistance(combat: Combat, entityAId: string, entityBId: string): number | null {
    const a = this.getCombatant(combat, entityAId);
    const b = this.getCombatant(combat, entityBId);

    if (!a?.position || !b?.position) {
      return null;
    }

    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;

    // D&D uses 5ft grid, diagonal movement = 5ft
    return Math.max(Math.abs(dx), Math.abs(dy)) * 5;
  }

  /**
   * Use turn resources
   */
  useAction(combat: Combat): Combat {
    const current = this.getCurrentCombatant(combat);
    if (!current) return combat;

    const targetIndex = combat.initiativeOrder.findIndex((c) => c.id === current.id);
    const updated: Combatant = {
      ...current,
      turnResources: { ...current.turnResources, hasAction: false },
    };

    const updatedOrder = [...combat.initiativeOrder];
    updatedOrder[targetIndex] = updated;

    return { ...combat, initiativeOrder: updatedOrder };
  }

  useBonusAction(combat: Combat): Combat {
    const current = this.getCurrentCombatant(combat);
    if (!current) return combat;

    const targetIndex = combat.initiativeOrder.findIndex((c) => c.id === current.id);
    const updated: Combatant = {
      ...current,
      turnResources: { ...current.turnResources, hasBonusAction: false },
    };

    const updatedOrder = [...combat.initiativeOrder];
    updatedOrder[targetIndex] = updated;

    return { ...combat, initiativeOrder: updatedOrder };
  }

  useReaction(combat: Combat, combatantId: string): Combat {
    const targetIndex = combat.initiativeOrder.findIndex((c) => c.id === combatantId);
    if (targetIndex === -1) return combat;

    const target = combat.initiativeOrder[targetIndex];
    const updated: Combatant = {
      ...target,
      turnResources: { ...target.turnResources, hasReaction: false },
    };

    const updatedOrder = [...combat.initiativeOrder];
    updatedOrder[targetIndex] = updated;

    return { ...combat, initiativeOrder: updatedOrder };
  }

  useMovement(combat: Combat, feet: number): Combat {
    const current = this.getCurrentCombatant(combat);
    if (!current) return combat;

    const targetIndex = combat.initiativeOrder.findIndex((c) => c.id === current.id);
    const updated: Combatant = {
      ...current,
      turnResources: {
        ...current.turnResources,
        movementRemaining: Math.max(0, current.turnResources.movementRemaining - feet),
      },
    };

    const updatedOrder = [...combat.initiativeOrder];
    updatedOrder[targetIndex] = updated;

    return { ...combat, initiativeOrder: updatedOrder };
  }
}

// Default singleton instance
export const combatEngine = new CombatEngine(diceEngine);
