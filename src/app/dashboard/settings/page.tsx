"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Save, Phone, CheckCircle2, AlertCircle } from "lucide-react";

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

  if (role !== "admin") return <div>Access Denied</div>;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>
        <p className="text-slate-500">Configure global parameters for the farmer app.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-emerald-600">
            <Phone size={24} />
            <h3 className="font-bold text-lg">WhatsApp Collaboration</h3>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            Specify the contact number for tele-consultation. 
            Farmers clicking the "Consult Doctor" button will be redirected to this WhatsApp number.
          </p>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp Number (e.g., 919876543210)</label>
            <input 
              type="text" 
              required 
              placeholder="Enter number with country code"
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono text-lg font-semibold"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold text-sm tracking-tight">{message.text}</span>
          </div>
        )}

        <button 
          type="submit"
          disabled={saving || loading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-100 disabled:opacity-50"
        >
          <Save size={20} />
          <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
        </button>
      </form>
    </div>
  );
}
