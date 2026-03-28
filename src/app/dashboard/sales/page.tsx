"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
  CheckCircle,
  Clock3,
  Download,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  unit?: string;
}

interface SaleItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
}

interface SaleRecord {
  id: string;
  items: SaleItem[];
  subtotal?: number;
  discountAmount?: number;
  totalAmount: number;
  farmerId?: string;
  farmerName?: string;
  processedBy?: string;
  type?: string;
  sourceAppointmentId?: string;
  createdAt?: { seconds?: number };
}

interface SaleFormItem {
  inventoryId: string;
  name: string;
  quantity: number;
  price: number;
}

interface ReceiptPreview {
  id: string;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  farmerName: string;
  date: Date;
}

type ReceiptLayout = "normal" | "thermal";

const defaultForm = {
  farmerName: "",
  processedBy: "",
  type: "POS Sale",
  discountAmount: 0,
  items: [{ inventoryId: "", name: "", quantity: 1, price: 0 }] as SaleFormItem[],
};

export default function SalesPage() {
  const pageSizeOptions = [10, 20, 50];
  const { role, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [receiptLayout, setReceiptLayout] = useState<ReceiptLayout>("normal");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptPreview | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [clinicSettings, setClinicSettings] = useState({
    name: "Sanjivani Vet Care",
    logo: "",
    address: "",
  });

  useEffect(() => {
    setMounted(true);

    const unsubSales = onSnapshot(query(collection(db, "sales"), orderBy("createdAt", "desc")), (snap) => {
      setSales(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as SaleRecord)));
    });

    const unsubInventory = onSnapshot(query(collection(db, "inventory"), orderBy("name")), (snap) => {
      setInventory(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as InventoryItem)));
    });

    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if (snap.exists()) {
          const data = snap.data();
          setClinicSettings({
            name: data.clinicName || "Sanjivani Vet Care",
            logo: data.logoUrl || "",
            address: data.address || "",
          });
        }
      } catch (error) {
        console.error("Failed to load clinic settings", error);
      }
    };

    fetchSettings();

    return () => {
      unsubSales();
      unsubInventory();
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, dateFrom, dateTo, pageSize]);

  if (!mounted) return null;

  if (role === "doctor") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-600 mb-6 font-black italic">!</div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Access Restricted</h2>
        <p className="text-slate-500 text-sm max-w-xs font-medium">This module is available only to authorized administrative roles.</p>
        <Link href="/dashboard" className="mt-8 px-8 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Back to Dashboard</Link>
      </div>
    );
  }

  const getSaleDate = (sale: SaleRecord) => {
    if (sale.createdAt?.seconds) {
      return new Date(sale.createdAt.seconds * 1000);
    }
    return null;
  };

  const isManagedSale = (sale: SaleRecord) => !sale.sourceAppointmentId && sale.type !== "Prescription Fulfillment";

  const filteredSales = sales.filter((sale) => {
    const receiptId = sale.id.slice(-8).toUpperCase();
    const saleDate = getSaleDate(sale);
    const searchMatch = [receiptId, sale.farmerName || "", sale.processedBy || ""]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const typeMatch = typeFilter === "All" || (sale.type || "POS Sale") === typeFilter;

    let dateMatch = true;
    if (dateFrom && saleDate) {
      dateMatch = dateMatch && saleDate >= new Date(`${dateFrom}T00:00:00`);
    }
    if (dateTo && saleDate) {
      dateMatch = dateMatch && saleDate <= new Date(`${dateTo}T23:59:59`);
    }
    if ((dateFrom || dateTo) && !saleDate) {
      dateMatch = false;
    }

    return searchMatch && typeMatch && dateMatch;
  });

  const availableTypes = Array.from(new Set(["All", ...sales.map((sale) => sale.type || "POS Sale")]));
  const totalSalesAmount = filteredSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndexExclusive = startIndex + pageSize;
  const paginatedSales = filteredSales.slice(startIndex, endIndexExclusive);
  const pageStartDisplay = filteredSales.length === 0 ? 0 : startIndex + 1;
  const pageEndDisplay = Math.min(endIndexExclusive, filteredSales.length);

  const maxPageButtons = 5;
  const pageGroupStart = Math.floor((safeCurrentPage - 1) / maxPageButtons) * maxPageButtons + 1;
  const pageGroupEnd = Math.min(totalPages, pageGroupStart + maxPageButtons - 1);
  const visiblePages = Array.from({ length: pageGroupEnd - pageGroupStart + 1 }, (_, index) => pageGroupStart + index);

  const openReceipt = (sale: SaleRecord) => {
    const subtotal = Number(
      sale.subtotal ?? sale.items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0)
    );
    const discountAmount = Number(sale.discountAmount ?? Math.max(0, subtotal - Number(sale.totalAmount || 0)));
    setReceiptLayout("normal");
    setSelectedReceipt({
      id: sale.id,
      items: sale.items || [],
      subtotal,
      discountAmount,
      total: Number(sale.totalAmount || 0),
      farmerName: sale.farmerName || "Guest",
      date: getSaleDate(sale) || new Date(),
    });
  };

  const resetForm = () => {
    setForm({
      ...defaultForm,
      processedBy: user?.email || "",
      items: [{ inventoryId: "", name: "", quantity: 1, price: 0 }],
    });
    setEditingSaleId(null);
    setActionError("");
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (sale: SaleRecord) => {
    setEditingSaleId(sale.id);
    setForm({
      farmerName: sale.farmerName || "",
      processedBy: sale.processedBy || user?.email || "",
      type: sale.type || "POS Sale",
      discountAmount: Number(sale.discountAmount || 0),
      items: (sale.items || []).map((item) => ({
        inventoryId: item.id || "",
        name: item.name,
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
      })),
    });
    setActionError("");
    setShowForm(true);
  };

  const updateFormItem = (index: number, updates: Partial<SaleFormItem>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item)),
    }));
  };

  const selectInventoryItem = (index: number, inventoryId: string) => {
    const item = inventory.find((entry) => entry.id === inventoryId);
    updateFormItem(index, {
      inventoryId,
      name: item?.name || "",
      price: Number(item?.price || 0),
    });
  };

  const addFormItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { inventoryId: "", name: "", quantity: 1, price: 0 }],
    }));
  };

  const removeFormItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const formSubtotal = form.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const safeDiscountAmount = Math.min(formSubtotal, Math.max(0, Number(form.discountAmount || 0)));
  const formTotal = Math.max(0, formSubtotal - safeDiscountAmount);

  const buildPrintableHtml = () => {
    const rows = filteredSales
      .map((sale) => {
        const date = getSaleDate(sale)?.toLocaleString() || "Pending timestamp";
        const customer = sale.farmerName || "Guest";
        const type = sale.type || "POS Sale";
        const processedBy = sale.processedBy || "Unknown";
        return `<tr>
          <td>#${sale.id.slice(-8).toUpperCase()}</td>
          <td>${date}</td>
          <td>${customer}</td>
          <td>${type}</td>
          <td>${processedBy}</td>
          <td>₹${Number(sale.totalAmount || 0).toLocaleString()}</td>
        </tr>`;
      })
      .join("");

    return `
      <html>
        <head>
          <title>Sales Export</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 6px; }
            p { margin: 0 0 18px; color: #475569; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; font-size: 12px; text-align: left; }
            th { background: #f8fafc; text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; }
          </style>
        </head>
        <body>
          <h1>${clinicSettings.name} Sales Export</h1>
          <p>Entries: ${filteredSales.length} | Total: ₹${totalSalesAmount.toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Processed By</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;
  };

  const exportExcelCsv = () => {
    const lines = [
      ["Receipt ID", "Date", "Customer", "Type", "Processed By", "Items", "Total"],
      ...filteredSales.map((sale) => [
        `#${sale.id.slice(-8).toUpperCase()}`,
        getSaleDate(sale)?.toLocaleString() || "Pending timestamp",
        sale.farmerName || "Guest",
        sale.type || "POS Sale",
        sale.processedBy || "Unknown",
        (sale.items || []).map((item) => `${item.name} x${item.quantity}`).join(" | "),
        Number(sale.totalAmount || 0).toString(),
      ]),
    ];
    const csv = lines
      .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdfView = () => {
    const popup = window.open("", "_blank", "width=1000,height=700");
    if (!popup) return;
    popup.document.write(buildPrintableHtml());
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const buildSalePayload = () => {
    const cleanItems = form.items
      .filter((item) => item.inventoryId && item.name && Number(item.quantity) > 0)
      .map((item) => ({
        id: item.inventoryId,
        name: item.name,
        quantity: Number(item.quantity),
        price: Number(item.price),
      }));

    if (cleanItems.length === 0) {
      throw new Error("Add at least one valid item.");
    }

    const payload: Record<string, unknown> = {
      items: cleanItems,
      subtotal: cleanItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
      discountAmount: safeDiscountAmount,
      totalAmount: Math.max(0, cleanItems.reduce((sum, item) => sum + item.price * item.quantity, 0) - safeDiscountAmount),
      processedBy: form.processedBy.trim() || user?.email || "Unknown",
      type: form.type.trim() || "POS Sale",
      updatedAt: serverTimestamp(),
    };

    const farmerName = form.farmerName.trim();
    if (farmerName) {
      payload.farmerName = farmerName;
      payload.farmerId = farmerName;
    } else {
      payload.farmerName = "Guest";
      payload.farmerId = "Guest";
    }

    return payload;
  };

  const reconcileInventory = async (oldItems: SaleItem[], newItems: SaleItem[]) => {
    await runTransaction(db, async (transaction) => {
      const quantityMap = new Map<string, { oldQty: number; newQty: number }>();

      for (const item of oldItems) {
        if (!item.id) continue;
        const entry = quantityMap.get(item.id) || { oldQty: 0, newQty: 0 };
        entry.oldQty += Number(item.quantity) || 0;
        quantityMap.set(item.id, entry);
      }

      for (const item of newItems) {
        if (!item.id) continue;
        const entry = quantityMap.get(item.id) || { oldQty: 0, newQty: 0 };
        entry.newQty += Number(item.quantity) || 0;
        quantityMap.set(item.id, entry);
      }

      for (const [inventoryId, qty] of quantityMap.entries()) {
        const invRef = doc(db, "inventory", inventoryId);
        const invSnap = await transaction.get(invRef);
        if (!invSnap.exists()) {
          throw new Error("An inventory item linked to this sale no longer exists.");
        }
        const currentStock = Number(invSnap.data().stock || 0);
        const nextStock = currentStock + qty.oldQty - qty.newQty;
        if (nextStock < 0) {
          const name = String(invSnap.data().name || "item");
          throw new Error(`Insufficient stock for ${name}`);
        }
        transaction.update(invRef, { stock: nextStock });
      }

      if (editingSaleId) {
        const saleRef = doc(db, "sales", editingSaleId);
        transaction.update(saleRef, {
          ...buildSalePayload(),
        });
      } else {
        const saleRef = doc(collection(db, "sales"));
        transaction.set(saleRef, {
          ...buildSalePayload(),
          createdAt: serverTimestamp(),
        });
      }
    });
  };

  const handleSaveSale = async () => {
    if (role !== "admin" || isSaving) return;
    setIsSaving(true);
    setActionError("");

    try {
      const saleItems = form.items
        .filter((item) => item.inventoryId && item.name && Number(item.quantity) > 0)
        .map((item) => ({
          id: item.inventoryId,
          name: item.name,
          quantity: Number(item.quantity),
          price: Number(item.price),
        }));

      const previousItems = editingSaleId
        ? sales.find((sale) => sale.id === editingSaleId)?.items || []
        : [];

      await reconcileInventory(previousItems, saleItems);
      setShowForm(false);
      resetForm();
    } catch (error: any) {
      setActionError(error?.message || "Unable to save sale entry.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSale = async (sale: SaleRecord) => {
    if (role !== "admin" || !isManagedSale(sale)) return;
    if (!confirm(`Delete receipt #${sale.id.slice(-8).toUpperCase()}? Stock will be restored.`)) return;

    setActionError("");

    try {
      await runTransaction(db, async (transaction) => {
        for (const item of sale.items || []) {
          if (!item.id) continue;
          const invRef = doc(db, "inventory", item.id);
          const invSnap = await transaction.get(invRef);
          if (!invSnap.exists()) continue;
          const currentStock = Number(invSnap.data().stock || 0);
          transaction.update(invRef, { stock: currentStock + (Number(item.quantity) || 0) });
        }

        transaction.delete(doc(db, "sales", sale.id));
      });
    } catch (error: any) {
      setActionError(error?.message || "Unable to delete sale entry.");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Sales</h1>
          <p className="text-slate-500 font-medium">Dedicated POS registry with reprint, export, and admin controls.</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full xl:w-auto">
          <button onClick={exportExcelCsv} className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 shadow-sm inline-flex items-center justify-center gap-2">
            <Download size={14} /> Excel CSV
          </button>
          <button onClick={exportPdfView} className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 shadow-sm inline-flex items-center justify-center gap-2">
            <Printer size={14} /> PDF / Print
          </button>
          {role === "admin" && (
            <button onClick={openCreate} className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl inline-flex items-center justify-center gap-2">
              <Plus size={14} /> Add Sale Entry
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Filtered Entries</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{filteredSales.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Filtered Revenue</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">₹{totalSalesAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Managed By Admin</p>
          <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Create, edit, delete enabled for admin only</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr] gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by customer, receipt ID, or staff"
              className="w-full pl-11 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-bold"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-bold"
          >
            {availableTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-bold"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-bold"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Showing {pageStartDisplay}-{pageEndDisplay} of {filteredSales.length}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rows</label>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs font-black text-slate-700 dark:text-slate-200"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>

        {actionError && <p className="text-[10px] font-black uppercase tracking-widest text-red-500">{actionError}</p>}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {paginatedSales.map((sale) => {
            const saleDate = getSaleDate(sale);
            const managed = isManagedSale(sale);
            return (
              <div key={sale.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-black text-slate-900 dark:text-white">#{sale.id.slice(-8).toUpperCase()}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                      <Clock3 size={12} /> {saleDate ? saleDate.toLocaleString() : "Pending timestamp"}
                    </p>
                  </div>
                  <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${managed ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                    {sale.type || "POS Sale"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Customer</p>
                    <p className="font-black text-slate-900 dark:text-white truncate">{sale.farmerName || "Guest"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total</p>
                    <p className="font-black text-slate-900 dark:text-white">₹{Number(sale.totalAmount || 0).toLocaleString()}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Processed By</p>
                    <p className="font-black text-slate-600 dark:text-slate-300 truncate">{sale.processedBy || "Unknown"}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  <button onClick={() => openReceipt(sale)} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2">
                    <Printer size={13} /> Reprint
                  </button>
                  {role === "admin" && managed && (
                    <>
                      <button onClick={() => openEdit(sale)} className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-200 inline-flex items-center gap-2">
                        <Pencil size={13} /> Edit
                      </button>
                      <button onClick={() => handleDeleteSale(sale)} className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-[10px] font-black uppercase tracking-widest text-red-600 inline-flex items-center gap-2">
                        <Trash2 size={13} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {paginatedSales.length === 0 && (
            <div className="p-10 text-center">
              <Receipt size={36} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">No sales entries match the current filters</p>
            </div>
          )}
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[1.1fr_1fr_0.9fr_0.8fr_0.8fr_1.2fr] gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>Receipt</span>
              <span>Customer</span>
              <span>Type</span>
              <span>Processed By</span>
              <span>Total</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedSales.map((sale) => {
              const saleDate = getSaleDate(sale);
              const managed = isManagedSale(sale);
              return (
                <div key={sale.id} className="grid grid-cols-[1.1fr_1fr_0.9fr_0.8fr_0.8fr_1.2fr] gap-4 items-center px-6 py-5">
                  <div>
                    <p className="text-base font-black text-slate-900 dark:text-white">#{sale.id.slice(-8).toUpperCase()}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                      <Clock3 size={12} /> {saleDate ? saleDate.toLocaleString() : "Pending timestamp"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">{sale.farmerName || "Guest"}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                      <User size={12} /> {(sale.items || []).length} item(s)
                    </p>
                  </div>

                  <div>
                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${managed ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                      {sale.type || "POS Sale"}
                    </span>
                  </div>

                  <div className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wide truncate">
                    {sale.processedBy || "Unknown"}
                  </div>

                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    ₹{Number(sale.totalAmount || 0).toLocaleString()}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openReceipt(sale)} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2">
                      <Printer size={13} /> Reprint
                    </button>
                    {role === "admin" && managed && (
                      <>
                        <button onClick={() => openEdit(sale)} className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-200 inline-flex items-center gap-2">
                          <Pencil size={13} /> Edit
                        </button>
                        <button onClick={() => handleDeleteSale(sale)} className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-[10px] font-black uppercase tracking-widest text-red-600 inline-flex items-center gap-2">
                          <Trash2 size={13} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {paginatedSales.length === 0 && (
              <div className="p-16 text-center">
                <Receipt size={42} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">No sales entries match the current filters</p>
              </div>
            )}
            </div>
          </div>
        </div>

        {filteredSales.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Page {safeCurrentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safeCurrentPage === 1}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-200 disabled:opacity-40"
              >
                Prev
              </button>

              {visiblePages.map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`w-9 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest ${pageNumber === safeCurrentPage ? "bg-slate-900 text-white" : "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200"}`}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={safeCurrentPage === totalPages}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-slate-950/50 backdrop-blur-sm p-4 sm:p-8 overflow-y-auto">
            <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{editingSaleId ? "Edit Sale Entry" : "Add Sale Entry"}</h2>
                  <p className="text-slate-500 font-medium">Inventory will be reconciled automatically when this entry is saved.</p>
                </div>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-500">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={form.farmerName}
                    onChange={(event) => setForm((prev) => ({ ...prev, farmerName: event.target.value }))}
                    placeholder="Customer name"
                    className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-bold"
                  />
                  <input
                    type="text"
                    value={form.processedBy}
                    onChange={(event) => setForm((prev) => ({ ...prev, processedBy: event.target.value }))}
                    placeholder="Processed by"
                    className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-bold"
                  />
                  <input
                    type="text"
                    value={form.type}
                    onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                    placeholder="Sale type"
                    className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-bold"
                  />
                </div>

                <div className="space-y-4">
                  {form.items.map((item, index) => {
                    const linkedInventory = inventory.find((entry) => entry.id === item.inventoryId);
                    return (
                      <div key={`${item.inventoryId}-${index}`} className="grid grid-cols-1 lg:grid-cols-[1.5fr_0.8fr_0.8fr_auto] gap-4 items-start bg-slate-50 dark:bg-slate-950/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4">
                        <div className="space-y-2">
                          <select
                            value={item.inventoryId}
                            onChange={(event) => selectInventoryItem(index, event.target.value)}
                            className="w-full px-4 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm font-bold"
                          >
                            <option value="">Select inventory item</option>
                            {inventory.map((inventoryItem) => (
                              <option key={inventoryItem.id} value={inventoryItem.id}>
                                {inventoryItem.name} ({inventoryItem.stock} {inventoryItem.unit || "units"})
                              </option>
                            ))}
                          </select>
                          {linkedInventory && (
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available stock: {linkedInventory.stock} {linkedInventory.unit || "units"}</p>
                          )}
                        </div>

                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(event) => updateFormItem(index, { quantity: Number(event.target.value) || 1 })}
                          className="w-full px-4 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm font-bold"
                          placeholder="Qty"
                        />

                        <input
                          type="number"
                          min={0}
                          value={item.price}
                          onChange={(event) => updateFormItem(index, { price: Number(event.target.value) || 0 })}
                          className="w-full px-4 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm font-bold"
                          placeholder="Price"
                        />

                        <button
                          onClick={() => removeFormItem(index)}
                          disabled={form.items.length === 1}
                          className="h-[54px] px-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-red-600 disabled:opacity-40"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}

                  <button onClick={addFormItem} className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 inline-flex items-center gap-2">
                    <Plus size={14} /> Add Item Row
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Subtotal</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">₹{formSubtotal.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Discount</p>
                    <input
                      type="number"
                      min={0}
                      max={formSubtotal}
                      value={form.discountAmount}
                      onChange={(event) => setForm((prev) => ({ ...prev, discountAmount: Number(event.target.value) || 0 }))}
                      className="w-full bg-transparent text-2xl font-black text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/40 p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Total</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">₹{formTotal.toLocaleString()}</p>
                  </div>
                </div>

                {actionError && <p className="text-[10px] font-black uppercase tracking-widest text-red-500">{actionError}</p>}
              </div>

              <div className="p-6 sm:p-8 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button onClick={() => { setShowForm(false); resetForm(); }} className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Cancel</button>
                <button onClick={handleSaveSale} disabled={isSaving} className="px-5 py-3 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50">
                  {isSaving ? "Saving..." : editingSaleId ? "Update Sale" : "Create Sale"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md receipt-modal-container">
            <style jsx global>{`
              @media print {
                @page {
                  margin: 6mm;
                }

                body * {
                  visibility: hidden !important;
                }

                .receipt-modal-container,
                .receipt-modal-container * {
                  visibility: visible !important;
                }

                .receipt-modal-container {
                  position: fixed !important;
                  inset: 0 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white !important;
                  align-items: flex-start !important;
                  justify-content: center !important;
                }

                .receipt-paper {
                  margin: 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                  border-radius: 0 !important;
                  background: white !important;
                }

                .receipt-paper--normal {
                  width: 190mm !important;
                  max-width: 190mm !important;
                  padding: 10mm !important;
                }

                .receipt-paper--thermal {
                  width: 78mm !important;
                  max-width: 78mm !important;
                  padding: 3mm !important;
                }

                .print-hide {
                  display: none !important;
                }
              }
            `}</style>

            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`bg-white p-8 rounded-[2.5rem] w-full shadow-2xl overflow-hidden receipt-paper ${receiptLayout === "thermal" ? "max-w-[320px] receipt-paper--thermal" : "max-w-xl receipt-paper--normal"}`}>
              <div className="flex items-center justify-between gap-4 mb-5 p-3 rounded-2xl border border-slate-100 bg-slate-50 print-hide">
                <div className="flex-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Print Layout</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setReceiptLayout("normal")} className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${receiptLayout === "normal" ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                      Normal
                    </button>
                    <button onClick={() => setReceiptLayout("thermal")} className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${receiptLayout === "thermal" ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                      Thermal
                    </button>
                  </div>
                </div>
                <button onClick={() => setSelectedReceipt(null)} className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className={`text-center ${receiptLayout === "thermal" ? "mb-4" : "mb-6"}`}>
                {clinicSettings.logo ? (
                  <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-3 shadow-lg border border-slate-100">
                    <img src={clinicSettings.logo} alt="Clinic Logo" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-emerald-500/20">
                    <CheckCircle size={28} />
                  </div>
                )}
                <h2 className="text-xl font-black italic tracking-tighter text-slate-900 uppercase">
                  {clinicSettings.name.split(" ").map((word, index) => (
                    <span key={index} className={index === 1 ? "text-emerald-500" : ""}>{word} </span>
                  ))}
                </h2>
                {clinicSettings.address && <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1 max-w-[200px] mx-auto leading-relaxed">{clinicSettings.address}</p>}
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 pt-2 border-t border-slate-50">Official Clinical Receipt</p>
              </div>

              <div className={`space-y-1 border-t border-b border-dashed border-slate-200 text-left ${receiptLayout === "thermal" ? "mb-4 py-3" : "mb-6 py-4"}`}>
                <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                  <span>TRANS ID:</span>
                  <span className="text-slate-900">#{selectedReceipt.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 gap-4">
                  <span>DATE:</span>
                  <span className="text-slate-900 text-right">{selectedReceipt.date.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 gap-4">
                  <span>CUSTOMER:</span>
                  <span className="text-slate-900 text-right truncate max-w-[140px]">{selectedReceipt.farmerName}</span>
                </div>
              </div>

              <div className={`w-full ${receiptLayout === "thermal" ? "mb-4" : "mb-6"}`}>
                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-50">
                  <span className="w-1/2 text-left">Article</span>
                  <span className="w-1/4 text-center">Qty</span>
                  <span className="w-1/4 text-right">Total</span>
                </div>
                <div className="space-y-3">
                  {selectedReceipt.items.map((item, index) => (
                    <div key={`${selectedReceipt.id}-${index}`} className="flex justify-between text-[11px] font-bold text-slate-700 gap-2">
                      <span className="w-1/2 text-left truncate uppercase italic">{item.name}</span>
                      <span className="w-1/4 text-center">x{item.quantity}</span>
                      <span className="w-1/4 text-right">₹{((Number(item.price) || 0) * (Number(item.quantity) || 0)).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`bg-slate-50 border border-slate-100 space-y-2 ${receiptLayout === "thermal" ? "rounded-2xl p-3 mb-5" : "rounded-3xl p-5 mb-8"}`}>
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                  <span>SUBTOTAL</span>
                  <span>₹{selectedReceipt.subtotal.toLocaleString()}</span>
                </div>
                {selectedReceipt.discountAmount > 0 && (
                  <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase">
                    <span>DISCOUNT</span>
                    <span>-₹{selectedReceipt.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-900 uppercase">GRAND TOTAL</span>
                  <span className="text-2xl font-black text-emerald-600 italic">₹{selectedReceipt.total.toLocaleString()}</span>
                </div>
              </div>

              <div className={`text-center ${receiptLayout === "thermal" ? "mb-5" : "mb-8"}`}>
                <p className="text-[10px] font-black text-slate-900 italic uppercase tracking-tighter">Thank you for visiting Sanjivani!</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">This is a system generated medical invoice</p>
              </div>

              <div className="space-y-2 print-hide">
                <button onClick={() => window.print()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">Print Receipt</button>
                <button onClick={() => setSelectedReceipt(null)} className="w-full py-4 text-slate-400 font-black text-[9px] uppercase hover:text-slate-900 transition-colors">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}