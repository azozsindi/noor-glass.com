/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useInventory } from '../useInventory';
import { translations } from '../i18n';

export function NotesPage() {
  const { notes, setNotes, lang } = useInventory();
  const t = translations[lang];

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-4 border-s-4 border-blue-800 ps-3">{t.notes_title}</h2>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-[60vh] bg-transparent outline-none resize-none text-lg leading-relaxed text-slate-900 dark:text-white"
            placeholder="..."
          />
          <div className="text-start text-xs text-slate-400 mt-2">✅ {t.notes_desc}</div>
        </div>
      </div>
    </div>
  );
}
