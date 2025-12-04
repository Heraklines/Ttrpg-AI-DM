import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    const logs = await prisma.loreGenerationLog.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        phase: true,
        status: true,
        prompt: true,
        response: true,
        parsedData: true,
        error: true,
        tokenCount: true,
        durationMs: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Failed to fetch generation logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generation logs' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    await prisma.loreGenerationLog.deleteMany({
      where: { campaignId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete generation logs:', error);
    return NextResponse.json(
      { error: 'Failed to delete generation logs' },
      { status: 500 }
    );
  }
}
