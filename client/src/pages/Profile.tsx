import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Moon, 
  Sun, 
  Globe, 
  Bell, 
  Trash2, 
  Save
} from 'lucide-react';


export const Profile: React.FC = () => {
  const { user, token, deleteAccount, updateProfileState } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useNotification();

  // Edit details form states
  const [name, setName] = useState(user?.profile.name || '');
  const [phone, setPhone] = useState(user?.profile.phone || '');
  const [address, setAddress] = useState(user?.profile.address || '');
  const [occupation, setOccupation] = useState(user?.profile.occupation || '');
  const [loading, setLoading] = useState(false);

  // Settings states
  const [language, setLanguage] = useState('English');
  const [taskReminder, setTaskReminder] = useState(true);
  const [financeReminder, setFinanceReminder] = useState(true);


  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name cannot be empty', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          phone,
          address,
          occupation
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast('Profile updated successfully!', 'success');
        updateProfileState(data.profile);
      } else {
        showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = () => {
    showToast('Preferences saved successfully!', 'success');
  };

  const handleDeleteAccount = async () => {
    const doubleCheck = confirm('WARNING: Are you sure you want to delete your account? This action is permanent and will delete all your tasks, wallet records, and transaction history.');
    if (!doubleCheck) return;

    try {
      setLoading(true);
      await deleteAccount();
    } catch (err) {
      // Error handles in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      {/* 1. Header */}
      <section className="border-b border-border/50 pb-5">
        <h1 className="font-bold text-2xl tracking-tight">Account & Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure profile details, notification schedules, and preferences.</p>
      </section>

      {/* 2. Content grids */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card Update */}
        <div className="lg:col-span-2 p-6 bg-card border border-border rounded-2xl soft-shadow flex flex-col gap-5">
          <h2 className="font-bold text-base leading-none border-b border-border pb-3">Personal Details</h2>

          <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Username</label>
                <div className="relative opacity-60">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    disabled
                    value={user?.username || ''}
                    className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
                <div className="relative opacity-60">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name *</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Subash Adhikari"
                    className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9841234567"
                    className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Kathmandu, Nepal"
                    className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Occupation</label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Software Engineer"
                    className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4.5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 self-end shadow-sm"
            >
              <Save className="h-4.5 w-4.5" />
              <span>{loading ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </form>
        </div>

        {/* Preferences / Custom controls */}
        <div className="flex flex-col gap-6">
          
          {/* General preferences */}
          <div className="p-6 bg-card border border-border rounded-2xl soft-shadow flex flex-col gap-5">
            <h2 className="font-bold text-base leading-none border-b border-border pb-3">Preferences</h2>

            <div className="flex flex-col gap-4">
              
              {/* Dark mode select */}
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-muted-foreground flex items-center gap-2">
                  {theme === 'light' ? <Sun className="h-4.5 w-4.5 text-yellow-500" /> : <Moon className="h-4.5 w-4.5 text-indigo-400" />}
                  Theme Mode
                </span>
                <button
                  onClick={toggleTheme}
                  className="px-3.5 py-1.5 border border-border hover:bg-muted text-xs rounded-xl font-bold cursor-pointer transition-all uppercase"
                >
                  {theme === 'light' ? 'Light' : 'Dark'}
                </button>
              </div>

              {/* Language Selector */}
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Globe className="h-4.5 w-4.5 text-accent" />
                  Language
                </span>
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    showToast(`Language set to ${e.target.value}!`, 'info');
                  }}
                  className="px-2.5 py-1 border border-border bg-card rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="English">English</option>
                  <option value="Nepali">Nepali (नेपाली)</option>
                </select>
              </div>

              {/* Notification preferences */}
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-1">
                  <Bell className="h-4 w-4 text-accent" /> Notification Prompts
                </span>
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <input
                    type="checkbox"
                    id="taskRem"
                    checked={taskReminder}
                    onChange={(e) => setTaskReminder(e.target.checked)}
                    className="h-4 w-4 accent-accent"
                  />
                  <label htmlFor="taskRem" className="cursor-pointer select-none">Task Settlement Alerts</label>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <input
                    type="checkbox"
                    id="finRem"
                    checked={financeReminder}
                    onChange={(e) => setFinanceReminder(e.target.checked)}
                    className="h-4 w-4 accent-accent"
                  />
                  <label htmlFor="finRem" className="cursor-pointer select-none">Weekly Financial Summary Alerts</label>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:opacity-90 transition-all cursor-pointer shadow-sm mt-1"
              >
                Apply Preferences
              </button>
            </div>
          </div>

          {/* Account Security / Danger Zone */}
          <div className="p-6 bg-card border border-border rounded-2xl soft-shadow flex flex-col gap-4">
            <h2 className="font-bold text-base leading-none border-b border-border pb-3 text-red-500">Danger Zone</h2>

            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground leading-normal">
                Deleting your account will permanently wipe out all productivity schedules, cash balance ledgers, and transactions database logs.
              </p>
              
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="w-full py-2.5 bg-red-500 text-white font-semibold rounded-xl text-xs hover:opacity-95 cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm mt-1"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Account Permanently</span>
              </button>
            </div>
          </div>

        </div>

      </section>
    </div>
  );
};
