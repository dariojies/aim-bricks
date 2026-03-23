import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

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
    const user = await prisma.users.findUnique({
      where: { email },
      include: {
        reservations: { include: { brickslab: true, libraryBook: true } },
        history: { include: { brickslab: true, libraryBook: true } }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Base de datos usa bcrypt para contraseñas
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Mapear al modelo UserProfile del frontend
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
      })
    };

    res.json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Admin Endpoints
app.get('/api/admin/reservations', async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
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
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) return res.status(404).json({ error: 'No encontrado' });
    
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'Returned', returnDate: new Date() }
    });
    
    // Add to history
    await prisma.userHistory.create({
      data: {
        userId: reservation.userId,
        brickslabId: reservation.brickslabId,
        libraryBookId: reservation.libraryBookId,
      }
    });

    if (reservation.brickslabId) {
      await prisma.brickslab.update({ where: { id: reservation.brickslabId }, data: { isAvailable: true }});
    } else if (reservation.libraryBookId) {
      await prisma.libraryBook.update({ where: { id: reservation.libraryBookId }, data: { isAvailable: true }});
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/admin/items', async (req, res) => {
  try {
    const { type, title, description, imageUrl, difficulty, minimumRank, tagsString } = req.body;
    const tags = tagsString ? tagsString.split(',').map(t => t.trim()) : [];
    
    if (type === 'Aim Brickslab') {
      await prisma.brickslab.create({
        data: { title, description, imageUrl: imageUrl || 'https://images.unsplash.com/photo-1587654780291-39c9404d746b', difficulty: difficulty || 'Media', tags }
      });
    } else {
      await prisma.libraryBook.create({
        data: { title, author: 'Desconocido', description, imageUrl: imageUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f', minimumRank: minimumRank || 'Blanco', tags }
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
      await prisma.reservation.deleteMany({ where: { brickslabId: id } });
      await prisma.userHistory.deleteMany({ where: { brickslabId: id } });
      await prisma.brickslab.delete({ where: { id } });
    } else {
      await prisma.reservation.deleteMany({ where: { libraryBookId: id } });
      await prisma.userHistory.deleteMany({ where: { libraryBookId: id } });
      await prisma.libraryBook.delete({ where: { id } });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/catalog', async (req, res) => {
  try {
    const brickslabs = await prisma.brickslab.findMany();
    const books = await prisma.libraryBook.findMany();
    
    const items = [
      ...brickslabs.map(mapBrickslab),
      ...books.map(mapBook)
    ];

    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/reservations', async (req, res) => {
  try {
    const { userId, itemId, type } = req.body;
    
    if (type === 'Aim Brickslab') {
      const slab = await prisma.brickslab.findUnique({ where: { id: itemId }});
      if (!slab || !slab.isAvailable) return res.status(400).json({ error: 'No disponible' });
      
      await prisma.reservation.create({
        data: { userId, brickslabId: itemId, status: 'Active' }
      });
      await prisma.brickslab.update({ where: { id: itemId }, data: { isAvailable: false }});
    } else {
      const book = await prisma.libraryBook.findUnique({ where: { id: itemId }});
      if (!book || !book.isAvailable) return res.status(400).json({ error: 'No disponible' });

      await prisma.reservation.create({
        data: { userId, libraryBookId: itemId, status: 'Active' }
      });
      await prisma.libraryBook.update({ where: { id: itemId }, data: { isAvailable: false }});
    }
    
    // Devolvemos todos los items para refrescar el frontend
    const brickslabs = await prisma.brickslab.findMany();
    const books = await prisma.libraryBook.findMany();
    res.json({ success: true, items: [...brickslabs.map(mapBrickslab), ...books.map(mapBook)] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
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
