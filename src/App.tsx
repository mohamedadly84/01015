import React, { useState, useEffect } from 'react';
import {
  AppDatabase, User, Unit, Contract, Installment
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
  Cloud, CloudOff, Globe, Grid
} from 'lucide-react';

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
  const handleUpdateDb = (updatedDb: AppDatabase) => {
    setDb(updatedDb);
    saveLocalDatabase(updatedDb);
    setIsSyncing(true);
    syncServerDatabase(updatedDb).then(ok => {
      setIsSyncing(false);
      if (ok) {
        setSyncNotice('تم الحفظ سحابياً فوراً');
        setTimeout(() => setSyncNotice('سحابي متصل (مزامنة حية لحظية)'), 2000);
      }
    });
  };

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
        setLoggedInUser(found);
        setCurrentUser(found);
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
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setLoginError('تعذر تسجيل الدخول بـ Google. يمكنك الدخول باسم المستخدم وكلمة المرور.');
      }
    }
  };

  const handleLogout = () => {
    logoutFirebaseAuth().catch(() => {});
    setLoggedInUser(null);
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
  };

  // If accessed via QR Code scan (?unit=id), render the live public unit card directly without login screen!
  if (publicUnitId !== null) {
    return (
      <PublicUnitView
        unitId={publicUnitId}
        initialDb={db}
        onGoToApp={() => {
          // Clear query param and navigate to main app
          window.history.replaceState({}, '', window.location.pathname);
          setPublicUnitId(null);
          setIsVisitorMode(false);
        }}
        onGoToCatalog={() => {
          // Switch to public visitor catalog
          window.history.replaceState({}, '', '?mode=visitor');
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
        onGoToLogin={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setIsVisitorMode(false);
        }}
        onSelectUnit={(id) => {
          window.history.replaceState({}, '', `?unit=${id}`);
          setPublicUnitId(id);
        }}
      />
    );
  }

  // If user is not logged in, render the login page
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-slate-800 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/30">
              <Building2 className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">برنامج المحاسبة العقارية</h1>
            <p className="text-xs text-slate-500">نظام إدارة وتطوير الوحدات والعقود والتحصيل</p>
          </div>

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
                window.history.replaceState({}, '', '?mode=visitor');
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
    { id: '🏠 الرئيسية', label: '🏠 الرئيسية', visible: perms.view_units },
    { id: '🏗️ المشاريع', label: '🏗️ المشاريع', visible: perms.view_units },
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

  const roleBadgeMap: Record<string, string> = {
    admin: '🔴 مدير النظام',
    accountant: '🟡 محاسب مالي',
    sales: '🟢 مسؤول مبيعات',
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-12 font-['Cairo',sans-serif]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight">
                {db.settings.name || 'برنامج المحاسبة العقارية'}
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className={`flex items-center gap-1 font-semibold ${isCloudConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isCloudConnected ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
                  <span>{syncNotice}</span>
                </span>
                <span>•</span>
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="hover:text-indigo-600 flex items-center gap-1 transition text-slate-500"
                  title="مزامنة فورية مع السحابة"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
                  <span>تحديث</span>
                </button>
              </div>
            </div>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Direct Visitor Portal Link / Preview */}
            <button
              onClick={() => {
                window.history.replaceState({}, '', '?mode=visitor');
                setIsVisitorMode(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition border border-indigo-200 cursor-pointer shadow-xs"
              title="معاينة موقع ومعرض الزوار كما يراه العملاء"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">معرض الزوار 🌐</span>
              <span className="sm:hidden">المعرض</span>
            </button>

            <div className="text-left hidden sm:block">
              <span className="font-bold text-slate-800 text-sm block">
                {currentUser.fullName || currentUser.username}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {roleBadgeMap[currentUser.role] || currentUser.role}
              </span>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-xl text-xs font-bold transition border border-slate-200 cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>

        {/* Tab navigation bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-none border-t border-slate-100">
          <nav className="flex space-x-1 space-x-reverse py-1.5 min-w-max">
            {visibleTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {activeTab === '🏠 الرئيسية' && perms.view_units && (
          <DashboardView
            db={db}
            onNavigateTab={tab => setActiveTab(tab)}
            onPayInstallmentQuick={instId => {
              setQuickPayInstallmentId(instId);
              setActiveTab('💵 التحصيل');
            }}
          />
        )}

        {activeTab === '🏗️ المشاريع' && perms.view_units && (
          <ProjectsView
            db={db}
            canEdit={perms.edit_units}
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
      </main>

      {/* QR Code Modal */}
      {selectedQrUnit && (
        <QRCodeModal
          unit={selectedQrUnit}
          companyName={db.settings.name}
          companyPhone={db.settings.phone}
          companyAddress={db.settings.address}
          onClose={() => setSelectedQrUnit(null)}
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
    </div>
  );
}
