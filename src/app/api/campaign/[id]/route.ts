import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const UpdateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        characters: true,
        gameState: true,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Failed to fetch campaign:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch campaign' } },
      { status: 500 }
    );
  }
}

async function updateCampaign(id: string, body: unknown) {
  const parsed = UpdateCampaignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Invalid input', details: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const existingCampaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!existingCampaign) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Campaign not found' } },
      { status: 404 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.settings) {
    updateData.settings = typeof parsed.data.settings === 'string' 
      ? parsed.data.settings 
      : JSON.stringify(parsed.data.settings);
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: updateData,
    include: { characters: true, gameState: true },
  });

  return NextResponse.json(campaign);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    return await updateCampaign(id, body);
  } catch (error) {
    console.error('Failed to update campaign:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update campaign' } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    return await updateCampaign(id, body);
  } catch (error) {
    console.error('Failed to update campaign:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update campaign' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    await prisma.campaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete campaign:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete campaign' } },
      { status: 500 }
    );
  }
}
