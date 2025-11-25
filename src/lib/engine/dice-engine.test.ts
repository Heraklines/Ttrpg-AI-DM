import { describe, it, expect, beforeEach } from 'vitest';
import { DiceEngine } from './dice-engine';
import type { Character, Ability, Skill } from './types';

describe('DiceEngine', () => {
  let engine: DiceEngine;
  let seededEngine: DiceEngine;

  beforeEach(() => {
    engine = new DiceEngine();
    // Create a seeded engine for predictable tests
    let seed = 0;
    seededEngine = new DiceEngine(() => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    });
  });

  describe('parseNotation', () => {
    it('should parse standard dice notation', () => {
      expect(engine.parseNotation('2d6')).toEqual({ count: 2, sides: 6, modifier: 0 });
      expect(engine.parseNotation('1d20')).toEqual({ count: 1, sides: 20, modifier: 0 });
      expect(engine.parseNotation('4d8')).toEqual({ count: 4, sides: 8, modifier: 0 });
    });

    it('should parse notation with positive modifier', () => {
      expect(engine.parseNotation('2d6+3')).toEqual({ count: 2, sides: 6, modifier: 3 });
      expect(engine.parseNotation('1d20+5')).toEqual({ count: 1, sides: 20, modifier: 5 });
    });

    it('should parse notation with negative modifier', () => {
      expect(engine.parseNotation('2d6-2')).toEqual({ count: 2, sides: 6, modifier: -2 });
      expect(engine.parseNotation('1d20-1')).toEqual({ count: 1, sides: 20, modifier: -1 });
    });

    it('should handle whitespace', () => {
      expect(engine.parseNotation(' 2d6 + 3 ')).toEqual({ count: 2, sides: 6, modifier: 3 });
    });

    it('should handle uppercase', () => {
      expect(engine.parseNotation('2D6+3')).toEqual({ count: 2, sides: 6, modifier: 3 });
    });

    it('should throw on invalid notation', () => {
      expect(() => engine.parseNotation('invalid')).toThrow();
      expect(() => engine.parseNotation('2d')).toThrow();
      expect(() => engine.parseNotation('d6')).toThrow();
      expect(() => engine.parseNotation('')).toThrow();
    });
  });

  describe('rollDie', () => {
    it('should return values within range', () => {
      for (let i = 0; i < 100; i++) {
        const result = engine.rollDie(6);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
      }
    });

    it('should return values within range for d20', () => {
      for (let i = 0; i < 100; i++) {
        const result = engine.rollDie(20);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('rollDice', () => {
    it('should return correct number of dice', () => {
      const results = engine.rollDice(4, 6);
      expect(results).toHaveLength(4);
      results.forEach((r) => {
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(6);
      });
    });
  });

  describe('roll', () => {
    it('should return a valid result object', () => {
      const result = engine.roll('2d6+3', 'test roll');
      expect(result.notation).toBe('2d6+3');
      expect(result.rolls).toHaveLength(2);
      expect(result.modifier).toBe(3);
      expect(result.total).toBe(result.rolls.reduce((a, b) => a + b, 0) + 3);
      expect(result.reason).toBe('test roll');
    });

    it('should handle negative modifiers correctly', () => {
      const result = engine.roll('1d20-5');
      expect(result.modifier).toBe(-5);
      expect(result.total).toBe(result.rolls[0] - 5);
    });
  });

  describe('rollWithAdvantage', () => {
    it('should return the higher of two rolls', () => {
      const result = seededEngine.rollWithAdvantage();
      expect(result.chosen).toBe(Math.max(result.roll1, result.roll2));
    });
  });

  describe('rollWithDisadvantage', () => {
    it('should return the lower of two rolls', () => {
      const result = seededEngine.rollWithDisadvantage();
      expect(result.chosen).toBe(Math.min(result.roll1, result.roll2));
    });
  });

  describe('rollD20', () => {
    it('should return values 1-20 for normal rolls', () => {
      for (let i = 0; i < 100; i++) {
        const result = engine.rollD20('normal');
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('rollAttack', () => {
    const attacker = { id: 'attacker1', name: 'Warrior' };
    const target = { id: 'target1', name: 'Goblin', armorClass: 15 };

    it('should return a valid attack result', () => {
      const result = engine.rollAttack(attacker, target, 'Longsword', 5);
      expect(result.attackerId).toBe('attacker1');
      expect(result.targetId).toBe('target1');
      expect(result.weapon).toBe('Longsword');
      expect(result.attackBonus).toBe(5);
      expect(result.total).toBe(result.roll + 5);
      expect(result.targetAc).toBe(15);
    });

    it('should handle critical hit on natural 20', () => {
      // Use seeded engine that gives 20
      let callCount = 0;
      const critEngine = new DiceEngine(() => {
        callCount++;
        return 0.95; // Will give 20 on d20
      });
      const result = critEngine.rollAttack(attacker, target, 'Longsword', 5);
      expect(result.roll).toBe(20);
      expect(result.isCriticalHit).toBe(true);
      expect(result.hits).toBe(true);
    });

    it('should handle critical miss on natural 1', () => {
      const critMissEngine = new DiceEngine(() => 0.001); // Will give 1 on d20
      const result = critMissEngine.rollAttack(attacker, target, 'Longsword', 100);
      expect(result.roll).toBe(1);
      expect(result.isCriticalMiss).toBe(true);
      expect(result.hits).toBe(false); // Even with +100 bonus, nat 1 misses
    });

    it('should calculate hits correctly', () => {
      // Force a roll of 10
      const fixedEngine = new DiceEngine(() => 0.45); // ~10 on d20
      const result = fixedEngine.rollAttack(attacker, target, 'Longsword', 5);
      expect(result.roll).toBe(10);
      expect(result.total).toBe(15);
      expect(result.hits).toBe(true); // 15 meets AC 15
    });

    it('should miss when total < AC', () => {
      const fixedEngine = new DiceEngine(() => 0.4); // ~9 on d20
      const result = fixedEngine.rollAttack(attacker, target, 'Longsword', 5);
      expect(result.roll).toBe(9);
      expect(result.total).toBe(14);
      expect(result.hits).toBe(false); // 14 < AC 15
    });
  });

  describe('rollDamage', () => {
    it('should calculate base damage correctly', () => {
      const result = engine.rollDamage('1d8', 'slashing', 3);
      expect(result.rolls[0].dice).toBe('1d8');
      expect(result.modifier).toBe(3);
      expect(result.damageType).toBe('slashing');
      expect(result.totalDamage).toBe(result.baseDamage);
    });

    it('should double dice on critical hit', () => {
      const fixedEngine = new DiceEngine(() => 0.5);
      const result = fixedEngine.rollDamage('1d8', 'slashing', 3, true);
      expect(result.rolls[0].dice).toBe('2d8'); // Doubled
      expect(result.isCritical).toBe(true);
    });

    it('should handle additional damage sources', () => {
      const result = engine.rollDamage('1d8', 'slashing', 3, false, [
        { dice: '2d6', type: 'fire', source: 'Flaming Weapon' },
      ]);
      expect(result.additionalDamage).toHaveLength(1);
      expect(result.additionalDamage[0].type).toBe('fire');
      expect(result.additionalDamage[0].source).toBe('Flaming Weapon');
    });

    it('should not return negative damage', () => {
      const lowEngine = new DiceEngine(() => 0.001);
      const result = lowEngine.rollDamage('1d4', 'bludgeoning', -10);
      expect(result.totalDamage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('rollAbilityCheck', () => {
    const mockCharacter: Character = {
      id: 'char1',
      campaignId: 'camp1',
      name: 'Tester',
      race: 'Human',
      className: 'Fighter',
      level: 5,
      abilityScores: {
        strength: 16,
        dexterity: 14,
        constitution: 14,
        intelligence: 10,
        wisdom: 12,
        charisma: 8,
      },
      maxHp: 40,
      currentHp: 40,
      tempHp: 0,
      armorClass: 16,
      speed: 30,
      hitDiceType: 10,
      hitDiceRemaining: 5,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
      savingThrowProficiencies: ['strength', 'constitution'],
      skillProficiencies: ['athletics', 'perception'],
      skillExpertise: [],
      spellSlots: {},
      knownSpells: [],
      preparedSpells: [],
      classResources: [],
      inventory: [],
      equippedItems: {},
      gold: 0,
      conditions: [],
      features: [],
    };

    it('should calculate ability check correctly', () => {
      const result = engine.rollAbilityCheck(mockCharacter, 'strength', undefined, 15);
      expect(result.characterId).toBe('char1');
      expect(result.ability).toBe('strength');
      expect(result.abilityModifier).toBe(3); // (16-10)/2 = 3
      expect(result.dc).toBe(15);
    });

    it('should add proficiency for proficient skills', () => {
      const result = engine.rollAbilityCheck(mockCharacter, 'strength', 'athletics', 15);
      expect(result.isProficient).toBe(true);
      expect(result.proficiencyBonus).toBe(3); // Level 5 = +3 proficiency
    });

    it('should not add proficiency for non-proficient skills', () => {
      const result = engine.rollAbilityCheck(mockCharacter, 'charisma', 'persuasion', 15);
      expect(result.isProficient).toBe(false);
      expect(result.proficiencyBonus).toBe(0);
    });

    it('should double proficiency for expertise', () => {
      const expertChar = { ...mockCharacter, skillExpertise: ['athletics'] as Skill[] };
      const result = engine.rollAbilityCheck(expertChar, 'strength', 'athletics', 15);
      expect(result.hasExpertise).toBe(true);
      expect(result.proficiencyBonus).toBe(6); // Level 5 = +3 * 2 = 6
    });
  });

  describe('rollSavingThrow', () => {
    const mockCharacter: Character = {
      id: 'char1',
      campaignId: 'camp1',
      name: 'Tester',
      race: 'Human',
      className: 'Fighter',
      level: 5,
      abilityScores: {
        strength: 16,
        dexterity: 14,
        constitution: 14,
        intelligence: 10,
        wisdom: 12,
        charisma: 8,
      },
      maxHp: 40,
      currentHp: 40,
      tempHp: 0,
      armorClass: 16,
      speed: 30,
      hitDiceType: 10,
      hitDiceRemaining: 5,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
      savingThrowProficiencies: ['strength', 'constitution'],
      skillProficiencies: [],
      skillExpertise: [],
      spellSlots: {},
      knownSpells: [],
      preparedSpells: [],
      classResources: [],
      inventory: [],
      equippedItems: {},
      gold: 0,
      conditions: [],
      features: [],
    };

    it('should add proficiency for proficient saves', () => {
      const result = engine.rollSavingThrow(mockCharacter, 'constitution', 15);
      expect(result.isProficient).toBe(true);
      expect(result.proficiencyBonus).toBe(3);
    });

    it('should not add proficiency for non-proficient saves', () => {
      const result = engine.rollSavingThrow(mockCharacter, 'wisdom', 15);
      expect(result.isProficient).toBe(false);
      expect(result.proficiencyBonus).toBe(0);
    });
  });

  describe('rollInitiative', () => {
    it('should sort combatants by initiative total', () => {
      const combatants = [
        { id: '1', name: 'A', type: 'player_character' as const, dexterityModifier: 0 },
        { id: '2', name: 'B', type: 'enemy' as const, dexterityModifier: 5 },
        { id: '3', name: 'C', type: 'ally' as const, dexterityModifier: 2 },
      ];

      const result = engine.rollInitiative(combatants);
      expect(result.combatants).toHaveLength(3);

      // Verify sorted by total (descending)
      for (let i = 1; i < result.combatants.length; i++) {
        expect(result.combatants[i - 1].total).toBeGreaterThanOrEqual(result.combatants[i].total);
      }
    });
  });

  describe('rollDeathSave', () => {
    it('should stabilize on natural 20', () => {
      const critEngine = new DiceEngine(() => 0.95);
      const result = critEngine.rollDeathSave();
      expect(result.roll).toBe(20);
      expect(result.isStabilized).toBe(true);
    });

    it('should be success on 10+', () => {
      const fixedEngine = new DiceEngine(() => 0.5); // ~11 on d20
      const result = fixedEngine.rollDeathSave();
      expect(result.isSuccess).toBe(true);
    });

    it('should be failure on 9-', () => {
      const fixedEngine = new DiceEngine(() => 0.4); // ~9 on d20
      const result = fixedEngine.rollDeathSave();
      expect(result.isSuccess).toBe(false);
    });
  });
});
