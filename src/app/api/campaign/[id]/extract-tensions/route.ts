import { NextRequest, NextResponse } from 'next/server';
import { tensionExtractor } from '@/lib/world';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    
    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }
    
    const worldSeedData = await tensionExtractor.extractAndSave(campaignId);
    
    return NextResponse.json({
      success: true,
      data: worldSeedData,
    });
  } catch (error) {
    console.error('Tension extraction error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to extract tensions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    
    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }
    
    const tensions = await tensionExtractor.getTensionsForCampaign(campaignId);
    
    if (!tensions) {
      return NextResponse.json(
        { error: 'No tensions found for this campaign' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      tensions,
    });
  } catch (error) {
    console.error('Get tensions error:', error);
    return NextResponse.json(
      { error: 'Failed to get tensions' },
      { status: 500 }
    );
  }
}
