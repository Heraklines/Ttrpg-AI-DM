import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const AbilitySchema = z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']);
const SkillSchema = z.enum([
  'acrobatics', 'animal_handling', 'arcana', 'athletics',
  'deception', 'history', 'insight', 'intimidation',
  'investigation', 'medicine', 'nature', 'perception',
  'performance', 'persuasion', 'religion', 'sleight_of_hand',
  'stealth', 'survival'
]);

const InventoryItemSchema = z.object({
  name: z.string(),
  quantity: z.number().int().min(1).default(1),
});

const CreateCharacterSchema = z.object({
  campaignId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  race: z.string().min(1).max(50),
  className: z.string().min(1).max(50),
  subclass: z.string().optional(),
  level: z.number().int().min(1).max(20).default(1),
  background: z.string().optional(),
  alignment: z.string().optional(),
  strength: z.number().int().min(1).max(30).default(10),
  dexterity: z.number().int().min(1).max(30).default(10),
  constitution: z.number().int().min(1).max(30).default(10),
  intelligence: z.number().int().min(1).max(30).default(10),
  wisdom: z.number().int().min(1).max(30).default(10),
  charisma: z.number().int().min(1).max(30).default(10),
  maxHp: z.number().int().min(1),
  currentHp: z.number().int().min(0).optional(),
  armorClass: z.number().int().min(0).max(30).default(10),
  speed: z.number().int().min(0).max(120).default(30),
  hitDiceType: z.union([z.literal(6), z.literal(8), z.literal(10), z.literal(12)]).default(8),
  savingThrowProficiencies: z.array(AbilitySchema).default([]),
  skillProficiencies: z.array(SkillSchema).default([]),
  skillExpertise: z.array(SkillSchema).default([]),
  spellcastingAbility: AbilitySchema.optional(),
  inventory: z.array(InventoryItemSchema).default([]),
  gold: z.number().int().min(0).default(0),
  backstory: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    // If campaignId provided, filter by it; otherwise return ALL characters
    const whereClause = campaignId ? { campaignId } : {};

    const characters = await prisma.character.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ characters });
  } catch (error) {
    console.error('Failed to fetch characters:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch characters' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateCharacterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid input', details: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    // If campaignId provided, verify it exists
    if (parsed.data.campaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: parsed.data.campaignId },
      });

      if (!campaign) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Campaign not found' } },
          { status: 404 }
        );
      }
    }

    const character = await prisma.character.create({
      data: {
        campaignId: parsed.data.campaignId || null,
        name: parsed.data.name,
        race: parsed.data.race,
        className: parsed.data.className,
        subclass: parsed.data.subclass,
        level: parsed.data.level,
        background: parsed.data.background,
        alignment: parsed.data.alignment,
        strength: parsed.data.strength,
        dexterity: parsed.data.dexterity,
        constitution: parsed.data.constitution,
        intelligence: parsed.data.intelligence,
        wisdom: parsed.data.wisdom,
        charisma: parsed.data.charisma,
        maxHp: parsed.data.maxHp,
        currentHp: parsed.data.currentHp ?? parsed.data.maxHp,
        armorClass: parsed.data.armorClass,
        speed: parsed.data.speed,
        hitDiceType: parsed.data.hitDiceType,
        hitDiceRemaining: parsed.data.level,
        savingThrowProficiencies: JSON.stringify(parsed.data.savingThrowProficiencies),
        skillProficiencies: JSON.stringify(parsed.data.skillProficiencies),
        skillExpertise: JSON.stringify(parsed.data.skillExpertise),
        spellcastingAbility: parsed.data.spellcastingAbility,
        inventory: JSON.stringify(parsed.data.inventory),
        gold: parsed.data.gold,
        backstory: parsed.data.backstory,
      },
    });

    return NextResponse.json({ character }, { status: 201 });
  } catch (error) {
    console.error('Failed to create character:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create character' } },
      { status: 500 }
    );
  }
}
