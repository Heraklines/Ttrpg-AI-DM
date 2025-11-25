// DiceEngine - Pure TypeScript dice rolling with no external dependencies

import type {
  BasicRollResult,
  AttackRollResult,
  DamageRollResult,
  AbilityCheckResult,
  SavingThrowResult,
  InitiativeRollResult,
  AdvantageStatus,
  Ability,
  Skill,
  DamageType,
  Character,
  Combatant,
  CombatantType,
  DamageSource,
} from './types';
import { getAbilityModifier, getProficiencyBonus, SKILL_ABILITIES } from './types';

export interface DiceNotation {
  count: number;
  sides: number;
  modifier: number;
}

export class DiceEngine {
  private randomFn: () => number;

  constructor(randomFn?: () => number) {
    this.randomFn = randomFn ?? Math.random;
  }

  /**
   * Roll a single die with given number of sides
   */
  rollDie(sides: number): number {
    return Math.floor(this.randomFn() * sides) + 1;
  }

  /**
   * Roll multiple dice with given number of sides
   */
  rollDice(count: number, sides: number): number[] {
    const results: number[] = [];
    for (let i = 0; i < count; i++) {
      results.push(this.rollDie(sides));
    }
    return results;
  }

  /**
   * Parse dice notation string (e.g., "2d6+3", "1d20-1", "4d8")
   */
  parseNotation(notation: string): DiceNotation {
    const normalized = notation.toLowerCase().replace(/\s/g, '');
    const match = normalized.match(/^(\d+)d(\d+)([+-]\d+)?$/);

    if (!match) {
      throw new Error(`Invalid dice notation: ${notation}`);
    }

    return {
      count: parseInt(match[1], 10),
      sides: parseInt(match[2], 10),
      modifier: match[3] ? parseInt(match[3], 10) : 0,
    };
  }

  /**
   * Roll dice from notation string
   */
  roll(notation: string, reason?: string): BasicRollResult {
    const parsed = this.parseNotation(notation);
    const rolls = this.rollDice(parsed.count, parsed.sides);
    const total = rolls.reduce((sum, r) => sum + r, 0) + parsed.modifier;

    return {
      notation,
      rolls,
      modifier: parsed.modifier,
      total,
      reason,
    };
  }

  /**
   * Roll with advantage (roll twice, take higher)
   */
  rollWithAdvantage(): { roll1: number; roll2: number; chosen: number } {
    const roll1 = this.rollDie(20);
    const roll2 = this.rollDie(20);
    return { roll1, roll2, chosen: Math.max(roll1, roll2) };
  }

  /**
   * Roll with disadvantage (roll twice, take lower)
   */
  rollWithDisadvantage(): { roll1: number; roll2: number; chosen: number } {
    const roll1 = this.rollDie(20);
    const roll2 = this.rollDie(20);
    return { roll1, roll2, chosen: Math.min(roll1, roll2) };
  }

  /**
   * Roll a d20 with optional advantage/disadvantage
   */
  rollD20(advantage: AdvantageStatus = 'normal'): number {
    switch (advantage) {
      case 'advantage':
        return this.rollWithAdvantage().chosen;
      case 'disadvantage':
        return this.rollWithDisadvantage().chosen;
      default:
        return this.rollDie(20);
    }
  }

  /**
   * Roll an attack
   */
  rollAttack(
    attacker: { id: string; name: string },
    target: { id: string; name: string; armorClass: number },
    weapon: string,
    attackBonus: number,
    advantage: AdvantageStatus = 'normal'
  ): AttackRollResult {
    const roll = this.rollD20(advantage);
    const total = roll + attackBonus;
    const isCriticalHit = roll === 20;
    const isCriticalMiss = roll === 1;
    const hits = isCriticalHit || (!isCriticalMiss && total >= target.armorClass);

    return {
      attackerId: attacker.id,
      attackerName: attacker.name,
      targetId: target.id,
      targetName: target.name,
      weapon,
      roll,
      attackBonus,
      total,
      targetAc: target.armorClass,
      hits,
      isCriticalHit,
      isCriticalMiss,
      advantageUsed: advantage,
    };
  }

  /**
   * Roll an attack for a character with proper bonuses calculated
   */
  rollCharacterAttack(
    character: Character,
    target: { id: string; name: string; armorClass: number },
    weapon: string,
    abilityUsed: Ability,
    isProficient: boolean,
    weaponBonus: number = 0,
    advantage: AdvantageStatus = 'normal'
  ): AttackRollResult {
    const abilityMod = getAbilityModifier(character.abilityScores[abilityUsed]);
    const profBonus = isProficient ? getProficiencyBonus(character.level) : 0;
    const attackBonus = abilityMod + profBonus + weaponBonus;

    return this.rollAttack(
      { id: character.id, name: character.name },
      target,
      weapon,
      attackBonus,
      advantage
    );
  }

  /**
   * Roll damage
   */
  rollDamage(
    damageDice: string,
    damageType: DamageType,
    modifier: number = 0,
    isCritical: boolean = false,
    additionalDamage: DamageSource[] = []
  ): DamageRollResult {
    const parsed = this.parseNotation(damageDice);
    const diceCount = isCritical ? parsed.count * 2 : parsed.count;

    const mainRolls = this.rollDice(diceCount, parsed.sides);
    const baseDamage = mainRolls.reduce((sum, r) => sum + r, 0) + modifier;

    const additionalRolls: { amount: number; type: DamageType; source: string }[] = [];
    let additionalTotal = 0;

    for (const source of additionalDamage) {
      const sourceParsed = this.parseNotation(source.dice);
      const sourceDiceCount = isCritical ? sourceParsed.count * 2 : sourceParsed.count;
      const sourceRolls = this.rollDice(sourceDiceCount, sourceParsed.sides);
      const sourceTotal = sourceRolls.reduce((sum, r) => sum + r, 0) + sourceParsed.modifier;
      additionalRolls.push({ amount: sourceTotal, type: source.type, source: source.source });
      additionalTotal += sourceTotal;
    }

    return {
      rolls: [
        { dice: isCritical ? `${diceCount}d${parsed.sides}` : damageDice, results: mainRolls, total: mainRolls.reduce((s, r) => s + r, 0) },
      ],
      modifier,
      baseDamage,
      damageType,
      additionalDamage: additionalRolls,
      totalDamage: Math.max(0, baseDamage + additionalTotal),
      isCritical,
    };
  }

  /**
   * Roll an ability check
   */
  rollAbilityCheck(
    character: Character,
    ability: Ability,
    skill: Skill | undefined,
    dc: number,
    advantage: AdvantageStatus = 'normal'
  ): AbilityCheckResult {
    const roll = this.rollD20(advantage);
    const abilityMod = getAbilityModifier(character.abilityScores[ability]);

    let isProficient = false;
    let hasExpertise = false;
    let profBonus = 0;

    if (skill) {
      isProficient = character.skillProficiencies.includes(skill);
      hasExpertise = character.skillExpertise.includes(skill);
      if (isProficient || hasExpertise) {
        profBonus = getProficiencyBonus(character.level);
        if (hasExpertise) {
          profBonus *= 2;
        }
      }
    }

    const total = roll + abilityMod + profBonus;
    const isCriticalSuccess = roll === 20;
    const isCriticalFailure = roll === 1;

    return {
      characterId: character.id,
      characterName: character.name,
      ability,
      skill,
      roll,
      abilityModifier: abilityMod,
      proficiencyBonus: profBonus,
      isProficient,
      hasExpertise,
      otherModifiers: 0,
      total,
      dc,
      success: total >= dc,
      isCriticalSuccess,
      isCriticalFailure,
      advantageUsed: advantage,
    };
  }

  /**
   * Roll a saving throw
   */
  rollSavingThrow(
    character: Character,
    ability: Ability,
    dc: number,
    advantage: AdvantageStatus = 'normal'
  ): SavingThrowResult {
    const roll = this.rollD20(advantage);
    const abilityMod = getAbilityModifier(character.abilityScores[ability]);
    const isProficient = character.savingThrowProficiencies.includes(ability);
    const profBonus = isProficient ? getProficiencyBonus(character.level) : 0;
    const total = roll + abilityMod + profBonus;

    return {
      characterId: character.id,
      characterName: character.name,
      ability,
      roll,
      modifier: abilityMod,
      proficiencyBonus: profBonus,
      isProficient,
      total,
      dc,
      success: total >= dc,
      isCriticalSuccess: roll === 20,
      isCriticalFailure: roll === 1,
      advantageUsed: advantage,
    };
  }

  /**
   * Roll initiative for all combatants
   */
  rollInitiative(
    combatants: { id: string; name: string; type: CombatantType; dexterityModifier: number }[]
  ): InitiativeRollResult {
    const results = combatants.map((c) => {
      const roll = this.rollDie(20);
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        roll,
        modifier: c.dexterityModifier,
        total: roll + c.dexterityModifier,
      };
    });

    // Sort by total (highest first), then by modifier (highest first for ties)
    results.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return b.modifier - a.modifier;
    });

    return { combatants: results };
  }

  /**
   * Roll a death saving throw
   */
  rollDeathSave(): { roll: number; isStabilized: boolean; isDead: boolean; isSuccess: boolean } {
    const roll = this.rollDie(20);

    if (roll === 20) {
      return { roll, isStabilized: true, isDead: false, isSuccess: true };
    }
    if (roll === 1) {
      return { roll, isStabilized: false, isDead: false, isSuccess: false }; // Counts as 2 failures
    }

    return {
      roll,
      isStabilized: false,
      isDead: false,
      isSuccess: roll >= 10,
    };
  }
}

// Default singleton instance
export const diceEngine = new DiceEngine();
