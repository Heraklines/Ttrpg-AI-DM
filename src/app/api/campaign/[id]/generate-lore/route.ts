// src/app/api/campaign/[id]/generate-lore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loreGenerationQueue, loreGenerationService } from '@/lib/lore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    // Enqueue the job
    const result = await loreGenerationQueue.enqueue(campaignId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // If job already exists and is completed, return status
    if (result.alreadyExists && result.job?.status === 'completed') {
      return NextResponse.json({
        message: 'Lore generation already completed',
        job: result.job
      });
    }

    // If job is pending, start generation in background
    if (result.job?.status === 'pending') {
      // Start async generation (don't await)
      loreGenerationService.generateLore(campaignId).catch(err => {
        console.error('Background lore generation failed:', err);
      });
    }

    return NextResponse.json({
      message: result.alreadyExists 
        ? 'Lore generation already in progress' 
        : 'Lore generation started',
      job: result.job
    });

  } catch (error) {
    console.error('Error triggering lore generation:', error);
    return NextResponse.json(
      { error: 'Failed to start lore generation' },
      { status: 500 }
    );
  }
}
