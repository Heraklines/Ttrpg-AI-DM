import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateContent } from '@/lib/ai/client';
import {
    GenerateBackstoryRequest,
    GenerateBackstoryResponse,
    QuizResultDB,
    parseQuizResult,
} from '@/lib/quiz/types';

/**
 * POST /api/quiz/generate-backstory
 * 
 * Generates an AI-powered backstory and personality traits for a quiz result.
 * Uses the character recommendation (race, class, background, alignment) and
 * Big Five scores to create a rich narrative backstory.
 */
export async function POST(request: NextRequest) {
    try {
        const body: GenerateBackstoryRequest = await request.json();
        const { resultId } = body;

        if (!resultId) {
            return NextResponse.json(
                { error: { code: 'MISSING_RESULT_ID', message: 'Result ID is required' } },
                { status: 400 }
            );
        }

        // Get the quiz result
        const resultDB = await prisma.quizResult.findUnique({
            where: { id: resultId },
        }) as QuizResultDB | null;

        if (!resultDB) {
            return NextResponse.json(
                { error: { code: 'RESULT_NOT_FOUND', message: 'Quiz result not found' } },
                { status: 404 }
            );
        }

        const result = parseQuizResult(resultDB);

        // Check if backstory already exists
        if (result.backstory) {
            return NextResponse.json({
                backstory: result.backstory,
                personalityTraits: result.personalityTraits,
                ideal: result.ideal,
                bond: result.bond,
                flaw: result.flaw,
                suggestedAbilities: result.suggestedAbilities,
            } as GenerateBackstoryResponse);
        }

        // Generate personality description based on Big Five scores
        const personalityDescription = generatePersonalityDescription(
            result.openness,
            result.conscientiousness,
            result.extraversion,
            result.agreeableness,
            result.neuroticism
        );

        // Build the AI prompt
        const systemInstruction = `You are a creative D&D character backstory writer. Create rich, evocative backstories that bring characters to life while respecting the established D&D lore. Your writing should be immersive and suitable for a fantasy RPG setting.`;

        const prompt = `Generate a compelling D&D 5e character backstory and personality traits based on this personality profile:

CHARACTER PROFILE:
- Race: ${result.suggestedRace}
- Class: ${result.suggestedClass}
- Background: ${result.suggestedBackground}
- Alignment: ${result.alignment}

PERSONALITY (based on psychological assessment):
${personalityDescription}

Please generate the following in JSON format:
{
  "backstory": "A 2-3 paragraph backstory (150-250 words) that explains the character's origins, formative experiences, and what led them to become a ${result.suggestedClass}. Include specific details that reflect their ${result.alignment} alignment and ${result.suggestedBackground} background.",
  "personalityTraits": ["Two personality traits that define how they interact with others, reflecting their personality scores"],
  "ideal": "One sentence describing what they believe in most strongly (connected to their alignment)",
  "bond": "One sentence describing what or whom they care about most",
  "flaw": "One sentence describing a weakness or blind spot that could cause problems"
}

Respond ONLY with the JSON object, no additional text.`;

        const aiResponse = await generateContent(prompt, systemInstruction);

        // Parse the AI response
        let generatedContent: {
            backstory: string;
            personalityTraits: string[];
            ideal: string;
            bond: string;
            flaw: string;
        };

        try {
            // Try to extract JSON from the response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            generatedContent = JSON.parse(jsonMatch[0]);
        } catch {
            console.error('Failed to parse AI response:', aiResponse);
            return NextResponse.json(
                { error: { code: 'AI_PARSE_ERROR', message: 'Failed to parse AI-generated backstory' } },
                { status: 500 }
            );
        }

        // Validate the parsed content
        if (
            !generatedContent.backstory ||
            !generatedContent.personalityTraits ||
            !generatedContent.ideal ||
            !generatedContent.bond ||
            !generatedContent.flaw
        ) {
            return NextResponse.json(
                { error: { code: 'AI_INCOMPLETE', message: 'AI response missing required fields' } },
                { status: 500 }
            );
        }

        // Update the result with the generated backstory
        await prisma.quizResult.update({
            where: { id: resultId },
            data: {
                backstory: generatedContent.backstory,
                personalityTraits: JSON.stringify(generatedContent.personalityTraits),
                ideal: generatedContent.ideal,
                bond: generatedContent.bond,
                flaw: generatedContent.flaw,
            },
        });

        return NextResponse.json({
            backstory: generatedContent.backstory,
            personalityTraits: generatedContent.personalityTraits,
            ideal: generatedContent.ideal,
            bond: generatedContent.bond,
            flaw: generatedContent.flaw,
            suggestedAbilities: result.suggestedAbilities,
        } as GenerateBackstoryResponse);
    } catch (error) {
        console.error('Error generating backstory:', error);
        return NextResponse.json(
            {
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            },
            { status: 500 }
        );
    }
}

/**
 * Generate a natural language description of personality based on Big Five scores.
 */
function generatePersonalityDescription(
    openness: number,
    conscientiousness: number,
    extraversion: number,
    agreeableness: number,
    neuroticism: number
): string {
    const descriptions: string[] = [];

    // Openness
    if (openness >= 70) {
        descriptions.push('Highly curious and imaginative, drawn to new ideas and creative solutions');
    } else if (openness >= 55) {
        descriptions.push('Appreciates creativity but also values practical approaches');
    } else if (openness <= 30) {
        descriptions.push('Prefers tradition and proven methods over experimentation');
    } else {
        descriptions.push('Balanced between curiosity and practicality');
    }

    // Conscientiousness
    if (conscientiousness >= 70) {
        descriptions.push('Disciplined and organized, plans carefully before acting');
    } else if (conscientiousness >= 55) {
        descriptions.push('Generally reliable and goal-oriented');
    } else if (conscientiousness <= 30) {
        descriptions.push('Spontaneous and flexible, prefers to adapt rather than plan');
    } else {
        descriptions.push('Moderately organized with room for spontaneity');
    }

    // Extraversion
    if (extraversion >= 70) {
        descriptions.push('Energized by social interaction, naturally takes the lead in groups');
    } else if (extraversion >= 55) {
        descriptions.push('Comfortable in social settings, enjoys company');
    } else if (extraversion <= 30) {
        descriptions.push('Introspective and reserved, prefers solitude or small groups');
    } else {
        descriptions.push('Balanced between solitude and social engagement');
    }

    // Agreeableness
    if (agreeableness >= 70) {
        descriptions.push('Compassionate and cooperative, prioritizes harmony');
    } else if (agreeableness >= 55) {
        descriptions.push('Generally friendly and willing to help others');
    } else if (agreeableness <= 30) {
        descriptions.push('Independent-minded, prioritizes personal goals over pleasing others');
    } else {
        descriptions.push('Selective in trust, helpful to those who earn it');
    }

    // Neuroticism (Emotional Stability inverse)
    if (neuroticism >= 70) {
        descriptions.push('Emotionally intense, experiences feelings deeply');
    } else if (neuroticism >= 55) {
        descriptions.push('Sensitive to stress, but manages with effort');
    } else if (neuroticism <= 30) {
        descriptions.push('Emotionally stable and resilient under pressure');
    } else {
        descriptions.push('Generally calm with occasional emotional moments');
    }

    return descriptions.map((d, i) => `- ${d}`).join('\n');
}
