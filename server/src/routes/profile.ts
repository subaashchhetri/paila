import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const prisma = new PrismaClient();

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    occupation: z.string().optional().nullable(),
    avatarUrl: z.string().url().optional().nullable(),
  })
});

const onboardSchema = z.object({
  body: z.object({
    profile: z.object({
      name: z.string().min(1, 'Name is required'),
      phone: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      occupation: z.string().optional().nullable(),
    }),
    wallets: z.object({
      cash: z.number().min(0, 'Cash balance cannot be negative'),
      bank: z.number().min(0, 'Bank balance cannot be negative'),
      esewa: z.number().min(0, 'eSewa balance cannot be negative'),
    }),
    routines: z.object({
      Monday: z.array(z.string()),
      Tuesday: z.array(z.string()),
      Wednesday: z.array(z.string()),
      Thursday: z.array(z.string()),
      Friday: z.array(z.string()),
      Saturday: z.array(z.string()),
      Sunday: z.array(z.string()),
    })
  })
});

// 1. Fetch Profile
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: req.userId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Update Profile
router.put('/', authenticateToken, validate(updateProfileSchema), async (req: AuthenticatedRequest, res) => {
  const { name, phone, address, occupation, avatarUrl } = req.body;

  try {
    const updatedProfile = await prisma.userProfile.update({
      where: { userId: req.userId },
      data: {
        name,
        phone,
        address,
        occupation,
        avatarUrl
      }
    });

    res.json({ message: 'Profile updated successfully', profile: updatedProfile });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Complete Onboarding
router.post('/onboard', authenticateToken, validate(onboardSchema), async (req: AuthenticatedRequest, res) => {
  const { profile, wallets, routines } = req.body;
  const userId = req.userId!;

  try {
    // We use a transaction to guarantee that either all data is saved successfully or none is.
    await prisma.$transaction(async (tx) => {
      // 1. Update Profile
      await tx.userProfile.update({
        where: { userId },
        data: {
          name: profile.name,
          phone: profile.phone,
          address: profile.address,
          occupation: profile.occupation,
          onboardingCompleted: true,
          openingBalancesSetup: true,
        }
      });

      // 2. Setup Wallets & Opening Transactions
      const walletList = [
        { name: 'Cash', balance: wallets.cash },
        { name: 'Bank', balance: wallets.bank },
        { name: 'eSewa', balance: wallets.esewa }
      ];

      for (const w of walletList) {
        // Find existing or update
        const wallet = await tx.wallet.upsert({
          where: {
            userId_name: { userId, name: w.name }
          },
          update: { balance: w.balance },
          create: { userId, name: w.name, balance: w.balance }
        });

        // Record opening balance transaction if balance is greater than 0
        if (w.balance > 0) {
          await tx.transaction.create({
            data: {
              userId,
              walletId: wallet.id,
              type: 'Income',
              amount: w.balance,
              category: 'Opening Balance',
              description: `Initial setup balance for ${w.name}`,
              date: new Date()
            }
          });
        }
      }

      // 3. Setup routines
      for (const [day, items] of Object.entries(routines)) {
        await tx.weeklyRoutine.upsert({
          where: {
            userId_dayOfWeek: { userId, dayOfWeek: day }
          },
          update: { items: JSON.stringify(items) },
          create: { userId, dayOfWeek: day, items: JSON.stringify(items) }
        });
      }
    });

    // Fetch final updated user status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, wallets: true }
    });

    res.json({
      message: 'Onboarding completed successfully',
      user: {
        id: user?.id,
        email: user?.email,
        profile: user?.profile,
        wallets: user?.wallets
      }
    });
  } catch (error: any) {
    console.error('Onboarding transaction error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete onboarding setup' });
  }
});

// Delete account endpoint (Requested in UI features: Profile page Settings)
router.delete('/account', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;

  try {
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: 'User account and all related data deleted successfully' });
  } catch (error: any) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
