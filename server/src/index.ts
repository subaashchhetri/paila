import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

// Routes imports (will be created next)
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import walletRoutes from './routes/wallet.js';
import todoRoutes from './routes/todo.js';
import routineRoutes from './routes/routine.js';
import financeRoutes from './routes/finance.js';
import loanRoutes from './routes/loan.js';
import transactionRoutes from './routes/transaction.js';
import reportRoutes from './routes/report.js';
import notificationRoutes from './routes/notification.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();

// Security and utility middleware
app.use(helmet());
app.use(cors({
  origin: '*', // For local development. Can be restricted to client URLs in production.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Rate Limiting to prevent brute-force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Paila Todo API - Plan first, then do.' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Database connectivity check & startup
async function startServer() {
  try {
    await prisma.$connect();
    console.log('Successfully connected to the database.');
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server due to database connection error:', error);
    process.exit(1);
  }
}

startServer();

export { prisma };
