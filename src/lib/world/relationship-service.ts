import { prisma } from '@/lib/db';

export type EntityType = 'npc' | 'faction' | 'location' | 'deity';
export type RelationshipType = 'ally' | 'enemy' | 'rival' | 'servant' | 'patron' | 'family' | 'trade_partner' | 'neutral';

export interface CreateRelationshipParams {
  worldSeedId: string;
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  type: RelationshipType;
  strength: number;
  isPublic: boolean;
  description?: string;
  history?: string;
  instability?: string;
}

export interface GeneratedRelationship {
  sourceType: EntityType;
  sourceName: string;
  targetType: EntityType;
  targetName: string;
  type: RelationshipType;
  strength: number;
  isPublic: boolean;
  description?: string;
}

export interface GraphNode {
  id: string;
  type: EntityType;
  name: string;
  tier?: string;
  isDiscovered: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  strength: number;
  isPublic: boolean;
  isDiscovered: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  center: GraphNode;
}

export class RelationshipService {
  async createRelationship(params: CreateRelationshipParams) {
    return prisma.worldRelationship.create({
      data: {
        worldSeedId: params.worldSeedId,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        targetType: params.targetType,
        targetId: params.targetId,
        type: params.type,
        strength: Math.max(1, Math.min(10, params.strength)),
        isPublic: params.isPublic,
        description: params.description,
        history: params.history,
        instability: params.instability,
      },
    });
  }

  async getRelationshipsFor(
    worldSeedId: string,
    entityType: EntityType,
    entityId: string
  ) {
    const [outgoing, incoming] = await Promise.all([
      prisma.worldRelationship.findMany({
        where: {
          worldSeedId,
          sourceType: entityType,
          sourceId: entityId,
        },
      }),
      prisma.worldRelationship.findMany({
        where: {
          worldSeedId,
          targetType: entityType,
          targetId: entityId,
        },
      }),
    ]);

    return { outgoing, incoming, all: [...outgoing, ...incoming] };
  }

  async getRelationshipGraph(
    worldSeedId: string,
    centerId: string,
    centerType: EntityType,
    depth: number = 2,
    playerMode: boolean = false
  ): Promise<GraphData> {
    const visited = new Set<string>();
    const nodes: Map<string, GraphNode> = new Map();
    const edges: GraphEdge[] = [];

    const centerNode = await this.getEntityAsNode(worldSeedId, centerType, centerId);
    if (!centerNode) {
      throw new Error('Center entity not found');
    }
    
    nodes.set(centerNode.id, centerNode);
    visited.add(`${centerType}:${centerId}`);

    await this.expandGraph(
      worldSeedId,
      centerType,
      centerId,
      depth,
      visited,
      nodes,
      edges,
      playerMode
    );

    return {
      nodes: Array.from(nodes.values()),
      edges,
      center: centerNode,
    };
  }

  private async expandGraph(
    worldSeedId: string,
    entityType: EntityType,
    entityId: string,
    remainingDepth: number,
    visited: Set<string>,
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[],
    playerMode: boolean
  ): Promise<void> {
    if (remainingDepth <= 0) return;

    const relationships = await prisma.worldRelationship.findMany({
      where: {
        worldSeedId,
        OR: [
          { sourceType: entityType, sourceId: entityId },
          { targetType: entityType, targetId: entityId },
        ],
      },
    });

    for (const rel of relationships) {
      if (playerMode && !rel.isPublic && !rel.isDiscovered) continue;

      const isSource = rel.sourceId === entityId && rel.sourceType === entityType;
      const otherType = isSource ? rel.targetType : rel.sourceType;
      const otherId = isSource ? rel.targetId : rel.sourceId;
      const visitKey = `${otherType}:${otherId}`;

      if (!visited.has(visitKey)) {
        visited.add(visitKey);
        
        const otherNode = await this.getEntityAsNode(worldSeedId, otherType as EntityType, otherId);
        if (otherNode) {
          if (playerMode && !otherNode.isDiscovered) {
            otherNode.name = '???';
          }
          nodes.set(otherNode.id, otherNode);
        }
      }

      const edgeId = `${rel.sourceType}:${rel.sourceId}->${rel.targetType}:${rel.targetId}`;
      if (!edges.find(e => e.id === edgeId)) {
        edges.push({
          id: edgeId,
          source: `${rel.sourceType}:${rel.sourceId}`,
          target: `${rel.targetType}:${rel.targetId}`,
          type: rel.type as RelationshipType,
          strength: rel.strength,
          isPublic: rel.isPublic,
          isDiscovered: rel.isDiscovered,
        });
      }

      if (remainingDepth > 1) {
        await this.expandGraph(
          worldSeedId,
          otherType as EntityType,
          otherId,
          remainingDepth - 1,
          visited,
          nodes,
          edges,
          playerMode
        );
      }
    }
  }

  private async getEntityAsNode(
    worldSeedId: string,
    type: EntityType,
    id: string
  ): Promise<GraphNode | null> {
    switch (type) {
      case 'npc': {
        const npc = await prisma.worldNpc.findFirst({
          where: { id, worldSeedId },
        });
        if (!npc) return null;
        return {
          id: `npc:${npc.id}`,
          type: 'npc',
          name: npc.name,
          tier: npc.tier,
          isDiscovered: npc.isDiscovered,
        };
      }
      case 'faction': {
        const faction = await prisma.worldFaction.findFirst({
          where: { id, worldSeedId },
        });
        if (!faction) return null;
        return {
          id: `faction:${faction.id}`,
          type: 'faction',
          name: faction.name,
          tier: faction.tier,
          isDiscovered: faction.isDiscovered,
        };
      }
      case 'location': {
        const location = await prisma.worldLocation.findFirst({
          where: { id, worldSeedId },
        });
        if (!location) return null;
        return {
          id: `location:${location.id}`,
          type: 'location',
          name: location.name,
          tier: location.tier,
          isDiscovered: location.isDiscovered,
        };
      }
      default:
        return null;
    }
  }

  async bulkCreateFromGeneration(
    worldSeedId: string,
    relationships: GeneratedRelationship[]
  ): Promise<void> {
    const entityCache: Map<string, string | null> = new Map();

    const resolveEntityId = async (type: EntityType, name: string): Promise<string | null> => {
      const cacheKey = `${type}:${name}`;
      if (entityCache.has(cacheKey)) {
        return entityCache.get(cacheKey) || null;
      }

      let id: string | null = null;
      switch (type) {
        case 'npc': {
          const npc = await prisma.worldNpc.findFirst({
            where: { worldSeedId, name: { contains: name } },
          });
          id = npc?.id || null;
          break;
        }
        case 'faction': {
          const faction = await prisma.worldFaction.findFirst({
            where: { worldSeedId, name: { contains: name } },
          });
          id = faction?.id || null;
          break;
        }
        case 'location': {
          const location = await prisma.worldLocation.findFirst({
            where: { worldSeedId, name: { contains: name } },
          });
          id = location?.id || null;
          break;
        }
      }

      entityCache.set(cacheKey, id);
      return id;
    };

    for (const rel of relationships) {
      const sourceId = await resolveEntityId(rel.sourceType, rel.sourceName);
      const targetId = await resolveEntityId(rel.targetType, rel.targetName);

      if (sourceId && targetId) {
        const existing = await prisma.worldRelationship.findFirst({
          where: {
            worldSeedId,
            sourceType: rel.sourceType,
            sourceId,
            targetType: rel.targetType,
            targetId,
          },
        });

        if (!existing) {
          await this.createRelationship({
            worldSeedId,
            sourceType: rel.sourceType,
            sourceId,
            targetType: rel.targetType,
            targetId,
            type: rel.type,
            strength: rel.strength,
            isPublic: rel.isPublic,
            description: rel.description,
          });
        }
      }
    }
  }

  async discoverRelationship(relationshipId: string): Promise<void> {
    await prisma.worldRelationship.update({
      where: { id: relationshipId },
      data: { isDiscovered: true, discoveredAt: new Date() },
    });
  }

  async getAllRelationshipsForWorld(worldSeedId: string) {
    return prisma.worldRelationship.findMany({
      where: { worldSeedId },
    });
  }
}

export const relationshipService = new RelationshipService();
