/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useInventory } from '../useInventory';
import { translations } from '../i18n';
import { Sparkles } from 'lucide-react';

export function UpdatesPage() {
  const { lang } = useInventory();
  const t = translations[lang];

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-black text-blue-900 dark:text-blue-400 mb-6 flex items-center gap-2 border-s-4 border-blue-800 ps-3">
          <Sparkles size={24} />
          {t.u_title}
        </h2>
        
        <div 
          className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl text-sm leading-relaxed text-slate-800 dark:text-slate-200" 
          dangerouslySetInnerHTML={{ __html: t.updates_html }} 
        />

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400">Developed by <b>Abdulaziz Sindi</b></p>
          <p className="text-[10px] text-slate-300 mt-1">© 2026 NOOR GLASS System</p>
        </div>
      </div>
    </div>
  );
}
