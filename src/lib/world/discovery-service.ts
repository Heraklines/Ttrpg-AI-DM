import { prisma } from '@/lib/db';

export type DiscoveryLevel = 'undiscovered' | 'rumored' | 'known' | 'detailed';

export interface DiscoveryState {
  level: DiscoveryLevel;
  discoveredAt?: Date;
  knownFacts: string[];
  revealedSecrets: string[];
}

export interface DiscoveredEntity {
  entityType: string;
  entityId: string;
  level: DiscoveryLevel;
  discoveredAt: Date;
}

type EntityType = 'faction' | 'npc' | 'location' | 'conflict' | 'secret';

export class DiscoveryService {
  async getDiscoveryState(
    campaignId: string,
    entityType: EntityType,
    entityId: string
  ): Promise<DiscoveryState> {
    const entity = await this.getEntity(entityType, entityId);
    
    if (!entity) {
      return {
        level: 'undiscovered',
        knownFacts: [],
        revealedSecrets: [],
      };
    }

    const isDiscovered = entity.isDiscovered as boolean;
    const discoveredAt = entity.discoveredAt as Date | null;
    
    let level: DiscoveryLevel = 'undiscovered';
    if (isDiscovered) {
      const explorationLevel = (entity as Record<string, unknown>).explorationLevel as string | undefined;
      if (explorationLevel === 'mapped' || explorationLevel === 'detailed') {
        level = 'detailed';
      } else if (explorationLevel === 'visited' || explorationLevel === 'known') {
        level = 'known';
      } else if (explorationLevel === 'heard-of' || explorationLevel === 'rumored') {
        level = 'rumored';
      } else {
        level = 'known';
      }
    }

    return {
      level,
      discoveredAt: discoveredAt || undefined,
      knownFacts: [],
      revealedSecrets: [],
    };
  }

  async discover(
    campaignId: string,
    entityType: EntityType,
    entityId: string,
    level: DiscoveryLevel
  ): Promise<void> {
    const now = new Date();
    const explorationLevel = this.levelToExplorationLevel(level);

    switch (entityType) {
      case 'faction':
        await prisma.worldFaction.update({
          where: { id: entityId },
          data: { isDiscovered: true, discoveredAt: now },
        });
        break;
      case 'npc':
        await prisma.worldNpc.update({
          where: { id: entityId },
          data: { isDiscovered: true, discoveredAt: now },
        });
        break;
      case 'location':
        await prisma.worldLocation.update({
          where: { id: entityId },
          data: { isDiscovered: true, discoveredAt: now, explorationLevel },
        });
        break;
      case 'conflict':
        await prisma.worldConflict.update({
          where: { id: entityId },
          data: { isDiscovered: true, discoveredAt: now },
        });
        break;
      case 'secret':
        await prisma.worldSecret.update({
          where: { id: entityId },
          data: { isRevealed: level === 'detailed', revealedAt: level === 'detailed' ? now : null },
        });
        break;
    }
  }

  async getDiscoveredEntities(worldSeedId: string): Promise<DiscoveredEntity[]> {
    const [factions, npcs, locations, conflicts, secrets] = await Promise.all([
      prisma.worldFaction.findMany({
        where: { worldSeedId, isDiscovered: true },
        select: { id: true, discoveredAt: true },
      }),
      prisma.worldNpc.findMany({
        where: { worldSeedId, isDiscovered: true },
        select: { id: true, discoveredAt: true },
      }),
      prisma.worldLocation.findMany({
        where: { worldSeedId, isDiscovered: true },
        select: { id: true, discoveredAt: true, explorationLevel: true },
      }),
      prisma.worldConflict.findMany({
        where: { worldSeedId, isDiscovered: true },
        select: { id: true, discoveredAt: true },
      }),
      prisma.worldSecret.findMany({
        where: { worldSeedId, isRevealed: true },
        select: { id: true, revealedAt: true },
      }),
    ]);

    const result: DiscoveredEntity[] = [];

    factions.forEach((f) => {
      result.push({
        entityType: 'faction',
        entityId: f.id,
        level: 'known',
        discoveredAt: f.discoveredAt || new Date(),
      });
    });

    npcs.forEach((n) => {
      result.push({
        entityType: 'npc',
        entityId: n.id,
        level: 'known',
        discoveredAt: n.discoveredAt || new Date(),
      });
    });

    locations.forEach((l) => {
      result.push({
        entityType: 'location',
        entityId: l.id,
        level: this.explorationToDiscoveryLevel(l.explorationLevel),
        discoveredAt: l.discoveredAt || new Date(),
      });
    });

    conflicts.forEach((c) => {
      result.push({
        entityType: 'conflict',
        entityId: c.id,
        level: 'known',
        discoveredAt: c.discoveredAt || new Date(),
      });
    });

    secrets.forEach((s) => {
      result.push({
        entityType: 'secret',
        entityId: s.id,
        level: 'detailed',
        discoveredAt: s.revealedAt || new Date(),
      });
    });

    return result;
  }

  applyDiscoveryFilter<T extends Record<string, unknown>>(
    entity: T,
    discoveryState: DiscoveryState,
    mode: 'player' | 'dm'
  ): T {
    if (mode === 'dm') return entity;

    const filtered = { ...entity };

    switch (discoveryState.level) {
      case 'undiscovered':
        return {
          id: entity.id,
          name: '???',
          type: entity.type,
          tier: entity.tier,
          isDiscovered: false,
          _hidden: true,
        } as T;

      case 'rumored':
        return {
          id: entity.id,
          name: entity.name,
          type: entity.type,
          tier: entity.tier,
          isDiscovered: true,
          description: 'You have heard rumors about this...',
          _partial: true,
        } as T;

      case 'known':
        delete (filtered as Record<string, unknown>).privateGoal;
        delete (filtered as Record<string, unknown>).secretGoal;
        delete (filtered as Record<string, unknown>).trueNature;
        delete (filtered as Record<string, unknown>).npcSecrets;
        delete (filtered as Record<string, unknown>).factionSecrets;
        delete (filtered as Record<string, unknown>).locationSecrets;
        delete (filtered as Record<string, unknown>).hiddenIdentity;
        return filtered;

      case 'detailed':
        delete (filtered as Record<string, unknown>).hiddenIdentity;
        return filtered;

      default:
        return filtered;
    }
  }

  private async getEntity(type: EntityType, id: string) {
    switch (type) {
      case 'faction':
        return prisma.worldFaction.findUnique({ where: { id } });
      case 'npc':
        return prisma.worldNpc.findUnique({ where: { id } });
      case 'location':
        return prisma.worldLocation.findUnique({ where: { id } });
      case 'conflict':
        return prisma.worldConflict.findUnique({ where: { id } });
      case 'secret':
        return prisma.worldSecret.findUnique({ where: { id } });
      default:
        return null;
    }
  }

  private levelToExplorationLevel(level: DiscoveryLevel): string {
    switch (level) {
      case 'undiscovered': return 'unknown';
      case 'rumored': return 'heard-of';
      case 'known': return 'visited';
      case 'detailed': return 'mapped';
      default: return 'unknown';
    }
  }

  private explorationToDiscoveryLevel(exploration: string): DiscoveryLevel {
    switch (exploration) {
      case 'unknown': return 'undiscovered';
      case 'heard-of': return 'rumored';
      case 'visited': return 'known';
      case 'mapped': return 'detailed';
      default: return 'known';
    }
  }
}

export const discoveryService = new DiscoveryService();
