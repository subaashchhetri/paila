import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { TrendingUp, DollarSign, PieChart as PieIcon, BarChart2 } from 'lucide-react';


export const Reports: React.FC = () => {
  const { token } = useAuth();
  const { theme } = useTheme();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      if (!token) return;
      const res = await fetch('/api/reports/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token]);

  // Color theme overrides depending on dark mode state
  const isDark = theme === 'dark';
  const colors = {
    income: '#10b981', // Emerald green
    expense: '#ef4444', // Rose red
    accent: isDark ? '#60a5fa' : '#2563eb', // Electric blue
    accentLight: isDark ? 'rgba(96, 165, 250, 0.1)' : 'rgba(37, 99, 235, 0.1)',
    grid: isDark ? '#1e293b' : '#e2e8f0',
    tooltipBg: isDark ? '#111625' : '#ffffff',
    tooltipBorder: isDark ? '#1e293b' : '#e2e8f0',
    text: isDark ? '#94a3b8' : '#64748b',
    pie: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b']
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <div className="h-8 w-40 shimmer rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 shimmer rounded-2xl" />
          <div className="h-80 shimmer rounded-2xl" />
          <div className="h-80 shimmer rounded-2xl" />
          <div className="h-80 shimmer rounded-2xl" />
        </div>
      </div>
    );
  }

  const pieChartData = data?.pieChartData || [];
  const lineChartData = data?.lineChartData || [];
  const walletDistribution = data?.walletDistribution || [];

  return (
    <div className="flex flex-col gap-6 w-full pb-6">
      {/* 1. Header */}
      <section className="border-b border-border/50 pb-5">
        <h1 className="font-bold text-2xl tracking-tight">Analytics & Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Interactive visualizations of income flow and category distributions.</p>
      </section>

      {/* 2. Charts Matrix */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Income vs Expenses Bar Chart */}
        <div className="p-5 bg-card border border-border rounded-2xl soft-shadow flex flex-col gap-4">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <BarChart2 className="h-4.5 w-4.5 text-accent" />
              <span>Income vs Expenses Trends</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Last 6 Months cash settlement histories.</p>
          </div>
          <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke={colors.text} fontSize={10} tickLine={false} />
                <YAxis stroke={colors.text} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="income" name="Income" fill={colors.income} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill={colors.expense} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash Flow Accumulation Area Chart */}
        <div className="p-5 bg-card border border-border rounded-2xl soft-shadow flex flex-col gap-4">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <TrendingUp className="h-4.5 w-4.5 text-green-500" />
              <span>Cash Flow & Monthly Net Savings</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Monthly surplus accumulations (Income - Expense).</p>
          </div>
          <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.income} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={colors.income} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke={colors.text} fontSize={10} tickLine={false} />
                <YAxis stroke={colors.text} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="savings" name="Net Surplus" stroke={colors.income} strokeWidth={2.5} fillOpacity={1} fill="url(#colorSavings)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown Pie Chart */}
        <div className="p-5 bg-card border border-border rounded-2xl soft-shadow flex flex-col gap-4">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <PieIcon className="h-4.5 w-4.5 text-amber-500" />
              <span>Spending Category Distribution</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Breakdown of expenses classified by category.</p>
          </div>
          <div className="h-72 w-full mt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            {pieChartData.length === 0 ? (
              <span className="text-xs text-muted-foreground m-auto">No expense categories to evaluate.</span>
            ) : (
              <>
                <div className="h-56 w-56 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieChartData.map((_entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={colors.pie[index % colors.pie.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, borderRadius: '12px' }}
                        itemStyle={{ fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend list */}
                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto text-xs w-full">
                  {pieChartData.slice(0, 6).map((item: any, idx: number) => (
                    <div key={item.name} className="flex justify-between items-center px-2 py-0.5 font-semibold">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors.pie[idx % colors.pie.length] }} />
                        <span>{item.name}</span>
                      </div>
                      <span>Rs. {item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Wallet Balance Allocation Bar Chart */}
        <div className="p-5 bg-card border border-border rounded-2xl soft-shadow flex flex-col gap-4">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <DollarSign className="h-4.5 w-4.5 text-green-500" />
              <span>Wallet Assets Allocation</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Asset balance ratios across Cash, Bank, and eSewa.</p>
          </div>
          <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={walletDistribution} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" stroke={colors.text} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke={colors.text} fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Bar dataKey="value" name="Balance" fill={colors.accent} radius={[0, 4, 4, 0]}>
                  {walletDistribution.map((_entry: any, index: number) => {
                    const colorMap = ['#f59e0b', '#3b82f6', '#10b981']; // Cash, Bank, eSewa colors
                    return <Cell key={`cell-${index}`} fill={colorMap[index % 3]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </section>
    </div>
  );
};
