import React, { useState, useEffect, useMemo } from 'react';
import { AppDatabase, Unit, UnitStatus, Project } from '../../types';
import {
  formatCurrency, formatNumber, downloadCSV,
  getBuildingList, calculateBuildingMetrics
} from '../../utils/helpers';
import { UnitFloorPlan } from '../UnitFloorPlan';
import {
  Building, Plus, Search, Filter, QrCode, Trash2, Edit2, Download,
  CheckCircle, AlertCircle, Eye, Calculator, Sparkles, Globe,
  Compass, FileText, Upload, X, Copy, Check, Image as ImageIcon, Link as LinkIcon,
  RotateCcw, ArrowUpDown, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  db: AppDatabase;
  canEdit: boolean;
  onUpdateDb: (updated: AppDatabase) => void;
  onOpenQr: (unit: Unit) => void;
  onOpenVisitor?: () => void;
  initialBuildingFilter?: string;
}

export const UnitsView: React.FC<Props> = ({
  db,
  canEdit,
  onUpdateDb,
  onOpenQr,
  onOpenVisitor,
  initialBuildingFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBuilding, setFilterBuilding] = useState(initialBuildingFilter || 'الكل');
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [filterFloor, setFilterFloor] = useState('الكل');
  const [sortBy, setSortBy] = useState<'unit_asc' | 'floor_asc' | 'area_desc' | 'price_asc' | 'price_desc'>('unit_asc');

  useEffect(() => {
    if (initialBuildingFilter) {
      setFilterBuilding(initialBuildingFilter);
    }
  }, [initialBuildingFilter]);

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);

  const [formUnitNumber, setFormUnitNumber] = useState('');
  const [formBuilding, setFormBuilding] = useState('');
  const [isAddingCustomBuilding, setIsAddingCustomBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');

  const [formFloor, setFormFloor] = useState<number>(1);
  const [formArea, setFormArea] = useState<number>(120);
  const [formPrice, setFormPrice] = useState<number>(1500000);
  const [formStatus, setFormStatus] = useState<UnitStatus>('متاحة');
  const [formRoomsCount, setFormRoomsCount] = useState<number>(3);
  const [formBathroomsCount, setFormBathroomsCount] = useState<number>(2);
  const [formBalconiesCount, setFormBalconiesCount] = useState<number>(1);
  const [formFinishingType, setFormFinishingType] = useState<string>('سوبر لوكس');
  const [formOrientation, setFormOrientation] = useState<string>('بحري');
  const [formFloorPlanImage, setFormFloorPlanImage] = useState<string>('');
  const [formImageUrl, setFormImageUrl] = useState<string>('');
  const [formError, setFormError] = useState('');

  // Blueprint / Floor Plan quick preview modal
  const [previewFloorPlanUnit, setPreviewFloorPlanUnit] = useState<Unit | null>(null);
  const [copiedCatalog, setCopiedCatalog] = useState(false);

  // Extract unique buildings from registered projects, units and expenses
  const buildings = getBuildingList(db);
  const unitsList = useMemo(() => (Array.isArray(db.units) ? db.units : []), [db.units]);
  const contractsList = useMemo(() => (Array.isArray(db.contracts) ? db.contracts : []), [db.contracts]);

  // Available floors based on selected project/building
  const availableFloors = useMemo(() => {
    const relevantUnits = filterBuilding === 'الكل'
      ? unitsList
      : unitsList.filter(u => u.building === filterBuilding);
    return Array.from(new Set(relevantUnits.map(u => u.floor))).sort((a, b) => a - b);
  }, [unitsList, filterBuilding]);

  // Status counts for current project filter
  const statusCounts = useMemo(() => {
    const baseUnits = filterBuilding === 'الكل'
      ? unitsList
      : unitsList.filter(u => u.building === filterBuilding);
    return {
      all: baseUnits.length,
      available: baseUnits.filter(u => u.status === 'متاحة').length,
      reserved: baseUnits.filter(u => u.status === 'محجوزة').length,
      sold: baseUnits.filter(u => u.status === 'مباعة').length,
    };
  }, [unitsList, filterBuilding]);

  const hasActiveFilters = searchTerm.trim() !== '' || filterBuilding !== 'الكل' || filterStatus !== 'الكل' || filterFloor !== 'الكل';

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterBuilding('الكل');
    setFilterStatus('الكل');
    setFilterFloor('الكل');
    setSortBy('unit_asc');
  };

  const filteredUnits = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return unitsList
      .filter(u => {
        const matchesSearch =
          !q ||
          (u.unitNumber || '').toLowerCase().includes(q) ||
          (u.building || '').toLowerCase().includes(q) ||
          String(u.floor ?? '').includes(q) ||
          (u.finishingType && u.finishingType.toLowerCase().includes(q)) ||
          (u.orientation && u.orientation.toLowerCase().includes(q));
        const matchesBuilding = filterBuilding === 'الكل' || u.building === filterBuilding;
        const matchesStatus = filterStatus === 'الكل' || u.status === filterStatus;
        const matchesFloor = filterFloor === 'الكل' || String(u.floor) === String(filterFloor);
        return matchesSearch && matchesBuilding && matchesStatus && matchesFloor;
      })
      .sort((a, b) => {
        if (sortBy === 'floor_asc') return a.floor - b.floor || (a.unitNumber || '').localeCompare(b.unitNumber || '', undefined, { numeric: true });
        if (sortBy === 'area_desc') return b.area - a.area;
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        return (a.unitNumber || '').localeCompare(b.unitNumber || '', undefined, { numeric: true });
      });
  }, [unitsList, searchTerm, filterBuilding, filterStatus, filterFloor, sortBy]);

  const resetForm = () => {
    setEditingUnitId(null);
    setFormUnitNumber('');
    setFormBuilding(buildings[0] || '');
    setIsAddingCustomBuilding(false);
    setNewBuildingName('');
    setFormFloor(1);
    setFormArea(120);
    setFormPrice(1500000);
    setFormStatus('متاحة');
    setFormRoomsCount(3);
    setFormBathroomsCount(2);
    setFormBalconiesCount(1);
    setFormFinishingType('سوبر لوكس');
    setFormOrientation('بحري');
    setFormFloorPlanImage('');
    setFormImageUrl('');
    setFormError('');
    setIsFormOpen(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    if (buildings.length > 0) {
      setFormBuilding(buildings[0]);
    } else {
      setIsAddingCustomBuilding(true);
    }
    setIsFormOpen(true);
  };

  const handleOpenEdit = (unit: Unit) => {
    setEditingUnitId(unit.id);
    setFormUnitNumber(unit.unitNumber);
    setFormBuilding(unit.building);
    setIsAddingCustomBuilding(false);
    setNewBuildingName('');
    setFormFloor(unit.floor);
    setFormArea(unit.area);
    setFormPrice(unit.price);
    setFormStatus(unit.status);
    setFormRoomsCount(unit.roomsCount || (unit.area >= 160 ? 4 : unit.area >= 120 ? 3 : 2));
    setFormBathroomsCount(unit.bathroomsCount || (unit.area >= 140 ? 2 : 1));
    setFormBalconiesCount(unit.balconiesCount || 1);
    setFormFinishingType(unit.finishingType || 'سوبر لوكس');
    setFormOrientation(unit.orientation || 'بحري');
    setFormFloorPlanImage(unit.floorPlanImage || '');
    setFormImageUrl(unit.imageUrl || '');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setFormError('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 4 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormFloorPlanImage(reader.result);
        setFormError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveBuilding = (isAddingCustomBuilding ? newBuildingName : formBuilding).trim();

    if (!formUnitNumber.trim() || !effectiveBuilding) {
      setFormError('يرجى إدخال رقم الوحدة واسم العمارة أو المشروع');
      return;
    }

    // Check duplicate unit number in same building
    const duplicate = unitsList.find(
      u => u.unitNumber.trim() === formUnitNumber.trim() &&
           u.building.trim() === effectiveBuilding &&
           u.id !== editingUnitId
    );
    if (duplicate) {
      setFormError(`رقم الوحدة ${formUnitNumber} مسجل بالفعل في ${effectiveBuilding}`);
      return;
    }

    // Ensure building is added to projects list if not already present
    let updatedProjects = db.projects || [];
    const existsInProjects = updatedProjects.some(
      p => p.name.trim().toLowerCase() === effectiveBuilding.toLowerCase()
    );
    if (!existsInProjects) {
      const newPId = updatedProjects.length > 0 ? Math.max(...updatedProjects.map(p => p.id)) + 1 : 1;
      const newProj: Project = {
        id: newPId,
        name: effectiveBuilding,
        createdAt: new Date().toISOString().split('T')[0],
      };
      updatedProjects = [...updatedProjects, newProj];
    }

    if (editingUnitId) {
      const updatedUnits = unitsList.map(u =>
        u.id === editingUnitId
          ? {
              ...u,
              unitNumber: formUnitNumber.trim(),
              building: effectiveBuilding,
              floor: Number(formFloor),
              area: Number(formArea),
              price: Number(formPrice),
              status: formStatus,
              roomsCount: Number(formRoomsCount),
              bathroomsCount: Number(formBathroomsCount),
              balconiesCount: Number(formBalconiesCount),
              finishingType: formFinishingType,
              orientation: formOrientation,
              floorPlanImage: formFloorPlanImage || undefined,
              imageUrl: formImageUrl.trim() || undefined,
            }
          : u
      );
      onUpdateDb({ ...db, units: updatedUnits, projects: updatedProjects });
    } else {
      const newId = unitsList.length > 0 ? Math.max(...unitsList.map(u => u.id)) + 1 : 1;
      const newUnit: Unit = {
        id: newId,
        unitNumber: formUnitNumber.trim(),
        building: effectiveBuilding,
        floor: Number(formFloor),
        area: Number(formArea),
        price: Number(formPrice),
        status: formStatus,
        roomsCount: Number(formRoomsCount),
        bathroomsCount: Number(formBathroomsCount),
        balconiesCount: Number(formBalconiesCount),
        finishingType: formFinishingType,
        orientation: formOrientation,
        floorPlanImage: formFloorPlanImage || undefined,
        imageUrl: formImageUrl.trim() || undefined,
      };
      onUpdateDb({ ...db, units: [...unitsList, newUnit], projects: updatedProjects });
    }

    resetForm();
  };

  const handleDeleteUnit = (id: number) => {
    const hasContract = contractsList.some(c => c.unitId === id);
    if (hasContract) {
      alert('لا يمكن حذف هذه الوحدة لأنها مرتبطة بعقد بيع مسجل في النظام.');
      return;
    }
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه الوحدة نهائياً؟')) {
      const updatedUnits = unitsList.filter(u => u.id !== id);
      onUpdateDb({ ...db, units: updatedUnits });
    }
  };

  const handleQuickStatusChange = (unitId: number, newStatus: UnitStatus) => {
    const updatedUnits = unitsList.map(u =>
      u.id === unitId ? { ...u, status: newStatus } : u
    );
    onUpdateDb({ ...db, units: updatedUnits });
  };

  const handleCopyCatalogLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const catalogUrl = `${origin}/?mode=visitor`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(catalogUrl).catch(() => {});
    }
    setCopiedCatalog(true);
    setTimeout(() => setCopiedCatalog(false), 2500);
  };

  const handleExportCSV = () => {
    const headers = ['رقم الوحدة', 'العمارة/المشروع', 'الدور', 'المساحة (م²)', 'السعر (ج.م)', 'الحالة'];
    const rows = filteredUnits.map(u => [
      u.unitNumber,
      u.building,
      u.floor,
      u.area,
      u.price,
      u.status,
    ]);
    downloadCSV('units_list.csv', headers, rows);
  };

  // Cost metrics for active form building
  const activeFormBuilding = (isAddingCustomBuilding ? newBuildingName : formBuilding).trim();
  const formBuildingMetrics = activeFormBuilding ? calculateBuildingMetrics(db, activeFormBuilding) : null;
  const formCalculatedCost = formBuildingMetrics && formArea > 0
    ? Math.round(formBuildingMetrics.costPerM2 * formArea)
    : 0;
  const formEstimatedProfit = formPrice - formCalculatedCost;
  const formMargin = formPrice > 0 ? Math.round((formEstimatedProfit / formPrice) * 100) : 0;

  const springTransition = { type: 'spring' as const, stiffness: 380, damping: 28 };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-8 rounded-3xl glass-panel border border-indigo-500/20 shadow-2xl shadow-indigo-500/10"
      >
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 rounded-2xl bg-blue-500/20 border border-blue-500/30">🏢</span>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:bg-gradient-to-r dark:from-white dark:via-indigo-200 dark:to-cyan-300 dark:bg-clip-text dark:text-transparent">
                إدارة الوحدات السكنية والعقارات
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-1 font-medium">
                عرض وتعديل الوحدات، المخططات الهندسية، الأسعار، وتوليد رموز QR Code
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Visitor Public Catalog Link & Copy */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (onOpenVisitor) {
                onOpenVisitor();
              } else if (typeof window !== 'undefined') {
                window.location.search = '?mode=visitor';
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-semibold transition border border-indigo-200 shadow-xs cursor-pointer"
            title="فتح موقع ومعرض الوحدات المخصص للزائرين"
          >
            <Globe className="w-4 h-4 text-indigo-600" />
            <span>معرض الزوار 🌐</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCopyCatalogLink}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition border border-slate-200 cursor-pointer"
            title="نسخ رابط معرض الزوار لإرساله للعميل عبر واتساب"
          >
            {copiedCatalog ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCatalog ? 'تم نسخ الرابط' : 'نسخ رابط الزوار'}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition border border-slate-200 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel</span>
          </motion.button>

          {canEdit && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة وحدة جديدة</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Advanced Search and Filters Toolbar for Large Projects */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.05 }}
        className="glass-panel p-5 rounded-3xl shadow-xl shadow-indigo-500/5 space-y-4 border border-indigo-500/20"
      >
        {/* Top Row: Search Input + Dropdown Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="relative md:col-span-4">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث سريع برقم الوحدة، المشروع، الدور، أو التشطيب..."
              className="w-full pr-10 pl-9 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Project / Building Filter Dropdown */}
          <div className="md:col-span-3 flex items-center gap-2">
            <div className="w-full">
              <div className="relative">
                <Building className="w-4 h-4 text-indigo-500 absolute right-3 top-3 pointer-events-none" />
                <select
                  value={filterBuilding}
                  onChange={e => {
                    setFilterBuilding(e.target.value);
                    setFilterFloor('الكل');
                  }}
                  className="w-full pr-9 pl-3 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="الكل">كل المشاريع والعمارات ({buildings.length})</option>
                  {buildings.map(b => {
                    const count = db.units.filter(u => u.building === b).length;
                    return (
                      <option key={b} value={b}>
                        {b} ({count} وحدة)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Status Filter Dropdown */}
          <div className="md:col-span-2">
            <div className="relative">
              <Filter className="w-4 h-4 text-emerald-500 absolute right-3 top-3 pointer-events-none" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full pr-9 pl-3 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="الكل">كل الحالات ({statusCounts.all})</option>
                <option value="متاحة">متاحة ({statusCounts.available})</option>
                <option value="محجوزة">محجوزة ({statusCounts.reserved})</option>
                <option value="مباعة">مباعة ({statusCounts.sold})</option>
              </select>
            </div>
          </div>

          {/* Floor Filter Dropdown */}
          <div className="md:col-span-1">
            <div className="relative">
              <select
                value={filterFloor}
                onChange={e => setFilterFloor(e.target.value)}
                title="تصفية حسب الدور"
                className="w-full px-2.5 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="الكل">كل الأدوار</option>
                {availableFloors.map(floor => (
                  <option key={floor} value={String(floor)}>
                    دور {floor}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort By Dropdown */}
          <div className="md:col-span-2">
            <div className="relative">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="w-full pr-8 pl-2 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="unit_asc">ترتيب: رقم الوحدة</option>
                <option value="floor_asc">ترتيب: الدور</option>
                <option value="area_desc">المساحة: الأكبر أولاً</option>
                <option value="price_asc">السعر: الأقل أولاً</option>
                <option value="price_desc">السعر: الأعلى أولاً</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Row: Quick Status Pills + Quick Project Pills + Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-white/10">
          {/* Quick Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
              فلترة سريعة بالحالة:
            </span>
            {[
              { id: 'الكل', label: 'الكل', count: statusCounts.all, activeClass: 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' },
              { id: 'متاحة', label: 'متاحة', count: statusCounts.available, activeClass: 'bg-blue-600 text-white' },
              { id: 'محجوزة', label: 'محجوزة', count: statusCounts.reserved, activeClass: 'bg-amber-500 text-white' },
              { id: 'مباعة', label: 'مباعة', count: statusCounts.sold, activeClass: 'bg-emerald-600 text-white' },
            ].map(st => {
              const active = filterStatus === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setFilterStatus(st.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? `${st.activeClass} shadow-xs`
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{st.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${active ? 'bg-black/20 text-current' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Results Counter & Reset Filters Button */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              النتائج المطابقة: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{filteredUnits.length}</strong> من <strong className="font-mono">{db.units.length}</strong> وحدة
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Project Pills when multiple projects exist */}
        {buildings.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1 ml-1">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>المشاريع:</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setFilterBuilding('الكل');
                setFilterFloor('الكل');
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                filterBuilding === 'الكل'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              جميع المشاريع ({db.units.length})
            </button>
            {buildings.map(b => {
              const count = db.units.filter(u => u.building === b).length;
              const active = filterBuilding === b;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setFilterBuilding(b);
                    setFilterFloor('الكل');
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <span>{b}</span>
                  <span className={`text-[10px] px-1.5 rounded-md font-mono ${active ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Add / Edit Unit Modal Form */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={springTransition}
              className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 my-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-600" />
                <span>{editingUnitId ? 'تعديل بيانات الوحدة' : 'إضافة وحدة سكنية جديدة'}</span>
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="space-y-4 pt-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الوحدة *</label>
                  <input
                    type="text"
                    required
                    value={formUnitNumber}
                    onChange={e => setFormUnitNumber(e.target.value)}
                    placeholder="مثال: 101 أو A-12"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">العمارة / المشروع *</label>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomBuilding(!isAddingCustomBuilding)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      {isAddingCustomBuilding ? '← اختيار من القائمة' : '+ مشروع جديد'}
                    </button>
                  </div>

                  {isAddingCustomBuilding ? (
                    <input
                      type="text"
                      required
                      value={newBuildingName}
                      onChange={e => setNewBuildingName(e.target.value)}
                      placeholder="اكتب اسم العمارة / المشروع الجديد"
                      className="w-full px-3 py-2 border border-blue-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-blue-50/30"
                      autoFocus
                    />
                  ) : (
                    <select
                      required
                      value={formBuilding}
                      onChange={e => {
                        if (e.target.value === '__NEW__') {
                          setIsAddingCustomBuilding(true);
                          setNewBuildingName('');
                        } else {
                          setFormBuilding(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      {buildings.length === 0 && (
                        <option value="">-- لم يتم إدخال عمارات بعد --</option>
                      )}
                      {buildings.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="__NEW__">+ إضافة عمارة أو مشروع جديد...</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الدور / الطابق *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formFloor}
                    onChange={e => setFormFloor(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">المساحة (م²) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formArea}
                    onChange={e => setFormArea(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الحالة</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as UnitStatus)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="متاحة">متاحة</option>
                    <option value="محجوزة">محجوزة</option>
                    <option value="مباعة">مباعة</option>
                  </select>
                </div>
              </div>

              {/* Architectural Specifications Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-600" />
                  <span>مواصفات التقسيم الداخلي والرسم التوضيحي:</span>
                </span>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">عدد الغرف</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formRoomsCount}
                      onChange={e => setFormRoomsCount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">عدد الحمامات</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={formBathroomsCount}
                      onChange={e => setFormBathroomsCount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">عدد البلكونات</label>
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={formBalconiesCount}
                      onChange={e => setFormBalconiesCount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">الواجهة</label>
                    <select
                      value={formOrientation}
                      onChange={e => setFormOrientation(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="بحري">بحري</option>
                      <option value="شرقي">شرقي</option>
                      <option value="قبلي">قبلي</option>
                      <option value="غربي">غربي</option>
                      <option value="ناصية بحري">ناصية بحري</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">نوع التشطيب</label>
                    <select
                      value={formFinishingType}
                      onChange={e => setFormFinishingType(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="سوبر لوكس">سوبر لوكس</option>
                      <option value="ألترا لوكس">ألترا لوكس</option>
                      <option value="نصف تشطيب">نصف تشطيب</option>
                      <option value="بدون تشطيب">بدون تشطيب (على الطوب)</option>
                    </select>
                  </div>
                </div>

                {/* Optional floor plan image upload */}
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    رفع صورة كروكي / مسقط معماري مخصص (اختياري):
                  </label>
                  {formFloorPlanImage ? (
                    <div className="relative inline-block border border-slate-300 rounded-xl overflow-hidden bg-slate-900 p-1">
                      <img
                        src={formFloorPlanImage}
                        alt="Floor Plan preview"
                        className="h-24 w-auto object-contain rounded"
                      />
                      <button
                        type="button"
                        onClick={() => setFormFloorPlanImage('')}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                        title="إزالة الصورة"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 p-2.5 bg-white border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-indigo-500 transition text-xs text-slate-500">
                      <Upload className="w-4 h-4 text-indigo-600" />
                      <span>اضغط لاختيار صورة كروكي أو مسقط أفقي للوحدة (PNG/JPG)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    * في حال عدم رفع صورة، يقوم البرنامج بتوليد رسم هندسي توضيحي ومخطط ذكي للوحدة تلقائياً وفقاً لمساحتها وتوزيع غرفها.
                  </span>
                </div>

                {/* Unit Photo Image URL Input */}
                <div className="pt-2 border-t border-slate-200/70">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>رابط صورة الوحدة (imageUrl - اختياري):</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="url"
                      value={formImageUrl}
                      onChange={e => setFormImageUrl(e.target.value)}
                      placeholder="https://example.com/unit-image.jpg"
                      dir="ltr"
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-left"
                    />
                    {formImageUrl.trim() && (
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 bg-slate-100 shrink-0 shadow-xs">
                        <img
                          src={formImageUrl.trim()}
                          alt="معاينة صورة الوحدة"
                          className="w-full h-full object-cover"
                          onError={e => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormImageUrl('')}
                          className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition cursor-pointer"
                          title="مسح الرابط"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">سعر الوحدة المطلوب (ج.م) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={formPrice}
                  onChange={e => setFormPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {formatCurrency(formPrice)}
                </span>
              </div>

              {/* Real-time Cost Estimation Box */}
              {activeFormBuilding && formBuildingMetrics && formArea > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>حساب التكلفة التقديرية بناءً على مساحة الوحدة ومصروفات ({activeFormBuilding}):</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">تكلفة المتر للعمارة:</span>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(Math.round(formBuildingMetrics.costPerM2))} / م²
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">التكلفة المحسوبة للوحدة:</span>
                      <span className="font-bold text-rose-700">
                        {formatCurrency(formCalculatedCost)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">الربح التقديري ({formMargin}%):</span>
                      <span className={`font-bold ${formEstimatedProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatCurrency(formEstimatedProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition cursor-pointer"
                >
                  {editingUnitId ? 'حفظ التعديلات' : 'إضافة الوحدة'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Blueprint / Floor Plan Quick Preview Modal */}
      <AnimatePresence>
        {previewFloorPlanUnit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={springTransition}
              className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 text-right space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">
                    المخطط الهندسي التوضيحي • وحدة {previewFloorPlanUnit.unitNumber} ({previewFloorPlanUnit.building})
                  </h3>
                  <p className="text-xs text-slate-400">
                    المساحة: {previewFloorPlanUnit.area} م² • الدور {previewFloorPlanUnit.floor} • الحالة: {previewFloorPlanUnit.status}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewFloorPlanUnit(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <UnitFloorPlan
                unit={previewFloorPlanUnit}
                heightClass="h-64 sm:h-72"
                showControls={true}
                interactive={true}
              />

              <div className="flex justify-end gap-2 pt-2">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    const targetUnit = previewFloorPlanUnit;
                    setPreviewFloorPlanUnit(null);
                    onOpenQr(targetUnit);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>فتح رمز QR والبروشور PDF</span>
                </motion.button>
                <button
                  onClick={() => setPreviewFloorPlanUnit(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unit Cards Grid with Thumbnail Image */}
      {filteredUnits.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUnits.map(unit => {
            const hasContract = db.contracts.some(c => c.unitId === unit.id);
            const rooms = unit.roomsCount || (unit.area >= 160 ? 4 : unit.area >= 120 ? 3 : 2);
            const baths = unit.bathroomsCount || (unit.area >= 140 ? 2 : 1);

            return (
              <motion.div
                key={`card-${unit.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-3xl p-4 border border-slate-200/80 dark:border-white/10 shadow-xl flex flex-col justify-between gap-4 hover:border-indigo-500/40 transition"
              >
                <div className="flex items-start gap-3.5">
                  {/* Unit Thumbnail */}
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center relative">
                    {unit.imageUrl ? (
                      <img
                        src={unit.imageUrl}
                        alt={`وحدة ${unit.unitNumber}`}
                        className="w-full h-full object-cover"
                        onError={e => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-7 h-7 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>

                  {/* Unit Header Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block truncate">
                          {unit.building}
                        </span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                          وحدة {unit.unitNumber}
                        </h3>
                      </div>
                      <span
                        className={`text-[11px] font-bold py-1 px-2.5 rounded-xl border shrink-0 ${
                          unit.status === 'متاحة'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40'
                            : unit.status === 'محجوزة'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40'
                        }`}
                      >
                        {unit.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-600 dark:text-slate-300">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold">
                        الدور {unit.floor}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold">
                        {unit.area} م²
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {rooms} غرف • {baths} حمام
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-white/10">
                  <div>
                    <span className="text-[10px] text-slate-400 block">السعر المطلوب</span>
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(unit.price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewFloorPlanUnit(unit)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                      title="معاينة المخطط الهندسي"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>المخطط</span>
                    </button>
                    <button
                      onClick={() => onOpenQr(unit)}
                      title="عرض رمز QR Code والبروشور"
                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl transition border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    {canEdit && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(unit)}
                          title="تعديل بيانات وصورة الوحدة"
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUnit(unit.id)}
                          title={hasContract ? 'لا يمكن حذف وحدة مرتبطة بعقد' : 'حذف الوحدة'}
                          disabled={hasContract}
                          className={`p-1.5 rounded-xl transition ${
                            hasContract
                              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                              : 'hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-600 dark:hover:text-red-400 cursor-pointer'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Units Table - Apple Glassmorphism Design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.1 }}
        className="glass-panel rounded-3xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-2xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-100/70 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 font-black border-b border-slate-200/80 dark:border-white/10">
              <tr>
                <th className="py-4 px-4 font-black">الوحدة والصورة</th>
                <th className="py-4 px-4 font-bold">العمارة / المشروع</th>
                <th className="py-4 px-4 font-bold">الدور</th>
                <th className="py-4 px-4 font-bold">المساحة</th>
                <th className="py-4 px-4 font-bold">المخطط 📐</th>
                <th className="py-4 px-4 font-bold">التكلفة المحسوبة</th>
                <th className="py-4 px-4 font-bold">السعر المطلوب</th>
                <th className="py-4 px-4 font-bold">الربح المتوقع</th>
                <th className="py-4 px-4 font-bold">الحالة اللحظية</th>
                <th className="py-4 px-4 text-center font-bold">QR والبروشور</th>
                {canEdit && <th className="py-4 px-4 text-center font-bold">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/40 dark:divide-white/5">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 11 : 10} className="py-12 text-center text-slate-400 text-sm">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building className="w-8 h-8 opacity-40" />
                      <p className="font-semibold">لا توجد وحدات مطابقة للبحث أو التصفية الحالية</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUnits.map(unit => {
                  const bMetrics = calculateBuildingMetrics(db, unit.building);
                  const unitCost = Math.round(bMetrics.costPerM2 * unit.area);
                  const profit = unit.price - unitCost;
                  const margin = unit.price > 0 ? Math.round((profit / unit.price) * 100) : 0;
                  const hasContract = db.contracts.some(c => c.unitId === unit.id);

                  return (
                    <tr key={unit.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors duration-150">
                      <td className="py-4 px-4 font-black text-slate-900 dark:text-white text-base">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                            {unit.imageUrl ? (
                              <img
                                src={unit.imageUrl}
                                alt={`وحدة ${unit.unitNumber}`}
                                className="w-full h-full object-cover"
                                onError={e => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <span>{unit.unitNumber}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-200">
                        {unit.building}
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                        الدور {unit.floor}
                      </td>
                      <td className="py-4 px-4 font-bold text-blue-700 dark:text-blue-400">
                        {unit.area} م²
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setPreviewFloorPlanUnit(unit)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                          title="معاينة المخطط والرسم التوضيحي"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>معاينة</span>
                        </button>
                      </td>
                      <td className="py-4 px-4 font-bold text-rose-700 dark:text-rose-400">
                        {formatCurrency(unitCost)}
                      </td>
                      <td className="py-4 px-4 font-black text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(unit.price)}
                      </td>
                      <td className={`py-4 px-4 font-semibold text-xs ${profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {formatCurrency(profit)}
                        <span className="text-[10px] text-slate-400 block font-mono">({margin}%)</span>
                      </td>
                      <td className="py-4 px-4">
                        {canEdit ? (
                          <select
                            value={unit.status}
                            onChange={e => handleQuickStatusChange(unit.id, e.target.value as UnitStatus)}
                            className={`text-xs font-bold py-1.5 px-3 rounded-xl border focus:outline-none cursor-pointer ${
                              unit.status === 'متاحة'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40'
                                : unit.status === 'محجوزة'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40'
                            }`}
                          >
                            <option value="متاحة">متاحة</option>
                            <option value="محجوزة">محجوزة</option>
                            <option value="مباعة">مباعة</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-block text-xs font-bold py-1.5 px-3 rounded-xl border ${
                              unit.status === 'متاحة'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40'
                                : unit.status === 'محجوزة'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40'
                            }`}
                          >
                            {unit.status}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => onOpenQr(unit)}
                          title="عرض رمز QR Code والبروشور PDF"
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl transition border border-indigo-200 dark:border-indigo-800 cursor-pointer inline-flex items-center justify-center"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </td>
                      {canEdit && (
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(unit)}
                              title="تعديل الوحدة والمخطط"
                              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUnit(unit.id)}
                              title={hasContract ? 'لا يمكن حذف وحدة مرتبطة بعقد' : 'حذف الوحدة'}
                              disabled={hasContract}
                              className={`p-2 rounded-xl transition ${
                                hasContract
                                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                  : 'hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2 font-medium">
          <span>إجمالي المعروض: <strong className="font-black text-slate-900 dark:text-white font-mono">{filteredUnits.length}</strong> وحدة</span>
          <span>إجمالي القيمة: <strong className="font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(filteredUnits.reduce((s, u) => s + u.price, 0))}</strong></span>
        </div>
      </motion.div>
    </div>
  );
};
