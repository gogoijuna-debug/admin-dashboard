"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Users, Phone, MessageSquare, Trash2, Calendar, Search } from "lucide-react";

interface Farmer {
  id: string;
  name: string;
  phone: string;
  village: string;
  deviceId: string;
  joinedAt?: any;
}

import { motion, AnimatePresence } from "framer-motion";

export default function FarmersPage() {
  const { role } = useAuth();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(collection(db, "farmers"), orderBy("joinedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Farmer[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Farmer);
      });
      setFarmers(data);
      setLoading(false);
    }, (err) => {
      console.error("CRM Permission Error:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Erase this farmer record from the unified database?")) return;
    await deleteDoc(doc(db, "farmers", id));
  };

  const openWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, "_blank");
  };

  const filteredFarmers = farmers.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.phone.includes(search) ||
    f.village?.toLowerCase().includes(search.toLowerCase())
  );

  if (role !== "admin" && role !== "doctor") return <div className="p-20 text-center font-black uppercase text-slate-400">Access Restricted</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-2 italic">
            <Users className="text-emerald-500" size={24} />
            Farmer CRM
          </h1>
          <div className="text-slate-500 dark:text-slate-400 font-black mt-0.5 uppercase tracking-widest text-[9px] flex items-center gap-2">
             <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
             Client Relationship Management & Analytics
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/10 flex items-center gap-3">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Query CRM database..." 
            className="bg-transparent border-none outline-none text-slate-700 dark:text-white w-full font-black text-[11px] uppercase tracking-tight py-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Desktop Table View - Hidden on Mobile */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest">
                <th className="px-6 py-4 italic">Identity Details</th>
                <th className="px-6 py-4 italic">Geographic Node</th>
                <th className="px-6 py-4 italic">Communication</th>
                <th className="px-6 py-4 italic">Onboarding</th>
                <th className="px-6 py-4 text-right italic">Action Portal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                   <td colSpan={5} className="px-6 py-20 text-center">
                     <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-t-2 border-emerald-500 rounded-full animate-spin" />
                        <p className="text-slate-400 font-black uppercase text-[9px] tracking-widest">Querying...</p>
                     </div>
                   </td>
                </tr>
              ) : filteredFarmers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-300 dark:text-slate-700 font-black uppercase tracking-widest italic text-sm">
                    No records found
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredFarmers.map((farmer, idx) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ delay: idx * 0.01 }}
                      key={farmer.id} 
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-sm group-hover:scale-105 transition-transform">
                            {farmer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-xs">{farmer.name}</p>
                            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-0.5">DEV-ID: {farmer.deviceId?.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 font-black text-[9px] uppercase bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                           <div className="w-1 h-1 rounded-full bg-emerald-500" />
                           {farmer.village || "Stationed"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-black text-[11px] tabular-nums">
                          <Phone size={12} className="text-slate-400" />
                          {farmer.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {farmer.joinedAt?.seconds 
                          ? new Date(farmer.joinedAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
                          : "Legacy"}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => openWhatsApp(farmer.phone)}
                          className="px-4 py-2 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-600/20 font-black text-[9px] uppercase tracking-widest"
                        >
                          <div className="flex items-center gap-1.5"><MessageSquare size={14} /> Link</div>
                        </button>
                        {role === 'admin' && (
                          <button 
                            onClick={() => handleDelete(farmer.id)}
                            className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View - Cards Layout */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
           {loading ? (
             <div className="p-10 text-center">
                <div className="w-8 h-8 border-t-2 border-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-400 font-black uppercase text-[9px]">Querying Nodes...</p>
             </div>
           ) : filteredFarmers.length === 0 ? (
             <div className="p-10 text-center text-slate-400 font-bold uppercase text-[10px]">No records match</div>
           ) : filteredFarmers.map((farmer) => (
             <div key={farmer.id} className="p-5 space-y-4 bg-white dark:bg-slate-900 active:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 font-black text-sm">
                      {farmer.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-xs">{farmer.name}</p>
                      <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{farmer.village || 'Geographic Node'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 tabular-nums">{farmer.phone}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Direct Line</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openWhatsApp(farmer.phone)} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2">
                    <MessageSquare size={14} /> Open Pipeline
                  </button>
                  {role === 'admin' && (
                    <button onClick={() => handleDelete(farmer.id)} className="w-12 h-12 bg-red-500/5 text-red-400 rounded-xl flex items-center justify-center border border-red-500/10">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
             </div>
           ))}
        </div>
      </div>
    </motion.div>
  );
}
