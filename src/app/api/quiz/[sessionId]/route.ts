/**
 * GET/POST /api/quiz/[sessionId]
 * 
 * GET: Retrieve current quiz session state
 * POST: Submit answer for current question
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getQuestionById } from '@/lib/quiz/question-pool';
import { clampScore } from '@/lib/quiz/types';

interface RouteParams {
    params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/quiz/[sessionId]
 * Get the current state of a quiz session
 */
export async function GET(
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

        // Parse question IDs and get current question
        const questionIds: string[] = JSON.parse(session.usedQuestionIds);
        const currentQuestionId = questionIds[session.currentIndex];
        const currentQuestion = currentQuestionId ? getQuestionById(currentQuestionId) : null;

        return NextResponse.json({
            session: {
                id: session.id,
                campaignId: session.campaignId,
                currentIndex: session.currentIndex,
                totalQuestions: session.totalQuestions,
                status: session.status,
                completedAt: session.completedAt,
            },
            currentQuestion: session.status === 'in_progress' ? currentQuestion : null,
            isComplete: session.status === 'completed',
            resultId: session.result?.id || null,
        });
    } catch (error) {
        console.error('Error getting quiz session:', error);
        return NextResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Failed to get quiz session' } },
            { status: 500 }
        );
    }
}

/**
 * POST /api/quiz/[sessionId]
 * Submit an answer for the current question
 */
export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { sessionId } = await params;
        const body = await request.json();
        const { answerIndex } = body;

        if (answerIndex === undefined || answerIndex < 0 || answerIndex > 3) {
            return NextResponse.json(
                { error: { code: 'INVALID_ANSWER', message: 'Answer index must be 0-3' } },
                { status: 400 }
            );
        }

        const session = await prisma.quizSession.findUnique({
            where: { id: sessionId },
        });

        if (!session) {
            return NextResponse.json(
                { error: { code: 'SESSION_NOT_FOUND', message: 'Quiz session not found' } },
                { status: 404 }
            );
        }

        if (session.status !== 'in_progress') {
            return NextResponse.json(
                { error: { code: 'SESSION_COMPLETED', message: 'Quiz session is already completed' } },
                { status: 400 }
            );
        }

        // Get current question and selected answer
        const questionIds: string[] = JSON.parse(session.usedQuestionIds);
        const currentQuestionId = questionIds[session.currentIndex];
        const question = getQuestionById(currentQuestionId);

        if (!question) {
            return NextResponse.json(
                { error: { code: 'QUESTION_NOT_FOUND', message: 'Current question not found' } },
                { status: 500 }
            );
        }

        const selectedAnswer = question.answers[answerIndex];
        if (!selectedAnswer) {
            return NextResponse.json(
                { error: { code: 'INVALID_ANSWER', message: 'Invalid answer index for this question' } },
                { status: 400 }
            );
        }

        // Apply score adjustments
        const newScores = {
            scoreO: clampScore(session.scoreO + (selectedAnswer.scores.O ?? 0)),
            scoreC: clampScore(session.scoreC + (selectedAnswer.scores.C ?? 0)),
            scoreE: clampScore(session.scoreE + (selectedAnswer.scores.E ?? 0)),
            scoreA: clampScore(session.scoreA + (selectedAnswer.scores.A ?? 0)),
            scoreN: clampScore(session.scoreN + (selectedAnswer.scores.N ?? 0)),
        };

        const newIndex = session.currentIndex + 1;
        const isComplete = newIndex >= session.totalQuestions;

        // Update session
        const updatedSession = await prisma.quizSession.update({
            where: { id: sessionId },
            data: {
                ...newScores,
                currentIndex: newIndex,
                status: isComplete ? 'completed' : 'in_progress',
                completedAt: isComplete ? new Date() : null,
            },
        });

        // Get next question (if not complete)
        const nextQuestionId = isComplete ? null : questionIds[newIndex];
        const nextQuestion = nextQuestionId ? getQuestionById(nextQuestionId) : null;

        return NextResponse.json({
            currentIndex: updatedSession.currentIndex,
            totalQuestions: updatedSession.totalQuestions,
            isComplete,
            nextQuestion,
            // Return current scores for debugging/display (optional)
            scores: {
                O: updatedSession.scoreO,
                C: updatedSession.scoreC,
                E: updatedSession.scoreE,
                A: updatedSession.scoreA,
                N: updatedSession.scoreN,
            },
        });
    } catch (error) {
        console.error('Error submitting quiz answer:', error);
        return NextResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Failed to submit answer' } },
            { status: 500 }
        );
    }
}
