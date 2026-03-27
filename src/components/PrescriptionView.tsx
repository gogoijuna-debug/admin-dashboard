"use client";

import React from "react";
import { Stethoscope, ShieldCheck, MapPin, Phone, Printer, X, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

interface PrescriptionItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  description?: string;
}

interface PrescriptionViewProps {
  farmerName: string;
  phoneNumber: string;
  doctorName: string;
  doctorQuals?: string;
  date: string;
  issue: string;
  medications: PrescriptionItem[];
  onClose: () => void;
}

export default function PrescriptionView({
  farmerName,
  phoneNumber,
  doctorName,
  doctorQuals,
  date,
  issue,
  medications,
  onClose
}: PrescriptionViewProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    let text = `*SANJIVANI VET CARE - Medical Protocol*\n\nRegarding: ${issue}\n`;
    if (medications && medications.length > 0) {
      text += `\n*Prescribed Medications:*\n`;
      medications.forEach((m, i) => {
        text += `${i + 1}. ${m.name} (${m.dosage}) - ${m.frequency} for ${m.duration}\n`;
      });
    }
    const message = encodeURIComponent(text);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-start justify-center p-4 sm:p-8 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible prescription-modal-container"
    >
      <style jsx global>{`
        @media print {
          /* Force hide everything on the page */
          body * {
            visibility: hidden !important;
          }
          /* Specifically show the prescription modal and its contents */
          .prescription-modal-container,
          .prescription-modal-container * {
            visibility: visible !important;
          }
          /* Position the container at the very top of the printed page */
          .prescription-modal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            display: block !important;
          }
          /* Hide the interactive UI buttons when printing */
          .print-hide {
            display: none !important;
            visibility: hidden !important;
          }
          /* Remove shadows and rounded corners for clean paper output */
          .prescription-card {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      <div className="bg-white text-slate-900 w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col mb-20 print:shadow-none print:rounded-none print:max-w-none print:block print:mb-0 prescription-card">
        {/* Header Controls */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center print-hide">
          <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-500">Clinical Output Preview</h2>
          <div className="flex gap-2">
            <button onClick={handleWhatsApp} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md hover:scale-105 transition-all">
              <MessageSquare size={14} /> WhatsApp Rx
            </button>
            <button onClick={handlePrint} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md hover:scale-105 transition-all">
              <Printer size={14} /> Print Protocol
            </button>
            <button onClick={onClose} className="p-2.5 bg-white text-slate-400 rounded-xl border border-slate-100 hover:text-red-500 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* The Actual Prescription View */}
        <div id="prescription-content" className="p-8 sm:p-12 space-y-8 sm:space-y-12 bg-white print:p-10">
          {/* Clinic Branding */}
          <div className="flex justify-between items-start border-b-4 border-emerald-500 pb-8">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tighter uppercase italic flex items-center gap-3">
                SANJIVANI <span className="text-slate-900">VET CARE</span>
              </h1>
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Excellence in Veterinary Logistics</p>
            </div>
            <div className="text-right space-y-1">
              <p className="flex items-center justify-end gap-2 text-[9px] sm:text-[10px] font-bold text-slate-600">
                <MapPin size={12} className="text-emerald-500" /> Golaghat, Assam, 785621
              </p>
              <p className="flex items-center justify-end gap-2 text-[9px] sm:text-[10px] font-bold text-slate-600">
                <Phone size={12} className="text-emerald-500" /> +91 94350 00000
              </p>
            </div>
          </div>

          {/* Patient & Doctor Info */}
          <div className="grid grid-cols-2 gap-4 sm:gap-8 py-4 px-4 sm:px-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="space-y-3">
              <div>
                <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest">Client Identity</p>
                <p className="text-[13px] sm:text-[15px] font-black text-slate-900 uppercase tracking-tight">{farmerName}</p>
                <p className="text-[8px] sm:text-[9px] font-bold text-slate-500">{phoneNumber}</p>
              </div>
              <div>
                <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest">Case Directive</p>
                <p className="text-[11px] sm:text-[12px] font-bold text-slate-700 italic">"{issue}"</p>
              </div>
            </div>
            <div className="space-y-3 text-right">
              <div>
                <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest">Authorized Physician</p>
                <p className="text-[13px] sm:text-[15px] font-black text-emerald-600 uppercase tracking-tight">Dr. {doctorName}</p>
                <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">{doctorQuals || "Veterinary Surgeon"}</p>
              </div>
              <div>
                <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest">Authorization Date</p>
                <p className="text-[11px] sm:text-[12px] font-black text-slate-900">{date}</p>
              </div>
            </div>
          </div>

          {/* Rx Icon */}
          <div className="text-4xl font-serif italic text-slate-800 border-b-2 border-slate-100 pb-2">Rx</div>

          {/* Medications Table */}
          <div className="space-y-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Medication / Protocol</th>
                  <th className="py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Dosage</th>
                  <th className="py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Frequency</th>
                  <th className="py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {medications.map(med => (
                  <tr key={med.id}>
                    <td className="py-4">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{med.name}</p>
                      {med.description && <p className="text-[10px] text-slate-500 font-bold italic mt-0.5 tracking-tight">"{med.description}"</p>}
                    </td>
                    <td className="py-4 text-center">
                      <p className="text-[11px] font-bold text-slate-600">{med.dosage || "As directed"}</p>
                    </td>
                    <td className="py-4 text-center">
                      <p className="text-[11px] font-bold text-slate-600 italic">{med.frequency || "1-0-1"}</p>
                    </td>
                    <td className="py-4 text-right">
                      <p className="text-[11px] font-black text-slate-900">{med.duration || "5 Days"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer / Seal */}
          <div className="pt-20 flex justify-between items-end">
             <div className="space-y-4">
               <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 w-fit">
                  <ShieldCheck className="text-emerald-500" size={32} />
                  <div>
                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Digital Seal of Care</p>
                    <p className="text-[8px] font-bold text-emerald-600">Sanjivani Verified Professional</p>
                  </div>
               </div>
               <p className="text-[8px] font-bold text-slate-400 max-w-xs leading-relaxed">
                 *This is a computer-generated digital prescription following tele-consultation protocol. No physical signature is required unless mandated by local regulation.
               </p>
             </div>
             <div className="text-center space-y-2 pb-2">
                <div className="w-48 h-[1px] bg-slate-200" />
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Authorized Signature</p>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
