import { NextRequest, NextResponse } from 'next/server';

// D&D 5e conditions with their effects
const CONDITIONS: Record<string, { name: string; description: string; effects: string[] }> = {
  blinded: {
    name: 'Blinded',
    description: 'A blinded creature can\'t see and automatically fails any ability check that requires sight.',
    effects: [
      'Can\'t see',
      'Automatically fails ability checks requiring sight',
      'Attack rolls against the creature have advantage',
      'The creature\'s attack rolls have disadvantage',
    ],
  },
  charmed: {
    name: 'Charmed',
    description: 'A charmed creature can\'t attack the charmer or target the charmer with harmful abilities or magical effects.',
    effects: [
      'Can\'t attack the charmer',
      'Can\'t target charmer with harmful abilities or spells',
      'The charmer has advantage on social interaction checks with the creature',
    ],
  },
  deafened: {
    name: 'Deafened',
    description: 'A deafened creature can\'t hear and automatically fails any ability check that requires hearing.',
    effects: [
      'Can\'t hear',
      'Automatically fails ability checks requiring hearing',
    ],
  },
  frightened: {
    name: 'Frightened',
    description: 'A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.',
    effects: [
      'Disadvantage on ability checks while source of fear is visible',
      'Disadvantage on attack rolls while source of fear is visible',
      'Can\'t willingly move closer to the source of its fear',
    ],
  },
  grappled: {
    name: 'Grappled',
    description: 'A grappled creature\'s speed becomes 0, and it can\'t benefit from any bonus to its speed.',
    effects: [
      'Speed becomes 0',
      'Can\'t benefit from bonuses to speed',
      'Condition ends if grappler is incapacitated',
      'Condition ends if effect removes grappled creature from reach',
    ],
  },
  incapacitated: {
    name: 'Incapacitated',
    description: 'An incapacitated creature can\'t take actions or reactions.',
    effects: [
      'Can\'t take actions',
      'Can\'t take reactions',
    ],
  },
  invisible: {
    name: 'Invisible',
    description: 'An invisible creature is impossible to see without the aid of magic or a special sense.',
    effects: [
      'Impossible to see without magic or special senses',
      'Considered heavily obscured for hiding purposes',
      'Can be detected by noise or tracks',
      'Attack rolls against the creature have disadvantage',
      'The creature\'s attack rolls have advantage',
    ],
  },
  paralyzed: {
    name: 'Paralyzed',
    description: 'A paralyzed creature is incapacitated and can\'t move or speak.',
    effects: [
      'Incapacitated (can\'t take actions or reactions)',
      'Can\'t move or speak',
      'Automatically fails Strength and Dexterity saving throws',
      'Attack rolls against the creature have advantage',
      'Attacks within 5 feet are automatic critical hits if they hit',
    ],
  },
  petrified: {
    name: 'Petrified',
    description: 'A petrified creature is transformed into a solid inanimate substance.',
    effects: [
      'Transformed to solid inanimate substance',
      'Weight increases by factor of 10',
      'Stops aging',
      'Incapacitated, can\'t move or speak, unaware of surroundings',
      'Attack rolls against have advantage',
      'Automatically fails Strength and Dexterity saves',
      'Resistance to all damage',
      'Immune to poison and disease (existing ones suspended)',
    ],
  },
  poisoned: {
    name: 'Poisoned',
    description: 'A poisoned creature has disadvantage on attack rolls and ability checks.',
    effects: [
      'Disadvantage on attack rolls',
      'Disadvantage on ability checks',
    ],
  },
  prone: {
    name: 'Prone',
    description: 'A prone creature\'s only movement option is to crawl, unless it stands up.',
    effects: [
      'Only movement option is crawling',
      'Standing up costs half movement speed',
      'Disadvantage on attack rolls',
      'Attacks from within 5 feet have advantage against creature',
      'Attacks from more than 5 feet have disadvantage against creature',
    ],
  },
  restrained: {
    name: 'Restrained',
    description: 'A restrained creature\'s speed becomes 0, and it can\'t benefit from any bonus to its speed.',
    effects: [
      'Speed becomes 0',
      'Can\'t benefit from bonuses to speed',
      'Attack rolls against creature have advantage',
      'Creature\'s attack rolls have disadvantage',
      'Disadvantage on Dexterity saving throws',
    ],
  },
  stunned: {
    name: 'Stunned',
    description: 'A stunned creature is incapacitated, can\'t move, and can speak only falteringly.',
    effects: [
      'Incapacitated (can\'t take actions or reactions)',
      'Can\'t move',
      'Can speak only falteringly',
      'Automatically fails Strength and Dexterity saving throws',
      'Attack rolls against creature have advantage',
    ],
  },
  unconscious: {
    name: 'Unconscious',
    description: 'An unconscious creature is incapacitated, can\'t move or speak, and is unaware of its surroundings.',
    effects: [
      'Incapacitated (can\'t take actions or reactions)',
      'Can\'t move or speak',
      'Unaware of surroundings',
      'Drops whatever it\'s holding and falls prone',
      'Automatically fails Strength and Dexterity saving throws',
      'Attack rolls against creature have advantage',
      'Attacks within 5 feet are automatic critical hits if they hit',
    ],
  },
  exhaustion: {
    name: 'Exhaustion',
    description: 'Exhaustion is measured in six levels. Effects are cumulative.',
    effects: [
      'Level 1: Disadvantage on ability checks',
      'Level 2: Speed halved',
      'Level 3: Disadvantage on attack rolls and saving throws',
      'Level 4: Hit point maximum halved',
      'Level 5: Speed reduced to 0',
      'Level 6: Death',
    ],
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const normalizedName = name.toLowerCase().replace(/\s+/g, '_');

    const condition = CONDITIONS[normalizedName];

    if (!condition) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Condition "${name}" not found` } },
        { status: 404 }
      );
    }

    return NextResponse.json({ condition });
  } catch (error) {
    console.error('Condition lookup failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to lookup condition' } },
      { status: 500 }
    );
  }
}
