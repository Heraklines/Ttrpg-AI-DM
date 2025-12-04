/**
 * POST /api/quiz/[sessionId]/create-character
 * 
 * Creates a character from quiz results and associates them with the campaign.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
    params: Promise<{ sessionId: string }>;
}

// Class hit dice mapping
const CLASS_HIT_DICE: Record<string, number> = {
    Barbarian: 12, Bard: 8, Cleric: 8, Druid: 8, Fighter: 10,
    Monk: 8, Paladin: 10, Ranger: 10, Rogue: 8, Sorcerer: 6, Warlock: 8, Wizard: 6,
};

// Class saving throw proficiencies
const CLASS_SAVING_THROWS: Record<string, string[]> = {
    Barbarian: ['strength', 'constitution'],
    Bard: ['dexterity', 'charisma'],
    Cleric: ['wisdom', 'charisma'],
    Druid: ['intelligence', 'wisdom'],
    Fighter: ['strength', 'constitution'],
    Monk: ['strength', 'dexterity'],
    Paladin: ['wisdom', 'charisma'],
    Ranger: ['strength', 'dexterity'],
    Rogue: ['dexterity', 'intelligence'],
    Sorcerer: ['constitution', 'charisma'],
    Warlock: ['wisdom', 'charisma'],
    Wizard: ['intelligence', 'wisdom'],
};

// Class starting equipment
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

// Calculate modifier from ability score
function getModifier(score: number): number {
    return Math.floor((score - 10) / 2);
}

export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { sessionId } = await params;
        const body = await request.json();
        const { name } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { error: { code: 'INVALID_NAME', message: 'Character name is required' } },
                { status: 400 }
            );
        }

        // Get quiz session with result
        const session = await prisma.quizSession.findUnique({
            where: { id: sessionId },
            include: {
                result: true,
                campaign: true,
            },
        });

        if (!session) {
            return NextResponse.json(
                { error: { code: 'SESSION_NOT_FOUND', message: 'Quiz session not found' } },
                { status: 404 }
            );
        }

        if (!session.result) {
            return NextResponse.json(
                { error: { code: 'NO_RESULT', message: 'Quiz must be completed first' } },
                { status: 400 }
            );
        }

        const result = session.result;

        // Parse abilities
        const abilities = JSON.parse(result.suggestedAbilities);
        const className = result.suggestedClass;
        
        // Calculate HP
        const hitDice = CLASS_HIT_DICE[className] || 8;
        const conModifier = getModifier(abilities.constitution);
        const maxHp = hitDice + conModifier;
        
        // Get starting equipment
        const classEquipment = CLASS_STARTING_EQUIPMENT[className] || [];
        const startingGold = CLASS_STARTING_GOLD[className] || 10;
        
        // Get saving throw proficiencies
        const savingThrows = CLASS_SAVING_THROWS[className] || [];

        // Calculate AC (base 10 + dex mod, assumes no armor yet)
        const dexModifier = getModifier(abilities.dexterity);
        let armorClass = 10 + dexModifier;
        
        // Adjust for classes that get armor
        if (['Fighter', 'Paladin', 'Cleric'].includes(className)) {
            // Chain mail = AC 16 (no dex bonus)
            armorClass = 16;
        } else if (['Ranger', 'Druid'].includes(className)) {
            // Scale mail = AC 14 + dex (max 2)
            armorClass = 14 + Math.min(dexModifier, 2);
        } else if (['Bard', 'Rogue', 'Warlock'].includes(className)) {
            // Leather armor = AC 11 + dex
            armorClass = 11 + dexModifier;
        } else if (className === 'Barbarian') {
            // Unarmored defense = 10 + dex + con
            armorClass = 10 + dexModifier + conModifier;
        } else if (className === 'Monk') {
            // Unarmored defense = 10 + dex + wis
            const wisModifier = getModifier(abilities.wisdom);
            armorClass = 10 + dexModifier + wisModifier;
        }

        // Parse personality traits
        const personalityTraits = result.personalityTraits 
            ? JSON.parse(result.personalityTraits) 
            : [];

        // Create the character
        const character = await prisma.character.create({
            data: {
                campaignId: session.campaignId,
                name: name.trim(),
                race: result.suggestedRace,
                className: result.suggestedClass,
                level: 1,
                background: result.suggestedBackground,
                alignment: result.alignment,
                strength: abilities.strength,
                dexterity: abilities.dexterity,
                constitution: abilities.constitution,
                intelligence: abilities.intelligence,
                wisdom: abilities.wisdom,
                charisma: abilities.charisma,
                maxHp,
                currentHp: maxHp,
                armorClass,
                hitDiceType: hitDice,
                hitDiceRemaining: 1,
                savingThrowProficiencies: JSON.stringify(savingThrows),
                skillProficiencies: JSON.stringify([]), // Could be enhanced later
                inventory: JSON.stringify(classEquipment),
                gold: startingGold,
                backstory: result.backstory || '',
                notes: [
                    result.ideal ? `Ideal: ${result.ideal}` : '',
                    result.bond ? `Bond: ${result.bond}` : '',
                    result.flaw ? `Flaw: ${result.flaw}` : '',
                    personalityTraits.length > 0 
                        ? `Personality: ${personalityTraits.join('; ')}` 
                        : '',
                ].filter(Boolean).join('\n\n'),
            },
        });

        console.log(`[Quiz] Created character ${character.id} (${character.name}) for campaign ${session.campaignId}`);

        return NextResponse.json({
            character: {
                id: character.id,
                name: character.name,
                race: character.race,
                className: character.className,
                level: character.level,
                background: character.background,
                alignment: character.alignment,
            },
            campaignId: session.campaignId,
            redirectUrl: `/campaign/${session.campaignId}/setup`,
        });
    } catch (error) {
        console.error('Error creating character from quiz:', error);
        return NextResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Failed to create character' } },
            { status: 500 }
        );
    }
}
