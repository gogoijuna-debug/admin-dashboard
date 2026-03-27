"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  orderBy, 
  where, 
  serverTimestamp,
  increment 
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { 
  Search, 
  ShoppingCart, 
  User, 
  Trash2, 
  Plus, 
  Minus, 
  Printer, 
  X, 
  CheckCircle,
  Package,
  ShieldCheck,
  CreditCard,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  imageUrl?: string;
}

interface Farmer {
  uid: string;
  name: string;
  phone: string;
  village?: string;
}

interface CartItem extends InventoryItem {
  quantity: number;
}

export default function ShopPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [search, setSearch] = useState("");
  const [farmerSearch, setFarmerSearch] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showReceipt, setShowReceipt] = useState<{ id: string; items: CartItem[]; total: number; date: any } | null>(null);

  useEffect(() => {
    // Sync Inventory
    const unsubInv = onSnapshot(query(collection(db, "inventory"), orderBy("name")), (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
      setLoading(false);
    });

    // Sync Farmers for tracking (from the professional CRM)
    const unsubFarmers = onSnapshot(query(collection(db, "farmers"), orderBy("name")), (snap) => {
      setFarmers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as any)));
    });

    return () => { unsubInv(); unsubFarmers(); };
  }, []);

  const addToCart = (item: InventoryItem) => {
    if (item.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        if (existing.quantity >= item.stock) return prev;
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(0, i.quantity + delta);
        if (newQty > i.stock) return i;
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const cartTotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || isCheckingOut) return;
    setIsCheckingOut(true);

    try {
      const saleData = {
        items: cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })),
        totalAmount: cartTotal,
        farmerId: isAnonymous ? "Guest" : selectedFarmer?.uid,
        farmerName: isAnonymous ? "Anonymous Guest" : selectedFarmer?.name,
        processedBy: user?.email,
        createdAt: serverTimestamp(),
      };

      // 1. Create Sale Document
      const saleRef = await addDoc(collection(db, "sales"), saleData);

      // 2. Batch Update Inventory (Simplified)
      for (const item of cart) {
        await updateDoc(doc(db, "inventory", item.id), {
          stock: increment(-item.quantity)
        });
      }

      setShowReceipt({ id: saleRef.id, items: [...cart], total: cartTotal, date: new Date() });
      setCart([]);
      setSelectedFarmer(null);
      setIsAnonymous(true);
    } catch (e) {
      console.error("Checkout Failed", e);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const filteredFarmers = farmers.filter(f => 
    f.name.toLowerCase().includes(farmerSearch.toLowerCase()) || 
    f.phone.includes(farmerSearch)
  );

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 overflow-hidden">
      {/* Left: Product Selection Hub */}
      <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Scan or search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex gap-2">
            <button className="p-4 bg-emerald-500/5 text-emerald-600 rounded-2xl border border-emerald-500/10">
              <Package size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
            {filteredItems.map(item => (
              <motion.button
                layout
                key={item.id}
                onClick={() => addToCart(item)}
                disabled={item.stock <= 0}
                className={`flex flex-col text-left bg-white dark:bg-slate-900 p-5 rounded-[2rem] border transition-all group relative overflow-hidden ${
                  item.stock <= 0 ? "opacity-50 grayscale border-slate-100" : "border-slate-100 dark:border-slate-800 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/5"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl ${item.category === 'Medicine' ? 'bg-blue-500/5 text-blue-500' : 'bg-purple-500/5 text-purple-500'}`}>
                    <ShoppingCart size={20} />
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Price / {item.unit}</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">₹{item.price}</p>
                  </div>
                </div>
                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm mb-1 truncate w-full">{item.name}</h3>
                <div className="flex items-center gap-2 mt-auto">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${item.stock <= 5 ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {item.stock} {item.unit} Left
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                </div>
                {item.stock > 0 && (
                  <div className="absolute top-4 right-4 bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={16} />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Cart & Checkout Hub */}
      <div className="w-96 flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-3xl overflow-hidden shrink-0">
        <div className="p-8 border-b border-slate-50 dark:border-slate-800">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter italic flex items-center gap-2">
            <CreditCard className="text-emerald-500" size={24} /> COMMAND CHECKOUT
          </h2>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Operational Sales Interface</p>
        </div>

        {/* Farmer Selection Flow */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-50 dark:border-slate-800">
           <div className="flex items-center justify-between mb-4">
             <button 
               onClick={() => setIsAnonymous(true)}
               className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${isAnonymous ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-lg' : 'text-slate-400'}`}
             >
               Anonymous
             </button>
             <button 
               onClick={() => setIsAnonymous(false)}
               className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${!isAnonymous ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-lg' : 'text-slate-400'}`}
             >
               Track Farmer
             </button>
           </div>

           {!isAnonymous && (
             <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
               <div className="relative">
                 <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                 <input 
                   type="text" 
                   placeholder="Search registered farmers..." 
                   value={farmerSearch}
                   onChange={(e) => setFarmerSearch(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border-none rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500/20"
                 />
               </div>
               {selectedFarmer ? (
                 <div className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tight italic">{selectedFarmer.name}</p>
                      <p className="text-[8px] font-bold text-emerald-500 opacity-70">{selectedFarmer.phone}</p>
                    </div>
                    <button onClick={() => setSelectedFarmer(null)} className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-600">
                      <X size={12} />
                    </button>
                 </div>
               ) : farmerSearch.length > 0 && (
                 <div className="max-h-32 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xl p-2 space-y-1">
                   {filteredFarmers.map(f => (
                     <button 
                       key={f.uid} 
                       onClick={() => { setSelectedFarmer(f); setFarmerSearch(""); }}
                       className="w-full flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-left"
                     >
                       <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate">{f.name}</span>
                       <span className="text-[8px] font-bold text-slate-400">{f.phone.slice(-4)}</span>
                     </button>
                   ))}
                 </div>
               )}
             </div>
           )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <ShoppingCart size={48} className="text-slate-400 mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">Cart is empty</p>
            </div>
          ) : (
            <AnimatePresence>
              {cart.map(item => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={item.id} 
                  className="flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-2xl border border-slate-50 dark:border-slate-800/50"
                >
                  <div className="flex-1">
                    <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight truncate w-32">{item.name}</h4>
                    <p className="text-[9px] font-bold text-slate-400">₹{item.price} / {item.unit}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-emerald-500"><Minus size={12} /></button>
                    <span className="text-[10px] font-black w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-emerald-500"><Plus size={12} /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Checkout Summary */}
        <div className="p-8 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 space-y-6">
           <div className="space-y-2">
              <div className="flex justify-between items-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</p>
                 <p className="text-[10px] font-black text-slate-900 dark:text-white lowercase tracking-widest italic">₹{cartTotal}</p>
              </div>
              <div className="flex justify-between items-center text-emerald-600 font-black">
                 <p className="text-[11px] uppercase tracking-tighter">Total Amount</p>
                 <p className="text-2xl tracking-tighter italic">₹{cartTotal}</p>
              </div>
           </div>

           <button 
             onClick={handleCheckout}
             disabled={cart.length === 0 || isCheckingOut || (!isAnonymous && !selectedFarmer)}
             className={`w-full h-16 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all duration-300 ${
               cart.length > 0 && (isAnonymous || selectedFarmer)
               ? "bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 active:scale-95 hover:-translate-y-1" 
               : "bg-slate-100 dark:bg-slate-800 text-slate-400"
             }`}
           >
             {isCheckingOut ? (
               <div className="flex items-center gap-3">
                  <Package className="animate-bounce" size={20} />
                  <span className="text-[11px] font-black uppercase tracking-widest">Processing Inventory...</span>
               </div>
             ) : (
               <>
                 <span className="text-[11px] font-black uppercase tracking-widest">Finalize Transaction</span>
                 <ShieldCheck size={20} />
               </>
             )}
           </button>
        </div>
      </div>

      {/* Receipt Preview Modal */}
      <AnimatePresence>
        {showReceipt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReceipt(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white text-slate-900 w-full max-w-md rounded-[3rem] shadow-3xl overflow-hidden relative z-10 print:static print:shadow-none print:w-full"
            >
               <div className="p-10 text-center space-y-6">
                 <div className="flex flex-col items-center">
                   <div className="w-16 h-16 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center text-emerald-600 mb-4">
                     <CheckCircle size={32} />
                   </div>
                   <h3 className="text-xl font-black tracking-tighter uppercase italic">Success Authenticated</h3>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Order Reference: {showReceipt.id}</p>
                 </div>

                 <div className="border-t border-b border-dashed border-slate-200 py-6 space-y-3">
                    {showReceipt.items.map(i => (
                      <div key={i.id} className="flex justify-between text-[11px] font-bold">
                        <span className="uppercase tracking-tight">{i.name} x {i.quantity}</span>
                        <span className="italic">₹{i.price * i.quantity}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-4 font-black border-t border-slate-100">
                      <span className="text-sm tracking-tighter">TOTAL AMOUNT</span>
                      <span className="text-lg italic">₹{showReceipt.total}</span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <button 
                      onClick={() => window.print()} 
                      className="w-full h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-colors hover:bg-slate-800"
                    >
                      <Printer size={16} /> Print Sales Receipt
                    </button>
                    <button 
                      onClick={() => setShowReceipt(null)}
                      className="w-full h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest transition-colors hover:bg-slate-200"
                    >
                      Dismiss Hub
                    </button>
                 </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
