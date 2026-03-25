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

app.use(cors());
app.use(express.json());

// Helper to map DB item to Frontend CatalogItem
const mapBrickslab = (b) => ({
  id: b.id,
  title: b.title,
  type: 'Aim Brickslab',
  description: b.description,
  status: b.isAvailable ? 'Disponible' : 'Reservado',
  imageUrl: b.imageUrl
});

const mapBook = (b) => ({
  id: b.id,
  title: b.title,
  type: 'Libro',
  description: b.description,
  status: b.isAvailable ? 'Disponible' : 'Reservado',
  imageUrl: b.imageUrl
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

    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

    const profile = {
      id: user.user_id,
      name: `${user.name} ${user.surname || ''}`.trim(),
      email: user.email,
      role: user.dev_role || 'student',
      readBooks: user.history.filter(h => h.libraryBook).map(h => mapBook(h.libraryBook)),
      builtBrickslabs: user.history.filter(h => h.brickslab).map(h => mapBrickslab(h.brickslab)),
      currentReservations: user.reservations.filter(r => r.status === 'Active').map(r => {
        if (r.brickslab) return `Aim Brickslab: ${r.brickslab.title}`;
        if (r.libraryBook) return `Libro: ${r.libraryBook.title}`;
        return 'Reserva';
      }),
      permissions: {
        brickslab: user.bricks_ranks?.[0]?.canReserveBrickslab || false,
        library: user.bricks_ranks?.[0]?.canReserveLibrary || false
      }
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
        reservations: { include: { brickslab: true, libraryBook: true } },
        history: { include: { brickslab: true, libraryBook: true } },
        bricks_ranks: true
      }
    });

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const profile = {
      id: user.user_id,
      name: `${user.name} ${user.surname || ''}`.trim(),
      email: user.email,
      role: user.dev_role || 'student',
      readBooks: user.history.filter(h => h.libraryBook).map(h => mapBook(h.libraryBook)),
      builtBrickslabs: user.history.filter(h => h.brickslab).map(h => mapBrickslab(h.brickslab)),
      currentReservations: user.reservations.filter(r => r.status === 'Active').map(r => {
        if (r.brickslab) return `Aim Brickslab: ${r.brickslab.title}`;
        if (r.libraryBook) return `Libro: ${r.libraryBook.title}`;
        return 'Reserva';
      }),
      permissions: {
        brickslab: user.bricks_ranks?.[0]?.canReserveBrickslab || false,
        library: user.bricks_ranks?.[0]?.canReserveLibrary || false
      }
    };

    res.json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Admin Endpoints
app.get('/api/admin/users/permissions', async (req, res) => {
  try {
    const usersList = await prisma.users.findMany({
      include: { bricks_ranks: true },
      orderBy: { name: 'asc' }
    });
    res.json(usersList.map(u => ({
      id: u.user_id,
      name: `${u.name} ${u.surname || ''}`.trim(),
      email: u.email,
      role: u.dev_role || 'student',
      permissions: {
        brickslab: u.bricks_ranks?.[0]?.canReserveBrickslab || false,
        library: u.bricks_ranks?.[0]?.canReserveLibrary || false
      }
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/admin/users/permissions', async (req, res) => {
  try {
    const { userId, brickslab, library } = req.body;
    
    // Upsert equivalent since we might not have a record yet
    const existing = await prisma.bricks_ranks.findUnique({ where: { userId } });
    if (existing) {
      await prisma.bricks_ranks.update({
        where: { userId },
        data: { canReserveBrickslab: brickslab, canReserveLibrary: library }
      });
    } else {
      await prisma.bricks_ranks.create({
        data: { userId, canReserveBrickslab: brickslab, canReserveLibrary: library }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});
app.get('/api/admin/reservations', async (req, res) => {
  try {
    const reservations = await prisma.bricks_reservation.findMany({
      where: { status: 'Active' },
      include: { user: true, brickslab: true, libraryBook: true }
    });
    
    res.json(reservations.map(r => ({
      id: r.id,
      userName: `${r.user.name} ${r.user.surname || ''}`.trim(),
      userEmail: r.user.email,
      itemTitle: r.brickslab ? r.brickslab.title : (r.libraryBook ? r.libraryBook.title : ''),
      itemType: r.brickslab ? 'Aim Brickslab' : 'Libro',
      reservationDate: r.reservationDate
    })));
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

app.post('/api/admin/items', async (req, res) => {
  try {
    const { type, title, description, imageUrl, difficulty, minimumRank, tagsString, stock, isLego, legoReferenceInput, isbn, author } = req.body;
    const tags = tagsString ? tagsString.split(',').map(t => t.trim()) : [];
    const parsedStock = parseInt(stock || '1', 10);
    
    if (type === 'Aim Brickslab') {
      let finalTitle = title;
      let finalLegoRef = null;
      
      if (isLego && legoReferenceInput) {
        const parts = legoReferenceInput.trim().split(' ');
        const number = parts.pop();
        const theme = parts.join(' ').trim();
        finalTitle = theme ? `LEGO® ${theme} - ${title}` : `LEGO® ${title}`;
        finalLegoRef = number;
      } else if (isLego) {
        finalTitle = `LEGO® ${title}`;
      }

      await prisma.bricks_brickslab.create({
        data: { title: finalTitle, description, imageUrl: imageUrl || 'https://images.unsplash.com/photo-1587654780291-39c9404d746b', difficulty: difficulty || 'Media', tags, stock: parsedStock, legoReference: finalLegoRef }
      });
    } else {
      await prisma.bricks_librarybook.create({
        data: { title, author: author || 'Desconocido', isbn: isbn || null, description, imageUrl: imageUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f', minimumRank: minimumRank || 'Blanco', tags, stock: parsedStock }
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/admin/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const type = req.query.type;
    
    if (type === 'Aim Brickslab') {
      // Usamos deleteMany manual para limpiar relaciones por la compatibilidad DDL
      await prisma.bricks_reservation.deleteMany({ where: { brickslabId: id } });
      await prisma.bricks_userhistory.deleteMany({ where: { brickslabId: id } });
      await prisma.bricks_brickslab.delete({ where: { id } });
    } else {
      await prisma.bricks_reservation.deleteMany({ where: { libraryBookId: id } });
      await prisma.bricks_userhistory.deleteMany({ where: { libraryBookId: id } });
      await prisma.bricks_librarybook.delete({ where: { id } });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor al eliminar' });
  }
});

app.put('/api/admin/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, title, description, stock } = req.body;
    const parsedStock = parseInt(stock || '1', 10);
    
    if (type === 'Aim Brickslab') {
      await prisma.bricks_brickslab.update({
        where: { id },
        data: { title, description, stock: parsedStock }
      });
    } else {
      await prisma.bricks_librarybook.update({
        where: { id },
        data: { title, description, stock: parsedStock }
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el elemento' });
  }
});

app.get('/api/catalog', async (req, res) => {
  try {
    const [brickslabs, libraryBooks, activeReservations] = await Promise.all([
      prisma.bricks_brickslab.findMany(),
      prisma.bricks_librarybook.findMany(),
      prisma.bricks_reservation.findMany({ where: { status: 'Active' } })
    ]);

    const activeCounts = activeReservations.reduce((acc, r) => {
      if (r.brickslabId) acc[r.brickslabId] = (acc[r.brickslabId] || 0) + 1;
      if (r.libraryBookId) acc[r.libraryBookId] = (acc[r.libraryBookId] || 0) + 1;
      return acc;
    }, {});

    const items = [
      ...brickslabs.map(b => {
        const available = (b.stock || 1) - (activeCounts[b.id] || 0);
        return {
          id: b.id, title: b.title, description: b.description, imageUrl: b.imageUrl,
          difficulty: b.difficulty, tags: b.tags, type: 'Aim Brickslab', 
          isAvailable: available > 0, status: available > 0 ? 'Disponible' : 'Reservado', stock: b.stock || 1, legoReference: b.legoReference
        };
      }),
      ...libraryBooks.map(b => {
        const available = (b.stock || 1) - (activeCounts[b.id] || 0);
        return {
          id: b.id, title: b.title, author: b.author, isbn: b.isbn, description: b.description, imageUrl: b.imageUrl,
          minimumRank: b.minimumRank, tags: b.tags, type: 'Libro', 
          isAvailable: available > 0, status: available > 0 ? 'Disponible' : 'Reservado', stock: b.stock || 1
        };
      })
    ];
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/reservations', async (req, res) => {
  try {
    const { userId, type, itemId } = req.body;

    // Permissions check
    const ranks = await prisma.bricks_ranks.findUnique({ where: { userId } });
    const canReserveBrickslab = ranks?.canReserveBrickslab || false;
    const canReserveLibrary = ranks?.canReserveLibrary || false;

    if (type === 'Aim Brickslab' && !canReserveBrickslab) {
      return res.status(403).json({ error: "No tienes el rango 'Brickslab' para reservar esta categoría." });
    }
    if (type === 'Libro' && !canReserveLibrary) {
      return res.status(403).json({ error: "No tienes el rango 'Biblioteca' para reservar esta categoría." });
    }

    const userActiveInCategory = await prisma.bricks_reservation.count({
      where: {
        userId,
        status: 'Active',
        ...(type === 'Aim Brickslab' ? { brickslabId: { not: null } } : { libraryBookId: { not: null } })
      }
    });

    if (userActiveInCategory > 0) {
      return res.status(400).json({ error: `Ya tienes un ${type === 'Libro' ? 'Libro' : 'Aim Brickslab'} reservado. Debes terminar y entregarlo antes de poder reservar otro de la misma categoría.` });
    }

    const activeCurrent = await prisma.bricks_reservation.count({
      where: { 
        status: 'Active',
        ...(type === 'Aim Brickslab' ? { brickslabId: itemId } : { libraryBookId: itemId })
      }
    });

    let maxStock = 1;
    if (type === 'Aim Brickslab') {
      const item = await prisma.bricks_brickslab.findUnique({ where: { id: itemId } });
      maxStock = item ? item.stock || 1 : 1;
    } else {
      const item = await prisma.bricks_librarybook.findUnique({ where: { id: itemId } });
      maxStock = item ? item.stock || 1 : 1;
    }

    if (activeCurrent >= maxStock) {
      return res.status(400).json({ error: 'No quedan unidades disponibles de este artículo.' });
    }
    
    await prisma.bricks_reservation.create({
      data: {
        userId,
        status: 'Active',
        brickslabId: type === 'Aim Brickslab' ? itemId : null,
        libraryBookId: type === 'Libro' ? itemId : null,
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al reservar' });
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
