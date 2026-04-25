'use client';

import React from 'react';
import { Shield, User, Building, Calendar, DollarSign, FileText } from 'lucide-react';

interface PayrollReceiptProps {
  receipt: any;
  company: any;
}

export default function PayrollReceipt({ receipt, company }: PayrollReceiptProps) {
  if (!receipt) return null;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="receipt-container bg-white text-slate-800 p-8 shadow-xl max-w-4xl mx-auto border border-slate-200 rounded-lg my-8 print:shadow-none print:border-none print:m-0 print:p-0">
      {/* HEADER CFDI STYLE */}
      <div className="flex justify-between items-start mb-8 border-b pb-6">
        <div className="flex gap-4 items-center">
          <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center text-slate-400">
             <Building size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight">{company?.name || 'JNCONTA SOLUTIONS'}</h2>
            <p className="text-xs text-slate-500 font-mono">RFC: {company?.rfc || 'XAXX010101000'}</p>
            <p className="text-[10px] text-slate-400">Régimen Fiscal: 601 - General de Ley Personas Morales</p>
          </div>
        </div>
        <div className="text-right">
          <span className="badge-cfdi bg-slate-900 text-white text-[10px] px-2 py-1 rounded font-bold">RECIBO DE NÓMINA CFDI 4.0</span>
          <p className="text-xs font-bold mt-2">Folio Interno: {receipt.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-[10px] text-slate-400">Fecha de Emisión: {formatDate(receipt.paymentDate)}</p>
        </div>
      </div>

      {/* DATA GRID */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase text-slate-400 border-b pb-1 flex items-center gap-2">
            <User size={12} /> DATOS DEL EMPLEADO
          </h3>
          <div className="text-sm">
            <p className="font-bold">{receipt.employee?.name} {receipt.employee?.lastName}</p>
            <p className="text-xs text-slate-500">RFC: {receipt.employee?.rfc || 'N/A'}</p>
            <p className="text-xs text-slate-500">CURP: {receipt.employee?.curp || 'N/A'}</p>
            <p className="text-xs text-slate-500">NSS: {receipt.employee?.nss || 'N/A'}</p>
            <p className="text-xs text-slate-500 mt-1">Puesto: <span className="text-slate-700">{receipt.employee?.position}</span></p>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase text-slate-400 border-b pb-1 flex items-center gap-2">
            <Calendar size={12} /> DETALLES DEL PERIODO
          </h3>
          <div className="text-sm grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase font-mono">Inicio Periodo</p>
              <p className="text-xs">{formatDate(receipt.startDate)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase font-mono">Fin Periodo</p>
              <p className="text-xs">{formatDate(receipt.endDate)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase font-mono">Días Pagados</p>
              <p className="text-xs">30.00</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase font-mono">Tipo Nómina</p>
              <p className="text-xs">Ordinaria (O)</p>
            </div>
          </div>
        </div>
      </div>

      {/* PERCEPTIONS & DEDUCTIONS TABLE */}
      <div className="grid grid-cols-2 gap-x-12 mb-8 items-start">
        {/* PERCEPCIONES */}
        <div className="border border-slate-200 rounded overflow-hidden">
          <div className="bg-slate-50 p-2 text-[10px] font-bold text-slate-500 flex justify-between uppercase">
            <span>Percepciones</span>
            <span>Importe</span>
          </div>
          <div className="p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">001 Sueldo</span>
              <span className="font-mono">${receipt.baseSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">038 Otros</span>
              <span className="font-mono">$0.00</span>
            </div>
            <div className="h-20" /> {/* Spacer */}
          </div>
          <div className="bg-slate-100 p-2 text-xs font-bold flex justify-between border-t border-slate-200">
            <span>Total Percepciones</span>
            <span className="font-mono">${receipt.totalPerceptions.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
        </div>

        {/* DEDUCCIONES */}
        <div className="border border-slate-200 rounded overflow-hidden">
          <div className="bg-slate-50 p-2 text-[10px] font-bold text-slate-500 flex justify-between uppercase">
            <span>Deducciones</span>
            <span>Importe</span>
          </div>
          <div className="p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">001 Seg. Social</span>
              <span className="font-mono">${receipt.imssEmployee.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">002 ISR</span>
              <span className="font-mono">${receipt.isr.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="h-20" /> {/* Spacer */}
          </div>
          <div className="bg-slate-100 p-2 text-xs font-bold flex justify-between border-t border-slate-200">
            <span>Total Deducciones</span>
            <span className="font-mono">${receipt.totalDeductions.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
        </div>
      </div>

      {/* TOTAL NETO */}
      <div className="flex justify-end mb-12">
        <div className="bg-slate-900 text-white p-6 rounded-lg w-64 text-right transform -rotate-1 shadow-lg print:rotate-0">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Neto a Recibir</p>
          <p className="text-3xl font-bold font-mono">${receipt.netPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* FOOTER / SELLO CFDI */}
      <div className="border-t pt-8 grid grid-cols-4 gap-6 items-center">
        <div className="col-span-1">
           <div className="w-24 h-24 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-[10px] text-slate-400 text-center p-2 uppercase font-bold">
             QR SAT<br/>DIGITAL CODE
           </div>
        </div>
        <div className="col-span-3 space-y-4">
           <div>
             <p className="text-[8px] font-bold text-slate-400 uppercase">Sello Digital del Emisor</p>
             <p className="text-[8px] text-slate-300 break-all font-mono">
               Xo+3S9v1W3k5eR8z2M9v1W3k5eR8z2Xo+3S9v1W3k5eR8z2M9v1W3k5eR8z2Xo+3S9v1W3k5eR8z2M9v1W3k5eR8z2Xo+3S9v1W3k5eR8z2M9v1W3k5eR8z2
             </p>
           </div>
           <div className="flex justify-between items-end">
              <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase">Certificado SAT</p>
                <p className="text-[8px] text-slate-400">00001000000504204441</p>
              </div>
              <div className="text-right italic text-slate-400 text-[10px]">
                "Este documento es una representación impresa de un CFDI"
              </div>
           </div>
        </div>
      </div>

      <style jsx>{`
        @media print {
          .receipt-container {
            width: 100% !important;
            max-width: none !important;
          }
          body * {
            visibility: hidden;
          }
          .receipt-container, .receipt-container * {
            visibility: visible;
          }
          .receipt-container {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
