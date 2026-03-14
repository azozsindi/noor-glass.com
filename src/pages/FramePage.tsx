/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useInventory } from '../useInventory';
import { translations } from '../i18n';
import { Scanner } from '../components/Scanner';
import { Barcode } from '../components/Barcode';
import { Printer, Save } from 'lucide-react';

import { soundService } from '../services/soundService';

export function FramePage() {
  const { addItem, lang, config } = useInventory();
  const t = translations[lang];

  const [type, setType] = useState("MED");
  const [brand, setBrand] = useState(config.brands[0] || "");
  const [color, setColor] = useState(config.colors[0] || "");
  const [factoryCode, setFactoryCode] = useState("");
  const [cost, setCost] = useState(config.defaultFrameCost > 0 ? config.defaultFrameCost.toString() : "");
  const [sell, setSell] = useState(config.defaultFrameSell > 0 ? config.defaultFrameSell.toString() : "");
  const [qty, setQty] = useState(1);
  const [sku, setSku] = useState("");

  useEffect(() => {
    const cleanBrand = brand.replace(/\s/g, '').replace(/-/g, '');
    const cleanColor = color.replace(/\s/g, '').replace(/-/g, '');
    const cleanFactory = factoryCode.toUpperCase().replace(/\s/g, '').replace(/-/g, '');
    setSku(`${type}${cleanBrand}${cleanColor}${cleanFactory}`);
  }, [type, brand, color, factoryCode]);

  const handleSave = () => {
    soundService.playClick();
    addItem({
      sku,
      qty,
      type: 'frame',
      source: 'Frames',
      cost: cost || 0,
      sell: sell || 0
    });
    setQty(1);
    setCost(config.defaultFrameCost > 0 ? config.defaultFrameCost.toString() : "");
    setSell(config.defaultFrameSell > 0 ? config.defaultFrameSell.toString() : "");
    setFactoryCode("");
  };

  const handlePrint = () => {
    soundService.playClick();
    const printWindow = window.open('', '_blank', 'width=400,height=400');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label - ${sku}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            @page { size: 30mm 10mm; margin: 0; }
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 0; 
              margin: 0; 
            }
            .label {
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center;
              height: 10mm;
              width: 30mm;
              overflow: hidden;
              page-break-after: always;
            }
            svg { width: 28mm; height: 8mm; }
          </style>
        </head>
        <body>
          <div id="labels-container"></div>
          <script>
            window.onload = () => {
              const container = document.getElementById('labels-container');
              const qty = ${qty};
              for (let i = 0; i < qty; i++) {
                const div = document.createElement('div');
                div.className = 'label';
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.id = 'barcode-' + i;
                div.appendChild(svg);
                container.appendChild(div);
                
                JsBarcode(svg, "${sku}", {
                  format: "CODE128",
                  width: 1.0,
                  height: 15,
                  displayValue: true,
                  fontSize: 8,
                  margin: 0
                });
              }
              setTimeout(() => {
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-base font-black text-emerald-700 dark:text-emerald-400 mb-4 border-s-4 border-emerald-700 ps-3 uppercase tracking-tight">{t.glass_title}</h2>
        
        <Scanner onScan={setSku} label={t.open_scanner} />

        <div className="space-y-4 mt-4">
          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ps-1">{t.frame_type_lbl}</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-600 font-black text-center appearance-none focus:ring-2 focus:ring-emerald-600 outline-none text-slate-900 dark:text-white"
            >
              <option value="MED">{t.type_med}</option>
              <option value="SUN">{t.type_sun}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ps-1">{t.brand}</label>
              <select 
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-600 font-black text-center appearance-none focus:ring-2 focus:ring-emerald-600 outline-none text-slate-900 dark:text-white"
              >
                {config.brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ps-1">{t.color}</label>
              <select 
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-600 font-black text-center appearance-none focus:ring-2 focus:ring-emerald-600 outline-none text-slate-900 dark:text-white"
              >
                {config.colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ps-1">{t.factory_code_lbl}</label>
            <input 
              type="text" 
              value={factoryCode}
              onChange={(e) => setFactoryCode(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-600 font-black text-center focus:ring-2 focus:ring-emerald-600 outline-none text-slate-900 dark:text-white"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
            <div className="font-mono font-black text-red-600 dark:text-red-400 text-xl break-all tracking-widest">{sku}</div>
            <div className="flex justify-center opacity-80 dark:invert">
              <Barcode value={sku} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ps-1">{t.lbl_cost}</label>
              <input 
                type="number" 
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-600 font-black text-center focus:ring-2 focus:ring-emerald-600 outline-none text-slate-900 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ps-1">{t.lbl_sell}</label>
              <input 
                type="number" 
                value={sell}
                onChange={(e) => setSell(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-600 font-black text-center focus:ring-2 focus:ring-emerald-600 outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ps-1">{t.quantity}</label>
            <input 
              type="number" 
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value) || 1)}
              min="1"
              inputMode="numeric"
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-600 font-black text-center focus:ring-2 focus:ring-emerald-600 outline-none text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handlePrint}
              className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-black text-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <Printer size={20} />
              {t.print_label}
            </button>
            <button 
              onClick={handleSave}
              className="flex-[2] py-5 bg-emerald-700 text-white rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <Save size={20} />
              {t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
