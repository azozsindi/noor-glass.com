/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useInventory } from '../useInventory';
import { translations } from '../i18n';
import * as XLSX from 'xlsx';
import { Trash2, Send, FileSpreadsheet, Search as SearchIcon, Printer, Eraser, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { soundService } from '../services/soundService';

export function RecordsPage() {
  const { inventory, updateQty, deleteItem, sendToSheet, lang, config, clearInventory, sendAllToSheet } = useInventory();
  const t = translations[lang];

  const [confirmModal, setConfirmModal] = React.useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, message, onConfirm });
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'Lenses' | 'Frames' | 'STOCK'>('Lenses');
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setShowScrollButtons(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    soundService.playClick();
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    soundService.playClick();
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = item.source === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleExportExcel = () => {
    soundService.playClick();
    if (filteredInventory.length === 0) return;
    const data = filteredInventory.map(item => ({
      "SKU": item.sku,
      "Quantity": item.qty,
      "Type": item.type === 'lens' ? 'عدسة' : 'فريم',
      "Source": item.source,
      "Cost Price": item.cost || 0,
      "Selling Price": item.sell || 0,
      "Date": item.date
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    XLSX.writeFile(wb, `NoorGlass_${activeTab}_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleSendAllFiltered = async () => {
    if (filteredInventory.length === 0) return;
    
    const loadingToast = toast.loading(translations[lang].sending);
    let successCount = 0;
    
    for (const item of filteredInventory) {
      const success = await sendToSheet(item.id);
      if (success) successCount++;
    }
    
    toast.dismiss(loadingToast);
    if (successCount > 0) {
      toast.success(`${successCount} ${translations[lang].saved_sent}`);
    }
  };

  const handlePrintLabel = (item: any) => {
    soundService.playClick();
    const printWindow = window.open('', '_blank', 'width=400,height=400');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label - ${item.sku}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            @page { size: 30mm 10mm; margin: 0; }
            body { 
              font-family: 'Inter', sans-serif; 
              text-align: center; 
              padding: 0; 
              margin: 0; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center;
              height: 10mm;
              width: 30mm;
              overflow: hidden;
            }
            #barcode { width: 28mm; height: 8mm; }
          </style>
        </head>
        <body>
          <svg id="barcode"></svg>
          <script>
            window.onload = () => {
              JsBarcode("#barcode", "${item.sku}", {
                format: "CODE128",
                width: 1.0,
                height: 15,
                displayValue: true,
                fontSize: 8,
                margin: 0
              });
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
    <div className="space-y-4 relative">
      {/* Pull to Refresh Visual Indicator */}
      <div className="absolute -top-12 left-0 right-0 flex justify-center opacity-20 pointer-events-none">
        <motion.div 
          animate={{ y: [0, 10, 0] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex flex-col items-center gap-1"
        >
          <ChevronDown size={20} />
          <span className="text-[10px] font-bold uppercase tracking-widest">{lang === 'ar' ? 'اسحب للتحديث' : 'Pull to Refresh'}</span>
        </motion.div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-4 border-s-4 border-blue-800 ps-3">{t.inventory}</h2>
        
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder={t.search_placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full ps-10 pe-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-800"
              />
            </div>
            <div className="flex gap-2">
              {(['Lenses', 'Frames', 'STOCK'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                    activeTab === tab 
                      ? 'bg-blue-800 border-blue-800 text-white' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  {tab === 'Lenses' ? t.filter_lens : tab === 'Frames' ? t.filter_frame : t.nav_inventory}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredInventory.length === 0 ? (
              <div className="text-center py-10 text-slate-400">{t.empty}</div>
            ) : (
              filteredInventory.map((item) => (
                <div key={item.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-black text-slate-900 dark:text-white truncate text-base tracking-tight">{item.sku}</div>
                        {item.qty <= config.lowStockThreshold && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[8px] font-black rounded-full uppercase">
                            {t.low_stock_warn}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        <span>
                          {item.type === 'lens' 
                            ? (config.lensTypes.find(lt => item.sku.startsWith(lt.value))?.[lang === 'ar' ? 'labelAr' : 'labelEn'] || t.filter_lens)
                            : t.filter_frame}
                        </span>
                        {item.source && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600 dark:text-blue-400">{item.source}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="text-emerald-700 dark:text-emerald-400">Sell: {item.sell} {config.currency}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                      <button 
                        onClick={() => {
                          soundService.playClick();
                          updateQty(item.id, -1);
                        }} 
                        className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-sm active:scale-90 transition-transform text-slate-900 dark:text-white font-black"
                      >
                        -
                      </button>
                      <span className="font-black w-8 text-center text-lg text-slate-900 dark:text-white">{item.qty}</span>
                      <button 
                        onClick={() => {
                          soundService.playClick();
                          updateQty(item.id, 1);
                        }} 
                        className="w-10 h-10 flex items-center justify-center bg-blue-900 text-white rounded-lg shadow-md active:scale-90 transition-transform"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        soundService.playClick();
                        deleteItem(item.id);
                      }}
                      className="w-12 h-12 flex items-center justify-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl active:scale-90 transition-transform"
                    >
                      <Trash2 size={20} />
                    </button>
                    <button 
                      onClick={() => handlePrintLabel(item)}
                      className="w-12 h-12 flex items-center justify-center text-slate-600 bg-slate-100 dark:bg-slate-700 rounded-xl active:scale-90 transition-transform"
                      title={t.print_label}
                    >
                      <Printer size={20} />
                    </button>
                    <button 
                      onClick={() => {
                        soundService.playClick();
                        sendToSheet(item.id);
                      }}
                      className="flex-1 h-12 bg-emerald-600 text-white rounded-xl font-black flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"
                    >
                      <Send size={18} />
                      {t.send_to_sheet}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => showConfirm(lang === 'ar' ? `هل أنت متأكد من إرسال وحذف كافة سجلات ${activeTab === 'Lenses' ? 'العدسات' : activeTab === 'Frames' ? 'الإطارات' : 'الجرد'}؟` : `Are you sure you want to send and delete all ${activeTab} records?`, handleSendAllFiltered)}
            disabled={filteredInventory.length === 0}
            className={`w-full py-4 text-white rounded-xl font-black flex items-center justify-center gap-2 active:scale-95 transition-transform ${filteredInventory.length === 0 ? 'bg-slate-400 opacity-50 cursor-not-allowed' : 'bg-emerald-600'}`}
          >
            <Send size={20} />
            {lang === 'ar' ? `إرسال وحذف ${activeTab === 'Lenses' ? 'العدسات' : activeTab === 'Frames' ? 'الإطارات' : 'الجرد'}` : `Send & Delete ${activeTab}`}
          </button>
          <div className="flex gap-3">
            <button 
              onClick={handleExportExcel}
              className="flex-1 py-4 bg-slate-800 text-white rounded-xl font-black flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <FileSpreadsheet size={20} />
              {t.export}
            </button>
            <button 
              onClick={() => showConfirm(lang === 'ar' ? 'هل أنت متأكد من مسح كافة السجلات؟' : 'Are you sure you want to clear all records?', clearInventory)}
              className="flex-1 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl font-black flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/30 active:scale-95 transition-transform"
            >
              <Eraser size={20} />
              {t.btn_clear_inv}
            </button>
          </div>
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

      {/* Floating Scroll Buttons */}
      <AnimatePresence>
        {showScrollButtons && (
          <div className="fixed right-6 bottom-28 z-40 flex flex-col gap-3">
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              onClick={scrollToTop}
              className="w-12 h-12 bg-blue-900 text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-transform border-2 border-white/20"
            >
              <ChevronUp size={24} />
            </motion.button>
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              onClick={scrollToBottom}
              className="w-12 h-12 bg-slate-800 text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-transform border-2 border-white/20"
            >
              <ChevronDown size={24} />
            </motion.button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
