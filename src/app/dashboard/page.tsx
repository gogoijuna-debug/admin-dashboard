"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, limit, updateDoc, doc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { 
  Calendar, 
  Package, 
  TrendingUp,
  ArrowUpRight,
  ClipboardList,
  AlertTriangle,
  IndianRupee,
  Activity,
  CheckCircle,
  User
} from "lucide-react";
import Link from "next/link";
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

export default function DashboardPage() {
  const { user, role } = useAuth();
  const [stats, setStats] = useState([
    { name: "Appointments", value: "0", icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10", href: "/dashboard/appointments" },
    { name: "Pending Orders", value: "0", icon: ClipboardList, color: "text-amber-500", bg: "bg-amber-500/10", href: "/dashboard/appointments" },
    { name: "Total Revenue", value: "₹0", icon: IndianRupee, color: "text-emerald-500", bg: "bg-emerald-500/10", href: "/dashboard/appointments" },
    { name: "Critical Stock", value: "0", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", href: "/dashboard/inventory" },
  ]);

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
      let filteredDocs = snap.docs;
      if (role === 'doctor' && user) {
        filteredDocs = snap.docs.filter(d => d.data().assignedDoctorId === user.uid && d.data().type !== 'Order');
      }

      const all = filteredDocs.length;
      const pending = filteredDocs.filter(d => d.data().status === "Pending").length;
      
      let revenue = 0;
      if (role === 'admin') {
        snap.forEach(doc => {
          const data = doc.data();
          if (data.status === "Completed" && data.type === "Order") {
            revenue += Number(data.price || 500);
          }
        });
      }

      setStats(prev => {
        const next = [...prev];
        if (role === 'doctor') {
          next[0].name = "My Appointments";
          next[0].value = all.toString();
          next[1].name = "Assigned Consults";
          next[1].value = pending.toString();
          next[2].name = "Completed Logs";
          next[2].value = filteredDocs.filter(d => d.data().status === 'Completed').length.toString();
          next[2].icon = CheckCircle;
          next[3].name = "Total Patients";
          next[3].value = new Set(filteredDocs.map(d => d.data().farmerName)).size.toString();
          next[3].icon = User;
          next[3].color = "text-blue-600";
          next[3].bg = "bg-blue-600/10";
          next[3].href = "/dashboard/appointments";
        } else {
          next[0].value = all.toString();
          next[1].value = pending.toString();
          next[2].value = `₹${revenue.toLocaleString()}`;
        }
        return next;
      });
    });

    const unsubInventory = onSnapshot(collection(db, "inventory"), (snap) => {
      const low = snap.docs.filter(d => (d.data().stock || 0) <= 5).length;
      
      if (role === 'admin' || role === 'manager') {
        setStats(prev => {
          const next = [...prev];
          next[3].value = low.toString();
          return next;
        });
        
        setLowStockItems(snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((item: any) => (item.stock || 0) <= 5)
          .slice(0, 5)
        );
      }
    });

    const baseQuery = collection(db, "appointments");
    const qRecent = query(baseQuery, orderBy("createdAt", "desc"), limit(10));
    const unsubRecent = onSnapshot(qRecent, (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (role === 'doctor' && user) {
        data = data.filter((a: any) => a.assignedDoctorId === user.uid && a.type !== 'Order');
      }
      setRecentAppointments(data.slice(0, 5));
    });

    const unsubChart = onSnapshot(collection(db, "appointments"), (snap) => {
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return { 
          date: d.toLocaleDateString(), 
          dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
          orders: 0,
          consultations: 0
        };
      }).reverse();

      snap.forEach(doc => {
        const data = doc.data();
        if (role === 'doctor' && user && (data.assignedDoctorId !== user.uid || data.type === 'Order')) return;

        if (data.createdAt?.seconds) {
          const date = new Date(data.createdAt.seconds * 1000).toLocaleDateString();
          const day = last7Days.find(d => d.date === date);
          if (day) {
            if (data.type === 'Order') day.orders++;
            else day.consultations++;
          }
        }
      });

      setChartData(last7Days);
    });

    const unsubStatus = onSnapshot(collection(db, "users"), (snap) => {
      setSnapDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubAppts();
      unsubInventory();
      unsubRecent();
      unsubChart();
      unsubStatus();
    };
  }, [role, user]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-10"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 italic uppercase">
            <Activity className="text-emerald-500" size={24} />
            Command Center
          </h1>
          <div className="text-slate-500 dark:text-slate-400 font-black mt-0.5 uppercase tracking-widest text-[9px] flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
            Operational Intelligence & Analytics
          </div>
        </div>
        <div className="flex items-center gap-3">
          {role === 'doctor' && user && (
            <button 
              onClick={async () => {
                const currentUser = snapDocs.find(d => d.id === user.uid);
                const currentStatus = currentUser?.active !== false;
                await updateDoc(doc(db, "users", user.uid), { active: !currentStatus });
              }}
              className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest border transition-all flex items-center gap-2 ${
                snapDocs.find(d => d.id === user.uid)?.active !== false 
                ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20" 
                : "bg-red-500/5 text-red-500 border-red-500/10 hover:bg-red-500 hover:text-white"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${snapDocs.find(d => d.id === user.uid)?.active !== false ? 'bg-white animate-pulse' : 'bg-red-500'}`} />
              {snapDocs.find(d => d.id === user.uid)?.active !== false ? 'Duty: Online' : 'Duty: Offline'}
            </button>
          )}
          <div className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest border border-emerald-500/10 backdrop-blur-md flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            System Live
          </div>
        </div>
      </div>

      {/* Metric Grid - High Density */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link href={stat.href} key={stat.name} className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-start justify-between hover:scale-[1.02] transition-all group overflow-hidden relative active:scale-95">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform" />
            <div className="space-y-3 relative z-10">
              <div className={`w-11 h-11 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center shadow-inner`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">{stat.name}</p>
                <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{stat.value}</p>
              </div>
            </div>
            <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-all relative z-10">
              <ArrowUpRight size={14} />
            </div>
          </Link>
        ))}
      </div>

      {/* Analytics Chart - Refined */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tighter flex items-center gap-2">
              <TrendingUp size={22} className="text-emerald-500" />
              Operational Flow
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Activity breakdown for the last 7 days</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Orders</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Consults</span>
            </div>
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
                <linearGradient id="colorConsults" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="dayName" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 'bold'}}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 'bold'}} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '10px' }}
              />
              <Area 
                type="monotone" 
                dataKey="orders" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorOrders)" 
              />
              <Area 
                type="monotone" 
                dataKey="consultations" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorConsults)" 
              />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-1 ${role === 'admin' ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Recent Activity List */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight uppercase flex items-center gap-2 italic">
              Recent Intake
            </h3>
            <Link href="/dashboard/appointments" className="text-emerald-600 dark:text-emerald-400 font-black text-[9px] uppercase tracking-widest bg-emerald-500/5 px-4 py-2 rounded-xl hover:bg-emerald-600 hover:text-white transition-all">Archive</Link>
          </div>
          <div className="p-2">
            <div className="space-y-1">
              {recentAppointments.length === 0 ? (
                <div className="p-16 text-center text-slate-300 font-black uppercase tracking-widest text-[10px]">Empty</div>
              ) : recentAppointments.map((appt) => (
                <div key={appt.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-2xl transition-all group">
                  <div className="w-11 h-11 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-900 dark:text-white font-black text-base group-hover:scale-105 transition-all">
                    {appt.farmerName?.charAt(0) || 'F'}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{appt.farmerName}</p>
                    <p className="text-[10px] text-slate-400 font-bold truncate max-w-[150px]">{appt.issue}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                      appt.status === 'Pending' 
                        ? 'bg-amber-500/5 text-amber-600 border-amber-500/10' 
                        : 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20'
                    }`}>
                      {appt.status}
                    </span>
                    <p className="text-[8px] text-slate-300 font-bold uppercase">
                      {appt.createdAt?.seconds ? new Date(appt.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sync'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stock Alerts Hub - Admin & Manager */}
        {(role === 'admin' || role === 'manager') && (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-red-500 text-base tracking-tight uppercase flex items-center gap-2 italic">
                Supply Alerts
              </h3>
              <Link href="/dashboard/inventory" className="text-red-500 font-black text-[9px] uppercase tracking-widest bg-red-500/5 px-4 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-all">Restock</Link>
            </div>
            <div className="p-2">
              <div className="space-y-1">
                {lowStockItems.length === 0 ? (
                  <div className="p-16 text-center text-slate-300 font-black uppercase tracking-widest text-[10px]">Healthy</div>
                ) : lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-red-500/5 rounded-2xl transition-all group">
                    <div className="w-11 h-11 bg-red-500/5 rounded-xl flex items-center justify-center text-red-500 group-hover:rotate-12 transition-transform">
                      <Package size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{item.name}</p>
                      <p className="text-[10px] text-red-500 font-bold uppercase">Only {item.stock} {item.unit} left</p>
                    </div>
                    <Link href="/dashboard/inventory" className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">Action</Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
