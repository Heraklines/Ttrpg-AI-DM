import { describe, it, expect, beforeEach } from 'vitest';
import { CombatEngine } from './combat-engine';
import { DiceEngine } from './dice-engine';
import type { Character, MonsterStatBlock } from './types';

describe('CombatEngine', () => {
  let engine: CombatEngine;
  let seededDice: DiceEngine;

  const mockCharacter: Character = {
    id: 'player1',
    campaignId: 'camp1',
    name: 'Thorin',
    race: 'Dwarf',
    className: 'Fighter',
    level: 5,
    abilityScores: {
      strength: 16,
      dexterity: 12,
      constitution: 16,
      intelligence: 10,
      wisdom: 12,
      charisma: 8,
    },
    maxHp: 45,
    currentHp: 45,
    tempHp: 0,
    armorClass: 18,
    speed: 25,
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

  const mockGoblin: MonsterStatBlock = {
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid',
    alignment: 'neutral evil',
    armorClass: 15,
    hitPoints: 7,
    hitDice: '2d6',
    speed: { walk: 30 },
    abilityScores: {
      strength: 8,
      dexterity: 14,
      constitution: 10,
      intelligence: 10,
      wisdom: 8,
      charisma: 8,
    },
    challengeRating: 0.25,
    xp: 50,
    actions: [
      {
        name: 'Scimitar',
        desc: 'Melee Weapon Attack: +4 to hit, 1d6+2 slashing damage',
        attackBonus: 4,
        damage: [{ dice: '1d6+2', type: 'slashing' }],
      },
    ],
  };

  const mockFireElemental: MonsterStatBlock = {
    name: 'Fire Elemental',
    size: 'Large',
    type: 'elemental',
    alignment: 'neutral',
    armorClass: 13,
    hitPoints: 102,
    hitDice: '12d10+36',
    speed: { walk: 50 },
    abilityScores: {
      strength: 10,
      dexterity: 17,
      constitution: 16,
      intelligence: 6,
      wisdom: 10,
      charisma: 7,
    },
    damageResistances: ['bludgeoning', 'piercing', 'slashing'],
    damageImmunities: ['fire', 'poison'],
    conditionImmunities: ['poisoned', 'paralyzed', 'unconscious'],
    challengeRating: 5,
    xp: 1800,
    actions: [
      {
        name: 'Touch',
        desc: 'Melee Weapon Attack: +6 to hit, 2d6+3 fire damage',
        attackBonus: 6,
        damage: [{ dice: '2d6+3', type: 'fire' }],
      },
    ],
  };

  beforeEach(() => {
    // Create seeded dice for predictable results
    let seed = 12345;
    seededDice = new DiceEngine(() => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    });
    engine = new CombatEngine(seededDice);
  });

  describe('startCombat', () => {
    it('should create combat with all combatants', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin, count: 2 }],
      });

      expect(combat.initiativeOrder).toHaveLength(3);
      expect(combat.round).toBe(1);
      expect(combat.currentTurnIndex).toBe(0);
      expect(combat.active).toBe(true);
    });

    it('should sort combatants by initiative', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin, count: 2 }],
      });

      // Verify sorted descending by initiative
      for (let i = 1; i < combat.initiativeOrder.length; i++) {
        expect(combat.initiativeOrder[i - 1].initiative).toBeGreaterThanOrEqual(
          combat.initiativeOrder[i].initiative
        );
      }
    });

    it('should create unique IDs for multiple enemies', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin, count: 3 }],
      });

      const enemies = combat.initiativeOrder.filter((c) => c.type === 'enemy');
      const ids = enemies.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('should track surprised combatants', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
        surprisedIds: ['player1'],
      });

      expect(combat.surprisedCombatants).toContain('player1');
    });

    it('should include environmental effects', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
        environmentalEffects: ['Darkness spell at E4'],
      });

      expect(combat.environmentalEffects).toContain('Darkness spell at E4');
    });
  });

  describe('getCurrentCombatant', () => {
    it('should return the current combatant', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const current = engine.getCurrentCombatant(combat);
      expect(current).toBe(combat.initiativeOrder[0]);
    });

    it('should return null for inactive combat', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const inactiveCombat = { ...combat, active: false };
      expect(engine.getCurrentCombatant(inactiveCombat)).toBeNull();
    });
  });

  describe('nextTurn', () => {
    it('should advance to next combatant', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const firstCombatant = combat.initiativeOrder[0];
      const nextCombat = engine.nextTurn(combat);
      const nextCombatant = engine.getCurrentCombatant(nextCombat);

      expect(nextCombatant?.id).not.toBe(firstCombatant.id);
    });

    it('should increment round when cycling back', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      let currentCombat = combat;
      // Advance through all combatants
      for (let i = 0; i < combat.initiativeOrder.length; i++) {
        currentCombat = engine.nextTurn(currentCombat);
      }

      expect(currentCombat.round).toBe(2);
    });

    it('should skip defeated combatants', () => {
      let combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin, count: 2 }],
      });

      // Defeat the second combatant
      const secondCombatant = combat.initiativeOrder[1];
      const damageResult = engine.applyDamage(combat, secondCombatant.id, 100, 'slashing', 'test');
      combat = damageResult.combat;

      // Advance turn
      combat = engine.nextTurn(combat);
      const current = engine.getCurrentCombatant(combat);

      expect(current?.status).toBe('active');
      expect(current?.id).not.toBe(secondCombatant.id);
    });

    it('should clear surprised after round 1', () => {
      let combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
        surprisedIds: ['player1'],
      });

      expect(combat.surprisedCombatants).toContain('player1');

      // Advance through round 1
      for (let i = 0; i < combat.initiativeOrder.length; i++) {
        combat = engine.nextTurn(combat);
      }

      expect(combat.surprisedCombatants).toHaveLength(0);
    });

    it('should end combat when no active combatants remain', () => {
      let combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      // Defeat everyone
      for (const c of combat.initiativeOrder) {
        const result = engine.applyDamage(combat, c.id, 1000, 'slashing', 'test');
        combat = result.combat;
      }

      combat = engine.nextTurn(combat);
      expect(combat.active).toBe(false);
    });
  });

  describe('applyDamage', () => {
    it('should reduce HP correctly', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const player = combat.initiativeOrder.find((c) => c.type === 'player_character')!;
      const result = engine.applyDamage(combat, player.id, 10, 'slashing', 'goblin attack');

      expect(result.result.previousHp).toBe(45);
      expect(result.result.damageDealt).toBe(10);
      expect(result.result.currentHp).toBe(35);
    });

    it('should not go below 0 HP', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const goblin = combat.initiativeOrder.find((c) => c.type === 'enemy')!;
      const result = engine.applyDamage(combat, goblin.id, 1000, 'slashing', 'massive damage');

      expect(result.result.currentHp).toBe(0);
      expect(result.result.isDefeated).toBe(true);
    });

    it('should mark combatant as defeated at 0 HP', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const goblin = combat.initiativeOrder.find((c) => c.type === 'enemy')!;
      const result = engine.applyDamage(combat, goblin.id, goblin.maxHp, 'slashing', 'lethal');

      const updatedGoblin = result.combat.initiativeOrder.find((c) => c.id === goblin.id)!;
      expect(updatedGoblin.status).toBe('defeated');
    });

    it('should apply damage resistance (half damage)', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockFireElemental }],
      });

      const elemental = combat.initiativeOrder.find((c) => c.type === 'enemy')!;
      const result = engine.applyDamage(combat, elemental.id, 20, 'slashing', 'sword attack');

      expect(result.result.damageDealt).toBe(10); // Halved due to resistance
      expect(result.result.resistanceApplied).toBe('slashing');
    });

    it('should apply damage immunity (no damage)', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockFireElemental }],
      });

      const elemental = combat.initiativeOrder.find((c) => c.type === 'enemy')!;
      const initialHp = elemental.currentHp;
      const result = engine.applyDamage(combat, elemental.id, 50, 'fire', 'fireball');

      expect(result.result.damageDealt).toBe(0);
      expect(result.result.immunityApplied).toBe('fire');
      expect(result.result.currentHp).toBe(initialHp);
    });

    it('should throw error for invalid target', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      expect(() => engine.applyDamage(combat, 'invalid_id', 10, 'slashing', 'test')).toThrow();
    });
  });

  describe('applyHealing', () => {
    it('should increase HP correctly', () => {
      let combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const player = combat.initiativeOrder.find((c) => c.type === 'player_character')!;

      // First damage the player
      const damageResult = engine.applyDamage(combat, player.id, 20, 'slashing', 'damage');
      combat = damageResult.combat;

      // Then heal
      const healResult = engine.applyHealing(combat, player.id, 15, 'cure wounds');

      expect(healResult.result.previousHp).toBe(25);
      expect(healResult.result.healingApplied).toBe(15);
      expect(healResult.result.currentHp).toBe(40);
    });

    it('should not exceed max HP', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const player = combat.initiativeOrder.find((c) => c.type === 'player_character')!;
      const result = engine.applyHealing(combat, player.id, 100, 'mega heal');

      expect(result.result.currentHp).toBe(result.result.maxHp);
      expect(result.result.healingApplied).toBe(0); // Already at max
    });

    it('should reactivate defeated combatant when healed from 0', () => {
      let combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const player = combat.initiativeOrder.find((c) => c.type === 'player_character')!;

      // Defeat the player
      const damageResult = engine.applyDamage(combat, player.id, 100, 'slashing', 'lethal');
      combat = damageResult.combat;

      // Heal them
      const healResult = engine.applyHealing(combat, player.id, 10, 'healing word');
      const updatedPlayer = healResult.combat.initiativeOrder.find((c) => c.id === player.id)!;

      expect(healResult.result.wasAtZero).toBe(true);
      expect(updatedPlayer.status).toBe('active');
      expect(updatedPlayer.currentHp).toBe(10);
    });
  });

  describe('addCondition', () => {
    it('should add condition to combatant', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const goblin = combat.initiativeOrder.find((c) => c.type === 'enemy')!;
      const updatedCombat = engine.addCondition(combat, goblin.id, {
        condition: 'frightened',
        source: 'Thorin intimidation',
        durationType: 'rounds',
        durationValue: 2,
      });

      const updatedGoblin = updatedCombat.initiativeOrder.find((c) => c.id === goblin.id)!;
      expect(updatedGoblin.conditions).toHaveLength(1);
      expect(updatedGoblin.conditions[0].condition).toBe('frightened');
    });

    it('should replace existing condition of same type', () => {
      let combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const goblin = combat.initiativeOrder.find((c) => c.type === 'enemy')!;

      // Add first frightened
      combat = engine.addCondition(combat, goblin.id, {
        condition: 'frightened',
        source: 'Source 1',
        durationType: 'rounds',
        durationValue: 2,
      });

      // Add second frightened (should replace)
      combat = engine.addCondition(combat, goblin.id, {
        condition: 'frightened',
        source: 'Source 2',
        durationType: 'rounds',
        durationValue: 5,
      });

      const updatedGoblin = combat.initiativeOrder.find((c) => c.id === goblin.id)!;
      expect(updatedGoblin.conditions).toHaveLength(1);
      expect(updatedGoblin.conditions[0].source).toBe('Source 2');
      expect(updatedGoblin.conditions[0].durationValue).toBe(5);
    });

    it('should respect condition immunities', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockFireElemental }],
      });

      const elemental = combat.initiativeOrder.find((c) => c.type === 'enemy')!;
      const updatedCombat = engine.addCondition(combat, elemental.id, {
        condition: 'poisoned',
        source: 'poison spray',
        durationType: 'rounds',
        durationValue: 1,
      });

      const updatedElemental = updatedCombat.initiativeOrder.find((c) => c.id === elemental.id)!;
      expect(updatedElemental.conditions).toHaveLength(0); // Immune to poisoned
    });
  });

  describe('removeCondition', () => {
    it('should remove condition from combatant', () => {
      let combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const goblin = combat.initiativeOrder.find((c) => c.type === 'enemy')!;

      combat = engine.addCondition(combat, goblin.id, {
        condition: 'frightened',
        source: 'test',
        durationType: 'rounds',
        durationValue: 2,
      });

      combat = engine.removeCondition(combat, goblin.id, 'frightened');

      const updatedGoblin = combat.initiativeOrder.find((c) => c.id === goblin.id)!;
      expect(updatedGoblin.conditions).toHaveLength(0);
    });
  });

  describe('checkCombatEnd', () => {
    it('should return victory when all enemies defeated', () => {
      let combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin, count: 2 }],
      });

      // Defeat all enemies
      const enemies = combat.initiativeOrder.filter((c) => c.type === 'enemy');
      for (const e of enemies) {
        const result = engine.applyDamage(combat, e.id, 100, 'slashing', 'kill');
        combat = result.combat;
      }

      const { shouldEnd, outcome } = engine.checkCombatEnd(combat);
      expect(shouldEnd).toBe(true);
      expect(outcome).toBe('victory');
    });

    it('should return defeat when all players defeated', () => {
      let combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      // Defeat all players
      const players = combat.initiativeOrder.filter((c) => c.type === 'player_character');
      for (const p of players) {
        const result = engine.applyDamage(combat, p.id, 100, 'slashing', 'kill');
        combat = result.combat;
      }

      const { shouldEnd, outcome } = engine.checkCombatEnd(combat);
      expect(shouldEnd).toBe(true);
      expect(outcome).toBe('defeat');
    });

    it('should not end when both sides have active combatants', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const { shouldEnd } = engine.checkCombatEnd(combat);
      expect(shouldEnd).toBe(false);
    });
  });

  describe('endCombat', () => {
    it('should calculate XP from defeated enemies on victory', () => {
      let combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin, count: 3 }],
      });

      // Defeat all enemies
      const enemies = combat.initiativeOrder.filter((c) => c.type === 'enemy');
      for (const e of enemies) {
        const result = engine.applyDamage(combat, e.id, 100, 'slashing', 'kill');
        combat = result.combat;
      }

      const { xpAwarded } = engine.endCombat(combat, 'victory');
      expect(xpAwarded).toBe(150); // 3 goblins * 50 XP each
    });

    it('should not award XP on defeat', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const { xpAwarded } = engine.endCombat(combat, 'defeat');
      expect(xpAwarded).toBe(0);
    });

    it('should mark combat as inactive', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const { combat: endedCombat } = engine.endCombat(combat, 'fled');
      expect(endedCombat.active).toBe(false);
    });
  });

  describe('turn resources', () => {
    it('should start with full turn resources', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const current = engine.getCurrentCombatant(combat)!;
      expect(current.turnResources.hasAction).toBe(true);
      expect(current.turnResources.hasBonusAction).toBe(true);
      expect(current.turnResources.hasReaction).toBe(true);
      expect(current.turnResources.movementRemaining).toBe(current.speed);
    });

    it('should use action correctly', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const updated = engine.useAction(combat);
      const current = engine.getCurrentCombatant(updated)!;
      expect(current.turnResources.hasAction).toBe(false);
    });

    it('should use bonus action correctly', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const updated = engine.useBonusAction(combat);
      const current = engine.getCurrentCombatant(updated)!;
      expect(current.turnResources.hasBonusAction).toBe(false);
    });

    it('should use movement correctly', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const current = engine.getCurrentCombatant(combat)!;
      const initialMovement = current.turnResources.movementRemaining;

      const updated = engine.useMovement(combat, 15);
      const updatedCurrent = engine.getCurrentCombatant(updated)!;

      expect(updatedCurrent.turnResources.movementRemaining).toBe(initialMovement - 15);
    });

    it('should reset turn resources on new turn', () => {
      let combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      // Use all resources
      combat = engine.useAction(combat);
      combat = engine.useBonusAction(combat);
      combat = engine.useMovement(combat, 100);

      // Go through all turns back to the first combatant
      for (let i = 0; i < combat.initiativeOrder.length; i++) {
        combat = engine.nextTurn(combat);
      }

      const current = engine.getCurrentCombatant(combat)!;
      expect(current.turnResources.hasAction).toBe(true);
      expect(current.turnResources.hasBonusAction).toBe(true);
      expect(current.turnResources.movementRemaining).toBe(current.speed);
    });
  });

  describe('position and distance', () => {
    it('should set position correctly', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const player = combat.initiativeOrder.find((c) => c.type === 'player_character')!;
      const updated = engine.setPosition(combat, player.id, 5, 10);
      const updatedPlayer = engine.getCombatant(updated, player.id)!;

      expect(updatedPlayer.position).toEqual({ x: 5, y: 10 });
    });

    it('should calculate distance between combatants', () => {
      let combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const player = combat.initiativeOrder.find((c) => c.type === 'player_character')!;
      const goblin = combat.initiativeOrder.find((c) => c.type === 'enemy')!;

      combat = engine.setPosition(combat, player.id, 0, 0);
      combat = engine.setPosition(combat, goblin.id, 6, 0);

      const distance = engine.getDistance(combat, player.id, goblin.id);
      expect(distance).toBe(30); // 6 squares * 5ft = 30ft
    });

    it('should return null for combatants without positions', () => {
      const combat = engine.startCombat({
        playerCharacters: [mockCharacter],
        enemies: [{ statBlock: mockGoblin }],
      });

      const player = combat.initiativeOrder.find((c) => c.type === 'player_character')!;
      const goblin = combat.initiativeOrder.find((c) => c.type === 'enemy')!;

      const distance = engine.getDistance(combat, player.id, goblin.id);
      expect(distance).toBeNull();
    });
  });
});
