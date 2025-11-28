import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existingTemplate = await prisma.campaignTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Campaign template not found' } },
        { status: 404 }
      );
    }

    await prisma.campaignTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete campaign template:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete campaign template' } },
      { status: 500 }
    );
  }
}
