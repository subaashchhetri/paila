import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const prisma = new PrismaClient();

const todoSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().nullable(),
    priority: z.enum(['High', 'Medium', 'Low']),
    category: z.enum(['Personal', 'Work', 'Study', 'Business', 'Finance', 'Health']),
    status: z.enum(['Pending', 'Completed', 'Overdue']).optional(),
    deadline: z.string().datetime({ offset: true }).optional().nullable().or(z.string().optional()),
    repeat: z.enum(['None', 'Daily', 'Weekly', 'Monthly', 'Yearly']).optional(),
    reminder: z.boolean().optional(),
    notes: z.string().optional().nullable(),
    attachmentUrl: z.string().url().optional().nullable().or(z.string().optional().nullable()),
  })
});

// 1. Get Todos (with filters)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { status, priority, category, date } = req.query;
  const userId = req.userId!;

  try {
    const whereClause: any = { userId };

    if (status) whereClause.status = status as string;
    if (priority) whereClause.priority = priority as string;
    if (category) whereClause.category = category as string;

    if (date) {
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);

      whereClause.deadline = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    const todos = await prisma.todo.findMany({
      where: whereClause,
      orderBy: [
        { status: 'desc' }, // Pending/Overdue first
        { deadline: 'asc' },
        { priority: 'desc' }
      ]
    });

    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Create Todo
router.post('/', authenticateToken, validate(todoSchema), async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const { title, description, priority, category, deadline, repeat, reminder, notes, attachmentUrl } = req.body;

  try {
    const todo = await prisma.todo.create({
      data: {
        userId,
        title,
        description,
        priority,
        category,
        status: 'Pending',
        deadline: deadline ? new Date(deadline) : null,
        repeat: repeat || 'None',
        reminder: reminder || false,
        notes,
        attachmentUrl
      }
    });

    res.status(201).json(todo);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 3. Update Todo
router.put('/:id', authenticateToken, validate(todoSchema), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.userId!;
  const { title, description, priority, category, status, deadline, repeat, reminder, notes, attachmentUrl } = req.body;

  try {
    // Confirm ownership
    const existing = await prisma.todo.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Todo not found or unauthorized' });
    }

    const updated = await prisma.todo.update({
      where: { id },
      data: {
        title,
        description,
        priority,
        category,
        status: status || existing.status,
        deadline: deadline ? new Date(deadline) : null,
        repeat: repeat || 'None',
        reminder: reminder !== undefined ? reminder : existing.reminder,
        notes,
        attachmentUrl
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Delete Todo
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.userId!;

  try {
    const existing = await prisma.todo.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Todo not found or unauthorized' });
    }

    await prisma.todo.delete({
      where: { id }
    });

    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. Duplicate Todo
router.post('/:id/duplicate', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.userId!;

  try {
    const existing = await prisma.todo.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Todo not found or unauthorized' });
    }

    const duplicated = await prisma.todo.create({
      data: {
        userId,
        title: `${existing.title} (Copy)`,
        description: existing.description,
        priority: existing.priority,
        category: existing.category,
        status: 'Pending',
        deadline: existing.deadline,
        repeat: existing.repeat,
        reminder: existing.reminder,
        notes: existing.notes,
        attachmentUrl: existing.attachmentUrl
      }
    });

    res.status(201).json(duplicated);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
