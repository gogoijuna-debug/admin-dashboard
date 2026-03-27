"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Stethoscope } from "lucide-react";

import { motion } from "framer-motion";
import { Activity, Mail, Lock, LogIn, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError("Authorization Protocol Failed: Credentials Invalid");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[3.5rem] border border-white dark:border-slate-800 shadow-2xl p-12 space-y-10">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-4"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-600 dark:bg-emerald-500 text-white rounded-3xl mb-4 shadow-xl shadow-emerald-200 dark:shadow-none animate-bounce-slow">
              <Activity size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Sanjivani</h1>
              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.4em] mt-1 ml-1 flex items-center justify-center gap-2">
                <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                Medical Authority Portal
              </p>
            </div>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4">Access ID</label>
              <div className="group flex items-center gap-4 bg-slate-100/50 dark:bg-slate-800/50 border-2 border-transparent focus-within:border-emerald-500/30 focus-within:bg-white dark:focus-within:bg-slate-800 rounded-[2rem] p-5 transition-all outline-none">
                <Mail size={20} className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="email"
                  required
                  className="bg-transparent flex-1 outline-none font-black text-slate-800 dark:text-white text-sm placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  placeholder="AUTHORITY@SANJIVANI.CARE"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4">Security Key</label>
              <div className="group flex items-center gap-4 bg-slate-100/50 dark:bg-slate-800/50 border-2 border-transparent focus-within:border-emerald-500/30 focus-within:bg-white dark:focus-within:bg-slate-800 rounded-[2rem] p-5 transition-all outline-none">
                <Lock size={20} className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="password"
                  required
                  className="bg-transparent flex-1 outline-none font-black text-slate-800 dark:text-white text-sm placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </motion.div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/10 text-red-600 dark:text-red-400 p-5 rounded-[1.5rem] font-black text-[9px] uppercase tracking-widest border border-red-500/20 text-center"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-6 rounded-[2rem] transition-all shadow-2xl shadow-emerald-200/50 dark:shadow-none flex items-center justify-center gap-4 uppercase text-xs tracking-[0.3em] active:scale-95 disabled:opacity-50"
            >
              {loading ? "Authorizing..." : <><LogIn size={20} /> Authorize Login</>}
            </motion.button>
          </form>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center"
          >
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
              <ShieldCheck size={12} className="text-emerald-500" />
              Sanjivani Identity Verification System v2.0
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
