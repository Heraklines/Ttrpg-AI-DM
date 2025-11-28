import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const templates = await prisma.campaignTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Failed to fetch campaign templates:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch campaign templates' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid input', details: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const template = await prisma.campaignTemplate.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Failed to create campaign template:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create campaign template' } },
      { status: 500 }
    );
  }
}
