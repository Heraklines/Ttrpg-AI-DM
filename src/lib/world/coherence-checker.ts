import { generateContent } from '@/lib/ai/client';
import { prisma } from '@/lib/db';

export interface CoherenceIssue {
  type: 'contradiction' | 'missing_link' | 'dead_end' | 'orphan';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  entities: string[];
  suggestedFix?: string;
}

export interface CoherenceReport {
  isCoherent: boolean;
  score: number;
  issues: CoherenceIssue[];
  suggestions: string[];
}

interface WorldBibleSummary {
  tensions: string[];
  factions: { name: string; tensionStances: string[]; allies: string[]; enemies: string[] }[];
  npcs: { name: string; faction: string | null; tensionRole: string[] }[];
  conflicts: { name: string; rootTension: string | null; participants: string[] }[];
  locations: { name: string; controllingFaction: string | null }[];
  secrets: { name: string; relatedEntities: string[] }[];
}

const COHERENCE_CHECK_PROMPT = `Review this world bible for coherence.

WORLD SUMMARY:
{worldBibleSummary}

Identify:
1. CONTRADICTIONS: Facts that conflict with each other
2. MISSING LINKS: Obvious connections not established
3. DEAD ENDS: Entities with no relationships
4. ORPHAN ENTITIES: Things that don't connect to core tensions
5. SECRET OPPORTUNITIES: Places where hidden connections would add depth

Return JSON:
{
  "issues": [
    {
      "type": "contradiction|missing_link|dead_end|orphan",
      "severity": "critical|major|minor",
      "description": "what's wrong",
      "entities": ["entity1", "entity2"],
      "suggestedFix": "how to fix it"
    }
  ],
  "suggestions": [
    "General improvement suggestion 1",
    "General improvement suggestion 2"
  ],
  "coherenceScore": 85
}

Focus on:
- All factions should have clear tension stances
- Major NPCs should be connected to factions or conflicts
- Conflicts should derive from core tensions
- Locations should have faction presence
- Secrets should connect multiple entities`;

export class CoherenceChecker {
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

  async buildWorldBibleSummary(worldSeedId: string): Promise<WorldBibleSummary> {
    const worldSeed = await prisma.worldSeed.findUnique({
      where: { id: worldSeedId },
      include: {
        factions: true,
        npcs: true,
        conflicts: true,
        locations: true,
        secrets: true,
      },
    });

    if (!worldSeed) {
      throw new Error('WorldSeed not found');
    }

    const tensions = JSON.parse(worldSeed.coreTensions || '[]');

    return {
      tensions: tensions.map((t: { name: string }) => t.name),
      factions: worldSeed.factions.map((f) => ({
        name: f.name,
        tensionStances: JSON.parse(f.tensionStances || '[]').map((ts: { tensionName: string }) => ts.tensionName),
        allies: [],
        enemies: [],
      })),
      npcs: worldSeed.npcs.map((n) => ({
        name: n.name,
        faction: n.factionId,
        tensionRole: JSON.parse(n.tensionRole || '[]'),
      })),
      conflicts: worldSeed.conflicts.map((c) => ({
        name: c.name,
        rootTension: c.rootTension,
        participants: JSON.parse(c.sides || '[]').map((s: { name: string }) => s.name),
      })),
      locations: worldSeed.locations.map((l) => ({
        name: l.name,
        controllingFaction: l.controllingFactionId,
      })),
      secrets: worldSeed.secrets.map((s) => ({
        name: s.name,
        relatedEntities: [
          ...JSON.parse(s.knownBy || '[]'),
        ],
      })),
    };
  }

  async checkCoherence(worldSeedId: string): Promise<CoherenceReport> {
    const worldBible = await this.buildWorldBibleSummary(worldSeedId);
    
    const localIssues: CoherenceIssue[] = [];
    
    for (const faction of worldBible.factions) {
      if (faction.tensionStances.length === 0) {
        localIssues.push({
          type: 'orphan',
          severity: 'major',
          description: `Faction "${faction.name}" has no tension stances`,
          entities: [faction.name],
          suggestedFix: 'Add tension stances to connect faction to core conflicts',
        });
      }
    }
    
    for (const npc of worldBible.npcs) {
      if (!npc.faction && npc.tensionRole.length === 0) {
        localIssues.push({
          type: 'dead_end',
          severity: 'minor',
          description: `NPC "${npc.name}" has no faction and no tension role`,
          entities: [npc.name],
          suggestedFix: 'Connect NPC to a faction or give them a role in a tension',
        });
      }
    }
    
    for (const conflict of worldBible.conflicts) {
      if (!conflict.rootTension) {
        localIssues.push({
          type: 'orphan',
          severity: 'major',
          description: `Conflict "${conflict.name}" is not linked to a core tension`,
          entities: [conflict.name],
          suggestedFix: 'Link conflict to one of the core tensions',
        });
      }
      if (conflict.participants.length < 2) {
        localIssues.push({
          type: 'dead_end',
          severity: 'minor',
          description: `Conflict "${conflict.name}" has fewer than 2 participants`,
          entities: [conflict.name],
          suggestedFix: 'Add more participants to the conflict',
        });
      }
    }
    
    for (const location of worldBible.locations) {
      const hasPresence = worldBible.factions.some((f) => 
        location.controllingFaction === f.name
      );
      if (!hasPresence && !location.controllingFaction) {
        localIssues.push({
          type: 'dead_end',
          severity: 'minor',
          description: `Location "${location.name}" has no faction presence`,
          entities: [location.name],
          suggestedFix: 'Assign a controlling faction or add faction presence',
        });
      }
    }

    const prompt = COHERENCE_CHECK_PROMPT.replace(
      '{worldBibleSummary}',
      JSON.stringify(worldBible, null, 2)
    );
    
    try {
      const response = await generateContent(prompt);
      const parsed = this.parseJsonFromResponse(response);
      
      const aiIssues = Array.isArray(parsed.issues) ? parsed.issues : [];
      const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
      const coherenceScore = typeof parsed.coherenceScore === 'number' ? parsed.coherenceScore : 70;
      
      const allIssues = [
        ...localIssues,
        ...aiIssues.map((issue: Record<string, unknown>) => ({
          type: String(issue.type || 'missing_link') as CoherenceIssue['type'],
          severity: String(issue.severity || 'minor') as CoherenceIssue['severity'],
          description: String(issue.description || ''),
          entities: Array.isArray(issue.entities) ? issue.entities.map(String) : [],
          suggestedFix: issue.suggestedFix ? String(issue.suggestedFix) : undefined,
        })),
      ];
      
      const criticalIssues = allIssues.filter((i) => i.severity === 'critical').length;
      const majorIssues = allIssues.filter((i) => i.severity === 'major').length;
      
      return {
        isCoherent: criticalIssues === 0 && majorIssues <= 2,
        score: Math.max(0, coherenceScore - (criticalIssues * 20) - (majorIssues * 5)),
        issues: allIssues,
        suggestions: suggestions.map(String),
      };
    } catch (error) {
      console.warn('AI coherence check failed, using local checks only:', error);
      
      const criticalIssues = localIssues.filter((i) => i.severity === 'critical').length;
      const majorIssues = localIssues.filter((i) => i.severity === 'major').length;
      
      return {
        isCoherent: criticalIssues === 0 && majorIssues <= 2,
        score: Math.max(0, 100 - (criticalIssues * 20) - (majorIssues * 10) - (localIssues.length * 2)),
        issues: localIssues,
        suggestions: [],
      };
    }
  }
}

export const coherenceChecker = new CoherenceChecker();
