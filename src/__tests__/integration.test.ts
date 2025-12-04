/**
 * Integration Tests for World Lore System
 * 
 * Tests the complete flow:
 * - Campaign creation → Lore generation trigger
 * - Generation phases
 * - UI data fetching
 * - Discovery system
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  prisma,
  cleanupTestData,
  disconnectDb,
  createTestCampaign,
  createTestWorldSeed,
  createCompleteTestWorld,
  createTestFaction,
  createTestNpc,
  createTestLocation,
} from './test-utils';

describe('Integration Tests', () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectDb();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // LORE GENERATION FLOW
  // ═══════════════════════════════════════════════════════════════════════

  describe('Lore Generation Flow', () => {
    it('should transition through generation phases', async () => {
      const campaign = await createTestCampaign({
        description: 'A dark fantasy world where ancient evils stir beneath forgotten ruins and gods walk among mortals.',
      });

      // Create world seed in pending state
      const worldSeed = await createTestWorldSeed({
        campaignId: campaign.id,
        generationStatus: 'pending',
      });

      // Simulate phase transitions
      const phases = ['tensions', 'cosmology', 'factions', 'npcs', 'conflicts', 'locations', 'secrets', 'coherence'];
      
      for (const phase of phases) {
        await prisma.worldSeed.update({
          where: { id: worldSeed.id },
          data: { generationStatus: 'generating', currentPhase: phase },
        });

        const updated = await prisma.worldSeed.findUnique({ where: { id: worldSeed.id } });
        expect(updated?.currentPhase).toBe(phase);
      }

      // Mark as completed
      await prisma.worldSeed.update({
        where: { id: worldSeed.id },
        data: { generationStatus: 'completed', currentPhase: null },
      });

      const final = await prisma.worldSeed.findUnique({ where: { id: worldSeed.id } });
      expect(final?.generationStatus).toBe('completed');
    });

    it('should handle generation failure gracefully', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({
        campaignId: campaign.id,
        generationStatus: 'generating',
        currentPhase: 'factions',
      });

      // Simulate failure
      await prisma.worldSeed.update({
        where: { id: worldSeed.id },
        data: {
          generationStatus: 'failed',
          generationError: 'AI service unavailable',
        },
      });

      const failed = await prisma.worldSeed.findUnique({ where: { id: worldSeed.id } });
      expect(failed?.generationStatus).toBe('failed');
      expect(failed?.generationError).toContain('unavailable');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // LORE EXPLORER DATA FLOW
  // ═══════════════════════════════════════════════════════════════════════

  describe('Lore Explorer Data Flow', () => {
    it('should provide all data needed for explorer UI', async () => {
      const world = await createCompleteTestWorld({
        factionCount: 3,
        npcCount: 5,
        locationCount: 4,
        conflictCount: 2,
        secretCount: 3,
      });

      // Verify we can fetch counts
      const counts = await prisma.worldSeed.findUnique({
        where: { id: world.worldSeed.id },
        include: {
          _count: {
            select: {
              factions: true,
              npcs: true,
              locations: true,
              conflicts: true,
              secrets: true,
            },
          },
        },
      });

      expect(counts?._count.factions).toBe(3);
      expect(counts?._count.npcs).toBe(5);
      expect(counts?._count.locations).toBe(4);
      expect(counts?._count.conflicts).toBe(2);
      expect(counts?._count.secrets).toBe(3);

      // Verify we can fetch entity lists
      const factions = await prisma.worldFaction.findMany({
        where: { worldSeedId: world.worldSeed.id },
      });
      expect(factions).toHaveLength(3);

      // Verify we can fetch single entity with full details
      const faction = await prisma.worldFaction.findFirst({
        where: { worldSeedId: world.worldSeed.id },
      });
      expect(faction?.philosophy).toBeDefined();
      expect(faction?.tensionStances).toBeDefined();
    });

    it('should maintain entity relationships', async () => {
      const world = await createCompleteTestWorld();

      // Verify NPC-Faction relationship
      const npcWithFaction = await prisma.worldNpc.findFirst({
        where: { 
          worldSeedId: world.worldSeed.id,
          factionId: { not: null },
        },
        include: {
          faction: true,
        },
      });

      expect(npcWithFaction?.faction).toBeDefined();
      expect(npcWithFaction?.faction?.name).toBeDefined();

      // Verify Location hierarchy
      const childLocation = await prisma.worldLocation.findFirst({
        where: {
          worldSeedId: world.worldSeed.id,
          parentId: { not: null },
        },
        include: {
          parent: true,
        },
      });

      expect(childLocation?.parent).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // DISCOVERY SYSTEM
  // ═══════════════════════════════════════════════════════════════════════

  describe('Discovery System', () => {
    it('should filter undiscovered entities in player mode', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({
        campaignId: campaign.id,
        generationStatus: 'completed',
      });

      // Create mix of discovered and undiscovered
      await createTestFaction({
        worldSeedId: worldSeed.id,
        name: 'Discovered Faction',
        isDiscovered: true,
      });
      await createTestFaction({
        worldSeedId: worldSeed.id,
        name: 'Hidden Faction',
        isDiscovered: false,
      });

      // Player mode query (only discovered)
      const discoveredFactions = await prisma.worldFaction.findMany({
        where: { worldSeedId: worldSeed.id, isDiscovered: true },
      });
      expect(discoveredFactions).toHaveLength(1);
      expect(discoveredFactions[0].name).toBe('Discovered Faction');

      // DM mode query (all)
      const allFactions = await prisma.worldFaction.findMany({
        where: { worldSeedId: worldSeed.id },
      });
      expect(allFactions).toHaveLength(2);
    });

    it('should track discovery state changes', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({
        campaignId: campaign.id,
        generationStatus: 'completed',
      });

      const npc = await createTestNpc({
        worldSeedId: worldSeed.id,
        isDiscovered: false,
      });

      expect(npc.isDiscovered).toBe(false);

      // Discover the NPC
      const discoveredNpc = await prisma.worldNpc.update({
        where: { id: npc.id },
        data: { isDiscovered: true },
      });

      expect(discoveredNpc.isDiscovered).toBe(true);
    });

    it('should handle secrets reveal state separately', async () => {
      const world = await createCompleteTestWorld({ secretCount: 2 });

      // Secrets use isRevealed instead of isDiscovered
      const secret = world.secrets[0];
      expect(secret.isRevealed).toBe(false);

      // Reveal the secret
      const revealed = await prisma.worldSecret.update({
        where: { id: secret.id },
        data: { isRevealed: true },
      });

      expect(revealed.isRevealed).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TIER SYSTEM
  // ═══════════════════════════════════════════════════════════════════════

  describe('Tier System', () => {
    it('should enforce tier hierarchy', async () => {
      const world = await createCompleteTestWorld({
        factionCount: 3,
        npcCount: 6,
      });

      // Check faction tiers are distributed
      const majorFactions = world.factions.filter(f => f.tier === 'major');
      const supportingFactions = world.factions.filter(f => f.tier === 'supporting');
      const minorFactions = world.factions.filter(f => f.tier === 'minor');

      expect(majorFactions.length).toBe(1);
      expect(supportingFactions.length).toBe(1);
      expect(minorFactions.length).toBe(1);
    });

    it('should allow querying by tier', async () => {
      const world = await createCompleteTestWorld({ npcCount: 6 });

      const majorNpcs = await prisma.worldNpc.findMany({
        where: { worldSeedId: world.worldSeed.id, tier: 'major' },
      });

      expect(majorNpcs.length).toBeGreaterThan(0);
      majorNpcs.forEach(npc => {
        expect(npc.tier).toBe('major');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TENSION SYSTEM
  // ═══════════════════════════════════════════════════════════════════════

  describe('Tension System', () => {
    it('should store core tensions in world seed', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({ campaignId: campaign.id });

      const tensions = JSON.parse(worldSeed.coreTensions as string);
      expect(tensions.length).toBeGreaterThan(0);
      expect(tensions[0]).toHaveProperty('axis');
      expect(tensions[0]).toHaveProperty('intensity');
    });

    it('should link factions to tensions via stances', async () => {
      const world = await createCompleteTestWorld();
      const faction = world.factions[0];

      const stances = JSON.parse(faction.tensionStances as string);
      expect(stances).toHaveProperty('faith_vs_reason');
    });

    it('should link conflicts to root tensions', async () => {
      const world = await createCompleteTestWorld({ conflictCount: 2 });
      
      world.conflicts.forEach(conflict => {
        expect(conflict.rootTension).toBeDefined();
        expect(typeof conflict.rootTension).toBe('string');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle empty world gracefully', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({
        campaignId: campaign.id,
        generationStatus: 'completed',
      });

      // Query empty collections
      const factions = await prisma.worldFaction.findMany({
        where: { worldSeedId: worldSeed.id },
      });
      const npcs = await prisma.worldNpc.findMany({
        where: { worldSeedId: worldSeed.id },
      });

      expect(factions).toEqual([]);
      expect(npcs).toEqual([]);
    });

    it('should handle missing parent location', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({
        campaignId: campaign.id,
      });

      const location = await createTestLocation({
        worldSeedId: worldSeed.id,
        parentId: undefined,
      });

      expect(location.parentId).toBeNull();
    });

    it('should handle NPC without faction', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({
        campaignId: campaign.id,
      });

      const npc = await createTestNpc({
        worldSeedId: worldSeed.id,
        factionId: undefined,
      });

      expect(npc.factionId).toBeNull();

      // Should still be queryable
      const fetchedNpc = await prisma.worldNpc.findUnique({
        where: { id: npc.id },
        include: { faction: true },
      });

      expect(fetchedNpc?.faction).toBeNull();
    });
  });
});
