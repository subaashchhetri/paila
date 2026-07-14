import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get Wallets and summary balances
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId: req.userId }
    });

    const cashWallet = wallets.find(w => w.name === 'Cash') || { balance: 0 };
    const bankWallet = wallets.find(w => w.name === 'Bank') || { balance: 0 };
    const esewaWallet = wallets.find(w => w.name === 'eSewa') || { balance: 0 };

    const totalBalance = cashWallet.balance + bankWallet.balance + esewaWallet.balance;

    res.json({
      wallets,
      summary: {
        cash: cashWallet.balance,
        bank: bankWallet.balance,
        esewa: esewaWallet.balance,
        total: totalBalance
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
