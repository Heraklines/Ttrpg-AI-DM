/**
 * POST /api/quiz/start
 * 
 * Start a new Soul Mirror quiz session for a campaign.
 * Enforces retake limit of 3 per campaign.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { selectQuestionsForSession } from '@/lib/quiz/question-pool';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { campaignId } = body;

        if (!campaignId) {
            return NextResponse.json(
                { error: { code: 'MISSING_CAMPAIGN_ID', message: 'Campaign ID is required' } },
                { status: 400 }
            );
        }

        // Verify campaign exists
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
        });

        if (!campaign) {
            return NextResponse.json(
                { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' } },
                { status: 404 }
            );
        }

        // Check retake limit (max 3 completed sessions per campaign)
        const completedSessions = await prisma.quizSession.count({
            where: {
                campaignId,
                status: 'completed',
            },
        });

        if (completedSessions >= 3) {
            return NextResponse.json(
                {
                    error: {
                        code: 'RETAKE_LIMIT_REACHED',
                        message: 'The mirror grows dim... You have reached the maximum of 3 quiz attempts for this campaign.',
                        retakesUsed: completedSessions,
                        maxRetakes: 3,
                    }
                },
                { status: 403 }
            );
        }

        // Check for existing in-progress session
        const existingSession = await prisma.quizSession.findFirst({
            where: {
                campaignId,
                status: 'in_progress',
            },
        });

        if (existingSession) {
            // Return existing session instead of creating new one
            const usedQuestionIds: string[] = JSON.parse(existingSession.usedQuestionIds);
            const questions = selectQuestionsForSession(15);
            const currentQuestion = questions.find(q => q.id === usedQuestionIds[existingSession.currentIndex]);

            return NextResponse.json({
                session: {
                    id: existingSession.id,
                    campaignId: existingSession.campaignId,
                    currentIndex: existingSession.currentIndex,
                    totalQuestions: existingSession.totalQuestions,
                    status: existingSession.status,
                },
                currentQuestion: currentQuestion || questions[0],
                retakeNumber: completedSessions + 1,
                maxRetakes: 3,
                resumed: true,
            });
        }

        // Select questions for this session
        const questions = selectQuestionsForSession(15);
        const questionIds = questions.map(q => q.id);

        // Create new session
        const session = await prisma.quizSession.create({
            data: {
                campaignId,
                usedQuestionIds: JSON.stringify(questionIds),
                currentIndex: 0,
                totalQuestions: 15,
                scoreO: 50,
                scoreC: 50,
                scoreE: 50,
                scoreA: 50,
                scoreN: 50,
                status: 'in_progress',
            },
        });

        return NextResponse.json({
            session: {
                id: session.id,
                campaignId: session.campaignId,
                currentIndex: session.currentIndex,
                totalQuestions: session.totalQuestions,
                status: session.status,
            },
            currentQuestion: questions[0],
            retakeNumber: completedSessions + 1,
            maxRetakes: 3,
            resumed: false,
        });
    } catch (error) {
        console.error('Error starting quiz session:', error);
        return NextResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Failed to start quiz session' } },
            { status: 500 }
        );
    }
}
