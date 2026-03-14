/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useInventory } from './useInventory';
import { translations } from './i18n';
import { HomePage } from './pages/HomePage';
import { UpdatesPage } from './pages/UpdatesPage';
import { ReportsPage } from './pages/ReportsPage';
import { LensPage } from './pages/LensPage';
import { FramePage } from './pages/FramePage';
import { RecordsPage } from './pages/RecordsPage';
import { NotesPage } from './pages/NotesPage';
import { GuidePage } from './pages/GuidePage';
import { AdminPage } from './pages/AdminPage';
import { InventoryPage } from './pages/InventoryPage';
import { Home, Search, Glasses, ClipboardList, FileText, Info, Settings, Sparkles, BarChart3, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'sonner';

import { soundService } from './services/soundService';

export default function App() {
  const { lang, config } = useInventory();
  const t = translations[lang];
  const [activePage, setActivePage] = useState('home');

  useEffect(() => {
    soundService.enabled = config.enableSound;
  }, [config.enableSound]);

  useEffect(() => {
    const now = new Date().toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    const currentVisit = localStorage.getItem("noor_current_visit_time");
    if (currentVisit) {
      localStorage.setItem("noor_last_visit_time", currentVisit);
    } else {
      localStorage.setItem("noor_last_visit_time", lang === 'ar' ? 'زيارة أولى' : 'First Visit');
    }
    localStorage.setItem("noor_current_visit_time", now);
  }, []);

  const navItems = [
    { id: 'home', icon: Home, label: t.nav_home },
    { id: 'updates', icon: Sparkles, label: t.nav_updates },
    { id: 'reports', icon: BarChart3, label: t.nav_reports },
    { id: 'lens', icon: Search, label: t.nav_add },
    { id: 'frame', icon: Glasses, label: t.nav_glasses },
    { id: 'records', icon: ClipboardList, label: t.nav_list },
    { id: 'notes', icon: FileText, label: t.nav_extras },
    { id: 'inventory', icon: Camera, label: t.nav_inventory },
    { id: 'guide', icon: Info, label: t.nav_info },
  ];

  const renderPage = () => {
    switch (activePage) {
      case 'home': return <HomePage />;
      case 'updates': return <UpdatesPage />;
      case 'reports': return <ReportsPage />;
      case 'lens': return <LensPage />;
      case 'frame': return <FramePage />;
      case 'records': return <RecordsPage />;
      case 'notes': return <NotesPage />;
      case 'inventory': return <InventoryPage />;
      case 'guide': return <GuidePage />;
      case 'admin': return <AdminPage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen pb-24 safe-top safe-bottom">
      <Toaster 
        position={lang === 'ar' ? 'top-left' : 'top-right'} 
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        richColors
        toastOptions={{
          style: {
            borderRadius: '1rem',
            fontFamily: 'inherit',
            fontWeight: 'bold'
          }
        }}
      />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="w-10" />
        <div className="flex items-center gap-2">
          <span className="font-black text-blue-900 dark:text-blue-400 tracking-tight text-xl uppercase">{config.shopName}</span>
        </div>
        <button 
          onClick={() => {
            soundService.playClick();
            setActivePage('admin');
          }}
          className={`p-2 rounded-xl transition-all active:scale-90 ${
            activePage === 'admin' 
              ? 'text-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings size={24} />
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-4 pb-24 px-safe">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 inset-x-0 z-50 pb-safe">
        {/* Fade indicators */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white dark:from-slate-950 to-transparent pointer-events-none z-10 opacity-80" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-slate-950 to-transparent pointer-events-none z-10 opacity-80" />
        
        <nav className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-t border-slate-200/50 dark:border-slate-800/50 px-6 py-2 flex overflow-x-auto scrollbar-hide no-scrollbar items-center shadow-[0_-8px_30px_rgba(0,0,0,0.08)] gap-2 scroll-smooth">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  soundService.playClick();
                  setActivePage(item.id);
                }}
                className={`flex flex-col items-center justify-center gap-1.5 min-w-[80px] h-16 rounded-2xl transition-all active:scale-95 relative shrink-0 ${
                  isActive 
                    ? 'text-blue-900 dark:text-blue-400' 
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="nav-bg"
                    className="absolute inset-0 bg-blue-50/80 dark:bg-blue-900/20 rounded-2xl -z-10 border border-blue-100/50 dark:border-blue-800/30"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <motion.div
                  animate={isActive ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                </motion.div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
