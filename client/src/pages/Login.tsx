import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { User, Lock, ShieldCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const { loginLocal, loginWithGoogle, firebaseActive } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      showToast('Please fill in all fields', 'warning');
      return;
    }

    if (username.includes('@')) {
      showToast('Username must not contain the @ symbol', 'warning');
      return;
    }

    try {
      setLoading(true);
      await loginLocal(username, password);
      navigate('/');
    } catch (err) {
      // Error is handled inside context toast
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      // Error toast inside context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 transition-colors duration-200">
      <div className="w-full max-w-md bg-card border border-border p-8 rounded-2xl soft-shadow">
        
        {/* App Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-accent flex items-center justify-center text-accent-foreground font-black text-2xl shadow-lg mb-3">
            P
          </div>
          <h1 className="font-bold text-2xl tracking-tight text-foreground">Welcome Back</h1>
          <p className="text-sm text-muted-foreground mt-1">Plan first, then do.</p>
        </div>

        {/* Sandbox Dev Mode Banner */}
        {!firebaseActive && (
          <div className="flex gap-2.5 items-start p-3.5 mb-6 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs leading-relaxed">
            <ShieldCheck className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Testing Phase Active</span>
              <p className="opacity-90 mt-0.5">Developed by: subaashchhetri</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Enter username (e.g. subash)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
              <button
                type="button"
                onClick={() => showToast('For Sandbox accounts, default is password123. For Firebase setups, reset via Firebase Console.', 'info')}
                className="text-xs text-accent hover:underline focus:outline-none"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 shadow-lg"
          >
            {loading ? 'Processing...' : 'Sign In'}
          </button>
        </form>

        {/* Social Dividers */}
        <div className="relative flex py-5 items-center select-none">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-3 text-xs text-muted-foreground uppercase tracking-wider font-semibold">Or continue with</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        {/* Google SSO Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading || !firebaseActive}
          className={`w-full py-2.5 border border-border rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${
            firebaseActive 
              ? 'hover:bg-muted/50 active:scale-[0.99] cursor-pointer text-foreground' 
              : 'opacity-50 cursor-not-allowed bg-muted/20 text-muted-foreground'
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.69c-.29 1.5-.14 2.9-.96 3.9l3.07 2.4c1.8-1.67 2.94-4.13 2.94-7.13z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.07-2.4c-.9.6-2.01.99-3.32.99-2.55 0-4.71-1.72-5.49-4.04H1.85v2.48C3.84 21.94 7.69 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M6.51 15.64c-.2-.6-.31-1.24-.31-1.89s.11-1.29.31-1.89V9.38H1.85a12.01 12.01 0 0 0 0 9.77l4.66-3.51z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.69 0 3.84 2.06 1.85 5.25l4.66 3.51c.78-2.32 2.94-4.01 5.49-4.01z"
            />
          </svg>
          <span>Google Accounts</span>
        </button>

        {/* Signup Link */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/signup" className="text-accent font-semibold hover:underline">
            Create Account
          </Link>
        </div>

      </div>
    </div>
  );
};
