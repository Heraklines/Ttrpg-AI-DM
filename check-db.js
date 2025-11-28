const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.campaign.findMany({
    include: { characters: true }
  });
  console.log('Campaigns:', JSON.stringify(campaigns, null, 2));
  
  const characters = await prisma.character.findMany();
  console.log('\nAll Characters:', JSON.stringify(characters.map(c => ({
    id: c.id,
    name: c.name,
    campaignId: c.campaignId
  })), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
