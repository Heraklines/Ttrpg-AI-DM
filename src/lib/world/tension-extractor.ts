import { generateContent } from '@/lib/ai/client';
import { prisma } from '@/lib/db';

export interface TensionSide {
  name: string;
  stance: string;
}

export interface CoreTension {
  name: string;
  description: string;
  sides: TensionSide[];
  manifestations: string[];
}

export interface WorldSeedData {
  coreTensions: CoreTension[];
  tone: 'dark' | 'heroic' | 'intrigue' | 'comedic' | 'epic' | 'gritty';
  scale: 'local' | 'regional' | 'continental' | 'planar';
  themes: string[];
  worldName: string;
  worldSketch?: string;
}

const TENSION_EXTRACTION_PROMPT = `You are a master worldbuilder. Analyze this campaign and extract its fundamental conflicts.

CAMPAIGN: "{name}"
DESCRIPTION: "{description}"

A "Core Tension" is a fundamental conflict that will drive ALL drama in this world.
Examples: "Order vs Chaos", "Progress vs Tradition", "Faith vs Reason", "Individual vs Collective"

Extract in JSON format:
{
  "coreTensions": [
    {
      "name": "short name for this tension",
      "description": "what's fundamentally in conflict (1-2 sentences)",
      "sides": [
        {"name": "side A label", "stance": "their position/belief"},
        {"name": "side B label", "stance": "their position/belief"}
      ],
      "manifestations": ["how this shows up in the world", "another example"]
    }
  ],
  "tone": "dark|heroic|intrigue|comedic|epic|gritty",
  "scale": "local|regional|continental|planar",
  "themes": ["theme1", "theme2", "theme3"],
  "worldName": "evocative name for this world",
  "worldSketch": "200-word overview of the world"
}

RULES:
- Extract 2-3 tensions maximum (more dilutes focus)
- Tensions should be genuinely debatable (both sides have merit)
- Tensions should create interesting faction conflicts
- If description is vague, infer reasonable tensions from genre/tone
- worldName should be evocative and memorable
- tone should match the campaign's intended feel
- scale determines scope of conflicts (local = one city, planar = multiverse)
- themes are recurring elements that appear throughout the world`;

export class TensionExtractor {
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

  private validateTension(tension: unknown): CoreTension {
    const t = tension as Record<string, unknown>;
    if (!t.name || typeof t.name !== 'string') {
      throw new Error('Tension missing name');
    }
    if (!t.description || typeof t.description !== 'string') {
      throw new Error('Tension missing description');
    }
    if (!Array.isArray(t.sides) || t.sides.length < 2) {
      throw new Error('Tension must have at least 2 sides');
    }
    
    const sides = t.sides.map((s: unknown) => {
      const side = s as Record<string, unknown>;
      return {
        name: String(side.name || 'Unknown'),
        stance: String(side.stance || 'Unknown stance'),
      };
    });
    
    const manifestations = Array.isArray(t.manifestations) 
      ? t.manifestations.map(String) 
      : [];
    
    return {
      name: t.name,
      description: t.description,
      sides,
      manifestations,
    };
  }

  private validateWorldSeedData(data: Record<string, unknown>): WorldSeedData {
    const validTones = ['dark', 'heroic', 'intrigue', 'comedic', 'epic', 'gritty'];
    const validScales = ['local', 'regional', 'continental', 'planar'];
    
    const coreTensions = Array.isArray(data.coreTensions)
      ? data.coreTensions.map((t) => this.validateTension(t))
      : [];
    
    if (coreTensions.length === 0) {
      throw new Error('No valid tensions extracted');
    }
    
    const tone = validTones.includes(String(data.tone)) 
      ? String(data.tone) as WorldSeedData['tone']
      : 'heroic';
    
    const scale = validScales.includes(String(data.scale))
      ? String(data.scale) as WorldSeedData['scale']
      : 'regional';
    
    const themes = Array.isArray(data.themes)
      ? data.themes.map(String).slice(0, 5)
      : ['adventure', 'conflict', 'discovery'];
    
    const worldName = typeof data.worldName === 'string' && data.worldName.length > 0
      ? data.worldName
      : 'The Unnamed Realm';
    
    return {
      coreTensions,
      tone,
      scale,
      themes,
      worldName,
      worldSketch: typeof data.worldSketch === 'string' ? data.worldSketch : undefined,
    };
  }

  async extractTensions(campaignName: string, campaignDescription: string): Promise<WorldSeedData> {
    const prompt = TENSION_EXTRACTION_PROMPT
      .replace('{name}', campaignName)
      .replace('{description}', campaignDescription || 'A fantasy adventure campaign');
    
    const response = await generateContent(prompt);
    const parsed = this.parseJsonFromResponse(response);
    return this.validateWorldSeedData(parsed);
  }

  async extractAndSave(campaignId: string): Promise<WorldSeedData> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { name: true, description: true },
    });
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    const worldSeedData = await this.extractTensions(
      campaign.name,
      campaign.description || ''
    );
    
    await prisma.worldSeed.upsert({
      where: { campaignId },
      create: {
        campaignId,
        name: worldSeedData.worldName,
        tone: worldSeedData.tone,
        scale: worldSeedData.scale,
        themes: JSON.stringify(worldSeedData.themes),
        coreTensions: JSON.stringify(worldSeedData.coreTensions),
        creationMyth: worldSeedData.worldSketch || null,
        generationStatus: 'tensions_extracted',
        currentPhase: 'tensions',
      },
      update: {
        name: worldSeedData.worldName,
        tone: worldSeedData.tone,
        scale: worldSeedData.scale,
        themes: JSON.stringify(worldSeedData.themes),
        coreTensions: JSON.stringify(worldSeedData.coreTensions),
        creationMyth: worldSeedData.worldSketch || null,
        generationStatus: 'tensions_extracted',
        currentPhase: 'tensions',
        updatedAt: new Date(),
      },
    });
    
    return worldSeedData;
  }

  async getTensionsForCampaign(campaignId: string): Promise<CoreTension[] | null> {
    const worldSeed = await prisma.worldSeed.findUnique({
      where: { campaignId },
      select: { coreTensions: true },
    });
    
    if (!worldSeed) return null;
    
    try {
      return JSON.parse(worldSeed.coreTensions) as CoreTension[];
    } catch {
      return null;
    }
  }
}

export const tensionExtractor = new TensionExtractor();
