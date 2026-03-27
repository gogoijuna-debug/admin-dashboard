"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, where, doc, updateDoc } from "firebase/firestore";
import { 
  Users, 
  Package, 
  TrendingUp, 
  Activity, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  Stethoscope,
  ShoppingCart,
  Plus,
  ShieldCheck,
  ClipboardList
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

    const unsubDocs = onSnapshot(query(collection(db, "users"), where("role", "==", "doctor")), (snap) => {
      setSnapDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

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
      await updateDoc(doc(db, "users", doctorId), { onDuty: !currentStatus });
    } catch (e) {
      console.error(e);
    }
  };

  const dashboardTitle = role === "doctor" ? "Clinical Lead" : role === "manager" ? "Operations Lead" : "Super Admin";
  const namePrefix = role === "doctor" ? "Dr. " : "";

  if (!mounted || !user) return null;

  return (
    <div className="space-y-10 pb-12">
      {/* Top Banner & Profile Overview */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-md">
              {dashboardTitle} Status: Active
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Welcome back, <span className="text-emerald-600 italic">{namePrefix}{profile?.name || "Expert"}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Sanjivani Strategic Command Center</p>
        </div>
        
        <div className="flex items-center gap-3 p-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
           <div className="w-12 h-12 rounded-xl overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
             <Image 
               src={(profile?.imageUrl && profile.imageUrl !== "") ? profile.imageUrl : "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1528&auto=format&fit=crop"} 
               alt="Profile" width={48} height={48} className="object-cover w-full h-full" 
               unoptimized={true}
             />
           </div>
           <div className="pr-4">
             <p className="text-xs font-bold text-slate-900 dark:text-white leading-none mb-1">{profile?.name || user?.email}</p>
             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">{role}</p>
           </div>
        </div>
      </section>

      {/* Real-time Metrics - Role Based Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Community", val: stats.totalFarmers, icon: Users, color: "blue", trend: "Network" },
          { label: "Capacity", val: stats.activeAppointments, icon: Activity, color: "emerald", trend: "Protocol" },
          { label: "Stock Health", val: stats.lowStockItems, icon: Package, color: "amber", trend: "Inventory" },
          { label: "Rev Performance", val: `₹${stats.dailyRevenue}`, icon: TrendingUp, color: "purple", trend: "Growth" }
        ].map((s, i) => (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={i} className="group bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-300">
             <div className={`w-12 h-12 rounded-2xl bg-${s.color}-500/10 flex items-center justify-center text-${s.color}-600 mb-4`}><s.icon size={24} /></div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
             <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{s.val}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Graph - Operational Velocity */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Trend Analysis</h2>
            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase">Real-time</div>
          </div>
          <div className="h-[250px] w-full">
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

        {/* Specialized Command Hubs */}
        <div className="space-y-6">
          {role === "manager" || role === "admin" ? (
             <Link href="/dashboard/shop" className="block bg-emerald-600 p-8 rounded-[40px] text-white shadow-xl shadow-emerald-600/20 group hover:scale-[1.02] transition-all">
                <ShoppingCart className="mb-4 text-emerald-200" size={32} />
                <h3 className="text-xl font-black tracking-tighter uppercase">Direct POS Hub</h3>
                <p className="text-emerald-100 text-xs font-bold mt-1">Initialize Direct Retail Sales</p>
                <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase">Launch Station <Plus size={14}/></div>
             </Link>
          ) : (
            <Link href="/dashboard/appointments" className="block bg-blue-600 p-8 rounded-[40px] text-white shadow-xl shadow-blue-600/20 group hover:scale-[1.02] transition-all">
                <Stethoscope className="mb-4 text-blue-200" size={32} />
                <h3 className="text-xl font-black tracking-tighter uppercase">Protocol Hub</h3>
                <p className="text-blue-100 text-xs font-bold mt-1">Manage Clinical Consultations</p>
                <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase">Open Cases <Plus size={14}/></div>
             </Link>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[35px]">
             <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">Operations Team</h3>
             <div className="space-y-3">
               {snapDocs.slice(0, 3).map((doc: any, i) => (
                 <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-lg bg-slate-200 overflow-hidden">
                          <Image src={doc.imageUrl || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=100&auto=format&fit=crop"} alt={doc.name} width={32} height={32} className="object-cover h-full" unoptimized={true} />
                       </div>
                       <p className="text-[10px] font-black text-slate-900 dark:text-white">{doc.name}</p>
                    </div>
                    {(user?.uid === doc.id || role === "admin") && (
                      <button onClick={() => toggleDuty(doc.id, doc.onDuty)} className={`w-8 h-4 rounded-full relative transition-colors ${doc.onDuty ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                         <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${doc.onDuty ? 'left-4.5' : 'left-0.5'}`} />
                      </button>
                    )}
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>

      {/* Detailed Casework / Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2"><Clock className="text-emerald-500" /> Recent Activity</h2>
              <Link href="/dashboard/appointments" className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">View Roster</Link>
            </div>
            <div className="space-y-4">
              {recentAppointments.map((appt, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-emerald-600"><ClipboardList size={20} /></div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{appt.farmerName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{appt.animalType} • {appt.issue}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black px-3 py-1 bg-white dark:bg-slate-700 rounded-full">{appt.status}</span>
                </div>
              ))}
            </div>
         </div>

         <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-8"><Package className="text-amber-500" /> Stock Monitor</h2>
            <div className="space-y-4">
              {lowStockItems.length > 0 ? lowStockItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-3xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"><Package size={20} /></div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-[10px] font-bold text-red-500">Only {item.stock} {item.unit} left</p>
                    </div>
                  </div>
                  <Link href="/dashboard/inventory" className="p-2 bg-white rounded-lg shadow-sm"><Plus size={14}/></Link>
                </div>
              )) : (
                <div className="text-center py-10 opacity-30"><ShieldCheck size={48} className="mx-auto text-emerald-500 mb-2"/><p className="text-xs font-black uppercase">Inventory Secure</p></div>
              )}
            </div>
         </div>
      </div>
    </div>
  );
}
