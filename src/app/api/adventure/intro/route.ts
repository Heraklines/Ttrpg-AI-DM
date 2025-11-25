import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { orchestrator } from '@/lib/ai/orchestrator';
import type { Character } from '@/lib/engine/types';

const IntroSchema = z.object({
  campaignId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = IntroSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid input' } },
        { status: 422 }
      );
    }

    const { campaignId } = parsed.data;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        characters: true,
        gameState: true,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    if (!campaign.characters || campaign.characters.length === 0) {
      return NextResponse.json(
        { error: { code: 'NO_CHARACTERS', message: 'Create at least one character before starting the adventure' } },
        { status: 400 }
      );
    }

    // Convert database characters to Character type
    const characters: Character[] = campaign.characters.map((c) => ({
      id: c.id,
      campaignId: c.campaignId,
      name: c.name,
      race: c.race,
      className: c.className,
      level: c.level,
      abilityScores: {
        strength: c.strength,
        dexterity: c.dexterity,
        constitution: c.constitution,
        intelligence: c.intelligence,
        wisdom: c.wisdom,
        charisma: c.charisma,
      },
      maxHp: c.maxHp,
      currentHp: c.currentHp,
      tempHp: c.tempHp,
      armorClass: c.armorClass,
      speed: c.speed,
      hitDiceType: c.hitDiceType as 6 | 8 | 10 | 12,
      hitDiceRemaining: c.hitDiceRemaining,
      deathSaveSuccesses: c.deathSaveSuccesses,
      deathSaveFailures: c.deathSaveFailures,
      savingThrowProficiencies: JSON.parse(c.savingThrowProficiencies || '[]'),
      skillProficiencies: JSON.parse(c.skillProficiencies || '[]'),
      skillExpertise: JSON.parse(c.skillExpertise || '[]'),
      spellSlots: JSON.parse(c.spellSlots || '{}'),
      knownSpells: JSON.parse(c.knownSpells || '[]'),
      preparedSpells: JSON.parse(c.preparedSpells || '[]'),
      classResources: JSON.parse(c.classResources || '[]'),
      inventory: JSON.parse(c.inventory || '[]'),
      equippedItems: JSON.parse(c.equippedItems || '{}'),
      gold: c.gold,
      conditions: JSON.parse(c.conditions || '[]'),
      features: JSON.parse(c.features || '[]'),
      backstory: c.backstory || undefined,
    }));

    // Build context for intro generation
    const context = {
      campaignId,
      campaignName: campaign.name,
      campaignDescription: campaign.description,
      characters,
      gameState: {
        mode: campaign.gameState?.mode || 'exploration',
        gameDay: campaign.gameState?.gameDay || 1,
        gameHour: campaign.gameState?.gameHour || 8,
        gameMinute: campaign.gameState?.gameMinute || 0,
        activeCombat: null,
        recentMessages: [],
      },
    };

    // Generate the intro
    const intro = await orchestrator.generateCampaignIntro(context);

    // Store the intro in recent messages
    if (campaign.gameState) {
      const recentMessages = JSON.parse(campaign.gameState.recentMessages || '[]');
      recentMessages.push({
        role: 'assistant',
        content: intro,
        timestamp: Date.now(),
        type: 'intro',
      });

      await prisma.gameState.update({
        where: { id: campaign.gameState.id },
        data: {
          recentMessages: JSON.stringify(recentMessages),
        },
      });
    }

    return NextResponse.json({ intro });
  } catch (error) {
    console.error('Failed to generate intro:', error);
    return NextResponse.json(
      { error: { code: 'AI_ERROR', message: error instanceof Error ? error.message : 'Failed to generate intro' } },
      { status: 500 }
    );
  }
}
