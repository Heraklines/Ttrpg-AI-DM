/**
 * Database Model Tests for World Lore System
 * 
 * Tests the Prisma models and their relationships:
 * - WorldSeed (root entity)
 * - WorldFaction, WorldNpc, WorldLocation, etc.
 * - Relationships between entities
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  prisma,
  cleanupTestData,
  disconnectDb,
  createTestCampaign,
  createTestWorldSeed,
  createTestFaction,
  createTestNpc,
  createTestLocation,
  createTestConflict,
  createTestSecret,
  createCompleteTestWorld,
} from './test-utils';

describe('Database Models', () => {
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
  // CAMPAIGN & WORLD SEED
  // ═══════════════════════════════════════════════════════════════════════

  describe('Campaign', () => {
    it('should create a campaign with required fields', async () => {
      const campaign = await createTestCampaign({
        name: 'My Test Campaign',
        description: 'A dark fantasy world where ancient evils stir beneath forgotten ruins.',
      });

      expect(campaign).toBeDefined();
      expect(campaign.id).toBeDefined();
      expect(campaign.name).toBe('My Test Campaign');
      expect(campaign.description).toContain('dark fantasy');
    });

    it('should create a campaign with default game state', async () => {
      const campaign = await createTestCampaign();
      
      const gameState = campaign.gameState as Record<string, unknown>;
      expect(gameState.mode).toBe('exploration');
      expect(gameState.gameDay).toBe(1);
    });
  });

  describe('WorldSeed', () => {
    it('should create a world seed linked to campaign', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({
        campaignId: campaign.id,
        name: 'Eldoria',
      });

      expect(worldSeed).toBeDefined();
      expect(worldSeed.campaignId).toBe(campaign.id);
      expect(worldSeed.name).toBe('Eldoria');
    });

    it('should store core tensions as JSON', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({ campaignId: campaign.id });

      const tensions = JSON.parse(worldSeed.coreTensions as string);
      expect(Array.isArray(tensions)).toBe(true);
      expect(tensions[0]).toHaveProperty('axis');
      expect(tensions[0]).toHaveProperty('intensity');
    });

    it('should track generation status', async () => {
      const campaign = await createTestCampaign();
      
      const pendingSeed = await createTestWorldSeed({
        campaignId: campaign.id,
        generationStatus: 'pending',
      });
      expect(pendingSeed.generationStatus).toBe('pending');

      // Update to generating
      const generatingSeed = await prisma.worldSeed.update({
        where: { id: pendingSeed.id },
        data: { generationStatus: 'generating', currentPhase: 'factions' },
      });
      expect(generatingSeed.generationStatus).toBe('generating');
      expect(generatingSeed.currentPhase).toBe('factions');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // FACTIONS
  // ═══════════════════════════════════════════════════════════════════════

  describe('WorldFaction', () => {
    it('should create a faction with all fields', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({ campaignId: campaign.id });
      const faction = await createTestFaction({
        worldSeedId: worldSeed.id,
        name: 'The Crimson Order',
        tier: 'major',
      });

      expect(faction.name).toBe('The Crimson Order');
      expect(faction.tier).toBe('major');
      expect(faction.worldSeedId).toBe(worldSeed.id);
    });

    it('should store tension stances as JSON', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({ campaignId: campaign.id });
      const faction = await createTestFaction({ worldSeedId: worldSeed.id });

      const stances = JSON.parse(faction.tensionStances as string);
      expect(stances).toHaveProperty('faith_vs_reason');
    });

    it('should support tier hierarchy', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({ campaignId: campaign.id });

      const majorFaction = await createTestFaction({
        worldSeedId: worldSeed.id,
        tier: 'major',
      });
      const supportingFaction = await createTestFaction({
        worldSeedId: worldSeed.id,
        tier: 'supporting',
        name: 'Supporting Faction',
      });
      const minorFaction = await createTestFaction({
        worldSeedId: worldSeed.id,
        tier: 'minor',
        name: 'Minor Faction',
      });

      const factions = await prisma.worldFaction.findMany({
        where: { worldSeedId: worldSeed.id },
        orderBy: { tier: 'asc' },
      });

      expect(factions).toHaveLength(3);
      expect(factions[0].tier).toBe('major');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // NPCs
  // ═══════════════════════════════════════════════════════════════════════

  describe('WorldNpc', () => {
    it('should create an NPC linked to faction', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({ campaignId: campaign.id });
      const faction = await createTestFaction({ worldSeedId: worldSeed.id });
      const npc = await createTestNpc({
        worldSeedId: worldSeed.id,
        factionId: faction.id,
        name: 'Lord Vareth',
      });

      expect(npc.factionId).toBe(faction.id);
      expect(npc.name).toBe('Lord Vareth');
    });

    it('should allow NPC without faction', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({ campaignId: campaign.id });
      const npc = await createTestNpc({
        worldSeedId: worldSeed.id,
        name: 'Wandering Merchant',
      });

      expect(npc.factionId).toBeNull();
    });

    it('should track discovery state', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({ campaignId: campaign.id });
      
      const discoveredNpc = await createTestNpc({
        worldSeedId: worldSeed.id,
        isDiscovered: true,
      });
      const hiddenNpc = await createTestNpc({
        worldSeedId: worldSeed.id,
        isDiscovered: false,
        name: 'Hidden NPC',
      });

      expect(discoveredNpc.isDiscovered).toBe(true);
      expect(hiddenNpc.isDiscovered).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // LOCATIONS
  // ═══════════════════════════════════════════════════════════════════════

  describe('WorldLocation', () => {
    it('should create hierarchical locations', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({ campaignId: campaign.id });
      
      // Create continent
      const continent = await createTestLocation({
        worldSeedId: worldSeed.id,
        name: 'Aeloria',
        tier: 'major',
      });

      // Create region under continent
      const region = await createTestLocation({
        worldSeedId: worldSeed.id,
        parentId: continent.id,
        name: 'Northern Reaches',
        tier: 'supporting',
      });

      // Create city under region
      const city = await createTestLocation({
        worldSeedId: worldSeed.id,
        parentId: region.id,
        name: 'Frosthold',
        tier: 'minor',
      });

      expect(region.parentId).toBe(continent.id);
      expect(city.parentId).toBe(region.id);
    });

    it('should store sensory details', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({ campaignId: campaign.id });
      const location = await createTestLocation({ worldSeedId: worldSeed.id });

      const sensory = JSON.parse(location.sensoryDetails as string);
      expect(sensory).toHaveProperty('sights');
      expect(sensory).toHaveProperty('sounds');
      expect(sensory).toHaveProperty('smells');
    });

    it('should store map coordinates', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({ campaignId: campaign.id });
      const location = await createTestLocation({ worldSeedId: worldSeed.id });

      const coords = JSON.parse(location.mapCoordinates as string);
      expect(coords).toHaveProperty('x');
      expect(coords).toHaveProperty('y');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // CONFLICTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('WorldConflict', () => {
    it('should create a conflict with tension root', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({ campaignId: campaign.id });
      const conflict = await createTestConflict({
        worldSeedId: worldSeed.id,
        name: 'The Faith Wars',
      });

      expect(conflict.rootTension).toBe('faith_vs_reason');
      expect(conflict.publicNarrative).toBeDefined();
      expect(conflict.trueNature).toBeDefined();
    });

    it('should have both public and hidden narratives', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({ campaignId: campaign.id });
      const conflict = await createTestConflict({ worldSeedId: worldSeed.id });

      expect(conflict.publicNarrative).not.toBe(conflict.trueNature);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECRETS
  // ═══════════════════════════════════════════════════════════════════════

  describe('WorldSecret', () => {
    it('should create a secret with discovery conditions', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({ campaignId: campaign.id });
      const secret = await createTestSecret({
        worldSeedId: worldSeed.id,
        name: 'The Hidden Lineage',
      });

      const conditions = JSON.parse(secret.discoveryConditions as string);
      expect(Array.isArray(conditions)).toBe(true);
      expect(secret.isRevealed).toBe(false);
    });

    it('should track who knows the secret', async () => {
      const campaign = await createTestCampaign();
      const worldSeed = await createTestWorldSeed({ campaignId: campaign.id });
      const secret = await createTestSecret({ worldSeedId: worldSeed.id });

      const knownBy = JSON.parse(secret.knownBy as string);
      expect(Array.isArray(knownBy)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // COMPLETE WORLD
  // ═══════════════════════════════════════════════════════════════════════

  describe('Complete Test World', () => {
    it('should create a fully populated world', async () => {
      const world = await createCompleteTestWorld({
        campaignName: 'Epic Campaign',
        worldName: 'Mythoria',
        factionCount: 3,
        npcCount: 5,
        locationCount: 4,
        conflictCount: 2,
        secretCount: 3,
      });

      expect(world.campaign.name).toBe('Epic Campaign');
      expect(world.worldSeed.name).toBe('Mythoria');
      expect(world.factions).toHaveLength(3);
      expect(world.npcs).toHaveLength(5);
      expect(world.locations).toHaveLength(4);
      expect(world.conflicts).toHaveLength(2);
      expect(world.secrets).toHaveLength(3);
    });

    it('should link NPCs to factions', async () => {
      const world = await createCompleteTestWorld({
        factionCount: 2,
        npcCount: 4,
      });

      // Each NPC should have a faction
      for (const npc of world.npcs) {
        expect(world.factions.some(f => f.id === npc.factionId)).toBe(true);
      }
    });

    it('should create hierarchical locations', async () => {
      const world = await createCompleteTestWorld({
        locationCount: 3,
      });

      // At least one location should have a parent
      const childLocations = world.locations.filter(l => l.parentId !== null);
      expect(childLocations.length).toBeGreaterThan(0);
    });
  });
});
