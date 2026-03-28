"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, where, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { 
  Calendar, 
  User, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  Trash2, 
  FileText, 
  Download,
  XCircle,
  MoreVertical,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  IndianRupee,
  Pill
} from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

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
  status: "Pending" | "Completed" | "Cancelled";
  cancelledBy?: string;
  cancelledAt?: any;
  createdAt: any;
  type: "Consultation" | "Order" | "Visit";
  doctorNotes?: string;
  prescription?: PrescriptionItem[];
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  assignedDoctorQuals?: string;
  isDirectRequest?: boolean;
  price?: number;
}

interface Doctor {
  id: string;
  displayName: string;
  role: string;
  qualification?: string;
  imageUrl?: string;
}

type FilterType = "All" | "Pending" | "Completed" | "Consultation" | "Order";

import PrescriptionView from "@/components/PrescriptionView";

export default function AppointmentsPage() {
  const { user, role } = useAuth();
  const { theme } = useTheme();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"All" | "Consultation" | "Order">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Completed" | "Cancelled">("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notesModal, setNotesModal] = useState<{ id: string; existing: string; appt: Appointment } | null>(null);
  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [viewingRx, setViewingRx] = useState<Appointment | null>(null);
  const [noteText, setNoteText] = useState("");
  const [inventoryMeds, setInventoryMeds] = useState<string[]>([]);
  const [rxList, setRxList] = useState<PrescriptionItem[]>([]);
  const [showRxEditor, setShowRxEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [clinicSettings, setClinicSettings] = useState({
    name: "Sanjivani Vet Care",
    address: "Golaghat, Assam, 785621",
    phone: "+91 94350 00000",
    logo: "",
  });

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    let qAppts = query(collection(db, "appointments"), orderBy("createdAt", "desc"));
    if (role === "doctor") qAppts = query(qAppts, where("assignedDoctorId", "==", user.uid));
    
    const unsubAppts = onSnapshot(qAppts, (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
      if (role === "doctor") {
        data = data.filter(a => a.type !== "Order");
      }
      setAppointments(data);
      setLoading(false);
    });

    const unsubDocs = onSnapshot(query(collection(db, "users"), where("role", "==", "doctor"), where("active", "==", true)), (snap) => {
      setDoctors(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });

    // Fetch Inventory Medicines for Rx Search
    const unsubInv = onSnapshot(query(collection(db, "inventory"), where("category", "==", "Medicine")), (snap) => {
      setInventoryMeds(snap.docs.map(d => d.data().name));
    });

    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if (snap.exists()) {
          const data = snap.data();
          setClinicSettings({
            name: data.clinicName || "Sanjivani Vet Care",
            address: data.address || "Golaghat, Assam, 785621",
            phone: data.whatsapp || "+91 94350 00000",
            logo: data.logoUrl || "",
          });
        }
      } catch (e) {
        console.error("Failed to load clinic settings", e);
      }
    };
    fetchSettings();

    return () => {
      unsubAppts();
      unsubDocs();
      unsubInv();
    };
  }, [role, user]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "appointments", id), { status: newStatus });
      setFeedback({ type: "success", message: `Appointment marked ${newStatus}.` });
    } catch (error) {
      setFeedback({ type: "error", message: "Unable to update appointment status." });
    }
  };

  const handleBulkStatus = async (newStatus: string) => {
    setSaving(true);
    try {
      await Promise.all(selectedIds.map(id => updateDoc(doc(db, "appointments", id), { status: newStatus })));
      setFeedback({ type: "success", message: `${selectedIds.length} appointments updated to ${newStatus}.` });
      setSelectedIds([]);
    } catch (error) {
      setFeedback({ type: "error", message: "Bulk update failed." });
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (apptId: string, doctor: Doctor) => {
    if (role !== "admin" && role !== "manager") return; // Safety check
    await updateDoc(doc(db, "appointments", apptId), { 
      assignedDoctorId: doctor.id, 
      assignedDoctorName: doctor.displayName,
      assignedDoctorQuals: doctor.qualification || "Veterinary Surgeon"
    });
    setAssignModal(null);
  };

  const handleDelete = async (id: string) => {
    if (role !== "admin") return;
    if (!confirm("Delete this record permanently?")) return;
    try {
      await deleteDoc(doc(db, "appointments", id));
      setFeedback({ type: "success", message: "Appointment deleted." });
    } catch (error) {
      setFeedback({ type: "error", message: "Unable to delete appointment." });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const openWhatsApp = (phone: string, issue: string, rx?: PrescriptionItem[]) => {
    let text = `*SANJIVANI VET CARE - Medical Protocol*\n\nRegarding: ${issue}\n`;
    if (rx && rx.length > 0) {
      text += `\n*Prescribed Medications:*\n`;
      rx.forEach((m, i) => {
        text += `${i + 1}. ${m.name} (${m.dosage}) - ${m.frequency} for ${m.duration}\n`;
      });
    }
    const message = encodeURIComponent(text);
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  const filtered = appointments.filter(a => {
    const typeMatch = typeFilter === "All" || a.type === typeFilter;
    const statusMatch = statusFilter === "All" || a.status === statusFilter;
    return typeMatch && statusMatch;
  });

  const exportCSV = () => {
    const headers = ["Farmer", "Phone", "Issue", "Type", "Status", "Date", "Doctor Notes", "Assigned Doctor"];
    const rows = filtered.map(a => [
      a.farmerName, a.phoneNumber, `"${a.issue}"`, a.type, a.status,
      a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000).toLocaleString() : "N/A",
      `"${a.doctorNotes || ""}"`, a.assignedDoctorName || "None"
    ]);
    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sanjivani_${new Date().toLocaleDateString()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20 relative">
      {feedback && (
        <div className={`rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20" : "border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/20"}`}>
          {feedback.message}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Calendar className="text-emerald-500" size={24} />
            Appointments
          </h1>
          <div className="text-slate-500 dark:text-slate-400 font-black mt-0.5 uppercase tracking-widest text-[9px] flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             Clinical coordination and status tracking
          </div>
        </div>
        {role === "admin" && (
          <button
            onClick={exportCSV}
            className="w-full md:w-auto p-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-2 hover:scale-105 transition-all text-[9px] font-black uppercase tracking-widest text-slate-500"
          >
            <Download size={16}/> Protocol Export (CSV)
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Row 1: Type Tabs */}
        <div className="flex gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-2xl w-fit">
          {(["All", "Consultation", "Order"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                typeFilter === t
                  ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-sm border border-slate-100 dark:border-slate-800"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Row 2: Status Pills */}
        <div className="flex flex-wrap gap-2">
          {(["All", "Pending", "Completed", "Cancelled"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest transition-all border ${
                statusFilter === s
                  ? s === "Pending" ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200/50" :
                    s === "Completed" ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200/50" :
                    s === "Cancelled" ? "bg-red-600 text-white border-red-600 shadow-md shadow-red-200/50" :
                    "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                  : "bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-200"
              }`}
            >
              {s} {s === "All" ? "Status" : ""}
            </button>
          ))}
        </div>
        <div className="ml-auto px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          {filtered.length} Archives
        </div>
      </div>

      {/* Bulk Action Bar - Precise */}
      {selectedIds.length > 0 && role === "admin" && (
        <div className="sticky top-6 z-30 bg-slate-900 dark:bg-emerald-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between animate-in slide-in-from-top-10 duration-500">
          <div className="flex items-center gap-3 px-2">
            <div className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center font-black text-xs">{selectedIds.length}</div>
            <p className="font-black text-[10px] uppercase tracking-widest">Selected</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleBulkStatus("Completed")} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Complete</button>
            <button onClick={() => setSelectedIds([])} className="p-2 hover:bg-white/10 rounded-xl transition-all">✕</button>
          </div>
        </div>
      )}

      {/* Insight Grid - Multi-column High Density */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((appt, idx) => (
            <motion.div
              layout
              key={appt.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: Math.min(idx * 0.02, 0.2) }}
              className={`group relative bg-white dark:bg-slate-900 rounded-[2rem] border transition-all duration-300 flex flex-col ${
                selectedIds.includes(appt.id) 
                  ? "border-emerald-500 ring-2 ring-emerald-500/10" 
                  : "border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/30 dark:shadow-none hover:shadow-xl hover:-translate-y-1"
              }`}
            >
              {/* Selector - Small */}
              <button 
                onClick={() => toggleSelect(appt.id)}
                className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center z-10 ${
                  selectedIds.includes(appt.id) ? "bg-emerald-600 border-emerald-600" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 opacity-0 group-hover:opacity-100"
                }`}
              >
                {selectedIds.includes(appt.id) && <CheckCircle size={12} color="#fff" />}
              </button>

              <div className="p-5 flex-1 flex flex-col space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-900 dark:text-white font-black text-sm group-hover:scale-110 transition-all shrink-0">
                    {appt.farmerName?.charAt(0) || 'F'}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight truncate">{appt.farmerName}</h3>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{appt.phoneNumber}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                    appt.type === "Consultation" ? "bg-blue-500/5 text-blue-600 border-blue-500/10" : "bg-purple-500/5 text-purple-600 border-purple-500/10"
                  }`}>{appt.type}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                    appt.status === "Pending" ? "bg-amber-500/5 text-amber-600 border-amber-500/10" :
                    appt.status === "Completed" ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/10" : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-transparent"
                  }`}>{appt.status}</span>
                  {appt.status === "Cancelled" && appt.cancelledBy === "farmer" && (
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border bg-red-500/5 text-red-600 border-red-500/10">
                      Cancelled by farmer
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 flex-1">
                  <p className="text-slate-600 dark:text-slate-300 font-bold text-[11px] leading-relaxed line-clamp-3">{appt.issue}</p>
                </div>

                {/* Assignment Info - Clinical Guarded */}
                <div className="flex items-center justify-between py-2 border-t border-slate-50 dark:border-slate-800 pt-3">
                   <div className="overflow-hidden flex-1">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                       {appt.type === "Order" ? "Logistics Status" : "Assigned Specialist"}
                     </p>
                     <p className={`text-[10px] font-black uppercase truncate ${appt.type === "Order" ? "text-slate-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                       {appt.type === "Order" ? "Pharmacy Fulfillment" : (appt.assignedDoctorName || 'Not Assigned')}
                     </p>
                     {appt.isDirectRequest && appt.type !== "Order" && (
                       <div className="flex items-center gap-1 mt-0.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                         <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest">Farmer Direct Request</span>
                       </div>
                     )}
                   </div>
                   {(role === "admin" || role === "manager") && appt.type !== "Order" && (
                     <button 
                       onClick={() => setAssignModal(appt.id)}
                       className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                     >
                       <UserPlus size={14} />
                     </button>
                   )}
                </div>
              </div>

              {/* Action Hub - Unified High Density */}
              <div className="p-4 border-t border-slate-50 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => openWhatsApp(appt.phoneNumber, appt.issue, appt.prescription)}
                    className="flex-1 h-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-emerald-600 hover:text-white group"
                  >
                    <MessageSquare size={14} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] uppercase tracking-widest">Chat</span>
                  </button>
                  <button 
                    onClick={() => {
                      setNoteText(appt.doctorNotes || "");
                      setRxList(appt.prescription || []);
                      setNotesModal({ id: appt.id, existing: appt.doctorNotes || "", appt }); 
                    }}
                    className="w-10 h-10 bg-white dark:bg-slate-800 text-slate-500 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800 hover:border-emerald-500 transition-all"
                  >
                    <FileText size={16} />
                  </button>
                  {appt.prescription && appt.prescription.length > 0 && (
                    <button 
                      onClick={() => setViewingRx(appt)}
                      className="flex-1 py-2.5 bg-emerald-600/5 text-emerald-600 dark:text-emerald-400 rounded-xl font-black text-[8px] uppercase tracking-widest border border-emerald-500/10 hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Pill size={12} /> Digital Protocol
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  {appt.status === "Pending" && (
                    <button
                      onClick={() => handleStatusChange(appt.id, "Completed")}
                      className="flex-1 h-10 bg-emerald-500/5 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-500/10 hover:bg-emerald-600 hover:text-white transition-all font-black text-[9px] uppercase tracking-widest"
                    >
                      Process Complete
                    </button>
                  )}
                  {role === "admin" && (
                    <button
                      onClick={() => handleDelete(appt.id)}
                      className="w-10 h-10 bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white rounded-xl flex items-center justify-center border border-red-500/10 transition-all shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && !loading && (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-16 text-center border-4 border-dashed border-slate-100 dark:border-slate-800 col-span-full">
            <Calendar size={48} className="mx-auto text-slate-100 dark:text-slate-800 mb-4" />
            <h3 className="text-xl font-black text-slate-300 dark:text-slate-700 uppercase tracking-tighter italic">Archive Currently Empty</h3>
          </div>
        )}
      </div>

      {/* Prescription Preview Overlay */}
      {viewingRx && (
        <PrescriptionView 
          farmerName={viewingRx.farmerName || "Farmer"}
          phoneNumber={viewingRx.phoneNumber || "N/A"}
          doctorName={viewingRx.assignedDoctorName || "Authorized Physician"}
          doctorQuals={viewingRx.assignedDoctorQuals}
          clinicName={clinicSettings.name}
          clinicAddress={clinicSettings.address}
          clinicPhone={clinicSettings.phone}
          clinicLogoUrl={clinicSettings.logo}
          date={viewingRx.createdAt?.seconds 
            ? new Date(viewingRx.createdAt.seconds * 1000).toLocaleDateString()
            : new Date().toLocaleDateString()}
          issue={viewingRx.issue || "Clinical Case"}
          medications={viewingRx.prescription || []}
          onClose={() => setViewingRx(null)}
        />
      )}

      {/* Doctor Assignment Modal - Ergonomic */}
      {assignModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-3xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
             <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center shrink-0">
               <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-xl tracking-tighter flex items-center gap-2 italic">
                    <UserPlus size={20} className="text-emerald-500" /> Allocation Hub
                  </h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Select an expert for this consultation</p>
               </div>
               <button onClick={() => setAssignModal(null)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:scale-110 transition-transform">✕</button>
             </div>
             <div className="p-4 overflow-y-auto space-y-2 custom-scrollbar flex-1">
                {doctors.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">No experts online</div>
                ) : doctors.map(doc => (
                  <button 
                    key={doc.id}
                    onClick={() => assignModal && handleAssign(assignModal, doc)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center font-black text-base group-hover:bg-white/20">
                        {doc.displayName.charAt(0)}
                      </div>
                      <div className="text-left">
                        <p className="font-black uppercase tracking-tight text-xs">{doc.displayName}</p>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Verified Vet Expert</span>
                      </div>
                    </div>
                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
             </div>
             <div className="p-6 bg-slate-50 dark:bg-slate-800/20 border-t border-slate-50 dark:border-slate-800 shrink-0">
                <button onClick={() => setAssignModal(null)} className="w-full py-4 bg-white dark:bg-slate-800 text-slate-500 font-black rounded-2xl text-[9px] uppercase tracking-widest shadow-sm">Dismiss</button>
             </div>
           </div>
        </div>
      )}

      {/* Notes Modal - Ergonomic */}
      {notesModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tighter flex items-center gap-2 italic">
                  <FileText size={20} className="text-blue-500" /> Physician Intel
                </h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Medical diagnosis and follow-up directives</p>
              </div>
              <button onClick={() => setNotesModal(null)} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Diagnosis & Clinical Notes</label>
                <textarea
                  className="w-full h-32 px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl resize-none focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700 dark:text-white text-xs leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-600 shadow-inner"
                  placeholder="Document diagnosis, treatment plan, and medication protocols..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <IndianRupee size={14} className="text-emerald-500" /> Prescription Pad
                  </h4>
                  <button 
                    onClick={() => setShowRxEditor(!showRxEditor)}
                    className="text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:underline"
                  >
                    {showRxEditor ? "Minimize" : "Configure Rx"}
                  </button>
                </div>

                {showRxEditor && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 relative">
                        <input 
                          list="med-list"
                          id="med-input"
                          placeholder="Search Inventory or Manual Entry..."
                          className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl text-[11px] font-black outline-none border border-slate-100 dark:border-slate-800 focus:border-emerald-500/30"
                        />
                        <datalist id="med-list">
                          {inventoryMeds.map(m => <option key={m} value={m} />)}
                        </datalist>
                      </div>
                      <input id="dos-input" placeholder="Dosage (e.g. 5ml)" className="px-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl text-[10px] font-bold outline-none border border-slate-100 dark:border-slate-800" />
                      <input id="freq-input" placeholder="Freq (e.g. 1-0-1)" className="px-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl text-[10px] font-bold outline-none border border-slate-100 dark:border-slate-800" />
                      <input id="dur-input" placeholder="Duration (e.g. 5d)" className="px-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl text-[10px] font-bold outline-none border border-slate-100 dark:border-slate-800" />
                      <input id="desc-input" placeholder="Instructions/Description (e.g. Take after meals)" className="px-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl text-[10px] font-bold outline-none border border-slate-100 dark:border-slate-800" />
                      <button 
                        type="button"
                        onClick={() => {
                          const n = (document.getElementById('med-input') as HTMLInputElement).value;
                          const d = (document.getElementById('dos-input') as HTMLInputElement).value;
                          const f = (document.getElementById('freq-input') as HTMLInputElement).value;
                          const du = (document.getElementById('dur-input') as HTMLInputElement).value;
                          const de = (document.getElementById('desc-input') as HTMLInputElement).value;
                          if (n) {
                            setRxList([...rxList, { id: Date.now().toString(), name: n, dosage: d, frequency: f, duration: du, description: de }]);
                            ['med-input','dos-input','freq-input','dur-input','desc-input'].forEach(id => (document.getElementById(id) as any).value = "");
                          }
                        }}
                        className="col-span-2 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-transform"
                      >
                        Add to Protocol
                      </button>
                    </div>

                    <div className="space-y-2">
                      {rxList.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="flex-1 overflow-hidden mr-2">
                            <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate">{item.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.dosage} • {item.frequency} • {item.duration}</p>
                            {item.description && <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 italic mt-0.5 tracking-tight truncate">"{item.description}"</p>}
                          </div>
                          <button onClick={() => setRxList(rxList.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600 transition-colors">✕</button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-50 dark:border-slate-800 flex gap-3">
              <button onClick={() => { setNotesModal(null); setRxList([]); setShowRxEditor(false); }} className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-500 font-black rounded-xl text-[9px] uppercase tracking-widest active:scale-95 transition-transform">Dismiss</button>
              <button
                onClick={async () => {
                  setSaving(true);
                  await updateDoc(doc(db, "appointments", notesModal.id), { 
                    doctorNotes: noteText,
                    prescription: rxList 
                  });
                  setSaving(false);
                  setNotesModal(null);
                  setRxList([]);
                  setShowRxEditor(false);
                }}
                disabled={saving}
                className="flex-[2] py-4 bg-emerald-600 text-white font-black rounded-xl text-[9px] uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-95 transition-all"
              >
                {saving ? "Transmitting..." : "Authorize Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
