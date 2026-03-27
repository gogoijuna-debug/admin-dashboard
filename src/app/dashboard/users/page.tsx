"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc, orderBy, query } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { 
  Users, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Stethoscope, 
  Mail, 
  Lock, 
  UserCircle,
  Award,
  BookOpen,
  Camera,
  ArrowRight
} from "lucide-react";

interface AppUser {
  id: string;
  email: string;
  role: "admin" | "doctor" | "manager";
  displayName?: string;
  qualification?: string;
  bio?: string;
  imageUrl?: string;
  active?: boolean;
  createdAt?: any;
}

import { motion, AnimatePresence } from "framer-motion";

export default function UsersPage() {
  const { role: userRole } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "doctor" | "manager">("doctor");
  const [displayName, setDisplayName] = useState("");
  const [qualification, setQualification] = useState("");
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("role"));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppUser)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setEmail(""); setPassword(""); setNewRole("doctor");
    setDisplayName(""); setQualification(""); setBio(""); setImageUrl("");
    setEditingUser(null);
    setError("");
  };

  const handleEdit = (user: AppUser) => {
    setEditingUser(user);
    setEmail(user.email);
    setDisplayName(user.displayName || "");
    setNewRole(user.role);
    setQualification(user.qualification || "");
    setBio(user.bio || "");
    setImageUrl(user.imageUrl || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingUser) {
        // Update existing user profile
        await setDoc(doc(db, "users", editingUser.id), {
          email, 
          role: newRole, 
          displayName,
          qualification: newRole === "doctor" ? qualification : "",
          bio: newRole === "doctor" ? bio : "",
          imageUrl,
          active: editingUser.active !== undefined ? editingUser.active : true,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else {
        // Create new user (requires password)
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", cred.user.uid), {
          email, 
          role: newRole, 
          displayName,
          qualification: newRole === "doctor" ? qualification : "",
          bio: newRole === "doctor" ? bio : "",
          imageUrl,
          active: true,
          createdAt: new Date().toISOString()
        });
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Operation failed.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user: AppUser) => {
    try {
      await setDoc(doc(db, "users", user.id), {
        active: !user.active
      }, { merge: true });
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Erase this authority record from the global directory? Status: IRREVERSIBLE.")) return;
    await deleteDoc(doc(db, "users", id));
  };

  if (userRole !== "admin") return <div className="p-20 text-center font-black uppercase text-slate-400">Access Restricted</div>;

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
            Authority Hub
          </h1>
          <div className="text-slate-500 dark:text-slate-400 font-black mt-0.5 uppercase tracking-widest text-[9px] flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             Personnel Management & Access Authorization
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              setSaving(true);
              try {
                const batch = users.filter(u => u.role === "doctor" && u.active === undefined);
                for (const u of batch) {
                  await setDoc(doc(db, "users", u.id), { active: true }, { merge: true });
                }
                alert(`DIRECTORY SYNCED: ${batch.length} identities successfully sanctioned.`);
              } catch (e) { alert("Sync Failed"); }
              setSaving(false);
            }}
            className="hidden md:flex bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-500 font-black py-3 px-6 rounded-2xl items-center gap-2 transition-all border border-transparent hover:border-emerald-500/20 uppercase text-[9px] tracking-widest active:scale-95"
          >
            <ShieldCheck size={16} /> Sanitize Directory
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-sm uppercase text-[10px] tracking-widest active:scale-95"
          >
            <Plus size={16} /> Provision Identity
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center gap-4">
             <div className="w-8 h-8 border-t-2 border-emerald-500 rounded-full animate-spin" />
             <p className="text-slate-400 font-black uppercase tracking-widest text-[9px]">Synchronizing Secure Directory...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
            <Users size={48} className="mx-auto mb-4 text-slate-100 dark:text-slate-800" />
            <h3 className="text-lg font-black text-slate-300 dark:text-slate-700 uppercase tracking-tighter italic">Archive Null</h3>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {users.map((user, idx) => (
              <motion.div 
                layout
                key={user.id} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
              >
                <div className="p-6 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center overflow-hidden border transition-transform group-hover:scale-105 duration-500 shadow-inner ${
                        user.role === "admin" ? "bg-emerald-500/5 border-emerald-500/10" : "bg-blue-500/5 border-blue-500/10"
                      }`}>
                        {user.imageUrl ? (
                          <img src={user.imageUrl} alt={user.displayName} className="w-full h-full object-cover" />
                        ) : (
                          user.role === "admin" 
                            ? <ShieldCheck size={28} className="text-emerald-500 opacity-40" />
                            : <Stethoscope size={28} className="text-blue-500 opacity-40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black text-base text-slate-900 dark:text-white uppercase tracking-tight truncate italic">{user.displayName || "Unauthorized Personnel"}</h3>
                        </div>
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(user)} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500 rounded-xl transition-all border border-slate-100 dark:border-slate-700">
                        <Users size={16} />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-slate-100 dark:border-slate-700">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 border ${
                      user.role === 'admin' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                    }`}>
                      {user.role === 'admin' ? <ShieldCheck size={10} /> : <Stethoscope size={10} />}
                      {user.role}
                    </div>
                    {user.role === 'doctor' && (
                      <button 
                        onClick={() => toggleStatus(user)}
                        className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 ${
                          user.active !== false 
                          ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20 hover:bg-emerald-600 hover:text-white' 
                          : 'bg-red-500/5 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'
                        }`}
                      >
                         <div className={`w-1.5 h-1.5 rounded-full ${user.active === true ? 'bg-emerald-500 animate-pulse' : user.active === false ? 'bg-red-500' : 'bg-amber-500 animate-bounce'}`} />
                        {user.active === true ? 'Sanctioned / Active' : user.active === false ? 'Suspended / Inactive' : 'UNSANCTIONED / PENDING'}
                      </button>
                    )}
                    {user.qualification && (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border border-slate-100 dark:border-slate-700">
                        <Award size={10} className="text-amber-500" /> {user.qualification}
                      </span>
                    )}
                  </div>

                  {user.role === "doctor" && user.bio && (
                    <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-[1.5rem] border border-slate-100/50 dark:border-slate-800/50">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                           <BookOpen size={10} className="text-emerald-500" /> Professional Intel
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 font-bold text-[11px] leading-relaxed line-clamp-2 italic">"{user.bio}"</p>
                      </div>
                  )}
                </div>
                
                <div className={`h-1 w-full ${user.role === 'admin' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-xl tracking-tighter flex items-center gap-3 uppercase italic">
                    <UserCircle size={28} className="text-emerald-500" /> {editingUser ? "Update Identity" : "Provision Hub"}
                  </h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {editingUser ? `Modifying profile for ${editingUser.email}` : "Initialize Secure Authority Identity"}
                  </p>
                </div>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                <form id="provision-form" onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Identity Email</label>
                      <div className={`flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3.5 border border-transparent focus-within:border-emerald-500/20 transition-all ${editingUser ? "opacity-50" : ""}`}>
                        <Mail size={16} className="text-slate-400" />
                        <input type="email" required disabled={!!editingUser} className="bg-transparent flex-1 outline-none font-black text-slate-800 dark:text-white text-xs"
                          value={email} onChange={e => setEmail(e.target.value)} placeholder="expert@sanjivani.care" />
                      </div>
                    </div>
                    {!editingUser && (
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Secure Protocol (Pass)</label>
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3.5 border border-transparent focus-within:border-emerald-500/20 transition-all">
                          <Lock size={16} className="text-slate-400" />
                          <input type="password" required minLength={6} className="bg-transparent flex-1 outline-none font-black text-slate-800 dark:text-white text-xs"
                            value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                        </div>
                      </div>
                    )}
                    <div className="col-span-full space-y-2">
                      <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Professional Designation</label>
                      <input required className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-black text-slate-800 dark:text-white text-[15px] placeholder:opacity-30 border border-transparent focus:border-emerald-500/20"
                        value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Dr. Jatin Saikia" />
                    </div>

                    {/* Role Toggles - High Density */}
                    <div className="sm:col-span-2 space-y-2">
                       <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Assigned Authority Level</label>
                       <div className="flex flex-wrap gap-2">
                          {(["admin", "doctor", "manager"] as const).map(r => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setNewRole(r)}
                              className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                newRole === r ? "bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600 shadow-lg" : "bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent hover:border-slate-200"
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                       </div>
                    </div>

                    {newRole === "doctor" && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="col-span-full space-y-4"
                      >
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Medical Credentials</label>
                          <input className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-black text-slate-800 dark:text-white text-xs border border-transparent focus:border-emerald-500/20"
                            value={qualification} onChange={e => setQualification(e.target.value)} placeholder="e.g. BVSc & AH, MVSc" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Physician Bio</label>
                          <textarea className="w-full h-20 px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-slate-700 dark:text-slate-300 text-xs resize-none border border-transparent focus:border-emerald-500/20"
                            value={bio} onChange={e => setBio(e.target.value)} placeholder="Primary expertise in clinical pathology..." />
                        </div>
                      </motion.div>
                    )}

                    <div className="col-span-full space-y-2">
                      <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Camera size={12} /> Portrait Asset URL
                      </label>
                      <input className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-black text-emerald-600 dark:text-emerald-400 text-[10px] border border-transparent focus:border-emerald-500/20"
                        value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Portrait link for administrative directory..." />
                    </div>
                  </div>

                  {error && <p className="bg-red-500/5 text-red-500 p-4 rounded-xl font-black text-[9px] uppercase tracking-widest border border-red-500/10">{error}</p>}
                </form>
              </div>

              <div className="p-6 border-t border-slate-50 dark:border-slate-800 flex gap-3">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-400 font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-transform">Cancel</button>
                <button form="provision-form" type="submit" disabled={saving} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-md hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">
                  {saving ? "Transmitting..." : <>{editingUser ? "Sync Changes" : "Authorize Identity"} <ArrowRight size={14}/></>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
