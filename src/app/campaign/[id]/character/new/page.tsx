'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Quiz result type for pre-filling
interface QuizResultData {
  suggestedRace: string;
  suggestedClass: string;
  suggestedBackground: string;
  alignment: string;
  backstory: string | null;
  suggestedAbilities: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
}

const RACES = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'];
const CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];
const BACKGROUNDS = ['Acolyte', 'Charlatan', 'Criminal', 'Entertainer', 'Folk Hero', 'Guild Artisan', 'Hermit', 'Noble', 'Outlander', 'Sage', 'Sailor', 'Soldier', 'Urchin'];
const ALIGNMENTS = ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'];

const CLASS_HIT_DICE: Record<string, number> = {
  Barbarian: 12, Bard: 8, Cleric: 8, Druid: 8, Fighter: 10,
  Monk: 8, Paladin: 10, Ranger: 10, Rogue: 8, Sorcerer: 6, Warlock: 8, Wizard: 6,
};

const CLASS_SAVING_THROWS: Record<string, string[]> = {
  Barbarian: ['strength', 'constitution'], Bard: ['dexterity', 'charisma'],
  Cleric: ['wisdom', 'charisma'], Druid: ['intelligence', 'wisdom'],
  Fighter: ['strength', 'constitution'], Monk: ['strength', 'dexterity'],
  Paladin: ['wisdom', 'charisma'], Ranger: ['strength', 'dexterity'],
  Rogue: ['dexterity', 'intelligence'], Sorcerer: ['constitution', 'charisma'],
  Warlock: ['wisdom', 'charisma'], Wizard: ['intelligence', 'wisdom'],
};

const CLASS_STARTING_EQUIPMENT: Record<string, Array<{ name: string; quantity: number }>> = {
  Barbarian: [{ name: 'Greataxe', quantity: 1 }, { name: 'Handaxe', quantity: 2 }, { name: 'Explorer\'s Pack', quantity: 1 }, { name: 'Javelin', quantity: 4 }],
  Bard: [{ name: 'Rapier', quantity: 1 }, { name: 'Diplomat\'s Pack', quantity: 1 }, { name: 'Lute', quantity: 1 }, { name: 'Leather Armor', quantity: 1 }, { name: 'Dagger', quantity: 1 }],
  Cleric: [{ name: 'Mace', quantity: 1 }, { name: 'Scale Mail', quantity: 1 }, { name: 'Shield', quantity: 1 }, { name: 'Priest\'s Pack', quantity: 1 }, { name: 'Holy Symbol', quantity: 1 }],
  Druid: [{ name: 'Wooden Shield', quantity: 1 }, { name: 'Scimitar', quantity: 1 }, { name: 'Leather Armor', quantity: 1 }, { name: 'Explorer\'s Pack', quantity: 1 }, { name: 'Druidic Focus', quantity: 1 }],
  Fighter: [{ name: 'Chain Mail', quantity: 1 }, { name: 'Longsword', quantity: 1 }, { name: 'Shield', quantity: 1 }, { name: 'Light Crossbow', quantity: 1 }, { name: 'Crossbow Bolts', quantity: 20 }, { name: 'Dungeoneer\'s Pack', quantity: 1 }],
  Monk: [{ name: 'Shortsword', quantity: 1 }, { name: 'Dart', quantity: 10 }, { name: 'Dungeoneer\'s Pack', quantity: 1 }],
  Paladin: [{ name: 'Longsword', quantity: 1 }, { name: 'Shield', quantity: 1 }, { name: 'Chain Mail', quantity: 1 }, { name: 'Javelin', quantity: 5 }, { name: 'Priest\'s Pack', quantity: 1 }, { name: 'Holy Symbol', quantity: 1 }],
  Ranger: [{ name: 'Scale Mail', quantity: 1 }, { name: 'Shortsword', quantity: 2 }, { name: 'Longbow', quantity: 1 }, { name: 'Arrows', quantity: 20 }, { name: 'Explorer\'s Pack', quantity: 1 }],
  Rogue: [{ name: 'Rapier', quantity: 1 }, { name: 'Shortbow', quantity: 1 }, { name: 'Arrows', quantity: 20 }, { name: 'Burglar\'s Pack', quantity: 1 }, { name: 'Leather Armor', quantity: 1 }, { name: 'Dagger', quantity: 2 }, { name: 'Thieves\' Tools', quantity: 1 }],
  Sorcerer: [{ name: 'Light Crossbow', quantity: 1 }, { name: 'Crossbow Bolts', quantity: 20 }, { name: 'Arcane Focus', quantity: 1 }, { name: 'Dungeoneer\'s Pack', quantity: 1 }, { name: 'Dagger', quantity: 2 }],
  Warlock: [{ name: 'Light Crossbow', quantity: 1 }, { name: 'Crossbow Bolts', quantity: 20 }, { name: 'Arcane Focus', quantity: 1 }, { name: 'Scholar\'s Pack', quantity: 1 }, { name: 'Leather Armor', quantity: 1 }, { name: 'Dagger', quantity: 2 }],
  Wizard: [{ name: 'Quarterstaff', quantity: 1 }, { name: 'Arcane Focus', quantity: 1 }, { name: 'Scholar\'s Pack', quantity: 1 }, { name: 'Spellbook', quantity: 1 }],
};

const CLASS_STARTING_GOLD: Record<string, number> = {
  Barbarian: 10, Bard: 15, Cleric: 15, Druid: 10, Fighter: 15,
  Monk: 5, Paladin: 15, Ranger: 10, Rogue: 15, Sorcerer: 10, Warlock: 10, Wizard: 10,
};

// Background-based starting equipment (D&D 5e PHB)
const BACKGROUND_EQUIPMENT: Record<string, Array<{ name: string; quantity: number }>> = {
  Acolyte: [
    { name: 'Holy Symbol', quantity: 1 },
    { name: 'Prayer Book', quantity: 1 },
    { name: 'Stick of Incense', quantity: 5 },
    { name: 'Vestments', quantity: 1 },
    { name: 'Common Clothes', quantity: 1 },
  ],
  Charlatan: [
    { name: 'Fine Clothes', quantity: 1 },
    { name: 'Disguise Kit', quantity: 1 },
    { name: 'Con Tools (weighted dice, marked cards)', quantity: 1 },
  ],
  Criminal: [
    { name: 'Crowbar', quantity: 1 },
    { name: 'Dark Common Clothes with Hood', quantity: 1 },
  ],
  Entertainer: [
    { name: 'Musical Instrument', quantity: 1 },
    { name: 'Favor from Admirer', quantity: 1 },
    { name: 'Costume', quantity: 1 },
  ],
  'Folk Hero': [
    { name: 'Artisan\'s Tools', quantity: 1 },
    { name: 'Shovel', quantity: 1 },
    { name: 'Iron Pot', quantity: 1 },
    { name: 'Common Clothes', quantity: 1 },
  ],
  'Guild Artisan': [
    { name: 'Artisan\'s Tools', quantity: 1 },
    { name: 'Letter of Introduction from Guild', quantity: 1 },
    { name: 'Traveler\'s Clothes', quantity: 1 },
  ],
  Hermit: [
    { name: 'Scroll Case with Notes', quantity: 1 },
    { name: 'Winter Blanket', quantity: 1 },
    { name: 'Common Clothes', quantity: 1 },
    { name: 'Herbalism Kit', quantity: 1 },
  ],
  Noble: [
    { name: 'Fine Clothes', quantity: 1 },
    { name: 'Signet Ring', quantity: 1 },
    { name: 'Scroll of Pedigree', quantity: 1 },
  ],
  Outlander: [
    { name: 'Staff', quantity: 1 },
    { name: 'Hunting Trap', quantity: 1 },
    { name: 'Trophy from Animal', quantity: 1 },
    { name: 'Traveler\'s Clothes', quantity: 1 },
  ],
  Sage: [
    { name: 'Bottle of Black Ink', quantity: 1 },
    { name: 'Quill', quantity: 1 },
    { name: 'Small Knife', quantity: 1 },
    { name: 'Letter with Unanswered Question', quantity: 1 },
    { name: 'Common Clothes', quantity: 1 },
  ],
  Sailor: [
    { name: 'Belaying Pin (club)', quantity: 1 },
    { name: 'Silk Rope (50 feet)', quantity: 1 },
    { name: 'Lucky Charm', quantity: 1 },
    { name: 'Common Clothes', quantity: 1 },
  ],
  Soldier: [
    { name: 'Insignia of Rank', quantity: 1 },
    { name: 'Trophy from Fallen Enemy', quantity: 1 },
    { name: 'Dice Set', quantity: 1 },
    { name: 'Common Clothes', quantity: 1 },
  ],
  Urchin: [
    { name: 'Small Knife', quantity: 1 },
    { name: 'Map of Home City', quantity: 1 },
    { name: 'Pet Mouse', quantity: 1 },
    { name: 'Token from Parents', quantity: 1 },
    { name: 'Common Clothes', quantity: 1 },
  ],
};

const BACKGROUND_GOLD: Record<string, number> = {
  Acolyte: 15,
  Charlatan: 15,
  Criminal: 15,
  Entertainer: 15,
  'Folk Hero': 10,
  'Guild Artisan': 15,
  Hermit: 5,
  Noble: 25,
  Outlander: 10,
  Sage: 10,
  Sailor: 10,
  Soldier: 10,
  Urchin: 10,
};

type Step = 'basics' | 'abilities' | 'skills' | 'equipment' | 'details' | 'review';

// Helper function to combine class and background equipment
function combineEquipment(
  classEquipment: Array<{ name: string; quantity: number }>,
  backgroundEquipment: Array<{ name: string; quantity: number }>
): Array<{ name: string; quantity: number }> {
  const combined = new Map<string, number>();

  for (const item of classEquipment) {
    combined.set(item.name, (combined.get(item.name) || 0) + item.quantity);
  }

  for (const item of backgroundEquipment) {
    combined.set(item.name, (combined.get(item.name) || 0) + item.quantity);
  }

  return Array.from(combined.entries()).map(([name, quantity]) => ({ name, quantity }));
}

export default function CharacterCreationWizard() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = params.id as string;
  const fromQuizResultId = searchParams.get('fromQuiz');

  const [step, setStep] = useState<Step>('basics');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fromQuizResult, setFromQuizResult] = useState<QuizResultData | null>(null);
  const [loadingQuizResult, setLoadingQuizResult] = useState(!!fromQuizResultId);

  // Ref to prevent double-click submissions (synchronous check)
  const isSubmitting = useRef(false);

  // Form state
  const [name, setName] = useState('');
  const [race, setRace] = useState('Human');
  const [className, setClassName] = useState('Fighter');
  const [background, setBackground] = useState('Soldier');
  const [alignment, setAlignment] = useState('True Neutral');

  const [abilities, setAbilities] = useState({
    strength: 10, dexterity: 10, constitution: 10,
    intelligence: 10, wisdom: 10, charisma: 10,
  });
  const [pointsRemaining, setPointsRemaining] = useState(27);

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [backstory, setBackstory] = useState('');

  // Fetch quiz result and pre-fill form when accessed via ?fromQuiz=resultId
  useEffect(() => {
    if (!fromQuizResultId) return;

    async function fetchQuizResult() {
      try {
        const res = await fetch(`/api/quiz/result/${fromQuizResultId}`);
        if (!res.ok) throw new Error('Failed to fetch quiz result');

        const data = await res.json();
        if (data.result) {
          const result = data.result as QuizResultData;
          setFromQuizResult(result);

          // Pre-fill form fields
          setRace(result.suggestedRace);
          setClassName(result.suggestedClass);
          setBackground(result.suggestedBackground);
          setAlignment(result.alignment);

          // Pre-fill abilities if suggested
          if (result.suggestedAbilities) {
            setAbilities(result.suggestedAbilities);
            // Recalculate points remaining
            const totalCost = Object.values(result.suggestedAbilities).reduce(
              (sum, score) => sum + (score <= 13 ? score - 8 : score === 14 ? 7 : score === 15 ? 9 : 0),
              0
            );
            setPointsRemaining(27 - totalCost);
          }

          // Pre-fill backstory if available
          if (result.backstory) {
            setBackstory(result.backstory);
          }
        }
      } catch (err) {
        console.error('Failed to fetch quiz result:', err);
      } finally {
        setLoadingQuizResult(false);
      }
    }

    fetchQuizResult();
  }, [fromQuizResultId]);

  const hitDice = CLASS_HIT_DICE[className] || 8;
  const conMod = Math.floor((abilities.constitution - 10) / 2);
  const maxHp = hitDice + conMod;

  function getPointCost(score: number): number {
    if (score <= 13) return score - 8;
    if (score === 14) return 7;
    if (score === 15) return 9;
    return 0;
  }

  function calculateTotalPoints(): number {
    return Object.values(abilities).reduce((sum, score) => sum + getPointCost(score), 0);
  }

  function adjustAbility(ability: keyof typeof abilities, delta: number) {
    const newScore = abilities[ability] + delta;
    if (newScore < 8 || newScore > 15) return;

    const newAbilities = { ...abilities, [ability]: newScore };
    const totalCost = Object.values(newAbilities).reduce((sum, score) => sum + getPointCost(score), 0);

    if (totalCost <= 27) {
      setAbilities(newAbilities);
      setPointsRemaining(27 - totalCost);
    }
  }

  function toggleSkill(skill: string) {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else if (selectedSkills.length < 4) {
      setSelectedSkills([...selectedSkills, skill]);
    }
  }

  async function createCharacter() {
    // Prevent double submission - check ref synchronously before any async operations
    if (isSubmitting.current || saving) return;
    isSubmitting.current = true;

    if (!name.trim()) {
      setError('Please enter a character name');
      isSubmitting.current = false;
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          name: name.trim(),
          race,
          className,
          level: 1,
          background,
          alignment,
          strength: abilities.strength,
          dexterity: abilities.dexterity,
          constitution: abilities.constitution,
          intelligence: abilities.intelligence,
          wisdom: abilities.wisdom,
          charisma: abilities.charisma,
          maxHp,
          currentHp: maxHp,
          armorClass: 10 + Math.floor((abilities.dexterity - 10) / 2),
          speed: 30,
          hitDiceType: hitDice,
          hitDiceRemaining: 1,
          savingThrowProficiencies: CLASS_SAVING_THROWS[className] || [],
          skillProficiencies: selectedSkills,
          inventory: combineEquipment(
            CLASS_STARTING_EQUIPMENT[className] || [],
            BACKGROUND_EQUIPMENT[background] || []
          ),
          gold: (CLASS_STARTING_GOLD[className] || 10) + (BACKGROUND_GOLD[background] || 10),
          backstory,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to create character');
      }

      // Show success message briefly before navigating
      setSuccess(true);
      setTimeout(() => {
        router.push(`/campaign/${campaignId}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create character');
      // Only reset ref on error so user can retry
      isSubmitting.current = false;
    } finally {
      setSaving(false);
    }
  }

  const steps: { key: Step; label: string }[] = [
    { key: 'basics', label: 'Basics' },
    { key: 'abilities', label: 'Abilities' },
    { key: 'skills', label: 'Skills' },
    { key: 'equipment', label: 'Equipment' },
    { key: 'details', label: 'Details' },
    { key: 'review', label: 'Review' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Link href={`/campaign/${campaignId}`} className="text-primary hover:text-primary-light">
          &larr; Back to Adventure
        </Link>

        <h1 className="text-3xl font-medieval text-primary mt-6 mb-2">Create Character</h1>
        <p className="text-parchment/60 mb-6">Forge your hero for this adventure</p>

        {/* Soul Mirror CTA */}
        <Link href={`/campaign/${campaignId}/character/quiz`}>
          <button className="w-full mb-6 py-4 px-6 btn-soul-mirror rounded-xl text-center group">
            <span className="relative z-10 flex items-center justify-center gap-3">
              <span className="text-2xl animate-sparkle">🔮</span>
              <span>
                <span className="block text-xl font-medieval text-primary shimmer-text">
                  ✨ Discover Your Character
                </span>
                <span className="block text-sm text-parchment/60 group-hover:text-parchment/80 transition-colors">
                  Take a personality quiz to reveal your destined hero
                </span>
              </span>
              <span className="text-2xl animate-sparkle" style={{ animationDelay: '1s' }}>🔮</span>
            </span>
          </button>
        </Link>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <span className="text-parchment/40 text-sm">or create manually</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i <= currentStepIndex
                  ? 'bg-primary text-background'
                  : 'bg-surface text-parchment/40'
                  }`}
              >
                {i + 1}
              </div>
              <span className={`ml-2 hidden sm:inline ${i <= currentStepIndex ? 'text-parchment' : 'text-parchment/40'}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${i < currentStepIndex ? 'bg-primary' : 'bg-surface'}`} />
              )}
            </div>
          ))}
        </div>

        {success && (
          <div className="bg-forest/20 border border-forest text-forest px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
            <span className="text-2xl">✓</span>
            <div>
              <div className="font-semibold">{name} has been created!</div>
              <div className="text-sm opacity-80">Redirecting to adventure...</div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-ember/20 border border-ember text-ember px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-surface rounded-lg p-6 border border-primary/20">
          {/* Step 1: Basics */}
          {step === 'basics' && (
            <div className="space-y-6">
              <div>
                <label className="block text-parchment/70 mb-2">Character Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your hero's name"
                  className="w-full px-4 py-3 bg-background border border-primary/30 rounded-lg text-parchment placeholder-parchment/40 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-parchment/70 mb-2">Race</label>
                  <select
                    value={race}
                    onChange={(e) => setRace(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-primary/30 rounded-lg text-parchment focus:outline-none focus:border-primary"
                  >
                    {RACES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-parchment/70 mb-2">Class</label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-primary/30 rounded-lg text-parchment focus:outline-none focus:border-primary"
                  >
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-parchment/70 mb-2">Background</label>
                  <select
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-primary/30 rounded-lg text-parchment focus:outline-none focus:border-primary"
                  >
                    {BACKGROUNDS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-parchment/70 mb-2">Alignment</label>
                  <select
                    value={alignment}
                    onChange={(e) => setAlignment(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-primary/30 rounded-lg text-parchment focus:outline-none focus:border-primary"
                  >
                    {ALIGNMENTS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 text-right">
                <button
                  onClick={() => setStep('abilities')}
                  disabled={!name.trim()}
                  className="px-6 py-3 bg-primary text-background font-semibold rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50"
                >
                  Next: Abilities &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Abilities */}
          {step === 'abilities' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-medieval text-primary">Ability Scores</h2>
                <span className={`text-lg ${pointsRemaining > 0 ? 'text-primary' : 'text-forest'}`}>
                  {pointsRemaining} points remaining
                </span>
              </div>
              <p className="text-parchment/60 text-sm mb-4">
                Use point buy: Start at 8, spend points to increase (costs more above 13)
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(Object.keys(abilities) as Array<keyof typeof abilities>).map((ability) => (
                  <div key={ability} className="bg-background rounded-lg p-4 text-center">
                    <div className="text-xs text-parchment/60 uppercase mb-2">{ability}</div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => adjustAbility(ability, -1)}
                        disabled={abilities[ability] <= 8}
                        className="w-8 h-8 bg-surface rounded hover:bg-primary/20 disabled:opacity-30"
                      >
                        -
                      </button>
                      <span className="text-2xl font-bold text-parchment w-10">{abilities[ability]}</span>
                      <button
                        onClick={() => adjustAbility(ability, 1)}
                        disabled={abilities[ability] >= 15}
                        className="w-8 h-8 bg-surface rounded hover:bg-primary/20 disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-sm text-primary mt-1">
                      {Math.floor((abilities[ability] - 10) / 2) >= 0 ? '+' : ''}
                      {Math.floor((abilities[ability] - 10) / 2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-background/50 rounded-lg p-4 mt-4">
                <div className="text-sm text-parchment/70">
                  <strong>HP:</strong> {maxHp} (d{hitDice} + {conMod >= 0 ? '+' : ''}{conMod} CON)
                </div>
                <div className="text-sm text-parchment/70">
                  <strong>AC:</strong> {10 + Math.floor((abilities.dexterity - 10) / 2)} (base + DEX)
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep('basics')}
                  className="px-6 py-3 border border-primary/30 text-primary rounded-lg hover:bg-primary/10"
                >
                  &larr; Back
                </button>
                <button
                  onClick={() => setStep('skills')}
                  className="px-6 py-3 bg-primary text-background font-semibold rounded-lg hover:bg-primary-light"
                >
                  Next: Skills &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Skills */}
          {step === 'skills' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-medieval text-primary">Skill Proficiencies</h2>
                <span className="text-parchment/60">
                  {selectedSkills.length}/4 selected
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  'acrobatics', 'animal_handling', 'arcana', 'athletics',
                  'deception', 'history', 'insight', 'intimidation',
                  'investigation', 'medicine', 'nature', 'perception',
                  'performance', 'persuasion', 'religion', 'sleight_of_hand',
                  'stealth', 'survival',
                ].map((skill) => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-2 rounded-lg text-left text-sm transition-colors ${selectedSkills.includes(skill)
                      ? 'bg-primary text-background'
                      : 'bg-background text-parchment/70 hover:bg-primary/10'
                      }`}
                  >
                    {skill.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </button>
                ))}
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep('abilities')}
                  className="px-6 py-3 border border-primary/30 text-primary rounded-lg hover:bg-primary/10"
                >
                  &larr; Back
                </button>
                <button
                  onClick={() => setStep('equipment')}
                  className="px-6 py-3 bg-primary text-background font-semibold rounded-lg hover:bg-primary-light"
                >
                  Next: Equipment &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Equipment */}
          {step === 'equipment' && (
            <div className="space-y-6">
              <h2 className="text-xl font-medieval text-primary mb-4">Starting Equipment</h2>
              <p className="text-parchment/60 text-sm mb-4">
                Based on your class ({className}) and background ({background}), you start with:
              </p>

              {/* Class Equipment */}
              <div className="bg-background rounded-lg p-4">
                <h3 className="text-lg font-semibold text-parchment mb-3">
                  <span className="text-primary">Class:</span> {className} Equipment
                </h3>
                <ul className="space-y-2">
                  {(CLASS_STARTING_EQUIPMENT[className] || []).map((item, i) => (
                    <li key={i} className="flex justify-between text-parchment/80">
                      <span>{item.name}</span>
                      {item.quantity > 1 && <span className="text-parchment/50">x{item.quantity}</span>}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Background Equipment */}
              <div className="bg-background rounded-lg p-4">
                <h3 className="text-lg font-semibold text-parchment mb-3">
                  <span className="text-tertiary">Background:</span> {background} Equipment
                </h3>
                <ul className="space-y-2">
                  {(BACKGROUND_EQUIPMENT[background] || []).map((item, i) => (
                    <li key={i} className="flex justify-between text-parchment/80">
                      <span>{item.name}</span>
                      {item.quantity > 1 && <span className="text-parchment/50">x{item.quantity}</span>}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Total Gold */}
              <div className="bg-background rounded-lg p-4">
                <h3 className="text-lg font-semibold text-parchment mb-2">Starting Gold</h3>
                <div className="flex items-center gap-4">
                  <p className="text-amber text-2xl font-bold">
                    {(CLASS_STARTING_GOLD[className] || 10) + (BACKGROUND_GOLD[background] || 10)} gp
                  </p>
                  <span className="text-parchment/50 text-sm">
                    ({CLASS_STARTING_GOLD[className] || 10} from {className} + {BACKGROUND_GOLD[background] || 10} from {background})
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep('skills')}
                  className="px-6 py-3 border border-primary/30 text-primary rounded-lg hover:bg-primary/10"
                >
                  &larr; Back
                </button>
                <button
                  onClick={() => setStep('details')}
                  className="px-6 py-3 bg-primary text-background font-semibold rounded-lg hover:bg-primary-light"
                >
                  Next: Details &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Details */}
          {step === 'details' && (
            <div className="space-y-6">
              <h2 className="text-xl font-medieval text-primary mb-4">Backstory & Notes</h2>

              <div>
                <label className="block text-parchment/70 mb-2">Backstory (Optional)</label>
                <textarea
                  value={backstory}
                  onChange={(e) => setBackstory(e.target.value)}
                  placeholder="Tell us about your character's history, motivations, and personality..."
                  rows={6}
                  className="w-full px-4 py-3 bg-background border border-primary/30 rounded-lg text-parchment placeholder-parchment/40 focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep('equipment')}
                  className="px-6 py-3 border border-primary/30 text-primary rounded-lg hover:bg-primary/10"
                >
                  &larr; Back
                </button>
                <button
                  onClick={() => setStep('review')}
                  className="px-6 py-3 bg-primary text-background font-semibold rounded-lg hover:bg-primary-light"
                >
                  Next: Review &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <h2 className="text-xl font-medieval text-primary mb-4">Review Your Character</h2>

              <div className="bg-background rounded-lg p-6">
                <h3 className="text-2xl font-medieval text-primary mb-2">{name}</h3>
                <p className="text-parchment/70 mb-4">
                  Level 1 {race} {className} • {background} • {alignment}
                </p>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{maxHp}</div>
                    <div className="text-xs text-parchment/60">HP</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {10 + Math.floor((abilities.dexterity - 10) / 2)}
                    </div>
                    <div className="text-xs text-parchment/60">AC</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">30</div>
                    <div className="text-xs text-parchment/60">Speed</div>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-2 mb-4">
                  {(Object.entries(abilities) as [string, number][]).map(([key, value]) => (
                    <div key={key} className="text-center bg-surface rounded p-2">
                      <div className="text-xs text-parchment/60 uppercase">{key.slice(0, 3)}</div>
                      <div className="text-lg font-bold">{value}</div>
                      <div className="text-xs text-primary">
                        {Math.floor((value - 10) / 2) >= 0 ? '+' : ''}
                        {Math.floor((value - 10) / 2)}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedSkills.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm text-parchment/60 mb-1">Skill Proficiencies:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedSkills.map((skill) => (
                        <span key={skill} className="px-2 py-1 bg-primary/20 text-primary text-sm rounded">
                          {skill.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {backstory && (
                  <div>
                    <div className="text-sm text-parchment/60 mb-1">Backstory:</div>
                    <p className="text-parchment/80 text-sm">{backstory}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep('details')}
                  className="px-6 py-3 border border-primary/30 text-primary rounded-lg hover:bg-primary/10"
                >
                  &larr; Back
                </button>
                <button
                  onClick={createCharacter}
                  disabled={saving}
                  className="px-8 py-3 bg-forest text-background font-semibold rounded-lg hover:bg-forest/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Character'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
