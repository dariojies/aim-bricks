import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Auto-sync schema and migrate data safely
async function syncSchema() {
  try {
    // 0. Ensure bricks_clubs exists (Simplified)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "bricks_clubs" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "bricks_clubs_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "bricks_clubs" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'starter';
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "bricks_clubs" ADD COLUMN IF NOT EXISTS "planPaidAt" TIMESTAMP;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "bricks_clubs" ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP;
    `);

    // 1. Create tables if they don't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "bricks_categories" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "clubId" UUID NOT NULL,
        "name" TEXT NOT NULL,
        "icon" TEXT NOT NULL DEFAULT 'Package',
        "isHomeAllowed" BOOLEAN NOT NULL DEFAULT false,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "bricks_items" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "clubId" UUID NOT NULL,
        "categoryId" UUID NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "imageUrl" TEXT NOT NULL,
        "stock" INTEGER NOT NULL DEFAULT 1,
        "isProOnly" BOOLEAN NOT NULL DEFAULT false,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "isAvailable" BOOLEAN NOT NULL DEFAULT true
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "bricks_user_permissions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        "categoryId" UUID NOT NULL,
        "isStandard" BOOLEAN NOT NULL DEFAULT false,
        "isPro" BOOLEAN NOT NULL DEFAULT false,
        UNIQUE("userId", "categoryId")
      );
    `);

    // 2. Add columns to existing tables for migration tracking.
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_reservation" ADD COLUMN IF NOT EXISTS "itemId" UUID;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_reservation" ADD COLUMN IF NOT EXISTS "categoryId" UUID;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_userhistory" ADD COLUMN IF NOT EXISTS "itemId" UUID;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_userhistory" ADD COLUMN IF NOT EXISTS "categoryId" UUID;`);

    // Update tul_clubs for multi-tenancy
    await prisma.$executeRawUnsafe(`ALTER TABLE "tul_clubs" ADD COLUMN IF NOT EXISTS "subdomain" VARCHAR(255)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "tul_clubs" ADD COLUMN IF NOT EXISTS "description" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_categories" ADD COLUMN IF NOT EXISTS "clubId" UUID`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_categories" ADD COLUMN IF NOT EXISTS "config" JSONB`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_brickslab" ADD COLUMN IF NOT EXISTS "club_id" UUID`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_librarybook" ADD COLUMN IF NOT EXISTS "club_id" UUID`);

    // 3. Bricks Club Memberships (Authorization List)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "bricks_club_memberships" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" TEXT NOT NULL,
        "clubId" UUID NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'member',
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("email", "clubId")
      );
    `);

    // Ensure bricks_missing_pieces structure
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_missing_pieces" ADD COLUMN IF NOT EXISTS "itemId" UUID;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_missing_pieces" ADD COLUMN IF NOT EXISTS "userId" UUID;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_missing_pieces" ADD COLUMN IF NOT EXISTS "description" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_missing_pieces" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'Pending';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_missing_pieces" ADD COLUMN IF NOT EXISTS "reportedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;`);
    
    // Safety: Make legacy columns nullable if they still exist in the DB
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_missing_pieces" ALTER COLUMN "brickslabId" DROP NOT NULL;`);
    } catch (e) { /* Column might not exist anymore, ignore */ }

    // Migrate 'admin' role → 'profesor' in bricks_club_memberships
    await prisma.$executeRawUnsafe(`UPDATE "bricks_club_memberships" SET "role" = 'profesor' WHERE "role" = 'admin';`);

    console.log('Database structure verified.');

    // 3. Perform Data Migration
    await migrateToDynamic();

  } catch (e) {
    console.warn('Schema sync warning:', e.message);
  }
}

async function migrateToDynamic() {
  try {
    // 1. Ensure main club exists in bricks_clubs (Simplified)
    let club = await prisma.bricks_clubs.findFirst({ where: { name: 'Aim Education' } });
    if (!club) {
      club = await prisma.bricks_clubs.create({
        data: {
          id: 'b68ca873-5086-474f-a296-fe60b149b8a2', // Preserve existing ID
          name: 'Aim Education'
        }
      });
    }


    // 2. Check if we have legacy data that hasn't been migrated yet
    const legacyBrickslabsCount = await prisma.bricks_brickslab.count();
    const legacyBooksCount = await prisma.bricks_librarybook.count();

    if (legacyBrickslabsCount === 0 && legacyBooksCount === 0) return;

    const itemCount = await prisma.bricks_items.count();

    // Always try to migrate missing pieces if they haven't been linked to UUIDs yet
    const legacyReportsCount = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as count 
      FROM "bricks_missing_pieces" 
      WHERE "itemId" IS NULL OR "itemId" NOT IN (SELECT id FROM "bricks_items")
    `).then(r => r[0]?.count || 0).catch(() => 0);

    // Always sync existing users to memberships list (Safely)
    const allUsers = await prisma.users.findMany({
      where: { club_id: { not: null } },
      select: { email: true, club_id: true, dev_role: true }
    });

    if (allUsers.length > 0) {
      // Optimized Sync: Fetch existing and create missing in bulk
      const existingMemberships = await prisma.bricks_club_memberships.findMany({
        where: { clubId: { in: allUsers.map(u => u.club_id) } },
        select: { email: true, clubId: true }
      });

      const existingSet = new Set(existingMemberships.map(m => `${m.email.toLowerCase()}-${m.clubId}`));

      const missingUsers = allUsers.filter(u => !existingSet.has(`${u.email.toLowerCase()}-${u.club_id}`));

      if (missingUsers.length > 0) {
        console.log(`Syncing ${missingUsers.length} missing users to membership list...`);
        await prisma.bricks_club_memberships.createMany({
          data: missingUsers.map(u => ({
            email: u.email.toLowerCase(),
            clubId: u.club_id,
            role: u.role || 'member'
          })),
          skipDuplicates: true
        });
        console.log('Bulk sync completed.');
      } else {
        console.log('Membership list already up to date.');
      }
    }

    // 4. Ensure default categories have the NEW config for Aim Education (Exact ID provided)
    const aimClubId = 'b68ca873-5086-474f-a296-fe60b149b8a2';
    const aimClub = await prisma.bricks_clubs.findUnique({ where: { id: aimClubId } });
    if (aimClub) {
      // Lego Category
      await prisma.bricks_categories.upsert({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        update: {
          clubId: aimClubId, // Ensure it's linked to the correct ID
          config: {
            reservationMode: 'brickslab',
            customFields: [
              { name: 'legoReference', label: 'Referencia LEGO', type: 'text' },
              { name: 'pieces', label: 'Número de Piezas', type: 'number' }
            ]
          }
        },
        create: {
          id: '00000000-0000-0000-0000-000000000001',
          clubId: aimClubId,
          name: 'Aim Brickslab',
          icon: 'Box',
          config: {
            reservationMode: 'brickslab',
            customFields: [
              { name: 'legoReference', label: 'Referencia LEGO', type: 'text' },
              { name: 'pieces', label: 'Número de Piezas', type: 'number' }
            ]
          }
        }
      });

      // Library Category
      await prisma.bricks_categories.upsert({
        where: { id: '00000000-0000-0000-0000-000000000002' },
        update: {
          clubId: aimClubId,
          config: {
            reservationMode: 'library',
            customFields: [
              { name: 'author', label: 'Autor(es)', type: 'text' },
              { name: 'isbn', label: 'ISBN', type: 'text' }
            ]
          }
        },
        create: {
          id: '00000000-0000-0000-0000-000000000002',
          clubId: aimClubId,
          name: 'Biblioteca',
          icon: 'Book',
          config: {
            reservationMode: 'library',
            customFields: [
              { name: 'author', label: 'Autor(es)', type: 'text' },
              { name: 'isbn', label: 'ISBN', type: 'text' }
            ]
          }
        }
      });
      
      // Ensure all legacy items also have a clubId
      await prisma.bricks_brickslab.updateMany({
        where: { club_id: null },
        data: { club_id: aimClubId }
      });
      await prisma.bricks_librarybook.updateMany({
        where: { club_id: null },
        data: { club_id: aimClubId }
      });
    }

    if (itemCount > 0) {
      // Migrate orphan reports even if items are already synced
      if (legacyReportsCount > 0) {
        try {
          console.log('Migrating legacy missing pieces reports...');
          // First, if we have a brickslabId column, try to map it to the new itemId UUID
          await prisma.$executeRawUnsafe(`
            UPDATE "bricks_missing_pieces" 
            SET "itemId" = items.id
            FROM "bricks_items" items
            JOIN "bricks_brickslab" legacy ON legacy.title = items.title
            WHERE "bricks_missing_pieces"."brickslabId" = legacy.id
            AND "bricks_missing_pieces"."itemId" IS NULL;
          `);
          console.log('Legacy reports migration via brickslabId completed.');
        } catch (e) {
          console.log('Legacy reports migration via SQL failed or not needed:', e.message);
        }

        const items = await prisma.bricks_items.findMany();
        const brickslabs = await prisma.bricks_brickslab.findMany();
        for (const b of brickslabs) {
          const matchingItem = items.find(i => i.title === b.title);
          if (matchingItem) {
            // We use raw update because itemId might be a UUID and b.id is a string, 
            // and we want to avoid Prisma validation issues if the DB state is inconsistent
            try {
              await prisma.$executeRawUnsafe(`UPDATE "bricks_missing_pieces" SET "itemId" = '${matchingItem.id}' WHERE "itemId" = '${b.id}' OR "brickslabId" = '${b.id}';`);
            } catch (e) {}
          }
        }
      }

      // Also ensure all polls and reports have a clubId
      await prisma.bricks_poll.updateMany({
        where: { clubId: null },
        data: { clubId: aimClubId }
      });

      const orphanReports = await prisma.bricks_missing_pieces.findMany({
        where: { item: { clubId: null } },
        include: { item: true }
      });
      // These should already have an itemId from the above logic, but just in case
      // the items themselves are missing clubId (shouldn't happen with current migration but for safety)
      
      console.log('Schema, reports and polls verified/synced.');
      return;
    }
    // Migrate Brickslabs
    const brickslabs = await prisma.bricks_brickslab.findMany();
    for (const b of brickslabs) {
      const newItem = await prisma.bricks_items.create({
        data: {
          clubId: club.id,
          categoryId: legoCat.id,
          title: b.title,
          description: b.description,
          imageUrl: b.imageUrl,
          stock: b.stock || 1,
          isProOnly: b.isProOnly,
          isAvailable: b.isAvailable,
          metadata: { legoReference: b.legoReference }
        }
      });
      // Update reservations, history and missing pieces for this item
      await prisma.bricks_reservation.updateMany({
        where: { brickslabId: b.id },
        data: { itemId: newItem.id, categoryId: legoCat.id }
      });
      await prisma.bricks_userhistory.updateMany({
        where: { brickslabId: b.id },
        data: { itemId: newItem.id, categoryId: legoCat.id }
      });
      await prisma.bricks_missing_pieces.updateMany({
        where: { itemId: b.id }, // Legacy ID
        data: { itemId: newItem.id }
      });
    }

    // Migrate Books
    const books = await prisma.bricks_librarybook.findMany();
    for (const b of books) {
      const newItem = await prisma.bricks_items.create({
        data: {
          clubId: club.id,
          categoryId: libraryCat.id,
          title: b.title,
          description: b.description,
          imageUrl: b.imageUrl,
          stock: b.stock || 1,
          isProOnly: false,
          isAvailable: b.isAvailable,
          metadata: { author: b.author, isbn: b.isbn, minimumRank: b.minimumRank }
        }
      });
      // Update reservations and history for this item
      await prisma.bricks_reservation.updateMany({
        where: { libraryBookId: b.id },
        data: { itemId: newItem.id, categoryId: libraryCat.id }
      });
      await prisma.bricks_userhistory.updateMany({
        where: { libraryBookId: b.id },
        data: { itemId: newItem.id, categoryId: libraryCat.id }
      });
    }

    // Migrate Permissions
    const ranks = await prisma.bricks_ranks.findMany();
    for (const r of ranks) {
      if (r.canReserveBrickslab || r.brickslabPro) {
        await prisma.bricks_user_permissions.upsert({
          where: { userId_categoryId: { userId: r.userId, categoryId: legoCat.id } },
          update: { isStandard: r.canReserveBrickslab, isPro: r.brickslabPro },
          create: { userId: r.userId, categoryId: legoCat.id, isStandard: r.canReserveBrickslab, isPro: r.brickslabPro }
        });
      }
      if (r.canReserveLibrary) {
        await prisma.bricks_user_permissions.upsert({
          where: { userId_categoryId: { userId: r.userId, categoryId: libraryCat.id } },
          update: { isStandard: r.canReserveLibrary },
          create: { userId: r.userId, categoryId: libraryCat.id, isStandard: r.canReserveLibrary }
        });
      }
    }

    console.log('Migration and sync completed successfully!');

  } catch (e) {
    console.error('Migration error:', e);
  }
}

syncSchema();

app.use(cors());
app.use(express.json());

// Helper to map DB item to Frontend CatalogItem
const mapItem = (item, category) => ({
  id: item.id,
  title: item.title,
  type: category?.name || 'Artículo',
  categoryId: item.categoryId,
  description: item.description,
  status: item.isAvailable ? 'Disponible' : 'Reservado',
  imageUrl: item.imageUrl,
  stock: item.stock || 1,
  isProOnly: item.isProOnly,
  metadata: item.metadata || {}
});

// API Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar por email o username
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: email.toLowerCase() }
        ]
      },
      include: {
        reservations: { include: { brickslab: true, libraryBook: true } },
        history: { include: { brickslab: true, libraryBook: true } },
        bricks_ranks: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const membershipsRaw = await prisma.bricks_club_memberships.findMany({
      where: { email: user.email.toLowerCase() }
    });

    let memberships = [];
    if (membershipsRaw.length > 0) {
      const clubIds = membershipsRaw.map(m => m.clubId);
      const clubsInfo = await prisma.bricks_clubs.findMany({
        where: { id: { in: clubIds } }
      });
      memberships = membershipsRaw.map(m => ({
        id: m.id,
        clubId: m.clubId,
        role: m.role,
        clubName: clubsInfo.find(c => c.id === m.clubId)?.name || null
      }));
    }

    // Determine the active club for session initialization entirely from memberships
    let activeClubId = null;
    let activeDevRole = user.dev_role || 'student';

    if (memberships.length > 0) {
      const primaryMembership = memberships.find(m => m.role === 'owner' || m.role === 'admin') || memberships[0];
      activeClubId = primaryMembership.clubId;
      activeDevRole = primaryMembership.role;
    }

    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

    const categories = activeClubId ? await prisma.bricks_categories.findMany({
      where: { clubId: activeClubId }
    }) : [];

    const dynamicPermissions = await prisma.bricks_user_permissions.findMany({
      where: { userId: user.user_id }
    });

    const club = activeClubId ? await prisma.bricks_clubs.findUnique({ where: { id: activeClubId } }) : null;

    const profile = {
      id: user.user_id,
      clubId: activeClubId,
      clubName: club?.name || null,
      name: `${user.name} ${user.surname || ''}`.trim(),
      email: user.email,
      memberships,
      role: activeDevRole,
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        isHomeAllowed: c.isHomeAllowed
      })),
      currentReservations: user.reservations.filter(r => ['Active', 'Reserved', 'Delivered'].includes(r.status)).map(r => ({
        id: r.id,
        status: r.status === 'Active' ? 'Reserved' : r.status,
        text: `${r.status === 'Delivered' ? 'En préstamo' : 'Reservado'}: ${r.brickslab?.title || r.libraryBook?.title || 'Artículo'}`,
        itemId: r.itemId || r.brickslabId || r.libraryBookId,
        categoryId: r.categoryId
      })),
      permissions: dynamicPermissions.reduce((acc, p) => {
        acc[p.categoryId] = { standard: p.isStandard, pro: p.isPro };
        return acc;
      }, {}),
      legacyPermissions: {
        brickslab: user.bricks_ranks?.canReserveBrickslab || false,
        library: user.bricks_ranks?.canReserveLibrary || false,
        brickslabPro: user.bricks_ranks?.brickslabPro || false
      },
      requiresPasswordChange: user.requires_password_change || false
    };

    res.json({ token, profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, clubName, email, password } = req.body;
    if (!name || !clubName || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const existing = await prisma.users.findUnique({ where: { email: email.toLowerCase() }, select: { user_id: true } });
    if (existing) {
      return res.status(409).json({ error: 'Ya existe una cuenta con este correo electrónico.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const club = await prisma.bricks_clubs.create({
      data: { name: clubName.trim(), plan: 'starter' }
    });

    const user = await prisma.users.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'student',
      }
    });

    await prisma.bricks_club_memberships.create({
      data: { email: email.toLowerCase().trim(), clubId: club.id, role: 'owner' }
    });

    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

    res.json({ token, userId: user.user_id, clubId: club.id });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Error al crear la cuenta. Inténtalo de nuevo.' });
  }
});

app.post('/api/auth/me', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Falta userId' });

    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      include: {
        reservations: {
          include: { brickslab: true, libraryBook: true, item: { include: { category: true } } }
        },
        history: {
          include: { brickslab: true, libraryBook: true, item: { include: { category: true } } }
        },
        bricks_ranks: true
      }
    });

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const membershipsRaw = await prisma.bricks_club_memberships.findMany({
      where: { email: user.email.toLowerCase() }
    });

    let memberships = [];
    if (membershipsRaw.length > 0) {
      const clubIds = membershipsRaw.map(m => m.clubId);
      const clubsInfo = await prisma.bricks_clubs.findMany({
        where: { id: { in: clubIds } }
      });
      memberships = membershipsRaw.map(m => ({
        id: m.id,
        clubId: m.clubId,
        role: m.role,
        clubName: clubsInfo.find(c => c.id === m.clubId)?.name || null
      }));
    }

    // Determine the active club for session initialization entirely from memberships
    let activeClubId = null;
    let activeDevRole = user.dev_role || 'student';

    if (memberships.length > 0) {
      const primaryMembership = memberships.find(m => m.role === 'owner' || m.role === 'profesor') || memberships[0];
      activeClubId = primaryMembership.clubId;
      activeDevRole = primaryMembership.role;
    }

    const categories = activeClubId ? await prisma.bricks_categories.findMany({
      where: { clubId: activeClubId }
    }) : [];

    const dynamicPermissions = await prisma.bricks_user_permissions.findMany({
      where: { userId: user.user_id }
    });

    const club = activeClubId ? await prisma.bricks_clubs.findUnique({ where: { id: activeClubId } }) : null;

    const profile = {
      id: user.user_id,
      clubId: activeClubId,
      clubName: club?.name || null,
      name: `${user.name} ${user.surname || ''}`.trim(),
      email: user.email,
      memberships,
      role: activeDevRole,
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        isHomeAllowed: c.isHomeAllowed
      })),
      currentReservations: user.reservations.filter(r => ['Active', 'Reserved', 'Delivered'].includes(r.status)).map(r => ({
        id: r.id,
        status: r.status === 'Active' ? 'Reserved' : r.status,
        text: `${r.status === 'Delivered' ? 'En préstamo' : 'Reservado'}: ${r.brickslab?.title || r.libraryBook?.title || r.item?.title || 'Artículo'}`,
        itemId: r.itemId || r.brickslabId || r.libraryBookId,
        categoryId: r.categoryId || r.item?.categoryId,
        isBrickslab: !!(r.brickslabId || (r.item && r.item.category.name === 'Aim Brickslab')),
        brickslabId: r.brickslabId || (r.item?.category.name === 'Aim Brickslab' ? r.itemId : null)
      })),
      readBooks: user.history
        .filter(h => h.libraryBookId || (h.item && h.item.category.name === 'Biblioteca'))
        .map(h => ({
          id: h.id,
          title: h.libraryBook?.title || h.item?.title || 'Libro',
          imageUrl: h.libraryBook?.imageUrl || h.item?.imageUrl || ''
        })),
      builtBrickslabs: user.history
        .filter(h => h.brickslabId || (h.item && h.item.category.name === 'Aim Brickslab'))
        .map(h => ({
          id: h.id,
          title: h.brickslab?.title || h.item?.title || 'Brickslab',
          imageUrl: h.brickslab?.imageUrl || h.item?.imageUrl || '',
          brickslabId: h.brickslabId || (h.item?.category.name === 'Aim Brickslab' ? h.itemId : null)
        })),
      permissions: dynamicPermissions.reduce((acc, p) => {
        acc[p.categoryId] = { standard: p.isStandard, pro: p.isPro };
        return acc;
      }, {}),
      legacyPermissions: {
        brickslab: user.bricks_ranks?.canReserveBrickslab || false,
        library: user.bricks_ranks?.canReserveLibrary || false,
        brickslabPro: user.bricks_ranks?.brickslabPro || false
      },
      requiresPasswordChange: user.requires_password_change || false
    };

    res.json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/auth/force-password-change', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) return res.status(400).json({ error: 'Faltan datos.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: { user_id: userId },
      data: { password: hashedPassword, requires_password_change: false }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar contraseña obligatoria.' });
  }
});

// Admin Endpoints
app.get('/api/admin/users/permissions', async (req, res) => {
  try {
    const { clubId } = req.query;
    let club;
    if (clubId) {
      club = await prisma.bricks_clubs.findUnique({ where: { id: clubId } });
    } else {
      club = await prisma.bricks_clubs.findFirst();
    }

    if (!club) return res.json([]);

    const memberships = await prisma.bricks_club_memberships.findMany({
      where: { clubId: club.id },
      select: { email: true }
    });
    const validEmails = memberships.map(m => m.email.toLowerCase());

    const [usersList, categories] = await Promise.all([
      prisma.users.findMany({
        where: { email: { in: validEmails } },
        include: { bricks_user_permissions: true, bricks_ranks: true },
        orderBy: { name: 'asc' }
      }),
      prisma.bricks_categories.findMany({ where: { clubId: club.id } })
    ]);

    res.json(usersList.map(u => {
      const perms = {};
      categories.forEach(cat => {
        const p = u.bricks_user_permissions.find(bp => bp.categoryId === cat.id);
        perms[cat.id] = { standard: p?.isStandard || false, pro: p?.isPro || false };
      });

      return {
        id: u.user_id,
        name: `${u.name} ${u.surname || ''}`.trim(),
        email: u.email,
        role: u.dev_role || 'student',
        permissions: perms,
        // Legacy support
        legacyPermissions: {
          brickslab: u.bricks_ranks?.canReserveBrickslab || false,
          library: u.bricks_ranks?.canReserveLibrary || false,
          brickslabPro: u.bricks_ranks?.brickslabPro || false
        }
      };
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/admin/users/permissions', async (req, res) => {
  try {
    const { userId, categoryId, isStandard, isPro } = req.body;

    await prisma.bricks_user_permissions.upsert({
      where: { userId_categoryId: { userId, categoryId } },
      update: { isStandard, isPro },
      create: { userId, categoryId, isStandard, isPro }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/admin/users/password', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'Faltan datos requeridos (ID de usuario o contraseña)' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: { user_id: userId },
      data: { password: hashedPassword, requires_password_change: true }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la contraseña' });
  }
});

app.get('/api/admin/reservations', async (req, res) => {
  try {
    const { clubId } = req.query;
    let club;
    if (clubId) {
      club = await prisma.bricks_clubs.findUnique({ where: { id: clubId } });
    } else {
      club = await prisma.bricks_clubs.findFirst();
    }

    if (!club) return res.json([]);

    const itemsInClub = await prisma.bricks_items.findMany({
      where: { clubId: club.id },
      select: { id: true }
    });
    const validItemIds = itemsInClub.map(i => i.id);

    // Also get all emails that have a membership in this club for legacy items
    const memberships = await prisma.bricks_club_memberships.findMany({
      where: { clubId: club.id },
      select: { email: true }
    });
    const validEmails = memberships.map(m => m.email.toLowerCase());

    const reservations = await prisma.bricks_reservation.findMany({
      where: {
        status: { in: ['Active', 'Reserved', 'Delivered'] },
        OR: [
          { itemId: { in: validItemIds } },
          { user: { email: { in: validEmails } } }
        ]
      },
      include: { user: true, brickslab: true, libraryBook: true, item: { include: { category: true } } }
    });

    const items = await prisma.bricks_items.findMany({
      where: { id: { in: reservations.map(r => r.itemId).filter(Boolean) } },
      include: { category: true }
    });

    res.json(reservations.map(r => {
      const item = items.find(i => i.id === r.itemId);
      return {
        id: r.id,
        userId: r.userId,
        itemId: r.itemId || r.brickslabId || r.libraryBookId,
        userName: `${r.user.name} ${r.user.surname || ''}`.trim(),
        userEmail: r.user.email,
        itemTitle: item?.title || r.brickslab?.title || r.libraryBook?.title || 'Artículo',
        itemType: item?.category?.name || (r.brickslab ? 'Aim Brickslab' : 'Libro'),
        reservationDate: r.reservationDate,
        status: r.status === 'Active' ? 'Reserved' : r.status
      };
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/admin/deliver', async (req, res) => {
  try {
    const { reservationId } = req.body;
    const reservation = await prisma.bricks_reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) return res.status(404).json({ error: 'No encontrado' });

    await prisma.bricks_reservation.update({
      where: { id: reservationId },
      data: { status: 'Delivered' }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/admin/return', async (req, res) => {
  try {
    const { reservationId } = req.body;
    const reservation = await prisma.bricks_reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) return res.status(404).json({ error: 'No encontrado' });

    await prisma.bricks_reservation.update({
      where: { id: reservationId },
      data: { status: 'Returned', returnDate: new Date() }
    });

    // Add to history
    await prisma.bricks_userhistory.create({
      data: {
        userId: reservation.userId,
        itemId: reservation.itemId,
        categoryId: reservation.categoryId,
        brickslabId: reservation.brickslabId,
        libraryBookId: reservation.libraryBookId,
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Catalog Endpoint (Public/Multi-tenant)
app.get('/api/catalog', async (req, res) => {
  try {
    const { clubId } = req.query;
    let club;
    if (clubId) {
      club = await prisma.bricks_clubs.findUnique({ where: { id: clubId } });
    } else {
      // Logic for subdomain can be added here
      club = await prisma.bricks_clubs.findFirst();
    }
    if (!club) return res.json([]);

    const [items, activeReservations, lockedIds] = await Promise.all([
      prisma.bricks_items.findMany({
        where: { clubId: club.id },
        include: { category: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.bricks_reservation.findMany({
        where: { status: { in: ['Active', 'Reserved', 'Delivered'] } }
      }),
      getLockedCategoryIds(club.id),
    ]);

    // Map to include legacy-compatible fields and metadata
    const formatted = items.map(i => {
      const metadata = i.metadata || {};
      const reservedCount = activeReservations.filter(r => r.itemId === i.id).length;
      const categoryLocked = lockedIds.has(i.categoryId);
      const isActuallyAvailable = !categoryLocked && i.isAvailable && reservedCount < (i.stock || 1);

      return {
        id: i.id,
        clubId: i.clubId,
        categoryId: i.categoryId,
        title: i.title,
        description: i.description,
        imageUrl: i.imageUrl,
        stock: i.stock,
        isProOnly: i.isProOnly,
        isAvailable: isActuallyAvailable,
        categoryLocked,
        type: i.category.name,
        categoryConfig: i.category.config || {},
        metadata: metadata,
        // Legacy support fields
        legoReference: metadata.legoReference || null,
        author: metadata.author || null,
        isbn: metadata.isbn || null,
        status: categoryLocked ? 'Bloqueado' : isActuallyAvailable ? 'Disponible' : 'Reservado'
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cargar el catálogo' });
  }
});

// Infrastructure - Clubs Management
app.get('/api/admin/clubs/all', async (req, res) => {
  try {
    const clubs = await prisma.bricks_clubs.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(clubs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/admin/clubs', async (req, res) => {
  try {
    const { id } = req.query;
    if (id) {
      const club = await prisma.bricks_clubs.findUnique({ where: { id } });
      return res.json(club);
    }
    const clubs = await prisma.bricks_clubs.findMany();
    res.json(clubs);
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/admin/clubs', async (req, res) => {
  try {
    const { name } = req.body;
    const club = await prisma.bricks_clubs.create({
      data: { name }
    });
    res.json(club);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

const PLAN_FEATURES = {
  starter:  { csvImport: false, maxItems: 50,       maxCategories: 1,  label: 'Starter',  color: '#908E86' },
  academy:  { csvImport: true,  maxItems: Infinity,  maxCategories: 4,  label: 'Academy',  color: '#5233A8' },
  network:  { csvImport: true,  maxItems: Infinity,  maxCategories: 10, label: 'Network',  color: '#21B668' },
};

// A paid plan is active if planExpiresAt is in the future (includes 7-day grace).
// Starter is always considered active (free, no expiry).
function getEffectivePlan(club) {
  if (club.plan === 'starter') return { effectivePlan: 'starter', active: true };
  if (!club.planExpiresAt) return { effectivePlan: 'starter', active: false };
  const active = new Date(club.planExpiresAt) > new Date();
  return { effectivePlan: active ? club.plan : 'starter', active };
}

// Returns the Set of category IDs that exceed the club's plan limit.
// Categories are ordered by createdAt ASC — oldest are always kept active.
async function getLockedCategoryIds(clubId) {
  const club = await prisma.bricks_clubs.findUnique({
    where: { id: clubId },
    select: { plan: true, planExpiresAt: true },
  });
  if (!club) return new Set();
  const { effectivePlan } = getEffectivePlan(club);
  const features = PLAN_FEATURES[effectivePlan] || PLAN_FEATURES.starter;
  const allCats = await prisma.bricks_categories.findMany({
    where: { clubId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (allCats.length <= features.maxCategories) return new Set();
  return new Set(allCats.slice(features.maxCategories).map(c => c.id));
}

app.get('/api/admin/club/plan', async (req, res) => {
  try {
    const { clubId } = req.query;
    if (!clubId) return res.status(400).json({ error: 'clubId requerido' });
    const club = await prisma.bricks_clubs.findUnique({
      where: { id: clubId },
      select: { plan: true, planPaidAt: true, planExpiresAt: true },
    });
    if (!club) return res.status(404).json({ error: 'Club no encontrado' });
    const { effectivePlan, active } = getEffectivePlan(club);
    const features = PLAN_FEATURES[effectivePlan] || PLAN_FEATURES.starter;
    res.json({ plan: club.plan, effectivePlan, active, planPaidAt: club.planPaidAt, planExpiresAt: club.planExpiresAt, features });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.put('/api/admin/clubs/:id/plan', async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;
    if (!PLAN_FEATURES[plan]) return res.status(400).json({ error: 'Plan inválido' });
    const club = await prisma.bricks_clubs.update({ where: { id }, data: { plan } });
    res.json(club);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Record a payment: sets planPaidAt to now (or provided date), planExpiresAt = paidAt + 30 days + 7 days grace
app.post('/api/admin/clubs/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { paidAt } = req.body;
    const paymentDate = paidAt ? new Date(paidAt) : new Date();
    const expiresAt = new Date(paymentDate);
    expiresAt.setDate(expiresAt.getDate() + 37); // 30-day cycle + 7-day grace
    const club = await prisma.bricks_clubs.update({
      where: { id },
      data: { planPaidAt: paymentDate, planExpiresAt: expiresAt },
    });
    res.json(club);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/admin/items/import-csv', async (req, res) => {
  try {
    const { clubId, categoryId, rows } = req.body;
    if (!clubId || !categoryId || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'clubId, categoryId y rows son requeridos' });
    }

    const club = await prisma.bricks_clubs.findUnique({
      where: { id: clubId },
      select: { plan: true, planExpiresAt: true },
    });
    if (!club) return res.status(404).json({ error: 'Club no encontrado' });
    const { effectivePlan, active } = getEffectivePlan(club);
    const features = PLAN_FEATURES[effectivePlan] || PLAN_FEATURES.starter;
    if (!features.csvImport) {
      const reason = !active && club.plan !== 'starter'
        ? 'Tu suscripción ha expirado. Renueva tu plan para seguir importando elementos.'
        : 'La importación CSV está disponible a partir del plan Academy.';
      return res.status(403).json({ error: reason });
    }

    const created = [];
    for (const row of rows) {
      const title = String(row.title || '').trim();
      if (!title) continue;
      const item = await prisma.bricks_items.create({
        data: {
          clubId,
          categoryId,
          title,
          description: String(row.description || '').trim() || null,
          imageUrl: String(row.imageUrl || '').trim() || 'https://images.unsplash.com/photo-1587654780291-39c9404d746b',
          stock: parseInt(row.stock || '1', 10) || 1,
          isProOnly: row.isProOnly === 'true' || row.isProOnly === true,
          metadata: {},
        },
      });
      created.push(item.id);
    }
    res.json({ success: true, created: created.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al importar CSV' });
  }
});

app.get('/api/admin/clubs/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const [memberships, categories, items] = await Promise.all([
      prisma.bricks_club_memberships.findMany({ where: { clubId: id } }),
      prisma.bricks_categories.findMany({
        where: { clubId: id },
        include: { _count: { select: { items: true } } }
      }),
      prisma.bricks_items.findMany({ where: { clubId: id } })
    ]);

    const stats = {
      owners: memberships.filter(m => m.role === 'owner').map(m => m.email),
      totalMembers: memberships.length,
      categories: categories.map(c => ({
        name: c.name,
        itemCount: c._count.items
      })),
      totalItems: items.length,
      totalStock: items.reduce((acc, item) => acc + (item.stock || 0), 0)
    };

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener estadísticas del club' });
  }
});

// Categories Management
app.get('/api/admin/categories', async (req, res) => {
  try {
    const { clubId } = req.query;
    let club;
    if (clubId) {
      club = await prisma.bricks_clubs.findUnique({ where: { id: clubId } });
    } else {
      club = await prisma.bricks_clubs.findFirst();
    }
    if (!club) return res.json([]);

    const lockedIds = await getLockedCategoryIds(club.id);
    const categories = await prisma.bricks_categories.findMany({
      where: { clubId: club.id },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(categories.map(c => ({ ...c, locked: lockedIds.has(c.id) })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/admin/categories', async (req, res) => {
  try {
    const { clubId, name, icon, isHomeAllowed, description, config } = req.body;

    const club = await prisma.bricks_clubs.findUnique({
      where: { id: clubId },
      select: { plan: true, planExpiresAt: true },
    });
    if (club) {
      const { effectivePlan } = getEffectivePlan(club);
      const features = PLAN_FEATURES[effectivePlan] || PLAN_FEATURES.starter;
      const currentCount = await prisma.bricks_categories.count({ where: { clubId } });
      if (currentCount >= features.maxCategories) {
        return res.status(403).json({
          error: `Tu plan ${features.label} permite un máximo de ${features.maxCategories} categoría${features.maxCategories === 1 ? '' : 's'}. Actualiza tu plan para añadir más.`,
          limitReached: true,
          maxCategories: features.maxCategories,
        });
      }
    }

    await prisma.bricks_categories.create({
      data: { clubId, name, icon, isHomeAllowed: !!isHomeAllowed, description, config }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.put('/api/admin/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, isHomeAllowed, description, config } = req.body;
    const cat = await prisma.bricks_categories.findUnique({ where: { id }, select: { clubId: true } });
    if (cat) {
      const lockedIds = await getLockedCategoryIds(cat.clubId);
      if (lockedIds.has(id)) return res.status(403).json({ error: 'Esta categoría está bloqueada por el plan actual.', locked: true });
    }
    await prisma.bricks_categories.update({
      where: { id },
      data: { name, icon, isHomeAllowed: !!isHomeAllowed, description, config }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/admin/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.bricks_categories.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor al eliminar categoría' });
  }
});

// Generic Items Management
app.post('/api/admin/items', async (req, res) => {
  try {
    const { clubId, categoryId, title, description, imageUrl, stock, isProOnly, metadata } = req.body;
    const lockedIds = await getLockedCategoryIds(clubId);
    if (lockedIds.has(categoryId)) {
      return res.status(403).json({ error: 'Esta categoría está bloqueada por el plan actual.', locked: true });
    }
    const parsedStock = parseInt(stock || '1', 10);

    await prisma.bricks_items.create({
      data: {
        clubId,
        categoryId,
        title,
        description,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1587654780291-39c9404d746b',
        stock: parsedStock,
        isProOnly: !!isProOnly,
        metadata: metadata || {}
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/admin/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.bricks_items.findUnique({ where: { id }, select: { clubId: true, categoryId: true } });
    if (item) {
      const lockedIds = await getLockedCategoryIds(item.clubId);
      if (lockedIds.has(item.categoryId)) {
        return res.status(403).json({ error: 'Esta categoría está bloqueada por el plan actual.', locked: true });
      }
    }
    await prisma.bricks_items.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor al eliminar' });
  }
});

app.put('/api/admin/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, stock, imageUrl, isProOnly, metadata } = req.body;
    const item = await prisma.bricks_items.findUnique({ where: { id }, select: { clubId: true, categoryId: true } });
    if (item) {
      const lockedIds = await getLockedCategoryIds(item.clubId);
      if (lockedIds.has(item.categoryId)) {
        return res.status(403).json({ error: 'Esta categoría está bloqueada por el plan actual.', locked: true });
      }
    }
    const parsedStock = parseInt(stock || '1', 10);
    await prisma.bricks_items.update({
      where: { id },
      data: { title, description, stock: parsedStock, imageUrl, isProOnly: !!isProOnly, metadata }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el elemento' });
  }
});


app.post('/api/reservations', async (req, res) => {
  try {
    const { userId, itemId, categoryId } = req.body;

    const item = await prisma.bricks_items.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Artículo no encontrado' });

    const finalCategoryId = categoryId || item.categoryId;

    // Plan lock check
    const lockedIds = await getLockedCategoryIds(item.clubId);
    if (lockedIds.has(finalCategoryId)) {
      return res.status(403).json({ error: 'Esta categoría no está disponible en el plan actual del club.' });
    }

    // Permissions check
    const permission = await prisma.bricks_user_permissions.findUnique({
      where: { userId_categoryId: { userId, categoryId: finalCategoryId } }
    });

    if (!permission || !permission.isStandard) {
      return res.status(403).json({ error: "No tienes el rango necesario para reservar en esta categoría." });
    }

    if (item.isProOnly && !permission.isPro) {
      return res.status(403).json({ error: "Este artículo es exclusivo para miembros Pro." });
    }

    // Limit check: 1 active reservation per category
    const activeReservation = await prisma.bricks_reservation.findFirst({
      where: {
        userId,
        status: { in: ['Reserved', 'Delivered', 'Active'] },
        categoryId: finalCategoryId
      },
      include: { brickslab: true, libraryBook: true, item: true }
    });

    if (activeReservation) {
      const title = activeReservation.item?.title || activeReservation.brickslab?.title || activeReservation.libraryBook?.title || 'otro artículo';
      return res.status(400).json({ error: `Ya tienes una reserva activa en esta categoría (${title}). Debes devolverlo para poder reservar otro.` });
    }

    // Stock check
    const activeCurrent = await prisma.bricks_reservation.count({
      where: {
        status: { in: ['Reserved', 'Delivered'] },
        itemId
      }
    });

    if (activeCurrent >= (item.stock || 1)) {
      return res.status(400).json({ error: 'No quedan unidades disponibles de este artículo.' });
    }

    await prisma.bricks_reservation.create({
      data: {
        userId,
        itemId,
        categoryId: finalCategoryId,
        status: 'Reserved'
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al reservar' });
  }
});

app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find the reservation
    const reservation = await prisma.bricks_reservation.findUnique({ where: { id } });
    if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada.' });
    if (reservation.status === 'Delivered' || reservation.status === 'Returned') {
      return res.status(400).json({ error: 'No se puede cancelar en este estado.' });
    }

    // Delete the reservation - this naturally updates availability since we COUNT active/reserved
    await prisma.bricks_reservation.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error cancelando reserva.' });
  }
});

// Missing pieces endpoints
app.post('/api/pieces/report', async (req, res) => {
  try {
    const { userId, itemId, description } = req.body;
    if (!userId || !itemId || !description) return res.status(400).json({ error: 'Faltan datos' });

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);
    
    await prisma.bricks_missing_pieces.create({
      data: {
        userId,
        itemId: isUuid ? itemId : null,
        brickslabId: !isUuid ? itemId : null,
        description,
        status: 'Pending'
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error reportando piezas perdidas.' });
  }
});

app.get('/api/admin/pieces', async (req, res) => {
  try {
    const { clubId } = req.query;
    let club;
    if (clubId) {
      club = await prisma.bricks_clubs.findUnique({ where: { id: clubId } });
    } else {
      club = await prisma.bricks_clubs.findFirst();
    }

    const reports = await prisma.bricks_missing_pieces.findMany({
      where: {
        OR: [
          { item: { clubId: club.id } },
          { brickslab: { club_id: club.id } }
        ]
      },
      include: {
        user: true,
        item: true,
        brickslab: true
      },
      orderBy: { reportedAt: 'desc' }
    });

    res.json(reports.map(r => ({
      id: r.id,
      userName: `${r.user.name} ${r.user.surname || ''}`.trim(),
      userEmail: r.user.email,
      itemName: r.item?.title || r.brickslab?.title || 'Artículo',
      description: r.description,
      reportedAt: r.reportedAt,
      status: r.status
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error cargando reportes.' });
  }
});

app.post('/api/admin/pieces/resolve', async (req, res) => {
  try {
    const { reportId } = req.body;
    await prisma.bricks_missing_pieces.update({
      where: { id: reportId },
      data: { status: 'Replaced' }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error resolviendo reporte.' });
  }
});

// Polls Endpoints
app.get('/api/polls', async (req, res) => {
  try {
    const { clubId } = req.query;

    const activePoll = await prisma.bricks_poll.findFirst({
      where: {
        isActive: true,
        ...(clubId ? { clubId } : {}),
        OR: [
          { expiresAt: { gt: new Date() } },
          { expiresAt: null }
        ]
      },
      include: {
        options: {
          include: { _count: { select: { votes: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    if (!activePoll) return res.json(null);

    // Map options to include vote count
    res.json({
      id: activePoll.id,
      title: activePoll.title,
      description: activePoll.description,
      expiresAt: activePoll.expiresAt,
      options: activePoll.options.map(opt => ({
        id: opt.id,
        title: opt.title,
        imageUrl: opt.imageUrl,
        votes: opt._count.votes
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching polls' });
  }
});

app.post('/api/polls/vote', async (req, res) => {
  try {
    const { userId, optionId } = req.body;

    // Ensure user has brickslab rank (standard or pro)
    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      include: { bricks_ranks: true, bricks_user_permissions: { include: { category: true } } }
    });

    const hasLegacyPerm = user?.bricks_ranks && (user.bricks_ranks.canReserveBrickslab || user.bricks_ranks.brickslabPro);
    const hasDynamicPerm = user?.bricks_user_permissions?.some(p =>
      p.category.name === 'Aim Brickslab' && (p.isStandard || p.isPro)
    );

    if (!user || (!hasLegacyPerm && !hasDynamicPerm)) {
      return res.status(403).json({ error: 'Necesitas el rango Aim Brickslab para votar.' });
    }

    // Check if user already voted in this poll
    const option = await prisma.bricks_poll_option.findUnique({ where: { id: optionId } });
    if (!option) return res.status(404).json({ error: 'Opción no encontrada' });

    const existingVote = await prisma.bricks_poll_vote.findFirst({
      where: {
        userId,
        option: { pollId: option.pollId }
      }
    });

    if (existingVote) {
      return res.status(400).json({ error: 'Ya has votado en esta encuesta.' });
    }

    await prisma.bricks_poll_vote.create({
      data: { userId, optionId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error voting' });
  }
});

app.post('/api/admin/polls', async (req, res) => {
  try {
    const { clubId, title, description, options, expiresAt } = req.body;

    // Deactivate previous polls in this club
    await prisma.bricks_poll.updateMany({
      where: { isActive: true, ...(clubId ? { clubId } : {}) },
      data: { isActive: false }
    });

    let finalExpiration = expiresAt ? new Date(expiresAt) : null;

    if (!finalExpiration) {
      // Logic: 1st of next month from now at 10 AM Madrid time
      const now = new Date();
      finalExpiration = new Date(now.getFullYear(), now.getMonth() + 1, 1, 10, 0, 0);
    }

    // Create new
    await prisma.bricks_poll.create({
      data: {
        clubId,
        title,
        description,
        expiresAt: finalExpiration,
        options: {
          create: options
        }
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating poll' });
  }
});

app.put('/api/admin/polls/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, expiresAt, options } = req.body;

    let finalExpiration = expiresAt ? new Date(expiresAt) : null;

    await prisma.bricks_poll.update({
      where: { id },
      data: {
        title,
        description,
        ...(finalExpiration ? { expiresAt: finalExpiration } : {})
      }
    });

    for (const opt of options) {
      if (opt.id) {
        await prisma.bricks_pollOption.update({
          where: { id: opt.id },
          data: { title: opt.title, imageUrl: opt.imageUrl }
        });
      } else {
        await prisma.bricks_pollOption.create({
          data: {
            title: opt.title,
            imageUrl: opt.imageUrl,
            pollId: id,
            votes: 0
          }
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar votación' });
  }
});

app.patch('/api/admin/polls/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    await prisma.bricks_poll.update({
      where: { id },
      data: { isActive }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar estado de la votación' });
  }
});

app.get('/api/admin/polls/active', async (req, res) => {
  try {
    const { clubId } = req.query;

    const polls = await prisma.bricks_poll.findMany({
      where: clubId ? { clubId } : {},
      include: {
        options: {
          include: {
            votes: {
              include: { user: { select: { name: true, surname: true, email: true } } }
            },
            _count: { select: { votes: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(polls.map(poll => ({
      id: poll.id,
      title: poll.title,
      description: poll.description,
      isActive: poll.isActive,
      expiresAt: poll.expiresAt,
      options: poll.options.map(opt => ({
        id: opt.id,
        title: opt.title,
        imageUrl: opt.imageUrl,
        votes: opt._count.votes,
        voters: opt.votes.map(v => ({
          name: v.user.name,
          surname: v.user.surname,
          email: v.user.email
        }))
      }))
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error loading admin polls' });
  }
});

// Support Ticket
app.post('/api/support', async (req, res) => {
  try {
    const { userId, subject, description } = req.body;

    const userUuid = (userId && userId !== 'null' && userId !== '') ? userId : null;

    // Confirmed: the database column app_label is an ARRAY, not a string.
    if (userUuid) {
      await prisma.$executeRaw`
        INSERT INTO "tickets_registrosoporte" ("user_id", "subject", "description", "app_label", "status", "priority", "created_at") 
        VALUES (${userUuid}::uuid, ${String(subject)}, ${String(description)}, ARRAY['Aim Brickslab'], 'open', 'low', NOW())
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "tickets_registrosoporte" ("subject", "description", "app_label", "status", "priority", "created_at") 
        VALUES (${String(subject)}, ${String(description)}, ARRAY['Aim Brickslab'], 'open', 'low', NOW())
      `;
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al enviar el ticket de soporte' });
  }
});

// Admin Support Endpoints
app.get('/api/support', async (req, res) => {
  try {
    const tickets = await prisma.tickets_registrosoporte.findMany({
      include: {
        users_tickets_registrosoporte_user_idTousers: {
          select: { name: true, surname: true, email: true, profile_picture: true }
        },
        users_tickets_registrosoporte_assigned_toTousers: {
          select: { name: true, username: true, profile_picture: true }
        }
      },
      orderBy: { id: 'desc' }
    });

    // Map to a cleaner format
    const formatted = tickets.map(t => ({
      id: t.id,
      subject: t.subject,
      description: t.description,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      app_label: t.app_label,
      dev_response: t.dev_response,
      created_at: t.created_at,
      name: t.users_tickets_registrosoporte_user_idTousers?.name || 'Sistema',
      surname: t.users_tickets_registrosoporte_user_idTousers?.surname || '',
      email: t.users_tickets_registrosoporte_user_idTousers?.email || '',
      assignee_username: t.users_tickets_registrosoporte_assigned_toTousers?.username || t.users_tickets_registrosoporte_assigned_toTousers?.name || null,
      assignee_picture: t.users_tickets_registrosoporte_assigned_toTousers?.profile_picture || null,
      assigned_to: t.assigned_to
    }));

    res.json({ success: true, tickets: formatted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching support tickets' });
  }
});

app.get('/api/admin/superadmins', async (req, res) => {
  try {
    const admins = await prisma.users.findMany({
      where: { dev_role: 'superadmin' },
      select: { user_id: true, name: true, username: true }
    });
    res.json({ success: true, superadmins: admins.map(a => ({ id: a.user_id, name: a.name, username: a.username })) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching superadmins' });
  }
});

app.put('/api/support/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, devResponse, dueDate, assignedTo, appLabel } = req.body;

    // Prisma might have issues with app_label if it's a Postgres array but String in prisma
    // For now we use standard update for other fields, and if appLabel is provided we might need raw SQL
    // But since the user wants a clone of KheTool and I saw appLabel can be an array in some places...

    const updateData = {
      status,
      priority,
      dev_response: devResponse,
      due_date: dueDate ? new Date(dueDate) : null,
      assigned_to: assignedTo || null
    };

    // If appLabel is an array, we use raw SQL to update it correctly because of the known issue
    if (appLabel) {
      const labels = Array.isArray(appLabel) ? appLabel : [appLabel];
      await prisma.$executeRaw`
        UPDATE "tickets_registrosoporte" 
        SET "status" = ${status}, 
            "priority" = ${priority}, 
            "dev_response" = ${devResponse}, 
            "due_date" = ${updateData.due_date}, 
            "assigned_to" = ${updateData.assigned_to}::uuid,
            "app_label" = ${labels}::varchar[] 
        WHERE "id" = ${parseInt(id)}
      `;
      // Note: In the previous fix, app_label was an ARRAY in SQL. 
      // If the schema.prisma says String but DB says Array, we must be careful.
      // The user's earlier fix used: ARRAY['Aim Brickslab']
      // So let's use the same logic if possible.
    } else {
      await prisma.tickets_registrosoporte.update({
        where: { id: parseInt(id) },
        data: updateData
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating ticket' });
  }
});

// Ranking Endpoint
app.get('/api/ranking', async (req, res) => {
  try {
    const { clubId } = req.query;

    let validEmails = null;
    if (clubId) {
      const memberships = await prisma.bricks_club_memberships.findMany({
        where: { clubId },
        select: { email: true }
      });
      validEmails = memberships.map(m => m.email.toLowerCase());
    }

    const history = await prisma.bricks_userhistory.findMany({
      where: {
        brickslabId: { not: null },
        ...(validEmails ? { user: { email: { in: validEmails } } } : {})
      },
      include: { user: true }
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const stats = {};
    history.forEach(h => {
      if (!h.user) return; // ignore deleted users
      const uId = h.userId;
      if (!stats[uId]) {
        stats[uId] = {
          id: uId,
          name: `${h.user.name} ${h.user.surname || ''}`.trim(),
          avatar: h.user.profile_picture || null,
          monthly: 0,
          yearly: 0,
          allTime: 0
        };
      }

      const d = new Date(h.completedAt);
      stats[uId].allTime++;
      if (d.getFullYear() === currentYear) {
        stats[uId].yearly++;
        if (d.getMonth() === currentMonth) {
          stats[uId].monthly++;
        }
      }
    });

    const ranking = Object.values(stats);
    res.json(ranking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error loading ranking' });
  }
});

// Membership Management Endpoints
app.get('/api/admin/memberships', async (req, res) => {
  try {
    const { clubId } = req.query;
    if (!clubId) return res.status(400).json({ error: 'Falta clubId' });

    // Query both memberships and registered users in parallel
    const [memberships, registeredUsers] = await Promise.all([
      prisma.bricks_club_memberships.findMany({
        where: { clubId: clubId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.users.findMany({
        where: { club_id: clubId },
        select: { email: true }
      })
    ]);

    const registeredEmails = new Set(registeredUsers.map(u => u.email.toLowerCase()));

    const result = memberships.map(m => ({
      id: m.id,
      email: m.email,
      role: m.role,
      createdAt: m.createdAt,
      isRegistered: registeredEmails.has(m.email.toLowerCase())
    }));

    res.json(result);
  } catch (error) {
    console.error('[Memberships] Error:', error);
    res.status(500).json({ error: 'Error cargando membresías' });
  }
});

app.post('/api/admin/memberships', async (req, res) => {
  try {
    const { clubId, email, role, requesterEmail } = req.body;
    if (!clubId || !email) return res.status(400).json({ error: 'Faltan datos' });

    const assignedRole = role || 'member';

    // Validate role permissions: only owner/superadmin can assign profesor or owner
    if (assignedRole === 'profesor' || assignedRole === 'owner') {
      const requester = requesterEmail
        ? await prisma.bricks_club_memberships.findUnique({
            where: { email_clubId: { email: requesterEmail.toLowerCase(), clubId } },
            select: { role: true }
          })
        : null;
      const requesterDevRole = requesterEmail
        ? (await prisma.users.findUnique({ where: { email: requesterEmail.toLowerCase() }, select: { dev_role: true } }))?.dev_role
        : null;

      const canAssignElevated = requesterDevRole === 'superadmin' || requester?.role === 'owner';
      if (!canAssignElevated) {
        return res.status(403).json({ error: 'No tienes permiso para asignar ese rol.' });
      }
    }

    await prisma.bricks_club_memberships.upsert({
      where: { email_clubId: { email: email.toLowerCase(), clubId } },
      update: { role: assignedRole },
      create: { email: email.toLowerCase(), clubId, role: assignedRole }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error guardando membresía' });
  }
});

app.delete('/api/admin/memberships/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { requesterEmail } = req.query;

    const target = await prisma.bricks_club_memberships.findUnique({ where: { id }, select: { role: true, clubId: true } });
    if (!target) return res.status(404).json({ error: 'Membresía no encontrada' });

    if (requesterEmail) {
      const requesterDevRole = (await prisma.users.findUnique({
        where: { email: requesterEmail.toLowerCase() }, select: { dev_role: true }
      }))?.dev_role;

      if (requesterDevRole !== 'superadmin') {
        // Owners cannot remove other owners — only superadmin can
        if (target.role === 'owner') {
          return res.status(403).json({ error: 'Solo el panel maestro puede eliminar a un dueño del club.' });
        }

        const requesterMembership = await prisma.bricks_club_memberships.findUnique({
          where: { email_clubId: { email: requesterEmail.toLowerCase(), clubId: target.clubId } },
          select: { role: true }
        });

        // Profesor can only remove members
        if (requesterMembership?.role === 'profesor' && target.role !== 'member') {
          return res.status(403).json({ error: 'Un profesor solo puede eliminar miembros.' });
        }
      }
    }

    await prisma.bricks_club_memberships.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error eliminando membresía' });
  }
});

app.get('/api/admin/clubs', async (req, res) => {
  try {
    const clubs = await prisma.bricks_clubs.findMany({ select: { id: true, name: true } });
    res.json(clubs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error cargando clubes' });
  }
});

// Landing page (served at root, before the React SPA)
app.use('/landing', express.static(join(__dirname, 'landing')));
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'landing', 'index.html'));
});

// React SPA — all other routes (e.g. /app, /app/*)
app.use(express.static(join(__dirname, 'dist')));

app.get('/*path', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
