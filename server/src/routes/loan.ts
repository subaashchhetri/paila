import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const prisma = new PrismaClient();

const createLoanSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional().nullable(),
    amount: z.number().positive('Amount must be positive'),
    purpose: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    expectedReturnDate: z.string().optional().nullable(),
    walletName: z.enum(['Cash', 'Bank', 'eSewa', 'None']).optional(), // Optional wallet link
    notes: z.string().optional().nullable()
  })
});

const updateLoanStatusSchema = z.object({
  body: z.object({
    status: z.enum(['Pending', 'Partial', 'Completed']),
    notes: z.string().optional().nullable(),
    paybackAmount: z.number().nonnegative().optional(), // Track payments
    walletName: z.enum(['Cash', 'Bank', 'eSewa']).optional() // Wallet where payment is made
  })
});

// 1. Get Loans List & Dashboard summaries
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;

  try {
    const loansGiven = await prisma.loanGiven.findMany({
      where: { userId },
      orderBy: { date: 'desc' }
    });

    const loansTaken = await prisma.loanTaken.findMany({
      where: { userId },
      orderBy: { date: 'desc' }
    });

    // Compute summaries
    // Total given, total taken
    const totalGiven = loansGiven.reduce((acc, l) => acc + l.amount, 0);
    const totalTaken = loansTaken.reduce((acc, l) => acc + l.amount, 0);

    // Pending Receivable (Given status !== Completed)
    const pendingReceivable = loansGiven
      .filter(l => l.status !== 'Completed')
      .reduce((acc, l) => acc + l.amount, 0);

    // Pending Payable (Taken status !== Completed)
    const pendingPayable = loansTaken
      .filter(l => l.status !== 'Completed')
      .reduce((acc, l) => acc + l.amount, 0);

    // Upcoming Due Dates (Filter pending loans with expected return dates)
    const upcomingGivenDues = loansGiven
      .filter(l => l.status !== 'Completed' && l.expectedReturnDate)
      .map(l => ({ id: l.id, type: 'Given', name: l.name, amount: l.amount, dueDate: l.expectedReturnDate }));

    const upcomingTakenDues = loansTaken
      .filter(l => l.status !== 'Completed' && l.expectedReturnDate)
      .map(l => ({ id: l.id, type: 'Taken', name: l.name, amount: l.amount, dueDate: l.expectedReturnDate }));

    const upcomingDues = [...upcomingGivenDues, ...upcomingTakenDues]
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

    res.json({
      loansGiven,
      loansTaken,
      dashboard: {
        totalGiven,
        totalTaken,
        pendingReceivable,
        pendingPayable,
        upcomingDues
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Record Loan Given
router.post('/given', authenticateToken, validate(createLoanSchema), async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const { name, phone, amount, purpose, date, expectedReturnDate, walletName, notes } = req.body;
  const loanDate = date ? new Date(date) : new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      let walletId: string | undefined;

      // If linking wallet, perform deduction check
      if (walletName && walletName !== 'None') {
        const wallet = await tx.wallet.findUnique({
          where: { userId_name: { userId, name: walletName } }
        });

        if (!wallet) {
          throw new Error(`Wallet '${walletName}' not found`);
        }

        if (wallet.balance < amount) {
          throw new Error(`Insufficient balance in ${walletName} to lend this loan. Available: Rs. ${wallet.balance}`);
        }

        // Deduct
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: amount } }
        });

        walletId = wallet.id;
      }

      const loan = await tx.loanGiven.create({
        data: {
          userId,
          name,
          phone,
          amount,
          purpose,
          date: loanDate,
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
          status: 'Pending',
          notes
        }
      });

      // Record transaction
      await tx.transaction.create({
        data: {
          userId,
          walletId: walletId || null,
          type: 'LoanGiven',
          amount,
          category: name,
          description: `Loan Given - ${purpose || 'No purpose listed'}`,
          date: loanDate,
          referenceId: loan.id
        }
      });

      return loan;
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record Loan Given' });
  }
});

// 3. Record Loan Taken
router.post('/taken', authenticateToken, validate(createLoanSchema), async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const { name, phone, amount, purpose, date, expectedReturnDate, walletName, notes } = req.body;
  const loanDate = date ? new Date(date) : new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      let walletId: string | undefined;

      // If linking wallet, increment balance
      if (walletName && walletName !== 'None') {
        const wallet = await tx.wallet.findUnique({
          where: { userId_name: { userId, name: walletName } }
        });

        if (!wallet) {
          throw new Error(`Wallet '${walletName}' not found`);
        }

        // Increment
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: amount } }
        });

        walletId = wallet.id;
      }

      const loan = await tx.loanTaken.create({
        data: {
          userId,
          name,
          phone,
          amount,
          purpose,
          date: loanDate,
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
          status: 'Pending',
          notes
        }
      });

      // Record transaction
      await tx.transaction.create({
        data: {
          userId,
          walletId: walletId || null,
          type: 'LoanTaken',
          amount,
          category: name,
          description: `Loan Taken - ${purpose || 'No purpose listed'}`,
          date: loanDate,
          referenceId: loan.id
        }
      });

      return loan;
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record Loan Taken' });
  }
});

// 4. Update Loan Status & Record Paybacks
router.put('/:type/:id', authenticateToken, validate(updateLoanStatusSchema), async (req: AuthenticatedRequest, res) => {
  const { type, id } = req.params; // type: 'given' or 'taken'
  const userId = req.userId!;
  const { status, notes, paybackAmount, walletName } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (type === 'given') {
        const loan = await tx.loanGiven.findFirst({ where: { id, userId } });
        if (!loan) throw new Error('Loan Given record not found');

        let outstandingAmount = loan.amount;
        let updatedBalanceNotes = loan.notes || '';

        // Handle money returned to us (Increases our wallet)
        if (paybackAmount && paybackAmount > 0) {
          if (outstandingAmount < paybackAmount) {
            throw new Error(`Repayment amount Rs. ${paybackAmount} exceeds outstanding loan amount Rs. ${outstandingAmount}`);
          }

          if (walletName) {
            const wallet = await tx.wallet.findUnique({ where: { userId_name: { userId, name: walletName } } });
            if (!wallet) throw new Error(`Wallet '${walletName}' not found`);

            await tx.wallet.update({
              where: { id: wallet.id },
              data: { balance: { increment: paybackAmount } }
            });

            // Log transaction for payback received
            await tx.transaction.create({
              data: {
                userId,
                walletId: wallet.id,
                type: 'LoanGivenRepaid',
                amount: paybackAmount,
                category: loan.name,
                description: `Received payback for Loan Given: ${loan.purpose || ''}`,
                date: new Date()
              }
            });

            updatedBalanceNotes += `\n[Payback Received: Rs. ${paybackAmount} on ${new Date().toLocaleDateString()} to ${walletName}]`;
          }

          outstandingAmount = Math.max(0, outstandingAmount - paybackAmount);
        }

        const finalStatus = outstandingAmount === 0 ? 'Completed' : status;

        const updatedLoan = await tx.loanGiven.update({
          where: { id },
          data: {
            amount: outstandingAmount,
            status: finalStatus,
            notes: notes !== undefined ? `${notes}${updatedBalanceNotes ? '\n' + updatedBalanceNotes : ''}` : loan.notes
          }
        });
        return updatedLoan;

      } else if (type === 'taken') {
        const loan = await tx.loanTaken.findFirst({ where: { id, userId } });
        if (!loan) throw new Error('Loan Taken record not found');

        let outstandingAmount = loan.amount;
        let updatedBalanceNotes = loan.notes || '';

        // Handle money paid back by us (Decreases our wallet)
        if (paybackAmount && paybackAmount > 0) {
          if (outstandingAmount < paybackAmount) {
            throw new Error(`Repayment amount Rs. ${paybackAmount} exceeds outstanding loan amount Rs. ${outstandingAmount}`);
          }

          if (walletName) {
            const wallet = await tx.wallet.findUnique({ where: { userId_name: { userId, name: walletName } } });
            if (!wallet) throw new Error(`Wallet '${walletName}' not found`);

            if (wallet.balance < paybackAmount) {
              throw new Error(`Insufficient balance in ${walletName} to make payment of Rs. ${paybackAmount}. Current balance: Rs. ${wallet.balance}`);
            }

            await tx.wallet.update({
              where: { id: wallet.id },
              data: { balance: { decrement: paybackAmount } }
            });

            // Log transaction for payback made
            await tx.transaction.create({
              data: {
                userId,
                walletId: wallet.id,
                type: 'LoanTakenRepaid',
                amount: paybackAmount,
                category: loan.name,
                description: `Paid back Loan Taken: ${loan.purpose || ''}`,
                date: new Date()
              }
            });

            updatedBalanceNotes += `\n[Payment Settled: Rs. ${paybackAmount} on ${new Date().toLocaleDateString()} from ${walletName}]`;
          }

          outstandingAmount = Math.max(0, outstandingAmount - paybackAmount);
        }

        const finalStatus = outstandingAmount === 0 ? 'Completed' : status;

        const updatedLoan = await tx.loanTaken.update({
          where: { id },
          data: {
            amount: outstandingAmount,
            status: finalStatus,
            notes: notes !== undefined ? `${notes}${updatedBalanceNotes ? '\n' + updatedBalanceNotes : ''}` : loan.notes
          }
        });
        return updatedLoan;
      } else {
        throw new Error('Invalid loan type parameter');
      }
    });

    res.json({ message: 'Loan status updated successfully', loan: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update loan record' });
  }
});

// 5. Delete Loan
router.delete('/:type/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { type, id } = req.params;
  const userId = req.userId!;

  try {
    if (type === 'given') {
      const existing = await prisma.loanGiven.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Loan not found' });
      await prisma.loanGiven.delete({ where: { id } });
    } else if (type === 'taken') {
      const existing = await prisma.loanTaken.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Loan not found' });
      await prisma.loanTaken.delete({ where: { id } });
    } else {
      return res.status(400).json({ error: 'Invalid loan type' });
    }

    // Clean up corresponding transaction log
    await prisma.transaction.deleteMany({
      where: { referenceId: id, userId }
    });

    res.json({ message: 'Loan record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
