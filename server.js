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
      currentReservations: user.reservations.filter(r => ['Active', 'Reserved', 'Delivered'].includes(r.status)).map(r => ({
        id: r.id,
        status: r.status === 'Active' ? 'Reserved' : r.status,
        text: r.brickslab ? `Aim Brickslab: ${r.brickslab.title}` : (r.libraryBook ? `Libro: ${r.libraryBook.title}` : 'Reserva'),
        isBrickslab: !!r.brickslab,
        brickslabId: r.brickslabId
      })),
      permissions: {
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
      currentReservations: user.reservations.filter(r => ['Active', 'Reserved', 'Delivered'].includes(r.status)).map(r => ({
        id: r.id,
        status: r.status === 'Active' ? 'Reserved' : r.status,
        text: r.brickslab ? `Aim Brickslab: ${r.brickslab.title}` : (r.libraryBook ? `Libro: ${r.libraryBook.title}` : 'Reserva'),
        isBrickslab: !!r.brickslab,
        brickslabId: r.brickslabId
      })),
      permissions: {
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
        brickslab: u.bricks_ranks?.canReserveBrickslab || false,
        library: u.bricks_ranks?.canReserveLibrary || false,
        brickslabPro: u.bricks_ranks?.brickslabPro || false
      }
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/admin/users/permissions', async (req, res) => {
  try {
    const { userId, brickslab, library, brickslabPro } = req.body;

    // Upsert equivalent since we might not have a record yet
    const existing = await prisma.bricks_ranks.findUnique({ where: { userId } });
    if (existing) {
      await prisma.bricks_ranks.update({
        where: { userId },
        data: { canReserveBrickslab: brickslab, canReserveLibrary: library, brickslabPro: brickslabPro }
      });
    } else {
      await prisma.bricks_ranks.create({
        data: { userId, canReserveBrickslab: brickslab, canReserveLibrary: library, brickslabPro: brickslabPro }
      });
    }

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
    const reservations = await prisma.bricks_reservation.findMany({
      where: { status: { in: ['Active', 'Reserved', 'Delivered'] } },
      include: { user: true, brickslab: true, libraryBook: true }
    });

    res.json(reservations.map(r => ({
      id: r.id,
      userId: r.userId,
      itemId: r.brickslab ? r.brickslabId : r.libraryBookId,
      userName: `${r.user.name} ${r.user.surname || ''}`.trim(),
      userEmail: r.user.email,
      itemTitle: r.brickslab ? r.brickslab.title : (r.libraryBook ? r.libraryBook.title : ''),
      itemType: r.brickslab ? 'Aim Brickslab' : 'Libro',
      reservationDate: r.reservationDate,
      status: r.status === 'Active' ? 'Reserved' : r.status // Map legacy Active to Reserved
    })));
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
    const { type, title, description, imageUrl, difficulty, minimumRank, tagsString, stock, isLego, legoReferenceInput, isbn, author, isProOnly } = req.body;
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
        data: { 
          title: finalTitle, 
          description, 
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1587654780291-39c9404d746b', 
          difficulty: difficulty || 'Media', 
          tags, 
          stock: parsedStock, 
          legoReference: finalLegoRef,
          isProOnly: !!isProOnly
        }
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
    const { type, title, description, stock, imageUrl, isProOnly } = req.body;
    const parsedStock = parseInt(stock || '1', 10);

    if (type === 'Aim Brickslab') {
      await prisma.bricks_brickslab.update({
        where: { id },
        data: { title, description, stock: parsedStock, imageUrl, isProOnly: !!isProOnly }
      });
    } else {
      await prisma.bricks_librarybook.update({
        where: { id },
        data: { title, description, stock: parsedStock, imageUrl }
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
      prisma.bricks_reservation.findMany({ where: { status: { in: ['Reserved', 'Delivered'] } } })
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
          isAvailable: available > 0, status: available > 0 ? 'Disponible' : 'Reservado', stock: b.stock || 1, legoReference: b.legoReference,
          isProOnly: b.isProOnly
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

    const item = type === 'Aim Brickslab' 
      ? await prisma.bricks_brickslab.findUnique({ where: { id: itemId } })
      : await prisma.bricks_librarybook.findUnique({ where: { id: itemId } });

    if (!item) return res.status(404).json({ error: 'Artículo no encontrado' });

    if (type === 'Aim Brickslab') {
      if (!canReserveBrickslab) {
        return res.status(403).json({ error: "No tienes el rango 'Brickslab' para reservar esta categoría." });
      }
      if (item.isProOnly && !ranks?.brickslabPro) {
        return res.status(403).json({ error: "Este set es exclusivo para el rango 'Brickslab Pro'. No puedes llevarlo a casa." });
      }
    }
    if (type === 'Libro' && !canReserveLibrary) {
      return res.status(403).json({ error: "No tienes el rango 'Biblioteca' para reservar esta categoría." });
    }

    const userActiveInCategory = await prisma.bricks_reservation.count({
      where: {
        userId,
        status: { in: ['Reserved', 'Delivered'] },
        ...(type === 'Aim Brickslab' ? { brickslabId: { not: null } } : { libraryBookId: { not: null } })
      }
    });

    if (userActiveInCategory > 0) {
      return res.status(400).json({ error: `Ya tienes un ${type === 'Libro' ? 'Libro' : 'Aim Brickslab'} reservado. Debes terminar y entregarlo antes de poder reservar otro de la misma categoría.` });
    }

    const activeCurrent = await prisma.bricks_reservation.count({
      where: {
        status: { in: ['Reserved', 'Delivered'] },
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
        status: 'Reserved',
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
    const { userId, brickslabId, description } = req.body;
    if (!userId || !brickslabId || !description) return res.status(400).json({ error: 'Faltan datos' });

    await prisma.bricks_missing_pieces.create({
      data: {
        userId,
        brickslabId,
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
    const reports = await prisma.bricks_missing_pieces.findMany({
      include: {
        user: true,
        brickslab: true
      },
      orderBy: { reportedAt: 'desc' }
    });

    res.json(reports.map(r => ({
      id: r.id,
      userName: `${r.user.name} ${r.user.surname || ''}`.trim(),
      userEmail: r.user.email,
      itemName: r.brickslab.title,
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

    // Ensure user has brickslab rank
    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      include: { bricks_ranks: true }
    });

    if (!user || !user.bricks_ranks || !user.bricks_ranks.canReserveBrickslab) {
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

// Serve frontend static files
app.use(express.static(join(__dirname, 'dist')));

app.get('/*path', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
