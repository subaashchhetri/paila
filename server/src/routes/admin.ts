import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

export interface AuthenticatedAdminRequest extends Request {
  adminUser?: string;
}

export function authenticateAdminToken(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Admin access token is required' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'pailatododevelopmentjwtsecretmustbelongandsecure';
  try {
    const decoded = jwt.verify(token, jwtSecret) as { isAdmin: boolean; username: string };
    if (!decoded.isAdmin || decoded.username !== 'subash') {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }
    req.adminUser = decoded.username;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired admin token' });
  }
}

// 1. Admin Login
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (username === 'subash' && password === 'subash') {
    const jwtSecret = process.env.JWT_SECRET || 'pailatododevelopmentjwtsecretmustbelongandsecure';
    const token = jwt.sign(
      { isAdmin: true, username: 'subash' },
      jwtSecret,
      { expiresIn: '1d' }
    );
    return res.json({ token });
  }

  return res.status(401).json({ error: 'Invalid admin credentials' });
});

// 2. Fetch all users and stats
router.get('/users', authenticateAdminToken, async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        _count: {
          select: {
            wallets: true,
            todos: true,
            transactions: true,
            loansGiven: true,
            loansTaken: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalCount = users.length;
    const onboardedCount = users.filter(u => u.profile?.onboardingCompleted).length;

    res.json({
      users,
      stats: {
        totalCount,
        onboardedCount,
        pendingCount: totalCount - onboardedCount
      }
    });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Delete a user
router.delete('/users/:id', authenticateAdminToken, async (req: AuthenticatedAdminRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Validate if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (Prisma onDelete: Cascade will clean up everything else)
    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'User and all related data deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
