"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
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

  if (role === "doctor") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-600 mb-6 font-black italic">!</div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-2">Operational Privacy</h2>
        <p className="text-slate-500 text-sm max-w-xs font-medium">The Strategic Reports Hub is reserved for Managerial and Administrative roles. Clinical duties only beyond this point.</p>
        <Link href="/dashboard" className="mt-8 px-8 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Back to Clinical Protocol</Link>
      </div>
    );
  }

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

  const currentSales = filterByRange(sales);
  const currentAppts = filterByRange(appts);
  const statStyles: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600",
    blue: "bg-blue-500/10 text-blue-600",
    purple: "bg-purple-500/10 text-purple-600",
  };

  const totalRevenue = currentSales.reduce((sum, s) => sum + s.totalAmount, 0) + 
                       currentAppts.filter(a => a.status === "Completed").reduce((sum, a) => sum + (a.price || 500), 0);
  
  const totalSales = currentSales.length;
  const totalCases = currentAppts.length;

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const daySales = currentSales.filter(s => {
      const sd = s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000) : new Date();
      return sd.toDateString() === d.toDateString();
    });
    return {
      name: d.toLocaleDateString('en-US', { weekday: 'short' }),
      revenue: daySales.reduce((sum, s) => sum + s.totalAmount, 0)
    };
  });

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">Strategic Reports</h1>
          <p className="text-slate-500 font-medium">Financial and Operational Analytics Engine</p>
        </div>
        
        <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-x-auto shadow-sm">
          {["Today", "Week", "Month", "All"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r as TimeRange)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                range === r ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Aggregate Revenue", val: `₹${totalRevenue}`, icon: IndianRupee, color: "emerald" },
          { label: "Direct Sales", val: totalSales, icon: ShoppingCart, color: "blue" },
          { label: "Clinical Cases", val: totalCases, icon: Activity, color: "purple" }
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[35px] border border-slate-100 dark:border-slate-800 shadow-sm">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${statStyles[s.color] || statStyles.emerald}`}><s.icon size={24} /></div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{s.label}</p>
             <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{s.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Velocity Trends</h2>
            <Download className="text-slate-400 cursor-pointer" size={20} />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="clr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fill="url(#clr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-8">Clinical vs Retail</h2>
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/30">
               <div className="flex justify-between items-center mb-2">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Medical Revenue</p>
                 <span className="text-xs font-black text-emerald-600 italic">Core Clinical</span>
               </div>
               <p className="text-2xl font-black text-slate-900 dark:text-white">₹{currentAppts.filter(a => a.status === "Completed").reduce((sum, a) => sum + (a.price || 500), 0)}</p>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/30">
               <div className="flex justify-between items-center mb-2">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Shop Revenue</p>
                 <span className="text-xs font-black text-emerald-600 italic">Direct Sale</span>
               </div>
               <p className="text-2xl font-black text-slate-900 dark:text-white">₹{currentSales.reduce((sum, s) => sum + s.totalAmount, 0)}</p>
            </div>
            <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl shadow-slate-900/10">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Efficiency Rating</p>
               <div className="flex items-center gap-3">
                 <BarChart3 className="text-emerald-500" />
                 <p className="text-2xl font-black italic tracking-tighter">98.4% STATUS: OPTIMAL</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
