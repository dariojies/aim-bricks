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

    // 2. Add columns to existing tables for migration tracking
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_reservation" ADD COLUMN IF NOT EXISTS "itemId" UUID;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_reservation" ADD COLUMN IF NOT EXISTS "categoryId" UUID;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_userhistory" ADD COLUMN IF NOT EXISTS "itemId" UUID;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_userhistory" ADD COLUMN IF NOT EXISTS "categoryId" UUID;`);

    // Update tul_clubs for multi-tenancy
    await prisma.$executeRawUnsafe(`ALTER TABLE "tul_clubs" ADD COLUMN IF NOT EXISTS "subdomain" VARCHAR(255)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "tul_clubs" ADD COLUMN IF NOT EXISTS "description" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "bricks_categories" ADD COLUMN IF NOT EXISTS "clubId" UUID`);
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

    let demoClub = await prisma.bricks_clubs.findFirst({ where: { name: 'Club Demo' } });
    if (!demoClub) {
      await prisma.bricks_clubs.create({
        data: {
          id: '00000000-0000-0000-0000-000000000000',
          name: 'Club Demo'
        }
      });
    }

    // 2. Check if we have legacy data that hasn't been migrated yet
    const legacyBrickslabsCount = await prisma.bricks_brickslab.count();
    const legacyBooksCount = await prisma.bricks_librarybook.count();
    
    if (legacyBrickslabsCount === 0 && legacyBooksCount === 0) return; 

    const itemCount = await prisma.bricks_items.count();
    
    // Always try to migrate missing pieces if they haven't been linked to UUIDs yet
    const legacyReports = await prisma.bricks_missing_pieces.findMany({
      where: { itemId: { not: { in: (await prisma.bricks_items.findMany({ select: { id: true } })).map(i => i.id) } } }
    });
    
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
          role: u.dev_role || 'member'
        })),
        skipDuplicates: true
      });
      console.log('Bulk sync completed.');
    } else {
      console.log('Membership list already up to date.');
    }
    }

    if (itemCount > 0) {
      if (legacyReports.length > 0) {
        console.log('Items already synced, migrating orphan reports...');
        const items = await prisma.bricks_items.findMany();
        const brickslabs = await prisma.bricks_brickslab.findMany();
        for (const b of brickslabs) {
          const matchingItem = items.find(i => i.title === b.title);
          if (matchingItem) {
            await prisma.bricks_missing_pieces.updateMany({
              where: { itemId: b.id }, // Legacy ID
              data: { itemId: matchingItem.id }
            });
          }
        }
        console.log('Orphan reports migration completed.');
      } else {
        console.log('Schema and reports already synced, skipping migration.');
      }
      return;
    }

    // Create default categories using UPSERT to be safe
    const legoCat = await prisma.bricks_categories.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' }, // Fixed ID for main Lego cat
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        clubId: club.id,
        name: 'Aim Brickslab',
        icon: 'Box',
        isHomeAllowed: true,
        description: 'Colección de sets LEGO para montar'
      }
    });

    const libraryCat = await prisma.bricks_categories.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' }, // Fixed ID for main Library cat
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        clubId: club.id,
        name: 'Biblioteca',
        icon: 'Book',
        isHomeAllowed: false,
        description: 'Libros y manuales'
      }
    });

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

    // Auto-link to club if not assigned
    if (!user.club_id) {
      const membership = await prisma.bricks_club_memberships.findFirst({
        where: { email: user.email.toLowerCase() }
      });
      if (membership) {
        await prisma.users.update({
          where: { user_id: user.user_id },
          data: { club_id: membership.clubId, dev_role: membership.role }
        });
        // Re-fetch user with new club info
        user.club_id = membership.clubId;
        user.dev_role = membership.role;
      }
    }

    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

    const categories = await prisma.bricks_categories.findMany({
      where: { clubId: user.club_id }
    });

    const dynamicPermissions = await prisma.bricks_user_permissions.findMany({
      where: { userId: user.user_id }
    });

    const profile = {
      id: user.user_id,
      clubId: user.club_id,
      name: `${user.name} ${user.surname || ''}`.trim(),
      email: user.email,
      role: user.dev_role || 'student',
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        isHomeAllowed: c.isHomeAllowed
      })),
      currentReservations: user.reservations.filter(r => ['Active', 'Reserved', 'Delivered'].includes(r.status)).map(r => ({
        id: r.id,
        status: r.status === 'Active' ? 'Reserved' : r.status,
        text: `${r.status}: ${r.brickslab?.title || r.libraryBook?.title || 'Artículo'}`,
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

    const categories = await prisma.bricks_categories.findMany({
      where: { clubId: user.club_id }
    });

    const dynamicPermissions = await prisma.bricks_user_permissions.findMany({
      where: { userId: user.user_id }
    });

    const profile = {
      id: user.user_id,
      clubId: user.club_id,
      name: `${user.name} ${user.surname || ''}`.trim(),
      email: user.email,
      role: user.dev_role || 'student',
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        isHomeAllowed: c.isHomeAllowed
      })),
      currentReservations: user.reservations.filter(r => ['Active', 'Reserved', 'Delivered'].includes(r.status)).map(r => ({
        id: r.id,
        status: r.status === 'Active' ? 'Reserved' : r.status,
        text: `${r.status}: ${r.brickslab?.title || r.libraryBook?.title || r.item?.title || 'Artículo'}`,
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

    const [usersList, categories] = await Promise.all([
      prisma.users.findMany({
        where: { club_id: club.club_id },
        include: { bricks_user_permissions: true, bricks_ranks: true },
        orderBy: { name: 'asc' }
      }),
      prisma.bricks_categories.findMany({ where: { clubId: club.club_id } })
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

    const reservations = await prisma.bricks_reservation.findMany({
      where: { 
        status: { in: ['Active', 'Reserved', 'Delivered'] },
        user: { club_id: club.club_id }
      },
      include: { user: true, brickslab: true, libraryBook: true }
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
      club = await prisma.tul_clubs.findUnique({ where: { club_id: clubId } });
    } else {
      // Logic for subdomain can be added here
      club = await prisma.tul_clubs.findFirst();
    }
    if (!club) return res.json([]);

    const items = await prisma.bricks_items.findMany({
      where: { clubId: club.id },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });

    // Map to include legacy-compatible fields and metadata
    const formatted = items.map(i => {
      const metadata = i.metadata || {};
      return {
        id: i.id,
        clubId: i.clubId,
        categoryId: i.categoryId,
        title: i.title,
        description: i.description,
        imageUrl: i.imageUrl,
        stock: i.stock,
        isProOnly: i.isProOnly,
        isAvailable: i.isAvailable,
        type: i.category.name, // Filter expects "Aim Brickslab" or "Biblioteca" (mapped to "Libro" in UI)
        legoReference: metadata.legoReference || null,
        author: metadata.author || null,
        isbn: metadata.isbn || null,
        status: i.isAvailable ? 'Disponible' : 'Reservado'
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cargar el catálogo' });
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

    const categories = await prisma.bricks_categories.findMany({
      where: { clubId: club.id },
      include: { _count: { select: { items: true } } }
    });
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/admin/categories', async (req, res) => {
  try {
    const { clubId, name, icon, isHomeAllowed, description } = req.body;
    await prisma.bricks_categories.create({
      data: { clubId, name, icon, isHomeAllowed: !!isHomeAllowed, description }
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
    const { name, icon, isHomeAllowed, description } = req.body;
    await prisma.bricks_categories.update({
      where: { id },
      data: { name, icon, isHomeAllowed: !!isHomeAllowed, description }
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
    // We clean up reservations/history via Cascade if configured in DB, 
    // but Prisma relation onDelete: Cascade handles it if we use prisma.model.delete
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

app.get('/api/catalog', async (req, res) => {
  try {
    const { clubId } = req.query;
    
    // Find club or default to first
    let club;
    if (clubId) {
      club = await prisma.bricks_clubs.findUnique({ where: { id: clubId } });
    } else {
      club = await prisma.bricks_clubs.findFirst();
    }

    if (!club) return res.json([]);

    const [categories, items, activeReservations] = await Promise.all([
      prisma.bricks_categories.findMany({ where: { clubId: club.club_id } }),
      prisma.bricks_items.findMany({ where: { clubId: club.club_id } }),
      prisma.bricks_reservation.findMany({ where: { status: { in: ['Reserved', 'Delivered'] } } })
    ]);

    const activeCounts = activeReservations.reduce((acc, r) => {
      const id = r.itemId || r.brickslabId || r.libraryBookId;
      if (id) acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});

    const mappedItems = items.map(item => {
      const cat = categories.find(c => c.id === item.categoryId);
      const available = (item.stock || 1) - (activeCounts[item.id] || 0);
      return {
        ...mapItem(item, cat),
        isAvailable: available > 0,
        status: available > 0 ? 'Disponible' : 'Reservado'
      };
    });

    res.json(mappedItems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/reservations', async (req, res) => {
  try {
    const { userId, itemId, categoryId } = req.body;

    const item = await prisma.bricks_items.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Artículo no encontrado' });

    const finalCategoryId = categoryId || item.categoryId;

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

    // Limit check (usually 1 active per category, but we can make it configurable)
    const userActiveInCategory = await prisma.bricks_reservation.count({
      where: {
        userId,
        status: { in: ['Reserved', 'Delivered'] },
        categoryId: finalCategoryId
      }
    });

    if (userActiveInCategory > 0) {
      return res.status(400).json({ error: `Ya tienes un artículo de esta categoría reservado. Debes entregarlo primero.` });
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

    await prisma.bricks_missing_pieces.create({
      data: {
        userId,
        itemId,
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
      where: { user: { club_id: club.id } },
      include: {
        user: true,
        item: true
      },
      orderBy: { reportedAt: 'desc' }
    });

    res.json(reports.map(r => ({
      id: r.id,
      userName: `${r.user.name} ${r.user.surname || ''}`.trim(),
      userEmail: r.user.email,
      itemName: r.item?.title || 'Artículo',
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
    const activePoll = await prisma.bricks_poll.findFirst({
      where: { isActive: true },
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
    const { title, description, options, expiresAt } = req.body;

    // Deactivate previous
    await prisma.bricks_poll.updateMany({
      where: { isActive: true },
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
    const polls = await prisma.bricks_poll.findMany({
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
    const history = await prisma.bricks_userhistory.findMany({
      where: { brickslabId: { not: null } },
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
  } catch(error) {
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
    const { clubId, email, role } = req.body;
    if (!clubId || !email) return res.status(400).json({ error: 'Faltan datos' });
    
    await prisma.bricks_club_memberships.upsert({
      where: { email_clubId: { email: email.toLowerCase(), clubId } },
      update: { role: role || 'member' },
      create: { email: email.toLowerCase(), clubId, role: role || 'member' }
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

// Serve frontend static files
app.use(express.static(join(__dirname, 'dist')));

app.get('/*path', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
