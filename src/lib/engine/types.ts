// Core D&D 5e type definitions - portable, no framework dependencies

export type Ability = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

export type Skill =
  | 'acrobatics' | 'animal_handling' | 'arcana' | 'athletics'
  | 'deception' | 'history' | 'insight' | 'intimidation'
  | 'investigation' | 'medicine' | 'nature' | 'perception'
  | 'performance' | 'persuasion' | 'religion' | 'sleight_of_hand'
  | 'stealth' | 'survival';

export const SKILL_ABILITIES: Record<Skill, Ability> = {
  acrobatics: 'dexterity',
  animal_handling: 'wisdom',
  arcana: 'intelligence',
  athletics: 'strength',
  deception: 'charisma',
  history: 'intelligence',
  insight: 'wisdom',
  intimidation: 'charisma',
  investigation: 'intelligence',
  medicine: 'wisdom',
  nature: 'intelligence',
  perception: 'wisdom',
  performance: 'charisma',
  persuasion: 'charisma',
  religion: 'intelligence',
  sleight_of_hand: 'dexterity',
  stealth: 'dexterity',
  survival: 'wisdom',
};

export type DamageType =
  | 'slashing' | 'piercing' | 'bludgeoning'
  | 'fire' | 'cold' | 'lightning' | 'thunder'
  | 'acid' | 'poison' | 'necrotic' | 'radiant'
  | 'force' | 'psychic';

export type Condition =
  | 'blinded' | 'charmed' | 'deafened' | 'frightened'
  | 'grappled' | 'incapacitated' | 'invisible' | 'paralyzed'
  | 'petrified' | 'poisoned' | 'prone' | 'restrained'
  | 'stunned' | 'unconscious' | 'exhaustion' | 'concentrating';

export type DurationType = 'rounds' | 'until_save' | 'until_dispelled' | 'until_long_rest' | 'until_short_rest';

export interface ActiveCondition {
  condition: Condition;
  source: string;
  durationType: DurationType;
  durationValue?: number;
  saveDc?: number;
  saveAbility?: Ability;
}

export type AdvantageStatus = 'normal' | 'advantage' | 'disadvantage';

export type GameMode = 'exploration' | 'combat' | 'social' | 'rest';

export type CombatantType = 'player_character' | 'enemy' | 'ally' | 'neutral';

export type CombatantStatus = 'active' | 'defeated' | 'fled';

export type CombatOutcome = 'victory' | 'defeat' | 'fled' | 'negotiated';

// Dice Roll Results
export interface BasicRollResult {
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
  reason?: string;
}

export interface AbilityCheckResult {
  characterId: string;
  characterName: string;
  ability: Ability;
  skill?: Skill;
  roll: number;
  abilityModifier: number;
  proficiencyBonus: number;
  isProficient: boolean;
  hasExpertise: boolean;
  otherModifiers: number;
  total: number;
  dc: number;
  success: boolean;
  isCriticalSuccess: boolean;
  isCriticalFailure: boolean;
  advantageUsed: AdvantageStatus;
}

export interface AttackRollResult {
  attackerId: string;
  attackerName: string;
  targetId: string;
  targetName: string;
  weapon: string;
  roll: number;
  attackBonus: number;
  total: number;
  targetAc: number;
  hits: boolean;
  isCriticalHit: boolean;
  isCriticalMiss: boolean;
  advantageUsed: AdvantageStatus;
}

export interface DamageSource {
  dice: string;
  type: DamageType;
  source: string;
}

export interface DamageRollResult {
  rolls: { dice: string; results: number[]; total: number }[];
  modifier: number;
  baseDamage: number;
  damageType: DamageType;
  additionalDamage: { amount: number; type: DamageType; source: string }[];
  totalDamage: number;
  isCritical: boolean;
}

export interface SavingThrowResult {
  characterId: string;
  characterName: string;
  ability: Ability;
  roll: number;
  modifier: number;
  proficiencyBonus: number;
  isProficient: boolean;
  total: number;
  dc: number;
  success: boolean;
  isCriticalSuccess: boolean;
  isCriticalFailure: boolean;
  advantageUsed: AdvantageStatus;
}

export interface InitiativeRollResult {
  combatants: {
    id: string;
    name: string;
    type: CombatantType;
    roll: number;
    modifier: number;
    total: number;
  }[];
}

// Character Types
export interface CharacterAbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface SpellSlots {
  [level: number]: { max: number; current: number };
}

export interface ClassResource {
  name: string;
  max: number;
  current: number;
  rechargeOn: 'short_rest' | 'long_rest' | 'dawn';
}

export interface InventoryItem {
  name: string;
  quantity: number;
  weight?: number;
  description?: string;
}

export interface EquippedItems {
  armor?: string;
  shield?: string;
  mainHand?: string;
  offHand?: string;
  [slot: string]: string | undefined;
}

export interface Character {
  id: string;
  campaignId: string;
  name: string;
  race: string;
  className: string;
  subclass?: string;
  level: number;
  background?: string;
  alignment?: string;
  abilityScores: CharacterAbilityScores;
  maxHp: number;
  currentHp: number;
  tempHp: number;
  armorClass: number;
  speed: number;
  hitDiceType: number;
  hitDiceRemaining: number;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  savingThrowProficiencies: Ability[];
  skillProficiencies: Skill[];
  skillExpertise: Skill[];
  spellSlots: SpellSlots;
  knownSpells: string[];
  preparedSpells: string[];
  spellcastingAbility?: Ability;
  classResources: ClassResource[];
  inventory: InventoryItem[];
  equippedItems: EquippedItems;
  gold: number;
  conditions: ActiveCondition[];
  features: string[];
  backstory?: string;
  notes?: string;
}

// Combat Types
export interface TurnResources {
  hasAction: boolean;
  hasBonusAction: boolean;
  hasReaction: boolean;
  movementRemaining: number;
}

export interface Combatant {
  id: string;
  name: string;
  type: CombatantType;
  initiative: number;
  initiativeModifier: number;
  initiativeRoll: number;
  currentHp: number;
  maxHp: number;
  armorClass: number;
  speed: number;
  conditions: ActiveCondition[];
  status: CombatantStatus;
  position?: { x: number; y: number };
  turnResources: TurnResources;
  sourceId?: string;
  isMonster: boolean;
  monsterStatBlock?: MonsterStatBlock;
}

export interface Combat {
  id: string;
  round: number;
  initiativeOrder: Combatant[];
  currentTurnIndex: number;
  surprisedCombatants: string[];
  environmentalEffects: string[];
  active: boolean;
}

// Monster Types
export interface MonsterAction {
  name: string;
  desc: string;
  attackBonus?: number;
  damage?: { dice: string; type: DamageType }[];
}

export interface MonsterStatBlock {
  name: string;
  size: string;
  type: string;
  alignment: string;
  armorClass: number;
  hitPoints: number;
  hitDice: string;
  speed: { walk?: number; fly?: number; swim?: number; burrow?: number; climb?: number };
  abilityScores: CharacterAbilityScores;
  savingThrows?: Partial<Record<Ability, number>>;
  skills?: Record<string, number>;
  damageResistances?: DamageType[];
  damageImmunities?: DamageType[];
  damageVulnerabilities?: DamageType[];
  conditionImmunities?: Condition[];
  senses?: string[];
  languages?: string[];
  challengeRating: number;
  xp: number;
  traits?: { name: string; desc: string }[];
  actions: MonsterAction[];
  legendaryActions?: MonsterAction[];
  reactions?: MonsterAction[];
}

// Game State Types
export interface GameTime {
  day: number;
  hour: number;
  minute: number;
}

export interface GameState {
  campaignId: string;
  mode: GameMode;
  currentLocationId?: string;
  exploredLocations: string[];
  time: GameTime;
  activeCombat?: Combat;
  flags: Record<string, unknown>;
  activeQuests: string[];
  completedQuests: string[];
  knownNpcs: string[];
  recentMessages: ConversationMessage[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  functionCalls?: FunctionCallRecord[];
}

export interface FunctionCallRecord {
  name: string;
  args: Record<string, unknown>;
  result: FunctionResult;
}

// Function Execution Types
export type StateUpdateType =
  | 'combat_started'
  | 'combat_updated'
  | 'combat_ended'
  | 'mode_changed'
  | 'location_changed'
  | 'flag_updated'
  | 'time_advanced';

export interface StateUpdate {
  type: StateUpdateType;
  data: unknown;
}

export interface CharacterUpdate {
  characterId: string;
  changes: Partial<Character>;
}

export interface FunctionResult {
  success: boolean;
  data?: unknown;
  displayText: string;
  stateUpdate?: StateUpdate;
  characterUpdate?: CharacterUpdate;
  error?: string;
}

// Database/API Character type (as returned by Prisma - flat ability scores, JSON strings)
// Use this type for components that receive data directly from API/database
export interface DBCharacter {
  id: string;
  campaignId: string | null;
  name: string;
  race: string;
  className: string;
  subclass: string | null;
  level: number;
  background: string | null;
  alignment: string | null;
  // Flat ability scores (not nested)
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  // Combat stats
  maxHp: number;
  currentHp: number;
  tempHp: number;
  armorClass: number;
  speed: number;
  hitDiceType: number;
  hitDiceRemaining: number;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  // JSON string fields (parse before use)
  savingThrowProficiencies: string;
  skillProficiencies: string;
  skillExpertise: string;
  spellSlots: string;
  knownSpells: string;
  preparedSpells: string;
  spellcastingAbility: string | null;
  classResources: string;
  inventory: string;
  equippedItems: string;
  conditions: string;
  features: string;
  // Simple fields
  gold: number;
  backstory: string | null;
  notes: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Minimal character type for list views (campaign list, party preview)
export interface CharacterSummary {
  id: string;
  name: string;
  race: string;
  className: string;
  level: number;
  currentHp: number;
  maxHp: number;
}

// Extended summary for setup pages (includes backstory for preview)
export interface CharacterSetupSummary extends CharacterSummary {
  backstory: string | null;
  campaignId: string | null;
}

// Character data for adventure/party view (includes combat stats and resources)
export interface CharacterPartyView extends CharacterSummary {
  tempHp: number;
  armorClass: number;
  speed: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  conditions: string;
  inventory: string;
  gold: number;
  spellSlots: string;
  classResources: string;
  knownSpells: string;
  preparedSpells: string;
  equippedItems: string;
}

// Helper functions
export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

export function clampHp(hp: number, maxHp: number): number {
  return Math.max(0, Math.min(maxHp, hp));
}
