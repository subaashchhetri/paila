import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/summary', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;

  try {
    // 1. Category-wise expense breakdown (Pie Chart data)
    const expenses = await prisma.expense.findMany({
      where: { userId }
    });

    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach(e => {
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
    });

    const pieChartData = Object.entries(categoryBreakdown).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    // 2. Monthly Income vs Expenses (Line/Bar Chart data for last 6 months)
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ['Income', 'Expense'] }
      },
      orderBy: { date: 'asc' }
    });

    // Group transactions by YYYY-MM
    const monthlySummary: Record<string, { income: number; expense: number }> = {};
    
    // Seed last 6 months in case there are months with no transactions
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlySummary[key] = { income: 0, expense: 0 };
    }

    transactions.forEach(t => {
      const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      // Only record if it matches our timeline window (or dynamic)
      if (monthlySummary[monthKey] !== undefined) {
        if (t.type === 'Income') {
          monthlySummary[monthKey].income += t.amount;
        } else if (t.type === 'Expense') {
          monthlySummary[monthKey].expense += t.amount;
        }
      }
    });

    const lineChartData = Object.entries(monthlySummary).map(([month, data]) => {
      // Convert "2026-07" to "Jul 2026"
      const [year, m] = month.split('-');
      const date = new Date(parseInt(year), parseInt(m) - 1, 1);
      const name = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      return {
        name,
        income: data.income,
        expense: data.expense,
        savings: Math.max(0, data.income - data.expense)
      };
    });

    // 3. Weekly Productivity (Todo completion rate, past 7 days)
    // Find all todos modified/completed in last 7 days or total
    const todos = await prisma.todo.findMany({
      where: { userId }
    });

    const completedCount = todos.filter(t => t.status === 'Completed').length;
    const pendingCount = todos.filter(t => t.status === 'Pending').length;
    const overdueCount = todos.filter(t => t.status === 'Overdue' || (t.status === 'Pending' && t.deadline && new Date(t.deadline).getTime() < Date.now())).length;
    const totalCount = todos.length;

    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Daily todo summary for the current week (Monday-Sunday completion rates)
    const weeklyProductivity = [
      { name: 'Mon', completed: 0, total: 0 },
      { name: 'Tue', completed: 0, total: 0 },
      { name: 'Wed', completed: 0, total: 0 },
      { name: 'Thu', completed: 0, total: 0 },
      { name: 'Fri', completed: 0, total: 0 },
      { name: 'Sat', completed: 0, total: 0 },
      { name: 'Sun', completed: 0, total: 0 }
    ];

    // Let's mock a simple weekly todo distribution based on existing tasks' deadlines
    // or distribute them for aesthetic mock purposes if no dates map
    todos.forEach(t => {
      if (t.deadline) {
        const dayIndex = (new Date(t.deadline).getDay() + 6) % 7; // Map Sun=0 to Mon-Sun (0-6)
        if (dayIndex >= 0 && dayIndex < 7) {
          weeklyProductivity[dayIndex].total += 1;
          if (t.status === 'Completed') {
            weeklyProductivity[dayIndex].completed += 1;
          }
        }
      }
    });

    // Adjust values to ensure chart looks populated and pretty (with fallback)
    const formattedWeeklyProductivity = weeklyProductivity.map(day => ({
      name: day.name,
      completed: day.completed,
      pending: day.total - day.completed,
      rate: day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0
    }));

    // 4. Wallet Distribution summary
    const wallets = await prisma.wallet.findMany({
      where: { userId }
    });

    const walletDistribution = wallets.map(w => ({
      name: w.name,
      value: w.balance
    }));

    res.json({
      pieChartData,
      lineChartData,
      productivity: {
        completed: completedCount,
        pending: pendingCount,
        overdue: overdueCount,
        total: totalCount,
        completionRate,
        weeklyProductivity: formattedWeeklyProductivity
      },
      walletDistribution
    });
  } catch (error) {
    console.error('Reports endpoint error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
