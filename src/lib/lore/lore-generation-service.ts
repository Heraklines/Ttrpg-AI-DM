// src/lib/lore/lore-generation-service.ts
import { prisma } from '@/lib/db';
import { generateContent } from '@/lib/ai/client';
import { loreGenerationQueue } from './lore-generation-queue';

interface GenerationContext {
  campaignId: string;
  campaignName: string;
  campaignDescription: string;
  characterBackstories: string[];
}

/**
 * LoreGenerationService orchestrates multi-phase world lore generation.
 * 
 * GENERATION PHASES:
 * 1. World Foundation - name, tone, themes, cosmology, history
 * 2. Factions - 5-8 factions with relationships
 * 3. NPCs - 10-15 NPCs tied to factions
 * 4. Conflicts - 4-6 conflicts with participants
 * 5. Geography - 10-15 locations with connections
 * 6. Secrets - 8-12 secrets with discovery conditions
 */
export class LoreGenerationService {
  
  /**
   * Execute the full generation pipeline for a campaign.
   * Idempotent - skips phases that already have data.
   */
  async generateLore(campaignId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          characters: {
            select: { backstory: true, name: true, className: true, race: true }
          },
          lore: true
        }
      });

      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      const context: GenerationContext = {
        campaignId,
        campaignName: campaign.name,
        campaignDescription: campaign.description || '',
        characterBackstories: campaign.characters
          .filter(c => c.backstory)
          .map(c => `${c.name} (${c.race} ${c.className}): ${c.backstory}`)
      };

      // Phase 1: World Foundation
      await this.executePhase(campaignId, 'world_foundation', () => 
        this.generateWorldFoundation(context)
      );

      // Phase 2: Factions
      await this.executePhase(campaignId, 'factions', () => 
        this.generateFactions(context)
      );

      // Phase 3: NPCs
      await this.executePhase(campaignId, 'npcs', () => 
        this.generateNPCs(context)
      );

      // Phase 4: Conflicts
      await this.executePhase(campaignId, 'conflicts', () => 
        this.generateConflicts(context)
      );

      // Phase 5: Geography
      await this.executePhase(campaignId, 'geography', () => 
        this.generateGeography(context)
      );

      // Phase 6: Secrets
      await this.executePhase(campaignId, 'secrets', () => 
        this.generateSecrets(context)
      );

      await loreGenerationQueue.markCompleted(campaignId);
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown generation error';
      await loreGenerationQueue.markFailed(campaignId, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  private async executePhase(
    campaignId: string,
    phaseName: string,
    generator: () => Promise<void>
  ): Promise<void> {
    await loreGenerationQueue.updatePhase(campaignId, phaseName);

    const shouldSkip = await this.checkPhaseComplete(campaignId, phaseName);
    if (shouldSkip) {
      console.log(`Phase ${phaseName} already complete, skipping`);
      return;
    }

    console.log(`Starting phase: ${phaseName}`);
    await generator();
    console.log(`Completed phase: ${phaseName}`);
  }

  private async checkPhaseComplete(campaignId: string, phase: string): Promise<boolean> {
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId },
      include: {
        npcs: { take: 1 },
        factions: { take: 1 },
        locations: { take: 1 },
        conflicts: { take: 1 },
        secrets: { take: 1 }
      }
    });

    if (!lore) return false;

    switch (phase) {
      case 'world_foundation':
        return lore.worldName !== null && lore.worldName.length > 0;
      case 'factions':
        return lore.factions.length > 0;
      case 'npcs':
        return lore.npcs.length > 0;
      case 'conflicts':
        return lore.conflicts.length > 0;
      case 'geography':
        return lore.locations.length > 0;
      case 'secrets':
        return lore.secrets.length > 0;
      default:
        return false;
    }
  }


  // ============================================================
  // HELPER METHODS
  // ============================================================

  private parseJsonFromResponse(response: string): Record<string, unknown> {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }
    
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Try to fix common JSON issues
      let fixed = jsonMatch[0]
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
        .replace(/'/g, '"');     // Replace single quotes
      
      return JSON.parse(fixed);
    }
  }

  private async getLoreRecord(campaignId: string) {
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId }
    });
    if (!lore) throw new Error('CampaignLore record not found');
    return lore;
  }

  // ============================================================
  // PHASE 1: WORLD FOUNDATION
  // ============================================================

  private async generateWorldFoundation(context: GenerationContext): Promise<void> {
    const prompt = `You are a creative fantasy world-builder. Based on the following campaign description, generate rich world lore.

CAMPAIGN: "${context.campaignName}"
DESCRIPTION: "${context.campaignDescription}"

${context.characterBackstories.length > 0 ? `
CHARACTER BACKSTORIES (integrate relevant elements):
${context.characterBackstories.join('\n\n')}
` : ''}

Generate the following in JSON format:

{
  "worldName": "A unique, evocative name for this world/setting",
  "tone": "One of: dark, heroic, intrigue, comedic, epic, gritty, mysterious",
  "themes": ["Array of 3-5 thematic elements like 'corruption', 'redemption', 'ancient powers awakening'"],
  "cosmology": {
    "gods": [
      {"name": "God name", "domain": "What they rule over", "disposition": "How they interact with mortals"}
    ],
    "magicSystem": "Brief description of how magic works",
    "otherPlanes": "Brief mention of relevant other planes/realms"
  },
  "worldHistory": [
    {"era": "Name of historical period", "yearsAgo": "Approximate time", "significance": "Why this era matters"}
  ]
}

Focus on elements that create hooks for adventure. Be creative but consistent.`;

    const response = await generateContent(prompt);
    const parsed = this.parseJsonFromResponse(response);

    await prisma.campaignLore.update({
      where: { campaignId: context.campaignId },
      data: {
        worldName: (parsed.worldName as string) || context.campaignName + ' World',
        tone: (parsed.tone as string) || 'heroic',
        themes: JSON.stringify(parsed.themes || []),
        cosmology: JSON.stringify(parsed.cosmology || {}),
        worldHistory: JSON.stringify(parsed.worldHistory || [])
      }
    });
  }


  // ============================================================
  // PHASE 2: FACTIONS
  // ============================================================

  private async generateFactions(context: GenerationContext): Promise<void> {
    const lore = await this.getLoreRecord(context.campaignId);
    
    const worldContext = `
WORLD: ${lore.worldName}
TONE: ${lore.tone}
THEMES: ${lore.themes}`;

    const prompt = `Generate factions for this campaign setting.

CAMPAIGN: "${context.campaignName}"
DESCRIPTION: "${context.campaignDescription}"
${worldContext}

Generate 5-8 factions in JSON format:

{
  "factions": [
    {
      "name": "Faction name",
      "type": "One of: guild, religion, government, criminal, military, merchant, academic, secret_society",
      "importance": "One of: major, supporting, minor",
      "publicImage": "How the public perceives them",
      "secretNature": "What they're really up to (can match publicImage if honest)",
      "goals": ["Goal 1", "Goal 2"],
      "methods": ["How they achieve goals"],
      "resources": ["What power/resources they have"],
      "symbol": "Visual identifier",
      "motto": "Their saying/creed",
      "influence": 7,
      "headquarters": "Where they're based",
      "allies": ["Other faction names"],
      "enemies": ["Other faction names"]
    }
  ]
}

Include 2-3 major factions that drive conflict, 3-5 supporting factions.
Ensure relationships create interesting dynamics.`;

    const response = await generateContent(prompt);
    const parsed = this.parseJsonFromResponse(response);
    const factions = parsed.factions as Array<Record<string, unknown>>;

    if (!factions || !Array.isArray(factions)) {
      throw new Error('Failed to parse factions from AI response');
    }

    for (const faction of factions) {
      await prisma.loreFaction.create({
        data: {
          campaignLoreId: lore.id,
          name: faction.name as string,
          type: (faction.type as string) || 'guild',
          importance: (faction.importance as string) || 'supporting',
          publicImage: faction.publicImage as string,
          secretNature: faction.secretNature as string,
          goals: JSON.stringify(faction.goals || []),
          methods: JSON.stringify(faction.methods || []),
          resources: JSON.stringify(faction.resources || []),
          symbol: faction.symbol as string,
          motto: faction.motto as string,
          influence: (faction.influence as number) || 5,
          headquarters: faction.headquarters as string,
          allies: JSON.stringify(faction.allies || []),
          enemies: JSON.stringify(faction.enemies || [])
        }
      });
    }
  }


  // ============================================================
  // PHASE 3: NPCs
  // ============================================================

  private async generateNPCs(context: GenerationContext): Promise<void> {
    const lore = await this.getLoreRecord(context.campaignId);
    const factions = await prisma.loreFaction.findMany({
      where: { campaignLoreId: lore.id },
      select: { name: true, headquarters: true }
    });

    const factionNames = factions.map(f => f.name).join(', ');

    const prompt = `Generate NPCs for this campaign setting.

CAMPAIGN: "${context.campaignName}"
WORLD: ${lore.worldName}
TONE: ${lore.tone}
FACTIONS: ${factionNames}

Generate 10-15 NPCs in JSON format:

{
  "npcs": [
    {
      "name": "Full name",
      "role": "innkeeper, villain, mentor, quest_giver, merchant, guard, noble, scholar, etc.",
      "importance": "major, supporting, or minor",
      "race": "Human, Elf, Dwarf, etc.",
      "appearance": "Brief physical description",
      "personality": {
        "traits": ["2-3 personality traits"],
        "ideals": ["What they believe in"],
        "bonds": ["What they're connected to"],
        "flaws": ["Their weaknesses"]
      },
      "speakingStyle": "How they talk (formal, gruff, nervous, etc.)",
      "quirks": ["Memorable behaviors"],
      "publicGoal": "What they appear to want",
      "secretGoal": "What they actually want (can match public)",
      "fears": ["What they're afraid of"],
      "factionAffiliation": "Faction name or null",
      "primaryLocation": "Where they're usually found"
    }
  ]
}

Include 3-5 major NPCs (villains, key allies), 5-8 supporting NPCs, and 2-4 minor NPCs.
Tie NPCs to factions where appropriate.`;

    const response = await generateContent(prompt);
    const parsed = this.parseJsonFromResponse(response);
    const npcs = parsed.npcs as Array<Record<string, unknown>>;

    if (!npcs || !Array.isArray(npcs)) {
      throw new Error('Failed to parse NPCs from AI response');
    }

    for (const npc of npcs) {
      await prisma.loreNpc.create({
        data: {
          campaignLoreId: lore.id,
          name: npc.name as string,
          role: (npc.role as string) || 'commoner',
          importance: (npc.importance as string) || 'minor',
          race: npc.race as string,
          appearance: npc.appearance as string,
          personality: JSON.stringify(npc.personality || {}),
          speakingStyle: npc.speakingStyle as string,
          quirks: JSON.stringify(npc.quirks || []),
          publicGoal: npc.publicGoal as string,
          secretGoal: npc.secretGoal as string,
          fears: JSON.stringify(npc.fears || []),
          factionId: npc.factionAffiliation as string,
          primaryLocation: npc.primaryLocation as string
        }
      });
    }
  }


  // ============================================================
  // PHASE 4: CONFLICTS
  // ============================================================

  private async generateConflicts(context: GenerationContext): Promise<void> {
    const lore = await this.getLoreRecord(context.campaignId);
    const factions = await prisma.loreFaction.findMany({
      where: { campaignLoreId: lore.id },
      select: { name: true }
    });
    const npcs = await prisma.loreNpc.findMany({
      where: { campaignLoreId: lore.id, importance: { in: ['major', 'supporting'] } },
      select: { name: true, role: true }
    });

    const prompt = `Generate conflicts and tensions for this campaign.

CAMPAIGN: "${context.campaignName}"
WORLD: ${lore.worldName}
TONE: ${lore.tone}
FACTIONS: ${factions.map(f => f.name).join(', ')}
KEY NPCS: ${npcs.map(n => `${n.name} (${n.role})`).join(', ')}

Generate 4-6 conflicts in JSON format:

{
  "conflicts": [
    {
      "name": "Conflict name",
      "type": "war, political, personal, ideological, economic, or supernatural",
      "scope": "local, regional, or world",
      "importance": "major, supporting, or minor",
      "participants": [
        {"type": "faction or npc", "name": "Name", "role": "aggressor, defender, or neutral"}
      ],
      "stakes": "What's at risk",
      "publicKnowledge": "What people generally know",
      "trueNature": "The reality of the situation",
      "currentState": "brewing, active, climax, or resolved",
      "recentEvents": ["Recent developments"],
      "possibleOutcomes": ["Potential resolutions"],
      "playerInfluence": "How players might affect this"
    }
  ]
}

Include 1-2 major conflicts (campaign-defining), 2-3 supporting conflicts, 1-2 minor conflicts.`;

    const response = await generateContent(prompt);
    const parsed = this.parseJsonFromResponse(response);
    const conflicts = parsed.conflicts as Array<Record<string, unknown>>;

    if (!conflicts || !Array.isArray(conflicts)) {
      throw new Error('Failed to parse conflicts from AI response');
    }

    for (const conflict of conflicts) {
      await prisma.loreConflict.create({
        data: {
          campaignLoreId: lore.id,
          name: conflict.name as string,
          type: (conflict.type as string) || 'political',
          scope: (conflict.scope as string) || 'regional',
          importance: (conflict.importance as string) || 'supporting',
          participants: JSON.stringify(conflict.participants || []),
          stakes: conflict.stakes as string,
          publicKnowledge: conflict.publicKnowledge as string,
          trueNature: conflict.trueNature as string,
          currentState: (conflict.currentState as string) || 'brewing',
          recentEvents: JSON.stringify(conflict.recentEvents || []),
          possibleOutcomes: JSON.stringify(conflict.possibleOutcomes || []),
          playerInfluence: conflict.playerInfluence as string
        }
      });
    }
  }


  // ============================================================
  // PHASE 5: GEOGRAPHY
  // ============================================================

  private async generateGeography(context: GenerationContext): Promise<void> {
    const lore = await this.getLoreRecord(context.campaignId);
    const factions = await prisma.loreFaction.findMany({
      where: { campaignLoreId: lore.id },
      select: { name: true, headquarters: true }
    });
    const npcs = await prisma.loreNpc.findMany({
      where: { campaignLoreId: lore.id },
      select: { name: true, primaryLocation: true }
    });

    const prompt = `Generate locations for this campaign world.

CAMPAIGN: "${context.campaignName}"
WORLD: ${lore.worldName}
TONE: ${lore.tone}
FACTIONS: ${factions.map(f => `${f.name} (HQ: ${f.headquarters || 'unknown'})`).join(', ')}

Generate 10-15 locations in JSON format:

{
  "locations": [
    {
      "name": "Location name",
      "locationType": "city, town, village, dungeon, wilderness, landmark, ruins, or fortress",
      "importance": "major, supporting, or minor",
      "description": "General description",
      "atmosphere": "Mood/feel of the place",
      "sensoryDetails": {"sights": "...", "sounds": "...", "smells": "..."},
      "region": "Broader area name",
      "terrain": "Mountains, forest, coastal, etc.",
      "climate": "Weather/climate",
      "connectedTo": [{"locationName": "Other location", "direction": "north", "travelTime": "2 days"}],
      "historicalNote": "Historical importance",
      "currentEvents": ["What's happening now"],
      "population": "Size and composition",
      "notableNpcs": ["NPC names present here"],
      "factionPresence": [{"factionName": "Faction", "influence": "strong/moderate/weak"}],
      "hiddenSecrets": ["Secret names"]
    }
  ]
}

Include 3-5 major locations (cities, important sites), 5-7 supporting locations, 2-3 minor locations.
Ensure locations form a connected geography.`;

    const response = await generateContent(prompt);
    const parsed = this.parseJsonFromResponse(response);
    const locations = parsed.locations as Array<Record<string, unknown>>;

    if (!locations || !Array.isArray(locations)) {
      throw new Error('Failed to parse locations from AI response');
    }

    for (const loc of locations) {
      await prisma.loreLocation.create({
        data: {
          campaignLoreId: lore.id,
          name: loc.name as string,
          locationType: (loc.locationType as string) || 'other',
          importance: (loc.importance as string) || 'minor',
          description: loc.description as string,
          atmosphere: loc.atmosphere as string,
          sensoryDetails: JSON.stringify(loc.sensoryDetails || {}),
          region: loc.region as string,
          terrain: loc.terrain as string,
          climate: loc.climate as string,
          connectedTo: JSON.stringify(loc.connectedTo || []),
          historicalNote: loc.historicalNote as string,
          currentEvents: JSON.stringify(loc.currentEvents || []),
          population: loc.population as string,
          notableNpcs: JSON.stringify(loc.notableNpcs || []),
          factionPresence: JSON.stringify(loc.factionPresence || []),
          hiddenSecrets: JSON.stringify(loc.hiddenSecrets || [])
        }
      });
    }
  }


  // ============================================================
  // PHASE 6: SECRETS
  // ============================================================

  private async generateSecrets(context: GenerationContext): Promise<void> {
    const lore = await this.getLoreRecord(context.campaignId);
    const npcs = await prisma.loreNpc.findMany({
      where: { campaignLoreId: lore.id },
      select: { name: true, secretGoal: true }
    });
    const factions = await prisma.loreFaction.findMany({
      where: { campaignLoreId: lore.id },
      select: { name: true, secretNature: true }
    });
    const locations = await prisma.loreLocation.findMany({
      where: { campaignLoreId: lore.id },
      select: { name: true }
    });
    const conflicts = await prisma.loreConflict.findMany({
      where: { campaignLoreId: lore.id },
      select: { name: true, trueNature: true }
    });

    const prompt = `Generate secrets and plot hooks for this campaign.

CAMPAIGN: "${context.campaignName}"
WORLD: ${lore.worldName}
TONE: ${lore.tone}
NPCS: ${npcs.map(n => n.name).join(', ')}
FACTIONS: ${factions.map(f => f.name).join(', ')}
LOCATIONS: ${locations.map(l => l.name).join(', ')}
CONFLICTS: ${conflicts.map(c => c.name).join(', ')}

Generate 8-12 secrets in JSON format:

{
  "secrets": [
    {
      "name": "Internal reference name",
      "type": "plot_twist, hidden_identity, forbidden_knowledge, treasure, or betrayal",
      "importance": "major, supporting, or minor",
      "content": "The actual secret",
      "hints": ["Clues that point to this"],
      "relatedNpcs": ["NPC names who know or are affected"],
      "relatedFactions": ["Faction names involved"],
      "relatedLocations": ["Location names where evidence might be found"],
      "discoveryConditions": ["What triggers reveal"],
      "revealImpact": "What happens when revealed"
    }
  ]
}

Include 2-3 major secrets (campaign-changing), 4-6 supporting secrets, 2-3 minor secrets.
Connect secrets to existing NPCs, factions, locations, and conflicts.`;

    const response = await generateContent(prompt);
    const parsed = this.parseJsonFromResponse(response);
    const secrets = parsed.secrets as Array<Record<string, unknown>>;

    if (!secrets || !Array.isArray(secrets)) {
      throw new Error('Failed to parse secrets from AI response');
    }

    for (const secret of secrets) {
      await prisma.loreSecret.create({
        data: {
          campaignLoreId: lore.id,
          name: secret.name as string,
          type: (secret.type as string) || 'plot_twist',
          importance: (secret.importance as string) || 'supporting',
          content: secret.content as string,
          hints: JSON.stringify(secret.hints || []),
          relatedNpcs: JSON.stringify(secret.relatedNpcs || []),
          relatedFactions: JSON.stringify(secret.relatedFactions || []),
          relatedLocations: JSON.stringify(secret.relatedLocations || []),
          discoveryConditions: JSON.stringify(secret.discoveryConditions || []),
          revealImpact: secret.revealImpact as string
        }
      });
    }
  }
}

export const loreGenerationService = new LoreGenerationService();
