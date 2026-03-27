"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  orderBy, 
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
  CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
}

interface Farmer {
  uid: string;
  name: string;
  phone: string;
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
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showReceipt, setShowReceipt] = useState<{ id: string; items: CartItem[]; total: number; date: any } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubInv = onSnapshot(query(collection(db, "inventory"), orderBy("name")), (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
    });
    const unsubFarmers = onSnapshot(query(collection(db, "farmers"), orderBy("name")), (snap) => {
      setFarmers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as any)));
    });
    return () => { unsubInv(); unsubFarmers(); };
  }, []);

  if (!mounted) return null;

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
      const saleRef = await addDoc(collection(db, "sales"), saleData);
      for (const item of cart) {
        await updateDoc(doc(db, "inventory", item.id), { stock: increment(-item.quantity) });
      }
      setShowReceipt({ id: saleRef.id, items: [...cart], total: cartTotal, date: new Date() });
      setCart([]);
      setSelectedFarmer(null);
      setIsAnonymous(true);
      setIsCartOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const filteredFarmers = farmers.filter(f => f.name.toLowerCase().includes(farmerSearch.toLowerCase()) || f.phone.includes(farmerSearch));

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-120px)] gap-6 relative">
      {/* Left: Product Selection Hub */}
      <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" placeholder="Search products..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl font-bold text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-32 lg:pb-10">
            {filteredItems.map(item => (
              <motion.button
                key={item.id} onClick={() => addToCart(item)} disabled={item.stock <= 0}
                className={`flex flex-col text-left bg-white dark:bg-slate-900 p-5 rounded-3xl border transition-all relative ${
                  item.stock <= 0 ? "opacity-50 border-slate-100" : "border-slate-100 dark:border-slate-800 hover:border-emerald-500 hover:shadow-lg"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-2xl bg-emerald-500/5 text-emerald-500"><ShoppingCart size={20} /></div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase">₹{item.price}</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">₹{item.price}</p>
                  </div>
                </div>
                <h3 className="font-black text-slate-900 dark:text-white uppercase truncate text-sm">{item.name}</h3>
                <span className="text-[8px] font-black text-slate-400 mt-2 uppercase">{item.stock} {item.unit} available</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Cart & Checkout Hub (Responsive Drawer) */}
      <AnimatePresence>
        {(isCartOpen || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="fixed lg:static inset-0 z-[100] lg:z-auto w-full lg:w-96 flex flex-col bg-white dark:bg-slate-900 lg:rounded-3xl border-l lg:border border-slate-100 dark:border-slate-800 shadow-3xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white italic flex items-center gap-2">
                  <CreditCard className="text-emerald-500" size={24} /> CHECKOUT
                </h2>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="lg:hidden p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl"><X size={20} /></button>
            </div>

            <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-50">
               <div className="flex items-center gap-2 mb-4">
                 <button onClick={() => setIsAnonymous(true)} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase ${isAnonymous ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Guest</button>
                 <button onClick={() => setIsAnonymous(false)} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase ${!isAnonymous ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Farmer</button>
               </div>
               {!isAnonymous && (
                 <div className="relative">
                   <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                   <input 
                     type="text" placeholder="Search farmers..." value={farmerSearch}
                     onChange={(e) => setFarmerSearch(e.target.value)}
                     className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border-none rounded-xl text-xs font-bold"
                   />
                   {selectedFarmer && (
                     <div className="mt-2 p-2 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] flex justify-between">
                       <span>{selectedFarmer.name}</span>
                       <button onClick={() => setSelectedFarmer(null)}><X size={10}/></button>
                     </div>
                   )}
                   {!selectedFarmer && farmerSearch && (
                     <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 rounded-xl shadow-xl z-10 p-2 max-h-32 overflow-y-auto">
                       {filteredFarmers.map(f => (
                         <button key={f.uid} onClick={() => {setSelectedFarmer(f); setFarmerSearch("");}} className="w-full p-2 hover:bg-slate-50 text-[10px] text-left">{f.name}</button>
                       ))}
                     </div>
                   )}
                 </div>
               )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-2xl">
                  <div className="flex-1">
                    <h4 className="text-[10px] font-black uppercase truncate">{item.name}</h4>
                    <p className="text-[9px] font-bold text-slate-400">₹{item.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.id, -1)}><Minus size={12}/></button>
                    <span className="text-[10px] font-black">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}><Plus size={12}/></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 bg-slate-50 dark:bg-slate-950 border-t border-slate-100">
               <div className="flex justify-between items-end mb-6">
                 <p className="text-[10px] font-black text-slate-400 uppercase">Total</p>
                 <p className="text-2xl font-black text-emerald-600 italic">₹{cartTotal}</p>
               </div>
               <button 
                 onClick={handleCheckout}
                 disabled={cart.length === 0 || isCheckingOut || (!isAnonymous && !selectedFarmer)}
                 className="w-full h-16 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 disabled:opacity-50"
               >
                 {isCheckingOut ? "Processing..." : "Finalize Transaction"}
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Floating Hub */}
      <div className="lg:hidden fixed bottom-6 left-6 right-6 z-50">
        <button 
          onClick={() => setIsCartOpen(true)}
          className="w-full bg-slate-900 text-white h-16 rounded-3xl shadow-2xl flex items-center justify-between px-8"
        >
          <div className="flex items-center gap-3">
            <ShoppingCart size={24} />
            <span className="text-[10px] font-black uppercase tracking-widest">Cart Hub ({cart.length})</span>
          </div>
          <p className="font-black italic">₹{cartTotal}</p>
        </button>
      </div>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[2.5rem] w-full max-w-sm text-center">
               <CheckCircle className="mx-auto text-emerald-500 mb-4" size={48} />
               <h3 className="text-xl font-black italic mb-6">SALE AUTHENTICATED</h3>
               <div className="text-left py-4 border-t border-b border-dashed border-slate-200 mb-6 space-y-2">
                  {showReceipt.items.map(i => (
                    <div key={i.id} className="flex justify-between text-[10px] font-bold">
                      <span>{i.name} x {i.quantity}</span>
                      <span>₹{i.price * i.quantity}</span>
                    </div>
                  ))}
                  <div className="pt-4 flex justify-between font-black text-lg text-emerald-600">
                    <span>TOTAL</span>
                    <span>₹{showReceipt.total}</span>
                  </div>
               </div>
               <button onClick={() => window.print()} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase mb-2">Print Receipt</button>
               <button onClick={() => setShowReceipt(null)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase">Dismiss</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
