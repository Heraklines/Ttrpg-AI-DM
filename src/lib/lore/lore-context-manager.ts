// src/lib/lore/lore-context-manager.ts
import { prisma } from '@/lib/db';

interface LoreContext {
  tier1: string;  // Always included (~100-150 tokens)
  tier2: string;  // Situational (~200-400 tokens)
  totalTokens: number;
}

interface RelevanceFactors {
  currentLocation?: string;
  recentMentions?: string[];
  activeCombatants?: string[];
}

/**
 * LoreContextManager handles intelligent lore injection into AI prompts.
 * Uses tiered approach to manage token budget.
 */
export class LoreContextManager {
  private static readonly TIER1_TOKEN_BUDGET = 150;
  private static readonly TIER2_TOKEN_BUDGET = 400;

  /**
   * Get relevant lore context for AI prompt injection.
   */
  async getRelevantLore(
    campaignId: string,
    factors: RelevanceFactors = {}
  ): Promise<LoreContext | null> {
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId },
      include: {
        npcs: true,
        factions: true,
        locations: true,
        conflicts: true
      }
    });

    if (!lore || lore.generationStatus !== 'completed') {
      return null;
    }

    // Build Tier 1: Always included essentials
    const tier1 = this.buildTier1Context(lore, factors);
    
    // Build Tier 2: Situational context
    const tier2 = this.buildTier2Context(lore, factors);

    const totalTokens = this.estimateTokens(tier1) + this.estimateTokens(tier2);

    return { tier1, tier2, totalTokens };
  }

  private buildTier1Context(
    lore: {
      worldName: string | null;
      tone: string | null;
      themes: string;
    },
    factors: RelevanceFactors
  ): string {
    const parts: string[] = [];

    if (lore.worldName) {
      parts.push(`WORLD: ${lore.worldName}`);
    }

    if (lore.tone) {
      parts.push(`TONE: ${lore.tone}`);
    }

    const themes = JSON.parse(lore.themes || '[]');
    if (themes.length > 0) {
      parts.push(`THEMES: ${themes.slice(0, 3).join(', ')}`);
    }

    if (factors.currentLocation) {
      parts.push(`CURRENT LOCATION: ${factors.currentLocation}`);
    }

    return parts.join('\n');
  }

  private buildTier2Context(
    lore: {
      npcs: Array<{
        name: string;
        role: string;
        importance: string;
        primaryLocation: string | null;
        isRevealed: boolean;
        personality: string;
      }>;
      factions: Array<{
        name: string;
        type: string;
        importance: string;
        publicImage: string | null;
        playerStanding: string | null;
      }>;
      locations: Array<{
        name: string;
        importance: string;
        atmosphere: string | null;
        isDiscovered: boolean;
      }>;
      conflicts: Array<{
        name: string;
        importance: string;
        currentState: string;
        isRevealed: boolean;
        stakes: string | null;
      }>;
    },
    factors: RelevanceFactors
  ): string {
    const parts: string[] = [];

    // NPCs at current location or recently mentioned
    const relevantNpcs = lore.npcs
      .filter(npc => {
        if (npc.isRevealed) return true;
        if (factors.currentLocation && npc.primaryLocation === factors.currentLocation) return true;
        if (factors.recentMentions?.includes(npc.name)) return true;
        return false;
      })
      .sort((a, b) => this.importanceScore(b.importance) - this.importanceScore(a.importance))
      .slice(0, 5);

    if (relevantNpcs.length > 0) {
      parts.push('NEARBY NPCs:');
      for (const npc of relevantNpcs) {
        const personality = JSON.parse(npc.personality || '{}');
        const traits = personality.traits?.slice(0, 2).join(', ') || '';
        parts.push(`- ${npc.name} (${npc.role}): ${traits}`);
      }
    }

    // Active conflicts
    const activeConflicts = lore.conflicts
      .filter(c => c.isRevealed && c.currentState !== 'resolved')
      .sort((a, b) => this.importanceScore(b.importance) - this.importanceScore(a.importance))
      .slice(0, 3);

    if (activeConflicts.length > 0) {
      parts.push('ACTIVE CONFLICTS:');
      for (const conflict of activeConflicts) {
        parts.push(`- ${conflict.name}: ${conflict.stakes || 'Ongoing tension'}`);
      }
    }

    // Discovered locations near current
    if (factors.currentLocation) {
      const currentLoc = lore.locations.find(l => l.name === factors.currentLocation);
      if (currentLoc?.atmosphere) {
        parts.push(`ATMOSPHERE: ${currentLoc.atmosphere}`);
      }
    }

    return parts.join('\n');
  }

  private importanceScore(importance: string): number {
    switch (importance) {
      case 'major': return 10;
      case 'supporting': return 5;
      case 'minor': return 1;
      default: return 0;
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Query lore by topic (for recall_lore AI function).
   */
  async queryLore(
    campaignId: string,
    topic: string,
    type?: 'npc' | 'faction' | 'location' | 'conflict' | 'secret'
  ): Promise<string> {
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId },
      include: {
        npcs: true,
        factions: true,
        locations: true,
        conflicts: true,
        secrets: { where: { isRevealed: true } }
      }
    });

    if (!lore) return 'No world lore available.';

    const topicLower = topic.toLowerCase();
    const results: string[] = [];

    // Search NPCs
    if (!type || type === 'npc') {
      const matchingNpcs = lore.npcs.filter(n => 
        n.name.toLowerCase().includes(topicLower) ||
        n.role.toLowerCase().includes(topicLower)
      );
      for (const npc of matchingNpcs.slice(0, 3)) {
        results.push(`NPC: ${npc.name} - ${npc.role}. ${npc.publicGoal || ''}`);
      }
    }

    // Search Factions
    if (!type || type === 'faction') {
      const matchingFactions = lore.factions.filter(f =>
        f.name.toLowerCase().includes(topicLower) ||
        f.type.toLowerCase().includes(topicLower)
      );
      for (const faction of matchingFactions.slice(0, 3)) {
        results.push(`FACTION: ${faction.name} - ${faction.publicImage || faction.type}`);
      }
    }

    // Search Locations
    if (!type || type === 'location') {
      const matchingLocations = lore.locations.filter(l =>
        l.name.toLowerCase().includes(topicLower) ||
        (l.region?.toLowerCase().includes(topicLower))
      );
      for (const loc of matchingLocations.slice(0, 3)) {
        results.push(`LOCATION: ${loc.name} - ${loc.description?.slice(0, 100) || loc.atmosphere || ''}`);
      }
    }

    // Search Conflicts
    if (!type || type === 'conflict') {
      const matchingConflicts = lore.conflicts.filter(c =>
        c.name.toLowerCase().includes(topicLower) ||
        c.type.toLowerCase().includes(topicLower)
      );
      for (const conflict of matchingConflicts.slice(0, 2)) {
        results.push(`CONFLICT: ${conflict.name} - ${conflict.publicKnowledge || conflict.stakes || ''}`);
      }
    }

    return results.length > 0 
      ? results.join('\n') 
      : `No lore found matching "${topic}".`;
  }

  /**
   * Mark an NPC as revealed (for introduce_npc AI function).
   */
  async revealNpc(campaignId: string, npcName: string): Promise<string | null> {
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId },
      include: { npcs: true }
    });

    if (!lore) return null;

    const npc = lore.npcs.find(n => 
      n.name.toLowerCase() === npcName.toLowerCase()
    );

    if (!npc) return null;

    await prisma.loreNpc.update({
      where: { id: npc.id },
      data: { isRevealed: true }
    });

    const personality = JSON.parse(npc.personality || '{}');
    return `${npc.name} (${npc.race} ${npc.role}): ${personality.traits?.join(', ') || 'Unknown demeanor'}. ${npc.speakingStyle ? `Speaks ${npc.speakingStyle}.` : ''}`;
  }

  /**
   * Mark a location as discovered.
   */
  async discoverLocation(campaignId: string, locationName: string): Promise<string | null> {
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId },
      include: { locations: true }
    });

    if (!lore) return null;

    const location = lore.locations.find(l =>
      l.name.toLowerCase() === locationName.toLowerCase()
    );

    if (!location) return null;

    await prisma.loreLocation.update({
      where: { id: location.id },
      data: { isDiscovered: true }
    });

    return `${location.name}: ${location.description || location.atmosphere || 'A notable location.'}`;
  }

  /**
   * Reveal a secret.
   */
  async revealSecret(campaignId: string, secretName: string): Promise<string | null> {
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId },
      include: { secrets: true }
    });

    if (!lore) return null;

    const secret = lore.secrets.find(s =>
      s.name.toLowerCase() === secretName.toLowerCase()
    );

    if (!secret) return null;

    await prisma.loreSecret.update({
      where: { id: secret.id },
      data: { isRevealed: true }
    });

    return secret.content;
  }
}

export const loreContextManager = new LoreContextManager();
