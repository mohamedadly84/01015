import React, { useState, useEffect, useMemo } from 'react';
import { Unit, AppDatabase, Project } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { subscribeToCloudDatabase } from '../../services/firebase';
import { getLocalDatabase } from '../../services/storage';
import { UnitFloorPlan } from '../UnitFloorPlan';
import { QRCodeModal } from '../QRCodeModal';
import { MasterPlanView } from '../MasterPlanView';
import {
  Building2, Search, Filter, Phone, MapPin, CheckCircle2,
  Clock, ShieldCheck, Download, ExternalLink, QrCode,
  Sparkles, RefreshCw, Eye, ArrowUpDown, ChevronDown,
  Layers, Home, ArrowLeft, MessageSquare, FileText, Check,
  Compass, LayoutGrid, Calendar, SlidersHorizontal, Share2,
  Maximize2, X
} from 'lucide-react';

interface Props {
  initialDb?: AppDatabase;
  onGoToLogin?: () => void;
  onSelectUnit?: (unitId: number) => void;
}

export const PublicCatalogView: React.FC<Props> = ({
  initialDb,
  onGoToLogin,
  onSelectUnit,
}) => {
  const [db, setDb] = useState<AppDatabase>(initialDb || getLocalDatabase());
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString('ar-EG'));
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastRefreshed(new Date().toLocaleTimeString('ar-EG'));
      setIsRefreshing(false);
    }, 400);
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
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>تم البيع</span>
      </span>
    );
  };

  const displayName = company.name?.trim() || 'المعرض العقاري للمشروعات والوحدات';

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Architectural Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#090e1c]/90 backdrop-blur-2xl border-b border-slate-800/90 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Real Estate Brand */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {displayName}
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-400 border border-amber-400/25">
                  بوابة الزائرين
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>المخطط العام واستعراض الوحدات المتاحة لحظياً</span>
              </p>
            </div>
          </div>

          {/* Contact & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {company.phone && (
              <a
                href={`tel:${company.phone}`}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-2xl text-xs font-bold border border-amber-500/30 transition shadow-sm"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>المبيعات: {company.phone}</span>
              </a>
            )}

            <button
              onClick={handleManualRefresh}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-800 transition"
              title="تحديث البيانات لحظياً من السحابة"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {onGoToLogin && (
              <button
                onClick={onGoToLogin}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-2xl border border-slate-800 transition flex items-center gap-1.5"
              >
                <span>دخول الإدارة</span>
                <span className="text-[10px] text-slate-500">🔒</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Presentation Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0b1022] via-[#090d19] to-[#070b14] py-12 sm:py-16 border-b border-slate-800/80">
        {/* Architectural subtle ambient background pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(#d4af37 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl text-right space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>مخطط المشروعات المعمارية والوحدات السكنية</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight">
              استكشف المخطط العام والوحدات المتاحة
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              اختر العمارة والدور لاستعراض الوحدات السكنية، مع كروكي معماري توضيحي وتوزيع المساحات لكل وحدة، واستعلام لحظي ومباشر عن حالة التوفر والتعاقد.
            </p>
          </div>

          {/* Live Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8">
            <div className="bg-slate-900/80 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-xl text-right">
              <span className="text-slate-400 text-xs block mb-1">إجمالي الوحدات المسجلة</span>
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">{totalUnits}</span>
              <span className="text-[11px] text-slate-500 mr-1">وحدة</span>
            </div>

            <div className="bg-emerald-950/20 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-emerald-500/20 shadow-xl text-right">
              <span className="text-emerald-400 text-xs font-semibold block mb-1">متاحة للبيع والتعاقد</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">{availableUnits}</span>
              <span className="text-[11px] text-emerald-500/80 mr-1">جاهزة للمعاينة</span>
            </div>

            <div className="bg-amber-950/20 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-amber-500/20 shadow-xl text-right">
              <span className="text-amber-400 text-xs font-semibold block mb-1">وحدات قيد الحجز</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">{reservedUnits}</span>
              <span className="text-[11px] text-amber-500/80 mr-1">محجوزة</span>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-xl text-right">
              <span className="text-slate-400 text-xs block mb-1">العمارات والمشاريع</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">{buildings.length}</span>
              <span className="text-[11px] text-slate-500 mr-1">عمارة / برج</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-10">
        {/* 1. SECTION: المخطط العام للعمارات (Master Site Plan) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  المخطط العام والتوزيع المعماري للعمارات
                </h3>
                <p className="text-xs text-slate-400">
                  انقر على أي عمارة في المخطط لتحديدها تلقائياً واستعراض أدوارها ووحداتها بالأسفل
                </p>
              </div>
            </div>

            {selectedBuilding !== 'الكل' && (
              <button
                onClick={() => setSelectedBuilding('الكل')}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 transition"
              >
                عرض كل العمارات
              </button>
            )}
          </div>

          {/* Master Plan Component */}
          <MasterPlanView
            buildings={buildings}
            units={units}
            projects={projects}
            masterPlanImage={company.masterPlanImage}
            selectedBuilding={selectedBuilding === 'الكل' ? (buildings[0] || '') : selectedBuilding}
            onSelectBuilding={(bName) => {
              handleSelectBuilding(bName);
              const el = document.getElementById('units-catalog-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </section>

        {/* 2. SECTION: طريقة عرض الوحدات المبسطة عبر القوائم المنسدلة (Simplified Units Navigator) */}
        <section id="units-catalog-section" className="space-y-6 pt-4">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  استعراض الوحدات السكنية (اختيار العمارة والدور)
                </h3>
                <p className="text-xs text-slate-400">
                  استخدم القائمتين المنسدلتين لتحديد العمارة والدور وعرض الوحدات المطابقة فوراً
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>الوحدات المعروضة:</span>
              <span className="font-mono font-bold text-amber-400 text-sm">{filteredUnits.length}</span>
              <span>من أصل {units.length} وحدة</span>
            </div>
          </div>

          {/* Primary Dropdowns Selector Bar (العمارة & الدور) */}
          <div className="bg-[#0b1022] p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Dropdown 1: قائمة منسدلة لاختيار العمارة */}
              <div className="md:col-span-5 space-y-1.5">
                <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>1. اختر العمارة أو المشروع:</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedBuilding}
                    onChange={e => handleSelectBuilding(e.target.value)}
                    className="w-full pr-4 pl-10 py-3 bg-[#070b14] border-2 border-slate-700/80 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-amber-400 transition cursor-pointer appearance-none shadow-inner"
                  >
                    <option value="الكل">كل العمارات والمشاريع ({buildings.length} مسجلة)</option>
                    {buildings.map(b => {
                      const count = units.filter(u => u.building === b).length;
                      const avail = units.filter(u => u.building === b && u.status === 'متاحة').length;
                      return (
                        <option key={b} value={b}>
                          {b} — ({avail} متاحة / {count} إجمالي)
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-5 h-5 text-amber-400 absolute left-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Dropdown 2: قائمة منسدلة لاختيار الدور */}
              <div className="md:col-span-4 space-y-1.5">
                <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>2. اختر الدور:</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedFloor}
                    onChange={e => setSelectedFloor(e.target.value)}
                    className="w-full pr-4 pl-10 py-3 bg-[#070b14] border-2 border-slate-700/80 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-amber-400 transition cursor-pointer appearance-none shadow-inner"
                  >
                    <option value="الكل">جميع الأدوار ({availableFloors.length} أدوار)</option>
                    {availableFloors.map(floorNum => {
                      const floorUnitsCount = units.filter(u =>
                        (selectedBuilding === 'الكل' || u.building === selectedBuilding) &&
                        u.floor === floorNum
                      ).length;
                      return (
                        <option key={floorNum} value={String(floorNum)}>
                          {formatFloorName(floorNum)} ({floorUnitsCount} وحدة)
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-5 h-5 text-amber-400 absolute left-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Status Filter Tab Dropdown */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <span>حالة التوفر:</span>
                </label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-3 bg-[#070b14] border-2 border-slate-700/80 rounded-2xl text-sm font-semibold text-slate-200 focus:outline-none focus:border-amber-400 transition cursor-pointer"
                >
                  <option value="الكل">جميع الحالات (متاحة، محجوزة، مباعة)</option>
                  <option value="متاحة">المتاحة للبيع فقط ✨</option>
                  <option value="محجوزة">المحجوزة</option>
                  <option value="مباعة">المباعة</option>
                </select>
              </div>
            </div>

            {/* Quick Interactive Floor Chips Navigator */}
            {availableFloors.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-slate-300">أزرار الانتقال السريع بين الأدوار:</span>
                  {selectedFloor !== 'الكل' && (
                    <button
                      onClick={() => setSelectedFloor('الكل')}
                      className="text-amber-400 hover:text-amber-300 font-bold"
                    >
                      إلغاء حصر الدور (عرض جميع الأدوار)
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedFloor('الكل')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      selectedFloor === 'الكل'
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    كل الأدوار
                  </button>
                  {availableFloors.map(fNum => {
                    const isFActive = selectedFloor === String(fNum);
                    return (
                      <button
                        key={fNum}
                        type="button"
                        onClick={() => setSelectedFloor(String(fNum))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          isFActive
                            ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {formatFloorName(fNum)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Secondary Search & Sorting Bar */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search text input */}
              <div className="w-full sm:w-72 relative">
                <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="ابحث برقم الوحدة..."
                  className="w-full pr-10 pl-4 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* Sort by dropdown */}
              <div className="w-full sm:w-auto flex items-center justify-end gap-2 text-xs">
                <span className="text-slate-400">ترتيب النتائج:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 bg-[#070b14] border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:border-amber-400 transition cursor-pointer"
                >
                  <option value="floor_asc">الدور: من الأرضي تصاعدياً</option>
                  <option value="price_asc">السعر: من الأقل</option>
                  <option value="price_desc">السعر: من الأعلى</option>
                  <option value="area_desc">المساحة: الأكبر أولاً</option>
                </select>
              </div>
            </div>
          </div>

          {/* Current Selection Summary Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">التصفية النشطة:</span>
              <span className="text-amber-400 font-bold">
                {selectedBuilding === 'الكل' ? 'كل العمارات' : selectedBuilding}
              </span>
              <span>•</span>
              <span className="text-amber-400 font-bold">
                {selectedFloor === 'الكل' ? 'كل الأدوار' : formatFloorName(Number(selectedFloor))}
              </span>
              {statusFilter !== 'الكل' && (
                <>
                  <span>•</span>
                  <span className="text-slate-300">حالة: {statusFilter}</span>
                </>
              )}
            </div>

            {(selectedBuilding !== 'الكل' || selectedFloor !== 'الكل' || statusFilter !== 'الكل' || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedBuilding('الكل');
                  setSelectedFloor('الكل');
                  setStatusFilter('الكل');
                  setSearchTerm('');
                }}
                className="text-slate-400 hover:text-white underline underline-offset-4"
              >
                إعادة ضبط القوائم
              </button>
            )}
          </div>

          {/* 3. UNITS GRID DISPLAY */}
          {filteredUnits.length === 0 ? (
            <div className="text-center py-16 bg-[#0b1022]/60 rounded-3xl border border-slate-800 space-y-4 p-6">
              <Building2 className="w-14 h-14 text-slate-600 mx-auto" />
              <h4 className="text-lg font-bold text-white">لا توجد وحدات مطابقة للاختيار</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {units.length === 0
                  ? 'لا توجد وحدات مسجلة حالياً في النظام. يمكنك إضافة المشروعات والوحدات من لوحة تحكم الإدارة.'
                  : 'لم يتم العثور على وحدات في العمارة والدور المحددين بهذه المعايير. يرجى اختيار دور آخر أو تغيير العمارة.'}
              </p>
              {units.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedBuilding('الكل');
                    setSelectedFloor('الكل');
                    setStatusFilter('الكل');
                    setSearchTerm('');
                  }}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs transition shadow-md shadow-amber-500/20"
                >
                  عرض جميع الوحدات المسجلة
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUnits.map(unit => {
                const rooms = unit.roomsCount || (unit.area >= 160 ? 4 : unit.area >= 120 ? 3 : 2);
                const baths = unit.bathroomsCount || (unit.area >= 140 ? 2 : 1);
                const pricePerMeter = unit.area > 0 ? Math.round(unit.price / unit.area) : 0;

                return (
                  <div
                    key={unit.id}
                    className="bg-[#0b1022] rounded-3xl border border-slate-800/90 hover:border-amber-400/50 transition-all duration-300 overflow-hidden shadow-2xl flex flex-col justify-between group hover:-translate-y-1"
                  >
                    {/* Top Header Card */}
                    <div>
                      <div className="p-4 pb-3 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
                        <div>
                          <span className="text-[11px] text-amber-400 font-bold block mb-0.5">
                            {unit.building}
                          </span>
                          <h4 className="text-xl font-black text-white font-mono flex items-center gap-2">
                            <span>وحدة #{unit.unitNumber}</span>
                            <span className="text-xs font-normal text-slate-400 font-sans">
                              ({formatFloorName(unit.floor)})
                            </span>
                          </h4>
                        </div>
                        <div>{getStatusBadge(unit.status)}</div>
                      </div>

                      {/* Floor Plan Blueprint Preview */}
                      <div className="p-3 bg-[#070b14] border-b border-slate-800/80">
                        <div className="text-[10px] text-slate-400 mb-1.5 flex items-center justify-between">
                          <span className="font-bold text-slate-300 flex items-center gap-1">
                            <span>📐 كروكي الوحدة والتوزيع:</span>
                          </span>
                          <span className="text-amber-400 font-mono font-bold">{unit.area} م²</span>
                        </div>
                        <div className="rounded-2xl overflow-hidden border border-slate-800/90 shadow-inner">
                          <UnitFloorPlan
                            unit={unit}
                            heightClass="h-44"
                            showControls={false}
                            interactive={false}
                          />
                        </div>
                      </div>

                      {/* Unit Specifications Grid */}
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2.5 bg-[#070b14] rounded-2xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block mb-0.5">المساحة</span>
                            <span className="font-bold text-white font-mono text-sm">{unit.area} م²</span>
                          </div>
                          <div className="p-2.5 bg-[#070b14] rounded-2xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block mb-0.5">الدور</span>
                            <span className="font-bold text-white text-xs">{formatFloorName(unit.floor)}</span>
                          </div>
                          <div className="p-2.5 bg-[#070b14] rounded-2xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block mb-0.5">التقسيم</span>
                            <span className="font-bold text-amber-300 text-xs">
                              {rooms} غرف · {baths} حمام
                            </span>
                          </div>
                        </div>

                        {/* Extra metadata if specified */}
                        {(unit.finishingType || unit.orientation) && (
                          <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800/60">
                            {unit.finishingType && <span>التشطيب: <strong className="text-slate-200">{unit.finishingType}</strong></span>}
                            {unit.orientation && <span>الواجهة: <strong className="text-slate-200">{unit.orientation}</strong></span>}
                          </div>
                        )}

                        {/* Price & Price per m2 */}
                        <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-950 rounded-2xl border border-amber-500/25 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-amber-400/90 block font-semibold">إجمالي السعر</span>
                            <span className="text-lg font-black text-emerald-400 font-mono">
                              {formatCurrency(unit.price)}
                            </span>
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] text-slate-400 block">سعر المتر تقريباً</span>
                            <span className="text-xs font-bold text-slate-300 font-mono">
                              {pricePerMeter > 0 ? formatCurrency(pricePerMeter) : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-4 pt-0 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Blueprint preview modal */}
                        <button
                          onClick={() => setSelectedUnitForModal(unit)}
                          className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة المخطط</span>
                        </button>

                        {/* QR Code & PDF Brochure */}
                        <button
                          onClick={() => setQrModalUnit(unit)}
                          className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-800"
                        >
                          <QrCode className="w-3.5 h-3.5 text-amber-400" />
                          <span>بروشور وQR</span>
                        </button>
                      </div>

                      {/* Direct WhatsApp Inquiry */}
                      {company.phone && (
                        <a
                          href={`https://wa.me/${company.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `مرحباً، أود الاستفسار عن تفاصيل وحجز الوحدة رقم ${unit.unitNumber} (${formatFloorName(unit.floor)}) في مشروع ${unit.building}.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2.5 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 rounded-2xl text-xs font-bold transition border border-emerald-500/30 flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>استفسار فوري عبر واتساب</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Visitor Detail Modal with High-Res Floor Plan */}
      {selectedUnitForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-[#0b1022] border border-slate-700/80 rounded-3xl max-w-2xl w-full p-6 text-right space-y-5 shadow-2xl my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold font-mono">
                  #{selectedUnitForModal.unitNumber}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    وحدة {selectedUnitForModal.unitNumber} • {selectedUnitForModal.building}
                  </h3>
                  <p className="text-xs text-slate-400">
                    المساحة: {selectedUnitForModal.area} م² • {formatFloorName(selectedUnitForModal.floor)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUnitForModal(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                ✕
              </button>
            </div>

            {/* Status Hero */}
            <div className="flex items-center justify-between p-3.5 bg-[#070b14] rounded-2xl border border-slate-800">
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">الحالة المحدثة لحظياً:</span>
                <span className="text-sm font-bold text-white">
                  {selectedUnitForModal.status === 'متاحة'
                    ? 'الوحدة متاحة للتعاقد والبيع الفوري'
                    : selectedUnitForModal.status === 'محجوزة'
                    ? 'الوحدة محجوزة حالياً'
                    : 'الوحدة مباعة ومملوكة لعميل'}
                </span>
              </div>
              <div>{getStatusBadge(selectedUnitForModal.status)}</div>
            </div>

            {/* High-res Floor Plan Drawing */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-bold flex items-center gap-1.5 text-amber-300">
                  <span>📐 الرسم الهندسي التوضيحي للوحدة (Architectural Floor Plan):</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {selectedUnitForModal.area} م²
                </span>
              </div>
              <UnitFloorPlan
                unit={selectedUnitForModal}
                heightClass="h-64 sm:h-72"
                showControls={true}
                interactive={true}
              />
            </div>

            {/* Specifications & Price */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 bg-[#070b14] rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] mb-0.5">المساحة</span>
                <span className="font-black text-white font-mono text-sm">{selectedUnitForModal.area} م²</span>
              </div>
              <div className="p-3 bg-[#070b14] rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] mb-0.5">الدور</span>
                <span className="font-black text-white text-sm">{formatFloorName(selectedUnitForModal.floor)}</span>
              </div>
              <div className="p-3 bg-[#070b14] rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] mb-0.5">التقسيم</span>
                <span className="font-bold text-slate-300">
                  {(selectedUnitForModal.roomsCount || 3)} غرف · {(selectedUnitForModal.bathroomsCount || 2)} حمام
                </span>
              </div>
              <div className="p-3 bg-emerald-950/30 rounded-2xl border border-emerald-500/20">
                <span className="text-emerald-400 block text-[10px] mb-0.5 font-bold">السعر</span>
                <span className="font-black text-emerald-400 font-mono text-sm">
                  {formatCurrency(selectedUnitForModal.price)}
                </span>
              </div>
            </div>

            {/* Actions: Open QR Brochure / Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  const targetUnit = selectedUnitForModal;
                  setSelectedUnitForModal(null);
                  setQrModalUnit(targetUnit);
                }}
                className="py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <FileText className="w-4 h-4" />
                <span>تحميل بروشور توضيحي PDF + QR</span>
              </button>

              {company.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
                >
                  <Phone className="w-4 h-4" />
                  <span>اتصل للحجز والمعاينة ({company.phone})</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code & PDF Brochure Modal */}
      {qrModalUnit && (
        <QRCodeModal
          unit={qrModalUnit}
          companyName={company.name}
          companyPhone={company.phone}
          companyAddress={company.address}
          onClose={() => setQrModalUnit(null)}
        />
      )}

      {/* Architectural Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-[#060912] py-8 text-center text-xs text-slate-500 space-y-2">
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <span>{displayName}</span>
          <span>•</span>
          <span>المخطط العام ودليل الوحدات السكنية والمعمارية</span>
        </div>
        {company.address && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>{company.address}</span>
          </div>
        )}
      </footer>
    </div>
  );
};
