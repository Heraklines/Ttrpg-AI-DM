/**
 * Soul Mirror - AI Backstory Generator
 * 
 * Generates rich, compelling character backstories based on quiz results.
 * Backstories are interesting, sometimes controversial, and reflect the
 * character's Big Five personality traits and D&D alignment.
 */

import { generateContent } from '@/lib/ai/client';
import { BigFiveScores, Alignment, DndClass, DndRace, DndBackground } from './types';

export interface BackstoryInput {
    scores: BigFiveScores;
    alignment: Alignment;
    race: DndRace;
    characterClass: DndClass;
    background: DndBackground;
    classReasoning: string;
    raceReasoning: string;
}

export interface GeneratedBackstory {
    backstory: string;           // Full narrative backstory (3-5 paragraphs)
    personalityTraits: string[]; // 2-3 distinct personality traits
    ideal: string;               // What they believe in
    bond: string;                // What they care about most
    flaw: string;                // Their weakness or dark secret
    originHook: string;          // One sentence adventure hook from their past
}

/**
 * Generate personality descriptors based on Big Five scores
 */
function getPersonalityDescriptors(scores: BigFiveScores): string {
    const descriptors: string[] = [];

    // Openness (O)
    if (scores.O >= 70) {
        descriptors.push('highly imaginative and curious, drawn to the unknown');
    } else if (scores.O >= 55) {
        descriptors.push('appreciates creativity while valuing practical wisdom');
    } else if (scores.O <= 30) {
        descriptors.push('prefers tradition and proven methods over experimentation');
    } else if (scores.O <= 45) {
        descriptors.push('practical-minded with occasional flights of fancy');
    }

    // Conscientiousness (C)
    if (scores.C >= 70) {
        descriptors.push('disciplined and methodical, always with a plan');
    } else if (scores.C >= 55) {
        descriptors.push('organized but flexible when needed');
    } else if (scores.C <= 30) {
        descriptors.push('spontaneous and impulsive, living in the moment');
    } else if (scores.C <= 45) {
        descriptors.push('free-spirited, sometimes to their own detriment');
    }

    // Extraversion (E)
    if (scores.E >= 70) {
        descriptors.push('charismatic and energized by social interaction');
    } else if (scores.E >= 55) {
        descriptors.push('socially adept but values quiet time');
    } else if (scores.E <= 30) {
        descriptors.push('deeply introspective, preferring solitude');
    } else if (scores.E <= 45) {
        descriptors.push('reserved, opening up only to trusted companions');
    }

    // Agreeableness (A)
    if (scores.A >= 70) {
        descriptors.push('compassionate and trusting, sometimes to a fault');
    } else if (scores.A >= 55) {
        descriptors.push('cooperative but not naive');
    } else if (scores.A <= 30) {
        descriptors.push('ruthlessly pragmatic, viewing compassion as weakness');
    } else if (scores.A <= 45) {
        descriptors.push('skeptical of others\' motives, self-reliant');
    }

    // Neuroticism (N)
    if (scores.N >= 70) {
        descriptors.push('emotionally intense, with deep passions and fears');
    } else if (scores.N >= 55) {
        descriptors.push('sensitive to slights, with occasional dark moods');
    } else if (scores.N <= 30) {
        descriptors.push('unnervingly calm under pressure, almost emotionless');
    } else if (scores.N <= 45) {
        descriptors.push('emotionally stable, rarely rattled');
    }

    return descriptors.join('; ');
}

/**
 * Generate alignment-specific story hooks and themes
 */
function getAlignmentThemes(alignment: Alignment): { themes: string; darkElement: string } {
    const alignmentThemes: Record<Alignment, { themes: string; darkElement: string }> = {
        'Lawful Good': {
            themes: 'justice, sacrifice, protecting the innocent, upholding oaths',
            darkElement: 'Perhaps they once failed to save someone, or their rigid code caused harm. Maybe they served a corrupt institution before seeing the truth.'
        },
        'Neutral Good': {
            themes: 'pragmatic heroism, doing what works, helping without ideology',
            darkElement: 'They may have broken laws for good reasons, or abandoned a cause when it became corrupt. Past moral compromises haunt them.'
        },
        'Chaotic Good': {
            themes: 'freedom, rebellion against tyranny, following conscience over law',
            darkElement: 'Their defiance may have caused unintended casualties. Perhaps they were once part of a violent revolution, or their family suffered for their principles.'
        },
        'Lawful Neutral': {
            themes: 'order, duty, contracts, the system above individuals',
            darkElement: 'They may have enforced unjust laws, or their devotion to order cost them personal relationships. Perhaps they once condemned an innocent following protocol.'
        },
        'True Neutral': {
            themes: 'balance, observation, surviving, philosophical detachment',
            darkElement: 'Their neutrality may stem from past trauma where picking sides led to disaster. They might have stood by during atrocities, unable to choose.'
        },
        'Chaotic Neutral': {
            themes: 'personal freedom, unpredictability, self-interest with occasional heart',
            darkElement: 'They have likely betrayed people for their own benefit, or their chaos caused innocent suffering. Trust issues from past betrayals may drive them.'
        },
        'Lawful Evil': {
            themes: 'ambition through structure, manipulation of rules, power through hierarchy',
            darkElement: 'They have crushed rivals using legal means, or served dark masters with perfect loyalty. Their rise to power left bodies in its wake—all technically justified.'
        },
        'Neutral Evil': {
            themes: 'pure self-interest, pragmatic cruelty, survival without conscience',
            darkElement: 'They have done terrible things for personal gain—murder, betrayal, exploitation. They may not even see themselves as evil, just realistic.'
        },
        'Chaotic Evil': {
            themes: 'destruction, spite, freedom through dominance, chaos for its own sake',
            darkElement: 'They revel in breaking things—rules, people, hope. Perhaps abuse or tragedy warped them, or they simply discovered they enjoy causing pain.'
        }
    };

    return alignmentThemes[alignment];
}

/**
 * Generate a rich backstory using AI with timeout
 */
export async function generateBackstory(input: BackstoryInput): Promise<GeneratedBackstory> {
    const personalityDesc = getPersonalityDescriptors(input.scores);
    const { themes, darkElement } = getAlignmentThemes(input.alignment);

    // Use a shorter, more focused prompt for faster generation
    const prompt = `Create a D&D character backstory as JSON.

CHARACTER: ${input.race} ${input.characterClass}, ${input.background} background, ${input.alignment}
PERSONALITY: ${personalityDesc}
THEMES: ${themes}
DARK ELEMENT: ${darkElement}

Requirements:
- 2-3 paragraphs, specific names/places/events
- Include morally complex elements fitting their alignment
- Explain why they're adventuring now

Respond ONLY with this JSON (no markdown):
{"backstory":"...","personalityTraits":["trait1","trait2"],"ideal":"...","bond":"...","flaw":"...","originHook":"..."}`;

    try {
        // Add timeout to AI call
        const timeoutPromise = new Promise<string>((_, reject) => {
            setTimeout(() => reject(new Error('AI generation timeout')), 45000);
        });
        
        const responseText = await Promise.race([
            generateContent(prompt),
            timeoutPromise
        ]);

        // Find JSON in the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('Failed to extract JSON from AI response:', responseText);
            return generateFallbackBackstory(input);
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate and return
        return {
            backstory: parsed.backstory || generateFallbackBackstory(input).backstory,
            personalityTraits: Array.isArray(parsed.personalityTraits) 
                ? parsed.personalityTraits.slice(0, 3) 
                : ['Determined', 'Resourceful'],
            ideal: parsed.ideal || 'Something worth fighting for.',
            bond: parsed.bond || 'A debt that must be repaid.',
            flaw: parsed.flaw || 'Trusts too easily.',
            originHook: parsed.originHook || 'An old enemy still searches for them.',
        };
    } catch (error) {
        console.error('Error generating backstory:', error);
        return generateFallbackBackstory(input);
    }
}

/**
 * Generate a fallback backstory if AI fails
 */
function generateFallbackBackstory(input: BackstoryInput): GeneratedBackstory {
    const { alignment, race, characterClass, background, scores } = input;
    
    const fallbackStories: Record<string, string> = {
        'Lawful Good': `Born to a family of modest means in the bustling city of Millbrook, this ${race} was raised on tales of heroes and the importance of justice. Their path toward becoming a ${characterClass} began when they witnessed local guards turn a blind eye to a merchant's corruption. That moment of institutional failure ignited a fire—they would become the justice the system failed to provide. Years of training followed, marked by the guidance of an aging knight named Sir Aldric Thornwood, who saw in them the potential for greatness. When Sir Aldric died defending refugees from bandits, they inherited not just his teachings but his mission: to protect those who cannot protect themselves, even when the law proves insufficient.`,
        
        'Chaotic Good': `The streets of Thornhaven taught this ${race} that laws serve the powerful. As a child in the Mudside slums, they learned to steal bread and dodge guards before learning to read. Their transformation into a ${characterClass} came through Mara the Red, a revolutionary who ran a network of spies and saboteurs against the corrupt Duke. When Mara was captured and executed, they inherited her cause and her enemies. Now they fight against tyranny wherever they find it, their methods unconventional but their heart firmly on the side of the oppressed. The Duke's agents still search for them.`,
        
        'Neutral Evil': `Survival was the first lesson, and morality the first casualty for this ${race}. Abandoned at the Temple of Serenitas in Goldshore, they learned early that the priests' charity had strings attached—and that everyone, holy or not, served their own interests. As a ${characterClass}, they've come to understand that power is the only true currency. Their mentor, a shadowy figure known only as "The Curator," taught them to acquire it by any means necessary. When The Curator was poisoned by a rival, they didn't mourn—they took notes. Now they adventure to accumulate wealth and influence, viewing companions as useful tools.`,
        
        'Chaotic Evil': `Violence found this ${race} early, in the burning wreckage of their village in the Ashlands. Whether it was the trauma or something that was always there, something broke that day—or perhaps was finally set free. As a ${characterClass}, they've discovered they enjoy breaking things: rules, expectations, and occasionally people. The raider captain Vorn Blacktooth recognized their potential and forged them into a weapon. When they eventually killed Vorn and took his place, no one was surprised. Adventure calls now—not for redemption, but for the thrill of chaos and the satisfaction of proving that nothing is sacred.`,
    };

    // Select closest alignment story
    let backstoryTemplate = fallbackStories[alignment];
    if (!backstoryTemplate) {
        // Default to neutral template
        backstoryTemplate = `This ${race} ${characterClass} has walked a complex path. Their ${background} background shaped their worldview, teaching them that the world rarely deals in simple good and evil. Various mentors and rivals have left their marks, and now they seek their fortune through adventure. What drives them remains known only to themselves, but their skills are undeniable and their determination unwavering.`;
    }

    return {
        backstory: backstoryTemplate,
        personalityTraits: [
            scores.E >= 50 ? 'Quick to speak and act in social situations' : 'Prefers to observe before engaging',
            scores.C >= 50 ? 'Plans carefully before taking action' : 'Trusts instinct over strategy',
        ],
        ideal: alignment.includes('Good') 
            ? 'The strong must protect the weak.' 
            : alignment.includes('Evil')
                ? 'Power determines worth.'
                : 'Balance must be maintained.',
        bond: 'Someone from the past who shaped who they are today.',
        flaw: scores.N >= 50 
            ? 'Past trauma surfaces at the worst moments.'
            : 'Overconfidence blinds them to danger.',
        originHook: 'An old debt—or an old enemy—awaits resolution.',
    };
}
