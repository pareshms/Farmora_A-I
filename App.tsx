
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Bot, Sprout, ShoppingBasket, Users, Beaker, 
  TrendingDown, TrendingUp, Landmark, CloudSun, LineChart, Calendar as CalendarIcon, 
  User, Menu, X, Plus, LogOut, Send, Trash2, IndianRupee, MapPin,
  ChevronRight, Camera, Info, Sparkles, Search, CheckCircle2, AlertCircle, Wallet,
  Droplets, Wind, Thermometer, Clock, ArrowUpRight, ArrowDownRight, ExternalLink, Globe,
  Activity, ClipboardList, Timer, Check
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  Cell, PieChart, Pie, LineChart as ReLineChart, Line, AreaChart, Area, CartesianGrid, Legend
} from 'recharts';
import { 
  Language, Labourer, AttendanceStatus, CropRecord, HarvestRecord, 
  IncomeRecord, ExpenseRecord, LoanRecord, Reminder 
} from './types';
import { translations } from './translations';
import { detectPestAndDisease, getGeminiResponse, fetchMandiPrices } from './services/geminiService';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lang, setLang] = useState<Language>('en');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<string | null>(null);
  const [farmLocation, setFarmLocation] = useState('Shimoga, Karnataka');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // --- Mandi States ---
  const [mandiSearch, setMandiSearch] = useState('');
  const [mandiResult, setMandiResult] = useState<{text: string, sources: any[]} | null>(null);
  const [isMandiLoading, setIsMandiLoading] = useState(false);

  // --- Data States ---
  const [labourers, setLabourers] = useState<Labourer[]>([
    { id: '1', name: 'Ramesh Kumar', phone: '9876543210', task: 'Ploughing', dailyWage: 450, attendance: {} },
    { id: '2', name: 'Suresh Patil', phone: '9876543211', task: 'Harvesting', dailyWage: 500, attendance: {} },
    { id: '3', name: 'Lakshmi Bai', phone: '9876543212', task: 'Seeding', dailyWage: 400, attendance: {} }
  ]);
  const [crops, setCrops] = useState<CropRecord[]>([
    { id: 'c1', name: 'Arecanut', area: 5, sowingDate: '2023-05-10' },
    { id: 'c2', name: 'Paddy', area: 3.5, sowingDate: '2024-01-05' },
    { id: 'c3', name: 'Coconut', area: 2.0, sowingDate: '2020-06-15' }
  ]);
  const [harvests, setHarvests] = useState<HarvestRecord[]>([
    { id: 'h1', cropId: 'c2', cropName: 'Paddy', qty: 1200, price: 22, date: '2024-03-10' }
  ]);
  const [pesticides, setPesticides] = useState<{id: string, crop: string, name: string, date: string}[]>([]);
  const [income, setIncome] = useState<IncomeRecord[]>([
    { id: 'i1', title: 'Paddy Sale', amount: 26400, date: '2024-03-11' }
  ]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([
    { id: 'e1', title: 'Urea Fertilizer', amount: 1500, date: '2024-03-02' },
    { id: 'e2', title: 'Diesel for Tractor', amount: 3000, date: '2024-03-05' }
  ]);
  const [loans, setLoans] = useState<LoanRecord[]>([
    { id: 'l1', provider: 'SBI Agri', amount: 150000, rate: 7.5, date: '2024-01-10', status: 'Pending' }
  ]);
  const [reminders, setReminders] = useState<Reminder[]>([
    { id: 'r1', date: '2024-03-25', text: 'Apply fertilizer to Arecanut' },
    { id: 'r2', date: '2024-03-28', text: 'Loan interest payment' }
  ]);
  const [labourDate, setLabourDate] = useState(new Date().toISOString().split('T')[0]);

  // --- AI States ---
  const [aiAdvice, setAiAdvice] = useState('Analyzing farm data...');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [pestResult, setPestResult] = useState<any>(null);

  const t = (key: string) => translations[key]?.[lang] || key;

  // --- Dashboard Data Prep ---
  const totalInc = useMemo(() => income.reduce((s, i) => s + i.amount, 0), [income]);
  const totalExp = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const totalDebt = useMemo(() => loans.filter(l => l.status === 'Pending').reduce((s, l) => s + l.amount, 0), [loans]);
  
  const getWorkerStats = (id: string) => {
    const worker = labourers.find(w => w.id === id);
    if (!worker) return { earnings: 0, present: 0, absent: 0, half: 0 };
    const values = Object.values(worker.attendance);
    const present = values.filter(v => v === AttendanceStatus.PRESENT).length;
    const half = values.filter(v => v === AttendanceStatus.HALF_DAY).length;
    const absent = values.filter(v => v === AttendanceStatus.ABSENT).length;
    return { earnings: (present + (half * 0.5)) * worker.dailyWage, present, half, absent };
  };

  const totalLabourDue = useMemo(() => labourers.reduce((s, l) => s + getWorkerStats(l.id).earnings, 0), [labourers]);
  const netWorth = totalInc - totalExp - totalDebt - totalLabourDue;

  // --- Chart Data ---
  const financialTrendData = [
    { name: 'Jan', inc: 12000, exp: 8000 },
    { name: 'Feb', inc: 18000, exp: 12000 },
    { name: 'Mar', inc: totalInc, exp: totalExp + totalLabourDue },
  ];

  const cropDistData = useMemo(() => crops.map(c => ({ name: c.name, value: c.area })), [crops]);
  
  const labourEfficiencyData = useMemo(() => {
    const taskMap: Record<string, { cost: number, count: number }> = {};
    labourers.forEach(l => {
      const stats = getWorkerStats(l.id);
      if (!taskMap[l.task]) taskMap[l.task] = { cost: 0, count: 0 };
      taskMap[l.task].cost += stats.earnings;
      taskMap[l.task].count += 1;
    });
    return Object.entries(taskMap).map(([task, data]) => ({ name: task, cost: data.cost, count: data.count }));
  }, [labourers, labourDate]);

  const CROP_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4'];

  useEffect(() => {
    if (isLoggedIn) {
      getGeminiResponse(`Acting as a pro Indian farm advisor, give a 15-word advice for ${crops.map(c => c.name).join(', ')} in ${farmLocation} for the current month. Focus on irrigation or pests.`).then(setAiAdvice);
    }
  }, [isLoggedIn, crops, farmLocation]);

  // --- Handlers ---
  const handleMandiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mandiSearch) return;
    setIsMandiLoading(true);
    const res = await fetchMandiPrices(mandiSearch);
    setMandiResult(res);
    setIsMandiLoading(false);
  };

  const markAttendance = (id: string, status: AttendanceStatus) => {
    setLabourers(prev => prev.map(l => l.id === id ? { ...l, attendance: { ...l.attendance, [labourDate]: status } } : l));
  };

  const presetAllPresent = () => {
    setLabourers(prev => prev.map(l => ({ ...l, attendance: { ...l.attendance, [labourDate]: AttendanceStatus.PRESENT } })));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAiLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const res = await detectPestAndDisease(base64);
      setPestResult(res);
      setIsAiLoading(false);
    };
    reader.readAsDataURL(file);
  };

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#f0f4f8] p-6 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-400/10 blur-[120px] rounded-full"></div>
        <div className="bg-white/70 backdrop-blur-3xl p-12 rounded-[50px] shadow-2xl w-full max-w-sm border border-white/50 z-10 text-center relative">
          <div className="w-24 h-24 bg-emerald-600 rounded-[35px] flex items-center justify-center text-5xl mx-auto mb-8 shadow-2xl shadow-emerald-200 text-white font-black italic rotate-6" aria-hidden="true">FA</div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Farmora AI</h2>
          <p className="text-slate-500 font-medium mt-2 mb-10 text-sm">Empowering the Indian Farmer</p>
          <button 
            onClick={() => setIsLoggedIn(true)} 
            className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black text-xl shadow-xl shadow-emerald-200 active:scale-95 transition-all"
            aria-label="Launch Dashboard"
          >
            Start Farming
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-inter">
      
      {/* Sidebar - Semantic <aside> for better SEO and Accessibility */}
      <aside 
        className={`fixed lg:sticky top-0 h-screen w-64 bg-white border-r border-slate-100 flex flex-col z-50 transition-transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Main Navigation"
      >
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl italic shadow-lg shadow-emerald-100" aria-hidden="true">FA</div>
          <h1 className="text-xl font-black tracking-tighter">Farmora AI</h1>
        </div>
        <nav className="flex-1 px-4 space-y-1 py-4 overflow-y-auto" role="navigation">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'mandi', icon: ShoppingBasket, label: 'Mandi Search' },
            { id: 'labour', icon: Users, label: 'Staff & Wages' },
            { id: 'crops', icon: Sprout, label: 'Crop Inventory' },
            { id: 'harvest', icon: Activity, label: 'Harvest Logs' },
            { id: 'finance', icon: Wallet, label: 'Transactions' },
            { id: 'pesticides', icon: Beaker, label: 'Spray Logs' },
            { id: 'pest', icon: Camera, label: 'AI Pest Scan' },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-[20px] transition-all ${activeTab === item.id ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100 font-bold' : 'text-slate-400 hover:bg-slate-50'}`}
              aria-current={activeTab === item.id ? 'page' : undefined}
              aria-label={`Go to ${item.label}`}
            >
              <item.icon size={18} strokeWidth={activeTab === item.id ? 3 : 2} aria-hidden="true" /> 
              <span className="text-[13px] font-bold">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6">
          <button 
            onClick={() => setIsLoggedIn(false)} 
            className="w-full flex items-center justify-center gap-3 px-4 py-4 text-rose-500 font-black text-sm hover:bg-rose-50 rounded-2xl transition-all"
            aria-label="Logout from Farmora AI"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content - Semantic <main> for SEO */}
      <main className="flex-1 p-4 lg:p-12 pb-24 lg:pb-12 max-w-7xl mx-auto w-full" id="main-content">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-black tracking-tighter capitalize">{activeTab.replace('_', ' ')}</h2>
            <div className="flex items-center gap-2 text-slate-400 mt-1">
              <MapPin size={12} aria-hidden="true"/>
              <span className="text-[10px] font-black uppercase tracking-widest">Farm: {farmLocation}</span>
              <button 
                onClick={() => setIsLocationModalOpen(true)} 
                className="text-[10px] text-emerald-600 font-black uppercase underline ml-1 hover:text-emerald-700"
                aria-label="Change Farm Location"
              >
                Change
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="lg:hidden p-4 bg-white rounded-2xl shadow-sm border border-slate-100"
              aria-label="Open Sidebar Menu"
             >
              <Menu size={24}/>
             </button>
             <div className="hidden md:flex w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 items-center justify-center font-black text-indigo-600" aria-hidden="true">F1</div>
          </div>
        </header>

        {/* --- DASHBOARD VIEW --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            
            {/* Top Stats Cards */}
            <section className="grid grid-cols-1 lg:grid-cols-4 gap-6" aria-label="Quick Financial Overview">
               <div className="lg:col-span-2 bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div className="bg-emerald-500/20 p-3 rounded-2xl text-emerald-400"><IndianRupee size={24} aria-hidden="true" /></div>
                      <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                        <ArrowUpRight size={12}/> 12.5% Month Growth
                      </div>
                    </div>
                    <p className="text-5xl font-black tracking-tighter mb-1">₹{netWorth.toLocaleString()}</p>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Projected Net Wealth</p>
                  </div>
                  <div className="absolute right-[-10%] bottom-[-10%] opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={300} aria-hidden="true" /></div>
               </div>
               
               <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 flex flex-col justify-between group">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Total Staff</h3>
                    <p className="text-4xl font-black text-slate-800">{labourers.length}</p>
                  </div>
                  <div className="mt-4 flex -space-x-3">
                    {labourers.map((l, i) => (
                      <div key={l.id} className="w-10 h-10 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black group-hover:scale-110 transition-transform">
                        {l.name.charAt(0)}
                      </div>
                    ))}
                    <div className="w-10 h-10 rounded-full border-4 border-white bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white">+0</div>
                  </div>
               </div>

               <div className="bg-rose-600 text-white p-8 rounded-[40px] shadow-xl flex flex-col justify-between relative overflow-hidden">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/60">Agri-Loans</h3>
                  <p className="text-4xl font-black">₹{totalDebt.toLocaleString()}</p>
                  <div className="mt-4 p-3 bg-white/10 rounded-2xl flex items-center gap-3">
                    <AlertCircle size={16} aria-hidden="true" />
                    <p className="text-[10px] font-black uppercase">Interest Due: 28th Mar</p>
                  </div>
                  <div className="absolute right-[-10%] top-[-10%] opacity-10"><Landmark size={80} aria-hidden="true" /></div>
               </div>
            </section>

            {/* Middle Section: AI Advice & Environment */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <section className="lg:col-span-2 bg-white p-10 rounded-[45px] shadow-sm border border-slate-50 relative overflow-hidden group" aria-label="AI Farm Intelligence">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <Sparkles size={20} className="text-indigo-500 animate-pulse" aria-hidden="true" />
                      <h3 className="text-xl font-black tracking-tight">Personalized AI Farm Strategy</h3>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-[35px] border border-slate-100 mb-8">
                      <p className="text-xl font-bold text-slate-700 leading-snug italic">"{aiAdvice}"</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {crops.map(crop => (
                        <article key={crop.id} className="bg-white p-5 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">{crop.name}</p>
                          <div className="flex items-end justify-between">
                            <span className="text-lg font-black">{crop.area} ac</span>
                            <div className="h-6 w-1 bg-emerald-100 rounded-full overflow-hidden">
                               <div className="w-full bg-emerald-500 rounded-full" style={{ height: '70%' }}></div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                  <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none"></div>
               </section>

               <section className="bg-emerald-600 text-white p-10 rounded-[45px] shadow-xl relative overflow-hidden flex flex-col justify-between" aria-label="Live Environmental Conditions">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-black tracking-tighter">Environment</h3>
                    <CloudSun size={32} aria-hidden="true" />
                  </div>
                  <div className="space-y-6 flex-1 mt-4">
                    <div className="flex items-center justify-between p-4 bg-white/10 rounded-3xl">
                      <div className="flex items-center gap-3"><Thermometer size={18} aria-hidden="true" /><span className="text-sm font-bold">Temperature</span></div>
                      <span className="text-xl font-black">28°C</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/10 rounded-3xl">
                      <div className="flex items-center gap-3"><Droplets size={18} aria-hidden="true" /><span className="text-sm font-bold">Soil Moisture</span></div>
                      <span className="text-xl font-black">34%</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/10 rounded-3xl">
                      <div className="flex items-center gap-3"><Wind size={18} aria-hidden="true" /><span className="text-sm font-bold">Wind Speed</span></div>
                      <span className="text-xl font-black">12km/h</span>
                    </div>
                  </div>
                  <div className="mt-8 pt-8 border-t border-white/10">
                    <p className="text-[10px] font-black uppercase text-emerald-200 mb-1">Spraying Window</p>
                    <p className="text-xs font-bold">Ideal conditions detected for next 48 hours.</p>
                  </div>
               </section>
            </div>

            {/* Advanced Analytics Section */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8" aria-label="Advanced Farm Analytics">
               {/* Financial Trends Area Chart */}
               <div className="bg-white p-10 rounded-[45px] shadow-sm border border-slate-50">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-xl font-black flex items-center gap-3"><TrendingUp size={20} className="text-emerald-500" aria-hidden="true" /> Financial Performance</h3>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" aria-hidden="true" /> <span className="text-[10px] font-black uppercase text-slate-400">Income</span></div>
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" aria-hidden="true" /> <span className="text-[10px] font-black uppercase text-slate-400">Expenses</span></div>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={financialTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                          <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', padding: '20px' }} />
                        <Area type="monotone" dataKey="inc" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorInc)" />
                        <Area type="monotone" dataKey="exp" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorExp)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               {/* Crop Distribution Pie Chart */}
               <div className="bg-white p-10 rounded-[45px] shadow-sm border border-slate-50">
                  <h3 className="text-xl font-black mb-10 flex items-center gap-3"><Sprout size={20} className="text-indigo-500" aria-hidden="true" /> Land Utilization Share</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={cropDistData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                          {cropDistData.map((_, index) => <Cell key={index} fill={CROP_COLORS[index % CROP_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </section>

            {/* Bottom Row: Labour Efficiency & Activity Feed */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8" aria-label="Labour Management & Activity Logs">
               {/* Labour Efficiency Bar Chart */}
               <div className="bg-white p-10 rounded-[45px] shadow-sm border border-slate-50">
                  <h3 className="text-xl font-black mb-10 flex items-center gap-3"><Users size={20} className="text-amber-500" aria-hidden="true" /> Task-wise Labour Cost</h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={labourEfficiencyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <YAxis hide />
                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }} />
                        <Bar dataKey="cost" fill="#f59e0b" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               {/* Activity & Reminders Feed */}
               <div className="bg-white p-10 rounded-[45px] shadow-sm border border-slate-50">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black flex items-center gap-3"><Timer size={20} className="text-indigo-500" aria-hidden="true" /> Activity & Tasks</h3>
                    <button className="text-[10px] font-black uppercase text-indigo-600 hover:underline" aria-label="View all activities and reminders">View All</button>
                  </div>
                  <div className="space-y-6">
                    {/* Feed Item 1 */}
                    <div className="flex gap-4 items-start p-4 bg-slate-50 rounded-[30px] border border-slate-100">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex-shrink-0 flex items-center justify-center"><CheckCircle2 size={18}/></div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-800">Harvested 1,200kg Paddy</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Today, 10:30 AM</p>
                      </div>
                    </div>
                    {/* Feed Item 2 (Reminder) */}
                    {reminders.map(r => (
                      <div key={r.id} className="flex gap-4 items-start p-4 bg-indigo-50/50 rounded-[30px] border border-indigo-100/50">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex-shrink-0 flex items-center justify-center"><CalendarIcon size={18}/></div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-800">Reminder: {r.text}</p>
                          <p className="text-[10px] font-black text-indigo-500 uppercase mt-1">Due {r.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </section>
          </div>
        )}

        {/* --- MANDI VIEW --- */}
        {activeTab === 'mandi' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-6">
            <section className="bg-slate-900 p-12 rounded-[50px] shadow-2xl relative overflow-hidden" aria-label="Mandi Price Search Interface">
               <div className="relative z-10 max-w-2xl">
                  <h3 className="text-4xl font-black text-white tracking-tighter mb-4">Mandi Search Engine</h3>
                  <p className="text-slate-400 font-medium mb-10 text-lg">Real-time market intelligence using Google Search via Gemini AI. Find rates for any crop in any APMC across India.</p>
                  
                  <form onSubmit={handleMandiSearch} className="flex gap-3">
                    <div className="flex-1 bg-white/10 rounded-[32px] p-2 flex items-center gap-4 border border-white/10 focus-within:border-emerald-500/50 transition-all">
                      <div className="pl-5 text-emerald-400"><Search size={28} aria-hidden="true" /></div>
                      <input 
                        value={mandiSearch}
                        onChange={(e) => setMandiSearch(e.target.value)}
                        placeholder="e.g. Onion prices in Lasalgaon Mandi..."
                        className="bg-transparent text-white w-full py-5 outline-none font-bold placeholder:text-slate-600 text-lg"
                        aria-label="Search Mandi prices for a crop and location"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isMandiLoading} 
                      className="bg-emerald-600 text-white px-12 rounded-[32px] font-black uppercase text-sm tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                      aria-label={isMandiLoading ? "Searching for prices..." : "Search Prices"}
                    >
                      {isMandiLoading ? 'Searching...' : 'Search'}
                    </button>
                  </form>
               </div>
               <div className="absolute right-[-5%] bottom-[-10%] opacity-10"><ShoppingBasket size={400} className="text-emerald-500" aria-hidden="true" /></div>
            </section>

            {mandiResult && (
              <section className="bg-white rounded-[50px] p-12 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4" aria-label="Mandi Market Search Results">
                 <div className="flex items-center gap-4 mb-10">
                    <Globe size={28} className="text-indigo-600" aria-hidden="true" />
                    <h4 className="text-2xl font-black tracking-tight">Market Intelligence Report: {mandiSearch}</h4>
                 </div>
                 <div className="prose prose-slate max-w-none mb-12 text-slate-700 leading-relaxed font-medium whitespace-pre-wrap text-lg">
                    {mandiResult.text}
                 </div>
                 
                 {mandiResult.sources.length > 0 && (
                   <div className="border-t border-slate-50 pt-10">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Verification Sources</p>
                      <div className="flex flex-wrap gap-3">
                        {mandiResult.sources.map((source: any, i: number) => (
                          <a 
                            key={i} 
                            href={source.web?.uri} 
                            target="_blank" 
                            rel="noopener"
                            className="bg-slate-50 border border-slate-100 px-6 py-3 rounded-2xl text-[11px] font-black text-indigo-600 flex items-center gap-3 hover:bg-indigo-50 transition-all shadow-sm"
                            aria-label={`External source: ${source.web?.title || 'Market Source'}`}
                          >
                            <ExternalLink size={14} aria-hidden="true" /> {source.web?.title || 'Source View'}
                          </a>
                        ))}
                      </div>
                   </div>
                 )}
              </section>
            )}

            {!mandiResult && !isMandiLoading && (
              <section className="grid grid-cols-1 md:grid-cols-3 gap-8" aria-label="Popular Price Searches">
                {[
                  { q: 'Tomato prices in Bangalore', icon: '🍅' },
                  { q: 'Paddy rates in Raichur', icon: '🌾' },
                  { q: 'Chili prices in Guntur', icon: '🌶️' }
                ].map((item, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => { setMandiSearch(item.q); handleMandiSearch({preventDefault: () => {}} as any); }}
                    className="bg-white p-10 rounded-[45px] border border-slate-50 text-left hover:border-emerald-200 transition-all group shadow-sm"
                    aria-label={`Quick search for ${item.q}`}
                  >
                    <span className="text-4xl mb-6 block group-hover:scale-110 transition-transform" aria-hidden="true">{item.icon}</span>
                    <p className="font-black text-slate-800 text-xl tracking-tight leading-tight">{item.q}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-3 group-hover:text-emerald-600">Analyze Now →</p>
                  </button>
                ))}
              </section>
            )}
          </div>
        )}

        {/* --- HARVEST VIEW --- */}
        {activeTab === 'harvest' && (
          <section className="space-y-8 animate-in slide-in-from-bottom-4" aria-label="Crop Harvest Records">
            <div className="flex justify-between items-center bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
               <div>
                 <h3 className="text-2xl font-black tracking-tight">Yield Records</h3>
                 <p className="text-slate-400 text-sm font-medium">Track total produce and market value.</p>
               </div>
               <button 
                onClick={() => setShowAddModal('harvest')} 
                className="bg-emerald-600 text-white p-5 rounded-2xl shadow-lg shadow-emerald-200 hover:scale-105 transition-transform"
                aria-label="Add new harvest record"
               >
                 <Plus size={28}/>
               </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {harvests.map(h => (
                <article key={h.id} className="bg-white p-10 rounded-[50px] shadow-sm border border-slate-50 relative group">
                   <div className="flex justify-between items-start mb-8">
                      <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[28px]"><Sprout size={32} aria-hidden="true" /></div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-slate-800">{h.qty.toLocaleString()} kg</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Weight</p>
                      </div>
                   </div>
                   <h4 className="text-2xl font-black text-slate-800 tracking-tight">{h.cropName}</h4>
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2"><CalendarIcon size={12} aria-hidden="true" /> Harvested on {h.date}</p>
                   
                   <div className="mt-8 pt-8 border-t border-slate-50 flex justify-between items-center">
                     <div>
                       <p className="text-[10px] font-black uppercase text-slate-400">Sold @ Rate</p>
                       <p className="text-lg font-bold text-slate-700">₹{h.price}/kg</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-emerald-600">Net Value</p>
                        <p className="text-2xl font-black text-emerald-600">₹{(h.qty * h.price).toLocaleString()}</p>
                     </div>
                   </div>
                   <button className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-rose-500 transition-opacity p-2" aria-label={`Delete harvest record for ${h.cropName}`}>
                    <Trash2 size={16}/>
                   </button>
                </article>
              ))}
              {harvests.length === 0 && (
                <div className="lg:col-span-3 py-32 text-center bg-white rounded-[50px] border-4 border-dashed border-slate-100">
                  <Activity size={64} className="mx-auto text-slate-100 mb-6" aria-hidden="true" />
                  <p className="text-slate-400 font-black uppercase tracking-widest">No yield logs found for this season.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* --- STAFF/LABOUR VIEW --- */}
        {activeTab === 'labour' && (
          <section className="space-y-8 animate-in slide-in-from-bottom-4" aria-label="Staff Attendance and Wage Ledger">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm gap-6">
               <div className="flex-1 w-full">
                 <h3 className="text-2xl font-black tracking-tight mb-1">Attendance Ledger</h3>
                 <div className="flex items-center gap-3">
                   <Clock size={16} className="text-slate-400" aria-hidden="true" />
                   <input 
                    type="date" 
                    value={labourDate} 
                    onChange={(e) => setLabourDate(e.target.value)} 
                    className="bg-slate-50 px-4 py-2 rounded-xl text-sm font-black outline-none" 
                    aria-label="Select date for attendance recording"
                   />
                 </div>
               </div>
               <div className="flex gap-4 w-full md:w-auto">
                 <button 
                  onClick={presetAllPresent} 
                  className="flex-1 md:flex-none bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                  aria-label="Mark all staff as present for the selected date"
                 >
                   <Check size={16}/> Mark All Present
                 </button>
                 <button 
                  onClick={() => setShowAddModal('worker')} 
                  className="bg-emerald-600 text-white p-5 rounded-2xl shadow-lg shadow-emerald-200"
                  aria-label="Add new worker to the farm"
                 >
                   <Plus size={28}/>
                 </button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {labourers.map(worker => {
                const stats = getWorkerStats(worker.id);
                const currentStatus = worker.attendance[labourDate];
                return (
                  <article key={worker.id} className="bg-white p-10 rounded-[50px] shadow-sm border border-slate-100 group">
                    <div className="flex justify-between items-start mb-10">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-slate-100 rounded-[28px] flex items-center justify-center font-black text-2xl text-slate-300" aria-hidden="true">{worker.name.charAt(0)}</div>
                        <div>
                          <p className="text-xl font-black text-slate-800">{worker.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{worker.task}</p>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-emerald-600 font-black text-2xl">₹{stats.earnings.toLocaleString()}</p>
                         <p className="text-[9px] font-black text-slate-400 uppercase">Payout Due</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { s: AttendanceStatus.PRESENT, l: 'Present', c: 'bg-emerald-600' },
                        { s: AttendanceStatus.HALF_DAY, l: 'Half', c: 'bg-amber-500' },
                        { s: AttendanceStatus.ABSENT, l: 'Absent', c: 'bg-rose-600' },
                      ].map(btn => (
                        <button 
                          key={btn.l} 
                          onClick={() => markAttendance(worker.id, btn.s)}
                          className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${currentStatus === btn.s ? `${btn.c} text-white shadow-lg` : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                          aria-label={`Mark ${worker.name} as ${btn.l}`}
                          aria-pressed={currentStatus === btn.s}
                        >
                          {btn.l}
                        </button>
                      ))}
                    </div>

                    <div className="mt-10 pt-8 border-t border-slate-50 flex justify-between items-center">
                      <div className="flex flex-col">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Monthly Absences</p>
                        <span className={`text-lg font-black mt-1 ${stats.absent > 3 ? 'text-rose-500' : 'text-slate-700'}`}>{stats.absent} Days</span>
                      </div>
                      <button 
                        onClick={() => setSelectedWorkerId(worker.id)} 
                        className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        aria-label={`View detailed records for ${worker.name}`}
                      >
                        <ChevronRight size={20}/>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* --- PESTICIDE/SPRAY LOG VIEW --- */}
        {activeTab === 'pesticides' && (
          <section className="space-y-8" aria-label="Chemical Spray Application Logs">
             <div className="flex justify-between items-center bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Chemical Application Log</h3>
                  <p className="text-slate-400 text-sm font-medium">Keep track of spray history for certification and safety.</p>
                </div>
                <button 
                  onClick={() => setShowAddModal('pesticide')} 
                  className="bg-emerald-600 text-white p-5 rounded-2xl shadow-lg shadow-emerald-200"
                  aria-label="Log a new chemical spray application"
                >
                  <Plus size={28}/>
                </button>
             </div>
             <div className="bg-white rounded-[50px] overflow-hidden shadow-sm border border-slate-50 p-4">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                    <tr>
                      <th className="px-10 py-8">Target Crop</th>
                      <th className="px-10 py-8">Spray/Chemical</th>
                      <th className="px-10 py-8">Date Applied</th>
                      <th className="px-10 py-8">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pesticides.map(p => (
                      <tr key={p.id} className="text-sm font-bold text-slate-700 hover:bg-slate-50/50 transition-colors">
                        <td className="px-10 py-8 flex items-center gap-3"><Sprout size={16} className="text-emerald-500" aria-hidden="true" /> {p.crop}</td>
                        <td className="px-10 py-8 font-black text-indigo-600">{p.name}</td>
                        <td className="px-10 py-8">{p.date}</td>
                        <td className="px-10 py-8"><button className="text-rose-500 p-2" aria-label={`Delete record for ${p.name}`}><Trash2 size={16}/></button></td>
                      </tr>
                    ))}
                    {pesticides.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-10 py-24 text-center">
                          <Beaker size={48} className="mx-auto text-slate-100 mb-6" aria-hidden="true" />
                          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No chemical applications logged for this period.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
               </table>
             </div>
          </section>
        )}

        {/* --- PEST SCAN VIEW --- */}
        {activeTab === 'pest' && (
          <section className="space-y-8 animate-in slide-in-from-bottom-4" aria-label="AI Crop Disease Scanner">
            {!pestResult ? (
              <div className="flex flex-col items-center justify-center py-32 px-10 bg-white border-4 border-dashed border-slate-100 rounded-[60px] space-y-12">
                <div className="w-48 h-48 bg-emerald-50 text-emerald-600 rounded-[50px] flex items-center justify-center shadow-inner group hover:scale-105 transition-all" aria-hidden="true"><Camera size={96}/></div>
                <div className="text-center max-w-lg">
                  <h3 className="font-black text-4xl text-slate-800 tracking-tighter">AI Pest & Disease Scan</h3>
                  <p className="text-slate-400 font-medium mt-4 text-lg">Take a high-quality photo of the affected plant. Our Gemini AI will detect diseases and suggest precise treatments.</p>
                </div>
                <label className="bg-emerald-600 text-white px-16 py-7 rounded-[32px] font-black text-xl cursor-pointer shadow-2xl shadow-emerald-200 active:scale-95 transition-all flex items-center gap-4 hover:bg-emerald-700">
                  <Camera size={28} aria-hidden="true" /> Capture Crop Image
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isAiLoading} aria-label="Upload crop image for analysis" />
                </label>
                {isAiLoading && <div className="flex items-center gap-4 text-emerald-600 font-black animate-pulse text-lg" aria-live="polite"><Sparkles size={28} aria-hidden="true" /> Gemini AI Consultant is analyzing...</div>}
              </div>
            ) : (
              <article className="bg-white rounded-[60px] overflow-hidden shadow-2xl animate-in zoom-in-95 border border-slate-100" aria-label="AI Analysis Result">
                <div className={`p-12 ${pestResult.urgency === 'High' ? 'bg-rose-600' : 'bg-emerald-600'} text-white`}>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-5xl font-black tracking-tighter mb-2">{pestResult.condition}</h3>
                      <div className="bg-white/20 inline-block px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest">{pestResult.urgency} Action Required</div>
                    </div>
                    <AlertCircle size={56} aria-hidden="true" />
                  </div>
                </div>
                <div className="p-16 space-y-12">
                  <div className="bg-slate-50 p-10 rounded-[40px] border border-slate-100">
                    <p className="text-[12px] font-black uppercase text-slate-400 tracking-[0.3em] mb-6">Expert Treatment Protocol</p>
                    <p className="text-slate-800 font-medium leading-relaxed text-2xl">{pestResult.treatment}</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setPestResult(null)} 
                      className="flex-1 py-7 bg-slate-900 text-white rounded-[35px] font-black uppercase text-sm tracking-widest shadow-xl active:scale-95 transition-all"
                      aria-label="Download Treatment Protocol as PDF"
                    >
                      Download Protocol
                    </button>
                    <button 
                      onClick={() => setPestResult(null)} 
                      className="flex-1 py-7 bg-slate-100 text-slate-400 rounded-[35px] font-black uppercase text-sm tracking-widest hover:bg-slate-200 transition-all"
                      aria-label="Dismiss analysis and take a new photo"
                    >
                      Dismiss & Retake
                    </button>
                  </div>
                </div>
              </article>
            )}
          </section>
        )}

      </main>

      {/* Mobile Nav - Semantic <nav> for SEO and Accessibility */}
      <nav 
        className="fixed lg:hidden bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center px-4 py-6 shadow-[0_-15px_40px_rgba(0,0,0,0.05)] safe-area-bottom z-[90]"
        aria-label="Mobile Navigation Bar"
      >
        {[
          { id: 'dashboard', icon: LayoutDashboard, l: 'Home' },
          { id: 'mandi', icon: ShoppingBasket, l: 'Mandi' },
          { id: 'labour', icon: Users, l: 'Staff' },
          { id: 'pest', icon: Camera, l: 'Scan' },
          { id: 'menu', icon: Menu, l: 'Menu' },
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => item.id === 'menu' ? setIsSidebarOpen(true) : setActiveTab(item.id)}
            className={`flex flex-col items-center gap-2 w-1/5 ${activeTab === item.id ? 'text-emerald-600' : 'text-slate-400'}`}
            aria-label={`Go to ${item.l}`}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            <item.icon size={22} strokeWidth={activeTab === item.id ? 3 : 2} aria-hidden="true" />
            <span className="text-[10px] font-black uppercase tracking-tighter">{item.l}</span>
          </button>
        ))}
      </nav>

      {/* LOCATION PICKER MODAL */}
      {isLocationModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[300] flex items-center justify-center p-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-modal-title"
        >
          <div className="bg-white w-full max-w-sm rounded-[50px] p-12 space-y-10 animate-in zoom-in-95 shadow-2xl">
             <div className="text-center">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[35px] flex items-center justify-center mx-auto mb-8"><MapPin size={40} aria-hidden="true" /></div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tighter" id="location-modal-title">Farm Location</h3>
                <p className="text-sm text-slate-400 mt-2 font-medium px-6">Set your village or city for accurate Mandi prices and localized AI tips.</p>
             </div>
             <input 
               value={farmLocation}
               onChange={(e) => setFarmLocation(e.target.value)}
               className="w-full p-6 bg-slate-50 rounded-[28px] font-black text-lg outline-none border-2 border-transparent focus:border-emerald-500 transition-all text-center"
               placeholder="e.g. Kolar, Karnataka"
               aria-label="Farm Location input"
             />
             <button 
              onClick={() => setIsLocationModalOpen(false)} 
              className="w-full py-6 bg-emerald-600 text-white rounded-[32px] font-black text-xl shadow-2xl shadow-emerald-200 transition-all active:scale-95"
              aria-label="Confirm location update"
             >
              Update All Data
             </button>
          </div>
        </div>
      )}

      {/* ADD MODAL ENGINE */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[200] flex items-end p-4 lg:items-center lg:justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-modal-title"
        >
          <div className="bg-white w-full max-w-lg rounded-[50px] p-12 space-y-10 animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in-95 duration-300 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800" id="add-modal-title">New {showAddModal} Entry</h2>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">FarmMate Secure Ledger</p>
              </div>
              <button 
                onClick={() => setShowAddModal(null)} 
                className="p-4 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <X size={28}/>
              </button>
            </div>
            
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const val = (name: string) => e.target[name].value;
              const date = new Date().toISOString().split('T')[0];
              
              if (showAddModal === 'worker') setLabourers([...labourers, { id: Date.now().toString(), name: val('name'), phone: val('phone'), task: val('task'), dailyWage: Number(val('wage')), attendance: {} }]);
              if (showAddModal === 'harvest') setHarvests([...harvests, { id: Date.now().toString(), cropId: 'new', cropName: val('crop'), qty: Number(val('qty')), price: Number(val('price')), date }]);
              if (showAddModal === 'pesticide') setPesticides([...pesticides, { id: Date.now().toString(), crop: val('crop'), name: val('name'), date }]);
              
              setShowAddModal(null);
            }} className="space-y-6">
               {showAddModal === 'worker' && (
                 <>
                   <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Worker Identity</label>
                     <input name="name" placeholder="Full Name" className="w-full p-6 bg-slate-50 rounded-[30px] font-bold outline-none ring-2 ring-transparent focus:ring-emerald-500/10 transition-all" required />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Primary Task</label>
                        <input name="task" placeholder="e.g. Seeding" className="p-6 bg-slate-50 rounded-[30px] font-bold outline-none" required />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Daily Wage (₹)</label>
                        <input name="wage" type="number" placeholder="450" className="p-6 bg-slate-50 rounded-[30px] font-bold outline-none" required />
                      </div>
                   </div>
                 </>
               )}
               {showAddModal === 'harvest' && (
                 <>
                   <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Crop Species</label>
                     <input name="crop" placeholder="e.g. Paddy" className="w-full p-6 bg-slate-50 rounded-[30px] font-bold outline-none" required />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Quantity (kg)</label>
                        <input name="qty" type="number" placeholder="1000" className="p-6 bg-slate-50 rounded-[30px] font-bold outline-none" required />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Sold Price (₹/kg)</label>
                        <input name="price" type="number" placeholder="22" className="p-6 bg-slate-50 rounded-[30px] font-bold outline-none" required />
                      </div>
                   </div>
                 </>
               )}
               {showAddModal === 'pesticide' && (
                 <>
                   <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Target Crop</label>
                     <input name="crop" placeholder="e.g. Arecanut" className="w-full p-6 bg-slate-50 rounded-[30px] font-bold outline-none" required />
                   </div>
                   <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Chemical/Spray Name</label>
                     <input name="name" placeholder="e.g. Neem Oil (Organic)" className="w-full p-6 bg-slate-50 rounded-[30px] font-bold outline-none" required />
                   </div>
                 </>
               )}
               <button 
                type="submit" 
                className="w-full py-7 bg-emerald-600 text-white rounded-[35px] font-black text-xl shadow-2xl shadow-emerald-200 active:scale-95 transition-all mt-4"
                aria-label="Confirm and save the new farm entry"
               >
                Confirm & Save Entry
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
