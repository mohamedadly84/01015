import React, { useState } from 'react';
import { AppDatabase, Unit, UnitStatus, Project } from '../../types';
import {
  formatCurrency, formatNumber, downloadCSV,
  getBuildingList, calculateBuildingMetrics
} from '../../utils/helpers';
import { UnitFloorPlan } from '../UnitFloorPlan';
import {
  Building, Plus, Search, Filter, QrCode, Trash2, Edit2, Download,
  CheckCircle, AlertCircle, Eye, Calculator, Sparkles, Globe,
  Compass, FileText, Upload, X, Copy, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  db: AppDatabase;
  canEdit: boolean;
  onUpdateDb: (updated: AppDatabase) => void;
  onOpenQr: (unit: Unit) => void;
}

export const UnitsView: React.FC<Props> = ({
  db,
  canEdit,
  onUpdateDb,
  onOpenQr,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('الكل');
  const [filterStatus, setFilterStatus] = useState('الكل');

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
  const [formError, setFormError] = useState('');

  // Blueprint / Floor Plan quick preview modal
  const [previewFloorPlanUnit, setPreviewFloorPlanUnit] = useState<Unit | null>(null);
  const [copiedCatalog, setCopiedCatalog] = useState(false);

  // Extract unique buildings from registered projects, units and expenses
  const buildings = getBuildingList(db);

  const filteredUnits = db.units.filter(u => {
    const matchesSearch =
      u.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.building.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBuilding = filterBuilding === 'الكل' || u.building === filterBuilding;
    const matchesStatus = filterStatus === 'الكل' || u.status === filterStatus;
    return matchesSearch && matchesBuilding && matchesStatus;
  });

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
    const duplicate = db.units.find(
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
      const updatedUnits = db.units.map(u =>
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
            }
          : u
      );
      onUpdateDb({ ...db, units: updatedUnits, projects: updatedProjects });
    } else {
      const newId = db.units.length > 0 ? Math.max(...db.units.map(u => u.id)) + 1 : 1;
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
      };
      onUpdateDb({ ...db, units: [...db.units, newUnit], projects: updatedProjects });
    }

    resetForm();
  };

  const handleDeleteUnit = (id: number) => {
    const hasContract = db.contracts.some(c => c.unitId === id);
    if (hasContract) {
      alert('لا يمكن حذف هذه الوحدة لأنها مرتبطة بعقد بيع مسجل في النظام.');
      return;
    }
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه الوحدة نهائياً؟')) {
      const updatedUnits = db.units.filter(u => u.id !== id);
      onUpdateDb({ ...db, units: updatedUnits });
    }
  };

  const handleQuickStatusChange = (unitId: number, newStatus: UnitStatus) => {
    const updatedUnits = db.units.map(u =>
      u.id === unitId ? { ...u, status: newStatus } : u
    );
    onUpdateDb({ ...db, units: updatedUnits });
  };

  const handleCopyCatalogLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const catalogUrl = `${origin}/?mode=visitor`;
    navigator.clipboard.writeText(catalogUrl);
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
            onClick={() => window.open('/?mode=visitor', '_blank')}
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

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.05 }}
        className="glass-panel p-5 rounded-3xl shadow-xl shadow-indigo-500/5 flex flex-col md:flex-row gap-4 items-center justify-between border border-indigo-500/20"
      >
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="بحث برقم الوحدة أو العمارة..."
            className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>العمارة:</span>
            <select
              value={filterBuilding}
              onChange={e => setFilterBuilding(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="الكل">جميع العمارات ({buildings.length})</option>
              {buildings.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>الحالة:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="الكل">الكل</option>
              <option value="متاحة">متاحة</option>
              <option value="محجوزة">محجوزة</option>
              <option value="مباعة">مباعة</option>
            </select>
          </div>
        </div>
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
                <th className="py-4 px-4 font-black">رقم الوحدة</th>
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
                        {unit.unitNumber}
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
