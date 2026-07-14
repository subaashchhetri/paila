import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Download, 
  Trash2, 
  TrendingDown, 
  TrendingUp, 
  Layers,
  X,
  Wallet
} from 'lucide-react';


import { motion, AnimatePresence } from 'framer-motion';

export const Finance: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useNotification();

  // Financial status state
  const [balances, setBalances] = useState({ cash: 0, bank: 0, esewa: 0, total: 0 });
  const [stats, setStats] = useState({ income: 0, expense: 0, savings: 0 });
  
  // Ledger state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Forms active states
  const [formOpen, setFormOpen] = useState<'expense' | 'income' | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterWallet, setFilterWallet] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, amount-desc, amount-asc

  // Add transaction form fields
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState('Food'); // Expense category
  const [source, setSource] = useState('Salary'); // Income source
  const [wallet, setWallet] = useState<'Cash' | 'Bank' | 'eSewa'>('Cash');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));

  const fetchFinancials = async () => {
    try {
      if (!token) return;

      // 1. Wallets
      const walletsRes = await fetch('/api/wallets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (walletsRes.ok) {
        const walletsData = await walletsRes.json();
        setBalances(walletsData.summary);
      }

      // 2. Reports summary to calculate income/expense statistics
      const reportsRes = await fetch('/api/reports/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        
        // Sum total income vs expense for the current month
        let totalIncome = 0;
        let totalExpense = 0;
        
        // Use last element of lineChartData which represents current month
        const currentMonthData = reportsData.lineChartData[reportsData.lineChartData.length - 1];
        if (currentMonthData) {
          totalIncome = currentMonthData.income;
          totalExpense = currentMonthData.expense;
        }

        setStats({
          income: totalIncome,
          expense: totalExpense,
          savings: Math.max(0, totalIncome - totalExpense)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransactions = async () => {
    try {
      if (!token) return;
      setLoading(true);

      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', '10');
      if (search) queryParams.append('search', search);
      if (filterType) queryParams.append('type', filterType);
      if (filterWallet) queryParams.append('wallet', filterWallet);

      const res = await fetch(`/api/transactions?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Handle sorting in client side for simplicity or dynamic ease
        let list = [...data.transactions];
        if (sortBy === 'date-desc') {
          list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } else if (sortBy === 'date-asc') {
          list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        } else if (sortBy === 'amount-desc') {
          list.sort((a, b) => b.amount - a.amount);
        } else if (sortBy === 'amount-asc') {
          list.sort((a, b) => a.amount - b.amount);
        }

        setTransactions(list);
        setTotalCount(data.pagination.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, [token]);

  useEffect(() => {
    fetchTransactions();
  }, [token, search, filterType, filterWallet, page, sortBy]);

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      showToast('Amount must be positive', 'warning');
      return;
    }

    const endpoint = formOpen === 'expense' ? '/api/finance/expense' : '/api/finance/income';
    const payload = formOpen === 'expense'
      ? { amount, category, walletName: wallet, description, date }
      : { amount, source, walletName: wallet, description, date };

    try {
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
        showToast(`${formOpen === 'expense' ? 'Expense' : 'Income'} recorded successfully!`, 'success');
        setFormOpen(null);
        // Reset fields
        setAmount(0);
        setDescription('');
        
        // Refresh datasets
        fetchFinancials();
        fetchTransactions();
      } else {
        showToast(data.error || 'Transaction failure', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  const handleDeleteTransaction = async (item: any) => {
    if (!confirm('Are you sure you want to delete this record? This will adjust the wallet balance.')) return;

    // Determine type endpoint
    const endpoint = item.type === 'Expense' 
      ? `/api/finance/expense/${item.referenceId}` 
      : `/api/finance/income/${item.referenceId}`;

    try {
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        showToast('Record deleted and wallet balance adjusted.', 'success');
        fetchFinancials();
        fetchTransactions();
      } else {
        showToast(data.error || 'Failed to delete record', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  const handleExportCSV = async () => {
    try {
      if (!token) return;
      const res = await fetch('/api/transactions/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'paila_todo_transactions.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('CSV downloaded successfully!', 'success');
      }
    } catch (e) {
      showToast('Failed to export CSV', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Finance Ledger</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage Cash, Bank, and eSewa accounts.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setFormOpen('income')}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-all cursor-pointer shadow-sm"
          >
            <ArrowUpRight className="h-4.5 w-4.5" />
            <span>Add Income</span>
          </button>
          <button
            onClick={() => setFormOpen('expense')}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-500 text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-all cursor-pointer shadow-sm"
          >
            <ArrowDownLeft className="h-4.5 w-4.5" />
            <span>Add Expense</span>
          </button>
        </div>
      </section>

      {/* 2. Accounts & Available Balances */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Available Accounts</h2>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
          {/* Total Available Balance Card */}
          <div className="p-5 bg-primary text-primary-foreground rounded-2xl flex flex-col justify-between soft-shadow relative overflow-hidden group min-h-[110px]">
            <div className="absolute top-0 right-0 h-32 w-32 bg-white/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70">Total Available Balance</span>
              <Wallet className="h-4.5 w-4.5 text-accent" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black tracking-tight">Rs. {balances.total.toLocaleString()}</span>
              <p className="text-[9px] text-primary-foreground/70 font-semibold mt-0.5">CONSOLIDATED LEDGER</p>
            </div>
          </div>

          {/* Cash, Bank, eSewa Wallet Cards (lg:col-span-3 grid of 3 cols) */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Cash Wallet Card */}
            <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between soft-shadow hover:border-accent/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/15">
                  <span className="font-bold text-amber-500 text-sm">C</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Cash in Hand</span>
                  <span className="text-lg font-bold tracking-tight mt-0.5 block">Rs. {balances.cash.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Bank Wallet Card */}
            <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between soft-shadow hover:border-accent/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/15">
                  <span className="font-bold text-blue-500 text-sm">B</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Bank Account</span>
                  <span className="text-lg font-bold tracking-tight mt-0.5 block">Rs. {balances.bank.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* eSewa Wallet Card */}
            <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between soft-shadow hover:border-accent/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/15">
                  <span className="font-bold text-green-500 text-[11px]">E</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">eSewa Wallet</span>
                  <span className="text-lg font-bold tracking-tight mt-0.5 block">Rs. {balances.esewa.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Monthly Summary Analytics */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Monthly Analytics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Monthly Income stats */}
          <div className="p-4 bg-card border border-border rounded-2xl soft-shadow flex flex-col justify-between hover:border-green-500/30 transition-all">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Monthly Income</span>
              <span className="text-xl font-bold block mt-2 text-green-500">+ Rs. {stats.income.toLocaleString()}</span>
            </div>
            <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-4 pt-3 border-t border-border">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>Credited Ledger events</span>
            </div>
          </div>

          {/* Monthly Expense stats */}
          <div className="p-4 bg-card border border-border rounded-2xl soft-shadow flex flex-col justify-between hover:border-red-500/30 transition-all">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Monthly Expenses</span>
              <span className="text-xl font-bold block mt-2 text-red-500">- Rs. {stats.expense.toLocaleString()}</span>
            </div>
            <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-4 pt-3 border-t border-border">
              <TrendingDown className="h-3 w-3 text-red-500" />
              <span>Debited Ledger events</span>
            </div>
          </div>

          {/* Monthly Savings stats */}
          <div className="p-4 bg-card border border-border rounded-2xl soft-shadow flex flex-col justify-between hover:border-blue-500/30 transition-all">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Net Savings</span>
              <span className="text-xl font-bold block mt-2 text-accent">Rs. {stats.savings.toLocaleString()}</span>
            </div>
            <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-4 pt-3 border-t border-border">
              <Layers className="h-3 w-3 text-accent" />
              <span>Net Monthly Surplus</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Filter / Search / Export panel */}
      <section className="bg-card border border-border p-4 rounded-2xl soft-shadow flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search description/category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-muted/40 border border-border rounded-xl text-xs focus:outline-none"
          />
        </div>

        {/* Select filters */}
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs font-semibold focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
            <option value="LoanGiven">Loan Given</option>
            <option value="LoanTaken">Loan Taken</option>
          </select>

          <select
            value={filterWallet}
            onChange={(e) => setFilterWallet(e.target.value)}
            className="px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs font-semibold focus:outline-none"
          >
            <option value="">All Wallets</option>
            <option value="Cash">Cash in Hand</option>
            <option value="Bank">Bank Account</option>
            <option value="eSewa">eSewa Wallet</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs font-semibold focus:outline-none"
          >
            <option value="date-desc">Newest Date</option>
            <option value="date-asc">Oldest Date</option>
            <option value="amount-desc">Amount: High-Low</option>
            <option value="amount-asc">Amount: Low-High</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="p-2 border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all cursor-pointer"
            title="Export CSV"
          >
            <Download className="h-4.5 w-4.5" />
          </button>
        </div>
      </section>

      {/* 4. Transactions List Table */}
      <section className="bg-card border border-border rounded-2xl soft-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-xs font-bold text-muted-foreground uppercase">
                <th className="p-4">Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">Wallet</th>
                <th className="p-4">Category/Contact</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-right">Amount (NPR)</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">Loading transactions...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">No ledger events match current parameters.</td>
                </tr>
              ) : (
                transactions.map(item => {
                  let typeColor = 'text-green-500';
                  let prefix = '+';

                  if (item.type === 'Expense' || item.type === 'LoanGiven' || item.type === 'LoanTakenRepaid') {
                    typeColor = 'text-red-500';
                    prefix = '-';
                  }

                  return (
                    <tr key={item.id} className="border-b border-border hover:bg-muted/10 text-xs font-medium transition-colors">
                      <td className="p-4 whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="p-4 font-bold whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-extrabold ${
                          prefix === '+' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">{item.wallet?.name || 'Book Entry'}</td>
                      <td className="p-4 font-semibold">{item.category}</td>
                      <td className="p-4 text-muted-foreground max-w-xs truncate">{item.description || '-'}</td>
                      <td className={`p-4 text-right font-bold text-sm whitespace-nowrap ${typeColor}`}>
                        {prefix} Rs. {item.amount.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        {item.referenceId ? (
                          <button
                            onClick={() => handleDeleteTransaction(item)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-muted cursor-pointer transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Linked Settle</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Simple Pagination Controls */}
        <div className="flex justify-between items-center p-4 border-t border-border text-xs font-semibold">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-border rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Prev
          </button>
          <span className="text-muted-foreground">Page {page} of {Math.max(1, Math.ceil(totalCount / 10))}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={transactions.length < 10}
            className="px-3 py-1.5 border border-border rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Next
          </button>
        </div>
      </section>

      {/* Add Transaction Inline Modal */}
      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFormOpen(null)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border p-6 rounded-2xl soft-shadow relative z-10"
            >
              <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
                <h3 className="font-bold text-lg capitalize">Add {formOpen}</h3>
                <button onClick={() => setFormOpen(null)} className="p-1 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTransaction} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount (NPR) *</label>
                    <input
                      type="number"
                      required
                      value={amount === 0 ? '' : amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      placeholder="Rs. 500"
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm font-semibold focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Method</label>
                    <select
                      value={wallet}
                      onChange={(e: any) => setWallet(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none font-semibold"
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
                      {formOpen === 'expense' ? 'Category' : 'Source'}
                    </label>
                    {formOpen === 'expense' ? (
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none"
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
                        className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none"
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
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Details (e.g. Rice, Salary payment)"
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className={`w-full py-2.5 font-semibold text-white rounded-xl text-sm hover:opacity-90 transition-all cursor-pointer shadow-md mt-2 ${
                    formOpen === 'expense' ? 'bg-red-500' : 'bg-green-600'
                  }`}
                >
                  Record {formOpen === 'expense' ? 'Expense' : 'Income'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
