"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, orderBy } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Package, 
  Search, 
  Download, 
  AlertTriangle, 
  TrendingDown, 
  IndianRupee,
  Layers,
  Image as ImageIcon,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

interface InventoryItem {
  id: string;
  name: string;
  category: "Medicine" | "Feed";
  stock: number;
  unit: string;
  price: number;
  mrp: number;
  discountPercentage: number;
  description?: string;
  imageUrl?: string;
}

export default function InventoryPage() {
  const { role, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"All" | "Medicine" | "Feed">("All");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"Medicine" | "Feed">("Medicine");
  const [stock, setStock] = useState(0);
  const [unit, setUnit] = useState("kg");
  const [price, setPrice] = useState(0);
  const [mrp, setMrp] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Fetch inventory data — must be above conditional returns (React Rules of Hooks)
  useEffect(() => {
    const q = query(collection(db, "inventory"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Wait for auth to finish loading before rendering anything
  if (!mounted || authLoading) return null;

  const isAuthorized = role === "admin" || role === "manager";

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-600 mb-6 transition-all animate-pulse">
           <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-2">Operational Privacy</h2>
        <p className="text-slate-500 text-sm max-w-xs font-medium">This Strategic Hub is reserved for Managerial and Administrative roles. Clinical duties only beyond this protocol.</p>
        <Link href="/dashboard" className="mt-8 px-8 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Back to Clinical Protocol</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { 
      name, 
      category, 
      stock: Number(stock), 
      unit, 
      price: Number(price), 
      mrp: Number(mrp), 
      discountPercentage: Number(discountPercentage),
      description, 
      imageUrl 
    };
    if (editingItem) {
      await updateDoc(doc(db, "inventory", editingItem.id), data);
    } else {
      await setDoc(doc(collection(db, "inventory")), data);
    }
    closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setName(""); setCategory("Medicine"); setStock(0); setUnit("kg"); setPrice(0); setMrp(0); setDiscountPercentage(0); setDescription(""); setImageUrl("");
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name); setCategory(item.category); setStock(item.stock); setUnit(item.unit); setPrice(item.price); setMrp(item.mrp || item.price); setDiscountPercentage(item.discountPercentage || 0); setDescription(item.description || ""); setImageUrl(item.imageUrl || "");
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Evict this product from inventory permanently?")) {
      await deleteDoc(doc(db, "inventory", id));
    }
  };

  const filteredItems = items.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All" || i.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockThreshold = 10;
  const lowStockItems = items.filter(i => i.stock <= lowStockThreshold).length;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Strategic Inventory</h1>
          <p className="text-slate-500 font-medium">Logistics & Supply Chain Management Hub</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           {lowStockItems > 0 && (
             <div className="flex items-center gap-2 bg-amber-500/10 text-amber-600 px-6 py-3 rounded-2xl border border-amber-500/20 text-[10px] font-black uppercase tracking-widest animate-pulse">
                <AlertTriangle size={14} /> {lowStockItems} LOW STOCK ALERTS
             </div>
           )}
           <button 
             onClick={() => setShowModal(true)}
             className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all active:scale-95"
           >
             <Plus size={18} /> New Stock Entry
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Asset Items", val: items.length, icon: Layers, color: "blue" },
          { label: "Medicine Resupply", val: items.filter(i => i.category === 'Medicine' && i.stock <= 5).length, icon: TrendingDown, color: "red" },
          { label: "Aggregate Value", val: `₹${items.reduce((sum, i) => sum + (i.price * i.stock), 0).toLocaleString()}`, icon: IndianRupee, color: "emerald" },
          { label: "Warehouse Unit Count", val: items.reduce((sum, i) => sum + i.stock, 0), icon: Package, color: "purple" }
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[35px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
             <div className={`w-12 h-12 rounded-2xl bg-${s.color}-500/10 flex items-center justify-center text-${s.color}-600 mb-6`}><s.icon size={24} /></div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
             <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{s.val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Search master inventory..." 
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-xs font-bold"
            />
          </div>
          <div className="flex items-center gap-2 p-1 bg-slate-50 dark:bg-slate-950 rounded-2xl">
            {["All", "Medicine", "Feed"].map(c => (
              <button 
                key={c} onClick={() => setCategoryFilter(c as any)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${categoryFilter === c ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md' : 'text-slate-400'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-3">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                <th className="px-6 py-4">Article Identity</th>
                <th className="px-6 py-4">Stock Status</th>
                <th className="px-6 py-4">Unit Price</th>
                <th className="px-6 py-4">Total Value</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id} className="group bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-5 rounded-l-[1.5rem] border-y border-l border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 overflow-hidden border border-slate-100 dark:border-slate-800">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={24} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.name}</p>
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">{item.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 border-y border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${item.stock <= lowStockThreshold ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                       <span className="text-sm font-black text-slate-700 dark:text-slate-300">{item.stock} <span className="text-[10px] text-slate-400 uppercase">{item.unit}</span></span>
                    </div>
                  </td>
                  <td className="px-6 py-5 border-y border-slate-50 dark:border-slate-800">
                    <div className="flex flex-col">
                       {item.mrp > item.price && (
                         <span className="text-[10px] text-slate-400 line-through">₹{item.mrp}</span>
                       )}
                       <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 dark:text-white">₹{item.price}</span>
                          {item.discountPercentage > 0 && (
                            <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-md">-{item.discountPercentage}%</span>
                          )}
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 border-y border-slate-50 dark:border-slate-800 font-black text-emerald-600 italic">₹{(item.price * item.stock).toLocaleString()}</td>
                  <td className="px-6 py-5 rounded-r-[1.5rem] border-y border-r border-slate-50 dark:border-slate-800 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button onClick={() => handleEdit(item)} className="p-3 text-slate-400 hover:text-emerald-500 transition-colors"><Edit2 size={16} /></button>
                       <button onClick={() => handleDelete(item.id)} className="p-3 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] w-full max-w-2xl border border-slate-100 dark:border-slate-800">
               <div className="flex justify-between items-center mb-10">
                 <h2 className="text-2xl font-black italic uppercase tracking-tighter">{editingItem ? 'Edit Product Protocol' : 'New Stock Activation'}</h2>
                 <button onClick={closeModal} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl"><ChevronRight className="rotate-90" /></button>
               </div>
               <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
                 <div className="col-span-2 space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Name</label>
                   <input required value={name} onChange={e => setName(e.target.value)} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl font-bold" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                   <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl font-bold">
                     <option value="Medicine">Medicine Protocol</option>
                     <option value="Feed">Feed Inventory</option>
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Unit</label>
                   <input value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl font-bold" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Qty</label>
                   <input type="number" required value={stock} onChange={e => setStock(Number(e.target.value))} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl font-bold" />
                 </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MRP (Max Price)</label>
                    <input type="number" required value={mrp} onChange={e => {
                      const val = Number(e.target.value);
                      setMrp(val);
                      setPrice(val - (val * discountPercentage / 100));
                    }} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discount %</label>
                    <input type="number" required value={discountPercentage} onChange={e => {
                      const val = Number(e.target.value);
                      setDiscountPercentage(val);
                      setPrice(mrp - (mrp * val / 100));
                    }} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl font-bold" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-600">Calculated Final Selling Price</label>
                    <div className="w-full px-6 py-4 bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 rounded-2xl font-black text-xl italic mb-4">
                      ₹{price.toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Photo URL</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                        <ImageIcon size={18} />
                      </div>
                      <input 
                        value={imageUrl} 
                        onChange={e => setImageUrl(e.target.value)} 
                        placeholder="https://example.com/image.jpg"
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-950 border border-transparent focus:border-emerald-500/30 rounded-2xl font-bold transition-all outline-none" 
                      />
                    </div>
                    {imageUrl && (
                      <div className="mt-4 w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800">
                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                 <button type="submit" className="col-span-2 mt-6 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Synchronize Warehouse</button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
