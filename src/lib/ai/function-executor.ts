// Function Executor - Executes AI function calls and returns results

import { diceEngine } from '@/lib/engine/dice-engine';
import { combatEngine } from '@/lib/engine/combat-engine';
import type { Character, Combat, ActiveCondition, Ability, Skill, DamageType } from '@/lib/engine/types';

interface FunctionCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface FunctionResult {
  name: string;
  success: boolean;
  result: unknown;
  displayText: string;
}

interface ExecutionContext {
  characters: Map<string, Character>;
  combat: Combat | null;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  updateCombat: (combat: Combat | null) => void;
}

export function executeFunction(call: FunctionCall, context: ExecutionContext): FunctionResult {
  const { name, arguments: args } = call;

  try {
    switch (name) {
      case 'roll_dice': {
        const notation = args.notation as string;
        const roll = diceEngine.roll(notation);
        return {
          name,
          success: true,
          result: roll,
          displayText: `🎲 ${notation} = ${roll.total} [${roll.rolls.join(', ')}${roll.modifier ? (roll.modifier > 0 ? ` +${roll.modifier}` : ` ${roll.modifier}`) : ''}]`,
        };
      }

      case 'roll_attack': {
        const attackerId = args.attacker_id as string;
        const targetId = args.target_id as string;
        const advantage = args.advantage_status as 'normal' | 'advantage' | 'disadvantage' || 'normal';
        
        const attacker = context.characters.get(attackerId);
        const target = context.characters.get(targetId);
        
        // Use strength mod + 2 (proficiency) as default attack bonus
        const attackBonus = attacker ? Math.floor((attacker.abilityScores.strength - 10) / 2) + 2 : 2;
        const targetAC = target?.armorClass || 10;
        
        const attackerInfo = { id: attackerId, name: attacker?.name || attackerId };
        const targetInfo = { id: targetId, name: target?.name || targetId, armorClass: targetAC };
        const weapon = args.weapon as string || 'weapon';
        
        const roll = diceEngine.rollAttack(attackerInfo, targetInfo, weapon, attackBonus, advantage);
        
        return {
          name,
          success: true,
          result: roll,
          displayText: `🎯 Attack Roll: ${roll.roll}${roll.attackBonus >= 0 ? '+' : ''}${roll.attackBonus} = ${roll.total} vs AC ${targetAC} - ${roll.hits ? (roll.isCriticalHit ? 'CRITICAL HIT!' : 'HIT!') : (roll.isCriticalMiss ? 'CRITICAL MISS!' : 'MISS')}`,
        };
      }

      case 'roll_damage': {
        const isCritical = args.is_critical as boolean || false;
        const damageDice = args.damage_dice as string || '1d8';
        const modifier = args.damage_modifier as number || 3;
        const damageType = (args.damage_type as DamageType) || 'slashing';
        
        const roll = diceEngine.rollDamage(damageDice, damageType, modifier, isCritical);
        
        return {
          name,
          success: true,
          result: roll,
          displayText: `💥 Damage: ${isCritical ? '(CRITICAL) ' : ''}${roll.totalDamage} ${damageType}`,
        };
      }

      case 'roll_ability_check': {
        const characterId = args.character_id as string;
        const ability = args.ability as Ability;
        const skill = args.skill as Skill | undefined;
        const dc = args.dc as number;
        const advantage = args.advantage_status as 'normal' | 'advantage' | 'disadvantage' || 'normal';
        
        // Find character by ID or name
        let character = context.characters.get(characterId);
        if (!character) {
          // Try to find by name (case insensitive)
          context.characters.forEach((char) => {
            if (char.name.toLowerCase() === characterId.toLowerCase()) {
              character = char;
            }
          });
        }
        
        if (!character) {
          // Create a default character for the roll
          const defaultChar: Character = {
            id: characterId,
            campaignId: '',
            name: characterId,
            race: 'Human',
            className: 'Fighter',
            level: 1,
            abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
            maxHp: 10,
            currentHp: 10,
            tempHp: 0,
            armorClass: 10,
            speed: 30,
            hitDiceType: 10,
            hitDiceRemaining: 1,
            deathSaveSuccesses: 0,
            deathSaveFailures: 0,
            savingThrowProficiencies: [],
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
          character = defaultChar;
        }
        
        const roll = diceEngine.rollAbilityCheck(character, ability, skill, dc, advantage);
        const skillName = skill ? skill.replace('_', ' ') : ability;
        const totalMod = roll.abilityModifier + roll.proficiencyBonus + roll.otherModifiers;
        
        return {
          name,
          success: true,
          result: roll,
          displayText: `🎲 ${skillName.charAt(0).toUpperCase() + skillName.slice(1)} Check: ${roll.roll}${totalMod >= 0 ? '+' : ''}${totalMod} = ${roll.total} vs DC ${dc} - ${roll.success ? 'SUCCESS!' : 'FAILURE'}`,
        };
      }

      case 'roll_saving_throw': {
        const characterId = args.character_id as string;
        const ability = args.ability as Ability;
        const dc = args.dc as number;
        const advantage = args.advantage_status as 'normal' | 'advantage' | 'disadvantage' || 'normal';
        
        let character = context.characters.get(characterId);
        if (!character) {
          context.characters.forEach((char) => {
            if (char.name.toLowerCase() === characterId.toLowerCase()) {
              character = char;
            }
          });
        }
        
        if (!character) {
          // Simple roll without character
          const roll = diceEngine.rollD20(advantage);
          const success = roll >= dc;
          return {
            name,
            success: true,
            result: { roll, total: roll, dc, success },
            displayText: `🛡️ ${ability.charAt(0).toUpperCase() + ability.slice(1)} Save: ${roll} vs DC ${dc} - ${success ? 'SAVE!' : 'FAIL'}`,
          };
        }
        
        const roll = diceEngine.rollSavingThrow(character, ability, dc, advantage);
        const totalMod = roll.modifier + roll.proficiencyBonus;
        
        return {
          name,
          success: true,
          result: roll,
          displayText: `🛡️ ${ability.charAt(0).toUpperCase() + ability.slice(1)} Save: ${roll.roll}${totalMod >= 0 ? '+' : ''}${totalMod} = ${roll.total} vs DC ${dc} - ${roll.success ? 'SAVE!' : 'FAIL'}`,
        };
      }

      case 'apply_damage': {
        const targetId = args.target_id as string;
        const amount = args.amount as number;
        const damageType = args.damage_type as string;
        
        let character: Character | undefined;
        context.characters.forEach((char, key) => {
          if (key === targetId || char.name.toLowerCase() === targetId.toLowerCase()) {
            character = char;
          }
        });
        
        if (!character) {
          return { name, success: false, result: null, displayText: `Target ${targetId} not found` };
        }
        
        const oldHp = character.currentHp;
        const newHp = Math.max(0, oldHp - amount);
        context.updateCharacter(character.id, { currentHp: newHp });
        
        const status = newHp === 0 ? ' - UNCONSCIOUS!' : '';
        
        return {
          name,
          success: true,
          result: { oldHp, newHp, damage: amount },
          displayText: `💔 ${character.name} takes ${amount} ${damageType} damage (HP: ${oldHp} → ${newHp})${status}`,
        };
      }

      case 'apply_healing': {
        const targetId = args.target_id as string;
        const amount = args.amount as number;
        
        let character: Character | undefined;
        context.characters.forEach((char, key) => {
          if (key === targetId || char.name.toLowerCase() === targetId.toLowerCase()) {
            character = char;
          }
        });
        
        if (!character) {
          return { name, success: false, result: null, displayText: `Target ${targetId} not found` };
        }
        
        const oldHp = character.currentHp;
        const newHp = Math.min(character.maxHp, oldHp + amount);
        context.updateCharacter(character.id, { currentHp: newHp });
        
        return {
          name,
          success: true,
          result: { oldHp, newHp, healed: newHp - oldHp },
          displayText: `💚 ${character.name} heals ${newHp - oldHp} HP (HP: ${oldHp} → ${newHp})`,
        };
      }

      case 'add_condition': {
        const targetId = args.target_id as string;
        const condition = args.condition as string;
        const duration = args.duration_value as number || 0;
        const durationType = args.duration_type as string || 'until_dispelled';
        
        let character: Character | undefined;
        context.characters.forEach((char, key) => {
          if (key === targetId || char.name.toLowerCase() === targetId.toLowerCase()) {
            character = char;
          }
        });
        
        if (!character) {
          return { name, success: false, result: null, displayText: `Target ${targetId} not found` };
        }
        
        const newCondition: ActiveCondition = {
          condition: condition as ActiveCondition['condition'],
          source: args.source as string || 'Unknown',
          durationType: durationType as ActiveCondition['durationType'],
          durationValue: durationType === 'rounds' ? duration : undefined,
          saveDc: args.save_dc as number,
          saveAbility: args.save_ability as Ability,
        };
        
        const conditions = [...character.conditions, newCondition];
        context.updateCharacter(character.id, { conditions });
        
        return {
          name,
          success: true,
          result: newCondition,
          displayText: `⚠️ ${character.name} is now ${condition}!`,
        };
      }

      case 'remove_condition': {
        const targetId = args.target_id as string;
        const condition = args.condition as string;
        
        let character: Character | undefined;
        context.characters.forEach((char, key) => {
          if (key === targetId || char.name.toLowerCase() === targetId.toLowerCase()) {
            character = char;
          }
        });
        
        if (!character) {
          return { name, success: false, result: null, displayText: `Target ${targetId} not found` };
        }
        
        const conditions = character.conditions.filter(c => c.condition !== condition);
        context.updateCharacter(character.id, { conditions });
        
        return {
          name,
          success: true,
          result: { removed: condition },
          displayText: `✨ ${character.name} is no longer ${condition}`,
        };
      }

      case 'start_combat': {
        return {
          name,
          success: true,
          result: { message: 'Combat initialization requested' },
          displayText: '⚔️ Combat begins! Roll for initiative!',
        };
      }

      case 'get_combat_status': {
        if (!context.combat) {
          return {
            name,
            success: true,
            result: { inCombat: false },
            displayText: '📊 No active combat',
          };
        }

        const current = context.combat.initiativeOrder[context.combat.currentTurnIndex];
        const alive = context.combat.initiativeOrder.filter(c => c.status === 'active');
        
        return {
          name,
          success: true,
          result: {
            inCombat: true,
            round: context.combat.round,
            currentTurn: current?.name,
            combatantsAlive: alive.length,
            initiativeOrder: context.combat.initiativeOrder.map(c => ({
              name: c.name,
              hp: c.currentHp,
              maxHp: c.maxHp,
              status: c.status,
            })),
          },
          displayText: `📊 Combat Round ${context.combat.round} - ${current?.name}'s turn. ${alive.length} combatants active.`,
        };
      }

      case 'next_turn': {
        if (!context.combat) {
          return { name, success: false, result: null, displayText: 'No active combat' };
        }
        
        const updated = combatEngine.nextTurn(context.combat);
        context.updateCombat(updated);
        
        const current = updated.initiativeOrder[updated.currentTurnIndex];
        
        return {
          name,
          success: true,
          result: { round: updated.round, currentTurn: current.name },
          displayText: `⏭️ Round ${updated.round} - ${current.name}'s turn`,
        };
      }

      case 'end_combat': {
        const outcome = args.outcome as string;
        
        if (context.combat) {
          const { xpAwarded } = combatEngine.endCombat(context.combat, outcome as 'victory' | 'defeat' | 'fled' | 'negotiated');
          context.updateCombat(null);
          
          return {
            name,
            success: true,
            result: { outcome, xpAwarded },
            displayText: `🏁 Combat ended: ${outcome}${xpAwarded > 0 ? ` (+${xpAwarded} XP)` : ''}`,
          };
        }
        
        return { name, success: true, result: { outcome }, displayText: `🏁 Combat ended: ${outcome}` };
      }

      case 'get_character': {
        const characterId = args.character_id as string;
        
        let character: Character | undefined;
        context.characters.forEach((char, key) => {
          if (key === characterId || char.name.toLowerCase() === characterId.toLowerCase()) {
            character = char;
          }
        });
        
        if (!character) {
          return { name, success: false, result: null, displayText: `Character ${characterId} not found` };
        }
        
        return {
          name,
          success: true,
          result: character,
          displayText: `📋 ${character.name}: Level ${character.level} ${character.race} ${character.className}, HP ${character.currentHp}/${character.maxHp}, AC ${character.armorClass}`,
        };
      }

      case 'modify_inventory': {
        const characterId = args.character_id as string;
        const action = args.action as 'add' | 'remove' | 'use' | 'equip';
        const itemName = args.item_name as string;
        const quantity = (args.quantity as number) || 1;
        
        let character: Character | undefined;
        context.characters.forEach((char, key) => {
          if (key === characterId || char.name.toLowerCase() === characterId.toLowerCase()) {
            character = char;
          }
        });
        
        if (!character) {
          return { name, success: false, result: null, displayText: `Character ${characterId} not found` };
        }
        
        const inventory = [...character.inventory];
        const existingIndex = inventory.findIndex(i => i.name.toLowerCase() === itemName.toLowerCase());
        
        switch (action) {
          case 'add':
            if (existingIndex >= 0) {
              inventory[existingIndex].quantity += quantity;
            } else {
              inventory.push({ name: itemName, quantity });
            }
            context.updateCharacter(character.id, { inventory });
            return {
              name,
              success: true,
              result: { action, item: itemName, quantity },
              displayText: `📦 ${character.name} gained ${quantity}x ${itemName}`,
            };
            
          case 'remove':
          case 'use':
            if (existingIndex < 0) {
              return { name, success: false, result: null, displayText: `${character.name} doesn't have ${itemName}` };
            }
            inventory[existingIndex].quantity -= quantity;
            if (inventory[existingIndex].quantity <= 0) {
              inventory.splice(existingIndex, 1);
            }
            context.updateCharacter(character.id, { inventory });
            return {
              name,
              success: true,
              result: { action, item: itemName, quantity },
              displayText: `📦 ${character.name} ${action === 'use' ? 'used' : 'removed'} ${quantity}x ${itemName}`,
            };
            
          case 'equip':
            const equippedItems = { ...character.equippedItems };
            equippedItems.mainHand = itemName;
            context.updateCharacter(character.id, { equippedItems });
            return {
              name,
              success: true,
              result: { action, item: itemName },
              displayText: `⚔️ ${character.name} equipped ${itemName}`,
            };
            
          default:
            return { name, success: false, result: null, displayText: `Unknown inventory action: ${action}` };
        }
      }

      case 'use_resource': {
        const characterId = args.character_id as string;
        const resourceType = args.resource_type as string;
        const amount = (args.amount as number) || 1;
        const level = args.level as number | undefined;
        
        let character: Character | undefined;
        context.characters.forEach((char, key) => {
          if (key === characterId || char.name.toLowerCase() === characterId.toLowerCase()) {
            character = char;
          }
        });
        
        if (!character) {
          return { name, success: false, result: null, displayText: `Character ${characterId} not found` };
        }
        
        // Handle spell slots
        if (resourceType === 'spell_slot' && level !== undefined) {
          const spellSlots = { ...character.spellSlots };
          if (!spellSlots[level] || spellSlots[level].current < amount) {
            return { name, success: false, result: null, displayText: `${character.name} doesn't have enough level ${level} spell slots` };
          }
          spellSlots[level].current -= amount;
          context.updateCharacter(character.id, { spellSlots });
          return {
            name,
            success: true,
            result: { resource: `Level ${level} spell slot`, remaining: spellSlots[level].current },
            displayText: `✨ ${character.name} used a level ${level} spell slot (${spellSlots[level].current}/${spellSlots[level].max} remaining)`,
          };
        }
        
        // Handle class resources
        const classResources = [...character.classResources];
        const resourceIndex = classResources.findIndex(r => r.name.toLowerCase() === resourceType.toLowerCase());
        
        if (resourceIndex < 0) {
          return { name, success: false, result: null, displayText: `${character.name} doesn't have resource: ${resourceType}` };
        }
        
        if (classResources[resourceIndex].current < amount) {
          return { name, success: false, result: null, displayText: `${character.name} doesn't have enough ${resourceType}` };
        }
        
        classResources[resourceIndex].current -= amount;
        context.updateCharacter(character.id, { classResources });
        
        return {
          name,
          success: true,
          result: { resource: resourceType, remaining: classResources[resourceIndex].current },
          displayText: `✨ ${character.name} used ${amount} ${resourceType} (${classResources[resourceIndex].current}/${classResources[resourceIndex].max} remaining)`,
        };
      }

      case 'set_flag': {
        const flagName = args.flag_name as string;
        const value = args.value;
        
        // Note: This would need to be handled by updating game state through context
        return {
          name,
          success: true,
          result: { flag: flagName, value },
          displayText: `🚩 Flag set: ${flagName} = ${JSON.stringify(value)}`,
        };
      }

      case 'check_flag': {
        const flagName = args.flag_name as string;
        
        // Note: This would need access to game state flags
        return {
          name,
          success: true,
          result: { flag: flagName, value: null },
          displayText: `🔍 Flag ${flagName}: not set`,
        };
      }

      case 'advance_time': {
        const hours = (args.hours as number) || 0;
        const minutes = (args.minutes as number) || 0;
        
        return {
          name,
          success: true,
          result: { hoursAdvanced: hours, minutesAdvanced: minutes },
          displayText: `⏰ Time advanced by ${hours > 0 ? `${hours} hour(s)` : ''}${hours > 0 && minutes > 0 ? ' and ' : ''}${minutes > 0 ? `${minutes} minute(s)` : ''}`,
        };
      }

      case 'set_location': {
        const locationName = args.location_name as string;
        const locationType = args.location_type as string || 'other';
        const description = args.description as string || '';
        
        return {
          name,
          success: true,
          result: { 
            locationName, 
            locationType, 
            description,
            shouldPersist: true 
          },
          displayText: `📍 Location changed: ${locationName} (${locationType})`,
        };
      }

      case 'short_rest': {
        const characterId = args.character_id as string;
        const hitDiceToSpend = (args.hit_dice_to_spend as number) || 0;
        
        let character: Character | undefined;
        context.characters.forEach((char, key) => {
          if (key === characterId || char.name.toLowerCase() === characterId.toLowerCase()) {
            character = char;
          }
        });
        
        if (!character) {
          return { name, success: false, result: null, displayText: `Character ${characterId} not found` };
        }
        
        let totalHealing = 0;
        let diceSpent = 0;
        const conMod = Math.floor((character.abilityScores.constitution - 10) / 2);
        
        if (hitDiceToSpend > 0 && character.hitDiceRemaining > 0) {
          diceSpent = Math.min(hitDiceToSpend, character.hitDiceRemaining);
          
          for (let i = 0; i < diceSpent; i++) {
            const roll = diceEngine.roll(`1d${character.hitDiceType}`);
            totalHealing += Math.max(1, roll.total + conMod);
          }
          
          const newHitDice = character.hitDiceRemaining - diceSpent;
          const newHp = Math.min(character.maxHp, character.currentHp + totalHealing);
          
          context.updateCharacter(character.id, { 
            currentHp: newHp,
            hitDiceRemaining: newHitDice
          });
        }
        
        const classResources = character.classResources
          .filter(r => r.rechargeOn === 'short_rest')
          .map(r => ({ ...r, current: r.max }));
        
        if (classResources.length > 0) {
          context.updateCharacter(character.id, { classResources: [...character.classResources] });
        }
        
        return {
          name,
          success: true,
          result: { healed: totalHealing, hitDiceSpent: diceSpent },
          displayText: `😴 ${character.name} takes a short rest${diceSpent > 0 ? `, spending ${diceSpent} hit di${diceSpent === 1 ? 'e' : 'ce'} to recover ${totalHealing} HP` : ''}`,
        };
      }

      case 'long_rest': {
        const characterId = args.character_id as string;
        
        let character: Character | undefined;
        context.characters.forEach((char, key) => {
          if (key === characterId || char.name.toLowerCase() === characterId.toLowerCase()) {
            character = char;
          }
        });
        
        if (!character) {
          return { name, success: false, result: null, displayText: `Character ${characterId} not found` };
        }
        
        const hpRecovered = character.maxHp - character.currentHp;
        const hitDiceRecovered = Math.max(1, Math.floor(character.level / 2));
        const newHitDice = Math.min(character.level, character.hitDiceRemaining + hitDiceRecovered);
        
        const restoredSlots: Record<number, { current: number; max: number }> = {};
        Object.entries(character.spellSlots).forEach(([level, slot]) => {
          restoredSlots[parseInt(level)] = { current: slot.max, max: slot.max };
        });
        
        const restoredResources = character.classResources.map(r => ({ ...r, current: r.max }));
        
        context.updateCharacter(character.id, { 
          currentHp: character.maxHp,
          hitDiceRemaining: newHitDice,
          spellSlots: restoredSlots,
          classResources: restoredResources,
          conditions: character.conditions.filter(c => c.durationType !== 'until_long_rest')
        });
        
        return {
          name,
          success: true,
          result: { 
            hpRecovered, 
            hitDiceRecovered,
            fullHeal: true
          },
          displayText: `🌙 ${character.name} completes a long rest! Fully healed, recovered ${hitDiceRecovered} hit di${hitDiceRecovered === 1 ? 'e' : 'ce'}, and all spell slots restored.`,
        };
      }

      case 'lookup_monster': {
        const monsterName = args.monster_name as string;
        
        // This would typically fetch from the D&D API or cache
        return {
          name,
          success: true,
          result: { monster: monsterName, note: 'Use /api/rules/monster/[name] for full stats' },
          displayText: `📖 Monster lookup: ${monsterName}`,
        };
      }

      case 'lookup_spell': {
        const spellName = args.spell_name as string;
        
        return {
          name,
          success: true,
          result: { spell: spellName, note: 'Use /api/rules/spell/[name] for full details' },
          displayText: `📖 Spell lookup: ${spellName}`,
        };
      }

      case 'lookup_condition': {
        const conditionName = args.condition_name as string;
        
        return {
          name,
          success: true,
          result: { condition: conditionName, note: 'Use /api/rules/condition/[name] for effects' },
          displayText: `📖 Condition lookup: ${conditionName}`,
        };
      }

      // ==================== SPATIAL FUNCTIONS ====================
      
      case 'get_position': {
        const entityId = args.entity_id as string;
        const entity = context.characters.get(entityId);
        
        // Position would be stored in extended context with map data
        // For now, return placeholder that spatial API would populate
        return {
          name,
          success: true,
          result: { entityId, position: null, note: 'Position from spatial context' },
          displayText: `📍 Getting position for ${entity?.name || entityId}`,
        };
      }

      case 'move_entity': {
        const entityId = args.entity_id as string;
        const targetX = args.target_x as number;
        const targetY = args.target_y as number;
        const entity = context.characters.get(entityId);
        
        // Movement would be validated by SpatialEngine
        return {
          name,
          success: true,
          result: { 
            entityId, 
            targetPosition: { x: targetX, y: targetY },
            note: 'Movement validated by spatial engine'
          },
          displayText: `🚶 ${entity?.name || entityId} moves to (${targetX}, ${targetY})`,
        };
      }

      case 'get_distance': {
        const fromId = args.from_id as string;
        const toId = args.to_id as string;
        const fromEntity = context.characters.get(fromId);
        const toEntity = context.characters.get(toId);
        
        // Distance calculated by SpatialEngine
        return {
          name,
          success: true,
          result: { fromId, toId, distance: null, note: 'Distance from spatial engine' },
          displayText: `📏 Distance from ${fromEntity?.name || fromId} to ${toEntity?.name || toId}`,
        };
      }

      case 'check_line_of_sight': {
        const fromId = args.from_id as string;
        const toId = args.to_id as string;
        const fromEntity = context.characters.get(fromId);
        const toEntity = context.characters.get(toId);
        
        // LoS calculated by SpatialEngine
        return {
          name,
          success: true,
          result: { fromId, toId, hasLoS: null, cover: null, note: 'LoS from spatial engine' },
          displayText: `👁️ Checking line of sight from ${fromEntity?.name || fromId} to ${toEntity?.name || toId}`,
        };
      }

      case 'get_entities_in_range': {
        const centerId = args.center_id as string;
        const range = args.range_feet as number;
        const entityTypes = args.entity_types as string[] | undefined;
        const centerEntity = context.characters.get(centerId);
        
        return {
          name,
          success: true,
          result: { centerId, range, entityTypes, entities: [], note: 'Query from spatial engine' },
          displayText: `🔍 Finding entities within ${range} feet of ${centerEntity?.name || centerId}`,
        };
      }

      case 'create_area_effect': {
        const shape = args.shape as string;
        const originX = args.origin_x as number;
        const originY = args.origin_y as number;
        const size = args.size_feet as number;
        const direction = args.direction as string | undefined;
        const label = args.label as string | undefined;
        
        return {
          name,
          success: true,
          result: { shape, origin: { x: originX, y: originY }, size, direction, label },
          displayText: `✨ Creating ${size}ft ${shape} effect${label ? ` (${label})` : ''} at (${originX}, ${originY})`,
        };
      }

      case 'get_path': {
        const entityId = args.entity_id as string;
        const targetX = args.target_x as number;
        const targetY = args.target_y as number;
        const entity = context.characters.get(entityId);
        
        return {
          name,
          success: true,
          result: { entityId, target: { x: targetX, y: targetY }, path: [], movementCost: 0 },
          displayText: `🗺️ Finding path for ${entity?.name || entityId} to (${targetX}, ${targetY})`,
        };
      }

      case 'reveal_area': {
        const centerX = args.center_x as number;
        const centerY = args.center_y as number;
        const radius = args.radius_feet as number;
        
        return {
          name,
          success: true,
          result: { center: { x: centerX, y: centerY }, radius },
          displayText: `💡 Revealing ${radius}ft radius area around (${centerX}, ${centerY})`,
        };
      }

      default:
        return {
          name,
          success: false,
          result: null,
          displayText: `Unknown function: ${name}`,
        };
    }
  } catch (error) {
    return {
      name,
      success: false,
      result: error,
      displayText: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export function parseFunctionCalls(text: string): FunctionCall[] {
  const calls: FunctionCall[] = [];
  
  const functionPattern = /(\w+)\s*\(\s*([^)]*)\s*\)/g;
  const knownFunctions = [
    'roll_dice', 'roll_attack', 'roll_damage', 'roll_ability_check', 'roll_saving_throw',
    'apply_damage', 'apply_healing', 'add_condition', 'remove_condition',
    'start_combat', 'next_turn', 'end_combat', 'get_combat_status',
    'get_character', 'modify_inventory', 'use_resource',
    'set_flag', 'check_flag', 'advance_time', 'set_location',
    'short_rest', 'long_rest',
    'lookup_monster', 'lookup_spell', 'lookup_condition',
    'get_position', 'move_entity', 'get_distance', 'check_line_of_sight',
    'get_entities_in_range', 'create_area_effect', 'get_path', 'reveal_area',
  ];
  
  let match;
  while ((match = functionPattern.exec(text)) !== null) {
    const [, funcName, argsStr] = match;
    
    if (knownFunctions.includes(funcName)) {
      const args: Record<string, unknown> = {};
      
      const argPattern = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\d+(?:\.\d+)?)|(\w+))/g;
      let argMatch;
      while ((argMatch = argPattern.exec(argsStr)) !== null) {
        const [, key, strVal1, strVal2, numVal, boolOrId] = argMatch;
        if (strVal1 !== undefined) args[key] = strVal1;
        else if (strVal2 !== undefined) args[key] = strVal2;
        else if (numVal !== undefined) args[key] = parseFloat(numVal);
        else if (boolOrId === 'true') args[key] = true;
        else if (boolOrId === 'false') args[key] = false;
        else if (boolOrId !== undefined) args[key] = boolOrId;
      }
      
      calls.push({ name: funcName, arguments: args });
    }
  }
  
  return calls;
}

export function stripFunctionCalls(text: string): string {
  const knownFunctions = [
    'roll_dice', 'roll_attack', 'roll_damage', 'roll_ability_check', 'roll_saving_throw',
    'apply_damage', 'apply_healing', 'add_condition', 'remove_condition',
    'start_combat', 'next_turn', 'end_combat', 'get_combat_status',
    'get_character', 'modify_inventory', 'use_resource',
    'set_flag', 'check_flag', 'advance_time', 'set_location',
    'short_rest', 'long_rest',
    'lookup_monster', 'lookup_spell', 'lookup_condition',
    'get_position', 'move_entity', 'get_distance', 'check_line_of_sight',
    'get_entities_in_range', 'create_area_effect', 'get_path', 'reveal_area',
  ];
  
  let cleaned = text;
  for (const func of knownFunctions) {
    const pattern = new RegExp(`${func}\\s*\\([^)]*\\)\\s*`, 'g');
    cleaned = cleaned.replace(pattern, '');
  }
  
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  
  return cleaned;
}
