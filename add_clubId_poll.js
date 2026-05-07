import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_poll" ADD COLUMN IF NOT EXISTS "clubId" UUID;`);
    console.log('Successfully added clubId to bricks_poll');
  } catch (e) {
    console.error('Error adding column:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
