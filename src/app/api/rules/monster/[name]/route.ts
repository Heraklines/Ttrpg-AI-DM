import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const DND_API_BASE = 'https://www.dnd5eapi.co/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const normalizedName = name.toLowerCase().replace(/\s+/g, '-');

    // Check cache first
    const cached = await prisma.monsterCache.findUnique({
      where: { id: normalizedName },
    });

    if (cached) {
      const cacheAge = Date.now() - cached.fetchedAt.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;

      if (cacheAge < oneDayMs) {
        return NextResponse.json({
          source: 'cache',
          monster: JSON.parse(cached.data),
        });
      }
    }

    // Fetch from D&D 5e API
    const response = await fetch(`${DND_API_BASE}/monsters/${normalizedName}`);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: `Monster "${name}" not found` } },
          { status: 404 }
        );
      }
      throw new Error(`D&D API error: ${response.status}`);
    }

    const monsterData = await response.json();

    // Transform to our format
    const monster = {
      name: monsterData.name,
      size: monsterData.size,
      type: monsterData.type,
      alignment: monsterData.alignment,
      armorClass: monsterData.armor_class?.[0]?.value || 10,
      hitPoints: monsterData.hit_points,
      hitDice: monsterData.hit_dice,
      speed: {
        walk: monsterData.speed?.walk ? parseInt(monsterData.speed.walk) : 30,
        fly: monsterData.speed?.fly ? parseInt(monsterData.speed.fly) : undefined,
        swim: monsterData.speed?.swim ? parseInt(monsterData.speed.swim) : undefined,
        burrow: monsterData.speed?.burrow ? parseInt(monsterData.speed.burrow) : undefined,
        climb: monsterData.speed?.climb ? parseInt(monsterData.speed.climb) : undefined,
      },
      abilityScores: {
        strength: monsterData.strength,
        dexterity: monsterData.dexterity,
        constitution: monsterData.constitution,
        intelligence: monsterData.intelligence,
        wisdom: monsterData.wisdom,
        charisma: monsterData.charisma,
      },
      challengeRating: monsterData.challenge_rating,
      xp: monsterData.xp,
      actions: monsterData.actions?.map((a: { name: string; desc: string; attack_bonus?: number; damage?: Array<{ damage_dice: string; damage_type: { name: string } }> }) => ({
        name: a.name,
        desc: a.desc,
        attackBonus: a.attack_bonus,
        damage: a.damage?.map((d) => ({
          dice: d.damage_dice,
          type: d.damage_type?.name?.toLowerCase(),
        })),
      })) || [],
      traits: monsterData.special_abilities?.map((t: { name: string; desc: string }) => ({
        name: t.name,
        desc: t.desc,
      })) || [],
      damageResistances: monsterData.damage_resistances || [],
      damageImmunities: monsterData.damage_immunities || [],
      conditionImmunities: monsterData.condition_immunities?.map((c: { name: string }) => c.name.toLowerCase()) || [],
      senses: monsterData.senses ? Object.entries(monsterData.senses).map(([k, v]) => `${k}: ${v}`) : [],
      languages: monsterData.languages || '',
    };

    // Cache it
    await prisma.monsterCache.upsert({
      where: { id: normalizedName },
      create: {
        id: normalizedName,
        name: monster.name,
        data: JSON.stringify(monster),
      },
      update: {
        data: JSON.stringify(monster),
        fetchedAt: new Date(),
      },
    });

    return NextResponse.json({
      source: 'api',
      monster,
    });
  } catch (error) {
    console.error('Monster lookup failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to lookup monster' } },
      { status: 500 }
    );
  }
}
