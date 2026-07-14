import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { firebaseAuth, useFirebase } from '../config/firebase.js';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  userId?: string;
  email?: string;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token is required' });
  }

  // 1. Firebase Auth Mode
  if (useFirebase && firebaseAuth) {
    try {
      const decodedToken = await firebaseAuth.verifyIdToken(token);
      const firebaseUid = decodedToken.uid;
      const email = decodedToken.email;

      if (!email) {
        return res.status(400).json({ error: 'Firebase token must contain an email address' });
      }

      // Check if user exists in database, or create them (automatic sync)
      let user = await prisma.user.findUnique({
        where: { firebaseUid }
      });

      if (!user) {
        // Double check by email in case of password signup turning to Firebase login later
        user = await prisma.user.findUnique({
          where: { email }
        });

        if (user) {
          // Link firebase account
          user = await prisma.user.update({
            where: { email },
            data: { firebaseUid }
          });
        } else {
          // Create new user record
          user = await prisma.user.create({
            data: {
              email,
              firebaseUid,
              profile: {
                create: {
                  name: decodedToken.name || email.split('@')[0],
                  avatarUrl: decodedToken.picture || null,
                  onboardingCompleted: false,
                  openingBalancesSetup: false
                }
              }
            }
          });
        }
      }

      req.userId = user.id;
      req.email = email;
      return next();
    } catch (firebaseError: any) {
      console.warn('Firebase authentication failed, attempting local JWT fallback...', firebaseError.message);
      // Fall through to local JWT check, in case of hybrid dev modes
    }
  }

  // 2. Local JWT Fallback Mode
  const jwtSecret = process.env.JWT_SECRET || 'pailatododevelopmentjwtsecretmustbelongandsecure';
  try {
    const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string };
    
    // Validate that the user exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'User associated with this token no longer exists' });
    }

    req.userId = decoded.userId;
    req.email = decoded.email;
    next();
  } catch (jwtError) {
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }
}
