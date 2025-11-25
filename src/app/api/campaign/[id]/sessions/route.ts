import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sessions = await prisma.session.findMany({
      where: { campaignId: id },
      orderBy: { sessionNumber: 'desc' },
    });

    const parsed = sessions.map((session) => ({
      id: session.id,
      sessionNumber: session.sessionNumber,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() || null,
      summary: session.summary,
      transcript: JSON.parse(session.transcript || '[]'),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch sessions' } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lastSession = await prisma.session.findFirst({
      where: { campaignId: id },
      orderBy: { sessionNumber: 'desc' },
    });

    const sessionNumber = (lastSession?.sessionNumber || 0) + 1;

    const session = await prisma.session.create({
      data: {
        campaignId: id,
        sessionNumber,
        transcript: '[]',
      },
    });

    return NextResponse.json({
      id: session.id,
      sessionNumber: session.sessionNumber,
      startedAt: session.startedAt.toISOString(),
      endedAt: null,
      transcript: [],
    });
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create session' } },
      { status: 500 }
    );
  }
}
