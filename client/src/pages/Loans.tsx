import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { 
  Handshake, 
  Plus, 
  Calendar, 
  Phone, 
  Trash2, 
  CheckCircle, 
  ArrowUpRight,
  ArrowDownRight,
  X
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';

export const Loans: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useNotification();

  // Loan datasets
  const [loansGiven, setLoansGiven] = useState<any[]>([]);
  const [loansTaken, setLoansTaken] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState({
    totalGiven: 0,
    totalTaken: 0,
    pendingReceivable: 0,
    pendingPayable: 0,
    upcomingDues: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  // New Loan Form modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [loanType, setLoanType] = useState<'given' | 'taken'>('given');

  // New Loan Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [purpose, setPurpose] = useState('');
  const [date] = useState(new Date().toISOString().substring(0, 10));
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [walletName, setWalletName] = useState<'Cash' | 'Bank' | 'eSewa' | 'None'>('None');

  // Settle/Payback action modal state
  const [paybackModalOpen, setPaybackModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<{ id: string; type: 'given' | 'taken'; amount: number; name: string } | null>(null);
  const [paybackAmount, setPaybackAmount] = useState<number>(0);
  const [paybackWallet, setPaybackWallet] = useState<'Cash' | 'Bank' | 'eSewa'>('Cash');
  const [paybackStatus, setPaybackStatus] = useState<'Pending' | 'Partial' | 'Completed'>('Completed');

  const fetchLoans = async () => {
    try {
      if (!token) return;
      setLoading(true);
      const res = await fetch('/api/loans', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoansGiven(data.loansGiven);
        setLoansTaken(data.loansTaken);
        setDashboard(data.dashboard);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [token]);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || amount <= 0) {
      showToast('Please fill in required fields', 'warning');
      return;
    }

    const endpoint = loanType === 'given' ? '/api/loans/given' : '/api/loans/taken';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          phone,
          amount,
          purpose,
          date,
          expectedReturnDate: expectedReturnDate || null,
          walletName
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(`Loan record added successfully!`, 'success');
        setAddModalOpen(false);
        // Reset fields
        setName('');
        setPhone('');
        setAmount(0);
        setPurpose('');
        setExpectedReturnDate('');
        setWalletName('None');
        
        fetchLoans();
      } else {
        showToast(data.error || 'Failed to record loan', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  const handleOpenPaybackModal = (loan: any, type: 'given' | 'taken') => {
    setSelectedLoan({
      id: loan.id,
      type,
      amount: loan.amount,
      name: loan.name
    });
    setPaybackAmount(loan.amount);
    setPaybackStatus('Completed');
    setPaybackModalOpen(true);
  };

  const handleUpdatePayback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    try {
      const res = await fetch(`/api/loans/${selectedLoan.type}/${selectedLoan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: paybackStatus,
          paybackAmount,
          walletName: paybackWallet
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast('Loan record updated successfully!', 'success');
        setPaybackModalOpen(false);
        fetchLoans();
      } else {
        showToast(data.error || 'Failed to settle payment', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  const handleDelete = async (id: string, type: 'given' | 'taken') => {
    if (!confirm('Are you sure you want to delete this loan record? This deletes transaction entries.')) return;
    try {
      const res = await fetch(`/api/loans/${type}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Loan record deleted.', 'success');
        fetchLoans();
      }
    } catch (e) {
      showToast('Failed to delete record', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <div className="h-8 w-40 shimmer rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 shimmer rounded-2xl" />)}
        </div>
        <div className="h-96 shimmer rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. Header */}
      <section className="flex justify-between items-center border-b border-border/50 pb-5">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Loan Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Track amounts lent out and borrowed.</p>
        </div>
        <button
          onClick={() => {
            setLoanType('given');
            setAddModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-foreground font-semibold rounded-xl text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>New Loan Record</span>
        </button>
      </section>

      {/* 2. Summaries stats dashboard */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total given */}
        <div className="p-4.5 bg-card border border-border rounded-2xl soft-shadow flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-500">
            <Handshake className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold block">Rs. {dashboard.totalGiven.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Lent Out</span>
          </div>
        </div>

        {/* Total Taken */}
        <div className="p-4.5 bg-card border border-border rounded-2xl soft-shadow flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-pink-500/10 border border-pink-500/15 flex items-center justify-center text-pink-500">
            <Handshake className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold block">Rs. {dashboard.totalTaken.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Borrowed</span>
          </div>
        </div>

        {/* Net Receivable */}
        <div className="p-4.5 bg-card border border-border rounded-2xl soft-shadow flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-500/10 border border-green-500/15 flex items-center justify-center text-green-500">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold block text-green-500">Rs. {dashboard.pendingReceivable.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Pending Receivable</span>
          </div>
        </div>

        {/* Net Payable */}
        <div className="p-4.5 bg-card border border-border rounded-2xl soft-shadow flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center justify-center text-red-500">
            <ArrowDownRight className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold block text-red-500">Rs. {dashboard.pendingPayable.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Pending Payable</span>
          </div>
        </div>
      </section>

      {/* 3. Detailed splits given vs taken */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Loans Given Section */}
        <div className="p-5 bg-card border border-border rounded-2xl soft-shadow flex flex-col gap-4">
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest px-1">Loans Given (Receivable Ledger)</h3>
          
          <div className="flex flex-col gap-3">
            {loansGiven.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-10 border border-dashed border-border rounded-xl">No loans given listed.</p>
            ) : (
              loansGiven.map(loan => (
                <div 
                  key={loan.id}
                  className={`p-4 border rounded-xl flex flex-col gap-3 ${
                    loan.status === 'Completed' ? 'border-border opacity-70' : 'border-green-500/30 bg-green-500/[0.01]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-sm">{loan.name}</h4>
                      {loan.phone && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-semibold">
                          <Phone className="h-3 w-3" /> {loan.phone}
                        </p>
                      )}
                    </div>
                    <span className="text-base font-extrabold text-green-500">Rs. {loan.amount.toLocaleString()}</span>
                  </div>

                  {loan.purpose && <p className="text-xs text-muted-foreground">{loan.purpose}</p>}

                  {loan.expectedReturnDate && (
                    <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> 
                      <span>Due: {new Date(loan.expectedReturnDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  {loan.notes && (
                    <p className="text-[10px] font-medium text-muted-foreground/80 bg-muted/40 p-2 border border-border/50 rounded-lg whitespace-pre-line leading-relaxed">
                      {loan.notes}
                    </p>
                  )}

                  {/* Actions buttons */}
                  <div className="flex justify-between items-center border-t border-border pt-3.5 mt-1">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      loan.status === 'Completed' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {loan.status}
                    </span>

                    <div className="flex items-center gap-2">
                      {loan.status !== 'Completed' && (
                        <button
                          onClick={() => handleOpenPaybackModal(loan, 'given')}
                          className="px-2.5 py-1 bg-green-500 text-white rounded-lg text-xs font-semibold cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-1"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Settle Payback</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(loan.id, 'given')}
                        className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-muted cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Loans Taken Section */}
        <div className="p-5 bg-card border border-border rounded-2xl soft-shadow flex flex-col gap-4">
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest px-1">Loans Taken (Payable Ledger)</h3>

          <div className="flex flex-col gap-3">
            {loansTaken.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-10 border border-dashed border-border rounded-xl">No loans taken listed.</p>
            ) : (
              loansTaken.map(loan => (
                <div 
                  key={loan.id}
                  className={`p-4 border rounded-xl flex flex-col gap-3 ${
                    loan.status === 'Completed' ? 'border-border opacity-70' : 'border-red-500/30 bg-red-500/[0.01]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-sm">{loan.name}</h4>
                      {loan.phone && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-semibold">
                          <Phone className="h-3 w-3" /> {loan.phone}
                        </p>
                      )}
                    </div>
                    <span className="text-base font-extrabold text-red-500">Rs. {loan.amount.toLocaleString()}</span>
                  </div>

                  {loan.purpose && <p className="text-xs text-muted-foreground">{loan.purpose}</p>}

                  {loan.expectedReturnDate && (
                    <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> 
                      <span>Due: {new Date(loan.expectedReturnDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  {loan.notes && (
                    <p className="text-[10px] font-medium text-muted-foreground/80 bg-muted/40 p-2 border border-border/50 rounded-lg whitespace-pre-line leading-relaxed">
                      {loan.notes}
                    </p>
                  )}

                  {/* Actions buttons */}
                  <div className="flex justify-between items-center border-t border-border pt-3.5 mt-1">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      loan.status === 'Completed' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {loan.status}
                    </span>

                    <div className="flex items-center gap-2">
                      {loan.status !== 'Completed' && (
                        <button
                          onClick={() => handleOpenPaybackModal(loan, 'taken')}
                          className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-xs font-semibold cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-1"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Settle Repay</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(loan.id, 'taken')}
                        className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-muted cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </section>

      {/* 4. Upcoming schedules alerts */}
      <section className="bg-card border border-border p-5 rounded-2xl soft-shadow flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Upcoming Settlement Deadlines</h3>
        <div className="flex flex-col gap-2">
          {dashboard.upcomingDues.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">No pending settlement dates tracked.</p>
          ) : (
            dashboard.upcomingDues.map((due, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-3 bg-muted/20 border border-border/50 rounded-xl text-xs font-semibold"
              >
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-extrabold ${
                    due.type === 'Given' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {due.type === 'Given' ? 'Receivable' : 'Payable'}
                  </span>
                  <span>{due.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground font-semibold">Due: {new Date(due.dueDate).toLocaleDateString()}</span>
                  <span className="font-extrabold text-foreground">Rs. {due.amount}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Modals */}
      {/* 1. New Loan Modal */}
      <AnimatePresence>
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddModalOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border p-6 rounded-2xl soft-shadow relative z-10"
            >
              <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
                <h3 className="font-bold text-lg">Create Loan record</h3>
                <button onClick={() => setAddModalOpen(false)} className="p-1 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateLoan} className="flex flex-col gap-4">
                <div className="flex gap-2 p-1 bg-muted/40 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setLoanType('given')}
                    className={`flex-grow py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      loanType === 'given' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    Lend Money (Lent Out)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoanType('taken')}
                    className={`flex-grow py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      loanType === 'taken' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    Borrow Money (Borrowed)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ram Shrestha"
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9851000000"
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none"
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
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm font-semibold focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Link Wallet (Settle Ledger)</label>
                    <select
                      value={walletName}
                      onChange={(e: any) => setWalletName(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none font-semibold"
                    >
                      <option value="None">None (Book entries only)</option>
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
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="Medical help, shop bills"
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Return Deadline</label>
                    <input
                      type="date"
                      value={expectedReturnDate}
                      onChange={(e) => setExpectedReturnDate(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-accent text-accent-foreground font-semibold rounded-xl text-sm hover:opacity-90 transition-all cursor-pointer shadow-md mt-2"
                >
                  Create Record
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Settle Payback Modal */}
      <AnimatePresence>
        {paybackModalOpen && selectedLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPaybackModalOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border p-6 rounded-2xl soft-shadow relative z-10"
            >
              <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
                <h3 className="font-bold text-lg">Settle Loan Payment</h3>
                <button onClick={() => setPaybackModalOpen(false)} className="p-1 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdatePayback} className="flex flex-col gap-4">
                <div className="p-4 bg-muted/20 border border-border rounded-xl text-xs font-semibold leading-relaxed">
                  <span className="text-muted-foreground block">Settle transaction details:</span>
                  <span className="font-extrabold text-foreground block mt-1">
                    {selectedLoan.type === 'given' ? 'Receiving payback from' : 'Paying back to'}: {selectedLoan.name}
                  </span>
                  <span className="font-extrabold text-foreground block">
                    Outstanding balance: Rs. {selectedLoan.amount.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Amount (NPR)</label>
                    <input
                      type="number"
                      required
                      value={paybackAmount === 0 ? '' : paybackAmount}
                      onChange={(e) => setPaybackAmount(Number(e.target.value))}
                      placeholder="Rs. 5000"
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm font-semibold focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Settlement Wallet</label>
                    <select
                      value={paybackWallet}
                      onChange={(e: any) => setPaybackWallet(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none font-semibold"
                    >
                      <option value="Cash">Cash in Hand</option>
                      <option value="Bank">Bank Account</option>
                      <option value="eSewa">eSewa Wallet</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Next Loan Status</label>
                  <select
                    value={paybackStatus}
                    onChange={(e: any) => setPaybackStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none font-semibold"
                  >
                    <option value="Completed">Completed (Fully Settled)</option>
                    <option value="Partial">Partial (Partial Repayment)</option>
                    <option value="Pending">Pending (Unsettled)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 transition-all cursor-pointer shadow-md mt-2"
                >
                  Record Settle Transaction
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
