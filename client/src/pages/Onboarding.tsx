import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { 
  User as UserIcon, 
  MapPin, 
  Briefcase, 
  Phone,
  Wallet,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

import confetti from 'canvas-confetti';

export const Onboarding: React.FC = () => {
  const { user, completeOnboarding } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  // Step 1: Profile State
  const [name, setName] = useState(user?.profile.name || '');
  const [phone, setPhone] = useState(user?.profile.phone || '');
  const [address, setAddress] = useState(user?.profile.address || '');
  const [occupation, setOccupation] = useState(user?.profile.occupation || '');

  // Step 2: Wallet Balances
  const [cash, setCash] = useState<number>(0);
  const [bank, setBank] = useState<number>(0);
  const [esewa, setEsewa] = useState<number>(0);

  // Step 3: Weekly Routines
  const [routines, setRoutines] = useState<Record<string, string[]>>({
    Monday: [
      '5:00 AM | Wake up, drink water, freshen up, stretch',
      '6:00 AM – 11:00 AM | College / Study',
      '8:00 AM | Breakfast',
      '12:00 PM – 5:00 PM | Office / Client Work',
      '5:30 PM – 7:00 PM | Gym (Strength + Cardio)',
      '10:30 PM | Sleep'
    ],
    Tuesday: [
      '5:00 AM | Wake up, drink water, freshen up, stretch',
      '6:00 AM – 11:00 AM | College / Study',
      '8:00 AM | Breakfast',
      '12:00 PM – 5:00 PM | Office / Client Work',
      '5:30 PM – 7:00 PM | Gym (Strength + Cardio)',
      '10:30 PM | Sleep'
    ],
    Wednesday: [
      '5:00 AM | Wake up, drink water, freshen up, stretch',
      '6:00 AM – 11:00 AM | College / Study',
      '8:00 AM | Breakfast',
      '12:00 PM – 5:00 PM | Office / Client Work',
      '10:30 PM | Sleep'
    ],
    Thursday: [
      '5:00 AM | Wake up, drink water, freshen up, stretch',
      '6:00 AM – 11:00 AM | College / Study',
      '8:00 AM | Breakfast',
      '12:00 PM – 5:00 PM | Office / Client Work',
      '5:30 PM – 7:00 PM | Gym (Strength + Cardio)',
      '10:30 PM | Sleep'
    ],
    Friday: [
      '5:00 AM | Wake up, drink water, freshen up, stretch',
      '6:00 AM – 11:00 AM | College / Study',
      '8:00 AM | Breakfast',
      '12:00 PM – 5:00 PM | Office / Client Work',
      '10:30 PM | Sleep'
    ],
    Saturday: [
      '8:00 AM | Wake up & Breakfast',
      '10:00 AM – 1:00 PM | Grocery Shopping & Cleaning',
      '6:00 PM – 9:00 PM | Movie Night / Rest'
    ],
    Sunday: [
      '8:00 AM | Wake up & Breakfast',
      '11:00 AM – 2:00 PM | Planning Week & Self-care',
      '4:00 PM – 8:00 PM | Family Visit'
    ]
  });

  const [routineTime, setRoutineTime] = useState('');
  const [routineActivity, setRoutineActivity] = useState('');
  const [selectedDay, setSelectedDay] = useState('Monday');

  const parseRoutineItem = (itemString: string): { time: string; activity: string } => {
    if (itemString.includes('|')) {
      const parts = itemString.split('|');
      return {
        time: parts[0].trim(),
        activity: parts.slice(1).join('|').trim()
      };
    }
    const match = itemString.match(/^(?:\s*-\s*)?(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?(?:\s*[-–—]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)?)\s*(?:[:|]|\s+[-–—]\s+)\s*(.*)$/i);
    if (match) {
      return {
        time: match[1].trim(),
        activity: match[2].trim()
      };
    }
    return {
      time: '',
      activity: itemString.trim()
    };
  };

  const addRoutineItem = () => {
    if (!routineActivity.trim()) return;
    const formattedItem = routineTime.trim()
      ? `${routineTime.trim()} | ${routineActivity.trim()}`
      : routineActivity.trim();

    setRoutines(prev => ({
      ...prev,
      [selectedDay]: [...prev[selectedDay], formattedItem]
    }));
    setRoutineTime('');
    setRoutineActivity('');
  };

  const removeRoutineItem = (day: string, index: number) => {
    setRoutines(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index)
    }));
  };

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      showToast('Name is required', 'warning');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleFinish = async () => {
    try {
      await completeOnboarding({
        profile: { name, phone, address, occupation },
        wallets: { cash: Number(cash), bank: Number(bank), esewa: Number(esewa) },
        routines
      });

      // Confetti effect
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      navigate('/');
    } catch (error) {
      // Error toast is handled in completeOnboarding
    }
  };


  const stepsList = [
    { title: 'Profile Info', desc: 'Complete your personal details' },
    { title: 'Wallets Setup', desc: 'Enter opening cash/bank ledger values' },
    { title: 'Weekly routines', desc: 'Design default routines' }
  ];

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background py-12 px-4 transition-colors duration-200">
      
      {/* Container */}
      <div className="w-full max-w-2xl bg-card border border-border p-8 rounded-2xl soft-shadow">
        
        {/* Onboarding Header */}
        <div className="flex flex-col mb-8 text-center md:text-left md:flex-row md:justify-between md:items-center border-b border-border pb-6 gap-4">
          <div>
            <h1 className="font-bold text-2xl tracking-tight text-foreground">Welcome to Paila Todo</h1>
            <p className="text-sm text-muted-foreground mt-1">Let's set up your productivity environment.</p>
          </div>
          {/* Progress Indicators */}
          <div className="flex gap-2 justify-center">
            {[1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  step === i ? 'w-8 bg-accent' : step > i ? 'w-2.5 bg-accent/40' : 'w-2.5 bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step details banner */}
        <div className="mb-6 bg-muted/30 border border-border/50 p-4 rounded-xl flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center font-bold text-accent">
            {step}
          </div>
          <div>
            <h2 className="font-semibold text-sm">{stepsList[step - 1].title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{stepsList[step - 1].desc}</p>
          </div>
        </div>

        {/* Form Body */}
        <div className="min-h-[280px]">
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name *</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
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
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Cash in Hand */}
                <div className="p-4 bg-muted/20 border border-border rounded-2xl flex flex-col gap-3 soft-shadow">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cash in Hand</span>
                    <Wallet className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="relative mt-2">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">Rs.</span>
                    <input
                      type="number"
                      value={cash === 0 ? '' : cash}
                      onChange={(e) => setCash(Number(e.target.value))}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2 bg-card border border-border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                </div>

                {/* Bank balance */}
                <div className="p-4 bg-muted/20 border border-border rounded-2xl flex flex-col gap-3 soft-shadow">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bank Balance</span>
                    <Wallet className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="relative mt-2">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">Rs.</span>
                    <input
                      type="number"
                      value={bank === 0 ? '' : bank}
                      onChange={(e) => setBank(Number(e.target.value))}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2 bg-card border border-border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                </div>

                {/* eSewa Balance */}
                <div className="p-4 bg-muted/20 border border-border rounded-2xl flex flex-col gap-3 soft-shadow">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400">eSewa Balance</span>
                    <Wallet className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="relative mt-2">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">Rs.</span>
                    <input
                      type="number"
                      value={esewa === 0 ? '' : esewa}
                      onChange={(e) => setEsewa(Number(e.target.value))}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2 bg-card border border-border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-5"
            >
              {/* Day Selection Bar */}
              <div className="flex gap-1 overflow-x-auto pb-2 border-b border-border">
                {Object.keys(routines).map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
                      selectedDay === day 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>

              {/* Add routine item inputs */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={routineTime}
                  onChange={(e) => setRoutineTime(e.target.value)}
                  placeholder="Time (e.g., 5:00 AM)"
                  className="w-1/3 px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                <input
                  type="text"
                  value={routineActivity}
                  onChange={(e) => setRoutineActivity(e.target.value)}
                  placeholder="Activity (e.g., Wake up)"
                  onKeyDown={(e) => e.key === 'Enter' && addRoutineItem()}
                  className="flex-grow px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                <button
                  onClick={addRoutineItem}
                  className="px-3.5 py-2 bg-accent text-accent-foreground font-semibold rounded-xl text-sm cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>

              {/* Items List */}
              <div className="flex flex-col gap-2 p-4 bg-muted/10 border border-border rounded-2xl min-h-[150px] max-h-[300px] overflow-y-auto">
                {routines[selectedDay].length === 0 ? (
                  <span className="text-xs text-muted-foreground m-auto">No routine items set for {selectedDay}.</span>
                ) : (
                  <div className="flex flex-col divide-y divide-border/40">
                    {routines[selectedDay].map((item, idx) => {
                      const parsed = parseRoutineItem(item);
                      return (
                        <div 
                          key={idx}
                          className="flex items-center justify-between py-2 text-xs"
                        >
                          <div className="flex items-start gap-4 flex-grow">
                            <span className="font-bold text-foreground w-[120px] shrink-0">
                              {parsed.time || <span className="text-muted-foreground/20 font-normal italic">—</span>}
                            </span>
                            <span className="text-muted-foreground font-normal leading-relaxed">{parsed.activity}</span>
                          </div>
                          <button 
                            onClick={() => removeRoutineItem(selectedDay, idx)}
                            className="text-muted-foreground hover:text-red-500 cursor-pointer p-1 rounded-md hover:bg-muted shrink-0 ml-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Form Actions footer */}
        <div className="flex justify-between items-center border-t border-border pt-6 mt-8">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-border transition-all ${
              step === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/50 active:scale-[0.98] cursor-pointer'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4.5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground font-black rounded-xl text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
            >
              <CheckCircle2 className="h-4.5 w-4.5" />
              <span>Finish Setup</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
