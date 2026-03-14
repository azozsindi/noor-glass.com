/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useInventory } from '../useInventory';
import { translations } from '../i18n';
import { STOCK_SHEET_NAME } from '../types';
import { Scanner } from '../components/Scanner';
import { Search, Plus, Minus, Camera, Package, Send, Trash2, Filter, ChevronUp, ChevronDown, Eraser } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { soundService } from '../services/soundService';

export function InventoryPage() {
  const { inventory, updateQty, deleteItem, sendToSheet, lang, config, sendAllToSheet, clearInventory, addItem } = useInventory();
  const t = translations[lang];

  const [searchTerm, setSearchTerm] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'lens' | 'frame'>('all');
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualSku, setManualSku] = useState("");
  const lastScanRef = React.useRef<{ sku: string, time: number } | null>(null);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualSku.trim()) {
      handleScan(manualSku.trim());
      setManualSku("");
      setShowManualEntry(false);
    }
  };

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

  const [confirmModal, setConfirmModal] = React.useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, message, onConfirm });
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || item.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [inventory, searchTerm, filterType]);

  const handleScan = (scannedSku: string) => {
    const now = Date.now();
    // Prevent duplicate scans within 2 seconds
    if (lastScanRef.current && lastScanRef.current.sku === scannedSku && now - lastScanRef.current.time < 2000) {
      return;
    }
    lastScanRef.current = { sku: scannedSku, time: now };

    soundService.playClick();
    setIsScanning(false);
    
    const existingItem = inventory.find(i => i.sku === scannedSku);
    if (existingItem) {
      updateQty(existingItem.id, 1);
      toast.success(`${scannedSku}: +1`);
    } else {
      // Determine type from SKU prefix if possible
      const isLens = config.lensTypes.some(lt => scannedSku.startsWith(lt.value));
      addItem({
        sku: scannedSku,
        qty: 1,
        type: isLens ? 'lens' : 'frame',
        source: 'STOCK',
        cost: isLens ? config.defaultLensCost : config.defaultFrameCost,
        sell: isLens ? config.defaultLensSell : config.defaultFrameSell
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Manual Entry Modal */}
      <AnimatePresence>
        {showManualEntry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-white/20"
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" />
                {t.inventory_manual_btn}
              </h3>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.inventory_sku_label}</label>
                  <input 
                    autoFocus
                    type="text"
                    value={manualSku}
                    onChange={(e) => setManualSku(e.target.value)}
                    className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border-none text-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="SKU..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowManualEntry(false)}
                    className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold"
                  >
                    {t.close_scanner}
                  </button>
                  <button 
                    type="submit"
                    className="p-4 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Search & Filter Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-blue-900 dark:text-blue-400 border-s-4 border-blue-800 ps-3 uppercase tracking-tight">
            {t.nav_inventory}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowManualEntry(true)}
              className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl active:scale-95 transition-all"
              title={t.inventory_manual_btn}
            >
              <Plus size={24} />
            </button>
            <button
              onClick={() => {
                soundService.playClick();
                setIsScanning(!isScanning);
              }}
              className={`p-3 rounded-2xl transition-all active:scale-95 ${
                isScanning 
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/20' 
                  : 'bg-blue-50 text-blue-900 dark:bg-blue-900/20'
              }`}
            >
              <Camera size={24} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={t.search_placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 font-bold focus:ring-2 focus:ring-blue-800 outline-none transition-all"
            />
          </div>

          <div className="flex gap-2">
            {(['all', 'lens', 'frame'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  filterType === type 
                    ? 'bg-blue-900 text-white shadow-lg shadow-blue-900/20' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {type === 'all' ? t.filter_all : type === 'lens' ? t.filter_lens : t.filter_frame}
              </button>
            ))}
          </div>
        </div>

        {isScanning && (
          <div className="mt-4 overflow-hidden rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800">
            <Scanner onScan={handleScan} label={t.inventory_scan_btn} autoStart={true} />
          </div>
        )}
      </div>

      {/* Inventory List */}
      <div className="space-y-3">
        {filteredInventory.length > 0 ? (
          <>
            {filteredInventory.map((item) => (
              <div key={item.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${item.type === 'lens' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {item.type === 'lens' 
                        ? (config.lensTypes.find(lt => item.sku.startsWith(lt.value))?.[lang === 'ar' ? 'labelAr' : 'labelEn'] || t.filter_lens)
                        : t.filter_frame}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">{item.date.split(',')[0]}</span>
                  </div>
                  <div className="font-mono font-black text-slate-900 dark:text-white truncate text-sm">
                    {item.sku}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-1">
                    <button 
                      onClick={() => {
                        soundService.playClick();
                        updateQty(item.id, -1);
                      }}
                      className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-600 active:scale-75 transition-all"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-black text-base">{item.qty}</span>
                    <button 
                      onClick={() => {
                        soundService.playClick();
                        updateQty(item.id, 1);
                      }}
                      className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-emerald-600 active:scale-75 transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => {
                      soundService.playClick();
                      sendToSheet(item.id, STOCK_SHEET_NAME);
                    }}
                    className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl active:scale-90 transition-all"
                    title={t.send_to_sheet}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            ))}

            {/* Send All to STOCK Button */}
            <div className="pt-4 space-y-3">
              <button 
                onClick={() => {
                  soundService.playClick();
                  showConfirm(
                    lang === 'ar' ? 'هل أنت متأكد من إرسال كافة الأصناف إلى الجرد؟' : 'Are you sure you want to send all items to STOCK?',
                    () => sendAllToSheet(STOCK_SHEET_NAME)
                  );
                }}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Send size={20} />
                {lang === 'ar' ? "إرسال الكل إلى STOCK" : "Send All to STOCK"}
              </button>

              <button 
                onClick={() => {
                  soundService.playClick();
                  showConfirm(
                    lang === 'ar' ? 'هل أنت متأكد من مسح كافة أصناف الجرد؟' : 'Are you sure you want to clear all inventory items?',
                    clearInventory
                  );
                }}
                className="w-full py-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl font-black border border-red-100 dark:border-red-900/30 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Eraser size={20} />
                {lang === 'ar' ? "حذف كافة الجرد" : "Delete All Inventory"}
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl text-center border border-dashed border-slate-200 dark:border-slate-800">
            <Package size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold">{t.empty}</p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
        <p className="text-[10px] text-blue-800 dark:text-blue-300 font-bold text-center leading-relaxed">
          {lang === 'ar' 
            ? "هذه الصفحة تعرض المخزون الحالي. يمكنك البحث وتعديل الكميات مباشرة."
            : "This page shows current stock. You can search and update quantities directly."}
        </p>
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
