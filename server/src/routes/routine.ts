import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const prisma = new PrismaClient();

const routinesUpdateSchema = z.object({
  body: z.object({
    Monday: z.array(z.string()),
    Tuesday: z.array(z.string()),
    Wednesday: z.array(z.string()),
    Thursday: z.array(z.string()),
    Friday: z.array(z.string()),
    Saturday: z.array(z.string()),
    Sunday: z.array(z.string()),
  })
});

// 1. Get Routines
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  try {
    const dbRoutines = await prisma.weeklyRoutine.findMany({
      where: { userId }
    });

    // Format back into a clean object keyed by day
    const routines: Record<string, string[]> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    };

    dbRoutines.forEach(r => {
      try {
        routines[r.dayOfWeek] = JSON.parse(r.items);
      } catch (e) {
        routines[r.dayOfWeek] = [];
      }
    });

    res.json(routines);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Update/Save Routines
router.put('/', authenticateToken, validate(routinesUpdateSchema), async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const routinesData = req.body;

  try {
    await prisma.$transaction(
      Object.entries(routinesData).map(([dayOfWeek, items]) => {
        return prisma.weeklyRoutine.upsert({
          where: {
            userId_dayOfWeek: { userId, dayOfWeek }
          },
          update: {
            items: JSON.stringify(items)
          },
          create: {
            userId,
            dayOfWeek,
            items: JSON.stringify(items)
          }
        });
      })
    );

    res.json({ message: 'Routines updated successfully', routines: routinesData });
  } catch (error: any) {
    console.error('Routine update error:', error);
    res.status(500).json({ error: 'Failed to update routines' });
  }
});

export default router;
