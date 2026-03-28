"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { 
  Users, 
  Phone, 
  MessageSquare, 
  Trash2, 
  Calendar, 
  Search,
  ChevronLeft,
  X,
  History,
  ClipboardList,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDocs, where } from "firebase/firestore";

interface Farmer {
  id: string;
  name: string;
  phone: string;
  village: string;
  deviceId: string;
  joinedAt?: any;
}

export default function FarmersPage() {
  const { role } = useAuth();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFarmerHistory, setSelectedFarmerHistory] = useState<any[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [viewingFarmer, setViewingFarmer] = useState<Farmer | null>(null);

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

  const fetchFarmerHistory = async (farmer: Farmer) => {
    setViewingFarmer(farmer);
    setHistoryLoading(true);
    try {
      const q = query(
        collection(db, "appointments"),
        where("farmerName", "==", farmer.name),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setSelectedFarmerHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      setSelectedFarmerHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Erase this farmer record from the unified database?")) return;
    try {
      await deleteDoc(doc(db, "farmers", id));
    } catch (e) {
      console.error(e);
    }
  };

  const openWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, "_blank");
  };

  if (role === "doctor") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-600 mb-6 font-black italic">!</div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-2">Community Privacy</h2>
        <p className="text-slate-500 text-sm max-w-xs font-medium">The Farmers CRM Hub is reserved for Managerial and Administrative roles. Clinical duties only beyond this point.</p>
        <Link href="/dashboard" className="mt-8 px-8 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Return to Clinical Protocol</Link>
      </div>
    );
  }

  const filteredFarmers = farmers.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.phone.includes(search) ||
    f.village?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 relative min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Farmer Network</h1>
          <p className="text-slate-500 font-medium">Sanjivani Community CRM & Outreach Hub</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search our village community..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredFarmers.map((farmer, idx) => (
            <motion.div 
              layout
              key={farmer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl italic uppercase">
                    {farmer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">{farmer.name}</h3>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{farmer.village || "Unknown Village"}</p>
                  </div>
                </div>
                <button 
                  onClick={() => fetchFarmerHistory(farmer)}
                  className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500 transition-colors flex items-center justify-center"
                >
                  <History size={18} />
                </button>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{farmer.phone}</span>
                </div>
                <button 
                  onClick={() => openWhatsApp(farmer.phone)}
                  className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 active:scale-90 transition-transform"
                >
                  <MessageSquare size={16} />
                </button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar size={12} />
                  <span className="text-[9px] font-black uppercase">Since {farmer.joinedAt?.toDate ? farmer.joinedAt.toDate().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}</span>
                </div>
                {role === "admin" && (
                  <button 
                    onClick={() => handleDelete(farmer.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* History Slide-over/Modal */}
      <AnimatePresence>
        {viewingFarmer && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Clinical Timeline</h2>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mt-1">{viewingFarmer.name}</p>
                </div>
                <button onClick={() => setViewingFarmer(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500"><X size={20}/></button>
              </div>

              <div className="p-8 space-y-6">
                {historyLoading ? (
                  <div className="py-20 text-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" /></div>
                ) : selectedFarmerHistory?.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 font-bold italic uppercase text-xs">No strategic activity recorded yet</div>
                ) : (
                  <div className="space-y-8 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                    {selectedFarmerHistory?.map((event, i) => (
                      <div key={i} className="relative pl-14">
                        <div className={`absolute left-4 top-1 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 z-10 ${event.type === 'Order' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all hover:border-emerald-500/30">
                           <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-2">
                               <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase ${event.type === 'Order' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                 {event.type || 'Consult'}
                               </span>
                               <span className="text-[10px] font-bold text-slate-400">
                                 {event.createdAt?.toDate?.().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                               </span>
                             </div>
                             <span className="text-xs font-black text-slate-900 dark:text-white">₹{event.price || (event.type === 'Order' ? 0 : 300)}</span>
                           </div>
                           <h4 className="font-black text-slate-900 dark:text-white uppercase text-sm mb-1">{event.issue}</h4>
                           <p className="text-[10px] font-bold text-slate-500 leading-tight line-clamp-2">
                             {event.animalType} • {event.breed}
                           </p>
                           {event.status === 'Completed' && (
                             <div className="mt-3 flex items-center gap-1 text-emerald-600">
                               <ShieldCheck size={12}/>
                               <span className="text-[8px] font-black uppercase tracking-tighter">Clinical Protocol Satisfied</span>
                             </div>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredFarmers.length === 0 && !loading && (
        <div className="py-20 text-center bg-slate-50/50 dark:bg-slate-950/20 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
           <Users size={48} className="mx-auto text-slate-200 mb-4" />
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching community members found</p>
        </div>
      )}
    </div>
  );
}
