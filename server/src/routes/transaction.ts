import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// 1. Get Transaction List (Search, Filter, Paginate)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const { search, type, wallet, page = '1', limit = '10' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  try {
    const whereClause: any = { userId };

    if (type) {
      whereClause.type = type as string;
    }

    if (wallet) {
      whereClause.wallet = {
        name: wallet as string
      };
    }

    if (search) {
      whereClause.OR = [
        { description: { contains: search as string } },
        { category: { contains: search as string } }
      ];
    }

    // Get transactions and total count
    const [transactions, totalCount] = await prisma.$transaction([
      prisma.transaction.findMany({
        where: whereClause,
        include: {
          wallet: {
            select: { name: true }
          }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.transaction.count({ where: whereClause })
    ]);

    res.json({
      transactions,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Fetch transactions error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Export CSV
router.get('/export', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;

  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        wallet: {
          select: { name: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    // Generate CSV contents
    const headers = ['Date', 'Type', 'Amount (NPR)', 'Wallet', 'Category / Contact', 'Description'];
    const rows = transactions.map(t => [
      t.date.toISOString().split('T')[0],
      t.type,
      t.amount.toString(),
      t.wallet?.name || 'N/A',
      `"${t.category.replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=paila_todo_transactions.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export transaction history' });
  }
});

export default router;
