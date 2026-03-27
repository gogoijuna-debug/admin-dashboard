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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = doc(db, "settings", "global");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setWhatsapp(docSnap.data().whatsapp || "");
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
      await setDoc(doc(db, "settings", "global"), { whatsapp });
      setMessage({ type: 'success', text: "Settings saved successfully!" });
    } catch (err) {
      setMessage({ type: 'error', text: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  if (role !== "admin") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-red-100 dark:border-red-900/30">
        <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center text-red-500 mb-6">
          <ShieldCheck size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-2">Access Sanctioned</h2>
        <p className="text-slate-500 text-sm max-w-xs font-medium">Core System Engine configuration is reserved for Super Administrators. Access attempt logged.</p>
        <Link href="/dashboard" className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Return to Command Hub</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-10 pb-20">
      <div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">System Engine</h1>
        <p className="text-slate-500 font-medium">Global Configuration & Protocol Calibration</p>
      </div>

      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSave} 
        className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl p-10 space-y-8"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 text-emerald-600 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
            <Zap size={24} />
            <h3 className="font-black text-lg uppercase tracking-tighter italic">Clinical Collaboration Hub</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-bold uppercase tracking-widest opacity-60">
            Specify the master contact number for tele-consultation. 
            Farmers clicking the "Consult Doctor" button will be redirected to this WhatsApp protocol.
          </p>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master WhatsApp (Country Code + Number)</label>
            <input 
              type="text" 
              required 
              placeholder="919876543210"
              className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono text-xl font-black text-slate-900 dark:text-white tracking-widest"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
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
          className="w-full h-16 bg-slate-900 dark:bg-emerald-600 hover:scale-[1.01] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-100 dark:shadow-none disabled:opacity-50 uppercase text-xs tracking-widest"
        >
          <Save size={20} />
          <span>{saving ? 'Synchronizing Engine...' : 'Save Configuration'}</span>
        </button>
      </motion.form>
    </div>
  );
}
