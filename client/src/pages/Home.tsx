import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Plus, 
  Calendar,
  TrendingUp,
  X,
  Sparkles,
  ClipboardList
} from 'lucide-react';

interface QuickActionModalProps {
  type: 'task' | 'expense' | 'income' | 'loan';
  onClose: () => void;
  onSuccess: () => void;
}

export const Home: React.FC = () => {
  const { user, token } = useAuth();
  const { showToast } = useNotification();


  // Balance & Stats states
  const [balances, setBalances] = useState({ cash: 0, bank: 0, esewa: 0, total: 0 });
  const [todaySummary, setTodaySummary] = useState({ income: 0, expense: 0, completed: 0, pending: 0 });
  const [productivity, setProductivity] = useState({ rate: 0, total: 0, completed: 0 });
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [tomorrowTasks, setTomorrowTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Action Modal states
  const [activeModal, setActiveModal] = useState<'task' | 'expense' | 'income' | 'loan' | null>(null);

  // Fetch dashboard summary
  const fetchDashboardData = async () => {
    try {
      if (!token) return;

      const [walletsRes, reportsRes, todosRes] = await Promise.all([
        fetch('/api/wallets', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/reports/summary', { headers: { 'Authorization': `Bearer ${token}` } }),
        // Fetch today's tasks
        fetch('/api/todos?status=Pending', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (walletsRes.ok && reportsRes.ok && todosRes.ok) {
        const walletsData = await walletsRes.json();
        const reportsData = await reportsRes.json();
        const todosData = await todosRes.json();

        setBalances(walletsData.summary);
        
        // Calculate today's income & expenses from history (or fetch dedicated)
        // Here we query transactions to calculate today's summary
        const todayStr = new Date().toISOString().split('T')[0];
        const transactionsRes = await fetch(`/api/transactions?limit=100`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        
        if (transactionsRes.ok) {
          const transData = await transactionsRes.json();
          let inc = 0;
          let exp = 0;
          transData.transactions.forEach((t: any) => {
            const tDateStr = new Date(t.date).toISOString().split('T')[0];
            if (tDateStr === todayStr) {
              if (t.type === 'Income') inc += t.amount;
              if (t.type === 'Expense') exp += t.amount;
            }
          });

          setTodaySummary({
            income: inc,
            expense: exp,
            completed: reportsData.productivity.completed,
            pending: reportsData.productivity.pending
          });
        }

        setProductivity({
          rate: reportsData.productivity.completionRate,
          total: reportsData.productivity.total,
          completed: reportsData.productivity.completed
        });

        // Filter for tasks due today
        const filteredTasks = todosData.filter((todo: any) => {
          if (!todo.deadline) return true; // Show flexible tasks
          const tDate = new Date(todo.deadline).toISOString().split('T')[0];
          return tDate === todayStr;
        }).slice(0, 4);

        setTodayTasks(filteredTasks);

        // Filter for tasks due tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const filteredTomorrowTasks = todosData.filter((todo: any) => {
          if (!todo.deadline) return false;
          const tDate = new Date(todo.deadline).toISOString().split('T')[0];
          return tDate === tomorrowStr;
        }).slice(0, 4);

        setTomorrowTasks(filteredTomorrowTasks);
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  // Greeting helper
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning';
    if (hours < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getGreetingIcon = () => {
    const hours = new Date().getHours();
    if (hours < 17) return '☀️';
    return '🌙';
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleToggleTask = async (todoId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
      const targetTodo = todayTasks.find(t => t.id === todoId) || tomorrowTasks.find(t => t.id === todoId);
      if (!targetTodo) return;

      const res = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: targetTodo.title,
          priority: targetTodo.priority,
          category: targetTodo.category,
          status: newStatus,
          deadline: targetTodo.deadline,
          repeat: targetTodo.repeat,
          reminder: targetTodo.reminder,
          notes: targetTodo.notes
        })
      });

      if (res.ok) {
        showToast(`Task marked as ${newStatus.toLowerCase()}!`, 'success');
        fetchDashboardData();
      }
    } catch (e) {
      showToast('Failed to update task', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <div className="h-8 w-48 shimmer rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 shimmer rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 shimmer rounded-2xl" />
          <div className="h-80 shimmer rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full">
      {/* 1. Welcoming Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="font-bold text-2xl md:text-3xl tracking-tight flex items-center gap-2">
            <span>{getGreeting()}, {user?.profile.name.split(' ')[0]}</span>
            <span className="animate-pulse">{getGreetingIcon()}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
            <Calendar className="h-4 w-4 text-accent" />
            <span>{formatDate()}</span>
          </p>
        </div>

        {/* Daily Motivation banner */}
        <div className="bg-accent/10 border border-accent/15 py-2.5 px-4 rounded-xl text-xs text-accent font-semibold flex items-center gap-2 shadow-sm max-w-sm">
          <Sparkles className="h-4.5 w-4.5 text-accent flex-shrink-0" />
          <span className="italic leading-normal">"Plan first, then do. One step at a time."</span>
        </div>
      </section>

      {/* 2. Wallet Balance Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total available balance card */}
        <div className="p-5 bg-primary text-primary-foreground rounded-2xl flex flex-col justify-between soft-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-32 w-32 bg-white/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-widest text-primary-foreground/70">Total Available Balance</span>
            <Wallet className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black tracking-tight">Rs. {balances.total.toLocaleString()}</span>
            <div className="text-[10px] opacity-80 font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>Personal Net Worth</span>
            </div>
          </div>
        </div>

        {/* Cash wallet */}
        <div className="hidden sm:flex p-5 bg-card border border-border rounded-2xl flex-col justify-between soft-shadow hover:border-accent/40 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cash in Hand</span>
            <div className="h-8.5 w-8.5 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/15">
              <span className="font-bold text-amber-500 text-sm">C</span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold tracking-tight">Rs. {balances.cash.toLocaleString()}</span>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1">LIQUID ASSETS</p>
          </div>
        </div>

        {/* Bank Wallet */}
        <div className="hidden sm:flex p-5 bg-card border border-border rounded-2xl flex-col justify-between soft-shadow hover:border-accent/40 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Bank Account</span>
            <div className="h-8.5 w-8.5 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/15">
              <span className="font-bold text-blue-500 text-sm">B</span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold tracking-tight">Rs. {balances.bank.toLocaleString()}</span>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1">SAVINGS & CHECKING</p>
          </div>
        </div>

        {/* eSewa Wallet */}
        <div className="hidden sm:flex p-5 bg-card border border-border rounded-2xl flex-col justify-between soft-shadow hover:border-accent/40 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">eSewa Mobile Wallet</span>
            <div className="h-8.5 w-8.5 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/15">
              <span className="font-bold text-green-500 text-xs">E</span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold tracking-tight">Rs. {balances.esewa.toLocaleString()}</span>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1">DIGITAL LEDGER</p>
          </div>
        </div>
      </section>

      {/* 3. Quick Actions Grid */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Quick Action Desk</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setActiveModal('task')}
            className="flex items-center justify-center gap-2 p-3 bg-card border border-border rounded-xl font-semibold text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all soft-shadow"
          >
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </button>
          <button
            onClick={() => setActiveModal('expense')}
            className="flex items-center justify-center gap-2 p-3 bg-card border border-border rounded-xl font-semibold text-sm cursor-pointer hover:bg-red-500 hover:text-white hover:border-red-500 transition-all soft-shadow"
          >
            <ArrowDownRight className="h-4 w-4" />
            <span>Add Expense</span>
          </button>
          <button
            onClick={() => setActiveModal('income')}
            className="flex items-center justify-center gap-2 p-3 bg-card border border-border rounded-xl font-semibold text-sm cursor-pointer hover:bg-green-500 hover:text-white hover:border-green-500 transition-all soft-shadow"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>Add Income</span>
          </button>
          <button
            onClick={() => setActiveModal('loan')}
            className="flex items-center justify-center gap-2 p-3 bg-card border border-border rounded-xl font-semibold text-sm cursor-pointer hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all soft-shadow"
          >
            <Plus className="h-4 w-4" />
            <span>Add Loan</span>
          </button>
        </div>
      </section>

      {/* 4. Details Section (Today's Tasks & Productivity & Today's Summary) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's & Tomorrow's Tasks */}
        <div className="lg:col-span-2 p-6 bg-card border border-border rounded-2xl flex flex-col justify-between soft-shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Today's Focus Tasks */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-base md:text-lg leading-none">Today's Focus Tasks</h2>
                <Link to="/todo" className="text-xs text-accent font-semibold hover:underline">
                  View All
                </Link>
              </div>
              
              <div className="flex flex-col gap-2.5">
                {todayTasks.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-xl bg-muted/20">
                    <ClipboardList className="h-8 w-8 text-muted-foreground opacity-55" />
                    <span className="text-xs font-semibold text-muted-foreground text-center px-4">All clear for today! Create a task to get started.</span>
                  </div>
                ) : (
                  todayTasks.map(todo => (
                    <div 
                      key={todo.id}
                      className="flex items-center gap-3 p-3 bg-muted/20 border border-border/50 rounded-xl hover:border-border transition-all soft-shadow"
                    >
                      <button
                        onClick={() => handleToggleTask(todo.id, todo.status)}
                        className={`h-5.5 w-5.5 rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${
                          todo.status === 'Completed'
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-muted-foreground/40 hover:border-accent bg-card'
                        }`}
                      >
                        {todo.status === 'Completed' && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </button>
                      <div className="flex-grow min-w-0">
                        <h3 className={`text-sm font-semibold truncate ${todo.status === 'Completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {todo.title}
                        </h3>
                        {todo.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{todo.description}</p>
                        )}
                      </div>
                      {/* Priority Badge */}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        todo.priority === 'High' 
                          ? 'bg-red-500/10 text-red-500 border border-red-500/15' 
                          : todo.priority === 'Medium'
                          ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/15'
                          : 'bg-green-500/10 text-green-500 border border-green-500/15'
                      }`}>
                        {todo.priority}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Be Ready For (Tomorrow's Tasks) */}
            <div className="border-t md:border-t-0 md:border-l border-border/60 pt-6 md:pt-0 md:pl-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-base md:text-lg leading-none">Be Ready For...</h2>
                  <span className="text-[10px] font-bold bg-accent/15 text-accent px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Tomorrow
                  </span>
                </div>
                
                <div className="flex flex-col gap-2.5">
                  {tomorrowTasks.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-xl bg-muted/20">
                      <ClipboardList className="h-8 w-8 text-muted-foreground opacity-55" />
                      <span className="text-xs font-semibold text-muted-foreground text-center px-4">No tasks scheduled for tomorrow.</span>
                    </div>
                  ) : (
                    tomorrowTasks.map(todo => (
                      <div 
                        key={todo.id}
                        className="flex items-center gap-3 p-3 bg-muted/20 border border-border/50 rounded-xl hover:border-border transition-all soft-shadow"
                      >
                        <button
                          onClick={() => handleToggleTask(todo.id, todo.status)}
                          className={`h-5.5 w-5.5 rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${
                            todo.status === 'Completed'
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-muted-foreground/40 hover:border-accent bg-card'
                          }`}
                        >
                          {todo.status === 'Completed' && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                        <div className="flex-grow min-w-0">
                          <h3 className={`text-sm font-semibold truncate ${todo.status === 'Completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {todo.title}
                          </h3>
                          {todo.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{todo.description}</p>
                          )}
                        </div>
                        {/* Priority Badge */}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          todo.priority === 'High' 
                            ? 'bg-red-500/10 text-red-500 border border-red-500/15' 
                            : todo.priority === 'Medium'
                            ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/15'
                            : 'bg-green-500/10 text-green-500 border border-green-500/15'
                        }`}>
                          {todo.priority}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Productivity Circle & Daily summary */}
        <div className="p-6 bg-card border border-border rounded-2xl flex flex-col justify-between soft-shadow gap-5">
          <div>
            <h2 className="font-bold text-base mb-4 text-center lg:text-left">Productivity Rate</h2>
            
            {/* Circular progress loader */}
            <div className="flex justify-center my-2">
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="52"
                    className="stroke-muted"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="52"
                    className="stroke-accent transition-all duration-500"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 52}
                    strokeDashoffset={2 * Math.PI * 52 * (1 - productivity.rate / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black leading-none">{productivity.rate}%</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Completed</span>
                </div>
              </div>
            </div>

            <div className="flex justify-around text-center mt-3 border-t border-border pt-3.5">
              <div>
                <span className="text-lg font-extrabold block text-green-500">{productivity.completed}</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Completed</span>
              </div>
              <div className="border-l border-border h-8 my-auto" />
              <div>
                <span className="text-lg font-extrabold block text-amber-500">{productivity.total - productivity.completed}</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Pending</span>
              </div>
            </div>
          </div>

          {/* Today's monetary balances details */}
          <div className="bg-muted/30 border border-border/50 p-4 rounded-xl flex flex-col gap-2.5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Today's Transactions</h3>
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-muted-foreground flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4 text-green-500" /> Income
              </span>
              <span className="text-green-500">+ Rs. {todaySummary.income.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-muted-foreground flex items-center gap-1">
                <ArrowDownRight className="h-4 w-4 text-red-500" /> Expenses
              </span>
              <span className="text-red-500">- Rs. {todaySummary.expense.toLocaleString()}</span>
            </div>
          </div>
        </div>

      </section>

      {/* Action Modals */}
      <AnimatePresence>
        {activeModal && (
          <QuickActionModal 
            type={activeModal} 
            onClose={() => setActiveModal(null)} 
            onSuccess={() => {
              setActiveModal(null);
              fetchDashboardData();
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Internal Quick Action Modal component
const QuickActionModal: React.FC<QuickActionModalProps> = ({ type, onClose, onSuccess }) => {
  const { token } = useAuth();
  const { showToast } = useNotification();

  const [loading, setLoading] = useState(false);

  // Form states depending on type
  // Task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [taskCategory, setTaskCategory] = useState<any>('Personal');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskNotes, setTaskNotes] = useState('');

  // Income/Expense
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState('Food'); // default Expense category
  const [source, setSource] = useState('Salary'); // default Income category
  const [wallet, setWallet] = useState<'Cash' | 'Bank' | 'eSewa'>('Cash');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));

  // Loan
  const [loanType, setLoanType] = useState<'given' | 'taken'>('given');
  const [loanName, setLoanName] = useState('');
  const [loanPhone, setLoanPhone] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [loanDueDate, setLoanDueDate] = useState('');

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      setLoading(true);
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: taskTitle,
          priority: taskPriority,
          category: taskCategory,
          deadline: taskDeadline || null,
          notes: taskNotes
        })
      });

      if (res.ok) {
        showToast('Task added successfully!', 'success');
        onSuccess();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add task', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      showToast('Amount must be greater than 0', 'warning');
      return;
    }

    const endpoint = type === 'expense' ? '/api/finance/expense' : '/api/finance/income';
    const payload = type === 'expense' 
      ? { amount: Number(amount), category, walletName: wallet, description, date }
      : { amount: Number(amount), source, walletName: wallet, description, date };

    try {
      setLoading(true);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        showToast(`${type === 'expense' ? 'Expense' : 'Income'} recorded successfully!`, 'success');
        onSuccess();
      } else {
        showToast(data.error || 'Operation failed', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !loanName.trim()) {
      showToast('Please fill in required fields', 'warning');
      return;
    }

    const endpoint = loanType === 'given' ? '/api/loans/given' : '/api/loans/taken';

    try {
      setLoading(true);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: loanName,
          phone: loanPhone,
          amount: Number(amount),
          purpose: loanPurpose,
          expectedReturnDate: loanDueDate || null,
          walletName: wallet, // link cash transaction if chosen
          notes: ''
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(`Loan record created successfully!`, 'success');
        onSuccess();
      } else {
        showToast(data.error || 'Failed to record loan', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm cursor-pointer"
      />
      
      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg bg-card border border-border p-6 rounded-2xl soft-shadow relative z-10"
      >
        <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
          <h2 className="font-bold text-lg capitalize">Add {type}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Forms Switch */}
        {type === 'task' && (
          <form onSubmit={handleTaskSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task Title *</label>
              <input
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Finish proposal review"
                className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e: any) => setTaskPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</label>
                <select
                  value={taskCategory}
                  onChange={(e: any) => setTaskCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value="Personal">Personal</option>
                  <option value="Work">Work</option>
                  <option value="Study">Study</option>
                  <option value="Business">Business</option>
                  <option value="Finance">Finance</option>
                  <option value="Health">Health</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deadline Date</label>
              <input
                type="date"
                value={taskDeadline}
                onChange={(e) => setTaskDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</label>
              <textarea
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                placeholder="Optional notes or details..."
                rows={3}
                className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md mt-2"
            >
              {loading ? 'Adding...' : 'Save Task'}
            </button>
          </form>
        )}

        {(type === 'expense' || type === 'income') && (
          <form onSubmit={handleFinanceSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount (NPR) *</label>
                <input
                  type="number"
                  required
                  value={amount === 0 ? '' : amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Rs. 500"
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wallet / Wallet Link</label>
                <select
                  value={wallet}
                  onChange={(e: any) => setWallet(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value="Cash">Cash in Hand</option>
                  <option value="Bank">Bank Account</option>
                  <option value="eSewa">eSewa Wallet</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {type === 'expense' ? 'Expense Category' : 'Income Source'}
                </label>
                {type === 'expense' ? (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  >
                    <option value="Food">Food</option>
                    <option value="Fuel">Fuel</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Travel">Travel</option>
                    <option value="Business">Business</option>
                    <option value="Investment">Investment</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Medical">Medical</option>
                    <option value="Bills">Bills</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  >
                    <option value="Salary">Salary</option>
                    <option value="Business">Business</option>
                    <option value="Freelancing">Freelancing</option>
                    <option value="Gift">Gift</option>
                    <option value="Investment">Investment</option>
                    <option value="Other">Other</option>
                  </select>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaction Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details (e.g. Rice & Vegetables, Freelance UI mockups)"
                className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 font-semibold rounded-xl text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md mt-2 text-white ${
                type === 'expense' ? 'bg-red-500' : 'bg-green-600'
              }`}
            >
              {loading ? 'Recording...' : `Record ${type === 'expense' ? 'Expense' : 'Income'}`}
            </button>
          </form>
        )}

        {type === 'loan' && (
          <form onSubmit={handleLoanSubmit} className="flex flex-col gap-4">
            <div className="flex gap-2 p-1.5 bg-muted/40 border border-border rounded-xl">
              <button
                type="button"
                onClick={() => setLoanType('given')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  loanType === 'given' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Loan Given (Lent Out)
              </button>
              <button
                type="button"
                onClick={() => setLoanType('taken')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  loanType === 'taken' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Loan Taken (Borrowed)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={loanName}
                  onChange={(e) => setLoanName(e.target.value)}
                  placeholder="Ram Shrestha"
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Phone</label>
                <input
                  type="tel"
                  value={loanPhone}
                  onChange={(e) => setLoanPhone(e.target.value)}
                  placeholder="9851000000"
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount (NPR) *</label>
                <input
                  type="number"
                  required
                  value={amount === 0 ? '' : amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Rs. 5000"
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wallet Link (Ledger Settle)</label>
                <select
                  value={wallet}
                  onChange={(e: any) => setWallet(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 font-semibold"
                >
                  <option value="None">No wallet link (Book entries only)</option>
                  <option value="Cash">Cash in Hand</option>
                  <option value="Bank">Bank Account</option>
                  <option value="eSewa">eSewa Wallet</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purpose</label>
                <input
                  type="text"
                  value={loanPurpose}
                  onChange={(e) => setLoanPurpose(e.target.value)}
                  placeholder="Bought lunch, shop deposit"
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expected Return Date</label>
                <input
                  type="date"
                  value={loanDueDate}
                  onChange={(e) => setLoanDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-xl text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md mt-2"
            >
              {loading ? 'Recording...' : `Record Loan ${loanType === 'given' ? 'Given' : 'Taken'}`}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
