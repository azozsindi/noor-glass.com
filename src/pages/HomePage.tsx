/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useInventory } from '../useInventory';
import { translations } from '../i18n';
import { motion } from 'motion/react';
import { Phone, MessageCircle, Table } from 'lucide-react';

export function HomePage() {
  const { lang, config } = useInventory();
  const t = translations[lang];

  const lastVisit = localStorage.getItem("noor_last_visit_time") || "First Visit";
  const loginTime = new Date().toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 text-center">
        <h1 className="text-2xl font-black text-blue-900 dark:text-blue-400 tracking-tight uppercase">{config.shopName}</h1>
        <p className="text-slate-500 font-medium mb-4 text-sm">{new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-1">
            <span className="text-slate-600 dark:text-slate-400 font-bold text-[11px] uppercase tracking-tighter">{t.current_login}</span>
            <span className="font-mono font-black text-emerald-800 dark:text-emerald-400 text-sm">{loginTime}</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-1">
            <span className="text-slate-600 dark:text-slate-400 font-bold text-[11px] uppercase tracking-tighter">{t.last_visit}</span>
            <span className="font-mono font-black text-red-800 dark:text-red-400 text-sm">{lastVisit}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-black text-blue-900 dark:text-blue-400 mb-4 border-s-4 border-blue-800 ps-3 uppercase tracking-tight">{t.contact_us}</h2>
          <div className="grid grid-cols-2 gap-2">
            <a href="tel:0547002821" className="p-4 bg-blue-900 text-white rounded-2xl text-center font-black flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform text-xs">
              <Phone size={18} /> Call
            </a>
            <a href="https://wa.me/966547002821" className="p-4 bg-emerald-600 text-white rounded-2xl text-center font-black flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform text-xs">
              <MessageCircle size={18} /> WhatsApp
            </a>
            <a href="https://docs.google.com/spreadsheets/d/1EMk7X4k60cguwVm2Jvks8WoIB7J9uEyvkcPdSqZwWlY/edit?usp=sharing" target="_blank" className="col-span-2 p-4 bg-emerald-800 text-white rounded-2xl text-center font-black flex items-center justify-center gap-2 active:scale-95 transition-transform text-xs">
              <Table size={18} /> Google Sheet
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
