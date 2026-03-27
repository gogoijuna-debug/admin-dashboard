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
  description?: string;
  imageUrl?: string;
}

export default function InventoryPage() {
  const { role } = useAuth();
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
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  if (role === "doctor") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-600 mb-6 font-black italic">!</div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-2">Operational Privacy</h2>
        <p className="text-slate-500 text-sm max-w-xs font-medium">The Inventory Management Hub is reserved for Managerial and Administrative roles. Clinical duties only beyond this point.</p>
        <Link href="/dashboard" className="mt-8 px-8 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Back to Clinical Protocol</Link>
      </div>
    );
  }

  useEffect(() => {
    const q = query(collection(db, "inventory"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name, category, stock: Number(stock), unit, price: Number(price), description, imageUrl };
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
    setName(""); setCategory("Medicine"); setStock(0); setUnit("kg"); setPrice(0); setDescription(""); setImageUrl("");
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name); setCategory(item.category); setStock(item.stock); setUnit(item.unit); setPrice(item.price); setDescription(item.description || ""); setImageUrl(item.imageUrl || "");
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Evict this product from inventory permanently?")) {
      await deleteDoc(doc(db, "inventory", id));
    }
  };

  const filteredItems = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const exportCSV = () => {
    const headers = ["Name", "Category", "Stock", "Unit", "Price", "Description"];
    const rows = filteredItems.map(i => [i.name, i.category, i.stock, i.unit, `₹${i.price}`, `"${i.description || ''}"` ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (role !== "admin") return <div className="p-20 text-center font-black uppercase text-slate-400">Access Restricted</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-2 italic">
            <Package className="text-emerald-500" size={24} />
            Supply Center
          </h1>
          <div className="text-slate-500 dark:text-slate-400 font-black mt-0.5 uppercase tracking-widest text-[9px] flex items-center gap-2">
             <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
             Logistics & Global Inventory Control
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
            <Download size={14} /> Export Log
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-200/50 dark:shadow-none uppercase text-[10px] tracking-widest active:scale-95"
          >
            <Plus size={16} /> New Entry
          </button>
        </div>
      </div>

      {/* Control Hub - Compact */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-1 flex items-center gap-3 shadow-sm">
          <div className="pl-4 text-slate-400"><Search size={18} /></div>
          <input 
            type="text" 
            placeholder="Query supply database..." 
            className="flex-1 bg-transparent border-none outline-none text-slate-700 dark:text-white font-black text-[11px] uppercase tracking-tight py-3"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(["All", "Medicine", "Feed"] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                categoryFilter === cat
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200/50 dark:shadow-none"
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-emerald-500/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Grid - High Density */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredItems.map((item) => (
          <div key={item.id} className="group relative bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/30 dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            {/* Visual Stock Indicator */}
            {item.stock <= 5 && (
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse z-10" />
            )}
            
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover:scale-105 transition-transform">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={24} className="text-slate-300" />
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                    item.category === 'Medicine' ? 'bg-blue-500/5 text-blue-500 border border-blue-500/10' : 'bg-amber-500/5 text-amber-500 border border-amber-500/10'
                  }`}>
                    {item.category}
                  </span>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter leading-none italic">₹{item.price}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">MSRP</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1">{item.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2 min-h-[30px] leading-relaxed">{item.description || 'No specialized description available.'}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-base font-black tracking-tighter ${item.stock <= 5 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                      {item.stock} {item.unit}
                    </span>
                    {item.stock <= 5 && <AlertTriangle size={14} className="text-red-500 animate-bounce" />}
                  </div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">In Stock</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => handleEdit(item)} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/10">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
            
            {item.stock <= 5 && (
              <button className="w-full py-2.5 bg-red-500 text-white font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2">
                <TrendingDown size={12} /> Restock Required
              </button>
            )}
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-32 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-800">
             <Package size={64} className="mx-auto text-slate-100 dark:text-slate-800 mb-6" />
             <h3 className="text-2xl font-black text-slate-300 dark:text-slate-700 uppercase tracking-tighter italic">No supplies found in this sector</h3>
          </div>
        )}
      </div>

      {/* Ergonomic Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-xl shadow-3xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center gap-2">
                  <Layers className="text-emerald-500" size={24} />
                  Supply Entry Center
                </h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Authorizing inventory logistics update</p>
              </div>
              <button onClick={closeModal} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:scale-110 transition-transform">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Product Catalog Name</label>
                  <input 
                    type="text" required 
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white text-base"
                    value={name} onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Sector Category</label>
                  <select 
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-900 dark:text-white uppercase text-[10px] tracking-widest"
                    value={category} onChange={(e) => setCategory(e.target.value as any)}
                  >
                    <option value="Medicine">Medicine</option>
                    <option value="Feed">Livestock Feed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Standard Unit</label>
                  <input 
                    type="text" required placeholder="kg, bottle, pkt..."
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white uppercase text-[10px] tracking-widest"
                    value={unit} onChange={(e) => setUnit(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Stock Level</label>
                  <input 
                    type="number" required 
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white text-base"
                    value={stock} onChange={(e) => setStock(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">MSRP Value (₹)</label>
                  <input 
                    type="number" required 
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white text-base"
                    value={price} onChange={(e) => setPrice(Number(e.target.value))}
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Asset URL</label>
                  <input 
                    type="url" placeholder="https://..."
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-emerald-600 dark:text-emerald-400 text-[10px] truncate"
                    value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Logistic Brief</label>
                  <textarea
                    rows={2} placeholder="..."
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-slate-700 dark:text-slate-200 text-xs resize-none"
                    value={description} onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={closeModal} className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-500 font-black rounded-xl text-[9px] uppercase tracking-widest">Abort</button>
                <button type="submit" className="flex-[2] py-4 bg-emerald-600 text-white font-black rounded-xl text-[9px] uppercase tracking-widest shadow-xl shadow-emerald-200/50 dark:shadow-none hover:scale-105 transition-all">
                  {editingItem ? 'Authorize Update' : 'Initialize Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
