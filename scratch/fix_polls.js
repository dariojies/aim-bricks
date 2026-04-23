import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const date = new Date('2026-05-01T10:00:00+02:00');
  const result = await prisma.bricks_poll.updateMany({
    where: { isActive: true },
    data: { expiresAt: date }
  });
  console.log(`Updated ${result.count} polls to ${date.toISOString()}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
