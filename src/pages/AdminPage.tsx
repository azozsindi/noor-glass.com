/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useInventory } from '../useInventory';
import { translations } from '../i18n';
import { Send, Upload, Printer, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { InventoryItem } from '../types';
import JsBarcode from 'jsbarcode';
import * as XLSX from 'xlsx';

import { soundService } from '../services/soundService';

export function AdminPage() {
  const { inventory, config, setConfig, lang, setLang, theme, setTheme, clearInventory, clearAuditLog, sendAllToSheet, bulkAddItems } = useInventory();
  const t = translations[lang];

  const [confirmModal, setConfirmModal] = React.useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, message, onConfirm });
  };

  const updateLensRange = (max: number, min: number) => {
    setConfig(prev => ({ ...prev, lensMax: max, lensMin: min }));
  };

  const updateCylRange = (max: number, min: number) => {
    setConfig(prev => ({ ...prev, cylMax: max, cylMin: min }));
  };

  const updateLowStockThreshold = (val: number) => {
    setConfig(prev => ({ ...prev, lowStockThreshold: val }));
  };

  const addItem = (key: 'brands' | 'colors', value: string) => {
    soundService.playClick();
    if (!value) return;
    const upper = value.toUpperCase().trim();
    if (!config[key].includes(upper)) {
      setConfig(prev => ({ ...prev, [key]: [...prev[key], upper] }));
    }
  };

  const removeItem = (key: 'brands' | 'colors', index: number) => {
    soundService.playClick();
    setConfig(prev => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index)
    }));
  };

  const addLensType = (code: string, ar: string, en: string) => {
    soundService.playClick();
    if (!code || !ar) return;
    const upperCode = code.toUpperCase().trim();
    if (!config.lensTypes.find(l => l.value === upperCode)) {
      setConfig(prev => ({
        ...prev,
        lensTypes: [...prev.lensTypes, { value: upperCode, labelAr: ar, labelEn: en || ar }]
      }));
    }
  };

  const removeLensType = (index: number) => {
    soundService.playClick();
    setConfig(prev => ({
      ...prev,
      lensTypes: prev.lensTypes.filter((_, i) => i !== index)
    }));
  };

  const [selectedImportType, setSelectedImportType] = React.useState(config.lensTypes[0]?.value || 'BCG');

  const parsePower = (raw: string): number => {
    const clean = raw.trim();
    if (clean === '') return 0;
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        
        const allNewItems: Omit<InventoryItem, 'id' | 'date'>[] = [];
        let totalSheetsProcessed = 0;

        wb.SheetNames.forEach(wsname => {
          const ws = wb.Sheets[wsname];
          const sheetData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          
          if (sheetData.length < 2) return;

          // Try to detect lens type from sheet name with better matching
          let sheetType = selectedImportType;
          const normalize = (s: string) => s.replace(/\s+/g, '').toUpperCase();
          const normalizedWsName = normalize(wsname);
          
          const matchedType = config.lensTypes.find(lt => 
            normalizedWsName.includes(normalize(lt.value)) || 
            normalizedWsName.includes(normalize(lt.labelAr)) || 
            normalizedWsName.includes(normalize(lt.labelEn))
          );
          if (matchedType) sheetType = matchedType.value;

          // Find CYL headers row
          let cylRowIndex = -1;
          for (let i = 0; i < Math.min(20, sheetData.length); i++) {
            const row = sheetData[i];
            if (!row) continue;
            const numericValues = row.map(v => parseFloat(String(v))).filter(v => !isNaN(v));
            if (numericValues.length > 5) {
              cylRowIndex = i;
              break;
            }
          }

          if (cylRowIndex === -1) return;
          totalSheetsProcessed++;

          const cylRow = sheetData[cylRowIndex];
          
          // Detect SPH column: usually first or last
          let sphColIndex = 0;
          const lastColIdx = cylRow.length - 1;
          
          // Check if last column looks like SPH (sequential values 0, 0.25, 0.50...)
          const sampleRows = sheetData.slice(cylRowIndex + 1, cylRowIndex + 6);
          const firstColSample = sampleRows.map(r => parseFloat(String(r[0])));
          const lastColSample = sampleRows.map(r => parseFloat(String(r[lastColIdx])));
          
          const isSequential = (arr: number[]) => {
            if (arr.length < 2) return false;
            const diffs = arr.slice(1).map((v, idx) => Math.abs(v - arr[idx]));
            return diffs.every(d => d === 0.25 || d === 0);
          };

          if (isSequential(lastColSample) && !isSequential(firstColSample)) {
            sphColIndex = lastColIdx;
          }

          for (let i = cylRowIndex + 1; i < sheetData.length; i++) {
            const row = sheetData[i];
            if (!row || row.length === 0) continue;
            
            const sphRaw = String(row[sphColIndex] || '').trim();
            const sphVal = parsePower(sphRaw);

            for (let j = 0; j < row.length; j++) {
              if (j === sphColIndex) continue; // Skip the SPH column itself
              
              const qty = parseInt(String(row[j] || '0'));
              if (isNaN(qty) || qty <= 0) continue;

              const cylRaw = String(cylRow[j] || '').trim();
              const cylVal = parsePower(cylRaw);

              // Standardize values for SKU
              const sphSign = sphVal < 0 ? "M" : "P";
              const sphClean = Math.abs(sphVal).toFixed(2).replace(/[.]/g, '').padStart(4, '0');
              const cylClean = Math.abs(cylVal).toFixed(2).replace(/[.]/g, '').padStart(4, '0');
              
              const sku = `${sheetType}${sphSign} ${sphClean} ${cylClean}`;

              allNewItems.push({
                sku,
                qty,
                type: 'lens',
                cost: 0,
                sell: 0
              });
            }
          }
        });

        if (allNewItems.length > 0) {
          bulkAddItems(allNewItems);
          toast.success(`${t.import_success} (${allNewItems.length} items from ${totalSheetsProcessed} sheets)`);
        } else {
          toast.error(t.import_error + " - No valid data found in " + wb.SheetNames.length + " sheets");
        }
      } catch (err) {
        console.error(err);
        toast.error(t.import_error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const headers = ["SPH / CYL", "0.00", "-0.25", "-0.50", "-0.75", "-1.00", "-1.25", "-1.50", "-1.75", "-2.00"];
    const rows = [
      ["0.00", 10, 5, 0, 2, 0, 0, 0, 0, 0],
      ["-0.25", 0, 8, 12, 0, 5, 0, 0, 0, 0],
      ["-0.50", 4, 0, 0, 15, 0, 3, 0, 0, 0],
    ];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["LENS INVENTORY TEMPLATE"],
      ["Sheet name should be lens code (e.g. BCG)"],
      headers,
      ...rows
    ]);
    
    XLSX.utils.book_append_sheet(wb, ws, "BCG");
    XLSX.writeFile(wb, "Lens_Inventory_Template.xlsx");
    toast.success("Template downloaded");
  };

  const handleBulkImport = () => {
    const textarea = document.getElementById('bulk-import-area') as HTMLTextAreaElement;
    const data = textarea.value.trim();
    if (!data) return;

    try {
      const lines = data.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 3) throw new Error("Invalid format");

      // Find CYL headers row
      let cylRowIndex = -1;
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        const parts = lines[i].split(';').map(p => p.trim());
        const numericCount = parts.filter(p => !isNaN(parseFloat(p)) && p !== '').length;
        if (numericCount > 5) {
          cylRowIndex = i;
          break;
        }
      }

      if (cylRowIndex === -1) throw new Error("Could not find headers");

      const cylRow = lines[cylRowIndex].split(';').map(p => p.trim());
      
      // Detect SPH column
      let sphColIndex = 0;
      const lastColIdx = cylRow.length - 1;
      const sampleRows = lines.slice(cylRowIndex + 1, cylRowIndex + 4).map(l => l.split(';'));
      
      const firstColSample = sampleRows.map(r => parseFloat(r[0]));
      const lastColSample = sampleRows.map(r => parseFloat(r[lastColIdx]));
      
      const isSequential = (arr: number[]) => {
        if (arr.length < 2) return false;
        const diffs = arr.slice(1).map((v, idx) => Math.abs(v - arr[idx]));
        return diffs.every(d => d === 0.25 || d === 0);
      };

      if (isSequential(lastColSample) && !isSequential(firstColSample)) {
        sphColIndex = lastColIdx;
      }

      const newItems: Omit<InventoryItem, 'id' | 'date'>[] = [];

      for (let i = cylRowIndex + 1; i < lines.length; i++) {
        const parts = lines[i].split(';').map(p => p.trim());
        const sphRaw = parts[sphColIndex];
        if (sphRaw === undefined) continue;
        const sphVal = parsePower(sphRaw);

        for (let j = 0; j < parts.length; j++) {
          if (j === sphColIndex) continue;
          
          const qty = parseInt(parts[j]);
          if (isNaN(qty) || qty <= 0) continue;

          const cylRaw = cylRow[j];
          if (cylRaw === undefined) continue;
          const cylVal = parsePower(cylRaw);

          const sphSign = sphVal < 0 ? "M" : "P";
          const sphClean = Math.abs(sphVal).toFixed(2).replace(/[.]/g, '').padStart(4, '0');
          const cylClean = Math.abs(cylVal).toFixed(2).replace(/[.]/g, '').padStart(4, '0');
          
          const sku = `${selectedImportType}${sphSign} ${sphClean} ${cylClean}`;

          newItems.push({
            sku,
            qty,
            type: 'lens',
            cost: 0,
            sell: 0
          });
        }
      }

      if (newItems.length > 0) {
        bulkAddItems(newItems);
        textarea.value = '';
        toast.success(`${t.import_success} (${newItems.length} items)`);
      } else {
        toast.error(t.import_error);
      }
    } catch (e) {
      console.error(e);
      toast.error(t.import_error);
    }
  };

  const printAllBarcodes = () => {
    soundService.playClick();
    if (inventory.length === 0) {
      toast.error(t.audit_empty);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Barcodes - ${config.shopName}</title>
          <style>
            @page { size: 30mm 10mm; margin: 0; }
            body { 
              font-family: sans-serif; 
              margin: 0; 
              padding: 0;
              background: white;
            }
            .label {
              width: 30mm;
              height: 10mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              page-break-after: always;
              overflow: hidden;
            }
            .sku { 
              font-size: 8px; 
              font-weight: bold; 
              margin-top: 1px;
              font-family: monospace;
            }
            svg {
              width: 28mm;
              height: 7mm;
            }
          </style>
        </head>
        <body>
          <div id="labels-container"></div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            const items = ${JSON.stringify(inventory)};
            const container = document.getElementById('labels-container');
            
            items.forEach(item => {
              for (let k = 0; k < item.qty; k++) {
                const div = document.createElement('div');
                div.className = 'label';
                
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                const uniqueId = 'barcode-' + item.id + '-' + k;
                svg.id = uniqueId;
                
                const skuDiv = document.createElement('div');
                skuDiv.className = 'sku';
                skuDiv.innerText = item.sku;
                
                div.appendChild(svg);
                div.appendChild(skuDiv);
                container.appendChild(div);
                
                JsBarcode(svg, item.sku, {
                  format: "CODE128",
                  width: 1.0,
                  height: 25,
                  displayValue: false,
                  margin: 0
                });
              }
            });
            
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const exportToExcel = () => {
    soundService.playClick();
    if (inventory.length === 0) {
      toast.error(t.audit_empty);
      return;
    }

    const data = inventory.map(item => ({
      SKU: item.sku,
      Quantity: item.qty,
      Type: item.type,
      Cost: item.cost,
      Sell: item.sell,
      Date: item.date
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `Inventory_${new Date().toLocaleDateString()}.xlsx`);
    toast.success("Excel file downloaded");
  };

  const exportBackup = () => {
    soundService.playClick();
    const backupData = {
      inventory,
      config,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NoorGlass_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(lang === 'ar' ? "تم تصدير النسخة الاحتياطية" : "Backup exported successfully");
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (data.inventory && data.config) {
          // Merge or overwrite? Let's overwrite for a clean restore
          localStorage.setItem("noor_glass_v2026_final", JSON.stringify(data.inventory));
          localStorage.setItem("noor_config", JSON.stringify(data.config));
          toast.success(lang === 'ar' ? "تمت استعادة البيانات بنجاح! سيتم إعادة تحميل التطبيق." : "Data restored successfully! App will reload.");
          setTimeout(() => window.location.reload(), 1500);
        } else {
          toast.error(t.import_error);
        }
      } catch (err) {
        console.error(err);
        toast.error(t.import_error);
      }
    };
    reader.readAsText(file);
  };

  const resetApplication = () => {
    soundService.playClick();
    localStorage.clear();
    toast.success(lang === 'ar' ? "تم مسح كافة البيانات. سيتم إعادة تشغيل التطبيق." : "All data cleared. App will restart.");
    setTimeout(() => window.location.reload(), 2000);
  };

  const loadSampleData = () => {
    const sample = `بلوكت ازرق - -;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;
-6.00;-5.75;-5.50;-5.25;-5.00;-4.75;-4.50;-4.25;-4.00;-3.75;-3.50;-3.25;-3.00;-2.75;-2.50;2.25;-2.00;-1.75;-1.50;-1.25;-1.00;-0.75;-0.50;-0.25;0.00;0.00;
5;5;15;14;20;18;1;12;8;7;25;23;8;5;4;6;0;0;0;0;0.00;
3;5;3;5;5;3;3;4;7;7;10;6;2;0;0;0;9;0.25;
5;5;2;5;4;3;5;3;4;18;11;3;0;3;0;13;0;0.50;
5;5;5;5;3;2;1;3;5;8;10;2;4;5;1;15;0;0.75;
4;5;5;5;2;4;5;3;3;8;12;7;17;11;0;4;0;1.00;`;
    const textarea = document.getElementById('bulk-import-area') as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = sample;
      toast.info(lang === 'ar' ? "تم تجهيز البيانات (بلوكت أزرق)، اضغط 'بدء الاستيراد'" : "Data ready (Blue Cut Blue), click 'Import Data'");
    }
  };

  return (
    <div className="space-y-4 pb-10">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-4 border-s-4 border-blue-800 ps-3">{t.admin_general}</h2>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-white">{t.mode_label}</span>
            <button 
              onClick={() => {
                soundService.playClick();
                setTheme(theme === 'light' ? 'dark' : 'light');
              }}
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-900 dark:text-white"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="font-bold text-slate-900 dark:text-white">{t.lang_label}</span>
            <button 
              onClick={() => {
                soundService.playClick();
                setLang(lang === 'ar' ? 'en' : 'ar');
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-slate-900 dark:text-white"
            >
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-4 border-s-4 border-blue-800 ps-3">{t.admin_shop_info}</h2>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">{t.lbl_shop_name}</label>
            <input 
              type="text"
              value={config.shopName}
              onChange={(e) => setConfig(prev => ({ ...prev, shopName: e.target.value }))}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 text-slate-900 dark:text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">{t.lbl_shop_phone}</label>
            <input 
              type="text"
              value={config.shopPhone}
              onChange={(e) => setConfig(prev => ({ ...prev, shopPhone: e.target.value }))}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 text-slate-900 dark:text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">{t.lbl_currency}</label>
            <input 
              type="text"
              value={config.currency}
              onChange={(e) => setConfig(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-4 border-s-4 border-blue-800 ps-3">{t.admin_system_settings}</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-900 dark:text-white">{t.lbl_enable_sound}</span>
            <button 
              onClick={() => setConfig(prev => ({ ...prev, enableSound: !prev.enableSound }))}
              className={`w-12 h-6 rounded-full transition-colors relative ${config.enableSound ? 'bg-blue-800' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.enableSound ? 'right-1' : 'right-7'}`} />
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-900 dark:text-white">{t.lbl_enable_anim}</span>
            <button 
              onClick={() => setConfig(prev => ({ ...prev, enableAnimations: !prev.enableAnimations }))}
              className={`w-12 h-6 rounded-full transition-colors relative ${config.enableAnimations ? 'bg-blue-800' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.enableAnimations ? 'right-1' : 'right-7'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-4 border-s-4 border-blue-800 ps-3">{t.admin_pricing}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{t.lbl_def_lens_cost}</label>
            <input 
              type="number"
              value={config.defaultLensCost}
              onChange={(e) => setConfig(prev => ({ ...prev, defaultLensCost: parseFloat(e.target.value) || 0 }))}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 text-slate-900 dark:text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{t.lbl_def_lens_sell}</label>
            <input 
              type="number"
              value={config.defaultLensSell}
              onChange={(e) => setConfig(prev => ({ ...prev, defaultLensSell: parseFloat(e.target.value) || 0 }))}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 text-slate-900 dark:text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{t.lbl_def_frame_cost}</label>
            <input 
              type="number"
              value={config.defaultFrameCost}
              onChange={(e) => setConfig(prev => ({ ...prev, defaultFrameCost: parseFloat(e.target.value) || 0 }))}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 text-slate-900 dark:text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{t.lbl_def_frame_sell}</label>
            <input 
              type="number"
              value={config.defaultFrameSell}
              onChange={(e) => setConfig(prev => ({ ...prev, defaultFrameSell: parseFloat(e.target.value) || 0 }))}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-4 border-s-4 border-blue-800 ps-3">{t.admin_backup}</h2>
        <div className="grid grid-cols-1 gap-3">
          <button 
            onClick={exportBackup}
            className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <FileSpreadsheet size={20} />
            {t.btn_export_json}
          </button>
          <div className="relative">
            <input 
              type="file" 
              accept=".json"
              onChange={importBackup}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <button className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 pointer-events-none">
              <Upload size={20} />
              {t.btn_import_json}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-4 border-s-4 border-blue-800 ps-3">{t.admin_barcode_settings}</h2>
        <div className="flex justify-between items-center">
          <span className="font-bold text-slate-900 dark:text-white">{t.lbl_barcode_text}</span>
          <button 
            onClick={() => setConfig(prev => ({ ...prev, barcodeDisplayValue: !prev.barcodeDisplayValue }))}
            className={`w-12 h-6 rounded-full transition-colors relative ${config.barcodeDisplayValue ? 'bg-blue-800' : 'bg-slate-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.barcodeDisplayValue ? 'right-1' : 'right-7'}`} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-4 border-s-4 border-blue-800 ps-3">{t.admin_lens_config}</h2>
        <p className="text-xs text-slate-500 mb-4">{t.lens_hint}</p>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-slate-900 dark:text-white">{t.lbl_max_pos}</label>
            <input 
              type="number" 
              defaultValue={config.lensMax}
              onBlur={(e) => updateLensRange(parseFloat(e.target.value), config.lensMin)}
              step="0.25"
              className="w-20 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 text-center text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-slate-900 dark:text-white">{t.lbl_max_neg}</label>
            <input 
              type="number" 
              defaultValue={config.lensMin}
              onBlur={(e) => updateLensRange(config.lensMax, parseFloat(e.target.value))}
              step="0.25"
              className="w-20 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 text-center text-slate-900 dark:text-white"
            />
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800"></div>
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-slate-900 dark:text-white">{t.lbl_cyl_max}</label>
            <input 
              type="number" 
              defaultValue={config.cylMax}
              onBlur={(e) => updateCylRange(parseFloat(e.target.value), config.cylMin)}
              step="0.25"
              className="w-20 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 text-center text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-slate-900 dark:text-white">{t.lbl_cyl_min}</label>
            <input 
              type="number" 
              defaultValue={config.cylMin}
              onBlur={(e) => updateCylRange(config.cylMax, parseFloat(e.target.value))}
              step="0.25"
              className="w-20 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 text-center text-slate-900 dark:text-white"
            />
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800"></div>
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-slate-900 dark:text-white">{t.lbl_low_stock}</label>
            <input 
              type="number" 
              defaultValue={config.lowStockThreshold}
              onBlur={(e) => updateLowStockThreshold(parseInt(e.target.value) || 0)}
              className="w-20 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 text-center text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-4 border-s-4 border-blue-800 ps-3">{t.admin_lens_types}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500">{t.lbl_lens_code}</label>
              <input id="lt-code" type="text" placeholder="BCG" className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500">{t.lbl_lens_ar}</label>
              <input id="lt-ar" type="text" placeholder="بلو كت" className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500">{t.lbl_lens_en}</label>
            <input id="lt-en" type="text" placeholder="Blue Cut" className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200" />
          </div>
          <button 
            onClick={() => {
              const code = document.getElementById('lt-code') as HTMLInputElement;
              const ar = document.getElementById('lt-ar') as HTMLInputElement;
              const en = document.getElementById('lt-en') as HTMLInputElement;
              addLensType(code.value, ar.value, en.value);
              code.value = ''; ar.value = ''; en.value = '';
            }}
            className="w-full py-3 bg-blue-800 text-white rounded-xl font-bold"
          >
            +
          </button>
          <div className="flex flex-wrap gap-2">
            {config.lensTypes.map((lt, i) => (
              <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs flex items-center gap-2">
                <b>{lt.value}</b>: {lang === 'ar' ? lt.labelAr : lt.labelEn}
                <button onClick={() => removeLensType(i)} className="text-red-500 font-bold">×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-4 border-s-4 border-blue-800 ps-3">{t.audit_title}</h2>
        <div className="max-h-60 overflow-y-auto space-y-2 pe-2 custom-scrollbar">
          {(!config.auditLog || config.auditLog.length === 0) ? (
            <p className="text-center text-slate-400 py-4 text-xs">{t.audit_empty}</p>
          ) : (
            config.auditLog.map(log => (
              <div key={log.id} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-800 text-[10px]">
                <div className="flex justify-between font-bold text-blue-800 dark:text-blue-400">
                  <span>{log.userName}</span>
                  <span>{log.date}</span>
                </div>
                <div className="mt-1 text-slate-600 dark:text-slate-400">
                  <span className="font-bold mr-1">{log.action}:</span>
                  {log.details}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-4 border-s-4 border-blue-800 ps-3">{t.admin_inv}</h2>
        
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold block">{t.m_brands}</label>
            <div className="flex gap-2">
              <input 
                id="brand-input"
                type="text" 
                placeholder="RAYBAN"
                className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 text-slate-900 dark:text-white"
              />
              <button 
                onClick={() => {
                  const input = document.getElementById('brand-input') as HTMLInputElement;
                  addItem('brands', input.value);
                  input.value = '';
                }}
                className="px-4 bg-blue-800 text-white rounded-lg font-bold"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.brands.map((b, i) => (
                <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs flex items-center gap-2">
                  {b}
                  <button onClick={() => removeItem('brands', i)} className="text-red-500 font-bold">×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold block">{t.m_colors}</label>
            <div className="flex gap-2">
              <input 
                id="color-input"
                type="text" 
                placeholder="GOLD"
                className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 text-slate-900 dark:text-white"
              />
              <button 
                onClick={() => {
                  const input = document.getElementById('color-input') as HTMLInputElement;
                  addItem('colors', input.value);
                  input.value = '';
                }}
                className="px-4 bg-blue-800 text-white rounded-lg font-bold"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.colors.map((c, i) => (
                <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs flex items-center gap-2">
                  {c}
                  <button onClick={() => removeItem('colors', i)} className="text-red-500 font-bold">×</button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-4 border-s-4 border-blue-800 ps-3">{t.admin_bulk_import}</h2>
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500">{t.admin_bulk_import}</label>
              <div className="flex gap-2">
                <button 
                  onClick={downloadTemplate}
                  className="text-[10px] px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded border border-emerald-200 text-emerald-700 font-bold"
                >
                  {t.download_template}
                </button>
                <button 
                  onClick={loadSampleData}
                  className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 text-blue-800 font-bold"
                >
                  {t.btn_load_sample}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {t.import_lens_type}
              </label>
              <p className="text-[9px] text-slate-400 italic">
                {t.import_excel_hint}
              </p>
              <select 
                value={selectedImportType}
                onChange={(e) => setSelectedImportType(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 text-sm font-bold"
              >
                {config.lensTypes.map(lt => (
                  <option key={lt.value} value={lt.value}>
                    {lt.value} - {lang === 'ar' ? lt.labelAr : lt.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <input 
                type="file" 
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
              />
              <label 
                htmlFor="excel-upload"
                className="w-full py-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-800 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
              >
                <FileSpreadsheet size={24} />
                <span className="text-xs font-black uppercase tracking-widest">
                  {t.import_excel}
                </span>
              </label>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-bold">{t.import_or_paste}</span>
              </div>
            </div>

            <textarea 
              id="bulk-import-area"
              placeholder={t.import_placeholder}
              className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 text-xs font-mono"
            />
            <button 
              onClick={handleBulkImport}
              className="w-full py-3 bg-blue-800 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Upload size={18} />
              {t.btn_import}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-4 border-s-4 border-blue-800 ps-3">{lang === 'ar' ? "عمليات جماعية" : "Bulk Actions"}</h2>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={printAllBarcodes}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform"
          >
            <Printer size={24} className="text-blue-800 mb-2" />
            <span className="text-xs font-bold">{t.btn_print_all}</span>
          </button>
          <button 
            onClick={exportToExcel}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform"
          >
            <FileSpreadsheet size={24} className="text-emerald-600 mb-2" />
            <span className="text-xs font-bold">{lang === 'ar' ? "تصدير إكسيل" : "Export Excel"}</span>
          </button>
        </div>
      </div>

      <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30">
        <h2 className="text-lg font-bold text-red-800 dark:text-red-400 mb-4 border-s-4 border-red-800 ps-3">{t.admin_danger}</h2>
        <div className="space-y-3">
          <button 
            onClick={() => showConfirm(lang === 'ar' ? 'هل أنت متأكد من إرسال وحذف كافة السجلات؟' : 'Are you sure you want to send and delete all records?', sendAllToSheet)}
            disabled={inventory.length === 0}
            className={`w-full py-4 text-white rounded-xl font-black shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2 ${inventory.length === 0 ? 'bg-slate-400 opacity-50 cursor-not-allowed' : 'bg-emerald-600'}`}
          >
            <Send size={20} />
            {t.btn_send_all}
          </button>
          <button 
            onClick={() => showConfirm(lang === 'ar' ? 'هل أنت متأكد من مسح كافة السجلات؟' : 'Are you sure you want to clear all records?', clearInventory)}
            className="w-full py-4 bg-white dark:bg-slate-900 text-red-600 rounded-xl font-black border border-red-200 dark:border-red-900/50 shadow-sm active:scale-95 transition-transform"
          >
            {t.btn_clear_inv}
          </button>
          <button 
            onClick={() => showConfirm(lang === 'ar' ? 'هل أنت متأكد من مسح سجل العمليات؟' : 'Are you sure you want to clear the audit log?', clearAuditLog)}
            className="w-full py-4 bg-white dark:bg-slate-900 text-red-600 rounded-xl font-black border border-red-200 dark:border-red-900/50 shadow-sm active:scale-95 transition-transform"
          >
            {t.btn_clear_logs}
          </button>
          <button 
            onClick={() => showConfirm(t.reset_confirm, resetApplication)}
            className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-600/20 active:scale-95 transition-transform"
          >
            {t.btn_reset_app}
          </button>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 text-center">
              {lang === 'ar' ? 'تأكيد العملية' : 'Confirm Action'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-center mb-8 font-bold leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-black active:scale-95 transition-transform"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-600/20 active:scale-95 transition-transform"
              >
                {lang === 'ar' ? 'تأكيد' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
