'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Character {
  id: string;
  campaignId: string;
  name: string;
  race: string;
  className: string;
  subclass: string | null;
  level: number;
  background: string | null;
  alignment: string | null;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  maxHp: number;
  currentHp: number;
  tempHp: number;
  armorClass: number;
  speed: number;
  hitDiceType: number;
  hitDiceRemaining: number;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
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
  gold: number;
  conditions: string;
  features: string;
  backstory: string | null;
  notes: string | null;
}

function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

const SKILLS: Record<string, { ability: keyof Character; name: string }> = {
  acrobatics: { ability: 'dexterity', name: 'Acrobatics' },
  animal_handling: { ability: 'wisdom', name: 'Animal Handling' },
  arcana: { ability: 'intelligence', name: 'Arcana' },
  athletics: { ability: 'strength', name: 'Athletics' },
  deception: { ability: 'charisma', name: 'Deception' },
  history: { ability: 'intelligence', name: 'History' },
  insight: { ability: 'wisdom', name: 'Insight' },
  intimidation: { ability: 'charisma', name: 'Intimidation' },
  investigation: { ability: 'intelligence', name: 'Investigation' },
  medicine: { ability: 'wisdom', name: 'Medicine' },
  nature: { ability: 'intelligence', name: 'Nature' },
  perception: { ability: 'wisdom', name: 'Perception' },
  performance: { ability: 'charisma', name: 'Performance' },
  persuasion: { ability: 'charisma', name: 'Persuasion' },
  religion: { ability: 'intelligence', name: 'Religion' },
  sleight_of_hand: { ability: 'dexterity', name: 'Sleight of Hand' },
  stealth: { ability: 'dexterity', name: 'Stealth' },
  survival: { ability: 'wisdom', name: 'Survival' },
};

export default function CharacterSheetPage() {
  const params = useParams();
  const characterId = params.id as string;

  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCharacter();
  }, [characterId]);

  async function fetchCharacter() {
    try {
      const res = await fetch(`/api/character/${characterId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Character not found');
        } else {
          setError('Failed to load character');
        }
        return;
      }
      const data = await res.json();
      setCharacter(data.character);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load character');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-parchment/60">Loading character...</div>
      </main>
    );
  }

  if (error || !character) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-ember text-xl mb-4">{error || 'Character not found'}</div>
        <Link href="/campaigns" className="text-primary hover:text-primary-light">
          &larr; Back to Campaigns
        </Link>
      </main>
    );
  }

  const savingThrowProfs: string[] = JSON.parse(character.savingThrowProficiencies || '[]');
  const skillProfs: string[] = JSON.parse(character.skillProficiencies || '[]');
  const skillExpertise: string[] = JSON.parse(character.skillExpertise || '[]');
  const conditions: Array<{ condition: string }> = JSON.parse(character.conditions || '[]');
  const inventory: Array<{ name: string; quantity: number }> = JSON.parse(character.inventory || '[]');
  const features: string[] = JSON.parse(character.features || '[]');
  const spellSlots: Record<string, { current: number; max: number }> = JSON.parse(character.spellSlots || '{}');
  const classResources: Array<{ name: string; current: number; max: number }> = JSON.parse(character.classResources || '[]');
  const knownSpells: string[] = JSON.parse(character.knownSpells || '[]');
  const preparedSpells: string[] = JSON.parse(character.preparedSpells || '[]');
  const profBonus = getProficiencyBonus(character.level);

  const hasSpellcasting = ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'].includes(character.className);
  const hasClassResources = classResources.length > 0 || ['Barbarian', 'Bard', 'Monk', 'Sorcerer', 'Fighter', 'Warlock'].includes(character.className);

  const abilities: Array<{ key: keyof Character; name: string; abbr: string }> = [
    { key: 'strength', name: 'Strength', abbr: 'STR' },
    { key: 'dexterity', name: 'Dexterity', abbr: 'DEX' },
    { key: 'constitution', name: 'Constitution', abbr: 'CON' },
    { key: 'intelligence', name: 'Intelligence', abbr: 'INT' },
    { key: 'wisdom', name: 'Wisdom', abbr: 'WIS' },
    { key: 'charisma', name: 'Charisma', abbr: 'CHA' },
  ];

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/campaign/${character.campaignId}`} className="text-primary hover:text-primary-light">
            &larr; Back to Adventure
          </Link>
        </div>

        {/* Character Header */}
        <header className="bg-surface rounded-lg p-6 mb-6 border border-primary/20">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <h1 className="text-4xl font-medieval text-primary">{character.name}</h1>
              <p className="text-parchment/70 text-lg">
                Level {character.level} {character.race} {character.className}
                {character.subclass && ` (${character.subclass})`}
              </p>
              {character.background && (
                <p className="text-parchment/50">{character.background}</p>
              )}
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{character.armorClass}</div>
                <div className="text-xs text-parchment/60">Armor Class</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{character.speed}</div>
                <div className="text-xs text-parchment/60">Speed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">+{profBonus}</div>
                <div className="text-xs text-parchment/60">Proficiency</div>
              </div>
            </div>
          </div>

          {/* HP Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-parchment/70">Hit Points</span>
              <span className="text-parchment">
                {character.currentHp}
                {character.tempHp > 0 && <span className="text-tertiary">+{character.tempHp}</span>}
                /{character.maxHp}
              </span>
            </div>
            <div className="h-4 bg-background rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  character.currentHp / character.maxHp > 0.5
                    ? 'bg-forest'
                    : character.currentHp / character.maxHp > 0.25
                    ? 'bg-amber'
                    : 'bg-ember'
                }`}
                style={{ width: `${Math.min(100, (character.currentHp / character.maxHp) * 100)}%` }}
              />
            </div>
          </div>

          {/* Conditions */}
          {conditions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {conditions.map((cond, i) => (
                <span key={i} className="px-3 py-1 bg-ember/20 text-ember rounded-full text-sm">
                  {cond.condition}
                </span>
              ))}
            </div>
          )}
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Ability Scores */}
          <div className="bg-surface rounded-lg p-6 border border-primary/20">
            <h2 className="font-medieval text-xl text-primary mb-4">Abilities</h2>
            <div className="grid grid-cols-2 gap-4">
              {abilities.map(({ key, name, abbr }) => {
                const score = character[key] as number;
                const mod = getModifier(score);
                return (
                  <div key={key} className="text-center bg-background rounded-lg p-3">
                    <div className="text-xs text-parchment/60 mb-1">{abbr}</div>
                    <div className="text-2xl font-bold text-parchment">{formatModifier(mod)}</div>
                    <div className="text-sm text-parchment/50">{score}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Saving Throws */}
          <div className="bg-surface rounded-lg p-6 border border-primary/20">
            <h2 className="font-medieval text-xl text-primary mb-4">Saving Throws</h2>
            <div className="space-y-2">
              {abilities.map(({ key, name, abbr }) => {
                const score = character[key] as number;
                const mod = getModifier(score);
                const isProficient = savingThrowProfs.includes(key);
                const total = mod + (isProficient ? profBonus : 0);
                return (
                  <div key={key} className="flex justify-between items-center">
                    <span className={`${isProficient ? 'text-parchment' : 'text-parchment/50'}`}>
                      {isProficient && '● '}{name}
                    </span>
                    <span className={`${isProficient ? 'text-primary' : 'text-parchment/50'}`}>
                      {formatModifier(total)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skills */}
          <div className="bg-surface rounded-lg p-6 border border-primary/20">
            <h2 className="font-medieval text-xl text-primary mb-4">Skills</h2>
            <div className="space-y-1 text-sm max-h-80 overflow-y-auto">
              {Object.entries(SKILLS).map(([skillKey, { ability, name }]) => {
                const score = character[ability] as number;
                const mod = getModifier(score);
                const isProficient = skillProfs.includes(skillKey);
                const hasExpertise = skillExpertise.includes(skillKey);
                let bonus = mod;
                if (hasExpertise) bonus += profBonus * 2;
                else if (isProficient) bonus += profBonus;

                return (
                  <div key={skillKey} className="flex justify-between items-center">
                    <span className={`${isProficient || hasExpertise ? 'text-parchment' : 'text-parchment/50'}`}>
                      {hasExpertise ? '◆ ' : isProficient ? '● ' : ''}{name}
                    </span>
                    <span className={`${isProficient || hasExpertise ? 'text-primary' : 'text-parchment/50'}`}>
                      {formatModifier(bonus)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Spellcasting & Class Resources Row */}
        {(hasSpellcasting || hasClassResources) && (
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {/* Spell Slots */}
            {hasSpellcasting && (
              <div className="bg-surface rounded-lg p-6 border border-primary/20">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-medieval text-xl text-primary">Spell Slots</h2>
                  {character.spellcastingAbility && (
                    <span className="text-parchment/60 text-sm">
                      Ability: {character.spellcastingAbility.toUpperCase()}
                    </span>
                  )}
                </div>
                {Object.keys(spellSlots).length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
                      const slot = spellSlots[level.toString()];
                      if (!slot || slot.max === 0) return null;
                      return (
                        <div key={level} className="text-center bg-background rounded-lg p-3">
                          <div className="text-xs text-parchment/60 mb-1">Level {level}</div>
                          <div className="flex justify-center gap-1">
                            {Array.from({ length: slot.max }, (_, i) => (
                              <div
                                key={i}
                                className={`w-4 h-4 rounded-full border-2 ${
                                  i < slot.current
                                    ? 'bg-tertiary border-tertiary-light'
                                    : 'bg-transparent border-parchment/30'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="text-xs text-parchment/50 mt-1">
                            {slot.current}/{slot.max}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-parchment/50 italic">No spell slots at this level</p>
                )}

                {/* Known/Prepared Spells Summary */}
                <div className="mt-4 pt-4 border-t border-primary/10">
                  {knownSpells.length > 0 && (
                    <div className="mb-2">
                      <span className="text-parchment/60 text-sm">Known Spells: </span>
                      <span className="text-parchment/80">{knownSpells.length}</span>
                    </div>
                  )}
                  {preparedSpells.length > 0 && (
                    <div>
                      <span className="text-parchment/60 text-sm">Prepared: </span>
                      <span className="text-parchment/80">{preparedSpells.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Class Resources */}
            {hasClassResources && (
              <div className="bg-surface rounded-lg p-6 border border-primary/20">
                <h2 className="font-medieval text-xl text-primary mb-4">Class Resources</h2>
                {classResources.length > 0 ? (
                  <div className="space-y-4">
                    {classResources.map((resource, i) => (
                      <div key={i} className="bg-background rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-parchment">{resource.name}</span>
                          <span className="text-primary">{resource.current}/{resource.max}</span>
                        </div>
                        <div className="h-2 bg-surface rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${(resource.current / resource.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-parchment/50 italic">
                    {character.className === 'Barbarian' && 'Rage: 2/day at level 1'}
                    {character.className === 'Bard' && 'Bardic Inspiration: CHA mod/day'}
                    {character.className === 'Monk' && `Ki Points: ${character.level} (starts at level 2)`}
                    {character.className === 'Sorcerer' && `Sorcery Points: ${character.level} (starts at level 2)`}
                    {character.className === 'Fighter' && 'Second Wind: 1/rest, Action Surge at level 2'}
                    {character.className === 'Warlock' && 'Pact slots recover on short rest'}
                  </div>
                )}

                {/* Hit Dice */}
                <div className="mt-4 pt-4 border-t border-primary/10">
                  <div className="flex justify-between items-center">
                    <span className="text-parchment/60">Hit Dice (d{character.hitDiceType})</span>
                    <span className="text-parchment">{character.hitDiceRemaining}/{character.level}</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: character.level }, (_, i) => (
                      <div
                        key={i}
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs border ${
                          i < character.hitDiceRemaining
                            ? 'bg-forest/20 border-forest text-forest'
                            : 'bg-transparent border-parchment/20 text-parchment/30'
                        }`}
                      >
                        d{character.hitDiceType}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Death Saves */}
                {character.currentHp === 0 && (
                  <div className="mt-4 pt-4 border-t border-primary/10">
                    <div className="text-parchment/60 mb-2">Death Saves</div>
                    <div className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-forest text-sm">Successes:</span>
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className={`w-4 h-4 rounded-full border-2 ${
                                i < character.deathSaveSuccesses
                                  ? 'bg-forest border-forest'
                                  : 'border-forest/30'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-ember text-sm">Failures:</span>
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className={`w-4 h-4 rounded-full border-2 ${
                                i < character.deathSaveFailures
                                  ? 'bg-ember border-ember'
                                  : 'border-ember/30'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Second Row */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Features */}
          <div className="bg-surface rounded-lg p-6 border border-primary/20">
            <h2 className="font-medieval text-xl text-primary mb-4">Features & Traits</h2>
            {features.length > 0 ? (
              <ul className="space-y-2">
                {features.map((feature, i) => (
                  <li key={i} className="text-parchment/80">{feature}</li>
                ))}
              </ul>
            ) : (
              <p className="text-parchment/50 italic">No features recorded</p>
            )}
          </div>

          {/* Inventory */}
          <div className="bg-surface rounded-lg p-6 border border-primary/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-medieval text-xl text-primary">Inventory</h2>
              <span className="text-amber font-semibold">{character.gold} gp</span>
            </div>
            {inventory.length > 0 ? (
              <ul className="space-y-1">
                {inventory.map((item, i) => (
                  <li key={i} className="flex justify-between text-parchment/80">
                    <span>{item.name}</span>
                    {item.quantity > 1 && <span className="text-parchment/50">x{item.quantity}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-parchment/50 italic">No items</p>
            )}
          </div>
        </div>

        {/* Backstory */}
        {character.backstory && (
          <div className="bg-surface rounded-lg p-6 border border-primary/20 mt-6">
            <h2 className="font-medieval text-xl text-primary mb-4">Backstory</h2>
            <p className="text-parchment/80 narrative-text whitespace-pre-wrap">{character.backstory}</p>
          </div>
        )}
      </div>
    </main>
  );
}
