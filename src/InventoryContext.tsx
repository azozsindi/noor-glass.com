import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { InventoryItem, AppConfig, DEFAULT_CONFIG, SHEET_URL, STOCK_SHEET_URL, STOCK_SHEET_NAME, AuditEntry } from './types';
import { toast } from 'sonner';
import { translations } from './i18n';
import { soundService } from './services/soundService';

interface InventoryContextType {
  inventory: InventoryItem[];
  config: AppConfig;
  lang: 'ar' | 'en';
  theme: 'light' | 'dark';
  notes: string;
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  setLang: React.Dispatch<React.SetStateAction<'ar' | 'en'>>;
  setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  addItem: (item: Omit<InventoryItem, 'id' | 'date'>) => void;
  deleteItem: (id: number, silent?: boolean) => void;
  updateQty: (id: number, delta: number) => void;
  sendToSheet: (id: number, targetSheet?: string) => Promise<boolean>;
  sendAllToSheet: (targetSheet?: string) => Promise<void>;
  clearInventory: () => void;
  clearAuditLog: () => void;
  addAuditEntry: (action: string, details: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem("noor_glass_v2026_final");
    return saved ? JSON.parse(saved) : [];
  });

  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem("noor_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
    return DEFAULT_CONFIG;
  });

  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    const saved = localStorage.getItem("noor_lang");
    return (saved as 'ar' | 'en') || 'ar';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem("noor_theme");
    return (saved as 'light' | 'dark') || 'light';
  });

  const [notes, setNotes] = useState(() => localStorage.getItem('noor_notes') || "");

  useEffect(() => {
    localStorage.setItem("noor_glass_v2026_final", JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem("noor_config", JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem("noor_lang", lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("noor_theme", theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('noor_notes', notes);
  }, [notes]);

  const addAuditEntry = (action: string, details: string) => {
    const newEntry: AuditEntry = {
      id: Date.now().toString(),
      userId: 'admin',
      userName: 'Admin',
      action,
      details,
      date: new Date().toLocaleString()
    };
    setConfig(prev => ({
      ...prev,
      auditLog: [newEntry, ...(prev.auditLog || [])].slice(0, 100)
    }));
  };

  const addItem = (item: Omit<InventoryItem, 'id' | 'date'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: Date.now(),
      date: new Date().toLocaleString()
    };
    setInventory(prev => [...prev, newItem]);
    addAuditEntry('ADD_ITEM', `Added ${item.sku} (Qty: ${item.qty})`);
  };

  const deleteItem = (id: number, silent = false) => {
    const item = inventory.find(i => i.id === id);
    setInventory(prev => prev.filter(i => i.id !== id));
    if (!silent && item) {
      addAuditEntry('DELETE_ITEM', `Deleted ${item.sku}`);
    }
  };

  const updateQty = (id: number, delta: number) => {
    setInventory(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const sendToSheet = async (id: number, targetSheet?: string) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return false;

    const url = (targetSheet === STOCK_SHEET_NAME) 
      ? (STOCK_SHEET_URL || SHEET_URL) 
      : SHEET_URL;

    if (!url) {
      toast.error(lang === 'ar' ? 'رابط Google Sheet غير مضبوط' : 'Google Sheet URL not configured');
      return false;
    }

    try {
      await fetch(url, {
        method: "POST",
        mode: 'no-cors',
        body: JSON.stringify({
          sku: item.sku,
          qty: item.qty,
          type: item.type,
          cost: item.cost || 0,
          sell: item.sell || 0,
          date: item.date,
          sheetName: targetSheet || item.source || (item.type === 'frame' ? "Frames" : "Lenses") || "General"
        })
      });
      addAuditEntry('SEND_TO_SHEET', `Sent ${item.sku} to cloud (${targetSheet || item.source || (item.type === 'frame' ? "Frames" : "Lenses")})`);
      toast.success(translations[lang].saved_sent);
      deleteItem(id, true);
      return true;
    } catch (error) {
      console.error("Error sending to sheet:", error);
      return false;
    }
  };

  const sendAllToSheet = async (targetSheet?: string) => {
    if (inventory.length === 0) return;
    
    const loadingToast = toast.loading(translations[lang].sending);
    let successCount = 0;
    const url = (targetSheet === STOCK_SHEET_NAME) 
      ? (STOCK_SHEET_URL || SHEET_URL) 
      : SHEET_URL;
    
    if (!url) {
      toast.error(lang === 'ar' ? 'رابط Google Sheet غير مضبوط' : 'Google Sheet URL not configured');
      toast.dismiss(loadingToast);
      return;
    }

    const itemsToSend = [...inventory];
    for (const item of itemsToSend) {
      try {
        await fetch(url, {
          method: "POST",
          mode: 'no-cors',
          body: JSON.stringify({
            sku: item.sku,
            qty: item.qty,
            type: item.type,
            cost: item.cost || 0,
            sell: item.sell || 0,
            date: item.date,
            sheetName: targetSheet || item.source || (item.type === 'frame' ? "Frames" : "Lenses") || "General"
          })
        });
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error("Error sending item:", item.sku, error);
      }
    }
    
    toast.dismiss(loadingToast);
    if (successCount > 0) {
      toast.success(`${successCount} ${translations[lang].saved_sent}`);
      setInventory([]);
      addAuditEntry('SEND_ALL', `Sent ${successCount} items to cloud`);
    }
  };

  const clearInventory = () => {
    setInventory([]);
    addAuditEntry('CLEAR_INVENTORY', 'Cleared all inventory records');
  };

  const clearAuditLog = () => {
    setConfig(prev => ({ ...prev, auditLog: [] }));
  };

  return (
    <InventoryContext.Provider value={{
      inventory, config, lang, theme, notes,
      setInventory, setConfig, setLang, setTheme, setNotes,
      addItem, deleteItem, updateQty, sendToSheet, sendAllToSheet,
      clearInventory, clearAuditLog, addAuditEntry
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
