// src/app/api/campaign/[id]/lore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { loreContextManager } from '@/lib/lore';

// GET: Fetch all lore for a campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId },
      include: {
        npcs: true,
        factions: true,
        locations: true,
        conflicts: true,
        secrets: true
      }
    });

    if (!lore) {
      return NextResponse.json(
        { error: 'Lore not found for this campaign' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const parsedLore = {
      id: lore.id,
      campaignId: lore.campaignId,
      generationStatus: lore.generationStatus,
      worldName: lore.worldName,
      tone: lore.tone,
      themes: JSON.parse(lore.themes),
      cosmology: JSON.parse(lore.cosmology),
      worldHistory: JSON.parse(lore.worldHistory),
      npcs: lore.npcs.map(npc => ({
        ...npc,
        personality: JSON.parse(npc.personality),
        quirks: JSON.parse(npc.quirks),
        fears: JSON.parse(npc.fears),
        relationships: JSON.parse(npc.relationships)
      })),
      factions: lore.factions.map(f => ({
        ...f,
        goals: JSON.parse(f.goals),
        methods: JSON.parse(f.methods),
        resources: JSON.parse(f.resources),
        allies: JSON.parse(f.allies),
        enemies: JSON.parse(f.enemies),
        territory: JSON.parse(f.territory)
      })),
      locations: lore.locations.map(l => ({
        ...l,
        sensoryDetails: JSON.parse(l.sensoryDetails),
        connectedTo: JSON.parse(l.connectedTo),
        currentEvents: JSON.parse(l.currentEvents),
        notableNpcs: JSON.parse(l.notableNpcs),
        factionPresence: JSON.parse(l.factionPresence),
        hiddenSecrets: JSON.parse(l.hiddenSecrets)
      })),
      conflicts: lore.conflicts.map(c => ({
        ...c,
        participants: JSON.parse(c.participants),
        recentEvents: JSON.parse(c.recentEvents),
        possibleOutcomes: JSON.parse(c.possibleOutcomes)
      })),
      secrets: lore.secrets.map(s => ({
        ...s,
        hints: JSON.parse(s.hints),
        relatedNpcs: JSON.parse(s.relatedNpcs),
        relatedFactions: JSON.parse(s.relatedFactions),
        relatedLocations: JSON.parse(s.relatedLocations),
        discoveryConditions: JSON.parse(s.discoveryConditions),
        partiallyKnown: JSON.parse(s.partiallyKnown)
      }))
    };

    return NextResponse.json({ data: parsedLore });

  } catch (error) {
    console.error('Error fetching lore:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lore' },
      { status: 500 }
    );
  }
}

// POST: Query lore by topic
const QuerySchema = z.object({
  topic: z.string().min(1),
  type: z.enum(['npc', 'faction', 'location', 'conflict', 'secret']).optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();
    const { topic, type } = QuerySchema.parse(body);

    const result = await loreContextManager.queryLore(campaignId, topic, type);

    return NextResponse.json({ data: result });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error querying lore:', error);
    return NextResponse.json(
      { error: 'Failed to query lore' },
      { status: 500 }
    );
  }
}
