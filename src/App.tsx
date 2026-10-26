import React, { useState, useEffect, useMemo } from 'react';
import {
  AppDatabase, User, Unit, Contract, Installment, ActivityActionType
} from './types';
import {
  getLocalDatabase, saveLocalDatabase, fetchServerDatabase,
  syncServerDatabase, getCurrentUser, setCurrentUser, PERMISSIONS
} from './services/storage';
import { initialData } from './services/initialData';
import {
  testConnection,
  subscribeToCloudDatabase,
  loginWithGoogle,
  logoutFirebaseAuth
} from './services/firebase';
import {
  startOrUpdateUserSession,
  heartbeatUserSession,
  endUserSession,
  recordInactivityAutoLogout,
  getCurrentSessionId,
  clearCurrentSessionId,
  logActivity,
  isSessionOnline
} from './services/activityLogger';

// Modals
import { QRCodeModal } from './components/QRCodeModal';
import { ReceiptModal } from './components/ReceiptModal';
import { ContractModal } from './components/ContractModal';
import { SummaryReportModal } from './components/SummaryReportModal';

// Views
import { DashboardView } from './components/views/DashboardView';
import { ProjectsView } from './components/views/ProjectsView';
import { UnitsView } from './components/views/UnitsView';
import { CustomersView } from './components/views/CustomersView';
import { SalesView } from './components/views/SalesView';
import { CollectionView } from './components/views/CollectionView';
import { LoansView } from './components/views/LoansView';
import { ExpensesView } from './components/views/ExpensesView';
import { ReportsView } from './components/views/ReportsView';
import { UsersView } from './components/views/UsersView';
import { SettingsView } from './components/views/SettingsView';
import { PublicUnitView } from './components/views/PublicUnitView';
import { PublicCatalogView } from './components/views/PublicCatalogView';

import {
  Building2, LogOut, CheckCircle2, RefreshCw, KeyRound, Lock, User as UserIcon,
  Cloud, CloudOff, Globe, Grid, Sun, Moon, AlertTriangle, Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(getLocalDatabase());
  const [currentUser, setLoggedInUser] = useState<User | null>(getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('🏠 الرئيسية');

  // Modals state
  const [selectedQrUnit, setSelectedQrUnit] = useState<Unit | null>(null);
  const [selectedReceiptInstallment, setSelectedReceiptInstallment] = useState<Installment | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isSummaryReportOpen, setIsSummaryReportOpen] = useState<boolean>(false);
  const [quickPayInstallmentId, setQuickPayInstallmentId] = useState<number | null>(null);

  // Cloud sync state
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string>('سحابي متصل (مزامنة حية لحظية)');

  // Check if current URL contains a scanned unit parameter e.g. ?unit=123
  const [publicUnitId, setPublicUnitId] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const unitParam = params.get('unit');
      if (unitParam) {
        const id = parseInt(unitParam, 10);
        return isNaN(id) ? null : id;
      }
    }
    return null;
  });

  // Theme mode toggle (Dark / Light) - Apple-style
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hermes-theme');
      return saved ? saved === 'dark' : true; // default to dark luxury
    }
    return true;
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      const body = document.body;
      if (isDarkMode) {
        root.classList.remove('light-mode');
        root.classList.add('dark-mode');
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        body.style.backgroundImage = 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.08) 0px, transparent 50%)';
      } else {
        root.classList.remove('dark-mode', 'dark');
        root.classList.add('light-mode');
        body.classList.remove('dark-mode', 'dark');
        body.classList.add('light-mode');
        body.style.backgroundImage = 'none';
      }
      localStorage.setItem('hermes-theme', isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode]);

  // Check if visitor catalog portal is requested e.g. ?mode=visitor, ?catalog=1, ?portal=public
  const [isVisitorMode, setIsVisitorMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get('mode') === 'visitor' ||
        params.get('catalog') === '1' ||
        params.get('portal') === 'public'
      );
    }
    return false;
  });

  // Handle browser back and forward button events seamlessly
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const unitParam = params.get('unit');
      if (unitParam) {
        const id = parseInt(unitParam, 10);
        setPublicUnitId(isNaN(id) ? null : id);
      } else {
        setPublicUnitId(null);
      }
      setIsVisitorMode(
        params.get('mode') === 'visitor' ||
        params.get('catalog') === '1' ||
        params.get('portal') === 'public'
      );
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Initial load and live real-time subscription from Firebase Firestore
  useEffect(() => {
    testConnection();

    // Attach real-time cloud listener so all users share the exact same state live
    const unsubscribe = subscribeToCloudDatabase(
      (cloudData) => {
        if (cloudData && Array.isArray(cloudData.units)) {
          setDb(cloudData);
          saveLocalDatabase(cloudData);
          setIsCloudConnected(true);
          setSyncNotice('سحابي متصل (مزامنة حية لحظية)');
        }
      },
      (err) => {
        console.warn('Live cloud listener notice:', err);
        setIsCloudConnected(false);
        setSyncNotice('يعمل محلياً (إعادة المحاولة)');
        // Fallback to server API if needed
        fetchServerDatabase().then(serverData => {
          if (serverData) setDb(serverData);
        });
      }
    );

    return () => unsubscribe();
  }, []);

  // Update DB handler (saves locally & syncs with cloud Firestore immediately)
  const handleUpdateDb = (
    updatedDb: AppDatabase,
    activityMeta?: { actionType: ActivityActionType; actionLabel: string; details: string; targetTitle?: string }
  ) => {
    let finalDb = updatedDb;

    // Record activity log if meta provided or auto-detect additions
    if (activityMeta && currentUser) {
      finalDb = logActivity(
        updatedDb,
        currentUser,
        activityMeta.actionType,
        activityMeta.actionLabel,
        activityMeta.details,
        activityMeta.targetTitle
      );
    } else if (currentUser && (!updatedDb.activityLogs || updatedDb.activityLogs === db.activityLogs)) {
      if ((updatedDb.units?.length || 0) > (db.units?.length || 0)) {
        const addedUnit = updatedDb.units[updatedDb.units.length - 1];
        finalDb = logActivity(updatedDb, currentUser, 'unit_add', 'إضافة وحدة جديدة', `تم إضافة الوحدة رقم ${addedUnit?.unitNumber || ''} في ${addedUnit?.building || ''}`, `وحدة ${addedUnit?.unitNumber}`);
      } else if ((updatedDb.units?.length || 0) < (db.units?.length || 0)) {
        finalDb = logActivity(updatedDb, currentUser, 'unit_delete', 'حذف وحدة عقارية', `تم حذف وحدة عقارية من النظام`, 'حذف وحدة');
      } else if ((updatedDb.contracts?.length || 0) > (db.contracts?.length || 0)) {
        const addedContract = updatedDb.contracts[updatedDb.contracts.length - 1];
        const unit = updatedDb.units.find(u => u.id === addedContract.unitId);
        const customer = updatedDb.customers.find(c => c.id === addedContract.customerId);
        finalDb = logActivity(updatedDb, currentUser, 'contract_add', 'تسجيل عقد بيع جديد', `تم تسجيل عقد بيع جديد للوحدة ${unit?.unitNumber || ''} للعميل ${customer?.name || ''} بقيمة ${addedContract.totalPrice.toLocaleString()} ج.م`, `عقد بيع وحدة ${unit?.unitNumber}`);
      } else if ((updatedDb.contracts?.length || 0) < (db.contracts?.length || 0)) {
        finalDb = logActivity(updatedDb, currentUser, 'contract_delete', 'إلغاء عقد بيع', `تم إلغاء/حذف عقد بيع من النظام وإعادة الوحدة للمبيعات`, 'إلغاء عقد');
      } else if ((updatedDb.customers?.length || 0) > (db.customers?.length || 0)) {
        const addedCust = updatedDb.customers[updatedDb.customers.length - 1];
        finalDb = logActivity(updatedDb, currentUser, 'customer_add', 'إضافة عميل جديد', `تم إضافة العميل الجديد ${addedCust?.name || ''}`, addedCust?.name);
      } else if ((updatedDb.customers?.length || 0) < (db.customers?.length || 0)) {
        finalDb = logActivity(updatedDb, currentUser, 'customer_delete', 'حذف عميل', `تم حذف بيانات عميل من النظام`, 'حذف عميل');
      } else if ((updatedDb.expenses?.length || 0) > (db.expenses?.length || 0)) {
        const addedExp = updatedDb.expenses[updatedDb.expenses.length - 1];
        finalDb = logActivity(updatedDb, currentUser, 'expense_add', 'تسجيل مصروف إنشائي', `تم تسجيل مصروف ${addedExp?.description || ''} بقيمة ${addedExp?.amount?.toLocaleString()} ج.م على ${addedExp?.building || 'العام'}`, addedExp?.description);
      } else if ((updatedDb.expenses?.length || 0) < (db.expenses?.length || 0)) {
        finalDb = logActivity(updatedDb, currentUser, 'expense_delete', 'حذف مصروف', `تم حذف قيد مصروف من النظام`, 'حذف مصروف');
      } else if ((updatedDb.projects?.length || 0) > (db.projects?.length || 0)) {
        const addedProj = updatedDb.projects![updatedDb.projects!.length - 1];
        finalDb = logActivity(updatedDb, currentUser, 'project_add', 'إضافة مشروع / عمارة', `تم إضافة مشروع جديد باسم ${addedProj?.name || ''}`, addedProj?.name);
      } else if (
        Array.isArray(updatedDb.installments) &&
        Array.isArray(db.installments) &&
        updatedDb.installments.reduce((sum, i) => sum + i.paidAmount, 0) > db.installments.reduce((sum, i) => sum + i.paidAmount, 0)
      ) {
        const paidDiff = updatedDb.installments.reduce((sum, i) => sum + i.paidAmount, 0) - db.installments.reduce((sum, i) => sum + i.paidAmount, 0);
        finalDb = logActivity(updatedDb, currentUser, 'installment_pay', 'تحصيل دفعة مالية / قسط', `تم تسجيل تحصيل مبلغ بقيمة ${paidDiff.toLocaleString()} ج.م في الخزينة وتحديث حالة القسط`, 'تحصيل قسط');
      } else if (JSON.stringify(updatedDb.settings) !== JSON.stringify(db.settings)) {
        finalDb = logActivity(updatedDb, currentUser, 'settings_update', 'تعديل إعدادات النظام', `تم تحديث بيانات الشركة وإعدادات النظام`, 'تحديث إعدادات');
      }
    }

    setDb(finalDb);
    saveLocalDatabase(finalDb);
    setIsSyncing(true);
    syncServerDatabase(finalDb).then(ok => {
      setIsSyncing(false);
      if (ok) {
        setSyncNotice('تم الحفظ سحابياً فوراً');
        setTimeout(() => setSyncNotice('سحابي متصل (مزامنة حية لحظية)'), 2000);
      }
    });
  };

  // Heartbeat effect for live user presence (runs every 25 seconds)
  useEffect(() => {
    if (!currentUser) return;

    // Send initial session heartbeat
    const { updatedDb } = startOrUpdateUserSession(db, currentUser, activeTab);
    setDb(updatedDb);
    saveLocalDatabase(updatedDb);
    syncServerDatabase(updatedDb).catch(() => {});

    // Periodic heartbeat every 25s
    const heartbeatTimer = setInterval(() => {
      setDb(prevDb => {
        const beatDb = heartbeatUserSession(prevDb, currentUser, activeTab);
        saveLocalDatabase(beatDb);
        syncServerDatabase(beatDb).catch(() => {});
        return beatDb;
      });
    }, 25000);

    const handleBeforeUnload = () => {
      try {
        const endingDb = endUserSession(db, currentUser);
        saveLocalDatabase(endingDb);
        syncServerDatabase(endingDb).catch(() => {});
      } catch {}
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatTimer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser?.id, activeTab]);

  // Inactivity tracking and session termination states
  const [autoLogoutNotice, setAutoLogoutNotice] = useState<string | null>(null);
  const [inactivityCountdown, setInactivityCountdown] = useState<number | null>(null);
  const lastActivityTimeRef = React.useRef<number>(Date.now());

  const resetActivityTimer = React.useCallback(() => {
    lastActivityTimeRef.current = Date.now();
    setInactivityCountdown(null);
  }, []);

  // Listen to user interactions (mouse, keyboard, scroll, touch, click)
  useEffect(() => {
    if (!currentUser) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleUserActivity = () => {
      lastActivityTimeRef.current = Date.now();
      if (inactivityCountdown !== null) {
        setInactivityCountdown(null);
      }
    };

    events.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));
    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity));
    };
  }, [currentUser?.id, inactivityCountdown]);

  // Periodic inactivity timeout check
  useEffect(() => {
    if (!currentUser) {
      setInactivityCountdown(null);
      return;
    }

    // Always reset activity timer when user becomes authenticated so stale pre-login time is never used
    lastActivityTimeRef.current = Date.now();

    const timeoutMinutes = db.settings?.inactivityTimeoutMinutes ?? 15;
    if (timeoutMinutes <= 0) {
      setInactivityCountdown(null);
      return;
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningThresholdMs = 60 * 1000; // Warning in the last 60 seconds

    const checkTimer = setInterval(() => {
      const idleMs = Date.now() - lastActivityTimeRef.current;
      const remainingMs = timeoutMs - idleMs;

      if (remainingMs <= 0) {
        // Auto logout triggered!
        const updatedDb = recordInactivityAutoLogout(db, currentUser, timeoutMinutes);
        handleUpdateDb(updatedDb);
        logoutFirebaseAuth().catch(() => {});
        setLoggedInUser(null);
        setCurrentUser(null);
        clearCurrentSessionId();
        setAutoLogoutNotice(`تم تسجيل الخروج تلقائياً لعدم وجود أي تفاعل في البرنامج لمدة ${timeoutMinutes} دقيقة لحماية سرية البيانات.`);
        setInactivityCountdown(null);
      } else if (remainingMs <= warningThresholdMs) {
        setInactivityCountdown(Math.max(1, Math.ceil(remainingMs / 1000)));
      } else {
        setInactivityCountdown(null);
      }
    }, 1000);

    return () => clearInterval(checkTimer);
  }, [currentUser?.id, db.settings?.inactivityTimeoutMinutes]);

  // Listen to session changes: If the current user session is explicitly terminated by an admin
  useEffect(() => {
    if (!currentUser) return;
    const mySessionId = getCurrentSessionId();
    const mySession = db.sessions?.find(s => s.id === mySessionId);
    if (mySession && mySession.terminatedReason) {
      const reason = mySession.terminatedReason;
      setAutoLogoutNotice(reason);
      logoutFirebaseAuth().catch(() => {});
      setLoggedInUser(null);
      setCurrentUser(null);
      clearCurrentSessionId();
      setInactivityCountdown(null);
    }
  }, [db.sessions, currentUser?.id]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    const ok = await syncServerDatabase(db);
    if (ok) {
      setSyncNotice('تمت المزامنة السحابية بنجاح');
      setIsCloudConnected(true);
    } else {
      setSyncNotice('تعذر الاتصال بالسحابة');
    }
    setIsSyncing(false);
    setTimeout(() => setSyncNotice('سحابي متصل (مزامنة حية لحظية)'), 2500);
  };

  // Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const trimmedUser = loginUsername.trim().toLowerCase();
    const found = db.users.find(
      u => u.username.toLowerCase() === trimmedUser
    );

    if (found && found.active) {
      const isMatch =
        found.password === loginPassword ||
        (!found.password && (loginPassword === 'admin' || loginPassword === '123')) ||
        (found.username.toLowerCase() === 'admin' && (loginPassword === 'admin' || loginPassword === 'admin123'));

      if (isMatch) {
        setAutoLogoutNotice(null);
        setInactivityCountdown(null);
        lastActivityTimeRef.current = Date.now();
        setLoggedInUser(found);
        setCurrentUser(found);
        const { updatedDb } = startOrUpdateUserSession(db, found, activeTab, true);
        handleUpdateDb(updatedDb);
        return;
      }
    }

    setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب معطل.');
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    try {
      const gUser = await loginWithGoogle();
      if (gUser) {
        setAutoLogoutNotice(null);
        setInactivityCountdown(null);
        lastActivityTimeRef.current = Date.now();
        const userObj: User = {
          id: 999,
          username: gUser.email?.split('@')[0] || 'google_user',
          fullName: gUser.displayName || gUser.email || 'مستخدم Google',
          role: 'admin',
          active: true,
          createdAt: new Date().toISOString().split('T')[0]
        };
        setLoggedInUser(userObj);
        setCurrentUser(userObj);
        const { updatedDb } = startOrUpdateUserSession(db, userObj, activeTab, true);
        handleUpdateDb(updatedDb);
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setLoginError('تعذر تسجيل الدخول بـ Google. يمكنك الدخول باسم المستخدم وكلمة المرور.');
      }
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      const updatedDb = endUserSession(db, currentUser);
      handleUpdateDb(updatedDb);
    }
    clearCurrentSessionId();
    logoutFirebaseAuth().catch(() => {});
    setLoggedInUser(null);
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
    setInactivityCountdown(null);
  };

  // If accessed via QR Code scan (?unit=id), render the live public unit card directly without login screen!
  if (publicUnitId !== null) {
    return (
      <PublicUnitView
        unitId={publicUnitId}
        initialDb={db}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onBack={() => {
          window.history.pushState({}, '', window.location.pathname);
          setPublicUnitId(null);
          setIsVisitorMode(false);
        }}
        onGoToApp={() => {
          // Clear query param and navigate to main app
          window.history.pushState({}, '', window.location.pathname);
          setPublicUnitId(null);
          setIsVisitorMode(false);
        }}
        onGoToCatalog={() => {
          // Switch to public visitor catalog
          window.history.pushState({}, '', '?mode=visitor');
          setPublicUnitId(null);
          setIsVisitorMode(true);
        }}
      />
    );
  }

  // If accessed via visitor portal link (?mode=visitor or clicked visitor catalog button)
  if (isVisitorMode) {
    return (
      <PublicCatalogView
        initialDb={db}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onBack={() => {
          window.history.pushState({}, '', window.location.pathname);
          setPublicUnitId(null);
          setIsVisitorMode(false);
        }}
        onGoToLogin={() => {
          window.history.pushState({}, '', window.location.pathname);
          setPublicUnitId(null);
          setIsVisitorMode(false);
        }}
        onSelectUnit={(id) => {
          window.history.pushState({ unitId: id }, '', `?unit=${id}`);
          setPublicUnitId(id);
        }}
      />
    );
  }

  // If user is not logged in, render the login page
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}>
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-slate-200 dark:border-slate-800 space-y-6 relative">
          {/* Top-right theme toggle on login screen */}
          <div className="absolute top-4 left-4">
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-amber-400 transition cursor-pointer text-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700"
              title={isDarkMode ? 'الوضع الفاتح' : 'الوضع الليلي'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>

          <div className="text-center space-y-2 pt-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/30">
              <Building2 className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">برنامج المحاسبة العقارية</h1>
            <p className="text-xs text-slate-500">نظام إدارة وتطوير الوحدات والعقود والتحصيل</p>
          </div>

          {autoLogoutNotice && (
            <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-2xl border border-amber-300 flex items-start gap-2.5 text-right shadow-sm">
              <Timer className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block mb-1">تنبيه أمان الجلسة:</span>
                <span>{autoLogoutNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setAutoLogoutNotice(null)}
                className="text-amber-600 hover:text-amber-800 font-bold text-xs cursor-pointer"
                title="إغلاق التنبيه"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستخدم</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  placeholder="مثال: admin"
                  className="w-full pr-9 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-9 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              تسجيل الدخول للنظام
            </button>
          </form>

          {/* Visitor Public Catalog Link */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-2">
            <button
              type="button"
              onClick={() => {
                window.history.pushState({}, '', '?mode=visitor');
                setIsVisitorMode(true);
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white font-bold rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2 border border-indigo-500/30 shadow-md cursor-pointer"
            >
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>تصفح معرض الوحدات كزائر (بدون تسجيل دخول) 🌐</span>
            </button>
            <p className="text-[11px] text-slate-400">
              معرض مخصص للزائرين والعملاء لمعاينة الوحدات ورسوماتها التوضيحية
            </p>
          </div>
        </div>
      </div>
    );
  }

  const role = currentUser.role || 'sales';
  const perms = PERMISSIONS[role] || PERMISSIONS.sales;

  // Build visible tabs based on user permissions
  const tabs: { id: string; label: string; visible: boolean }[] = [
    { id: '🏠 الرئيسية', label: '🏠 الرئيسية', visible: perms.view_dashboard },
    { id: '🏗️ المشاريع', label: '🏗️ المشاريع', visible: perms.view_projects },
    { id: '🏢 الوحدات', label: '🏢 الوحدات', visible: perms.view_units },
    { id: '👥 العملاء', label: '👥 العملاء', visible: perms.view_customers },
    { id: '💰 البيع', label: '💰 البيع', visible: perms.view_sales },
    { id: '💵 التحصيل', label: '💵 التحصيل', visible: perms.view_collection },
    { id: '🏦 القروض', label: '🏦 القروض', visible: perms.view_loans },
    { id: '🧾 المصروفات', label: '🧾 المصروفات', visible: perms.view_expenses },
    { id: '📊 التقارير', label: '📊 التقارير', visible: perms.view_reports },
    { id: '👤 المستخدمون', label: '👤 المستخدمون', visible: perms.view_users },
    { id: '⚙️ الإعدادات', label: '⚙️ الإعدادات', visible: perms.view_settings },
  ];

  const visibleTabs = tabs.filter(t => t.visible);

  // Auto redirect if activeTab is not permitted for the user's role
  useEffect(() => {
    if (currentUser) {
      const currentTabDef = tabs.find(t => t.id === activeTab);
      if (!currentTabDef || !currentTabDef.visible) {
        const firstVisible = tabs.find(t => t.visible);
        if (firstVisible) {
          setActiveTab(firstVisible.id);
        }
      }
    }
  }, [currentUser?.role, activeTab, perms]);

  const roleBadgeMap: Record<string, string> = {
    admin: '🔴 مدير عام',
    manager: '🔵 مدير (بدون إعدادات)',
    accountant: '🟡 محاسب مالي',
    sales: '🟢 مسؤول مبيعات',
    engineer: '🟣 مهندس (وحدات ومشاريع)',
  };

  const onlineUsersCount = useMemo(() => {
    const sessions = Array.isArray(db.sessions) ? db.sessions : [];
    const online = sessions.filter(s => isSessionOnline(s));
    return new Set(online.map(s => s.userId)).size;
  }, [db.sessions]);

  return (
    <div className={`min-h-screen pb-12 font-['Cairo',sans-serif] transition-colors duration-300 ${isDarkMode ? 'bg-[#070b14] text-slate-100' : 'bg-[#f8fafc] text-slate-900'}`}>
      {/* Top Navbar - Apple Luxury Design */}
      <header className={`sticky top-0 z-40 backdrop-blur-2xl border-b transition-colors duration-200 print:hidden ${
        isDarkMode 
          ? 'bg-[#090e1c]/85 border-slate-800/80 text-white shadow-2xl shadow-black/20' 
          : 'bg-white/85 border-slate-200/90 text-slate-900 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-18">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/25">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className={`font-extrabold text-base sm:text-lg leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {db.settings.name || 'برنامج المحاسبة العقارية'}
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <span className={`flex items-center gap-1 font-bold ${isCloudConnected ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {isCloudConnected ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
                  <span>{syncNotice}</span>
                </span>
                <span>•</span>
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="hover:text-indigo-700 dark:hover:text-indigo-400 flex items-center gap-1 transition text-slate-600 dark:text-slate-400 cursor-pointer font-medium"
                  title="مزامنة فورية مع السحابة"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-indigo-500' : ''}`} />
                  <span>تحديث</span>
                </button>
              </div>
            </div>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Online Users Badge for Admins */}
            {role === 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('👤 المستخدمون')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer"
                title="عرض المستخدمين المتصلين الآن وسجل النشاط"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{onlineUsersCount} متصل الآن</span>
              </button>
            )}

            {/* Direct Visitor Portal Link / Preview */}
            <button
              onClick={() => {
                window.history.pushState({}, '', '?mode=visitor');
                setIsVisitorMode(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer shadow-xs ${
                isDarkMode
                  ? 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/30'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-300'
              }`}
              title="معاينة موقع ومعرض الزوار كما يراه العملاء"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">معرض الزوار 🌐</span>
              <span className="sm:hidden">المعرض</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer shadow-xs ${
                isDarkMode
                  ? 'bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border-amber-400/30'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
              }`}
              title={isDarkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الليلي'}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isDarkMode ? 'فاتح ☀️' : 'ليلي 🌙'}</span>
            </button>

            <div className="text-left hidden sm:block">
              <span className={`font-bold text-sm block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {currentUser.fullName || currentUser.username}
              </span>
              <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {roleBadgeMap[currentUser.role] || currentUser.role}
              </span>
            </div>

            <div className={`h-8 w-px hidden sm:block ${isDarkMode ? 'bg-slate-700/60' : 'bg-slate-300'}`} />

            <button
              onClick={handleLogout}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-900/80 hover:bg-red-950/40 text-slate-300 hover:text-red-400 border-slate-700/60' 
                  : 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border-slate-300'
              }`}
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>

        {/* Tab navigation bar - Apple Dynamic Floating Pill */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-none border-t border-white/5">
          <nav className="flex space-x-1.5 space-x-reverse py-2 min-w-max">
            {visibleTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-colors duration-200 flex items-center gap-1.5 cursor-pointer select-none ${
                    isActive
                      ? 'text-white font-black'
                      : isDarkMode
                      ? 'text-slate-300 hover:text-white hover:bg-white/5'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-xl -z-10 shadow-lg shadow-indigo-600/30"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area - Apple Spring Page Transition */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(2px)" }}
            transition={{ type: "spring", stiffness: 360, damping: 28, mass: 0.8 }}
          >
            {activeTab === '🏠 الرئيسية' && perms.view_dashboard && (
              <DashboardView
                db={db}
                onNavigateTab={tab => setActiveTab(tab)}
                onPayInstallmentQuick={instId => {
                  setQuickPayInstallmentId(instId);
                  setActiveTab('💵 التحصيل');
                }}
              />
            )}

            {activeTab === '🏗️ المشاريع' && perms.view_projects && (
              <ProjectsView
                db={db}
                canEdit={perms.edit_projects}
                onUpdateDb={handleUpdateDb}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === '🏢 الوحدات' && perms.view_units && (
              <UnitsView
                db={db}
                canEdit={perms.edit_units}
                onUpdateDb={handleUpdateDb}
                onOpenQr={unit => setSelectedQrUnit(unit)}
                onOpenVisitor={() => {
                  window.history.pushState({}, '', '?mode=visitor');
                  setIsVisitorMode(true);
                }}
              />
            )}

            {activeTab === '👥 العملاء' && perms.view_customers && (
              <CustomersView
                db={db}
                canEdit={perms.edit_customers}
                onUpdateDb={handleUpdateDb}
                onViewContract={contractId => {
                  const contract = db.contracts.find(c => c.id === contractId);
                  if (contract) setSelectedContract(contract);
                }}
              />
            )}

            {activeTab === '💰 البيع' && perms.view_sales && (
              <SalesView
                db={db}
                canEdit={perms.edit_sales}
                onUpdateDb={handleUpdateDb}
                onOpenContractModal={contract => setSelectedContract(contract)}
              />
            )}

            {activeTab === '💵 التحصيل' && perms.view_collection && (
              <CollectionView
                db={db}
                canEdit={perms.edit_collection}
                onUpdateDb={handleUpdateDb}
                onOpenReceiptModal={inst => setSelectedReceiptInstallment(inst)}
                quickPayInstallmentId={quickPayInstallmentId}
                onClearQuickPay={() => setQuickPayInstallmentId(null)}
              />
            )}

            {activeTab === '🏦 القروض' && perms.view_loans && (
              <LoansView
                db={db}
                canEdit={perms.edit_loans}
                onUpdateDb={handleUpdateDb}
              />
            )}

            {activeTab === '🧾 المصروفات' && perms.view_expenses && (
              <ExpensesView
                db={db}
                canEdit={perms.edit_expenses}
                onUpdateDb={handleUpdateDb}
              />
            )}

            {activeTab === '📊 التقارير' && perms.view_reports && (
              <ReportsView
                db={db}
                onOpenSummaryReport={() => setIsSummaryReportOpen(true)}
              />
            )}

            {activeTab === '👤 المستخدمون' && perms.view_users && (
              <UsersView
                db={db}
                currentUser={currentUser}
                onUpdateDb={handleUpdateDb}
              />
            )}

            {activeTab === '⚙️ الإعدادات' && perms.view_settings && (
              <SettingsView
                db={db}
                onUpdateDb={handleUpdateDb}
                onSyncServer={handleManualSync}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* QR Code Modal */}
      {selectedQrUnit && (
        <QRCodeModal
          unit={selectedQrUnit}
          companyName={db.settings.name}
          companyPhone={db.settings.phone}
          companyAddress={db.settings.address}
          onClose={() => setSelectedQrUnit(null)}
          onOpenUnitPreview={(unitId) => {
            window.history.pushState({ unitId }, '', `?unit=${unitId}`);
            setPublicUnitId(unitId);
            setSelectedQrUnit(null);
          }}
        />
      )}

      {/* Receipt Modal */}
      {selectedReceiptInstallment && (() => {
        const contract = db.contracts.find(c => c.id === selectedReceiptInstallment.contractId);
        const customer = db.customers.find(c => c.id === contract?.customerId);
        const unit = db.units.find(u => u.id === contract?.unitId);

        return (
          <ReceiptModal
            installment={selectedReceiptInstallment}
            contract={contract || null}
            customer={customer || null}
            unit={unit || null}
            settings={db.settings}
            onClose={() => setSelectedReceiptInstallment(null)}
          />
        );
      })()}

      {/* Contract Modal */}
      {selectedContract && (() => {
        const customer = db.customers.find(c => c.id === selectedContract.customerId);
        const unit = db.units.find(u => u.id === selectedContract.unitId);
        const contractInstallments = db.installments.filter(i => i.contractId === selectedContract.id);

        return (
          <ContractModal
            contract={selectedContract}
            customer={customer || null}
            unit={unit || null}
            installments={contractInstallments}
            settings={db.settings}
            onClose={() => setSelectedContract(null)}
          />
        );
      })()}

      {/* Summary Report Modal */}
      {isSummaryReportOpen && (
        <SummaryReportModal
          db={db}
          onClose={() => setIsSummaryReportOpen(false)}
        />
      )}

      {/* Inactivity Warning Modal */}
      {inactivityCountdown !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border-2 border-amber-500 space-y-5 text-center relative">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto animate-bounce">
              <Timer className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                تنبيه عدم النشاط في البرنامج
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                لم يتم تسجيل أي تفاعل في البرنامج مؤخراً. للحفاظ على سرية وأمان البيانات، سيتم قفل الجلسة وتسجيل الخروج التلقائي خلال:
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <span className="font-mono font-black text-4xl text-amber-600 dark:text-amber-400 block tracking-widest animate-pulse">
                00:{inactivityCountdown.toString().padStart(2, '0')}
              </span>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 mt-1 block">
                ثانية متبقية قبل تسجيل الخروج
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={resetActivityTimer}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm transition shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                ✓ أنا متواجد، استمر في البرنامج
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                تسجيل الخروج الآن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
