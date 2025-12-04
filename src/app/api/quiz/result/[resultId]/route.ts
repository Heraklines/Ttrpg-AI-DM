/**
 * GET /api/quiz/result/[resultId]
 * 
 * Retrieve a quiz result for display/sharing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateCharacterRecommendation, describePersonality } from '@/lib/quiz/character-mapper';
import { BigFiveScores } from '@/lib/quiz/types';

interface RouteParams {
    params: Promise<{ resultId: string }>;
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { resultId } = await params;

        // Try finding by ID or share token
        const result = await prisma.quizResult.findFirst({
            where: {
                OR: [
                    { id: resultId },
                    { shareToken: resultId },
                ],
            },
            include: {
                session: {
                    include: {
                        campaign: true,
                    },
                },
            },
        });

        if (!result) {
            return NextResponse.json(
                { error: { code: 'RESULT_NOT_FOUND', message: 'Quiz result not found' } },
                { status: 404 }
            );
        }

        // Build scores object
        const scores: BigFiveScores = {
            O: result.openness,
            C: result.conscientiousness,
            E: result.extraversion,
            A: result.agreeableness,
            N: result.neuroticism,
        };

        // Generate recommendation (for display)
        const recommendation = generateCharacterRecommendation(scores);
        const personalityDescription = describePersonality(scores);

        return NextResponse.json({
            result: {
                id: result.id,
                campaignId: result.session.campaignId,
                campaignName: result.session.campaign.name,

                // Big Five scores
                openness: result.openness,
                conscientiousness: result.conscientiousness,
                extraversion: result.extraversion,
                agreeableness: result.agreeableness,
                neuroticism: result.neuroticism,

                // D&D attributes
                alignment: result.alignment,
                suggestedRace: result.suggestedRace,
                suggestedClass: result.suggestedClass,
                suggestedBackground: result.suggestedBackground,

                // AI-generated content
                backstory: result.backstory,
                personalityTraits: JSON.parse(result.personalityTraits),
                ideal: result.ideal,
                bond: result.bond,
                flaw: result.flaw,

                // Ability scores
                suggestedAbilities: JSON.parse(result.suggestedAbilities),

                // Sharing
                shareToken: result.shareToken,
                shareUrl: `/quiz/share/${result.shareToken}`,

                createdAt: result.createdAt,
            },
            recommendation,
            personalityDescription,
        });
    } catch (error) {
        console.error('Error getting quiz result:', error);
        return NextResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Failed to get quiz result' } },
            { status: 500 }
        );
    }
}
