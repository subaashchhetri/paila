import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy,
  Calendar as CalendarIcon, 
  Folder, 
  Repeat, 
  BookOpen,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Todo: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useNotification();

  // Task states
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'calendar' | 'routines'>('list');

  // Stats
  const [stats, setStats] = useState({ completed: 0, pending: 0, overdue: 0, rate: 0 });

  // Selected date for calendar view
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().substring(0, 10));

  // Edit / Add modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [currentTodo, setCurrentTodo] = useState<any | null>(null); // Null means adding new

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [category, setCategory] = useState('Personal');
  const [deadline, setDeadline] = useState('');
  const [repeat, setRepeat] = useState('None');
  const [reminder, setReminder] = useState(false);
  const [notes, setNotes] = useState('');

  // Routines states
  const [routines, setRoutines] = useState<Record<string, string[]>>({});
  const [editingRoutines, setEditingRoutines] = useState(false);
  const [routinesText, setRoutinesText] = useState('');

  const serializeRoutines = (r: Record<string, string[]>) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days.map(day => {
      const items = r[day] || [];
      if (items.length === 0) {
        return `${day}:`;
      }
      return `${day}:\n${items.map(item => `- ${item}`).join('\n')}`;
    }).join('\n\n');
  };

  const parseRoutines = (text: string): Record<string, string[]> => {
    const result: Record<string, string[]> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    };
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let currentDay = '';

    text.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const cleanLine = trimmed.replace(/:$/, '').trim();
      const matchedDay = days.find(d => cleanLine.toLowerCase() === d.toLowerCase());
      if (matchedDay) {
        currentDay = matchedDay;
      } else if (currentDay) {
        let item = trimmed;
        if (item.startsWith('-') || item.startsWith('*')) {
          item = item.substring(1).trim();
        }
        if (item) {
          result[currentDay].push(item);
        }
      }
    });
    return result;
  };

  const fetchTodos = async () => {
    try {
      if (!token) return;
      const res = await fetch('/api/todos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTodos(data);

        // Process stats
        const completed = data.filter((t: any) => t.status === 'Completed').length;
        const pending = data.filter((t: any) => t.status === 'Pending').length;
        const overdue = data.filter((t: any) => {
          if (t.status === 'Completed') return false;
          if (!t.deadline) return false;
          return new Date(t.deadline).getTime() < Date.now();
        }).length;
        const total = data.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        setStats({ completed, pending, overdue, rate });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutines = async () => {
    try {
      if (!token) return;
      const res = await fetch('/api/routines', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRoutines(data);
        setRoutinesText(serializeRoutines(data));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTodos();
    fetchRoutines();
  }, [token]);

  const handleOpenAddModal = () => {
    setCurrentTodo(null);
    setTitle('');
    setDescription('');
    setPriority('Medium');
    setCategory('Personal');
    setDeadline('');
    setRepeat('None');
    setReminder(false);
    setNotes('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (todo: any) => {
    setCurrentTodo(todo);
    setTitle(todo.title);
    setDescription(todo.description || '');
    setPriority(todo.priority);
    setCategory(todo.category);
    setDeadline(todo.deadline ? new Date(todo.deadline).toISOString().substring(0, 10) : '');
    setRepeat(todo.repeat);
    setReminder(todo.reminder);
    setNotes(todo.notes || '');
    setModalOpen(true);
  };

  const handleSaveTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title,
      description,
      priority,
      category,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      repeat,
      reminder,
      notes
    };

    try {
      let res;
      if (currentTodo) {
        // Edit Mode
        res = await fetch(`/api/todos/${currentTodo.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Add Mode
        res = await fetch('/api/todos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast(currentTodo ? 'Task updated!' : 'Task added!', 'success');
        setModalOpen(false);
        fetchTodos();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save task', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  const handleToggleComplete = async (todo: any) => {
    const nextStatus = todo.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...todo,
          status: nextStatus
        })
      });

      if (res.ok) {
        showToast(`Task marked as ${nextStatus.toLowerCase()}`, 'success');
        fetchTodos();
      }
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Task deleted successfully', 'success');
        fetchTodos();
      }
    } catch (e) {
      showToast('Failed to delete task', 'error');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/todos/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Task cloned successfully!', 'success');
        fetchTodos();
      }
    } catch (e) {
      showToast('Failed to duplicate task', 'error');
    }
  };

  // Weekly Routines update handlers
  const handleSaveRoutines = async () => {
    try {
      const parsed = parseRoutines(routinesText);
      const res = await fetch('/api/routines', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(parsed)
      });
      if (res.ok) {
        showToast('Weekly routines updated successfully!', 'success');
        setRoutines(parsed);
        setRoutinesText(serializeRoutines(parsed));
        setEditingRoutines(false);
      }
    } catch (e) {
      showToast('Failed to update routines', 'error');
    }
  };



  // Helper calendar generation
  const renderCalendar = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const cells = [...blanks, ...days];

    return (
      <div className="bg-card border border-border p-5 rounded-2xl soft-shadow flex flex-col gap-4">
        <h3 className="font-bold text-center capitalize text-base">
          {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground uppercase border-b border-border pb-2">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((cell, idx) => {
            if (cell === null) return <div key={idx} />;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(cell).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const isToday = new Date().toISOString().substring(0, 10) === dateStr;

            // Count tasks for this day
            const dayTaskCount = todos.filter(t => {
              if (!t.deadline) return false;
              return t.deadline.split('T')[0] === dateStr;
            }).length;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(dateStr)}
                className={`h-11 rounded-xl flex flex-col items-center justify-between p-1 cursor-pointer transition-all border ${
                  isSelected 
                    ? 'bg-accent text-accent-foreground border-accent shadow-md' 
                    : isToday 
                    ? 'border-accent text-accent bg-accent/10 font-bold'
                    : 'bg-muted/10 border-border hover:bg-muted'
                }`}
              >
                <span className="text-xs font-semibold">{cell}</span>
                {dayTaskCount > 0 && (
                  <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-accent'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const getCalendarSelectedDateTasks = () => {
    return todos.filter(t => {
      if (!t.deadline) return false;
      return t.deadline.split('T')[0] === selectedDate;
    });
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
      {/* 1. Header bar */}
      <section className="flex justify-between items-center border-b border-border/50 pb-5">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Todo Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">Organize routines, deadlines, and priorities.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-foreground font-semibold rounded-xl text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>New Task</span>
        </button>
      </section>

      {/* 2. Stats Deck */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-card border border-border rounded-2xl soft-shadow flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-500/10 border border-green-500/15 flex items-center justify-center text-green-500">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xl font-bold block">{stats.completed}</span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Completed</span>
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl soft-shadow flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-amber-500">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xl font-bold block">{stats.pending}</span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Pending</span>
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl soft-shadow flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center justify-center text-red-500">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xl font-bold block">{stats.overdue}</span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Overdue</span>
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl soft-shadow flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center text-accent">
            <span className="font-bold text-sm">{stats.rate}%</span>
          </div>
          <div>
            <span className="text-xl font-bold block">{stats.rate}%</span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Completion Rate</span>
          </div>
        </div>
      </section>

      {/* 3. Navigation Tabs */}
      <section className="flex gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab('list')}
          className={`pb-2 px-3 text-sm font-semibold cursor-pointer transition-all border-b-2 ${
            activeTab === 'list' 
              ? 'border-accent text-accent' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Tasks List
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`pb-2 px-3 text-sm font-semibold cursor-pointer transition-all border-b-2 ${
            activeTab === 'calendar' 
              ? 'border-accent text-accent' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Calendar view
        </button>
        <button
          onClick={() => setActiveTab('routines')}
          className={`pb-2 px-3 text-sm font-semibold cursor-pointer transition-all border-b-2 ${
            activeTab === 'routines' 
              ? 'border-accent text-accent' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Weekly Routines
        </button>
      </section>

      {/* 4. Display views */}
      <section className="flex flex-col gap-4">
        {activeTab === 'list' && (
          <div className="flex flex-col gap-4">
            {todos.length === 0 ? (
              <div className="py-16 text-center bg-card border border-border rounded-2xl flex flex-col items-center justify-center gap-3">
                <BookOpen className="h-10 w-10 text-muted-foreground opacity-50" />
                <p className="text-sm font-semibold text-muted-foreground">No tasks scheduled. Create a new task!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Pending Column */}
                <div className="lg:col-span-2 flex flex-col gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Pending & In Progress</h3>
                  <div className="flex flex-col gap-2.5">
                    {todos.filter(t => t.status !== 'Completed').map(todo => (
                      <div 
                        key={todo.id} 
                        className="p-4 bg-card border border-border rounded-2xl flex items-start gap-3.5 soft-shadow group"
                      >
                        <button
                          onClick={() => handleToggleComplete(todo)}
                          className="h-5.5 w-5.5 rounded-lg border border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-accent mt-0.5"
                        >
                          <div className="h-3 w-3 rounded-md bg-transparent" />
                        </button>

                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm text-foreground truncate">{todo.title}</h4>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                              todo.priority === 'High' 
                                ? 'bg-red-500/10 text-red-500 border border-red-500/15' 
                                : todo.priority === 'Medium'
                                ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/15'
                                : 'bg-green-500/10 text-green-500 border border-green-500/15'
                            }`}>
                              {todo.priority}
                            </span>
                          </div>
                          
                          {todo.description && <p className="text-xs text-muted-foreground mt-1 leading-normal">{todo.description}</p>}
                          
                          {/* Task details tags */}
                          <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground font-semibold flex-wrap">
                            {todo.deadline && (
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="h-3.5 w-3.5 text-accent" />
                                <span>{new Date(todo.deadline).toLocaleDateString()}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{todo.category}</span>
                            </span>
                            {todo.repeat !== 'None' && (
                              <span className="flex items-center gap-1 text-accent">
                                <Repeat className="h-3.5 w-3.5" />
                                <span>{todo.repeat}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions desk */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDuplicate(todo.id)}
                            title="Duplicate"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(todo)}
                            title="Edit"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(todo.id)}
                            title="Delete"
                            className="p-1.5 rounded-lg hover:bg-muted text-red-500 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Completed Column */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Completed</h3>
                  <div className="flex flex-col gap-2.5">
                    {todos.filter(t => t.status === 'Completed').map(todo => (
                      <div 
                        key={todo.id} 
                        className="p-3.5 bg-card/60 border border-border/80 rounded-2xl flex items-start gap-3.5 soft-shadow group opacity-70 hover:opacity-100 transition-opacity"
                      >
                        <button
                          onClick={() => handleToggleComplete(todo)}
                          className="h-5.5 w-5.5 rounded-lg bg-green-500 border border-green-500 flex items-center justify-center cursor-pointer text-white mt-0.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>

                        <div className="flex-grow min-w-0">
                          <h4 className="font-semibold text-sm line-through text-muted-foreground truncate">{todo.title}</h4>
                          <span className="text-[9px] text-muted-foreground/80 font-bold uppercase mt-1 block">{todo.category}</span>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDelete(todo.id)}
                            title="Delete"
                            className="p-1 rounded-lg hover:bg-muted text-red-500 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {renderCalendar()}
            </div>
            
            {/* Day Tasks Detail panel */}
            <div className="p-5 bg-card border border-border rounded-2xl soft-shadow flex flex-col gap-4">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">
                Tasks for: {new Date(selectedDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </h3>

              <div className="flex flex-col gap-2.5">
                {getCalendarSelectedDateTasks().length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-12 border border-dashed border-border rounded-xl">
                    No tasks scheduled for this day.
                  </p>
                ) : (
                  getCalendarSelectedDateTasks().map(todo => (
                    <div 
                      key={todo.id}
                      className="p-3 bg-muted/20 border border-border/50 rounded-xl flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <h4 className={`text-sm font-semibold truncate ${todo.status === 'Completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {todo.title}
                        </h4>
                        <span className="text-[9px] font-bold text-muted-foreground/80 block mt-0.5">{todo.category}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        todo.status === 'Completed' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {todo.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'routines' && (
          <div className="bg-card border border-border p-6 rounded-2xl soft-shadow">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-base leading-none">Weekly Routines</h3>
                <p className="text-xs text-muted-foreground mt-1">Manage all your weekly routines in a single text document.</p>
              </div>

              {!editingRoutines ? (
                <button
                  onClick={() => {
                    setEditingRoutines(true);
                  }}
                  className="px-3.5 py-1.5 border border-border hover:bg-muted text-sm font-semibold rounded-xl cursor-pointer transition-all"
                >
                  Edit Document
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setRoutinesText(serializeRoutines(routines));
                      setEditingRoutines(false);
                    }}
                    className="px-3.5 py-1.5 border border-border text-sm font-semibold rounded-xl cursor-pointer hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRoutines}
                    className="px-3.5 py-1.5 bg-accent text-accent-foreground text-sm font-semibold rounded-xl cursor-pointer hover:opacity-90"
                  >
                    Save Document
                  </button>
                </div>
              )}
            </div>

            {/* Routines text editor / viewer block */}
            <div className="border border-border rounded-xl bg-card overflow-hidden soft-shadow">
              {/* Window Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border select-none">
                <div className="flex items-center gap-6">
                  {/* macOS dots */}
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/80 block" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80 block" />
                    <span className="w-3 h-3 rounded-full bg-green-500/80 block" />
                  </div>
                  {/* Active tab */}
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-card border border-border border-b-transparent rounded-t-lg text-xs font-semibold text-foreground -mb-[13px] relative z-10">
                    <Folder className="h-3.5 w-3.5 text-accent" />
                    <span>weekly_routine.txt</span>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  UTF-8 • Plain Text
                </div>
              </div>

              {/* Editor Workspace */}
              <div className="flex font-mono text-xs overflow-hidden h-[450px]">
                {/* Line numbers gutter */}
                <div className="w-12 border-r border-border bg-muted/20 text-muted-foreground/40 text-right py-4 pr-3 flex flex-col gap-[4px] select-none text-[11px] leading-[18px]">
                  {Array.from({ length: Math.max(22, routinesText.split('\n').length) }, (_, i) => i + 1).map(n => (
                    <div key={n}>{n}</div>
                  ))}
                </div>

                {/* Content body */}
                <div className="flex-grow relative h-full bg-card/50">
                  {editingRoutines ? (
                    <textarea
                      value={routinesText}
                      onChange={(e) => setRoutinesText(e.target.value)}
                      className="w-full h-full p-4 bg-transparent text-foreground focus:outline-none resize-none font-mono text-[12px] leading-[18px] focus:ring-0 focus:border-none"
                      placeholder="Monday:\n- Gym\n- Study\n\nTuesday:\n- Work\n..."
                    />
                  ) : (
                    <pre className="w-full h-full p-4 overflow-auto font-mono text-[12px] leading-[18px] text-foreground bg-transparent whitespace-pre-wrap select-text">
                      {routinesText || 'Monday:\n- Rest Day\n\nTuesday:\n- Rest Day\n\nWednesday:\n- Rest Day\n\nThursday:\n- Rest Day\n\nFriday:\n- Rest Day\n\nSaturday:\n- Rest Day\n\nSunday:\n- Rest Day'}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Task Modal Editor/Creator */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-card border border-border p-6 rounded-2xl soft-shadow relative z-10"
            >
              <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
                <h3 className="font-bold text-lg">{currentTodo ? 'Edit Task' : 'New Task'}</h3>
                <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTodo} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter task title"
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description"
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none"
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deadline</label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Repeat</label>
                    <select
                      value={repeat}
                      onChange={(e) => setRepeat(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none"
                    >
                      <option value="None">None (One-time)</option>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="reminder"
                    checked={reminder}
                    onChange={(e) => setReminder(e.target.checked)}
                    className="h-4.5 w-4.5 accent-accent"
                  />
                  <label htmlFor="reminder" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none cursor-pointer">
                    Enable push reminder alert
                  </label>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide notes or additional information..."
                    rows={3}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 transition-all cursor-pointer shadow-md mt-2"
                >
                  Save Task
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
