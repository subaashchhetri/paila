import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const prisma = new PrismaClient();

const expenseSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be positive'),
    category: z.enum([
      'Food', 'Fuel', 'Shopping', 'Travel', 'Business', 'Investment', 
      'Entertainment', 'Medical', 'Bills', 'Other'
    ]),
    walletName: z.enum(['Cash', 'Bank', 'eSewa']),
    description: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    receiptUrl: z.string().url().optional().nullable().or(z.string().optional().nullable())
  })
});

const incomeSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be positive'),
    source: z.enum(['Salary', 'Business', 'Freelancing', 'Gift', 'Investment', 'Other']),
    walletName: z.enum(['Cash', 'Bank', 'eSewa']),
    description: z.string().optional().nullable(),
    date: z.string().optional().nullable()
  })
});

// 1. Record Expense
router.post('/expense', authenticateToken, validate(expenseSchema), async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const { amount, category, walletName, description, date, receiptUrl } = req.body;
  const transactionDate = date ? new Date(date) : new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find wallet
      const wallet = await tx.wallet.findUnique({
        where: {
          userId_name: { userId, name: walletName }
        }
      });

      if (!wallet) {
        throw new Error(`Wallet '${walletName}' not found`);
      }

      // Check balance
      if (wallet.balance < amount) {
        throw new Error(`Insufficient balance in ${walletName}. Available: Rs. ${wallet.balance}`);
      }

      // Deduct wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } }
      });

      // Create Expense
      const expense = await tx.expense.create({
        data: {
          userId,
          walletId: wallet.id,
          amount,
          category,
          description,
          date: transactionDate,
          receiptUrl
        }
      });

      // Create Transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          walletId: wallet.id,
          type: 'Expense',
          amount,
          category,
          description,
          date: transactionDate,
          referenceId: expense.id
        }
      });

      return { expense, walletBalance: updatedWallet.balance };
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Record expense transaction error:', error);
    res.status(400).json({ error: error.message || 'Failed to record expense' });
  }
});

// 2. Delete Expense (Restore Balance)
router.delete('/expense/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.userId!;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findFirst({
        where: { id, userId }
      });

      if (!expense) {
        throw new Error('Expense record not found');
      }

      // Restore wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: expense.walletId },
        data: { balance: { increment: expense.amount } }
      });

      // Delete Expense
      await tx.expense.delete({
        where: { id }
      });

      // Delete corresponding transaction log
      await tx.transaction.deleteMany({
        where: { referenceId: id, userId }
      });

      return { message: 'Expense deleted and balance restored', walletBalance: updatedWallet.balance };
    });

    res.json(result);
  } catch (error: any) {
    console.error('Delete expense transaction error:', error);
    res.status(400).json({ error: error.message || 'Failed to delete expense' });
  }
});

// 3. Record Income
router.post('/income', authenticateToken, validate(incomeSchema), async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const { amount, source, walletName, description, date } = req.body;
  const transactionDate = date ? new Date(date) : new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find wallet
      const wallet = await tx.wallet.findUnique({
        where: {
          userId_name: { userId, name: walletName }
        }
      });

      if (!wallet) {
        throw new Error(`Wallet '${walletName}' not found`);
      }

      // Increment wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } }
      });

      // Create Income record
      const income = await tx.income.create({
        data: {
          userId,
          walletId: wallet.id,
          amount,
          source,
          description,
          date: transactionDate
        }
      });

      // Create Transaction log
      await tx.transaction.create({
        data: {
          userId,
          walletId: wallet.id,
          type: 'Income',
          amount,
          category: source,
          description,
          date: transactionDate,
          referenceId: income.id
        }
      });

      return { income, walletBalance: updatedWallet.balance };
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Record income transaction error:', error);
    res.status(400).json({ error: error.message || 'Failed to record income' });
  }
});

// 4. Delete Income (Deduct Balance)
router.delete('/income/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.userId!;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const income = await tx.income.findFirst({
        where: { id, userId }
      });

      if (!income) {
        throw new Error('Income record not found');
      }

      // Check if wallet has enough balance to deduct the deleted income
      const wallet = await tx.wallet.findUnique({
        where: { id: income.walletId }
      });

      if (!wallet) {
        throw new Error('Wallet associated with this income not found');
      }

      if (wallet.balance < income.amount) {
        throw new Error(`Cannot delete this income. Deducting Rs. ${income.amount} from ${wallet.name} would result in a negative balance (Current balance: Rs. ${wallet.balance})`);
      }

      // Deduct wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: income.walletId },
        data: { balance: { decrement: income.amount } }
      });

      // Delete Income
      await tx.income.delete({
        where: { id }
      });

      // Delete corresponding transaction log
      await tx.transaction.deleteMany({
        where: { referenceId: id, userId }
      });

      return { message: 'Income deleted and balance adjusted', walletBalance: updatedWallet.balance };
    });

    res.json(result);
  } catch (error: any) {
    console.error('Delete income transaction error:', error);
    res.status(400).json({ error: error.message || 'Failed to delete income' });
  }
});

export default router;
