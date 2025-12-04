import { prisma } from '@/lib/db';
import { generateContent } from '@/lib/ai/client';
import { loreGenerationQueue } from './lore-generation-queue';
import { tensionExtractor, CoreTension } from '@/lib/world';
import { coherenceChecker } from '@/lib/world/coherence-checker';

interface GenerationContext {
  campaignId: string;
  campaignName: string;
  campaignDescription: string;
  characterBackstories: string[];
  worldSeedId?: string;
  coreTensions?: CoreTension[];
}

// Safe JSON parse helper to prevent crashes on corrupted data
function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    console.warn('Failed to parse JSON, using fallback:', json.slice(0, 100));
    return fallback;
  }
}

export class LoreGenerationService {

  // Debug logging helper - stores prompt/response for each phase
  private async logPhaseStart(campaignId: string, phase: string, prompt: string): Promise<string> {
    try {
      const log = await prisma.loreGenerationLog.create({
        data: {
          campaignId,
          phase,
          status: 'started',
          prompt,
          createdAt: new Date(),
        }
      });
      return log.id;
    } catch (e) {
      console.error('Failed to create debug log:', e);
      return '';
    }
  }

  private async logPhaseComplete(
    logId: string,
    response: string,
    parsedData: Record<string, unknown> | null,
    durationMs: number
  ): Promise<void> {
    if (!logId) return;
    try {
      await prisma.loreGenerationLog.update({
        where: { id: logId },
        data: {
          status: 'completed',
          response,
          parsedData: parsedData ? JSON.stringify(parsedData) : null,
          durationMs,
          tokenCount: Math.ceil((response?.length || 0) / 4), // rough estimate
        }
      });
    } catch (e) {
      console.error('Failed to update debug log:', e);
    }
  }

  private async logPhaseError(logId: string, error: string): Promise<void> {
    if (!logId) return;
    try {
      await prisma.loreGenerationLog.update({
        where: { id: logId },
        data: {
          status: 'failed',
          error,
        }
      });
    } catch (e) {
      console.error('Failed to update debug log with error:', e);
    }
  }

  // Helper to generate content with debug logging
  private async generateWithLogging(
    campaignId: string,
    phase: string,
    prompt: string
  ): Promise<{ response: string; parsed: Record<string, unknown> }> {
    const startTime = Date.now();
    const logId = await this.logPhaseStart(campaignId, phase, prompt);

    try {
      const response = await generateContent(prompt);
      const parsed = this.parseJsonFromResponse(response);
      const durationMs = Date.now() - startTime;

      await this.logPhaseComplete(logId, response, parsed, durationMs);

      return { response, parsed };
    } catch (error) {
      await this.logPhaseError(logId, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async generateLore(campaignId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Note: Status is now tracked via WorldSeed.generationStatus and loreGenerationQueue
      // The legacy CampaignLore table is synced at the end via syncToLegacyLore()

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          characters: {
            select: { backstory: true, name: true, className: true, race: true }
          },
          lore: true,
          worldSeed: true,
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

      await this.executePhase(campaignId, 'tensions', () => 
        this.phase0ExtractTensions(context)
      );

      const worldSeed = await prisma.worldSeed.findUnique({
        where: { campaignId }
      });
      if (worldSeed) {
        context.worldSeedId = worldSeed.id;
        context.coreTensions = safeJsonParse<CoreTension[]>(worldSeed.coreTensions, []);
      }

      await this.executePhase(campaignId, 'cosmology', () => 
        this.phase1GenerateFoundations(context)
      );

      await this.executePhase(campaignId, 'factions', () => 
        this.phase2GenerateFactions(context)
      );

      await this.executePhase(campaignId, 'npcs', () => 
        this.phase3GenerateNpcs(context)
      );

      await this.executePhase(campaignId, 'conflicts', () => 
        this.phase4GenerateConflicts(context)
      );

      await this.executePhase(campaignId, 'locations', () => 
        this.phase5GenerateLocations(context)
      );

      await this.executePhase(campaignId, 'secrets', () => 
        this.phase6GenerateSecrets(context)
      );

      await this.executePhase(campaignId, 'coherence', () => 
        this.phase7CoherenceCheck(context)
      );

      await this.syncToLegacyLore(campaignId);
      
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
    const worldSeed = await prisma.worldSeed.findUnique({
      where: { campaignId },
      include: {
        cosmology: true,
        factions: { take: 1 },
        npcs: { take: 1 },
        conflicts: { take: 1 },
        locations: { take: 1 },
        secrets: { take: 1 },
      }
    });

    if (!worldSeed) return false;

    switch (phase) {
      case 'tensions':
        const tensions = safeJsonParse<CoreTension[]>(worldSeed.coreTensions, []);
        return tensions.length > 0;
      case 'cosmology':
        return worldSeed.cosmology !== null;
      case 'factions':
        return worldSeed.factions.length > 0;
      case 'npcs':
        return worldSeed.npcs.length > 0;
      case 'conflicts':
        return worldSeed.conflicts.length > 0;
      case 'locations':
        return worldSeed.locations.length > 0;
      case 'secrets':
        return worldSeed.secrets.length > 0;
      case 'coherence':
        return worldSeed.generationStatus === 'completed';
      default:
        return false;
    }
  }

  private parseJsonFromResponse(response: string): Record<string, unknown> {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }
    
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      let fixed = jsonMatch[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/'/g, '"');
      
      return JSON.parse(fixed);
    }
  }

  private formatTensionsForPrompt(tensions: CoreTension[]): string {
    return tensions.map(t => 
      `- ${t.name}: ${t.description}\n  Sides: ${t.sides.map(s => `${s.name} (${s.stance})`).join(' vs ')}`
    ).join('\n');
  }

  private async phase0ExtractTensions(context: GenerationContext): Promise<void> {
    const existing = await prisma.worldSeed.findUnique({
      where: { campaignId: context.campaignId }
    });
    
    if (existing) {
      const tensions = safeJsonParse<CoreTension[]>(existing.coreTensions, []);
      if (tensions.length > 0) return;
    }
    
    await tensionExtractor.extractAndSave(context.campaignId);
  }

  private async phase1GenerateFoundations(context: GenerationContext): Promise<void> {
    const worldSeed = await prisma.worldSeed.findUnique({
      where: { campaignId: context.campaignId }
    });
    if (!worldSeed) throw new Error('WorldSeed not found');

    const tensions = safeJsonParse<CoreTension[]>(worldSeed.coreTensions, []);
    const tensionText = this.formatTensionsForPrompt(tensions);

    const prompt = `Generate cosmology and world foundations for this world.

WORLD: ${worldSeed.name}
TONE: ${worldSeed.tone}
SCALE: ${worldSeed.scale}

CORE TENSIONS (everything must connect to these):
${tensionText}

Generate in JSON format:
{
  "pantheon": [
    {
      "name": "deity name",
      "domain": "what they rule over",
      "alignment": "good/neutral/evil",
      "tensionStance": {"tensionName": "name of tension", "side": "which side they support", "reason": "why"}
    }
  ],
  "magicSystem": {
    "source": "where magic comes from",
    "rules": "how it works",
    "limitations": "what it can't do",
    "tensionRelevance": "how magic relates to core tensions"
  },
  "planarStructure": {
    "description": "brief overview of planes",
    "relevantPlanes": [{"name": "plane name", "description": "brief desc"}]
  },
  "creationStory": "brief creation myth that establishes the origin of core tensions",
  "prophecies": [
    {"content": "prophecy text", "relatedTension": "which tension it relates to", "fulfilled": false}
  ]
}

IMPORTANT: Gods MUST take sides on the core tensions. The creation story MUST explain why these tensions exist.`;

    const { parsed } = await this.generateWithLogging(context.campaignId, 'cosmology', prompt);

    await prisma.worldCosmology.upsert({
      where: { worldSeedId: worldSeed.id },
      create: {
        worldSeedId: worldSeed.id,
        pantheon: JSON.stringify(parsed.pantheon || []),
        magicSystem: JSON.stringify(parsed.magicSystem || {}),
        planarStructure: JSON.stringify(parsed.planarStructure || {}),
        creationStory: parsed.creationStory as string || null,
        prophecies: JSON.stringify(parsed.prophecies || []),
      },
      update: {
        pantheon: JSON.stringify(parsed.pantheon || []),
        magicSystem: JSON.stringify(parsed.magicSystem || {}),
        planarStructure: JSON.stringify(parsed.planarStructure || {}),
        creationStory: parsed.creationStory as string || null,
        prophecies: JSON.stringify(parsed.prophecies || []),
      },
    });

    await prisma.worldSeed.update({
      where: { id: worldSeed.id },
      data: { currentPhase: 'cosmology' },
    });
  }

  private async phase2GenerateFactions(context: GenerationContext): Promise<void> {
    const worldSeed = await prisma.worldSeed.findUnique({
      where: { campaignId: context.campaignId }
    });
    if (!worldSeed) throw new Error('WorldSeed not found');

    const tensions = safeJsonParse<CoreTension[]>(worldSeed.coreTensions, []);
    const tensionText = this.formatTensionsForPrompt(tensions);

    const prompt = `Generate 5-8 factions for this world.

WORLD: ${worldSeed.name}
TONE: ${worldSeed.tone}
SCALE: ${worldSeed.scale}

CORE TENSIONS (factions MUST take sides):
${tensionText}

Generate in JSON format:
{
  "factions": [
    {
      "name": "faction name",
      "type": "guild|religion|government|criminal|military|merchant|academic|secret_society",
      "tier": "major|supporting|minor",
      "philosophy": "core belief that drives them",
      "tensionStances": [
        {"tensionName": "name of tension", "stance": "their position", "isPublic": true}
      ],
      "publicImage": "how public perceives them",
      "symbol": "visual identifier",
      "motto": "faction motto",
      "influence": 7,
      "resources": ["resource1", "resource2"],
      "relationships": [
        {"factionName": "other faction", "type": "ally|enemy|rival|neutral", "reason": "why"}
      ]
    }
  ]
}

RULES:
- Include 2-3 MAJOR factions that are central to the tensions
- Include 3-5 SUPPORTING factions that complicate things
- Every faction MUST have at least one tension stance
- Factions should have clear relationships with each other
- Major factions should be on opposite sides of at least one tension`;

    const { parsed } = await this.generateWithLogging(context.campaignId, 'factions', prompt);
    const factions = parsed.factions as Array<Record<string, unknown>>;

    if (!factions || !Array.isArray(factions)) {
      throw new Error('Failed to parse factions from AI response');
    }

    for (const faction of factions) {
      await prisma.worldFaction.create({
        data: {
          worldSeedId: worldSeed.id,
          name: faction.name as string,
          type: (faction.type as string) || 'guild',
          tier: (faction.tier as string) || 'supporting',
          philosophy: faction.philosophy as string,
          tensionStances: JSON.stringify(faction.tensionStances || []),
          publicImage: faction.publicImage as string,
          symbol: faction.symbol as string,
          motto: faction.motto as string,
          influence: (faction.influence as number) || 5,
          resources: JSON.stringify(faction.resources || []),
        }
      });
    }

    await prisma.worldSeed.update({
      where: { id: worldSeed.id },
      data: { currentPhase: 'factions' },
    });
  }

  private async phase3GenerateNpcs(context: GenerationContext): Promise<void> {
    const worldSeed = await prisma.worldSeed.findUnique({
      where: { campaignId: context.campaignId },
      include: { factions: true }
    });
    if (!worldSeed) throw new Error('WorldSeed not found');

    const tensions = safeJsonParse<CoreTension[]>(worldSeed.coreTensions, []);
    const tensionText = this.formatTensionsForPrompt(tensions);
    const factionList = worldSeed.factions.map(f => `${f.name} (${f.type}, ${f.tier})`).join(', ');

    const prompt = `Generate 10-15 NPCs for this world.

WORLD: ${worldSeed.name}
TONE: ${worldSeed.tone}

CORE TENSIONS:
${tensionText}

EXISTING FACTIONS: ${factionList}

Generate in JSON format:
{
  "npcs": [
    {
      "name": "full name",
      "race": "Human, Elf, etc.",
      "occupation": "their role",
      "tier": "major|supporting|minor",
      "appearance": "brief physical description",
      "personality": {
        "traits": ["trait1", "trait2"],
        "ideals": ["ideal"],
        "bonds": ["bond"],
        "flaws": ["flaw"]
      },
      "speakingStyle": "how they talk",
      "publicGoal": "what they appear to want",
      "privateGoal": "what they actually want",
      "fears": ["fear1"],
      "tensionRole": [
        {"tensionName": "tension name", "role": "champion|moderate|opposed|neutral", "commitment": "defining|strong|moderate|weak"}
      ],
      "factionAffiliation": "faction name or null",
      "factionRank": "rank in faction",
      "knowledgeScope": {
        "knows": ["what they know"],
        "suspects": ["what they suspect"],
        "ignorantOf": ["what they don't know"]
      }
    }
  ]
}

RULES:
- Include 3-5 MAJOR NPCs (faction leaders, key villains, important allies)
- Include 5-8 SUPPORTING NPCs
- Include 2-4 MINOR NPCs
- Major NPCs MUST belong to factions
- All NPCs should have tensionRole that ties them to the core conflicts
- Leaders should personify their faction's tension stances`;

    const { parsed } = await this.generateWithLogging(context.campaignId, 'npcs', prompt);
    const npcs = parsed.npcs as Array<Record<string, unknown>>;

    if (!npcs || !Array.isArray(npcs)) {
      throw new Error('Failed to parse NPCs from AI response');
    }

    for (const npc of npcs) {
      const factionName = npc.factionAffiliation as string;
      let factionId: string | null = null;
      
      if (factionName) {
        const faction = worldSeed.factions.find(f => 
          f.name.toLowerCase() === factionName.toLowerCase()
        );
        if (faction) factionId = faction.id;
      }

      await prisma.worldNpc.create({
        data: {
          worldSeedId: worldSeed.id,
          name: npc.name as string,
          race: npc.race as string,
          occupation: npc.occupation as string,
          tier: (npc.tier as string) || 'minor',
          appearance: npc.appearance as string,
          personality: JSON.stringify(npc.personality || {}),
          speakingStyle: npc.speakingStyle as string,
          publicGoal: npc.publicGoal as string,
          privateGoal: npc.privateGoal as string,
          fears: JSON.stringify(npc.fears || []),
          tensionRole: JSON.stringify(npc.tensionRole || []),
          factionId,
          factionRank: npc.factionRank as string,
          knowledgeScope: JSON.stringify(npc.knowledgeScope || {}),
        }
      });
    }

    await prisma.worldSeed.update({
      where: { id: worldSeed.id },
      data: { currentPhase: 'npcs' },
    });
  }

  private async phase4GenerateConflicts(context: GenerationContext): Promise<void> {
    const worldSeed = await prisma.worldSeed.findUnique({
      where: { campaignId: context.campaignId },
      include: { factions: true, npcs: { where: { tier: { in: ['major', 'supporting'] } } } }
    });
    if (!worldSeed) throw new Error('WorldSeed not found');

    const tensions = safeJsonParse<CoreTension[]>(worldSeed.coreTensions, []);
    const tensionText = this.formatTensionsForPrompt(tensions);
    const factionList = worldSeed.factions.map(f => f.name).join(', ');
    const npcList = worldSeed.npcs.map(n => `${n.name} (${n.occupation})`).join(', ');

    const prompt = `Generate 4-6 conflicts for this world.

WORLD: ${worldSeed.name}
TONE: ${worldSeed.tone}

CORE TENSIONS (conflicts MUST manifest these):
${tensionText}

FACTIONS: ${factionList}
KEY NPCS: ${npcList}

Generate in JSON format:
{
  "conflicts": [
    {
      "name": "conflict name",
      "type": "war|political|economic|religious|personal|ideological",
      "tier": "major|supporting|minor",
      "scope": "local|regional|continental",
      "status": "brewing|active|climax",
      "rootTension": "which core tension this manifests",
      "triggerEvent": "what started or will start this",
      "sides": [
        {"name": "side name", "factions": ["faction names"], "npcs": ["npc names"], "goals": "what they want"}
      ],
      "stakes": "what's at risk",
      "publicNarrative": "what people think is happening",
      "trueNature": "what's actually happening",
      "possibleOutcomes": ["outcome1", "outcome2"]
    }
  ]
}

RULES:
- Each conflict MUST specify which core tension it manifests
- Include 1-2 MAJOR conflicts (campaign-defining)
- Include 2-3 SUPPORTING conflicts
- Include 1 MINOR conflict
- Conflicts MUST involve existing factions and/or NPCs
- At least one conflict should be brewing (not yet active)`;

    const { parsed } = await this.generateWithLogging(context.campaignId, 'conflicts', prompt);
    const conflicts = parsed.conflicts as Array<Record<string, unknown>>;

    if (!conflicts || !Array.isArray(conflicts)) {
      throw new Error('Failed to parse conflicts from AI response');
    }

    for (const conflict of conflicts) {
      await prisma.worldConflict.create({
        data: {
          worldSeedId: worldSeed.id,
          name: conflict.name as string,
          type: (conflict.type as string) || 'political',
          tier: (conflict.tier as string) || 'supporting',
          scope: (conflict.scope as string) || 'regional',
          status: (conflict.status as string) || 'brewing',
          rootTension: conflict.rootTension as string,
          triggerEvent: conflict.triggerEvent as string,
          sides: JSON.stringify(conflict.sides || []),
          stakes: conflict.stakes as string,
          publicNarrative: conflict.publicNarrative as string,
          trueNature: conflict.trueNature as string,
          possibleOutcomes: JSON.stringify(conflict.possibleOutcomes || []),
        }
      });
    }

    await prisma.worldSeed.update({
      where: { id: worldSeed.id },
      data: { currentPhase: 'conflicts' },
    });
  }

  private async phase5GenerateLocations(context: GenerationContext): Promise<void> {
    const worldSeed = await prisma.worldSeed.findUnique({
      where: { campaignId: context.campaignId },
      include: { factions: true, conflicts: true }
    });
    if (!worldSeed) throw new Error('WorldSeed not found');

    const tensions = safeJsonParse<CoreTension[]>(worldSeed.coreTensions, []);
    const tensionText = this.formatTensionsForPrompt(tensions);
    const factionList = worldSeed.factions.map(f => `${f.name} (influence: ${f.influence})`).join(', ');
    const conflictList = worldSeed.conflicts.map(c => c.name).join(', ');

    const prompt = `Generate 10-15 locations for this world.

WORLD: ${worldSeed.name}
TONE: ${worldSeed.tone}
SCALE: ${worldSeed.scale}

CORE TENSIONS:
${tensionText}

FACTIONS: ${factionList}
CONFLICTS: ${conflictList}

Generate in JSON format:
{
  "locations": [
    {
      "name": "location name",
      "type": "continent|nation|region|city|town|landmark|dungeon|ruins",
      "tier": "major|supporting|minor",
      "description": "general description",
      "atmosphere": "mood/feel",
      "terrain": "geographic type",
      "climate": "weather patterns",
      "mapCoordinates": {"x": 0, "y": 0},
      "controllingFaction": "faction name or null",
      "contestedBy": ["other factions contesting control"],
      "sensoryDetails": {"sights": "...", "sounds": "...", "smells": "..."},
      "population": {"size": "large/medium/small", "demographics": "who lives here"},
      "landmarks": ["notable features"],
      "currentEvents": ["what's happening now"],
      "rumors": ["local rumors"]
    }
  ]
}

RULES:
- Include 2-3 MAJOR locations (capitals, key strongholds)
- Include 5-8 SUPPORTING locations
- Include 3-5 MINOR locations
- Major locations MUST be controlled by or contested by factions
- Locations tied to conflicts should reflect the tension
- Create a logical geography (use type hierarchy: continent > nation > region > city)`;

    const { parsed } = await this.generateWithLogging(context.campaignId, 'locations', prompt);
    const locations = parsed.locations as Array<Record<string, unknown>>;

    if (!locations || !Array.isArray(locations)) {
      throw new Error('Failed to parse locations from AI response');
    }

    for (const loc of locations) {
      const controllingFactionName = loc.controllingFaction as string;
      let controllingFactionId: string | null = null;
      
      if (controllingFactionName) {
        const faction = worldSeed.factions.find(f => 
          f.name.toLowerCase() === controllingFactionName.toLowerCase()
        );
        if (faction) controllingFactionId = faction.id;
      }

      await prisma.worldLocation.create({
        data: {
          worldSeedId: worldSeed.id,
          name: loc.name as string,
          type: (loc.type as string) || 'city',
          tier: (loc.tier as string) || 'minor',
          description: loc.description as string,
          atmosphere: loc.atmosphere as string,
          terrain: loc.terrain as string,
          climate: loc.climate as string,
          mapCoordinates: JSON.stringify(loc.mapCoordinates || {}),
          controllingFactionId,
          contestedBy: JSON.stringify(loc.contestedBy || []),
          sensoryDetails: JSON.stringify(loc.sensoryDetails || {}),
          population: JSON.stringify(loc.population || {}),
          landmarks: JSON.stringify(loc.landmarks || []),
          currentEvents: JSON.stringify(loc.currentEvents || []),
          rumors: JSON.stringify(loc.rumors || []),
        }
      });
    }

    await prisma.worldSeed.update({
      where: { id: worldSeed.id },
      data: { currentPhase: 'locations' },
    });
  }

  private async phase6GenerateSecrets(context: GenerationContext): Promise<void> {
    const worldSeed = await prisma.worldSeed.findUnique({
      where: { campaignId: context.campaignId },
      include: { factions: true, npcs: true, locations: true, conflicts: true }
    });
    if (!worldSeed) throw new Error('WorldSeed not found');

    const tensions = safeJsonParse<CoreTension[]>(worldSeed.coreTensions, []);
    const tensionText = this.formatTensionsForPrompt(tensions);

    const prompt = `Generate 8-12 secrets for this world.

WORLD: ${worldSeed.name}
TONE: ${worldSeed.tone}

CORE TENSIONS:
${tensionText}

FACTIONS: ${worldSeed.factions.map(f => f.name).join(', ')}
KEY NPCS: ${worldSeed.npcs.filter(n => n.tier !== 'minor').map(n => n.name).join(', ')}
LOCATIONS: ${worldSeed.locations.map(l => l.name).join(', ')}
CONFLICTS: ${worldSeed.conflicts.map(c => c.name).join(', ')}

Generate in JSON format:
{
  "secrets": [
    {
      "name": "internal reference name",
      "type": "identity|history|prophecy|location|betrayal|conspiracy",
      "tier": "major|supporting|minor",
      "content": "the actual secret",
      "implications": "why this matters",
      "tensionImpact": [
        {"tensionName": "which tension", "howItChanges": "how revealing this would shift the balance"}
      ],
      "knownBy": [
        {"entityType": "npc|faction", "entityName": "who knows", "wouldTell": false}
      ],
      "hints": [
        {"hint": "clue that points to this", "whereFound": "location or npc", "obviousness": "subtle|moderate|obvious"}
      ],
      "discoveryConditions": ["what would reveal this"],
      "revealTriggers": ["events that could expose this"],
      "onReveal": {
        "narrative": "what happens story-wise",
        "effects": ["mechanical effects"],
        "relationshipChanges": ["how relationships shift"]
      }
    }
  ]
}

RULES:
- Include 2-3 MAJOR secrets (campaign-changing revelations)
- Include 4-6 SUPPORTING secrets
- Include 2-3 MINOR secrets
- Secrets MUST have tensionImpact showing how they relate to core conflicts
- Secrets MUST connect multiple entities (NPCs, factions, locations)
- Each secret should have at least 2 hints scattered across the world`;

    const { parsed } = await this.generateWithLogging(context.campaignId, 'secrets', prompt);
    const secrets = parsed.secrets as Array<Record<string, unknown>>;

    if (!secrets || !Array.isArray(secrets)) {
      throw new Error('Failed to parse secrets from AI response');
    }

    for (const secret of secrets) {
      await prisma.worldSecret.create({
        data: {
          worldSeedId: worldSeed.id,
          name: secret.name as string,
          type: (secret.type as string) || 'conspiracy',
          tier: (secret.tier as string) || 'supporting',
          content: secret.content as string,
          implications: secret.implications as string,
          tensionImpact: JSON.stringify(secret.tensionImpact || []),
          knownBy: JSON.stringify(secret.knownBy || []),
          hints: JSON.stringify(secret.hints || []),
          discoveryConditions: JSON.stringify(secret.discoveryConditions || []),
          revealTriggers: JSON.stringify(secret.revealTriggers || []),
          onReveal: JSON.stringify(secret.onReveal || {}),
        }
      });
    }

    await prisma.worldSeed.update({
      where: { id: worldSeed.id },
      data: { currentPhase: 'secrets' },
    });
  }

  private async phase7CoherenceCheck(context: GenerationContext): Promise<void> {
    const worldSeed = await prisma.worldSeed.findUnique({
      where: { campaignId: context.campaignId }
    });
    if (!worldSeed) throw new Error('WorldSeed not found');

    const report = await coherenceChecker.checkCoherence(worldSeed.id);
    
    console.log(`Coherence check complete. Score: ${report.score}, Issues: ${report.issues.length}`);
    
    if (!report.isCoherent) {
      console.warn('World has coherence issues:', report.issues);
    }

    await prisma.worldSeed.update({
      where: { id: worldSeed.id },
      data: { 
        generationStatus: 'completed',
        currentPhase: 'completed',
      },
    });
  }

  private async syncToLegacyLore(campaignId: string): Promise<void> {
    const worldSeed = await prisma.worldSeed.findUnique({
      where: { campaignId },
      include: {
        cosmology: true,
        factions: true,
        npcs: true,
        locations: true,
        conflicts: true,
        secrets: true,
      }
    });
    if (!worldSeed) return;

    let lore = await prisma.campaignLore.findUnique({
      where: { campaignId }
    });

    if (!lore) {
      lore = await prisma.campaignLore.create({
        data: {
          campaignId,
          generationStatus: 'completed',
          worldName: worldSeed.name,
          tone: worldSeed.tone,
          themes: worldSeed.themes,
          cosmology: worldSeed.cosmology ? JSON.stringify({
            gods: JSON.parse(worldSeed.cosmology.pantheon),
            magicSystem: JSON.parse(worldSeed.cosmology.magicSystem),
          }) : '{}',
        }
      });
    } else {
      await prisma.campaignLore.update({
        where: { id: lore.id },
        data: {
          generationStatus: 'completed',
          worldName: worldSeed.name,
          tone: worldSeed.tone,
          themes: worldSeed.themes,
          cosmology: worldSeed.cosmology ? JSON.stringify({
            gods: JSON.parse(worldSeed.cosmology.pantheon),
            magicSystem: JSON.parse(worldSeed.cosmology.magicSystem),
          }) : '{}',
        }
      });
    }

    for (const faction of worldSeed.factions) {
      await prisma.loreFaction.upsert({
        where: { id: faction.id },
        create: {
          id: faction.id,
          campaignLoreId: lore.id,
          name: faction.name,
          type: faction.type,
          importance: faction.tier === 'major' ? 'major' : faction.tier === 'supporting' ? 'supporting' : 'minor',
          tier: faction.tier,
          publicImage: faction.publicImage,
          philosophy: faction.philosophy,
          tensionStances: faction.tensionStances,
          symbol: faction.symbol,
          motto: faction.motto,
          influence: faction.influence,
          resources: faction.resources,
          isDiscovered: faction.isDiscovered,
          discoveredAt: faction.discoveredAt,
        },
        update: {
          name: faction.name,
          type: faction.type,
          tier: faction.tier,
          tensionStances: faction.tensionStances,
        },
      });
    }

    for (const npc of worldSeed.npcs) {
      await prisma.loreNpc.upsert({
        where: { id: npc.id },
        create: {
          id: npc.id,
          campaignLoreId: lore.id,
          name: npc.name,
          role: npc.occupation || 'unknown',
          importance: npc.tier === 'major' ? 'major' : npc.tier === 'supporting' ? 'supporting' : 'minor',
          tier: npc.tier,
          personality: npc.personality,
          speakingStyle: npc.speakingStyle,
          publicGoal: npc.publicGoal,
          secretGoal: npc.privateGoal,
          fears: npc.fears,
          tensionStances: '[]',
          tensionRole: npc.tensionRole,
          race: npc.race,
          appearance: npc.appearance,
          isDiscovered: npc.isDiscovered,
          discoveredAt: npc.discoveredAt,
        },
        update: {
          name: npc.name,
          tier: npc.tier,
          tensionRole: npc.tensionRole,
        },
      });
    }

    for (const loc of worldSeed.locations) {
      await prisma.loreLocation.upsert({
        where: { id: loc.id },
        create: {
          id: loc.id,
          campaignLoreId: lore.id,
          name: loc.name,
          locationType: loc.type,
          importance: loc.tier === 'major' ? 'major' : loc.tier === 'supporting' ? 'supporting' : 'minor',
          tier: loc.tier,
          description: loc.description,
          atmosphere: loc.atmosphere,
          terrain: loc.terrain,
          climate: loc.climate,
          mapCoordinates: loc.mapCoordinates,
          sensoryDetails: loc.sensoryDetails,
          currentEvents: loc.currentEvents,
          isDiscovered: loc.isDiscovered,
          discoveredAt: loc.discoveredAt,
          explorationLevel: loc.explorationLevel,
        },
        update: {
          name: loc.name,
          tier: loc.tier,
          mapCoordinates: loc.mapCoordinates,
          explorationLevel: loc.explorationLevel,
        },
      });
    }

    for (const conflict of worldSeed.conflicts) {
      await prisma.loreConflict.upsert({
        where: { id: conflict.id },
        create: {
          id: conflict.id,
          campaignLoreId: lore.id,
          name: conflict.name,
          type: conflict.type,
          scope: conflict.scope,
          importance: conflict.tier === 'major' ? 'major' : conflict.tier === 'supporting' ? 'supporting' : 'minor',
          tier: conflict.tier,
          rootTension: conflict.rootTension,
          participants: conflict.sides,
          stakes: conflict.stakes,
          publicKnowledge: conflict.publicNarrative,
          trueNature: conflict.trueNature,
          currentState: conflict.status,
          possibleOutcomes: conflict.possibleOutcomes,
          isDiscovered: conflict.isDiscovered,
          discoveredAt: conflict.discoveredAt,
        },
        update: {
          name: conflict.name,
          tier: conflict.tier,
          rootTension: conflict.rootTension,
        },
      });
    }

    for (const secret of worldSeed.secrets) {
      await prisma.loreSecret.upsert({
        where: { id: secret.id },
        create: {
          id: secret.id,
          campaignLoreId: lore.id,
          name: secret.name,
          type: secret.type,
          importance: secret.tier === 'major' ? 'major' : secret.tier === 'supporting' ? 'supporting' : 'minor',
          tier: secret.tier,
          content: secret.content,
          implications: secret.implications,
          tensionImpact: secret.tensionImpact,
          hints: secret.hints,
          discoveryConditions: secret.discoveryConditions,
          revealImpact: JSON.stringify(JSON.parse(secret.onReveal || '{}')),
          isRevealed: secret.isRevealed,
          isDiscovered: false,
          discoveredAt: secret.revealedAt,
        },
        update: {
          name: secret.name,
          tier: secret.tier,
          tensionImpact: secret.tensionImpact,
        },
      });
    }
  }
}

export const loreGenerationService = new LoreGenerationService();
