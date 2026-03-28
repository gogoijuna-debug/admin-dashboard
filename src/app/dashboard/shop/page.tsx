"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  const { user, role } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [search, setSearch] = useState("");
  const [farmerSearch, setFarmerSearch] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showReceipt, setShowReceipt] = useState<{ id: string; items: CartItem[]; subtotal: number; discountAmount: number; total: number; farmerName: string; date: any } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("percent");
  const [discountValue, setDiscountValue] = useState(0);

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

  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const discountAmount = discountType === "percent" ? (subtotal * discountValue / 100) : discountValue;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleCheckout = async () => {
    if (cart.length === 0 || isCheckingOut) return;
    setIsCheckingOut(true);
    try {
      const saleData = {
         items: cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })),
        subtotal,
        discountAmount,
        totalAmount: finalTotal,
        discountInfo: { type: discountType, value: discountValue },
        farmerId: isAnonymous ? "Guest" : selectedFarmer?.uid,
        farmerName: isAnonymous ? "Anonymous Guest" : selectedFarmer?.name,
        processedBy: user?.email,
        createdAt: serverTimestamp(),
      };
      const saleRef = await addDoc(collection(db, "sales"), saleData);
      for (const item of cart) {
        await updateDoc(doc(db, "inventory", item.id), { stock: increment(-item.quantity) });
      }
      setShowReceipt({ 
        id: saleRef.id, 
        items: [...cart], 
        subtotal, 
        discountAmount, 
        total: finalTotal, 
        farmerName: isAnonymous ? "Guest" : selectedFarmer?.name || "Farmer",
        date: new Date() 
      });
      setCart([]);
      setSelectedFarmer(null);
      setIsAnonymous(true);
      setIsCartOpen(false);
      setDiscountValue(0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (role === "doctor") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-600 mb-6 font-black italic">!</div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-2">Operational Privacy</h2>
        <p className="text-slate-500 text-sm max-w-xs font-medium">The Retail Shop Hub is reserved for Managerial and Administrative roles. Clinical duties only beyond this point.</p>
        <Link href="/dashboard" className="mt-8 px-8 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Back to Clinical Protocol</Link>
      </div>
    );
  }

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const filteredFarmers = farmers.filter(f => f.name.toLowerCase().includes(farmerSearch.toLowerCase()) || f.phone.includes(farmerSearch));

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-120px)] gap-6 relative">
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
                    <p className="text-[9px] font-black text-slate-400 uppercase">Per {item.unit}</p>
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

      <AnimatePresence>
        {(isCartOpen || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
          <motion.div 
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            className="fixed lg:static inset-0 z-[100] lg:z-auto w-full lg:w-96 flex flex-col bg-white dark:bg-slate-900 lg:rounded-3xl border-l lg:border border-slate-100 dark:border-slate-800 shadow-3xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
              <div><h2 className="text-xl font-black italic flex items-center gap-2 text-slate-900 dark:text-white"><CreditCard className="text-emerald-500" size={24} /> CHECKOUT</h2></div>
              <button onClick={() => setIsCartOpen(false)} className="lg:hidden p-3 bg-slate-50 rounded-2xl"><X size={20} /></button>
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
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-950 rounded-2xl shadow-2xl z-20 p-2 max-h-48 overflow-y-auto border border-slate-100 dark:border-slate-800">
                        {filteredFarmers.map(f => (
                          <button 
                            key={f.uid} 
                            onClick={() => {setSelectedFarmer(f); setFarmerSearch("");}} 
                            className="w-full p-3 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 rounded-xl text-[10px] font-black uppercase text-left transition-all mb-1 last:mb-0"
                          >
                            {f.name}
                          </button>
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

            <div className="p-8 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
               <div className="space-y-3 mb-6">
                 <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                       <button onClick={() => setDiscountType("percent")} className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${discountType === "percent" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>%</button>
                       <button onClick={() => setDiscountType("fixed")} className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${discountType === "fixed" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>₹</button>
                    </div>
                    <input 
                      type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="w-20 text-right bg-transparent border-none font-black text-slate-900 dark:text-white"
                      placeholder="0"
                    />
                 </div>

                 <div className="flex justify-between items-center text-[10px] font-black text-slate-400 px-1 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                 </div>
                 {discountAmount > 0 && (
                   <div className="flex justify-between items-center text-[10px] font-black text-emerald-500 px-1 uppercase tracking-widest">
                      <span>Discount</span>
                      <span>-₹{discountAmount.toLocaleString()}</span>
                   </div>
                 )}
                 <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-end">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payable Total</p>
                   <p className="text-2xl font-black text-emerald-600 italic">₹{finalTotal.toLocaleString()}</p>
                 </div>
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

      <div className="lg:hidden fixed bottom-6 left-6 right-6 z-50">
        <button 
          onClick={() => setIsCartOpen(true)}
          className="w-full bg-slate-900 text-white h-16 rounded-3xl shadow-2xl flex items-center justify-between px-8"
        >
          <div className="flex items-center gap-3">
            <ShoppingCart size={24} />
            <span className="text-[10px] font-black uppercase tracking-widest">Cart ({cart.length})</span>
          </div>
          <p className="font-black italic">₹{finalTotal.toLocaleString()}</p>
        </button>
      </div>

      <AnimatePresence>
        {showReceipt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden">
               {/* Receipt Header */}
               <div className="text-center mb-6">
                 <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-emerald-500/20">
                   <CheckCircle size={28} />
                 </div>
                 <h2 className="text-xl font-black italic tracking-tighter text-slate-900 uppercase">Sanjivani <span className="text-emerald-500">Vet Care</span></h2>
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Official Clinical Receipt</p>
               </div>

               {/* Transaction Meta */}
               <div className="space-y-1 mb-6 border-t border-b border-dashed border-slate-200 py-4 text-left">
                  <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                    <span>TRANS ID:</span>
                    <span className="text-slate-900">#{showReceipt.id.slice(-8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                    <span>DATE:</span>
                    <span className="text-slate-900">{showReceipt.date.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                    <span>CUSTOMER:</span>
                    <span className="text-slate-900 truncate max-w-[120px]">{showReceipt.farmerName}</span>
                  </div>
               </div>

               {/* Standard Itemized Table */}
               <div className="w-full mb-6">
                  <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-50">
                    <span className="w-1/2 text-left">ARTICLE</span>
                    <span className="w-1/4 text-center">QTY</span>
                    <span className="w-1/4 text-right">TOTAL</span>
                  </div>
                  <div className="space-y-3">
                    {showReceipt.items.map((i, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] font-bold text-slate-700">
                        <span className="w-1/2 text-left truncate uppercase italic">{i.name}</span>
                        <span className="w-1/4 text-center">x{i.quantity}</span>
                        <span className="w-1/4 text-right">₹{(i.price * i.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
               </div>

               {/* Grand Breakdown */}
               <div className="bg-slate-50 rounded-3xl p-5 space-y-2 mb-8 border border-slate-100">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                    <span>SUBTOTAL</span>
                    <span>₹{showReceipt.subtotal.toLocaleString()}</span>
                  </div>
                  {showReceipt.discountAmount > 0 && (
                    <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase">
                      <span>DISCOUNT</span>
                      <span>-₹{showReceipt.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-end">
                    <span className="text-[10px] font-black text-slate-900 uppercase">GRAND TOTAL</span>
                    <span className="text-2xl font-black text-emerald-600 italic">₹{showReceipt.total.toLocaleString()}</span>
                  </div>
               </div>

               {/* Professional Footer */}
               <div className="text-center mb-8">
                 <p className="text-[10px] font-black text-slate-900 italic uppercase tracking-tighter">Thank you for visiting Sanjivani!</p>
                 <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">This is a system generated medical invoice</p>
               </div>

               <div className="space-y-2">
                 <button onClick={() => window.print()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">Download / Print Receipt</button>
                 <button onClick={() => setShowReceipt(null)} className="w-full py-4 text-slate-400 font-black text-[9px] uppercase hover:text-slate-900 transition-colors">Dismiss Hub</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
