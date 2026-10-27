import React, { useState, useEffect, useMemo } from 'react';
import { Unit, AppDatabase, Project } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { subscribeToCloudDatabase } from '../../services/firebase';
import { getLocalDatabase, fetchServerDatabase } from '../../services/storage';
import { UnitFloorPlan } from '../UnitFloorPlan';
import { QRCodeModal } from '../QRCodeModal';
import { MasterPlanView } from '../MasterPlanView';
import {
  Building2, Search, Filter, Phone, MapPin, CheckCircle2,
  Clock, ShieldCheck, Download, ExternalLink, QrCode,
  Sparkles, RefreshCw, Eye, ArrowUpDown, ChevronDown,
  Layers, Home, ArrowLeft, ArrowRight, MessageSquare, FileText, Check,
  Compass, LayoutGrid, Calendar, SlidersHorizontal, Share2,
  Maximize2, X, Sun, Moon, Sparkle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  initialDb?: AppDatabase;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onGoToLogin?: () => void;
  onSelectUnit?: (unitId: number) => void;
  onBack?: () => void;
}

export const PublicCatalogView: React.FC<Props> = ({
  initialDb,
  isDarkMode: externalDarkMode,
  onToggleDarkMode,
  onGoToLogin,
  onSelectUnit,
  onBack,
}) => {
  const [db, setDb] = useState<AppDatabase>(initialDb || getLocalDatabase());
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString('ar-EG'));
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Keep state synchronized with parent initialDb whenever updated
  useEffect(() => {
    if (initialDb && Array.isArray(initialDb.units)) {
      setDb(initialDb);
    }
  }, [initialDb]);

  // Internal theme fallback if not passed from parent
  const [internalDarkMode, setInternalDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hermes-theme');
      return saved ? saved === 'dark' : true;
    }
    return true;
  });

  const isDarkMode = externalDarkMode !== undefined ? externalDarkMode : internalDarkMode;

  const handleToggleTheme = () => {
    if (onToggleDarkMode) {
      onToggleDarkMode();
    } else {
      const nextMode = !internalDarkMode;
      setInternalDarkMode(nextMode);
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        const body = document.body;
        if (nextMode) {
          root.classList.remove('light-mode');
          root.classList.add('dark-mode');
          body.classList.remove('light-mode');
          body.classList.add('dark-mode');
        } else {
          root.classList.remove('dark-mode', 'dark');
          root.classList.add('light-mode');
          body.classList.remove('dark-mode', 'dark');
          body.classList.add('light-mode');
        }
        localStorage.setItem('hermes-theme', nextMode ? 'dark' : 'light');
      }
    }
  };

  // Core Filter states requested: Building dropdown & Floor dropdown
  const [selectedBuilding, setSelectedBuilding] = useState<string>('الكل');
  const [selectedFloor, setSelectedFloor] = useState<string>('الكل');
  const [statusFilter, setStatusFilter] = useState<string>('الكل');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'area_desc' | 'floor_asc'>('floor_asc');

  // Modals state
  const [selectedUnitForModal, setSelectedUnitForModal] = useState<Unit | null>(null);
  const [qrModalUnit, setQrModalUnit] = useState<Unit | null>(null);

  // Subscribe to live Firestore updates
  useEffect(() => {
    const unsubscribe = subscribeToCloudDatabase(
      (cloudData) => {
        if (cloudData && Array.isArray(cloudData.units)) {
          setDb(cloudData);
          setLastRefreshed(new Date().toLocaleTimeString('ar-EG'));
        }
      },
      (err) => {
        console.warn('Catalog live sync warning:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  const company = db.settings || { name: '', phone: '', taxNumber: '', address: '', currency: 'ج.م' };
  const units = db.units || [];
  const projects = db.projects || [];

  // Extract unique building names from registered projects and units
  const buildings = useMemo(() => {
    const names = new Set<string>();
    projects.forEach(p => {
      if (p.name && p.name.trim()) names.add(p.name.trim());
    });
    units.forEach(u => {
      if (u.building && u.building.trim()) names.add(u.building.trim());
    });
    return Array.from(names);
  }, [projects, units]);

  // Extract available floors for the currently selected building (or all buildings)
  const availableFloors = useMemo(() => {
    const filteredForFloors = selectedBuilding === 'الكل'
      ? units
      : units.filter(u => u.building === selectedBuilding);

    const floorNumbers = Array.from(new Set(filteredForFloors.map(u => u.floor))).sort((a, b) => a - b);
    return floorNumbers;
  }, [units, selectedBuilding]);

  // When changing building, if currently selected floor is not in the new building, reset to 'الكل'
  const handleSelectBuilding = (newBuilding: string) => {
    setSelectedBuilding(newBuilding);
    if (newBuilding !== 'الكل') {
      const bUnits = units.filter(u => u.building === newBuilding);
      const bFloors = new Set(bUnits.map(u => u.floor));
      if (selectedFloor !== 'الكل' && !bFloors.has(Number(selectedFloor))) {
        setSelectedFloor('الكل');
      }
    }
  };

  // Scroll to units list when building is selected from master plan
  const handleSelectBuildingFromMasterPlan = (bName: string) => {
    handleSelectBuilding(bName);
    const element = document.getElementById('units-catalog-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Filtered & sorted units
  const filteredUnits = useMemo(() => {
    return units
      .filter(u => {
        // Building dropdown match
        const matchesBuilding = selectedBuilding === 'الكل' || u.building === selectedBuilding;

        // Floor dropdown match
        const matchesFloor = selectedFloor === 'الكل' || String(u.floor) === String(selectedFloor);

        // Status filter match
        const matchesStatus = statusFilter === 'الكل' || u.status === statusFilter;

        // Search text match
        const matchesSearch =
          !searchTerm.trim() ||
          u.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.building.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesBuilding && matchesFloor && matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'area_desc') return b.area - a.area;
        if (sortBy === 'floor_asc') {
          if (a.floor !== b.floor) return a.floor - b.floor;
          return a.unitNumber.localeCompare(b.unitNumber);
        }
        return 0;
      });
  }, [units, selectedBuilding, selectedFloor, statusFilter, searchTerm, sortBy]);

  // Real summary metrics calculated strictly from real data
  const totalUnits = units.length;
  const availableUnits = units.filter(u => u.status === 'متاحة').length;
  const reservedUnits = units.filter(u => u.status === 'محجوزة').length;
  const soldUnits = units.filter(u => u.status === 'مباعة').length;

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const serverData = await fetchServerDatabase();
      if (serverData && Array.isArray(serverData.units)) {
        setDb(serverData);
      }
    } catch {}
    setLastRefreshed(new Date().toLocaleTimeString('ar-EG'));
    setIsRefreshing(false);
  };

  const formatFloorName = (floorNum: number) => {
    if (floorNum === 0) return 'الدور الأرضي';
    if (floorNum === 1) return 'الدور الأول';
    if (floorNum === 2) return 'الدور الثاني';
    if (floorNum === 3) return 'الدور الثالث';
    if (floorNum === 4) return 'الدور الرابع';
    if (floorNum === 5) return 'الدور الخامس';
    if (floorNum === 6) return 'الدور السادس';
    if (floorNum === 7) return 'الدور السابع';
    if (floorNum === 8) return 'الدور الثامن';
    if (floorNum === 9) return 'الدور التاسع';
    if (floorNum === 10) return 'الدور العاشر';
    if (floorNum < 0) return `بدروم (${floorNum})`;
    return `الدور ${floorNum}`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'متاحة') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>متاحة للبيع</span>
        </span>
      );
    }
    if (status === 'محجوزة') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5" />
          <span>محجوزة حالياً</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>تم البيع</span>
      </span>
    );
  };

  const displayName = company.name?.trim() || 'المعرض العقاري للمشروعات والوحدات';

  // Construct WhatsApp inquiry link tailored for sold vs available units
  const getWhatsAppLink = (u: Unit) => {
    const phone = company.phone ? company.phone.replace(/[^0-9]/g, '') : '';
    const text = u.status === 'مباعة'
      ? `مرحباً، اطلعت على الوحدة رقم (${u.unitNumber}) في مشروع (${u.building}) في معرضكم ووجدتها مباعة، وأود الاستفسار عن الوحدات المتاحة الأخرى أو البدائل المشابهة لديكم في هذا المشروع أو المشاريع الأخرى.`
      : u.status === 'محجوزة'
      ? `مرحباً، أود الاستفسار عن الوحدة رقم (${u.unitNumber}) في مشروع (${u.building}) - ${formatFloorName(u.floor)}، المسجلة كـ (محجوزة)، لمعرفة إمكانية الحجز أو البدائل المتاحة.`
      : `مرحباً، أود الاستفسار عن تفاصيل وحجز الوحدة رقم (${u.unitNumber}) في مشروع (${u.building}) - ${formatFloorName(u.floor)}، المساحة ${u.area} م² المعروضة في موقعكم.`;
    return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const hasActiveFilters = selectedBuilding !== 'الكل' || selectedFloor !== 'الكل' || statusFilter !== 'الكل' || searchTerm.trim() !== '';

  const handleResetFilters = () => {
    setSelectedBuilding('الكل');
    setSelectedFloor('الكل');
    setStatusFilter('الكل');
    setSearchTerm('');
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-[#070b14] text-slate-100 selection:bg-amber-500 selection:text-slate-950' 
        : 'bg-[#f8fafc] text-slate-900 selection:bg-indigo-500 selection:text-white'
    }`}>
      {/* Top Architectural Navigation Bar */}
      <header className={`sticky top-0 z-40 backdrop-blur-2xl border-b transition-colors shadow-md ${
        isDarkMode
          ? 'bg-[#090e1c]/98 border-slate-800/90 text-white'
          : 'bg-white/98 border-slate-200/90 text-slate-900'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-0 min-h-[4.25rem] sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Real Estate Brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {(onBack || onGoToLogin) && (
              <button
                type="button"
                onClick={() => {
                  if (onBack) {
                    onBack();
                  } else if (typeof window !== 'undefined' && window.history.length > 1) {
                    window.history.back();
                  } else if (onGoToLogin) {
                    onGoToLogin();
                  }
                }}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs shrink-0 ${
                  isDarkMode
                    ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
                title="الرجوع للصفحة السابقة"
              >
                <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
                <span>رجوع</span>
              </button>
            )}

            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className={`text-sm sm:text-base md:text-lg font-black tracking-tight truncate max-w-[170px] sm:max-w-xs md:max-w-md ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`} title={displayName}>
                  {displayName}
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30 shrink-0">
                  بوابة الزائرين
                </span>
              </div>
              <p className={`text-[10px] sm:text-[11px] items-center gap-1.5 mt-0.5 hidden xs:flex truncate ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="truncate">المخطط العام واستعراض الوحدات المتاحة لحظياً</span>
              </p>
            </div>
          </div>

          {/* Contact & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {company.phone && (
              <a
                href={`tel:${company.phone}`}
                className={`hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border transition shadow-xs ${
                  isDarkMode
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                }`}
              >
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                <span>المبيعات: {company.phone}</span>
              </a>
            )}

            {/* Theme Toggle Button (Dark / Light) */}
            <button
              onClick={handleToggleTheme}
              className={`p-2.5 rounded-2xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                isDarkMode
                  ? 'bg-amber-400/15 hover:bg-amber-400/25 text-amber-400 border-amber-400/30'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
              }`}
              title={isDarkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الليلي'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-amber-600" />}
              <span className="hidden md:inline">{isDarkMode ? 'فاتح ☀️' : 'ليلي 🌙'}</span>
            </button>

            {/* Manual Sync / Refresh Button */}
            <button
              onClick={handleManualRefresh}
              className={`p-2.5 rounded-2xl border transition cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
              }`}
              title="تحديث البيانات لحظياً من السحابة"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
            </button>

            {/* Go to Login Button */}
            {onGoToLogin && (
              <button
                onClick={onGoToLogin}
                className={`px-4 py-2.5 text-xs font-bold rounded-2xl border transition flex items-center gap-1.5 cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                }`}
              >
                <span>دخول الإدارة</span>
                <span className="text-[10px] opacity-75">🔒</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section - Executive Real Estate Aesthetic */}
      <section className={`relative overflow-hidden border-b transition-colors ${
        isDarkMode
          ? 'bg-gradient-to-b from-[#080d16] via-[#0a1122] to-[#040811] border-slate-800/60'
          : 'bg-gradient-to-b from-white via-slate-50 to-slate-100 border-slate-200'
      }`}>
        {/* Subtle ambient lighting */}
        <div className="absolute top-[-40px] left-[-40px] w-[300px] h-[300px] rounded-full bg-gradient-to-br from-amber-500/10 to-transparent blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[-60px] w-[350px] h-[350px] rounded-full bg-gradient-to-tl from-indigo-500/10 to-transparent blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative z-10">
          <div className="max-w-3xl space-y-4 text-right">
            <div className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border text-[11px] font-extrabold tracking-wide uppercase shadow-xs ${
              isDarkMode
                ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <Compass className="w-4 h-4 text-amber-500" />
              <span>مخطط المشروعات المعمارية والوحدات السكنية</span>
            </div>
            
            <h2 className={`text-3xl sm:text-5xl font-black leading-[1.1] tracking-tight ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              استكشف المخطط العام <br />
              <span className={isDarkMode ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-cyan-300 bg-clip-text text-transparent' : 'text-indigo-600'}>
                والوحدات المتاحة
              </span>
            </h2>

            <p className={`text-sm sm:text-base leading-relaxed max-w-2xl font-normal ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              اختر العمارة والدور من القوائم المنسدلة بالأسفل لاستعراض كافة الوحدات السكنية، مع كروكي معماري توضيحي وتوزيع المساحات لكل وحدة، واستعلام لحظي ومباشر عن حالة التوفر والتعاقد.
            </p>
          </div>
        </div>
      </section>

      {/* Summary Metrics Bar - Apple Motion */}
      <motion.section 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="glass-panel p-4 sm:p-5 rounded-3xl text-center border shadow-xl transition-transform hover:scale-[1.02]">
            <span className={`text-[11px] block mb-1 font-bold tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              إجمالي الوحدات
            </span>
            <span className={`text-3xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {totalUnits}
            </span>
          </div>

          <div className="glass-panel p-4 sm:p-5 rounded-3xl text-center border border-emerald-500/20 shadow-xl transition-transform hover:scale-[1.02]">
            <span className="text-[11px] text-emerald-500 block mb-1 font-bold tracking-wider">
              متاحة للبيع
            </span>
            <span className="text-3xl font-black text-emerald-500 font-mono">
              {availableUnits}
            </span>
          </div>

          <div className="glass-panel p-4 sm:p-5 rounded-3xl text-center border border-amber-500/20 shadow-xl transition-transform hover:scale-[1.02]">
            <span className="text-[11px] text-amber-500 block mb-1 font-bold tracking-wider">
              قيد الحجز
            </span>
            <span className="text-3xl font-black text-amber-500 font-mono">
              {reservedUnits}
            </span>
          </div>

          <div className="glass-panel p-4 sm:p-5 rounded-3xl text-center border border-indigo-500/20 shadow-xl transition-transform hover:scale-[1.02]">
            <span className="text-[11px] text-indigo-500 block mb-1 font-bold tracking-wider">
              العمارات المسجلة
            </span>
            <span className="text-3xl font-black text-indigo-500 font-mono">
              {buildings.length}
            </span>
          </div>
        </div>
      </motion.section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-10">
        
        {/* 1. SECTION: المخطط العام للعمارات (Master Site Plan) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-lg sm:text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  المخطط العام والتوزيع المعماري للعمارات
                </h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  انقر على أي عمارة في المخطط لتحديدها تلقائياً واستعراض أدوارها ووحداتها بالأسفل
                </p>
              </div>
            </div>

            {selectedBuilding !== 'الكل' && (
              <button
                onClick={() => handleSelectBuilding('الكل')}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-slate-700'
                    : 'bg-white hover:bg-slate-100 text-amber-800 border-slate-300 shadow-xs'
                }`}
              >
                <span>عرض كل العمارات ({buildings.length})</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Master Plan Visualizer Component */}
          <MasterPlanView
            buildings={buildings}
            units={units}
            projects={projects}
            masterPlanImage={company.masterPlanImage}
            selectedBuilding={selectedBuilding}
            onSelectBuilding={handleSelectBuildingFromMasterPlan}
          />
        </section>

        {/* 2. SECTION: أدوات الفلترة الذكية (قوائم منسدلة لاختيار العمارة والدور) */}
        <section id="units-catalog-section" className="space-y-4">
          <div className="p-6 rounded-3xl glass-panel border shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-200/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500 font-bold">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-lg font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    اختيار العمارة والدور والوحدات
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    حدد العمارة ثم اختر الدور لعرض الوحدات المتاحة فوراً
                  </p>
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto ${
                    isDarkMode
                      ? 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة ضبط الفلاتر</span>
                </button>
              )}
            </div>

            {/* Dropdown Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Building Dropdown (قائمة منسدلة لاختيار العمارة) */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  🏢 اختيار العمارة / المشروع:
                </label>
                <div className="relative">
                  <select
                    value={selectedBuilding}
                    onChange={(e) => handleSelectBuilding(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border text-sm font-bold appearance-none transition focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                  >
                    <option value="الكل">كل العمارات ({buildings.length} عمارة • {units.length} وحدة)</option>
                    {buildings.map((bName) => {
                      const count = units.filter(u => u.building === bName).length;
                      const avail = units.filter(u => u.building === bName && u.status === 'متاحة').length;
                      return (
                        <option key={bName} value={bName}>
                          عمارة: {bName} ({count} وحدة • {avail} متاحة)
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* 2. Floor Dropdown (قائمة منسدلة لاختيار الدور) */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  📐 اختيار الدور:
                </label>
                <div className="relative">
                  <select
                    value={selectedFloor}
                    onChange={(e) => setSelectedFloor(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border text-sm font-bold appearance-none transition focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                  >
                    <option value="الكل">
                      {selectedBuilding === 'الكل' ? 'كل الأدوار في كافة العمارات' : `كل أدوار عمارة ${selectedBuilding}`}
                    </option>
                    {availableFloors.map((floorNum) => {
                      const floorUnits = units.filter(u => 
                        (selectedBuilding === 'الكل' || u.building === selectedBuilding) && 
                        u.floor === floorNum
                      );
                      const availInFloor = floorUnits.filter(u => u.status === 'متاحة').length;
                      return (
                        <option key={floorNum} value={String(floorNum)}>
                          {formatFloorName(floorNum)} ({floorUnits.length} وحدة • {availInFloor} متاحة)
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* 3. Search & Sort */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  🔍 بحث سريع أو ترتيب:
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="رقم الوحدة، العمارة..."
                      className="w-full pr-10 pl-3 py-3 rounded-2xl border text-sm font-medium transition focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-3 rounded-2xl border text-xs font-bold appearance-none transition focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer shrink-0"
                    title="ترتيب النتائج"
                  >
                    <option value="floor_asc">ترتيب: الدور</option>
                    <option value="price_asc">السعر: الأقل أولاً</option>
                    <option value="price_desc">السعر: الأعلى أولاً</option>
                    <option value="area_desc">المساحة: الأكبر أولاً</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Status Pills */}
            <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-slate-200/20">
              <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                حالة التوفر:
              </span>
              {(['الكل', 'متاحة', 'محجوزة', 'مباعة'] as const).map((status) => {
                const count = status === 'الكل'
                  ? units.filter(u => (selectedBuilding === 'الكل' || u.building === selectedBuilding) && (selectedFloor === 'الكل' || String(u.floor) === String(selectedFloor))).length
                  : units.filter(u => (selectedBuilding === 'الكل' || u.building === selectedBuilding) && (selectedFloor === 'الكل' || String(u.floor) === String(selectedFloor)) && u.status === status).length;

                const isSelected = statusFilter === status;

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                        : isDarkMode
                          ? 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                    }`}
                  >
                    <span>{status === 'الكل' ? 'جميع الحالات' : status}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/10 font-mono">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. SECTION: عرض الوحدات المعمارية (Units Presentation) */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-200/20">
            <div>
              <h3 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                الوحدات المعروضة
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {selectedBuilding !== 'الكل' ? `عمارة: ${selectedBuilding} • ` : ''}
                {selectedFloor !== 'الكل' ? `${formatFloorName(Number(selectedFloor))} • ` : ''}
                تم العثور على ({filteredUnits.length}) وحدة مطابقة
              </p>
            </div>
          </div>

          {/* Units Grid - Apple Staggered Spring Animation */}
          {filteredUnits.length > 0 ? (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence>
                {filteredUnits.map((u, index) => {
                  const rooms = u.roomsCount || (u.area >= 160 ? 4 : u.area >= 120 ? 3 : 2);
                  const baths = u.bathroomsCount || (u.area >= 140 ? 2 : 1);
                  const pricePerM2 = u.area > 0 ? Math.round(u.price / u.area) : 0;

                  return (
                    <motion.div
                      key={u.id}
                      layout
                      initial={{ opacity: 0, y: 22, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 26,
                        delay: Math.min(index * 0.04, 0.35)
                      }}
                      whileHover={{ y: -6, transition: { duration: 0.2 } }}
                      className="glass-card rounded-3xl p-5 border shadow-xl flex flex-col justify-between group relative overflow-hidden"
                    >
                    {/* Top Card Bar: Building & Unit Number & Status */}
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {u.imageUrl && (
                            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-amber-500/30 bg-slate-800 shrink-0 shadow-md">
                              <img
                                src={u.imageUrl}
                                alt={`وحدة ${u.unitNumber}`}
                                className="w-full h-full object-cover"
                                onError={e => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className={`text-[11px] font-bold block truncate ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                              {u.building}
                            </span>
                            <h4 className={`text-2xl font-black font-mono tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              وحدة {u.unitNumber}
                            </h4>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {getStatusBadge(u.status)}
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border ${
                            isDarkMode 
                              ? 'bg-slate-800 text-slate-300 border-slate-700' 
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}>
                            {formatFloorName(u.floor)}
                          </span>
                        </div>
                      </div>

                      {/* Floor Plan Vector Drawing Thumbnail */}
                      <div 
                        onClick={() => setSelectedUnitForModal(u)}
                        className={`rounded-2xl p-2 border cursor-pointer relative overflow-hidden transition group-hover:border-amber-500/40 ${
                          isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                        title="انقر لتكبير ومعاينة المخطط الهندسي"
                      >
                        <UnitFloorPlan
                          unit={u}
                          heightClass="h-44"
                          showControls={false}
                          interactive={false}
                        />
                        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                          <Eye className="w-4 h-4 text-amber-400" />
                          <span>معاينة تفاصيل المخطط</span>
                        </div>
                      </div>

                      {/* Specifications Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className={`p-2.5 rounded-xl border ${
                          isDarkMode ? 'bg-slate-900/60 border-slate-800/80 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                          <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>المساحة</span>
                          <span className={`text-base font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {u.area} م²
                          </span>
                        </div>

                        <div className={`p-2.5 rounded-xl border ${
                          isDarkMode ? 'bg-slate-900/60 border-slate-800/80 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                          <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>التقسيم</span>
                          <span className={`text-xs font-bold block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {rooms} غرف • {baths} حمام
                          </span>
                        </div>

                        <div className={`p-2.5 rounded-xl border ${
                          isDarkMode ? 'bg-slate-900/60 border-slate-800/80 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                          <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>التشطيب</span>
                          <span className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {u.finishingType || 'سوبر لوكس'}
                          </span>
                        </div>

                        <div className={`p-2.5 rounded-xl border ${
                          isDarkMode ? 'bg-slate-900/60 border-slate-800/80 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                          <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>الواجهة</span>
                          <span className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {u.orientation || 'بحري'}
                          </span>
                        </div>
                      </div>

                      {/* Price Section */}
                      <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                        isDarkMode
                          ? 'bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-500/10 border-amber-500/20'
                          : 'bg-gradient-to-r from-amber-50 via-white to-indigo-50 border-slate-200'
                      }`}>
                        <div>
                          <span className={`text-[10px] block font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                            السعر الإجمالي
                          </span>
                          <span className={`text-xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {formatCurrency(u.price)}
                          </span>
                        </div>
                        {pricePerM2 > 0 && (
                          <div className="text-left">
                            <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>سعر المتر</span>
                            <span className={`text-xs font-bold font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                              {formatCurrency(pricePerM2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 mt-4 border-t border-slate-200/20 flex flex-col gap-2">
                      {onSelectUnit && (
                        <button
                          type="button"
                          onClick={() => onSelectUnit(u.id)}
                          className="w-full py-2.5 px-3 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>عرض تفاصيل ومواصفات الوحدة</span>
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedUnitForModal(u)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            isDarkMode
                              ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-700'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-500" />
                          <span>معاينة المخطط</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setQrModalUnit(u)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            isDarkMode
                              ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-700'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                          }`}
                        >
                          <QrCode className="w-3.5 h-3.5 text-indigo-500" />
                          <span>البروشور وQR</span>
                        </button>
                      </div>

                      <a
                        href={getWhatsAppLink(u)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                          u.status === 'مباعة'
                            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-teal-600/20'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>
                          {u.status === 'مباعة'
                            ? 'استعلام عن وحدات أخرى متاحة عبر واتساب'
                            : u.status === 'محجوزة'
                            ? 'استفسار عن إمكانية الحجز والبدائل'
                            : 'استفسار واتساب مباشر عن الوحدة'}
                        </span>
                      </a>
                    </div>
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="glass-panel p-12 rounded-3xl text-center border shadow-xl space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
                {units.length === 0 ? <Building2 className="w-8 h-8" /> : <Search className="w-8 h-8" />}
              </div>
              <h4 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {units.length === 0 ? 'مرحباً بك في المعرض العقاري' : 'لا توجد وحدات مطابقة للخيارات المحددة'}
              </h4>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {units.length === 0 
                  ? 'لم يتم تسجيل أي وحدات معمارية بعد. ستظهر كافة الوحدات السكنية والمخططات هنا تلقائياً فور إضافتها من لوحة إدارة المشروع.'
                  : 'جرب تغيير العمارة أو الدور أو مسح نص البحث لاستعراض باقي الوحدات المتاحة في المعرض.'}
              </p>
              {units.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  عرض كافة الوحدات والعمارات
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Modern Luxury Footer */}
      <footer className={`border-t py-10 transition-colors ${
        isDarkMode ? 'bg-[#050811] border-slate-800/80 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className={`font-black text-sm block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {displayName}
              </span>
              <span className="text-[11px] opacity-75">
                نظام إدارة وتسويق الوحدات العقارية المتكامل
              </span>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-4 text-xs font-semibold">
            {company.phone && (
              <a href={`tel:${company.phone}`} className="hover:text-amber-500 transition flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                <span>اتصال بالمبيعات: {company.phone}</span>
              </a>
            )}
            {company.address && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>{company.address}</span>
              </span>
            )}
          </div>

          <div className="text-[11px] opacity-75">
            آخر تحديث لحظي للبيانات: {lastRefreshed}
          </div>
        </div>
      </footer>

      {/* Detailed Unit Modal (معاينة الوحدة والمخطط الهندسي التفاعلي) */}
      {selectedUnitForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className={`rounded-3xl border shadow-2xl max-w-3xl w-full p-6 space-y-5 my-8 transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-slate-200/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    وحدة رقم {selectedUnitForModal.unitNumber} - عمارة {selectedUnitForModal.building}
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {formatFloorName(selectedUnitForModal.floor)} • المساحة: {selectedUnitForModal.area} م²
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUnitForModal(null)}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Interactive Vector Floor Plan Preview */}
            <div className={`p-4 rounded-2xl border ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-amber-500 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  <span>المخطط الهندسي المعماري للوحدة</span>
                </span>
                <span className="font-mono text-emerald-500">{selectedUnitForModal.status}</span>
              </div>
              <UnitFloorPlan
                unit={selectedUnitForModal}
                heightClass="h-72 sm:h-80"
                showControls={true}
                interactive={true}
              />
            </div>

            {/* Specifications Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 block mb-0.5">المساحة الإجمالية</span>
                <span className="text-lg font-black font-mono">{selectedUnitForModal.area} م²</span>
              </div>
              <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 block mb-0.5">الدور</span>
                <span className="text-sm font-bold">{formatFloorName(selectedUnitForModal.floor)}</span>
              </div>
              <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 block mb-0.5">الغرف والحمامات</span>
                <span className="text-sm font-bold">
                  {(selectedUnitForModal.roomsCount || 3)} غرف • {(selectedUnitForModal.bathroomsCount || 2)} حمام
                </span>
              </div>
              <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 block mb-0.5">السعر المعلن</span>
                <span className="text-lg font-black font-mono text-emerald-500">
                  {formatCurrency(selectedUnitForModal.price)}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200/20">
              <button
                type="button"
                onClick={() => {
                  const target = selectedUnitForModal;
                  setSelectedUnitForModal(null);
                  setQrModalUnit(target);
                }}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                  isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
              >
                <QrCode className="w-4 h-4 text-indigo-500" />
                <span>توليد كود QR وبروشور الوحدة</span>
              </button>

              <a
                href={getWhatsAppLink(selectedUnitForModal)}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full sm:w-auto px-6 py-2.5 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                  selectedUnitForModal.status === 'مباعة'
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-teal-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>
                  {selectedUnitForModal.status === 'مباعة'
                    ? 'استعلام عن وحدات أخرى متاحة عبر واتساب'
                    : selectedUnitForModal.status === 'محجوزة'
                    ? 'استفسار عن إمكانية الحجز والبدائل'
                    : 'حجز أو استفسار عبر واتساب'}
                </span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Brochure Modal */}
      {qrModalUnit && (
        <QRCodeModal
          unit={qrModalUnit}
          companyName={company.name}
          companyPhone={company.phone}
          companyAddress={company.address}
          onClose={() => setQrModalUnit(null)}
        />
      )}
    </div>
  );
};
