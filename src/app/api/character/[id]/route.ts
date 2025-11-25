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

const UpdateCharacterSchema = z.object({
  campaignId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(100).optional(),
  race: z.string().min(1).max(50).optional(),
  className: z.string().min(1).max(50).optional(),
  subclass: z.string().nullable().optional(),
  level: z.number().int().min(1).max(20).optional(),
  background: z.string().nullable().optional(),
  alignment: z.string().nullable().optional(),
  strength: z.number().int().min(1).max(30).optional(),
  dexterity: z.number().int().min(1).max(30).optional(),
  constitution: z.number().int().min(1).max(30).optional(),
  intelligence: z.number().int().min(1).max(30).optional(),
  wisdom: z.number().int().min(1).max(30).optional(),
  charisma: z.number().int().min(1).max(30).optional(),
  maxHp: z.number().int().min(1).optional(),
  currentHp: z.number().int().min(0).optional(),
  tempHp: z.number().int().min(0).optional(),
  armorClass: z.number().int().min(0).max(30).optional(),
  speed: z.number().int().min(0).max(120).optional(),
  hitDiceType: z.union([z.literal(6), z.literal(8), z.literal(10), z.literal(12)]).optional(),
  hitDiceRemaining: z.number().int().min(0).optional(),
  deathSaveSuccesses: z.number().int().min(0).max(3).optional(),
  deathSaveFailures: z.number().int().min(0).max(3).optional(),
  savingThrowProficiencies: z.array(AbilitySchema).optional(),
  skillProficiencies: z.array(SkillSchema).optional(),
  skillExpertise: z.array(SkillSchema).optional(),
  spellcastingAbility: AbilitySchema.nullable().optional(),
  gold: z.number().int().min(0).optional(),
  backstory: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const character = await prisma.character.findUnique({
      where: { id },
    });

    if (!character) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Character not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ character });
  } catch (error) {
    console.error('Failed to fetch character:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch character' } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateCharacterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid input', details: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const existingCharacter = await prisma.character.findUnique({
      where: { id },
    });

    if (!existingCharacter) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Character not found' } },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const { savingThrowProficiencies, skillProficiencies, skillExpertise, ...simpleFields } = parsed.data;

    // Handle simple fields
    for (const [key, value] of Object.entries(simpleFields)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    // Handle JSON array fields
    if (savingThrowProficiencies !== undefined) {
      updateData.savingThrowProficiencies = JSON.stringify(savingThrowProficiencies);
    }
    if (skillProficiencies !== undefined) {
      updateData.skillProficiencies = JSON.stringify(skillProficiencies);
    }
    if (skillExpertise !== undefined) {
      updateData.skillExpertise = JSON.stringify(skillExpertise);
    }

    const character = await prisma.character.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ character });
  } catch (error) {
    console.error('Failed to update character:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update character' } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PATCH is same as PUT for partial updates
  return PUT(request, { params });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existingCharacter = await prisma.character.findUnique({
      where: { id },
    });

    if (!existingCharacter) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Character not found' } },
        { status: 404 }
      );
    }

    await prisma.character.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete character:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete character' } },
      { status: 500 }
    );
  }
}
