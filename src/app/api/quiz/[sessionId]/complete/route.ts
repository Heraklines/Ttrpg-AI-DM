/**
 * POST /api/quiz/[sessionId]/complete
 * 
 * Complete a quiz session and generate character recommendation with backstory.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateCharacterRecommendation } from '@/lib/quiz/character-mapper';
import { generateBackstory, BackstoryInput } from '@/lib/quiz/backstory-generator';
import { BigFiveScores } from '@/lib/quiz/types';
import { randomBytes } from 'crypto';

interface RouteParams {
    params: Promise<{ sessionId: string }>;
}

export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { sessionId } = await params;

        const session = await prisma.quizSession.findUnique({
            where: { id: sessionId },
            include: {
                result: true,
            },
        });

        if (!session) {
            return NextResponse.json(
                { error: { code: 'SESSION_NOT_FOUND', message: 'Quiz session not found' } },
                { status: 404 }
            );
        }

        // If result already exists, return it
        if (session.result) {
            const scores: BigFiveScores = {
                O: session.result.openness,
                C: session.result.conscientiousness,
                E: session.result.extraversion,
                A: session.result.agreeableness,
                N: session.result.neuroticism,
            };
            const recommendation = generateCharacterRecommendation(scores);
            
            // Parse stored JSON fields
            const personalityTraits = session.result.personalityTraits 
                ? JSON.parse(session.result.personalityTraits) 
                : [];
            const suggestedAbilities = session.result.suggestedAbilities
                ? JSON.parse(session.result.suggestedAbilities)
                : recommendation.suggestedAbilities;

            return NextResponse.json({
                result: {
                    ...session.result,
                    personalityTraits,
                    suggestedAbilities,
                },
                recommendation,
                backstory: {
                    backstory: session.result.backstory || '',
                    personalityTraits,
                    ideal: session.result.ideal || '',
                    bond: session.result.bond || '',
                    flaw: session.result.flaw || '',
                    originHook: '',
                },
                alreadyCompleted: true,
            });
        }

        // Ensure quiz is complete
        if (session.status !== 'completed') {
            return NextResponse.json(
                { error: { code: 'QUIZ_NOT_COMPLETE', message: 'Quiz must be completed before generating result' } },
                { status: 400 }
            );
        }

        // Build Big Five scores from session
        const scores: BigFiveScores = {
            O: session.scoreO,
            C: session.scoreC,
            E: session.scoreE,
            A: session.scoreA,
            N: session.scoreN,
        };

        // Generate character recommendation
        const recommendation = generateCharacterRecommendation(scores);

        // Generate AI backstory
        console.log('[Quiz Complete] Generating backstory...');
        const backstoryInput: BackstoryInput = {
            scores,
            alignment: recommendation.alignment,
            race: recommendation.race,
            characterClass: recommendation.class,
            background: recommendation.background,
            classReasoning: recommendation.classConfidences[0]?.reasoning || 'Natural aptitude',
            raceReasoning: recommendation.raceReasoning,
        };
        
        const backstoryResult = await generateBackstory(backstoryInput);
        console.log('[Quiz Complete] Backstory generated successfully');

        // Generate share token
        const shareToken = randomBytes(8).toString('hex');

        // Create quiz result with backstory
        const result = await prisma.quizResult.create({
            data: {
                sessionId: session.id,
                openness: scores.O,
                conscientiousness: scores.C,
                extraversion: scores.E,
                agreeableness: scores.A,
                neuroticism: scores.N,
                alignment: recommendation.alignment,
                suggestedRace: recommendation.race,
                suggestedClass: recommendation.class,
                suggestedBackground: recommendation.background,
                suggestedAbilities: JSON.stringify(recommendation.suggestedAbilities),
                backstory: backstoryResult.backstory,
                personalityTraits: JSON.stringify(backstoryResult.personalityTraits),
                ideal: backstoryResult.ideal,
                bond: backstoryResult.bond,
                flaw: backstoryResult.flaw,
                shareToken,
            },
        });

        return NextResponse.json({
            result: {
                id: result.id,
                sessionId: result.sessionId,
                openness: result.openness,
                conscientiousness: result.conscientiousness,
                extraversion: result.extraversion,
                agreeableness: result.agreeableness,
                neuroticism: result.neuroticism,
                alignment: result.alignment,
                suggestedRace: result.suggestedRace,
                suggestedClass: result.suggestedClass,
                suggestedBackground: result.suggestedBackground,
                suggestedAbilities: recommendation.suggestedAbilities,
                backstory: backstoryResult.backstory,
                personalityTraits: backstoryResult.personalityTraits,
                ideal: backstoryResult.ideal,
                bond: backstoryResult.bond,
                flaw: backstoryResult.flaw,
                originHook: backstoryResult.originHook,
                shareToken: result.shareToken,
            },
            recommendation,
            backstory: backstoryResult,
            alreadyCompleted: false,
        });
    } catch (error) {
        console.error('Error completing quiz:', error);
        return NextResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Failed to complete quiz' } },
            { status: 500 }
        );
    }
}
