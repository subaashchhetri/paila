import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { username: 'subash' }
  });

  if (existingUser) {
    console.log('Database already seeded or user exists.');
    return;
  }

  // 2. Create user with hashed password
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      username: 'subash',
      email: 'subash@paila.com',
      passwordHash: passwordHash,
      profile: {
        create: {
          name: 'Subash Adhikari',
          phone: '9841234567',
          address: 'Kathmandu, Nepal',
          occupation: 'Software Engineer',
          onboardingCompleted: true,
          openingBalancesSetup: true,
        }
      }
    }
  });

  console.log(`Created user with ID: ${user.id}`);

  // 3. Create Wallets with initial balances
  const walletsData = [
    { name: 'Cash', balance: 15000.0 },
    { name: 'Bank', balance: 55000.0 },
    { name: 'eSewa', balance: 12500.0 }
  ];

  const wallets: Record<string, any> = {};
  for (const w of walletsData) {
    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        name: w.name,
        balance: w.balance
      }
    });
    wallets[w.name] = wallet;
  }
  console.log('Created wallets.');

  // 4. Create Weekly Routines
  const routines = [
    { dayOfWeek: 'Monday', items: JSON.stringify(['Gym', 'Office', 'Study', 'Reading']) },
    { dayOfWeek: 'Tuesday', items: JSON.stringify(['Gym', 'Office', 'Study', 'Meditation']) },
    { dayOfWeek: 'Wednesday', items: JSON.stringify(['Office', 'Study', 'Running']) },
    { dayOfWeek: 'Thursday', items: JSON.stringify(['Gym', 'Office', 'Reading']) },
    { dayOfWeek: 'Friday', items: JSON.stringify(['Office', 'Study', 'Movie Night']) },
    { dayOfWeek: 'Saturday', items: JSON.stringify(['Hiking', 'Cleaning', 'Grocery Shopping']) },
    { dayOfWeek: 'Sunday', items: JSON.stringify(['Planning Week', 'Family Visit', 'Reading']) }
  ];

  for (const r of routines) {
    await prisma.weeklyRoutine.create({
      data: {
        userId: user.id,
        dayOfWeek: r.dayOfWeek,
        items: r.items
      }
    });
  }
  console.log('Created weekly routines.');

  // 5. Create Todos
  const todos = [
    {
      title: 'Complete Project Architecture Review',
      description: 'Review the backend schemas and routing system design',
      priority: 'High',
      category: 'Work',
      status: 'Completed',
      deadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      reminder: true,
      notes: 'Completed all steps successfully.'
    },
    {
      title: 'Submit Monthly Financial Statements',
      description: 'Submit all invoice details to the finance department',
      priority: 'High',
      category: 'Finance',
      status: 'Pending',
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // in 2 days
      reminder: true,
      notes: 'Need to download bank statements first.'
    },
    {
      title: 'Read 2 Chapters of Clean Code',
      description: 'Read the section on system design and formatting',
      priority: 'Medium',
      category: 'Study',
      status: 'Pending',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // in 5 days
      repeat: 'Weekly'
    },
    {
      title: 'Water the Balcony Plants',
      priority: 'Low',
      category: 'Personal',
      status: 'Pending',
      deadline: new Date(),
      repeat: 'Daily'
    },
    {
      title: 'Gym Workout - Upper Body Split',
      priority: 'Medium',
      category: 'Health',
      status: 'Completed',
      deadline: new Date(Date.now() - 4 * 60 * 60 * 1000)
    }
  ];

  for (const t of todos) {
    await prisma.todo.create({
      data: {
        userId: user.id,
        ...t
      }
    });
  }
  console.log('Created todos.');

  // 6. Create Finance History (Incomes & Expenses)
  // Income 1
  const income1 = await prisma.income.create({
    data: {
      userId: user.id,
      walletId: wallets['Bank'].id,
      amount: 60000.0,
      source: 'Salary',
      description: 'Monthly payroll',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
    }
  });
  await prisma.transaction.create({
    data: {
      userId: user.id,
      walletId: wallets['Bank'].id,
      type: 'Income',
      amount: 60000.0,
      category: 'Salary',
      description: 'Monthly payroll',
      date: income1.date,
      referenceId: income1.id
    }
  });

  // Income 2
  const income2 = await prisma.income.create({
    data: {
      userId: user.id,
      walletId: wallets['eSewa'].id,
      amount: 15000.0,
      source: 'Freelancing',
      description: 'Landing page development commission',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    }
  });
  await prisma.transaction.create({
    data: {
      userId: user.id,
      walletId: wallets['eSewa'].id,
      type: 'Income',
      amount: 15000.0,
      category: 'Freelancing',
      description: 'Landing page development commission',
      date: income2.date,
      referenceId: income2.id
    }
  });

  // Expense 1
  const expense1 = await prisma.expense.create({
    data: {
      userId: user.id,
      walletId: wallets['Cash'].id,
      amount: 1200.0,
      category: 'Food',
      description: 'Dinner at Thakali restaurant',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  });
  await prisma.transaction.create({
    data: {
      userId: user.id,
      walletId: wallets['Cash'].id,
      type: 'Expense',
      amount: 1200.0,
      category: 'Food',
      description: 'Dinner at Thakali restaurant',
      date: expense1.date,
      referenceId: expense1.id
    }
  });

  // Expense 2
  const expense2 = await prisma.expense.create({
    data: {
      userId: user.id,
      walletId: wallets['Bank'].id,
      amount: 4500.0,
      category: 'Shopping',
      description: 'Winter Jacket from Bhatbhateni',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  });
  await prisma.transaction.create({
    data: {
      userId: user.id,
      walletId: wallets['Bank'].id,
      type: 'Expense',
      amount: 4500.0,
      category: 'Shopping',
      description: 'Winter Jacket from Bhatbhateni',
      date: expense2.date,
      referenceId: expense2.id
    }
  });

  // Expense 3
  const expense3 = await prisma.expense.create({
    data: {
      userId: user.id,
      walletId: wallets['eSewa'].id,
      amount: 500.0,
      category: 'Bills',
      description: 'Ncell Internet Pack recharge',
      date: new Date()
    }
  });
  await prisma.transaction.create({
    data: {
      userId: user.id,
      walletId: wallets['eSewa'].id,
      type: 'Expense',
      amount: 500.0,
      category: 'Bills',
      description: 'Ncell Internet Pack recharge',
      date: expense3.date,
      referenceId: expense3.id
    }
  });

  console.log('Created incomes and expenses.');

  // 7. Create Loans (Given & Taken)
  // Loan Given (to Ram)
  const loanGiven = await prisma.loanGiven.create({
    data: {
      userId: user.id,
      name: 'Ram Shrestha',
      phone: '9851000222',
      amount: 10000.0,
      purpose: 'Emergency medical bills',
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      expectedReturnDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: 'Pending',
      notes: 'Ram promised to return it as soon as he gets paid.'
    }
  });
  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: 'LoanGiven',
      amount: 10000.0,
      category: 'Ram Shrestha',
      description: 'Loan Given - Emergency medical bills',
      date: loanGiven.date,
      referenceId: loanGiven.id
    }
  });

  // Loan Taken (from Sita)
  const loanTaken = await prisma.loanTaken.create({
    data: {
      userId: user.id,
      name: 'Sita Gurung',
      phone: '9801234567',
      amount: 5000.0,
      purpose: 'Bought office chair',
      date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      expectedReturnDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      status: 'Pending',
      notes: 'Need to transfer this back via eSewa.'
    }
  });
  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: 'LoanTaken',
      amount: 5000.0,
      category: 'Sita Gurung',
      description: 'Loan Taken - Bought office chair',
      date: loanTaken.date,
      referenceId: loanTaken.id
    }
  });

  console.log('Created loans.');

  // 8. Create Notifications
  const notifications = [
    {
      type: 'MorningGreeting',
      title: 'Good Morning, Subash!',
      message: 'Plan first, then do. Keep up your productivity streak today!',
      isRead: false
    },
    {
      type: 'TaskReminder',
      title: 'Task Overdue',
      message: 'Complete Project Architecture Review is pending review.',
      isRead: true
    },
    {
      type: 'DailyMotivation',
      title: 'Daily Inspiration',
      message: 'Your future is created by what you do today, not tomorrow.',
      isRead: false
    }
  ];

  for (const n of notifications) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        ...n
      }
    });
  }

  console.log('Created notifications.');
  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
