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
    const cached = await prisma.spellCache.findUnique({
      where: { id: normalizedName },
    });

    if (cached) {
      const cacheAge = Date.now() - cached.fetchedAt.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;

      if (cacheAge < oneDayMs) {
        return NextResponse.json({
          source: 'cache',
          spell: JSON.parse(cached.data),
        });
      }
    }

    // Fetch from D&D 5e API
    const response = await fetch(`${DND_API_BASE}/spells/${normalizedName}`);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: `Spell "${name}" not found` } },
          { status: 404 }
        );
      }
      throw new Error(`D&D API error: ${response.status}`);
    }

    const spellData = await response.json();

    // Transform to our format
    const spell = {
      name: spellData.name,
      level: spellData.level,
      school: spellData.school?.name,
      castingTime: spellData.casting_time,
      range: spellData.range,
      components: spellData.components,
      material: spellData.material,
      duration: spellData.duration,
      concentration: spellData.concentration,
      ritual: spellData.ritual,
      description: spellData.desc?.join('\n\n'),
      higherLevel: spellData.higher_level?.join('\n\n'),
      classes: spellData.classes?.map((c: { name: string }) => c.name),
      damage: spellData.damage ? {
        type: spellData.damage.damage_type?.name,
        atSlotLevel: spellData.damage.damage_at_slot_level,
        atCharacterLevel: spellData.damage.damage_at_character_level,
      } : undefined,
      dc: spellData.dc ? {
        type: spellData.dc.dc_type?.name,
        success: spellData.dc.dc_success,
      } : undefined,
      areaOfEffect: spellData.area_of_effect ? {
        type: spellData.area_of_effect.type,
        size: spellData.area_of_effect.size,
      } : undefined,
    };

    // Cache it
    await prisma.spellCache.upsert({
      where: { id: normalizedName },
      create: {
        id: normalizedName,
        name: spell.name,
        data: JSON.stringify(spell),
      },
      update: {
        data: JSON.stringify(spell),
        fetchedAt: new Date(),
      },
    });

    return NextResponse.json({
      source: 'api',
      spell,
    });
  } catch (error) {
    console.error('Spell lookup failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to lookup spell' } },
      { status: 500 }
    );
  }
}
