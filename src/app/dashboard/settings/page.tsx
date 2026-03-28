"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { 
  Save, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  Zap,
  ChevronLeft
} from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { role } = useAuth();
  const [whatsapp, setWhatsapp] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [consultationFee, setConsultationFee] = useState(500);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = doc(db, "settings", "global");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const d = docSnap.data();
        setWhatsapp(d.whatsapp || "");
        setClinicName(d.clinicName || "Sanjivani Vet Care");
        setAddress(d.address || "");
        setLogoUrl(d.logoUrl || "");
        setConsultationFee(d.consultationFee || 500);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await setDoc(doc(db, "settings", "global"), { 
        whatsapp,
        clinicName,
        address,
        logoUrl,
        consultationFee: Number(consultationFee)
      });
      setMessage({ type: 'success', text: "Strategic parameters synchronized." });
    } catch (err) {
      setMessage({ type: 'error', text: "Operation Failed: System Error." });
    } finally {
      setSaving(false);
    }
  };

  if (role !== "admin") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-red-100 dark:border-red-900/30">
        <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center text-red-500 mb-6 font-black italic">!</div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-2">Access Sanctioned</h2>
        <p className="text-slate-500 text-sm max-w-xs font-medium">Core System Engine configuration is reserved for Super Administrators. Access attempt logged.</p>
        <Link href="/dashboard" className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Return to Command Hub</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-10 pb-20">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">System Engine</h1>
          <p className="text-slate-500 font-medium">Global Configuration & Protocol Calibration</p>
        </div>
      </div>

      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSave} 
        className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl p-10 space-y-12"
      >
        {/* Clinic Identity Section */}
        <div className="space-y-8">
           <div className="flex items-center gap-4 text-blue-600 bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 w-fit">
            <Zap size={24} />
            <h3 className="font-black text-lg uppercase tracking-tighter italic pr-4">Clinic Identity Hub</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Official Clinic Name</label>
              <input 
                type="text" required
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-900 dark:text-white"
                value={clinicName} onChange={(e) => setClinicName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Branding Logo URL</label>
              <input 
                type="text"
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-900 dark:text-white"
                value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Headquarters Address</label>
              <textarea 
                rows={2}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-900 dark:text-white resize-none"
                value={address} onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Financial Logistics */}
        <div className="space-y-8 pt-4">
           <div className="flex items-center gap-4 text-emerald-600 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 w-fit">
            <Zap size={24} />
            <h3 className="font-black text-lg uppercase tracking-tighter italic pr-4">Financial Dynamics</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Default Consultation Fee (₹)</label>
              <input 
                type="number" required
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-slate-900 dark:text-white"
                value={consultationFee} onChange={(e) => setConsultationFee(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Support WhatsApp</label>
              <input 
                type="text" required 
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-slate-900 dark:text-white"
                value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-5 rounded-2xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-black text-[10px] uppercase tracking-widest">{message.text}</span>
          </div>
        )}

        <button 
          type="submit"
          disabled={saving || loading}
          className="w-full h-16 bg-slate-900 dark:bg-emerald-600 hover:scale-[1.01] text-white font-black py-4 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-100 dark:shadow-none disabled:opacity-50 uppercase text-xs tracking-widest active:scale-95"
        >
          <Save size={20} />
          <span>{saving ? 'Synchronizing Engine...' : 'Sync Strategic Parameters'}</span>
        </button>
      </motion.form>
    </div>
  );
}
