"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Menu as SidebarIcon } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="relative mb-8">
             <div className="absolute inset-0 bg-emerald-500/20 blur-[50px] animate-pulse rounded-full" />
             <div className="relative w-24 h-24 bg-slate-900 dark:bg-emerald-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl overflow-hidden p-2">
                <div className="w-full h-full bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center">
                   <div className="w-6 h-6 border-4 border-emerald-500 border-t-transparent rounded-full animate-rotate" />
                </div>
             </div>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-1">Sanjivani <span className="text-emerald-500">Vet Care</span></h2>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Operational Readiness Check...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Stationary Clinical Pillar (Sidebar) */}
      <aside className={`fixed lg:sticky top-0 h-screen z-40 w-64 transition-transform duration-300 transform border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl lg:shadow-none ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <Sidebar onItemClick={() => setIsMobileMenuOpen(false)} />
      </aside>
      
      {/* Main Command Area */}
      <main className="flex-1 relative min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Mobile Header Toggle */}
        <div className="lg:hidden p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/20">
               <SidebarIcon size={18} />
             </div>
             <h1 className="font-black text-emerald-600 uppercase tracking-tighter italic text-sm">Sanjivani</h1>
           </div>
           
           <button 
             onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
             className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 active:scale-90 transition-transform"
           >
             <SidebarIcon size={20} />
           </button>
        </div>

        <div className="p-6 lg:p-12 max-w-7xl mx-auto">
          {mounted && (
            <AnimatePresence mode="popLayout">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
}
