import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  // Delete test campaigns (E2E tests, Character Test, etc.)
  const testPatterns = [
    'E2E%',
    'Character Test%',
    'Test Campaign%',
    'ToDelete%',
    'Delete Me%',
    'API Test%',
    'UI Test%',
    'Updated Name',
    'Campaign to Delete',
  ];

  for (const pattern of testPatterns) {
    const deleted = await prisma.campaign.deleteMany({
      where: {
        name: {
          startsWith: pattern.replace('%', ''),
        },
      },
    });
    console.log(`Deleted ${deleted.count} campaigns matching "${pattern}"`);
  }

  // Keep only the most recent campaign for each unique name
  // BUT never delete campaigns that have characters
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { characters: true } } },
  });

  const seen = new Set<string>();
  const toDelete: string[] = [];

  for (const campaign of campaigns) {
    // Never delete campaigns with characters
    if (campaign._count.characters > 0) {
      seen.add(campaign.name);
      continue;
    }
    
    if (seen.has(campaign.name)) {
      toDelete.push(campaign.id);
    } else {
      seen.add(campaign.name);
    }
  }

  if (toDelete.length > 0) {
    const deleted = await prisma.campaign.deleteMany({
      where: {
        id: { in: toDelete },
      },
    });
    console.log(`Deleted ${deleted.count} duplicate campaigns (without characters)`);
  }

  // Show remaining campaigns
  const remaining = await prisma.campaign.findMany({
    include: { characters: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  console.log('\nRemaining campaigns:');
  for (const c of remaining) {
    console.log(`- ${c.name} (${c.characters.length} characters)`);
  }

  await prisma.$disconnect();
}

cleanup().catch(console.error);
