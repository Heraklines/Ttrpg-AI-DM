/**
 * API Route Tests for World Lore System
 * 
 * Tests the API endpoints:
 * - GET /api/campaign/[id]/lore-status
 * - GET /api/campaign/[id]/lore
 * - GET /api/campaign/[id]/lore/counts
 * - GET /api/campaign/[id]/lore/[entityId]
 * - POST /api/campaign/[id]/generate-lore
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  prisma,
  cleanupTestData,
  disconnectDb,
  createCompleteTestWorld,
  createTestCampaign,
  createTestWorldSeed,
} from './test-utils';

// Import the route handlers
import { GET as getLoreStatus } from '@/app/api/campaign/[id]/lore-status/route';
import { GET as getLore } from '@/app/api/campaign/[id]/lore/route';
import { GET as getLoreCounts } from '@/app/api/campaign/[id]/lore/counts/route';
import { GET as getEntity } from '@/app/api/campaign/[id]/lore/[entityId]/route';

describe('API Routes', () => {
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

  // Helper to create mock NextRequest
  function createNextRequest(url: string): NextRequest {
    return new NextRequest(new URL(url, 'http://localhost:3000'));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LORE STATUS
  // ═══════════════════════════════════════════════════════════════════════

  describe('GET /api/campaign/[id]/lore-status', () => {
    it('should return not_started when no world seed exists', async () => {
      const campaign = await createTestCampaign();
      
      const request = createNextRequest(`/api/campaign/${campaign.id}/lore-status`);
      const response = await getLoreStatus(request, { params: Promise.resolve({ id: campaign.id }) });
      const data = await response.json();

      expect(data.status).toBe('not_started');
    });

    it('should return pending when world seed is pending', async () => {
      const campaign = await createTestCampaign();
      await createTestWorldSeed({
        campaignId: campaign.id,
        generationStatus: 'pending',
      });

      const request = createNextRequest(`/api/campaign/${campaign.id}/lore-status`);
      const response = await getLoreStatus(request, { params: Promise.resolve({ id: campaign.id }) });
      const data = await response.json();

      expect(data.status).toBe('pending');
    });

    it('should return generating with current phase', async () => {
      const campaign = await createTestCampaign();
      await createTestWorldSeed({
        campaignId: campaign.id,
        generationStatus: 'generating',
        currentPhase: 'factions',
      });

      const request = createNextRequest(`/api/campaign/${campaign.id}/lore-status`);
      const response = await getLoreStatus(request, { params: Promise.resolve({ id: campaign.id }) });
      const data = await response.json();

      expect(data.status).toBe('generating');
      expect(data.phase).toBe('factions');
    });

    it('should return completed with summary', async () => {
      const world = await createCompleteTestWorld({
        factionCount: 3,
        npcCount: 5,
        locationCount: 4,
        conflictCount: 2,
        secretCount: 3,
      });

      // Update to completed
      await prisma.worldSeed.update({
        where: { id: world.worldSeed.id },
        data: { generationStatus: 'completed' },
      });

      const request = createNextRequest(`/api/campaign/${world.campaign.id}/lore-status`);
      const response = await getLoreStatus(request, { params: Promise.resolve({ id: world.campaign.id }) });
      const data = await response.json();

      expect(data.status).toBe('completed');
      expect(data.summary).toBeDefined();
      expect(data.summary.factions).toBe(3);
      expect(data.summary.npcs).toBe(5);
      expect(data.summary.locations).toBe(4);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // LORE COUNTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('GET /api/campaign/[id]/lore/counts', () => {
    it('should return 400 without worldSeedId', async () => {
      const campaign = await createTestCampaign();
      
      const request = createNextRequest(`/api/campaign/${campaign.id}/lore/counts`);
      const response = await getLoreCounts(request, { params: { id: campaign.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('worldSeedId');
    });

    it('should return correct counts for each category', async () => {
      const world = await createCompleteTestWorld({
        factionCount: 3,
        npcCount: 5,
        locationCount: 4,
        conflictCount: 2,
        secretCount: 3,
      });

      const request = createNextRequest(
        `/api/campaign/${world.campaign.id}/lore/counts?worldSeedId=${world.worldSeed.id}`
      );
      const response = await getLoreCounts(request, { params: { id: world.campaign.id } });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.counts.factions).toBe(3);
      expect(data.counts.people).toBe(5);
      expect(data.counts.geography).toBe(4);
      expect(data.counts.conflicts).toBe(2);
      expect(data.counts.secrets).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // LORE ENTITIES LIST
  // ═══════════════════════════════════════════════════════════════════════

  describe('GET /api/campaign/[id]/lore', () => {
    it('should return 400 without worldSeedId', async () => {
      const campaign = await createTestCampaign();
      
      const request = createNextRequest(`/api/campaign/${campaign.id}/lore?category=factions`);
      const response = await getLore(request, { params: { id: campaign.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should return factions list', async () => {
      const world = await createCompleteTestWorld({ factionCount: 3 });

      const request = createNextRequest(
        `/api/campaign/${world.campaign.id}/lore?category=factions&worldSeedId=${world.worldSeed.id}`
      );
      const response = await getLore(request, { params: { id: world.campaign.id } });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.entities).toHaveLength(3);
      expect(data.entities[0]).toHaveProperty('name');
      expect(data.entities[0]).toHaveProperty('tier');
      expect(data.entities[0]).toHaveProperty('isDiscovered');
    });

    it('should return NPCs list', async () => {
      const world = await createCompleteTestWorld({ npcCount: 5 });

      const request = createNextRequest(
        `/api/campaign/${world.campaign.id}/lore?category=people&worldSeedId=${world.worldSeed.id}`
      );
      const response = await getLore(request, { params: { id: world.campaign.id } });
      const data = await response.json();

      expect(data.entities).toHaveLength(5);
    });

    it('should return locations list', async () => {
      const world = await createCompleteTestWorld({ locationCount: 4 });

      const request = createNextRequest(
        `/api/campaign/${world.campaign.id}/lore?category=geography&worldSeedId=${world.worldSeed.id}`
      );
      const response = await getLore(request, { params: { id: world.campaign.id } });
      const data = await response.json();

      expect(data.entities).toHaveLength(4);
    });

    it('should return conflicts list', async () => {
      const world = await createCompleteTestWorld({ conflictCount: 2 });

      const request = createNextRequest(
        `/api/campaign/${world.campaign.id}/lore?category=conflicts&worldSeedId=${world.worldSeed.id}`
      );
      const response = await getLore(request, { params: { id: world.campaign.id } });
      const data = await response.json();

      expect(data.entities).toHaveLength(2);
    });

    it('should return secrets list', async () => {
      const world = await createCompleteTestWorld({ secretCount: 3 });

      const request = createNextRequest(
        `/api/campaign/${world.campaign.id}/lore?category=secrets&worldSeedId=${world.worldSeed.id}`
      );
      const response = await getLore(request, { params: { id: world.campaign.id } });
      const data = await response.json();

      expect(data.entities).toHaveLength(3);
      // Secrets use isRevealed instead of isDiscovered
      expect(data.entities[0]).toHaveProperty('isDiscovered');
    });

    it('should return empty array for unknown category', async () => {
      const world = await createCompleteTestWorld();

      const request = createNextRequest(
        `/api/campaign/${world.campaign.id}/lore?category=unknown&worldSeedId=${world.worldSeed.id}`
      );
      const response = await getLore(request, { params: { id: world.campaign.id } });
      const data = await response.json();

      expect(data.entities).toEqual([]);
    });

    it('should order entities by tier then name', async () => {
      const world = await createCompleteTestWorld({ factionCount: 3 });

      const request = createNextRequest(
        `/api/campaign/${world.campaign.id}/lore?category=factions&worldSeedId=${world.worldSeed.id}`
      );
      const response = await getLore(request, { params: { id: world.campaign.id } });
      const data = await response.json();

      // Major should come first (tier ordering)
      expect(data.entities[0].tier).toBe('major');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SINGLE ENTITY
  // ═══════════════════════════════════════════════════════════════════════

  describe('GET /api/campaign/[id]/lore/[entityId]', () => {
    it('should return 400 without worldSeedId', async () => {
      const world = await createCompleteTestWorld();
      const faction = world.factions[0];

      const request = createNextRequest(
        `/api/campaign/${world.campaign.id}/lore/${faction.id}?category=factions`
      );
      const response = await getEntity(request, {
        params: { id: world.campaign.id, entityId: faction.id },
      });
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should return full faction entity', async () => {
      const world = await createCompleteTestWorld();
      const faction = world.factions[0];

      const request = createNextRequest(
        `/api/campaign/${world.campaign.id}/lore/${faction.id}?category=factions&worldSeedId=${world.worldSeed.id}`
      );
      const response = await getEntity(request, {
        params: { id: world.campaign.id, entityId: faction.id },
      });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.entity.id).toBe(faction.id);
      expect(data.entity.name).toBe(faction.name);
      expect(data.entity.philosophy).toBeDefined();
      expect(data.entity.tensionStances).toBeDefined();
    });

    it('should return full NPC entity with faction link', async () => {
      const world = await createCompleteTestWorld();
      const npc = world.npcs[0];

      const request = createNextRequest(
        `/api/campaign/${world.campaign.id}/lore/${npc.id}?category=people&worldSeedId=${world.worldSeed.id}`
      );
      const response = await getEntity(request, {
        params: { id: world.campaign.id, entityId: npc.id },
      });
      const data = await response.json();

      expect(data.entity.id).toBe(npc.id);
      expect(data.entity.factionId).toBeDefined();
    });

    it('should return 404 for non-existent entity', async () => {
      const world = await createCompleteTestWorld();

      const request = createNextRequest(
        `/api/campaign/${world.campaign.id}/lore/fake-id-123?category=factions&worldSeedId=${world.worldSeed.id}`
      );
      const response = await getEntity(request, {
        params: { id: world.campaign.id, entityId: 'fake-id-123' },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
    });
  });
});
