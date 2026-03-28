"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, doc, getDoc } from "firebase/firestore";
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
  ChevronRight,
  Printer,
  User,
  Clock3,
  CheckCircle,
  X
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
  subtotal?: number;
  discountAmount?: number;
  items: SaleItem[];
  createdAt: any;
  farmerName?: string;
  type?: string;
  processedBy?: string;
}

interface AppointmentRecord {
  id: string;
  type: "Consultation" | "Order";
  price?: number;
  status: string;
  createdAt: any;
}

type TimeRange = "Today" | "Week" | "Month" | "All";
type ReceiptLayout = "normal" | "thermal";

interface ReceiptPreview {
  id: string;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  farmerName: string;
  date: Date;
}

export default function ReportsPage() {
  const { role } = useAuth();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [appts, setAppts] = useState<AppointmentRecord[]>([]);
  const [range, setRange] = useState<TimeRange>("Month");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [receiptLayout, setReceiptLayout] = useState<ReceiptLayout>("normal");
  const [selectedSale, setSelectedSale] = useState<ReceiptPreview | null>(null);
  const [clinicSettings, setClinicSettings] = useState({
    name: "Sanjivani Vet Care",
    logo: "",
    address: ""
  });

  useEffect(() => {
    setMounted(true);
    const unsubSales = onSnapshot(query(collection(db, "sales"), orderBy("createdAt", "desc")), (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as SaleRecord)));
    });

    const unsubAppts = onSnapshot(query(collection(db, "appointments"), orderBy("createdAt", "desc")), (snap) => {
      setAppts(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppointmentRecord)));
      setLoading(false);
    });

    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if (snap.exists()) {
          const data = snap.data();
          setClinicSettings({
            name: data.clinicName || "Sanjivani Vet Care",
            logo: data.logoUrl || "",
            address: data.address || "",
          });
        }
      } catch (error) {
        console.error("Failed to load clinic settings", error);
      }
    };
    fetchSettings();

    return () => { unsubSales(); unsubAppts(); };
  }, []);

  if (!mounted) return null;

  if (role === "doctor") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-600 mb-6 font-black italic">!</div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Access Restricted</h2>
        <p className="text-slate-500 text-sm max-w-xs font-medium">This module is available only to authorized administrative roles.</p>
        <Link href="/dashboard" className="mt-8 px-8 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Back to Dashboard</Link>
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
  const recentSales = currentSales.slice(0, 12);

  const openReprint = (sale: SaleRecord) => {
    const subtotal = Number(sale.subtotal ?? sale.items.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0));
    const discountAmount = Number(sale.discountAmount ?? Math.max(0, subtotal - Number(sale.totalAmount || 0)));
    const saleDate = sale.createdAt?.seconds ? new Date(sale.createdAt.seconds * 1000) : new Date();

    setReceiptLayout("normal");
    setSelectedSale({
      id: sale.id,
      items: sale.items || [],
      subtotal,
      discountAmount,
      total: Number(sale.totalAmount || 0),
      farmerName: sale.farmerName || "Guest",
      date: saleDate,
    });
  };

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
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Reports</h1>
          <p className="text-slate-500 font-medium">Financial and operational analytics</p>
        </div>
        <Link href="/dashboard/sales" className="inline-flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 shadow-sm w-fit">
          <ShoppingCart size={14} /> Open Sales Hub
        </Link>
        
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

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Recent POS Entries</h2>
            <p className="text-slate-500 font-medium">All point-of-sale sales are saved here from the Shop checkout.</p>
          </div>
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Showing {recentSales.length} of {currentSales.length} entries
          </div>
        </div>

        {recentSales.length === 0 ? (
          <div className="p-12 text-center rounded-[2rem] bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
            <Package className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={36} />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">No POS entries found for this filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[880px]">
              <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_0.8fr] gap-4 px-4 pb-3 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Receipt</span>
                <span>Customer</span>
                <span>Type</span>
                <span>Processed By</span>
                <span>Total</span>
                <span className="text-right">Action</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentSales.map((sale) => {
                  const saleDate = sale.createdAt?.seconds ? new Date(sale.createdAt.seconds * 1000) : null;
                  return (
                    <div key={sale.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_0.8fr] gap-4 items-center px-4 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-900 dark:text-white">#{sale.id.slice(-8).toUpperCase()}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Clock3 size={12} /> {saleDate ? saleDate.toLocaleString() : "Pending timestamp"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-900 dark:text-white truncate">{sale.farmerName || "Guest"}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <User size={12} /> {sale.items?.length || 0} item(s)
                        </p>
                      </div>

                      <div>
                        <span className="inline-flex px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                          {sale.type || "POS Sale"}
                        </span>
                      </div>

                      <div>
                        <p className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wide truncate">{sale.processedBy || "Unknown"}</p>
                      </div>

                      <div>
                        <p className="text-lg font-black text-slate-900 dark:text-white">₹{Number(sale.totalAmount || 0).toLocaleString()}</p>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => openReprint(sale)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest shadow-lg hover:opacity-90 transition-opacity"
                        >
                          <Printer size={14} /> Reprint
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md receipt-modal-container">
            <style jsx global>{`
              @media print {
                @page {
                  margin: 6mm;
                }

                body * {
                  visibility: hidden !important;
                }

                .receipt-modal-container,
                .receipt-modal-container * {
                  visibility: visible !important;
                }

                .receipt-modal-container {
                  position: fixed !important;
                  inset: 0 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white !important;
                  align-items: flex-start !important;
                  justify-content: center !important;
                }

                .receipt-paper {
                  margin: 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                  border-radius: 0 !important;
                  background: white !important;
                }

                .receipt-paper--normal {
                  width: 190mm !important;
                  max-width: 190mm !important;
                  padding: 10mm !important;
                }

                .receipt-paper--thermal {
                  width: 78mm !important;
                  max-width: 78mm !important;
                  padding: 3mm !important;
                }

                .print-hide {
                  display: none !important;
                }
              }
            `}</style>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`bg-white p-8 rounded-[2.5rem] w-full shadow-2xl overflow-hidden receipt-paper ${receiptLayout === "thermal" ? "max-w-[320px] receipt-paper--thermal" : "max-w-xl receipt-paper--normal"}`}
            >
              <div className="flex items-center justify-between gap-4 mb-5 p-3 rounded-2xl border border-slate-100 bg-slate-50 print-hide">
                <div className="flex-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Print Layout</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setReceiptLayout("normal")}
                      className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${receiptLayout === "normal" ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200"}`}
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => setReceiptLayout("thermal")}
                      className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${receiptLayout === "thermal" ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200"}`}
                    >
                      Thermal
                    </button>
                  </div>
                </div>
                <button onClick={() => setSelectedSale(null)} className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className={`text-center ${receiptLayout === "thermal" ? "mb-4" : "mb-6"}`}>
                {clinicSettings.logo ? (
                  <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-3 shadow-lg border border-slate-100">
                    <img src={clinicSettings.logo} alt="Clinic Logo" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-emerald-500/20">
                    <CheckCircle size={28} />
                  </div>
                )}
                <h2 className="text-xl font-black italic tracking-tighter text-slate-900 uppercase">
                  {clinicSettings.name.split(" ").map((w, i) => (
                    <span key={i} className={i === 1 ? "text-emerald-500" : ""}>{w} </span>
                  ))}
                </h2>
                {clinicSettings.address && (
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1 max-w-[200px] mx-auto leading-relaxed">{clinicSettings.address}</p>
                )}
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 pt-2 border-t border-slate-50">Official Clinical Receipt</p>
              </div>

              <div className={`space-y-1 border-t border-b border-dashed border-slate-200 text-left ${receiptLayout === "thermal" ? "mb-4 py-3" : "mb-6 py-4"}`}>
                <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                  <span>TRANS ID:</span>
                  <span className="text-slate-900">#{selectedSale.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 gap-4">
                  <span>DATE:</span>
                  <span className="text-slate-900 text-right">{selectedSale.date.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 gap-4">
                  <span>CUSTOMER:</span>
                  <span className="text-slate-900 text-right truncate max-w-[140px]">{selectedSale.farmerName}</span>
                </div>
              </div>

              <div className={`w-full ${receiptLayout === "thermal" ? "mb-4" : "mb-6"}`}>
                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-50">
                  <span className="w-1/2 text-left">Article</span>
                  <span className="w-1/4 text-center">Qty</span>
                  <span className="w-1/4 text-right">Total</span>
                </div>
                <div className="space-y-3">
                  {selectedSale.items.map((item, idx) => (
                    <div key={`${selectedSale.id}-${idx}`} className="flex justify-between text-[11px] font-bold text-slate-700 gap-2">
                      <span className="w-1/2 text-left truncate uppercase italic">{item.name}</span>
                      <span className="w-1/4 text-center">x{item.quantity}</span>
                      <span className="w-1/4 text-right">₹{((Number(item.price) || 0) * (Number(item.quantity) || 0)).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`bg-slate-50 border border-slate-100 space-y-2 ${receiptLayout === "thermal" ? "rounded-2xl p-3 mb-5" : "rounded-3xl p-5 mb-8"}`}>
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                  <span>SUBTOTAL</span>
                  <span>₹{selectedSale.subtotal.toLocaleString()}</span>
                </div>
                {selectedSale.discountAmount > 0 && (
                  <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase">
                    <span>DISCOUNT</span>
                    <span>-₹{selectedSale.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-900 uppercase">GRAND TOTAL</span>
                  <span className="text-2xl font-black text-emerald-600 italic">₹{selectedSale.total.toLocaleString()}</span>
                </div>
              </div>

              <div className={`text-center ${receiptLayout === "thermal" ? "mb-5" : "mb-8"}`}>
                <p className="text-[10px] font-black text-slate-900 italic uppercase tracking-tighter">Thank you for visiting Sanjivani!</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">This is a system generated medical invoice</p>
              </div>

              <div className="space-y-2 print-hide">
                <button onClick={() => window.print()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">Print Receipt</button>
                <button onClick={() => setSelectedSale(null)} className="w-full py-4 text-slate-400 font-black text-[9px] uppercase hover:text-slate-900 transition-colors">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
