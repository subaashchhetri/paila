import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext.js';
import { 
  Users, 
  Search, 
  ShieldAlert, 
  Trash2, 
  LogOut, 
  UserCheck, 
  UserX, 
  Activity, 
  Wallet, 
  FileText, 
  RefreshCw, 
  MapPin, 
  Phone, 
  Briefcase, 
  Calendar,
  Lock,
  User as UserIcon
} from 'lucide-react';

interface UserProfile {
  name: string;
  phone?: string | null;
  address?: string | null;
  occupation?: string | null;
  onboardingCompleted: boolean;
  openingBalancesSetup: boolean;
  avatarUrl?: string | null;
}

interface User {
  id: string;
  email: string;
  createdAt: string;
  profile?: UserProfile | null;
  _count?: {
    wallets: number;
    todos: number;
    transactions: number;
    loansGiven: number;
    loansTaken: number;
  } | null;
}

interface Stats {
  totalCount: number;
  onboardedCount: number;
  pendingCount: number;
}

export const Admin: React.FC = () => {
  const { showToast } = useNotification();
  const navigate = useNavigate();

  // Auth States
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard States
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({ totalCount: 0, onboardedCount: 0, pendingCount: 0 });
  const [dataLoading, setDataLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Check if admin is already logged in
  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken) {
      setIsAdmin(true);
      fetchAdminData(adminToken);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      showToast('Please enter both username and password', 'warning');
      return;
    }

    try {
      setAuthLoading(true);
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('admin_token', data.token);
      setIsAdmin(true);
      showToast('Successfully logged in as administrator', 'success');
      fetchAdminData(data.token);
    } catch (err: any) {
      showToast(err.message || 'Invalid admin credentials', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAdmin(false);
    setUsers([]);
    setStats({ totalCount: 0, onboardedCount: 0, pendingCount: 0 });
    showToast('Logged out from admin panel', 'info');
  };

  const fetchAdminData = async (token: string) => {
    try {
      setDataLoading(true);
      const res = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          handleLogout();
          throw new Error('Session expired or unauthorized');
        }
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(data.users || []);
      setStats(data.stats || { totalCount: 0, onboardedCount: 0, pendingCount: 0 });
    } catch (err: any) {
      showToast(err.message || 'Failed to retrieve admin details', 'error');
    } finally {
      setDataLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      showToast('Unauthorized session', 'error');
      return;
    }

    try {
      setDeletingId(id);
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      showToast('User account successfully deleted', 'success');
      // Refresh local state lists
      setUsers(prev => prev.filter(u => u.id !== id));
      setStats(prev => {
        const wasOnboarded = users.find(u => u.id === id)?.profile?.onboardingCompleted;
        return {
          totalCount: prev.totalCount - 1,
          onboardedCount: wasOnboarded ? prev.onboardedCount - 1 : prev.onboardedCount,
          pendingCount: wasOnboarded ? prev.pendingCount : prev.pendingCount - 1
        };
      });
      setDeleteConfirmId(null);
    } catch (err: any) {
      showToast(err.message || 'Error occurred during deletion', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const name = user.profile?.name || '';
    const email = user.email || '';
    const phone = user.profile?.phone || '';
    const address = user.profile?.address || '';
    const occupation = user.profile?.occupation || '';
    const q = searchQuery.toLowerCase();
    
    return (
      name.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      phone.toLowerCase().includes(q) ||
      address.toLowerCase().includes(q) ||
      occupation.toLowerCase().includes(q)
    );
  });

  // Helper to format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 transition-colors duration-200">
        <div className="w-full max-w-md bg-card border border-border p-8 rounded-2xl soft-shadow transition-all duration-300 hover:scale-[1.01]">
          
          {/* App Branding */}
          <div className="flex flex-col items-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-accent flex items-center justify-center text-accent-foreground font-black text-2xl shadow-lg mb-3">
              A
            </div>
            <h1 className="font-bold text-2xl tracking-tight text-foreground">Admin Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Authorized Access Only</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Enter admin username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={authLoading}
                  className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authLoading}
                  className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 shadow-lg"
            >
              {authLoading ? 'Verifying...' : 'Sign In as Admin'}
            </button>
          </form>

          {/* Regular Login Link */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Want to go back?{' '}
            <button onClick={() => navigate('/login')} className="text-accent font-semibold hover:underline bg-transparent border-0 cursor-pointer">
              Go to User Login
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-card/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center text-accent-foreground font-black text-xl shadow-md">
            P
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Paila Todo</h1>
            <p className="text-xs text-muted-foreground">Control Center</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => fetchAdminData(localStorage.getItem('admin_token') || '')}
            disabled={dataLoading}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-all cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className={`h-4 w-4 ${dataLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="h-6 w-px bg-border" />
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-xl transition-all cursor-pointer border border-transparent hover:border-destructive/20"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
        
        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-card border border-border p-6 rounded-2xl soft-shadow flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Users Registered</p>
              <h3 className="text-3xl font-black mt-2 leading-none">
                {dataLoading ? <span className="h-8 w-16 block rounded bg-muted animate-pulse" /> : stats.totalCount}
              </h3>
              <p className="text-xs text-muted-foreground mt-2">All accounts in sqlite DB</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl soft-shadow flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Onboarding Completed</p>
              <h3 className="text-3xl font-black mt-2 leading-none text-emerald-500">
                {dataLoading ? <span className="h-8 w-16 block rounded bg-muted animate-pulse" /> : stats.onboardedCount}
              </h3>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.totalCount > 0 ? `${Math.round((stats.onboardedCount / stats.totalCount) * 100)}%` : '0%'} onboarding rate
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <UserCheck className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl soft-shadow flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Setup</p>
              <h3 className="text-3xl font-black mt-2 leading-none text-amber-500">
                {dataLoading ? <span className="h-8 w-16 block rounded bg-muted animate-pulse" /> : stats.pendingCount}
              </h3>
              <p className="text-xs text-muted-foreground mt-2">Accounts without complete profiles</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <UserX className="h-6 w-6" />
            </div>
          </div>

        </section>

        {/* Users Table Card */}
        <div className="bg-card border border-border rounded-2xl soft-shadow overflow-hidden flex flex-col">
          
          {/* Controls Bar */}
          <div className="p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-lg text-foreground">User Directory</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage registered accounts and review personal details</p>
            </div>
            
            {/* Search Input */}
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto w-full">
            {dataLoading && users.length === 0 ? (
              <div className="flex flex-col gap-3 p-6">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="h-16 w-full rounded-xl bg-muted/40 shimmer" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                <Users className="h-10 w-10 text-muted-foreground opacity-50" />
                <h4 className="font-semibold text-foreground mt-2">No Users Found</h4>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {searchQuery ? 'Adjust your search queries or filter attributes.' : 'No users have registered in the database yet.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-border bg-muted/10 text-muted-foreground text-xs font-semibold uppercase tracking-wider select-none">
                    <th className="p-4 pl-6">User Profile</th>
                    <th className="p-4">Contact Details</th>
                    <th className="p-4">Occupation</th>
                    <th className="p-4">Joined Date</th>
                    <th className="p-4 text-center">Activity Metrics</th>
                    <th className="p-4 text-center">Onboarding</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {filteredUsers.map((user) => {
                    const initials = user.profile?.name
                      ? user.profile.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
                      : user.email.substring(0, 2).toUpperCase();

                    return (
                      <tr 
                        key={user.id} 
                        className="hover:bg-muted/10 transition-colors duration-150 group"
                      >
                        {/* Name and Email */}
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-sm select-none border border-accent/20">
                              {user.profile?.avatarUrl ? (
                                <img 
                                  src={user.profile.avatarUrl} 
                                  alt="Avatar" 
                                  className="h-full w-full object-cover rounded-full"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                initials
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground group-hover:text-accent transition-colors leading-tight">
                                {user.profile?.name || 'Anonymous User'}
                              </span>
                              <span className="text-xs text-muted-foreground mt-0.5">{user.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Phone and Address */}
                        <td className="p-4">
                          <div className="flex flex-col gap-1 text-xs">
                            {user.profile?.phone ? (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3 flex-shrink-0" />
                                <span>{user.profile.phone}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40 italic">No phone</span>
                            )}
                            {user.profile?.address ? (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate max-w-[180px]" title={user.profile.address}>
                                  {user.profile.address}
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40 italic">No address</span>
                            )}
                          </div>
                        </td>

                        {/* Occupation */}
                        <td className="p-4">
                          {user.profile?.occupation ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted border border-border rounded-lg text-xs font-medium text-foreground">
                              <Briefcase className="h-3 w-3 text-muted-foreground" />
                              <span>{user.profile.occupation}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40 italic text-xs">Unspecified</span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="p-4">
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{formatDate(user.createdAt)}</span>
                          </span>
                        </td>

                        {/* Activity Metrics */}
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-3">
                            <div className="flex flex-col items-center" title={`${user._count?.wallets || 0} Wallets`}>
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Wallet className="h-3 w-3" />
                                <span className="font-semibold text-foreground">{user._count?.wallets || 0}</span>
                              </span>
                              <span className="text-[10px] text-muted-foreground/60 uppercase scale-90">Wallets</span>
                            </div>
                            
                            <div className="h-6 w-px bg-border/60" />

                            <div className="flex flex-col items-center" title={`${user._count?.todos || 0} Todos`}>
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <FileText className="h-3 w-3" />
                                <span className="font-semibold text-foreground">{user._count?.todos || 0}</span>
                              </span>
                              <span className="text-[10px] text-muted-foreground/60 uppercase scale-90">Todos</span>
                            </div>

                            <div className="h-6 w-px bg-border/60" />

                            <div className="flex flex-col items-center" title={`${user._count?.transactions || 0} Transactions`}>
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Activity className="h-3 w-3" />
                                <span className="font-semibold text-foreground">{user._count?.transactions || 0}</span>
                              </span>
                              <span className="text-[10px] text-muted-foreground/60 uppercase scale-90">Txns</span>
                            </div>
                          </div>
                        </td>

                        {/* Onboarding Badge */}
                        <td className="p-4 text-center">
                          {user.profile?.onboardingCompleted ? (
                            <span className="inline-flex items-center px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold rounded-full select-none">
                              Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-semibold rounded-full select-none">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Action buttons */}
                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => setDeleteConfirmId(user.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 rounded-xl transition-all cursor-pointer"
                            title="Delete this user account"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer stats helper */}
          <div className="p-4 border-t border-border bg-muted/5 flex justify-between items-center text-xs text-muted-foreground">
            <span>Showing {filteredUsers.length} of {users.length} registered users</span>
            <span className="flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              <span>Deleting users cascades to erase all database dependencies.</span>
            </span>
          </div>

        </div>

      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div 
            className="w-full max-w-md bg-card border border-border p-6 rounded-2xl soft-shadow flex flex-col gap-4 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3.5 items-start">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-lg text-foreground">Confirm Account Deletion</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Are you absolutely sure you want to delete this user? This action is <span className="text-destructive font-semibold">irreversible</span>.
                </p>
              </div>
            </div>

            <div className="p-3 bg-destructive/5 rounded-xl border border-destructive/10 text-destructive text-xs leading-relaxed">
              <strong>Caution:</strong> Doing this will permanently erase:
              <ul className="list-disc pl-5 mt-1 text-[11px] opacity-90 flex flex-col gap-0.5">
                <li>Their profile and authorization records</li>
                <li>All transaction logs and active wallet balances</li>
                <li>Routines, reminders, lists and attachment metadata</li>
                <li>All active loan metrics (given and taken)</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={deletingId !== null}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirmId && handleDeleteUser(deleteConfirmId)}
                disabled={deletingId !== null}
                className="px-4 py-2 bg-destructive text-destructive-foreground font-semibold rounded-xl text-xs hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {deletingId ? 'Deleting...' : 'Permanently Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
