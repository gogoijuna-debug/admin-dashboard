"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, where, doc, getDoc, updateDoc } from "firebase/firestore";
import { 
  Users, 
  TrendingUp, 
  Activity, 
  Clock, 
  Stethoscope, 
  ShoppingCart, 
  Plus, 
  Package, 
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
    dailyRevenue: 0,
    totalConsultations: 0,
    todayCases: 0,
    myActiveCases: 0,
    todayShopSales: 0
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [snapDocs, setSnapDocs] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [consultationFee, setConsultationFee] = useState(300);

  // 🛡️ Helper: Strict Today Check
  const isToday = (date: any) => {
    if (!date) return false;
    const d = date?.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  useEffect(() => {
    setMounted(true);
    if (!role || !user) return;

    // 🔬 Global Settings Intake
    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, "settings", "global"));
      if (docSnap.exists()) {
        setConsultationFee(docSnap.data().consultationFee || 300);
      }
    };
    fetchSettings();

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0,0,0,0);
      return d;
    });

    // 🔬 Unitary Data Stream
    const unsubAppts = onSnapshot(query(collection(db, "appointments"), orderBy("createdAt", "desc")), (snap) => {
      const allData = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      // Role-Specific Filtered Set
      const personalData = role === "doctor" 
        ? allData.filter(a => a.type !== "Order" && a.assignedDoctorId === user.uid)
        : allData;

      // Revenue Metrics (Strict Numeric)
      const ordersRevToday = allData
        .filter(a => a.type === "Order" && a.status === "Completed" && isToday(a.createdAt))
        .reduce((sum, a) => sum + (Number(a.price) || 0), 0);

      const consultsRevToday = allData
        .filter(a => a.type === "Consultation" && a.status === "Completed" && isToday(a.createdAt))
        .filter(a => role === "doctor" ? a.assignedDoctorId === user.uid : true)
        .reduce((sum, a) => sum + (Number(a.price) || consultationFee), 0);

      const systemActive = allData.filter(a => a.status !== "Completed" && a.status !== "Cancelled").length;

      setStats(prev => ({ 
        ...prev, 
        activeAppointments: systemActive, 
        todayCases: personalData.filter(a => isToday(a.createdAt)).length,
        myActiveCases: role === "doctor" 
          ? personalData.filter(a => a.status !== "Completed").length
          : 0,
        totalConsultations: personalData.length,
        dailyRevenue: (role === "doctor" ? consultsRevToday : (ordersRevToday + consultsRevToday))
      }));
      
      setRecentAppointments(personalData.slice(0, 5));

      // 📊 Trend Aggregation
      if (role === "doctor") {
        const trend = last7Days.map(date => ({
          name: date.toLocaleDateString('en-US', { weekday: 'short' }),
          val: personalData.filter(a => {
            const ad = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            ad.setHours(0,0,0,0);
            return ad.getTime() === date.getTime();
          }).length,
          label: "Appointments"
        }));
        setChartData(trend);
      }
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

    let unsubSales: any = () => {};
    if (role === "admin" || role === "manager") {
      unsubSales = onSnapshot(query(collection(db, "sales"), orderBy("createdAt", "desc")), (snap) => {
        const sales = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const todaySalesAmount = sales
          .filter(s => isToday(s.createdAt))
          .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

        const trend = last7Days.map(date => {
          const daySales = sales.filter(s => {
            const sd = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
            sd.setHours(0,0,0,0);
            return sd.getTime() === date.getTime();
          });
          return {
            name: date.toLocaleDateString('en-US', { weekday: 'short' }),
            val: daySales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0),
            label: "Revenue"
          };
        });
        
        setChartData(trend);
        setStats(prev => ({ ...prev, todayShopSales: todaySalesAmount }));
      });
    }

    return () => { 
      unsubAppts(); 
      unsubFarmers(); 
      unsubInv(); 
      unsubDocs(); 
      unsubSales(); 
    };
  }, [role, user]);

  const toggleDuty = async (doctorId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "users", doctorId), { active: !currentStatus });
    } catch (e) { console.error(e); }
  };

  if (!mounted || !user) return null;

  const isClinician = role === "doctor";

  return (
    <div className="space-y-10 pb-12">
      {/* Header Overview */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-500 font-medium">
            Welcome back, {profile?.displayName || user?.email?.split('@')[0]}. Sanjivani strategic command center.
          </p>
        </div>
        <div className="flex items-center gap-3 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
           <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
             <Image 
               src={profile?.imageUrl || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1528&auto=format&fit=crop"} 
               alt="Profile" width={48} height={48} className="object-cover w-full h-full" unoptimized={true}
             />
           </div>
           <div className="pr-4">
             <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">{profile?.displayName || user?.email}</p>
             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter italic">{role}</p>
           </div>
        </div>
      </section>

      {/* Specialized Tactics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          ...(isClinician ? [
            { label: "My Active Protocol", val: stats.myActiveCases, icon: Activity, color: "blue" },
            { label: "Consults Today", val: stats.todayCases, icon: ClipboardList, color: "emerald" },
            { label: "Consultation Fees Today", val: `₹${stats.dailyRevenue.toLocaleString()}`, icon: TrendingUp, color: "emerald" },
            { label: "Shift Presence", val: profile?.active !== false ? "Active" : "Offline", icon: Clock, color: profile?.active !== false ? "emerald" : "amber" }
          ] : [
            { label: "Strategic Revenue", val: `₹${(stats.dailyRevenue + stats.todayShopSales).toLocaleString()}`, icon: TrendingUp, color: "emerald" },
            { label: "Retail Velocity", val: `₹${stats.todayShopSales.toLocaleString()}`, icon: ShoppingCart, color: "blue" },
            { label: "Operational Load", val: stats.activeAppointments, icon: Activity, color: "purple" },
            { label: "Stock Alerts", val: stats.lowStockItems, icon: Package, color: stats.lowStockItems > 0 ? "red" : "slate" }
          ])
        ].map((s, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            whileHover={{ y: -5, scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
            transition={{ delay: i * 0.1 }} 
            key={i} 
            className="group relative bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden"
          >
             <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 dark:bg-slate-800/20 rounded-bl-[4rem] group-hover:bg-emerald-500/5 transition-colors -z-10" />
             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${
               s.color === "blue" ? "bg-blue-500/10 text-blue-600" :
               s.color === "emerald" ? "bg-emerald-500/10 text-emerald-600" :
               s.color === "purple" ? "bg-purple-500/10 text-purple-600" :
               s.color === "red" ? "bg-red-500/10 text-red-600" :
               s.color === "amber" ? "bg-amber-500/10 text-amber-600" :
               "bg-slate-500/10 text-slate-600"
             }`}>
                <s.icon size={28} />
             </div>
             <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
             <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{s.val}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Analysis */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{isClinician ? "Case Volume Trends" : "Operational Revenue Trends"}</h2>
            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase italic">Performance Feed</div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="clr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip />
                <Area type="monotone" dataKey="val" stroke="#10b981" strokeWidth={4} fill="url(#clr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Center */}
        <div className="space-y-6">
          {isClinician ? (
            <Link href="/dashboard/appointments" className="block bg-blue-600 p-8 rounded-[40px] text-white shadow-xl shadow-blue-600/20 group hover:scale-[1.02] transition-all">
                <Stethoscope className="mb-4 text-blue-200" size={32} />
                <h3 className="text-xl font-black tracking-tighter uppercase">Protocol Station</h3>
                <p className="text-blue-100 text-xs font-bold mt-1">Manage Clinical Patient Consultations</p>
                <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">Open Active Cases <Plus size={14}/></div>
             </Link>
          ) : (
             <Link href="/dashboard/shop" className="block bg-emerald-600 p-8 rounded-[40px] text-white shadow-xl shadow-emerald-600/20 group hover:scale-[1.02] transition-all">
                <ShoppingCart className="mb-4 text-emerald-200" size={32} />
                <h3 className="text-xl font-black tracking-tighter uppercase">Direct POS Hub</h3>
                <p className="text-emerald-100 text-xs font-bold mt-1">Initialize Operational Sales</p>
                <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">Go to Shop <Plus size={14}/></div>
             </Link>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[35px] shadow-sm">
             <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">Lead Specialists</h3>
             <div className="space-y-3">
               {snapDocs.slice(0, 3).map((doc: any, i) => (
                 <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-lg bg-slate-200 overflow-hidden">
                          <Image src={doc.imageUrl || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=100&auto=format&fit=crop"} alt={doc.displayName} width={32} height={32} className="object-cover h-full" unoptimized={true} />
                       </div>
                       <p className="text-[10px] font-black text-slate-900 dark:text-white">{doc.displayName || "Unauthorized Specialist"}</p>
                    </div>
                    {user?.uid === doc.id && (
                       <button onClick={() => toggleDuty(doc.id, doc.active !== false)} className={`w-8 h-4 rounded-full relative transition-colors ${doc.active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                         <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${doc.active !== false ? 'left-4' : 'left-0.5'}`} />
                      </button>
                    )}
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className={`grid grid-cols-1 ${isClinician ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-8`}>
         <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 italic"><Clock className="text-emerald-500" /> Recent Cases</h2>
              <Link href="/dashboard/appointments" className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Roster</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentAppointments.map((appt, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-emerald-600"><ClipboardList size={20} /></div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{appt.farmerName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{appt.animalType} • {appt.issue}</p>
                    </div>
                  </div>
                  <span className={`text-[8px] font-black px-2 py-1 rounded-full ${appt.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{appt.status}</span>
                </div>
              ))}
            </div>
         </div>

         {!isClinician && (
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-8"><Package className="text-amber-500" /> Stock Vulnerabilities</h2>
              <div className="space-y-4">
                {lowStockItems.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-3xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"><Package size={20} /></div>
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-[10px] font-bold text-red-500">Only {item.stock} {item.unit} left</p>
                      </div>
                    </div>
                    <Link href="/dashboard/inventory" className="p-2 bg-white rounded-lg"><Plus size={14}/></Link>
                  </div>
                ))}
              </div>
           </div>
         )}
      </div>
    </div>
  );
}
