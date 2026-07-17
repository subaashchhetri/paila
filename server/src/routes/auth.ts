import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { validate } from '../middleware/validate.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    username: z.string()
      .min(3, 'Username must be at least 3 characters long')
      .regex(/^[^@]+$/, 'Username must not contain the @ symbol'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
  })
});

const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  })
});

// Helper: Initialize wallets for a new user
async function initializeDefaultWallets(userId: string) {
  const wallets = ['Cash', 'Bank', 'eSewa'];
  for (const name of wallets) {
    await prisma.wallet.create({
      data: {
        userId,
        name,
        balance: 0.0
      }
    });
  }
}

// 1. Local Registration
router.post('/register', validate(registerSchema), async (req, res) => {
  const { name, username, email, phone, password } = req.body;

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'User with this username already exists' });
      }
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        profile: {
          create: {
            name,
            phone,
            onboardingCompleted: false,
            openingBalancesSetup: false
          }
        }
      },
      include: {
        profile: true
      }
    });

    await initializeDefaultWallets(user.id);

    // Create default empty weekly routines
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of days) {
      await prisma.weeklyRoutine.create({
        data: {
          userId: user.id,
          dayOfWeek: day,
          items: JSON.stringify([])
        }
      });
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile: user.profile
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 2. Local Login (Mock mode)
router.post('/login', validate(loginSchema), async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { profile: true }
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'pailatododevelopmentjwtsecretmustbelongandsecure';
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      jwtSecret,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile: user.profile
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Firebase Login/Sync Endpoint
// Client calls this after authenticating via Firebase to ensure the server DB contains this user.
// The auth token check is handled by the authenticateToken middleware.
router.post('/firebase-sync', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // req.userId is set by authenticateToken
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { profile: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User sync failed' });
    }

    // Check if wallets exist, if not, create them
    const walletCount = await prisma.wallet.count({
      where: { userId: user.id }
    });

    if (walletCount === 0) {
      await initializeDefaultWallets(user.id);
    }

    // Check if routines exist, if not, create them
    const routineCount = await prisma.weeklyRoutine.count({
      where: { userId: user.id }
    });

    if (routineCount === 0) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      for (const day of days) {
        await prisma.weeklyRoutine.create({
          data: {
            userId: user.id,
            dayOfWeek: day,
            items: JSON.stringify([])
          }
        });
      }
    }

    res.json({
      message: 'Firebase sync completed successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile: user.profile
      }
    });
  } catch (error: any) {
    console.error('Firebase sync error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Verify Auth Token status (GET current user)
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { profile: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile: user.profile
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
