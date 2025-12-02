// Function Registry - Defines all available AI functions for Gemini/OpenRouter

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
    }>;
    required: string[];
  };
}

// Dice Rolling Functions
export const rollDiceFunction: FunctionDeclaration = {
  name: 'roll_dice',
  description: 'Roll dice using standard notation (e.g., 2d6+3). Use for any roll not covered by specific functions.',
  parameters: {
    type: 'object',
    properties: {
      notation: {
        type: 'string',
        description: 'Dice notation like "1d20", "2d6+3", "4d6"',
      },
      reason: {
        type: 'string',
        description: 'Why this roll is being made',
      },
    },
    required: ['notation'],
  },
};

export const rollAttackFunction: FunctionDeclaration = {
  name: 'roll_attack',
  description: 'MANDATORY: Roll an attack. Must be called before narrating any attack hit or miss.',
  parameters: {
    type: 'object',
    properties: {
      attacker_id: {
        type: 'string',
        description: 'ID of the attacking creature',
      },
      target_id: {
        type: 'string',
        description: 'ID of the target creature',
      },
      weapon: {
        type: 'string',
        description: 'Name of the weapon being used',
      },
      advantage_status: {
        type: 'string',
        description: 'Whether attack has advantage, disadvantage, or normal',
        enum: ['normal', 'advantage', 'disadvantage'],
      },
    },
    required: ['attacker_id', 'target_id', 'weapon'],
  },
};

export const rollDamageFunction: FunctionDeclaration = {
  name: 'roll_damage',
  description: 'MANDATORY: Roll damage after a successful attack. Must be called before stating damage amounts.',
  parameters: {
    type: 'object',
    properties: {
      attacker_id: {
        type: 'string',
        description: 'ID of the attacker',
      },
      weapon: {
        type: 'string',
        description: 'Weapon used for the attack',
      },
      is_critical: {
        type: 'boolean',
        description: 'Whether this is a critical hit (doubles dice)',
      },
    },
    required: ['attacker_id', 'weapon'],
  },
};

export const rollAbilityCheckFunction: FunctionDeclaration = {
  name: 'roll_ability_check',
  description: 'MANDATORY: Roll an ability check or skill check. Call before declaring success/failure.',
  parameters: {
    type: 'object',
    properties: {
      character_id: {
        type: 'string',
        description: 'ID of the character making the check',
      },
      ability: {
        type: 'string',
        description: 'The ability being used',
        enum: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'],
      },
      skill: {
        type: 'string',
        description: 'The skill being used, if any',
        enum: ['acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival'],
      },
      dc: {
        type: 'number',
        description: 'Difficulty Class to beat',
      },
      advantage_status: {
        type: 'string',
        description: 'Advantage status for the roll',
        enum: ['normal', 'advantage', 'disadvantage'],
      },
    },
    required: ['character_id', 'ability', 'dc'],
  },
};

export const rollSavingThrowFunction: FunctionDeclaration = {
  name: 'roll_saving_throw',
  description: 'MANDATORY: Roll a saving throw. Call before declaring if a creature saves or fails.',
  parameters: {
    type: 'object',
    properties: {
      character_id: {
        type: 'string',
        description: 'ID of the character making the save',
      },
      ability: {
        type: 'string',
        description: 'The ability for the saving throw',
        enum: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'],
      },
      dc: {
        type: 'number',
        description: 'Difficulty Class to beat',
      },
      advantage_status: {
        type: 'string',
        description: 'Advantage status for the roll',
        enum: ['normal', 'advantage', 'disadvantage'],
      },
    },
    required: ['character_id', 'ability', 'dc'],
  },
};

// HP Functions
export const applyDamageFunction: FunctionDeclaration = {
  name: 'apply_damage',
  description: 'MANDATORY: Apply damage to a creature after rolling damage. Updates HP.',
  parameters: {
    type: 'object',
    properties: {
      target_id: {
        type: 'string',
        description: 'ID of the creature taking damage',
      },
      amount: {
        type: 'number',
        description: 'Amount of damage to apply',
      },
      damage_type: {
        type: 'string',
        description: 'Type of damage',
        enum: ['slashing', 'piercing', 'bludgeoning', 'fire', 'cold', 'lightning', 'thunder', 'acid', 'poison', 'necrotic', 'radiant', 'force', 'psychic'],
      },
      source: {
        type: 'string',
        description: 'What caused the damage',
      },
    },
    required: ['target_id', 'amount', 'damage_type'],
  },
};

export const applyHealingFunction: FunctionDeclaration = {
  name: 'apply_healing',
  description: 'Apply healing to a creature. Updates HP.',
  parameters: {
    type: 'object',
    properties: {
      target_id: {
        type: 'string',
        description: 'ID of the creature being healed',
      },
      amount: {
        type: 'number',
        description: 'Amount of healing to apply',
      },
      source: {
        type: 'string',
        description: 'What caused the healing',
      },
    },
    required: ['target_id', 'amount'],
  },
};

// Combat Functions
export const startCombatFunction: FunctionDeclaration = {
  name: 'start_combat',
  description: 'MANDATORY: Start combat encounter. Must be called before any combat actions.',
  parameters: {
    type: 'object',
    properties: {
      enemy_ids: {
        type: 'array',
        description: 'Array of enemy identifiers',
      },
      surprised_ids: {
        type: 'array',
        description: 'Array of IDs of surprised creatures',
      },
    },
    required: ['enemy_ids'],
  },
};

export const nextTurnFunction: FunctionDeclaration = {
  name: 'next_turn',
  description: 'Advance to the next turn in combat. Call when current turn is complete.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const getCombatStatusFunction: FunctionDeclaration = {
  name: 'get_combat_status',
  description: 'Get current combat state including initiative order and HP.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const endCombatFunction: FunctionDeclaration = {
  name: 'end_combat',
  description: 'End the current combat encounter.',
  parameters: {
    type: 'object',
    properties: {
      outcome: {
        type: 'string',
        description: 'How combat ended',
        enum: ['victory', 'defeat', 'fled', 'negotiated'],
      },
    },
    required: ['outcome'],
  },
};

// Condition Functions
export const addConditionFunction: FunctionDeclaration = {
  name: 'add_condition',
  description: 'Apply a condition to a creature.',
  parameters: {
    type: 'object',
    properties: {
      target_id: {
        type: 'string',
        description: 'ID of the creature',
      },
      condition: {
        type: 'string',
        description: 'Condition to apply',
        enum: ['blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'],
      },
      duration_type: {
        type: 'string',
        description: 'How long the condition lasts',
        enum: ['rounds', 'until_save', 'until_dispelled', 'until_long_rest'],
      },
      duration_value: {
        type: 'number',
        description: 'Number of rounds if duration_type is rounds',
      },
      source: {
        type: 'string',
        description: 'What caused the condition',
      },
    },
    required: ['target_id', 'condition', 'duration_type'],
  },
};

export const removeConditionFunction: FunctionDeclaration = {
  name: 'remove_condition',
  description: 'Remove a condition from a creature.',
  parameters: {
    type: 'object',
    properties: {
      target_id: {
        type: 'string',
        description: 'ID of the creature',
      },
      condition: {
        type: 'string',
        description: 'Condition to remove',
      },
    },
    required: ['target_id', 'condition'],
  },
};

// Reference Functions
export const lookupMonsterFunction: FunctionDeclaration = {
  name: 'lookup_monster',
  description: 'Look up a monster stat block from the D&D 5e rules.',
  parameters: {
    type: 'object',
    properties: {
      monster_name: {
        type: 'string',
        description: 'Name of the monster to look up',
      },
    },
    required: ['monster_name'],
  },
};

export const lookupSpellFunction: FunctionDeclaration = {
  name: 'lookup_spell',
  description: 'Look up a spell from the D&D 5e rules.',
  parameters: {
    type: 'object',
    properties: {
      spell_name: {
        type: 'string',
        description: 'Name of the spell to look up',
      },
    },
    required: ['spell_name'],
  },
};

// Lore Functions
export const recallLoreFunction: FunctionDeclaration = {
  name: 'recall_lore',
  description: 'Query world lore to recall information about NPCs, factions, locations, conflicts, or history. Use when players ask about the world or you need context.',
  parameters: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: 'The topic to search for (name, place, faction, event, etc.)',
      },
      type: {
        type: 'string',
        description: 'Optional: narrow search to specific category',
        enum: ['npc', 'faction', 'location', 'conflict', 'secret'],
      },
    },
    required: ['topic'],
  },
};

export const introduceNpcFunction: FunctionDeclaration = {
  name: 'introduce_npc',
  description: 'Introduce an NPC to the players. Call when players first meet an NPC to get their full details and mark them as known.',
  parameters: {
    type: 'object',
    properties: {
      npc_name: {
        type: 'string',
        description: 'Name of the NPC being introduced',
      },
    },
    required: ['npc_name'],
  },
};

export const discoverLocationFunction: FunctionDeclaration = {
  name: 'discover_location',
  description: 'Mark a location as discovered when players arrive at or learn about a new place.',
  parameters: {
    type: 'object',
    properties: {
      location_name: {
        type: 'string',
        description: 'Name of the location being discovered',
      },
    },
    required: ['location_name'],
  },
};

export const revealSecretFunction: FunctionDeclaration = {
  name: 'reveal_secret',
  description: 'Reveal a secret to the players. Use when players discover hidden information through investigation or events.',
  parameters: {
    type: 'object',
    properties: {
      secret_name: {
        type: 'string',
        description: 'Name/identifier of the secret being revealed',
      },
    },
    required: ['secret_name'],
  },
};

// All functions registry
export const allFunctions: FunctionDeclaration[] = [
  rollDiceFunction,
  rollAttackFunction,
  rollDamageFunction,
  rollAbilityCheckFunction,
  rollSavingThrowFunction,
  applyDamageFunction,
  applyHealingFunction,
  startCombatFunction,
  nextTurnFunction,
  getCombatStatusFunction,
  endCombatFunction,
  addConditionFunction,
  removeConditionFunction,
  lookupMonsterFunction,
  lookupSpellFunction,
  recallLoreFunction,
  introduceNpcFunction,
  discoverLocationFunction,
  revealSecretFunction,
];

// Functions by category
export const diceFunctions = [rollDiceFunction, rollAttackFunction, rollDamageFunction, rollAbilityCheckFunction, rollSavingThrowFunction];
export const hpFunctions = [applyDamageFunction, applyHealingFunction];
export const combatFunctions = [startCombatFunction, nextTurnFunction, getCombatStatusFunction, endCombatFunction];
export const conditionFunctions = [addConditionFunction, removeConditionFunction];
export const referenceFunctions = [lookupMonsterFunction, lookupSpellFunction];
export const loreFunctions = [recallLoreFunction, introduceNpcFunction, discoverLocationFunction, revealSecretFunction];
