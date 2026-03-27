"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, where, limit, doc, getDoc, updateDoc } from "firebase/firestore";
import { 
  Users, 
  CalendarClock, 
  Package, 
  TrendingUp, 
  Activity, 
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  Clock,
  CheckCircle2,
  Stethoscope,
  ShoppingCart,
  Plus
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export default function DashboardPage() {
  const { user, role, profile } = useAuth();
  const [stats, setStats] = useState({
    totalFarmers: 0,
    activeAppointments: 0,
    lowStockItems: 0,
    dailyRevenue: 0
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [snapDocs, setSnapDocs] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!role) return;

    // Real-time Top Stats & Revenue
    const unsubAppts = onSnapshot(collection(db, "appointments"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const active = data.filter((a: any) => a.status === "Confirmed" || a.status === "In Progress").length;
      
      // Calculate daily revenue from both orders and shop sales
      const now = new Date();
      now.setHours(0,0,0,0);
      
      const ordersRev = data
        .filter((a: any) => a.type === "Order" && a.status === "Completed")
        .reduce((sum: number, a: any) => sum + (a.price || 500), 0);

      setStats(prev => ({ ...prev, activeAppointments: active, dailyRevenue: ordersRev }));
      setRecentAppointments(data.slice(0, 5));
    });

    const unsubFarmers = onSnapshot(collection(db, "farmers"), (snap) => {
      setStats(prev => ({ ...prev, totalFarmers: snap.size }));
    });

    const unsubInv = onSnapshot(query(collection(db, "inventory"), where("stock", "<=", 10)), (snap) => {
      setStats(prev => ({ ...prev, lowStockItems: snap.size }));
      setLowStockItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Sync Doctors for "Team" view
    const unsubDocs = onSnapshot(query(collection(db, "users"), where("role", "==", "doctor")), (snap) => {
      setSnapDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 7-day Operational Trend Analytics
    const unsubSales = onSnapshot(query(collection(db, "sales"), orderBy("createdAt", "desc")), (snap) => {
      const sales = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        d.setHours(0,0,0,0);
        return d;
      });

      const trend = last7Days.map(date => {
        const daySales = sales.filter((s: any) => {
          const sd = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
          sd.setHours(0,0,0,0);
          return sd.getTime() === date.getTime();
        });
        return {
          name: date.toLocaleDateString('en-US', { weekday: 'short' }),
          orders: daySales.length,
          revenue: daySales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0)
        };
      });
      setChartData(trend);
      
      const totalShopRev = sales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
      setStats(prev => ({ ...prev, dailyRevenue: prev.dailyRevenue + totalShopRev }));
    });

    return () => {
      unsubAppts();
      unsubFarmers();
      unsubInv();
      unsubDocs();
      unsubSales();
    };
  }, [role]);

  const toggleDuty = async (doctorId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "users", doctorId), {
        onDuty: !currentStatus
      });
    } catch (e) {
      console.error("Duty toggle failed:", e);
    }
  };

  if (!mounted) return null;
  if (!user) return null;

  return (
    <div className="space-y-10 pb-12">
      {/* Top Banner & Profile Overview */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-md">Operational Status: Active</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Welcome, <span className="text-emerald-600 italic">Dr. {profile?.name || "Expert"}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Sanjivani Vet Care Strategic Command Center</p>
        </div>
        
        <div className="flex items-center gap-3 p-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
           <div className="w-12 h-12 rounded-xl overflow-hidden shadow-inner">
             <Image 
               src={profile?.imageUrl || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=2070&auto=format&fit=crop"} 
               alt="User" width={48} height={48} className="object-cover" 
             />
           </div>
           <div className="pr-4">
             <p className="text-xs font-bold text-slate-900 dark:text-white leading-none mb-1">{profile?.name}</p>
             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">{role}</p>
           </div>
        </div>
      </section>

      {/* Real-time Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Village Network", val: stats.totalFarmers, icon: Users, color: "blue", trend: "+12%" },
          { label: "Active Protocol", val: stats.activeAppointments, icon: Activity, color: "emerald", trend: "Normal" },
          { label: "Critical Stock", val: stats.lowStockItems, icon: Package, color: "amber", trend: stats.lowStockItems > 0 ? "Urgent" : "Managed" },
          { label: "Shift Revenue", val: `₹${stats.dailyRevenue}`, icon: TrendingUp, color: "purple", trend: "+₹1,200 сегодня" }
        ].map((s, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i}
            className="group relative bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500 overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${s.color}-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700`} />
            <div className="relative z-10">
              <div className={`w-12 h-12 rounded-2xl bg-${s.color}-500/10 flex items-center justify-center text-${s.color}-600 dark:text-${s.color}-400 mb-4 group-hover:scale-110 transition-transform`}>
                <s.icon size={24} strokeWidth={2.5} />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{s.val}</p>
                </div>
                <div className={`text-[10px] font-bold px-2 py-1 rounded-full ${s.trend.includes("+") || s.trend === "Normal" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                  {s.trend}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 7-DAY OPERATIONAL TREND & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Clinical & Sales Trend</h2>
              <p className="text-xs font-bold text-slate-400">7-Day Operational Velocity</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Feed
              </span>
            </div>
          </div>
          
          <div className="h-[250px] w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                  dy={10} 
                />
                <YAxis hide domain={[0, 'dataMax + 5']} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    backgroundColor: '#0f172a',
                    color: '#fff'
                  }}
                  itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                  labelStyle={{ display: 'none' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorOrders)" 
                  animationDuration={2000}
                />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-emerald-600 p-8 rounded-[40px] text-white shadow-xl shadow-emerald-600/20 relative overflow-hidden group">
            <Plus className="absolute bottom-[-20px] right-[-20px] w-32 h-32 opacity-10 group-hover:rotate-90 transition-transform duration-700" />
            <h3 className="text-xl font-black mb-1 uppercase tracking-tighter">New Specialist</h3>
            <p className="text-emerald-100 text-xs font-bold mb-6">Expand your clinical reach.</p>
            <Link 
              href="/dashboard/users"
              className="inline-flex items-center gap-2 bg-white text-emerald-600 px-6 py-3 rounded-2xl text-xs font-black shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              Add Staff <Plus size={16} />
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[35px] shadow-sm">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Global Status</h3>
             </div>
             <div className="space-y-3">
               {snapDocs.slice(0, 3).map((doc: any, i) => (
                 <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse overflow-hidden">
                          {doc.imageUrl && <Image src={doc.imageUrl} alt={doc.name} width={32} height={32} className="object-cover"/>}
                       </div>
                       <div>
                         <p className="text-[10px] font-black text-slate-900 dark:text-white leading-none">{doc.name}</p>
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{doc.specialization || "General"}</p>
                       </div>
                    </div>
                    {/* Only show duty toggle if user is the doctor or admin */}
                    {(user?.uid === doc.id || role === "admin") && (
                      <button 
                        onClick={() => toggleDuty(doc.id, doc.onDuty)}
                        className={`w-8 h-4 rounded-full relative transition-colors ${doc.onDuty ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      >
                         <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${doc.onDuty ? 'left-4.5' : 'left-0.5'}`} />
                      </button>
                    )}
                    {!(user?.uid === doc.id || role === "admin") && (
                      <div className={`w-2 h-2 rounded-full ${doc.onDuty ? 'bg-emerald-500' : 'bg-slate-300'} shadow-[0_0_8px] ${doc.onDuty ? 'shadow-emerald-500/50' : 'shadow-transparent'}`} />
                    )}
                 </div>
               ))}
             </div>
             <Link href="/dashboard/users" className="block text-center mt-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">View Entire Roster</Link>
          </div>
        </div>
      </div>

      {/* RECENT CASEWORK & INVENTORY ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Clock className="text-emerald-500" /> Recent Consultations
              </h2>
              <Link href="/dashboard/appointments" className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">View All</Link>
            </div>
            <div className="space-y-4">
              {recentAppointments.length > 0 ? (
                recentAppointments.map((appt, i) => (
                  <div key={i} className="group flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[25px] hover:bg-emerald-500 hover:scale-[1.02] transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm group-hover:bg-emerald-400">
                        <Stethoscope size={20} className="text-emerald-600 group-hover:text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white group-hover:text-white leading-none mb-1">{appt.farmerName}</p>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-emerald-100 uppercase tracking-tighter">{appt.animalType} • {appt.issue}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                        appt.status === "Completed" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                      } group-hover:bg-white/20 group-hover:text-white`}>
                        {appt.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                   <Activity className="mx-auto text-slate-300 mb-2" size={48} strokeWidth={1} />
                   <p className="text-xs font-bold text-slate-400">No active cases reported in the last cycle.</p>
                </div>
              )}
            </div>
         </div>

         <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16" />
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <AlertTriangle className="text-red-500" /> Stock Vulnerabilities
              </h2>
              <Link href="/dashboard/inventory" className="text-[10px] font-black text-red-600 uppercase tracking-widest px-4 py-2 bg-red-50 dark:bg-red-500/10 rounded-xl">Restock Hub</Link>
            </div>
            <div className="space-y-4">
              {lowStockItems.length > 0 ? (
                lowStockItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-red-100 dark:border-red-900/30 rounded-[25px] bg-red-50/30 dark:bg-red-900/10">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                        <Package size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white leading-none mb-1">{item.name}</p>
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">Only {item.stock} {item.unit} left</p>
                      </div>
                    </div>
                    <Link href="/dashboard/inventory" className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-400 hover:text-red-500 transition-colors">
                       <Plus size={16} />
                    </Link>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                   <CheckCircle2 className="mx-auto text-emerald-400 mb-2" size={48} strokeWidth={1} />
                   <p className="text-xs font-bold text-emerald-600">Storage levels are optimized. No alerts.</p>
                </div>
              )}
            </div>
            {lowStockItems.length > 0 && (
              <div className="mt-8 p-4 bg-slate-900 dark:bg-slate-800 rounded-[25px] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <ShoppingCart size={20} className="text-emerald-400" />
                   <p className="text-[10px] font-black text-white uppercase tracking-widest">Auto-Procurement Suggestion</p>
                 </div>
                 <button className="text-[10px] font-black text-emerald-400 underline">Generate PO</button>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
