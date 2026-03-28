"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  runTransaction,
  getDocs,
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { 
  ClipboardCheck, 
  Package, 
  User, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Stethoscope,
  ChevronRight,
  ShoppingCart,
  ShieldCheck,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface PrescriptionItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  description?: string;
}

interface Appointment {
  id: string;
  farmerName: string;
  phoneNumber: string;
  issue: string;
  prescription?: PrescriptionItem[];
  fulfillmentStatus?: "Pending" | "Fulfilled";
  createdAt: any;
  assignedDoctorName?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
}

export default function FulfillmentPage() {
  const { user, role } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Appointment[]>([]);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState<Appointment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // 1. Listen for Appointments with Prescriptions
    const q = query(
      collection(db, "appointments"), 
      where("status", "==", "Completed"), // Only completed clinical sessions can be fulfilled
      orderBy("createdAt", "desc")
    );

    const unsubAppts = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
      // Filter for those that HAVE a prescription and are NOT fulfilled
      setPrescriptions(all.filter(a => a.prescription && a.prescription.length > 0 && a.fulfillmentStatus !== "Fulfilled"));
      setLoading(false);
    });

    // 2. Sync Inventory levels for real-time stock check
    const unsubInv = onSnapshot(collection(db, "inventory"), (snap) => {
      const inv: Record<string, number> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        inv[data.name] = data.stock; // We match by name for fulfillment
      });
      setInventory(inv);
    });

    return () => { unsubAppts(); unsubInv(); };
  }, []);

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

  const checkStockAvailability = (items: PrescriptionItem[]) => {
    return items.every(item => (inventory[item.name] || 0) >= 1); // Simple check, assuming 1 pack/unit for fulfillment
  };

  const handleFulfill = async (appt: Appointment) => {
    if (!appt.prescription || isProcessing) return;
    setIsProcessing(true);
    setError("");

    try {
      const appointmentRef = doc(db, "appointments", appt.id);
      const groupedMeds = appt.prescription.reduce<Record<string, number>>((acc, med) => {
        const key = med.name.trim();
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      // Resolve inventory document references before the transaction (transaction.get requires a DocumentReference)
      const invRefs: Array<{ ref: ReturnType<typeof doc>; medName: string; qtyRequired: number }> = [];
      for (const [medName, qtyRequired] of Object.entries(groupedMeds)) {
        const invQ = query(collection(db, "inventory"), where("name", "==", medName), limit(1));
        const invSnap = await getDocs(invQ);
        if (invSnap.empty) {
          throw new Error(`Medicine not found in inventory: ${medName}`);
        }
        invRefs.push({ ref: invSnap.docs[0].ref as ReturnType<typeof doc>, medName, qtyRequired });
      }

      await runTransaction(db, async (transaction) => {
        const inventoryUpdates: Array<{ ref: ReturnType<typeof doc>; nextStock: number }> = [];

        for (const { ref, medName, qtyRequired } of invRefs) {
          const invDoc = await transaction.get(ref);
          const currentStock = Number(invDoc.data()?.stock || 0);
          if (currentStock < qtyRequired) {
            throw new Error(`Insufficient stock for ${medName}`);
          }
          inventoryUpdates.push({ ref, nextStock: currentStock - qtyRequired });
        }

        for (const update of inventoryUpdates) {
          transaction.update(update.ref, { stock: update.nextStock });
        }

        transaction.update(appointmentRef, {
          fulfillmentStatus: "Fulfilled",
          fulfilledAt: serverTimestamp(),
          fulfilledBy: user?.email || "unknown"
        });

        const saleRef = doc(collection(db, "sales"));
        transaction.set(saleRef, {
          items: (appt.prescription ?? []).map((p) => ({ name: p.name, quantity: 1, price: 0 })),
          totalAmount: 0,
          farmerId: appt.phoneNumber,
          farmerName: appt.farmerName,
          type: "Prescription Fulfillment",
          processedBy: user?.email,
          sourceAppointmentId: appt.id,
          createdAt: serverTimestamp(),
        });
      });

      setSelectedProtocol(null);
    } catch (e: any) {
      const msg = e?.message || "Fulfillment failed. Please retry.";
      setError(msg);
      console.error("Fulfillment Failed", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = prescriptions.filter(p => 
    p.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.phoneNumber.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ClipboardCheck className="text-emerald-500" size={24} />
            Fulfillment
          </h1>
          <div className="text-slate-500 dark:text-slate-400 font-black mt-0.5 uppercase tracking-widest text-[9px] flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             Prescription dispatch and stock fulfillment
          </div>
        </div>
        
        <div className="relative w-full md:w-64">
           <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
           <input 
             type="text" 
             placeholder="Search farmer / protocol..." 
             className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fulfillment Queue */}
        <div className="space-y-4">
          <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Clock size={12} /> Pending Fulfillment Queue
             </h3>
          </div>
          
          <div className="space-y-3">
             {loading ? [1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />) : 
              filtered.map(appt => (
                <motion.button 
                  layout
                  key={appt.id} 
                  onClick={() => setSelectedProtocol(appt)}
                  className={`w-full text-left p-5 bg-white dark:bg-slate-900 rounded-[2rem] border transition-all relative overflow-hidden group ${
                    selectedProtocol?.id === appt.id ? "border-emerald-500 shadow-xl" : "border-slate-100 dark:border-slate-800 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-sm">
                        {appt.farmerName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight truncate w-32">{appt.farmerName}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{appt.phoneNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Items</p>
                      <div className="flex gap-1 justify-end">
                        <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-black italic">{appt.prescription?.length} Meds</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-t border-slate-50 dark:border-slate-800">
                     <div className="flex items-center gap-2">
                        <Stethoscope size={12} className="text-emerald-500" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Auth: {appt.assignedDoctorName}</span>
                     </div>
                     <ChevronRight size={14} className="text-slate-200 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>
              ))
             }
             {prescriptions.length === 0 && !loading && (
               <div className="p-20 text-center space-y-4 bg-slate-50/20 dark:bg-slate-950/20 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-800">
                  <Package size={48} className="mx-auto text-slate-100 dark:text-slate-800" />
                  <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">All protocols currently fulfilled</p>
               </div>
             )}
          </div>
        </div>

        {/* Selected Protocol Workbench */}
        <div className="relative">
           <AnimatePresence mode="wait">
             {selectedProtocol ? (
               <motion.div 
                 key={selectedProtocol.id}
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 className="sticky top-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[500px]"
               >
                  <div className="p-8 bg-slate-900 text-white dark:bg-emerald-600 flex justify-between items-start">
                     <div>
                        <h3 className="text-xl font-black tracking-tighter uppercase italic">Dispatch Protocol</h3>
                        <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mt-1">Farmer: {selectedProtocol.farmerName}</p>
                     </div>
                     <button onClick={() => setSelectedProtocol(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                        <X size={20} />
                     </button>
                  </div>

                  <div className="p-8 flex-1 space-y-6">
                     <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 pb-2">Medical Directives</h4>
                        {selectedProtocol.prescription?.map((p, idx) => {
                          const isAvailable = (inventory[p.name] || 0) >= 1;
                          return (
                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-50 dark:border-slate-800/50">
                               <div className="flex-1">
                                  <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{p.name}</p>
                                  <p className="text-[9px] font-bold text-slate-400 lowercase">{p.dosage} - {p.frequency} x {p.duration}</p>
                               </div>
                               <div className="flex items-center gap-3">
                                  {isAvailable ? (
                                    <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/5 px-3 py-1.5 rounded-xl border border-emerald-500/10">
                                       <CheckCircle size={14} />
                                       <span className="text-[9px] font-black uppercase tracking-widest">In Stock</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-red-500 bg-red-500/5 px-3 py-1.5 rounded-xl border border-red-500/10">
                                       <AlertCircle size={14} />
                                       <span className="text-[9px] font-black uppercase tracking-widest">Out of Stock</span>
                                    </div>
                                  )}
                               </div>
                            </div>
                          );
                        })}
                     </div>

                     <div className="p-6 bg-amber-500/5 rounded-[2rem] border border-amber-500/20 flex items-start gap-4">
                        <ShieldCheck className="text-amber-500 mt-1" size={20} />
                        <div>
                           <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Clinical Verification Required</p>
                           <p className="text-[9px] text-amber-600 font-bold max-w-xs italic font-serif">"Ensure physical medical seal matches digital protocol before final dispatch authentication."</p>
                        </div>
                     </div>
                  </div>

                  <div className="p-8 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
                     {error && (
                       <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-red-500">{error}</p>
                     )}
                     <button 
                       disabled={isProcessing || !checkStockAvailability(selectedProtocol.prescription || [])}
                       onClick={() => handleFulfill(selectedProtocol)}
                       className={`w-full h-16 rounded-2xl flex items-center justify-center gap-3 transition-all ${
                         checkStockAvailability(selectedProtocol.prescription || []) 
                         ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-xl hover:-translate-y-1 active:scale-95" 
                         : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                       }`}
                     >
                       {isProcessing ? (
                         <div className="flex items-center gap-3 italic">
                           <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                           <span className="text-[11px] font-black uppercase tracking-widest">Authenticating Protocol...</span>
                         </div>
                       ) : (
                         <>
                           <span className="text-[11px] font-black uppercase tracking-widest">Authenticate & Dispatch</span>
                           <ShoppingCart size={18} />
                         </>
                       )}
                     </button>
                  </div>
               </motion.div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30 italic p-10 text-center">
                  <ClipboardCheck size={64} className="text-slate-300" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Select a high-priority protocol from the queue to initiate Fulfillment Workbench</p>
               </div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function X({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
