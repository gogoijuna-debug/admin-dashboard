"use client";

import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  CalendarClock, 
  Package, 
  Settings, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  Users,
  ShoppingCart,
  ClipboardCheck,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { collection, query, onSnapshot, where, doc, updateDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

export default function Sidebar({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const { role, user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [snapDocs, setSnapDocs] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setSnapDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    await signOut(auth);
    if (onItemClick) onItemClick();
    router.push("/login");
  };

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard", roles: ["admin", "doctor", "manager"] },
    { name: "Appointments", icon: CalendarClock, href: "/dashboard/appointments", roles: ["admin", "doctor", "manager"] },
    { name: "Direct Shop", icon: ShoppingCart, href: "/dashboard/shop", roles: ["admin", "manager"] },
    { name: "Fulfillment", icon: ClipboardCheck, href: "/dashboard/fulfill", roles: ["admin", "manager"] },
    { name: "Financial Reports", icon: BarChart3, href: "/dashboard/reports", roles: ["admin", "manager"] },
    { name: "Farmers", icon: Users, href: "/dashboard/farmers", roles: ["admin", "manager"] },
    { name: "Inventory", icon: Package, href: "/dashboard/inventory", roles: ["admin", "manager"] },
    { name: "Staff", icon: ShieldCheck, href: "/dashboard/users", roles: ["admin"] },
    { name: "Settings", icon: Settings, href: "/dashboard/settings", roles: ["admin"] },
  ];

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 w-64 transition-colors duration-300">
      <div className="p-8 border-b border-slate-50 dark:border-slate-900 mb-6 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="flex items-center gap-4">
          <motion.div 
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-200 dark:shadow-none overflow-hidden p-1"
          >
            <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-contain" />
          </motion.div>
          <div>
            <h2 className="font-black text-slate-900 dark:text-white leading-tight text-lg tracking-tighter uppercase italic">Sanjivani</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
               <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-[0.2em]">{role || 'System'}</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item, idx) => {
          if (!role || !item.roles.includes(role)) return null;
          const isActive = pathname === item.href;
          
          return (
            <Link key={item.href} href={item.href} onClick={onItemClick} className="relative block group">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-center justify-between px-5 py-3 rounded-2xl transition-all duration-300 relative z-10 ${
                  isActive 
                    ? "text-white" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <item.icon size={18} className={isActive ? "text-white" : "text-slate-400 group-hover:text-emerald-500 transition-colors"} />
                  <span className="font-black text-[11px] uppercase tracking-widest">{item.name}</span>
                </div>
                {isActive && (
                  <motion.div 
                    layoutId="activeGlow"
                    className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" 
                  />
                )}
              </motion.div>
              
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-200/50 dark:shadow-none"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 space-y-4">

        <div className="bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100/50 dark:border-slate-800/50 rounded-2xl p-4 backdrop-blur-sm">
          <div className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-1 flex items-center gap-2">
             <div className="w-1 h-1 rounded-full bg-emerald-500" /> Identity
          </div>
          <p className="text-[10px] font-black text-slate-900 dark:text-white truncate uppercase opacity-80">{user?.email}</p>
        </div>
        
        {/* Footer Actions */}
      <div className={`p-4 border-t border-slate-50 dark:border-slate-800 ${isCollapsed ? 'items-center' : ''}`}>
        {role === 'doctor' && user && (
          <button 
            onClick={async () => {
              const currentUser = snapDocs.find(d => d.id === user.uid);
              const currentStatus = currentUser?.active !== false;
              await updateDoc(doc(db, "users", user.uid), { active: !currentStatus });
            }}
            className={`w-full mb-3 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 px-3 ${
              snapDocs.find(d => d.id === user.uid)?.active !== false 
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md" 
              : "bg-red-500/5 text-red-500 border-red-500/10 hover:bg-red-500 hover:text-white"
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${snapDocs.find(d => d.id === user.uid)?.active !== false ? 'bg-white animate-pulse' : 'bg-red-500'}`} />
            {!isCollapsed && (snapDocs.find(d => d.id === user.uid)?.active !== false ? 'Duty: Online' : 'Duty: Offline')}
          </button>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl transition-all group font-black uppercase text-[10px] tracking-widest ${isCollapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={18} className="group-hover:scale-110 transition-transform" />
          {!isCollapsed && <span>Logout Hub</span>}
        </button>
      </div>
      </div>
    </div>
  );
}
