/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useInventory } from '../useInventory';
import { translations } from '../i18n';
import { motion } from 'motion/react';
import { TrendingUp, Package, AlertCircle, PieChart, BarChart3 } from 'lucide-react';

export function ReportsPage() {
  const { lang, inventory, config } = useInventory();
  const t = translations[lang];

  const totalItems = inventory.reduce((acc, item) => acc + item.qty, 0);
  const totalValue = inventory.reduce((acc, item) => acc + (Number(item.sell) * item.qty), 0);
  const totalCost = inventory.reduce((acc, item) => acc + (Number(item.cost) * item.qty), 0);
  const lowStockItems = inventory.filter(item => item.qty <= config.lowStockThreshold);

  const lensCount = inventory.filter(i => i.type === 'lens').reduce((acc, i) => acc + i.qty, 0);
  const frameCount = inventory.filter(i => i.type === 'frame').reduce((acc, i) => acc + i.qty, 0);

  const stats = [
    { label: t.dash_items, value: totalItems, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t.dash_total_val, value: `${totalValue.toLocaleString()} ${config.currency}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: t.low_stock_warn, value: lowStockItems.length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-4 pb-10">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h1 className="text-xl font-black text-blue-900 dark:text-blue-400 tracking-tight flex items-center gap-2">
          <BarChart3 size={24} />
          {lang === 'ar' ? 'تقارير المخزون' : 'Inventory Reports'}
        </h1>
        <p className="text-slate-500 text-xs mt-1">{new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4"
          >
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-black dark:text-white leading-tight">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-base font-black text-blue-900 dark:text-blue-400 mb-4 border-s-4 border-blue-800 ps-3 uppercase tracking-tight flex items-center gap-2">
          <PieChart size={18} />
          {lang === 'ar' ? 'توزيع المخزون' : 'Stock Distribution'}
        </h2>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-400">{t.filter_lens}</span>
              <span className="text-blue-800 dark:text-blue-400">{lensCount} ({totalItems > 0 ? Math.round((lensCount/totalItems)*100) : 0}%)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-500" 
                style={{ width: `${totalItems > 0 ? (lensCount/totalItems)*100 : 0}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-400">{t.filter_frame}</span>
              <span className="text-emerald-700 dark:text-emerald-400">{frameCount} ({totalItems > 0 ? Math.round((frameCount/totalItems)*100) : 0}%)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-600 transition-all duration-500" 
                style={{ width: `${totalItems > 0 ? (frameCount/totalItems)*100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{lang === 'ar' ? 'إجمالي التكلفة' : 'Total Cost'}</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">{totalCost.toLocaleString()} {config.currency}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{lang === 'ar' ? 'الربح المتوقع' : 'Expected Profit'}</p>
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{(totalValue - totalCost).toLocaleString()} {config.currency}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
