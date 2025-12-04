/**
 * Test Utilities for Arcane Gamemaster
 * 
 * Provides helpers for:
 * - Database setup/teardown
 * - Test data factories
 * - Mock API responses
 * - Assertion helpers
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// Test database client
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export async function cleanupTestData() {
  // Delete in reverse dependency order
  await prisma.worldRelationship.deleteMany({});
  await prisma.worldSecret.deleteMany({});
  await prisma.worldConflict.deleteMany({});
  await prisma.worldLocation.deleteMany({});
  await prisma.worldNpc.deleteMany({});
  await prisma.worldFaction.deleteMany({});
  await prisma.worldHistory.deleteMany({});
  await prisma.worldCosmology.deleteMany({});
  await prisma.worldGeography.deleteMany({});
  await prisma.worldSeed.deleteMany({});

  // Clean legacy models too
  await prisma.loreSecret.deleteMany({});
  await prisma.loreConflict.deleteMany({});
  await prisma.loreLocation.deleteMany({});
  await prisma.loreFaction.deleteMany({});
  await prisma.loreNpc.deleteMany({});
  await prisma.campaignLore.deleteMany({});

  // Clean campaign data (delete dependents first)
  await prisma.session.deleteMany({});
  await prisma.gameState.deleteMany({});
  await prisma.character.deleteMany({});
  await prisma.campaign.deleteMany({});
}

export async function disconnectDb() {
  await prisma.$disconnect();
}

export { prisma };

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

export interface TestCampaignOptions {
  name?: string;
  description?: string;
}

export async function createTestCampaign(options: TestCampaignOptions = {}) {
  const campaign = await prisma.campaign.create({
    data: {
      id: uuidv4(),
      name: options.name || 'Test Campaign',
      description: options.description || 'A test campaign for the lore system with enough description to trigger generation.',
      gameState: {
        create: {
          mode: 'exploration',
          gameDay: 1,
          gameHour: 8,
          gameMinute: 0,
        },
      },
    },
    include: {
      gameState: true,
    },
  });
  return campaign;
}

export interface TestWorldSeedOptions {
  campaignId: string;
  name?: string;
  generationStatus?: string;
  currentPhase?: string;
}

export async function createTestWorldSeed(options: TestWorldSeedOptions) {
  const worldSeed = await prisma.worldSeed.create({
    data: {
      id: uuidv4(),
      campaignId: options.campaignId,
      name: options.name || 'Test World',
      coreTensions: JSON.stringify([
        { axis: 'faith_vs_reason', intensity: 0.8 },
        { axis: 'order_vs_chaos', intensity: 0.6 },
      ]),
      tone: 'dark',
      generationStatus: options.generationStatus || 'pending',
      currentPhase: options.currentPhase || null,
    },
  });
  return worldSeed;
}

export interface TestFactionOptions {
  worldSeedId: string;
  name?: string;
  tier?: string;
  isDiscovered?: boolean;
}

export async function createTestFaction(options: TestFactionOptions) {
  const faction = await prisma.worldFaction.create({
    data: {
      id: uuidv4(),
      worldSeedId: options.worldSeedId,
      name: options.name || 'Test Faction',
      type: 'political',
      tier: options.tier || 'major',
      philosophy: 'A test faction for unit testing',
      publicImage: 'To test the system',
      tensionStances: JSON.stringify({ faith_vs_reason: 'faith' }),
      leadership: JSON.stringify({ type: 'council', members: ['Elder One'] }),
      resources: JSON.stringify(['gold', 'influence']),
      territory: JSON.stringify(['Northern Territories']),
      isDiscovered: options.isDiscovered ?? true,
    },
  });
  return faction;
}

export interface TestNpcOptions {
  worldSeedId: string;
  factionId?: string;
  name?: string;
  tier?: string;
  isDiscovered?: boolean;
}

export async function createTestNpc(options: TestNpcOptions) {
  const npc = await prisma.worldNpc.create({
    data: {
      id: uuidv4(),
      worldSeedId: options.worldSeedId,
      factionId: options.factionId || null,
      name: options.name || 'Test NPC',
      race: 'Human',
      occupation: 'Tester',
      tier: options.tier || 'supporting',
      appearance: 'A test NPC for unit testing',
      personality: JSON.stringify({ traits: ['curious', 'methodical'] }),
      tensionRole: JSON.stringify(['neutral']),
      knowledgeScope: JSON.stringify({ local_rumors: true, faction_secrets: true }),
      isDiscovered: options.isDiscovered ?? true,
    },
  });
  return npc;
}

export interface TestLocationOptions {
  worldSeedId: string;
  parentId?: string;
  name?: string;
  tier?: string;
  isDiscovered?: boolean;
}

export async function createTestLocation(options: TestLocationOptions) {
  const location = await prisma.worldLocation.create({
    data: {
      id: uuidv4(),
      worldSeedId: options.worldSeedId,
      parentId: options.parentId || null,
      name: options.name || 'Test Location',
      type: 'city',
      tier: options.tier || 'major',
      description: 'A test location for unit testing',
      sensoryDetails: JSON.stringify({
        sights: ['cobblestone streets'],
        sounds: ['market chatter'],
        smells: ['fresh bread'],
      }),
      mapCoordinates: JSON.stringify({ x: 100, y: 200 }),
      explorationLevel: 'unknown',
      isDiscovered: options.isDiscovered ?? true,
    },
  });
  return location;
}

export interface TestConflictOptions {
  worldSeedId: string;
  name?: string;
  tier?: string;
  isDiscovered?: boolean;
}

export async function createTestConflict(options: TestConflictOptions) {
  const conflict = await prisma.worldConflict.create({
    data: {
      id: uuidv4(),
      worldSeedId: options.worldSeedId,
      name: options.name || 'Test Conflict',
      type: 'political',
      tier: options.tier || 'major',
      rootTension: 'faith_vs_reason',
      sides: JSON.stringify(['Faction A', 'Faction B']),
      stakes: 'Control of the realm',
      publicNarrative: 'A dispute over resources. A test conflict for unit testing.',
      trueNature: 'Actually about ancient prophecy',
      knowledgeLevel: 'public',
      isDiscovered: options.isDiscovered ?? true,
    },
  });
  return conflict;
}

export interface TestSecretOptions {
  worldSeedId: string;
  name?: string;
  tier?: string;
  isRevealed?: boolean;
}

export async function createTestSecret(options: TestSecretOptions) {
  const secret = await prisma.worldSecret.create({
    data: {
      id: uuidv4(),
      worldSeedId: options.worldSeedId,
      name: options.name || 'Test Secret',
      type: 'conspiracy',
      tier: options.tier || 'major',
      content: 'A test secret for unit testing',
      tensionImpact: JSON.stringify({ faith_vs_reason: 0.5 }),
      knownBy: JSON.stringify(['Elder One']),
      hints: JSON.stringify(['A cryptic message', 'Strange symbols']),
      discoveryConditions: JSON.stringify(['Find the hidden tome']),
      isRevealed: options.isRevealed ?? false,
    },
  });
  return secret;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE TEST WORLD FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export interface TestWorldOptions {
  campaignName?: string;
  campaignDescription?: string;
  worldName?: string;
  generationStatus?: string;
  factionCount?: number;
  npcCount?: number;
  locationCount?: number;
  conflictCount?: number;
  secretCount?: number;
}

export async function createCompleteTestWorld(options: TestWorldOptions = {}) {
  // Create campaign
  const campaign = await createTestCampaign({
    name: options.campaignName,
    description: options.campaignDescription,
  });

  // Create world seed
  const worldSeed = await createTestWorldSeed({
    campaignId: campaign.id,
    name: options.worldName,
    generationStatus: options.generationStatus || 'completed',
  });

  // Create factions
  const factions = [];
  for (let i = 0; i < (options.factionCount ?? 3); i++) {
    const faction = await createTestFaction({
      worldSeedId: worldSeed.id,
      name: `Test Faction ${i + 1}`,
      tier: i === 0 ? 'major' : i === 1 ? 'supporting' : 'minor',
    });
    factions.push(faction);
  }

  // Create NPCs (linked to factions)
  const npcs = [];
  for (let i = 0; i < (options.npcCount ?? 5); i++) {
    const npc = await createTestNpc({
      worldSeedId: worldSeed.id,
      factionId: factions[i % factions.length]?.id,
      name: `Test NPC ${i + 1}`,
      tier: i < 2 ? 'major' : i < 4 ? 'supporting' : 'minor',
    });
    npcs.push(npc);
  }

  // Create locations (hierarchical)
  const locations = [];
  let parentLocation = null;
  for (let i = 0; i < (options.locationCount ?? 4); i++) {
    const location = await createTestLocation({
      worldSeedId: worldSeed.id,
      parentId: i > 0 ? parentLocation?.id : undefined,
      name: `Test Location ${i + 1}`,
      tier: i === 0 ? 'major' : i < 3 ? 'supporting' : 'minor',
    });
    locations.push(location);
    if (i === 0) parentLocation = location;
  }

  // Create conflicts
  const conflicts = [];
  for (let i = 0; i < (options.conflictCount ?? 2); i++) {
    const conflict = await createTestConflict({
      worldSeedId: worldSeed.id,
      name: `Test Conflict ${i + 1}`,
      tier: i === 0 ? 'major' : 'supporting',
    });
    conflicts.push(conflict);
  }

  // Create secrets
  const secrets = [];
  for (let i = 0; i < (options.secretCount ?? 3); i++) {
    const secret = await createTestSecret({
      worldSeedId: worldSeed.id,
      name: `Test Secret ${i + 1}`,
      tier: i === 0 ? 'major' : 'supporting',
    });
    secrets.push(secret);
  }

  return {
    campaign,
    worldSeed,
    factions,
    npcs,
    locations,
    conflicts,
    secrets,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// API TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export function createMockRequest(url: string, options: RequestInit = {}): Request {
  return new Request(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export function createMockParams(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSERTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export function assertEntityHasRequiredFields(entity: Record<string, unknown>, type: string) {
  const requiredFields: Record<string, string[]> = {
    faction: ['id', 'name', 'tier', 'type', 'isDiscovered'],
    npc: ['id', 'name', 'tier', 'isDiscovered'],
    location: ['id', 'name', 'tier', 'type', 'isDiscovered'],
    conflict: ['id', 'name', 'tier', 'type', 'isDiscovered'],
    secret: ['id', 'name', 'tier', 'type', 'content', 'isRevealed'],
  };

  const fields = requiredFields[type] || [];
  for (const field of fields) {
    if (!(field in entity)) {
      throw new Error(`Entity of type ${type} missing required field: ${field}`);
    }
  }
}

export function assertValidTier(tier: string) {
  const validTiers = ['major', 'supporting', 'minor'];
  if (!validTiers.includes(tier)) {
    throw new Error(`Invalid tier: ${tier}. Expected one of: ${validTiers.join(', ')}`);
  }
}
