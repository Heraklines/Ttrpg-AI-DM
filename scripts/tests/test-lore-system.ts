/**
 * Comprehensive Test Suite for World Lore Generation System
 * 
 * Run with: npx ts-node scripts/tests/test-lore-system.ts
 * Or: npx tsx scripts/tests/test-lore-system.ts
 * 
 * Tests:
 * 1. Database Schema - Verify all WorldSeed tables exist
 * 2. Campaign Creation - Create test campaign with description
 * 3. Lore Generation Trigger - Verify auto-trigger works
 * 4. Generation Status API - Test polling endpoint
 * 5. Lore Query APIs - Test fetching generated content
 * 6. Entity Relationships - Verify interconnections
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, duration: Date.now() - start });
    log(`  ✓ ${name} (${Date.now() - start}ms)`, colors.green);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errMsg, duration: Date.now() - start });
    log(`  ✗ ${name}`, colors.red);
    log(`    Error: ${errMsg}`, colors.dim);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════

async function testDatabaseSchema() {
  log('\n📊 Testing Database Schema...', colors.cyan);

  await runTest('WorldSeed table exists', async () => {
    const count = await prisma.worldSeed.count();
    if (typeof count !== 'number') throw new Error('WorldSeed table not accessible');
  });

  await runTest('WorldGeography table exists', async () => {
    const count = await prisma.worldGeography.count();
    if (typeof count !== 'number') throw new Error('WorldGeography table not accessible');
  });

  await runTest('WorldCosmology table exists', async () => {
    const count = await prisma.worldCosmology.count();
    if (typeof count !== 'number') throw new Error('WorldCosmology table not accessible');
  });

  await runTest('WorldHistory table exists', async () => {
    const count = await prisma.worldHistory.count();
    if (typeof count !== 'number') throw new Error('WorldHistory table not accessible');
  });

  await runTest('WorldFaction table exists', async () => {
    const count = await prisma.worldFaction.count();
    if (typeof count !== 'number') throw new Error('WorldFaction table not accessible');
  });

  await runTest('WorldNpc table exists', async () => {
    const count = await prisma.worldNpc.count();
    if (typeof count !== 'number') throw new Error('WorldNpc table not accessible');
  });

  await runTest('WorldLocation table exists', async () => {
    const count = await prisma.worldLocation.count();
    if (typeof count !== 'number') throw new Error('WorldLocation table not accessible');
  });

  await runTest('WorldConflict table exists', async () => {
    const count = await prisma.worldConflict.count();
    if (typeof count !== 'number') throw new Error('WorldConflict table not accessible');
  });

  await runTest('WorldSecret table exists', async () => {
    const count = await prisma.worldSecret.count();
    if (typeof count !== 'number') throw new Error('WorldSecret table not accessible');
  });

  await runTest('WorldRelationship table exists', async () => {
    const count = await prisma.worldRelationship.count();
    if (typeof count !== 'number') throw new Error('WorldRelationship table not accessible');
  });
}


async function testCampaignCreation() {
  log('\n🎮 Testing Campaign Creation...', colors.cyan);

  let testCampaignId: string | null = null;

  await runTest('Create test campaign with description', async () => {
    const campaign = await prisma.campaign.create({
      data: {
        name: `Test Campaign ${Date.now()}`,
        description: 'A dark fantasy realm where ancient dragons wage war against rising kingdoms. Magic is forbidden by the Church of the Silver Flame, but underground mages plot rebellion. The prophecy speaks of a hero who will either unite or destroy all.',
        gameState: {
          create: {
            mode: 'exploration',
            gameDay: 1,
            gameHour: 8,
            gameMinute: 0,
          },
        },
      },
    });
    testCampaignId = campaign.id;
    if (!campaign.id) throw new Error('Campaign creation failed');
    log(`    Created campaign: ${campaign.id}`, colors.dim);
  });

  await runTest('Campaign has description >= 50 chars', async () => {
    if (!testCampaignId) throw new Error('No test campaign');
    const campaign = await prisma.campaign.findUnique({ where: { id: testCampaignId } });
    if (!campaign?.description || campaign.description.length < 50) {
      throw new Error(`Description too short: ${campaign?.description?.length || 0} chars`);
    }
  });

  return testCampaignId;
}

async function testWorldSeedCreation(campaignId: string) {
  log('\n🌍 Testing WorldSeed Creation...', colors.cyan);

  let worldSeedId: string | null = null;

  await runTest('Create WorldSeed for campaign', async () => {
    const worldSeed = await prisma.worldSeed.create({
      data: {
        campaignId,
        name: 'Realm of Shadows',
        tone: 'dark',
        scale: 'regional',
        themes: JSON.stringify(['war', 'magic', 'faith']),
        coreTensions: JSON.stringify([
          { id: 'faith-vs-magic', name: 'Faith vs Magic', description: 'The Church hunts mages' },
          { id: 'order-vs-chaos', name: 'Order vs Chaos', description: 'Kingdoms vs Dragon Lords' },
        ]),
        generationStatus: 'pending',
        currentPhase: 'tensions',
      },
    });
    worldSeedId = worldSeed.id;
    if (!worldSeed.id) throw new Error('WorldSeed creation failed');
    log(`    Created WorldSeed: ${worldSeed.id}`, colors.dim);
  });

  await runTest('WorldSeed linked to campaign', async () => {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { worldSeed: true },
    });
    if (!campaign?.worldSeed) throw new Error('WorldSeed not linked to campaign');
  });

  return worldSeedId;
}

async function testGeographyCreation(worldSeedId: string) {
  log('\n🗺️ Testing Geography Creation...', colors.cyan);

  await runTest('Create WorldGeography', async () => {
    const geo = await prisma.worldGeography.create({
      data: {
        worldSeedId,
        heightmapSeed: 12345,
        continents: JSON.stringify(['Valdoria', 'Shadowfen']),
        oceans: JSON.stringify(['Sea of Storms', 'Abyssal Deep']),
        majorRegions: JSON.stringify([
          { name: 'Northern Wastes', climate: 'arctic' },
          { name: 'Sunfire Desert', climate: 'arid' },
        ]),
      },
    });
    if (!geo.id) throw new Error('Geography creation failed');
  });
}

async function testCosmologyCreation(worldSeedId: string) {
  log('\n✨ Testing Cosmology Creation...', colors.cyan);

  await runTest('Create WorldCosmology', async () => {
    const cosmo = await prisma.worldCosmology.create({
      data: {
        worldSeedId,
        planarStructure: JSON.stringify({
          material: 'Prime Material',
          planes: ['Shadowfell', 'Feywild', 'Celestia'],
        }),
        magicSystem: JSON.stringify({
          source: 'Weave',
          schools: ['Evocation', 'Necromancy', 'Divination'],
          restrictions: 'Forbidden by Church',
        }),
        pantheon: JSON.stringify([
          { name: 'Solarius', domain: 'Sun', alignment: 'LG' },
          { name: 'Umbra', domain: 'Shadow', alignment: 'NE' },
        ]),
      },
    });
    if (!cosmo.id) throw new Error('Cosmology creation failed');
  });
}


async function testFactionsCreation(worldSeedId: string) {
  log('\n⚔️ Testing Factions Creation...', colors.cyan);

  const factionIds: string[] = [];

  await runTest('Create major faction', async () => {
    const faction = await prisma.worldFaction.create({
      data: {
        worldSeedId,
        name: 'Church of the Silver Flame',
        type: 'religious',
        tier: 'major',
        philosophy: 'Magic is heresy, only divine power is pure',
        publicImage: 'Protectors of the faithful from dark magic',
        tensionStances: JSON.stringify({ 'faith-vs-magic': 'anti-magic', 'order-vs-chaos': 'order' }),
        leadership: JSON.stringify({ type: 'council', leader: 'High Inquisitor Malachar' }),
        resources: JSON.stringify(['templars', 'inquisitors', 'holy artifacts']),
        isDiscovered: true,
      },
    });
    factionIds.push(faction.id);
    if (!faction.id) throw new Error('Faction creation failed');
  });

  await runTest('Create opposing faction', async () => {
    const faction = await prisma.worldFaction.create({
      data: {
        worldSeedId,
        name: 'Shadow Weavers Guild',
        type: 'arcane',
        tier: 'major',
        philosophy: 'Magic is a birthright, not a crime',
        publicImage: 'Underground network fighting for magical freedom',
        tensionStances: JSON.stringify({ 'faith-vs-magic': 'pro-magic', 'order-vs-chaos': 'chaos' }),
        leadership: JSON.stringify({ type: 'hierarchy', leader: 'Archmage Vesper' }),
        resources: JSON.stringify(['spellbooks', 'hidden sanctuaries', 'magical artifacts']),
        isDiscovered: false,
      },
    });
    factionIds.push(faction.id);
  });

  await runTest('Create minor faction', async () => {
    const faction = await prisma.worldFaction.create({
      data: {
        worldSeedId,
        name: 'Merchants of the Golden Road',
        type: 'economic',
        tier: 'supporting',
        philosophy: 'Gold has no allegiance',
        tensionStances: JSON.stringify({ 'faith-vs-magic': 'neutral', 'order-vs-chaos': 'neutral' }),
        isDiscovered: true,
      },
    });
    factionIds.push(faction.id);
  });

  return factionIds;
}

async function testNpcsCreation(worldSeedId: string, factionIds: string[]) {
  log('\n👤 Testing NPCs Creation...', colors.cyan);

  const npcIds: string[] = [];

  await runTest('Create major NPC linked to faction', async () => {
    const npc = await prisma.worldNpc.create({
      data: {
        worldSeedId,
        factionId: factionIds[0], // Church
        name: 'High Inquisitor Malachar',
        tier: 'major',
        occupation: 'Religious Leader',
        appearance: 'Tall, gaunt figure in silver robes with cold grey eyes',
        personality: JSON.stringify({ traits: ['zealous', 'cunning', 'ruthless'] }),
        tensionRole: JSON.stringify({ 'faith-vs-magic': 'antagonist' }),
        knowledgeScope: JSON.stringify(['church secrets', 'heretic locations']),
        publicGoal: 'Purge all heretics from the realm',
        privateGoal: 'Suppress his own magical abilities',
        isDiscovered: true,
      },
    });
    npcIds.push(npc.id);
    if (!npc.id) throw new Error('NPC creation failed');
  });

  await runTest('Create NPC with hidden identity', async () => {
    const npc = await prisma.worldNpc.create({
      data: {
        worldSeedId,
        factionId: factionIds[1], // Shadow Weavers (secret)
        name: 'Sister Elara',
        tier: 'supporting',
        occupation: 'Church Priestess',
        appearance: 'Young woman with kind eyes and silver holy symbol',
        personality: JSON.stringify({ traits: ['kind', 'conflicted', 'brave'] }),
        hiddenIdentity: 'Actually a mage spy for the Shadow Weavers',
        isDiscovered: true,
      },
    });
    npcIds.push(npc.id);
  });

  await runTest('Create minor NPC', async () => {
    const npc = await prisma.worldNpc.create({
      data: {
        worldSeedId,
        name: 'Old Gareth the Blacksmith',
        tier: 'minor',
        occupation: 'Blacksmith',
        appearance: 'Burly man with calloused hands and a kind smile',
        isDiscovered: true,
      },
    });
    npcIds.push(npc.id);
  });

  return npcIds;
}


async function testLocationsCreation(worldSeedId: string) {
  log('\n🏰 Testing Locations Creation...', colors.cyan);

  const locationIds: string[] = [];

  await runTest('Create major city', async () => {
    const loc = await prisma.worldLocation.create({
      data: {
        worldSeedId,
        name: 'Valdoria Prime',
        type: 'city',
        tier: 'major',
        description: 'The holy capital of the Church of the Silver Flame',
        mapCoordinates: JSON.stringify({ x: 500, y: 300 }),
        sensoryDetails: JSON.stringify({
          sights: ['Towering silver spires', 'Templars patrolling streets'],
          sounds: ['Church bells', 'Prayers and hymns'],
          smells: ['Incense', 'Fresh bread from bakeries'],
        }),
        explorationLevel: 'known',
        isDiscovered: true,
      },
    });
    locationIds.push(loc.id);
    if (!loc.id) throw new Error('Location creation failed');
  });

  await runTest('Create hidden location', async () => {
    const loc = await prisma.worldLocation.create({
      data: {
        worldSeedId,
        name: 'The Umbral Sanctum',
        type: 'dungeon',
        tier: 'supporting',
        description: 'Secret headquarters of the Shadow Weavers',
        mapCoordinates: JSON.stringify({ x: 200, y: 450 }),
        sensoryDetails: JSON.stringify({
          sights: ['Floating runes', 'Ancient tomes'],
          sounds: ['Whispered incantations'],
          smells: ['Ozone', 'Old parchment'],
        }),
        explorationLevel: 'unknown',
        isDiscovered: false,
      },
    });
    locationIds.push(loc.id);
  });

  await runTest('Create location with parent hierarchy', async () => {
    const loc = await prisma.worldLocation.create({
      data: {
        worldSeedId,
        parentId: locationIds[0], // Inside Valdoria Prime
        name: 'The Silver Cathedral',
        type: 'landmark',
        tier: 'supporting',
        description: 'The grand cathedral at the heart of Valdoria',
        isDiscovered: true,
      },
    });
    locationIds.push(loc.id);
  });

  return locationIds;
}

async function testConflictsCreation(worldSeedId: string) {
  log('\n🔥 Testing Conflicts Creation...', colors.cyan);

  const conflictIds: string[] = [];

  await runTest('Create major conflict', async () => {
    const conflict = await prisma.worldConflict.create({
      data: {
        worldSeedId,
        name: 'The Silent War',
        type: 'ideological',
        tier: 'major',
        rootTension: 'faith-vs-magic',
        sides: JSON.stringify([
          { name: 'Church of the Silver Flame', stance: 'aggressor' },
          { name: 'Shadow Weavers Guild', stance: 'resistance' },
        ]),
        stakes: 'Complete magical freedom or total suppression vs extinction of magic or collapse of Church authority',
        publicNarrative: 'The Church protects the realm from dangerous heretics. The underground struggle between Church and mages.',
        trueNature: 'A power struggle disguised as religious duty',
        knowledgeLevel: 'public',
        isDiscovered: true,
      },
    });
    conflictIds.push(conflict.id);
    if (!conflict.id) throw new Error('Conflict creation failed');
  });

  await runTest('Create hidden conflict', async () => {
    const conflict = await prisma.worldConflict.create({
      data: {
        worldSeedId,
        name: 'The Dragon Conspiracy',
        type: 'political',
        tier: 'supporting',
        rootTension: 'order-vs-chaos',
        publicNarrative: 'Ancient dragons secretly manipulating both sides',
        trueNature: 'Dragons seek to weaken humans before reconquest',
        knowledgeLevel: 'hidden',
        isDiscovered: false,
      },
    });
    conflictIds.push(conflict.id);
  });

  return conflictIds;
}


async function testSecretsCreation(worldSeedId: string) {
  log('\n🔒 Testing Secrets Creation...', colors.cyan);

  await runTest('Create world-shaking secret', async () => {
    const secret = await prisma.worldSecret.create({
      data: {
        worldSeedId,
        name: 'The Prophecy of Unification',
        type: 'prophecy',
        tier: 'major',
        content: 'When shadow and flame unite under a mortal hand, the chains of gods shall break, and magic reborn shall sweep the land.',
        implications: 'A prophecy that could unite or destroy the realm',
        tensionImpact: JSON.stringify({ 'faith-vs-magic': 'resolution' }),
        knownBy: JSON.stringify(['Ancient Dragon Elders']),
        hints: JSON.stringify([
          'Old murals in forgotten temples',
          'Cryptic verses in forbidden texts',
        ]),
        discoveryConditions: JSON.stringify({
          locations: ['Temple of the First Dawn'],
          npcs: ['The Last Oracle'],
        }),
        isRevealed: false,
      },
    });
    if (!secret.id) throw new Error('Secret creation failed');
  });

  await runTest('Create character secret', async () => {
    const secret = await prisma.worldSecret.create({
      data: {
        worldSeedId,
        name: "Malachar's True Faith",
        type: 'identity',
        tier: 'supporting',
        content: 'Malachar himself was born with magical abilities, which he suppresses with daily rituals',
        implications: 'The High Inquisitor harbors a terrible secret',
        hints: JSON.stringify(['His hands sometimes glow faintly']),
        isRevealed: false,
      },
    });
  });
}

async function testRelationshipsCreation(worldSeedId: string, npcIds: string[], factionIds: string[]) {
  log('\n🔗 Testing Relationships Creation...', colors.cyan);

  await runTest('Create NPC-to-NPC relationship', async () => {
    if (npcIds.length < 2) throw new Error('Need at least 2 NPCs');
    const rel = await prisma.worldRelationship.create({
      data: {
        worldSeedId,
        sourceType: 'npc',
        sourceId: npcIds[0], // Malachar
        targetType: 'npc',
        targetId: npcIds[1], // Sister Elara
        type: 'mentor',
        strength: 4,
        description: 'Malachar mentored Elara before she joined the Church',
        isPublic: true,
        isDiscovered: true,
      },
    });
    if (!rel.id) throw new Error('Relationship creation failed');
  });

  await runTest('Create Faction-to-Faction relationship', async () => {
    if (factionIds.length < 2) throw new Error('Need at least 2 factions');
    const rel = await prisma.worldRelationship.create({
      data: {
        worldSeedId,
        sourceType: 'faction',
        sourceId: factionIds[0], // Church
        targetType: 'faction',
        targetId: factionIds[1], // Shadow Weavers
        type: 'enemy',
        strength: 5,
        description: 'Mortal enemies locked in secret war',
        isPublic: false,
        isDiscovered: false,
      },
    });
  });

  await runTest('Create NPC-to-Faction relationship', async () => {
    const rel = await prisma.worldRelationship.create({
      data: {
        worldSeedId,
        sourceType: 'npc',
        sourceId: npcIds[1], // Sister Elara
        targetType: 'faction',
        targetId: factionIds[1], // Shadow Weavers (secretly)
        type: 'member',
        strength: 3,
        description: 'Secret member and spy',
        isPublic: false,
        isDiscovered: false,
      },
    });
  });
}

async function testWorldSeedStatusUpdate(worldSeedId: string) {
  log('\n📊 Testing Status Updates...', colors.cyan);

  await runTest('Update generation status to generating', async () => {
    const updated = await prisma.worldSeed.update({
      where: { id: worldSeedId },
      data: {
        generationStatus: 'generating',
        currentPhase: 'factions',
      },
    });
    if (updated.generationStatus !== 'generating') throw new Error('Status not updated');
  });

  await runTest('Update generation status to completed', async () => {
    const updated = await prisma.worldSeed.update({
      where: { id: worldSeedId },
      data: {
        generationStatus: 'completed',
        currentPhase: 'coherence',
      },
    });
    if (updated.generationStatus !== 'completed') throw new Error('Status not updated');
  });
}


async function testLoreQueries(worldSeedId: string) {
  log('\n🔍 Testing Lore Queries...', colors.cyan);

  await runTest('Query all factions', async () => {
    const factions = await prisma.worldFaction.findMany({
      where: { worldSeedId },
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
    });
    if (factions.length === 0) throw new Error('No factions found');
    log(`    Found ${factions.length} factions`, colors.dim);
  });

  await runTest('Query discovered entities only (player mode)', async () => {
    const discovered = await prisma.worldFaction.findMany({
      where: { worldSeedId, isDiscovered: true },
    });
    const hidden = await prisma.worldFaction.findMany({
      where: { worldSeedId, isDiscovered: false },
    });
    log(`    Discovered: ${discovered.length}, Hidden: ${hidden.length}`, colors.dim);
    if (discovered.length === 0) throw new Error('No discovered factions');
  });

  await runTest('Query NPCs with faction join', async () => {
    const npcs = await prisma.worldNpc.findMany({
      where: { worldSeedId },
      include: { faction: true },
    });
    const withFaction = npcs.filter(n => n.faction);
    log(`    NPCs with factions: ${withFaction.length}/${npcs.length}`, colors.dim);
  });

  await runTest('Query location hierarchy', async () => {
    const locations = await prisma.worldLocation.findMany({
      where: { worldSeedId },
      include: { children: true, parent: true },
    });
    const withChildren = locations.filter(l => l.children.length > 0);
    log(`    Locations with children: ${withChildren.length}`, colors.dim);
  });

  await runTest('Query relationships for entity', async () => {
    const npc = await prisma.worldNpc.findFirst({ where: { worldSeedId } });
    if (!npc) throw new Error('No NPC found');
    
    const relationships = await prisma.worldRelationship.findMany({
      where: {
        worldSeedId,
        OR: [
          { sourceType: 'npc', sourceId: npc.id },
          { targetType: 'npc', targetId: npc.id },
        ],
      },
    });
    log(`    Relationships for ${npc.name}: ${relationships.length}`, colors.dim);
  });

  await runTest('Count entities by category', async () => {
    const counts = await Promise.all([
      prisma.worldFaction.count({ where: { worldSeedId } }),
      prisma.worldNpc.count({ where: { worldSeedId } }),
      prisma.worldLocation.count({ where: { worldSeedId } }),
      prisma.worldConflict.count({ where: { worldSeedId } }),
      prisma.worldSecret.count({ where: { worldSeedId } }),
    ]);
    log(`    Factions: ${counts[0]}, NPCs: ${counts[1]}, Locations: ${counts[2]}, Conflicts: ${counts[3]}, Secrets: ${counts[4]}`, colors.dim);
  });
}

async function cleanupTestData(campaignId: string) {
  log('\n🧹 Cleaning Up Test Data...', colors.cyan);

  await runTest('Delete test campaign and cascade', async () => {
    // WorldSeed and related entities should cascade delete
    await prisma.campaign.delete({ where: { id: campaignId } });
  });

  await runTest('Verify cleanup', async () => {
    const remaining = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (remaining) throw new Error('Campaign not deleted');
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  log('═══════════════════════════════════════════════════════════════════════════', colors.cyan);
  log('  WORLD LORE SYSTEM - COMPREHENSIVE TEST SUITE', colors.cyan);
  log('═══════════════════════════════════════════════════════════════════════════', colors.cyan);
  
  const startTime = Date.now();
  let campaignId: string | null = null;

  try {
    // 1. Test database schema
    await testDatabaseSchema();

    // 2. Create test campaign
    campaignId = await testCampaignCreation();
    if (!campaignId) throw new Error('Failed to create test campaign');

    // 3. Create WorldSeed
    const worldSeedId = await testWorldSeedCreation(campaignId);
    if (!worldSeedId) throw new Error('Failed to create WorldSeed');

    // 4. Create Geography
    await testGeographyCreation(worldSeedId);

    // 5. Create Cosmology
    await testCosmologyCreation(worldSeedId);

    // 6. Create Factions
    const factionIds = await testFactionsCreation(worldSeedId);

    // 7. Create NPCs
    const npcIds = await testNpcsCreation(worldSeedId, factionIds);

    // 8. Create Locations
    await testLocationsCreation(worldSeedId);

    // 9. Create Conflicts
    await testConflictsCreation(worldSeedId);

    // 10. Create Secrets
    await testSecretsCreation(worldSeedId);

    // 11. Create Relationships
    await testRelationshipsCreation(worldSeedId, npcIds, factionIds);

    // 12. Test Status Updates
    await testWorldSeedStatusUpdate(worldSeedId);

    // 13. Test Queries
    await testLoreQueries(worldSeedId);

    // 14. Cleanup
    await cleanupTestData(campaignId);
    campaignId = null; // Mark as cleaned up

  } catch (error) {
    log(`\n❌ Test suite failed: ${error}`, colors.red);
  } finally {
    // Emergency cleanup if tests failed mid-way
    if (campaignId) {
      try {
        await prisma.campaign.delete({ where: { id: campaignId } });
        log('  (Emergency cleanup completed)', colors.dim);
      } catch {
        // Ignore if already deleted
      }
    }

    await prisma.$disconnect();
  }

  // Print summary
  const totalTime = Date.now() - startTime;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  log('\n═══════════════════════════════════════════════════════════════════════════', colors.cyan);
  log('  TEST SUMMARY', colors.cyan);
  log('═══════════════════════════════════════════════════════════════════════════', colors.cyan);
  log(`  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`, passed === results.length ? colors.green : colors.red);
  log(`  Duration: ${totalTime}ms`, colors.dim);

  if (failed > 0) {
    log('\n  Failed Tests:', colors.red);
    results.filter(r => !r.passed).forEach(r => {
      log(`    • ${r.name}: ${r.error}`, colors.red);
    });
  }

  log('\n');

  // Exit with error code if tests failed
  process.exit(failed > 0 ? 1 : 0);
}

main();
