"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, where, Timestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { 
  BarChart3, 
  TrendingUp, 
  IndianRupee, 
  ShoppingCart, 
  ClipboardCheck, 
  Calendar, 
  Download,
  Filter,
  ArrowUpRight,
  Package,
  Activity,
  ChevronRight
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

interface SaleItem { 
  name: string; 
  quantity: number; 
  price: number; 
}

interface SaleRecord {
  id: string;
  totalAmount: number;
  items: SaleItem[];
  createdAt: any;
  farmerName?: string;
  type?: string;
}

interface AppointmentRecord {
  id: string;
  type: "Consultation" | "Order";
  price?: number;
  status: string;
  createdAt: any;
}

type TimeRange = "Today" | "Week" | "Month" | "All";

export default function ReportsPage() {
  const { role } = useAuth();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [appts, setAppts] = useState<AppointmentRecord[]>([]);
  const [range, setRange] = useState<TimeRange>("Month");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubSales = onSnapshot(query(collection(db, "sales"), orderBy("createdAt", "desc")), (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as SaleRecord)));
    });

    const unsubAppts = onSnapshot(query(collection(db, "appointments"), orderBy("createdAt", "desc")), (snap) => {
      setAppts(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppointmentRecord)));
      setLoading(false);
    });

    return () => { unsubSales(); unsubAppts(); };
  }, []);

  if (!mounted) return null;

  const filterByRange = (data: any[]) => {
    const now = new Date();
    return data.filter(item => {
      if (!item.createdAt?.seconds) return range === "All";
      const itemDate = new Date(item.createdAt.seconds * 1000);
      if (range === "Today") return itemDate.toDateString() === now.toDateString();
      if (range === "Week") {
        const lastWeek = new Date(); lastWeek.setDate(now.getDate() - 7);
        return itemDate >= lastWeek;
      }
      if (range === "Month") {
        const lastMonth = new Date(); lastMonth.setMonth(now.getMonth() - 1);
        return itemDate >= lastMonth;
      }
      return true;
    });
  };

  const filteredSales = filterByRange(sales);
  const filteredAppts = filterByRange(appts);

  const directRevenue = filteredSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const onlineRevenue = filteredAppts.reduce((sum, a) => sum + (a.type === "Order" && a.status === "Completed" ? (a.price || 500) : 0), 0);
  const totalConsults = filteredAppts.filter(a => a.type === "Consultation").length;

  const topProducts = () => {
    const counts: Record<string, { qty: number; revenue: number }> = {};
    filteredSales.forEach(s => {
      s.items?.forEach((i: SaleItem) => {
        if (!counts[i.name]) counts[i.name] = { qty: 0, revenue: 0 };
        counts[i.name].qty += i.quantity;
        counts[i.name].revenue += (i.price * i.quantity);
      });
    });
    return Object.entries(counts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const chartData = () => {
    const days = range === "Today" ? 1 : range === "Week" ? 7 : range === "Month" ? 30 : 90;
    const data = [...Array(days)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return { 
        date: d.toLocaleDateString(), 
        label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        direct: 0,
        online: 0
      };
    }).reverse();

    filteredSales.forEach(s => {
      if (s.createdAt?.seconds) {
        const date = new Date(s.createdAt.seconds * 1000).toLocaleDateString();
        const day = data.find(d => d.date === date);
        if (day) day.direct += s.totalAmount;
      }
    });

    filteredAppts.forEach(a => {
      if (a.createdAt?.seconds && a.type === "Order" && a.status === "Completed") {
        const date = new Date(a.createdAt.seconds * 1000).toLocaleDateString();
        const day = data.find(d => d.date === date);
        if (day) day.online += (a.price || 500);
      }
    });

    return data;
  };

  const exportCSV = () => {
    const headers = ["ID", "Type", "Farmer", "Amount", "Date"];
    const rows = [
      ...filteredSales.map(s => [s.id, "Direct Sale", s.farmerName || "Guest", s.totalAmount, new Date(s.createdAt.seconds * 1000).toLocaleString()]),
      ...filteredAppts.map(a => [a.id, a.type, "N/A", a.price || 0, new Date(a.createdAt.seconds * 1000).toLocaleString()])
    ];
    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `sanjivani_report_${range}.csv`; link.click();
  };

  if (role === "doctor") return <div className="p-20 text-center font-black text-slate-400">Restricted Strategic Intel</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-2 italic">
            <BarChart3 className="text-emerald-500" size={24} />
            Financial Command Hub
          </h1>
          <div className="text-slate-500 dark:text-slate-400 font-black mt-0.5 uppercase tracking-widest text-[9px] flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             Strategic Revenue & Operational Analytics
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-2xl">
           {(["Today", "Week", "Month", "All"] as TimeRange[]).map(t => (
             <button 
               key={t}
               onClick={() => setRange(t)}
               className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                 range === t ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
               }`}
             >
               {t}
             </button>
           ))}
           <button 
             onClick={exportCSV}
             className="ml-2 p-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
           >
             <Download size={14} />
           </button>
        </div>
      </div>

      {/* Main Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
             <IndianRupee size={64} className="text-emerald-500" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Direct Shop Revenue</p>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">₹{directRevenue.toLocaleString()}</h2>
          <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-emerald-500">
             <ArrowUpRight size={14} />
             <span>RETAIL VELOCITY ACTIVE</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group border-b-blue-500">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
             <ShoppingCart size={64} className="text-blue-500" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Online Pharmacy Revenue</p>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">₹{onlineRevenue.toLocaleString()}</h2>
          <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-blue-500">
             <ArrowUpRight size={14} />
             <span>ORDER FLUX STABLE</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
             <Activity size={64} className="text-purple-500" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Clinical Consultations</p>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">{totalConsults}</h2>
          <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-purple-500">
             <TrendingUp size={14} />
             <span>EXPERTISE DEMAND HIGH</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Analytics */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black tracking-tighter uppercase italic flex items-center gap-2">
                 <BarChart3 className="text-emerald-500" size={20} /> Revenue Streaming
              </h3>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[8px] font-black uppercase text-slate-400">Direct</span></div>
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[8px] font-black uppercase text-slate-400">Online</span></div>
              </div>
           </div>
           <div className="h-[300px] w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData()}>
                    <defs>
                       <linearGradient id="colDir" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="colOn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#94a3b8'}} />
                    <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold'}} />
                    <Area type="monotone" dataKey="direct" stroke="#10b981" strokeWidth={3} fill="url(#colDir)" />
                    <Area type="monotone" dataKey="online" stroke="#3b82f6" strokeWidth={3} fill="url(#colOn)" />
                 </AreaChart>
              </ResponsiveContainer>
              )}
           </div>
        </div>

        {/* Top Products Rank */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
           <h3 className="text-lg font-black tracking-tighter uppercase italic flex items-center gap-2 mb-8">
              <Package className="text-amber-500" size={20} /> Top Assets Sold
           </h3>
           <div className="flex-1 space-y-4">
              {topProducts().map((p, idx) => (
                <div key={p.name} className="flex items-center gap-4 group">
                   <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-all">
                      {idx + 1}
                   </div>
                   <div className="flex-1 overflow-hidden">
                      <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate tracking-tight">{p.name}</p>
                      <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                         <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(p.revenue / (topProducts()[0]?.revenue || 1)) * 100}%` }} />
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-900 dark:text-white">₹{p.revenue.toLocaleString()}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">{p.qty} Sold</p>
                   </div>
                </div>
              ))}
              {topProducts().length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                   <Package size={48} />
                   <p className="text-[10px] font-black uppercase mt-2">No Sales Recorded</p>
                </div>
              )}
           </div>
           <Link href="/dashboard/inventory" className="mt-8 w-full p-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all group">
              Optimize Inventory <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
           </Link>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
