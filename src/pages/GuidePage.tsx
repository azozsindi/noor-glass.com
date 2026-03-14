/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useInventory } from '../useInventory';
import { translations } from '../i18n';

export function GuidePage() {
  const { lang, config } = useInventory();
  const t = translations[lang];

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-4 border-s-4 border-amber-600 ps-3">{t.guide_title}</h2>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <div className="space-y-2">
            <b className="text-blue-800 dark:text-blue-400 block text-base">{t.gd_1_t}</b>
            <p className="text-slate-600 dark:text-slate-400">{t.gd_1_d}</p>
          </div>
          <div className="space-y-2">
            <b className="text-blue-800 dark:text-blue-400 block text-base">{t.gd_2_t}</b>
            <p className="text-slate-600 dark:text-slate-400">{t.gd_2_d}</p>
          </div>
          <div className="space-y-2">
            <b className="text-blue-800 dark:text-blue-400 block text-base">{t.gd_3_t}</b>
            <p className="text-slate-600 dark:text-slate-400">{t.gd_3_d}</p>
          </div>
          <div className="space-y-2">
            <b className="text-blue-800 dark:text-blue-400 block text-base">{t.gd_4_t}</b>
            <p className="text-slate-600 dark:text-slate-400">{t.gd_4_d}</p>
          </div>
          <div className="space-y-2">
            <b className="text-blue-800 dark:text-blue-400 block text-base">{t.gd_5_t}</b>
            <p className="text-slate-600 dark:text-slate-400">{t.gd_5_d}</p>
          </div>
          <div className="space-y-2">
            <b className="text-blue-800 dark:text-blue-400 block text-base">{(t as any).gd_6_t}</b>
            <p className="text-slate-600 dark:text-slate-400">{(t as any).gd_6_d}</p>
          </div>
          <div className="space-y-2">
            <b className="text-blue-800 dark:text-blue-400 block text-base">{(t as any).gd_7_t}</b>
            <p className="text-slate-600 dark:text-slate-400">{(t as any).gd_7_d}</p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <h3 className="font-bold text-blue-900 dark:text-blue-300">{t.h_anatomy}</h3>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono text-center">BCGM000000</div>
          
          <h3 className="font-bold text-blue-900 dark:text-blue-300">{t.h_anatomy_frame}</h3>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300 rounded-lg font-mono text-center">MEDPRADAGOLD</div>
        </div>

        <div className="mt-8">
          <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-3">{t.h_table}</h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800">
                <th className="border border-slate-200 dark:border-slate-700 p-2">الرمز</th>
                <th className="border border-slate-200 dark:border-slate-700 p-2">المعنى</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 dark:border-slate-700 p-2 font-bold text-center">P / M</td>
                <td className="border border-slate-200 dark:border-slate-700 p-2">Plus (+) / Minus (-) | موجب / سالب</td>
              </tr>
              {config.lensTypes.map((lt) => (
                <tr key={lt.value}>
                  <td className="border border-slate-200 dark:border-slate-700 p-2 font-bold text-center">{lt.value}</td>
                  <td className="border border-slate-200 dark:border-slate-700 p-2">{lt.labelEn} | {lt.labelAr}</td>
                </tr>
              ))}
              {[
                ["MED", "Medical Frame | فريم طبي"],
                ["SUN", "Sunglasses | فريم شمسي"]
              ].map(([code, meaning]) => (
                <tr key={code}>
                  <td className="border border-slate-200 dark:border-slate-700 p-2 font-bold text-center">{code}</td>
                  <td className="border border-slate-200 dark:border-slate-700 p-2">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
