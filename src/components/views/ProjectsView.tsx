import React, { useState } from 'react';
import { AppDatabase, Project, Unit, UnitStatus } from '../../types';
import { formatCurrency, formatNumber, downloadCSV, calculateBuildingMetrics, getBuildingList } from '../../utils/helpers';
import { printDirectly } from '../../utils/pdfExport';
import {
  Building2, Plus, Edit3, Trash2, Layers, Calculator,
  TrendingUp, Download, Printer, AlertCircle, ArrowUpRight,
  CheckCircle2, DollarSign, PieChart, FileText, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  db: AppDatabase;
  canEdit: boolean;
  onUpdateDb: (updated: AppDatabase) => void;
  onNavigateTab?: (tab: string, filterBuilding?: string) => void;
}

export const ProjectsView: React.FC<Props> = ({
  db,
  canEdit,
  onUpdateDb,
  onNavigateTab,
}) => {
  // Sync unique project names between registered projects and any existing buildings in units/expenses
  const allBuildingNames = getBuildingList(db);
  const projectsList = (db.projects || []);

  const [selectedBuilding, setSelectedBuilding] = useState<string>(
    projectsList[0]?.name || allBuildingNames[0] || ''
  );

  // Modal state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Quick unit add modal
  const [isQuickUnitOpen, setIsQuickUnitOpen] = useState(false);
  const [quickUnitNumber, setQuickUnitNumber] = useState('');
  const [quickUnitFloor, setQuickUnitFloor] = useState<number>(1);
  const [quickUnitArea, setQuickUnitArea] = useState<number>(120);
  const [quickUnitPrice, setQuickUnitPrice] = useState<number>(1500000);
  const [quickUnitStatus, setQuickUnitStatus] = useState<UnitStatus>('متاحة');
  const [quickUnitError, setQuickUnitError] = useState('');

  const currentMetrics = selectedBuilding
    ? calculateBuildingMetrics(db, selectedBuilding)
    : null;

  const handleOpenAddProject = () => {
    setEditingProjectId(null);
    setFormName('');
    setFormLocation('');
    setFormDescription('');
    setFormNotes('');
    setFormError('');
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (proj: Project) => {
    setEditingProjectId(proj.id);
    setFormName(proj.name);
    setFormLocation(proj.location || '');
    setFormDescription(proj.description || '');
    setFormNotes(proj.notes || '');
    setFormError('');
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = formName.trim();
    if (!trimmed) {
      setFormError('يرجى إدخال اسم العمارة أو المشروع');
      return;
    }

    const duplicate = projectsList.find(
      p => p.name.trim().toLowerCase() === trimmed.toLowerCase() && p.id !== editingProjectId
    );
    if (duplicate) {
      setFormError('يوجد مشروع أو عمارة بهذا الاسم بالفعل');
      return;
    }

    if (editingProjectId) {
      const oldProj = projectsList.find(p => p.id === editingProjectId);
      const oldName = oldProj?.name;

      // Update project list
      const updatedProjects = projectsList.map(p =>
        p.id === editingProjectId
          ? {
              ...p,
              name: trimmed,
              location: formLocation.trim(),
              description: formDescription.trim(),
              notes: formNotes.trim(),
            }
          : p
      );

      // Cascade name change to units and expenses if name modified
      let updatedUnits = db.units;
      let updatedExpenses = db.expenses;
      if (oldName && oldName !== trimmed) {
        updatedUnits = db.units.map(u => (u.building === oldName ? { ...u, building: trimmed } : u));
        updatedExpenses = db.expenses.map(exp => (exp.building === oldName ? { ...exp, building: trimmed } : exp));
      }

      onUpdateDb({
        ...db,
        projects: updatedProjects,
        units: updatedUnits,
        expenses: updatedExpenses,
      });

      if (selectedBuilding === oldName) {
        setSelectedBuilding(trimmed);
      }
    } else {
      const newId = projectsList.length > 0 ? Math.max(...projectsList.map(p => p.id)) + 1 : 1;
      const newProject: Project = {
        id: newId,
        name: trimmed,
        location: formLocation.trim(),
        description: formDescription.trim(),
        notes: formNotes.trim(),
        createdAt: new Date().toISOString().split('T')[0],
      };

      onUpdateDb({
        ...db,
        projects: [...projectsList, newProject],
      });

      setSelectedBuilding(trimmed);
    }

    setIsProjectModalOpen(false);
  };

  const handleDeleteProject = (proj: Project) => {
    const unitsInProj = db.units.filter(u => u.building === proj.name);
    const expensesInProj = db.expenses.filter(e => e.building === proj.name);

    if (unitsInProj.length > 0 || expensesInProj.length > 0) {
      const msg = `هذا المشروع مرتبط بـ ${unitsInProj.length} وحدة و ${expensesInProj.length} مصروف مسجل.\nهل أنت متأكد من حذفه من قائمة المشاريع؟ (لن يتم حذف الوحدات ولكن سيتم فك ارتباط اسم المشروع).`;
      if (!confirm(msg)) return;
    } else {
      if (!confirm(`هل أنت متأكد من حذف مشروع "${proj.name}"؟`)) return;
    }

    const updatedProjects = projectsList.filter(p => p.id !== proj.id);
    onUpdateDb({
      ...db,
      projects: updatedProjects,
    });

    if (selectedBuilding === proj.name) {
      const nextBuilding = updatedProjects[0]?.name || '';
      setSelectedBuilding(nextBuilding);
    }
  };

  const handleSaveQuickUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUnitNumber.trim()) {
      setQuickUnitError('يرجى إدخال رقم الوحدة');
      return;
    }
    if (!selectedBuilding) {
      setQuickUnitError('يرجى تحديد العمارة أولاً');
      return;
    }

    const duplicate = db.units.find(
      u => u.unitNumber === quickUnitNumber.trim() && u.building === selectedBuilding
    );
    if (duplicate) {
      setQuickUnitError(`رقم الوحدة ${quickUnitNumber} مسجل بالفعل في هذه العمارة`);
      return;
    }

    const newId = db.units.length > 0 ? Math.max(...db.units.map(u => u.id)) + 1 : 1;
    const newUnit: Unit = {
      id: newId,
      unitNumber: quickUnitNumber.trim(),
      building: selectedBuilding,
      floor: Number(quickUnitFloor),
      area: Number(quickUnitArea),
      price: Number(quickUnitPrice),
      status: quickUnitStatus,
    };

    onUpdateDb({
      ...db,
      units: [...db.units, newUnit],
    });

    setIsQuickUnitOpen(false);
    setQuickUnitNumber('');
    setQuickUnitError('');
  };

  const handleExportBuildingReportCSV = () => {
    if (!currentMetrics || currentMetrics.units.length === 0) {
      alert('لا توجد وحدات لتصديرها في هذا المشروع');
      return;
    }

    const headers = [
      'رقم الوحدة',
      'الدور',
      'المساحة (م²)',
      'نسبة المساحة %',
      'تكلفة الوحدة المحسوبة (ج.م)',
      'سعر البيع المعروض (ج.م)',
      'سعر المتر البيعي (ج.م)',
      'صافي الربح التقديري (ج.م)',
      'هامش الربح %',
      'الحالة'
    ];

    const rows = currentMetrics.units.map(u => {
      const unitCost = Math.round(u.area * currentMetrics.costPerM2);
      const ratio = currentMetrics.totalArea > 0 ? ((u.area / currentMetrics.totalArea) * 100).toFixed(1) : '0';
      const profit = Math.round(u.price - unitCost);
      const margin = u.price > 0 ? Math.round((profit / u.price) * 100) : 0;
      const pricePerM2 = u.area > 0 ? Math.round(u.price / u.area) : 0;

      return [
        u.unitNumber,
        u.floor,
        u.area,
        `${ratio}%`,
        unitCost,
        u.price,
        pricePerM2,
        profit,
        `${margin}%`,
        u.status,
      ];
    });

    downloadCSV(`تحليل_تكلفة_${selectedBuilding}_بالمساحة`, headers, rows);
  };

  const handlePrintCostTable = () => {
    printDirectly('project-cost-breakdown-print');
  };

  const springTransition = { type: 'spring' as const, stiffness: 380, damping: 28 };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-8 rounded-3xl glass-panel border border-indigo-500/20 shadow-2xl shadow-indigo-500/10"
      >
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/30">🏗️</span>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:bg-gradient-to-r dark:from-white dark:via-indigo-200 dark:to-cyan-300 dark:bg-clip-text dark:text-transparent">
                إدارة المشاريع والعمارات وتوزيع التكاليف
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-1 font-medium">
                إدخال وتخصيص أسماء العمارات والمشاريع، ومتابعة مصروفاتها وتقسيم التكلفة على الوحدات بنسبة المساحة (م²)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canEdit && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleOpenAddProject}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عمارة أو مشروع جديد</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Buildings Cards / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {allBuildingNames.map((bName, index) => {
          const metrics = calculateBuildingMetrics(db, bName);
          const projObj = projectsList.find(p => p.name === bName);
          const isSelected = selectedBuilding === bName;

          return (
            <motion.div
              key={bName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: Math.min(index * 0.05, 0.3) }}
              whileHover={{ y: -5, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
              onClick={() => setSelectedBuilding(bName)}
              className={`p-6 rounded-3xl transition-all cursor-pointer relative overflow-hidden glass-card group ${
                isSelected
                  ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-slate-900/90'
                  : 'hover:border-slate-400 dark:hover:border-slate-700'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-cyan-400" />
              )}

              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg ${
                    isSelected ? 'bg-gradient-to-br from-indigo-600 to-cyan-600 text-white shadow-indigo-600/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}>
                    🏢
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition">{bName}</h3>
                    {projObj?.location && (
                      <span className="text-xs text-slate-600 dark:text-slate-400 block mt-0.5">{projObj.location}</span>
                    )}
                  </div>
                </div>

                {canEdit && projObj && (
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenEditProject(projObj)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-slate-800 rounded-xl transition"
                      title="تعديل المشروع"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(projObj)}
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-slate-800 rounded-xl transition"
                      title="حذف المشروع"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Metrics Summary Inside Card */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400 block mb-1">عدد الوحدات</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {metrics.unitsCount} <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">وحدة</span>
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400 block mb-1">إجمالي المساحات</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {formatNumber(metrics.totalArea)} <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">م²</span>
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400 block mb-1">إجمالي المصروفات</span>
                  <span className="font-bold text-red-600 dark:text-red-400 text-sm truncate block" title={formatCurrency(metrics.totalExpenses)}>
                    {formatCurrency(metrics.totalExpenses)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400 block mb-1">تكلفة المتر المربع</span>
                  <span className="font-bold text-cyan-700 dark:text-cyan-400 text-sm truncate block" title={`${formatCurrency(Math.round(metrics.costPerM2))} / م²`}>
                    {formatCurrency(Math.round(metrics.costPerM2))} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">/م²</span>
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-bold border-t border-slate-200 dark:border-slate-800/60">
                <span>{isSelected ? '✓ المشروع المحدد حالياً' : 'انقر لعرض تفاصيل التكلفة والوحدات'}</span>
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </motion.div>
          );
        })}

        {allBuildingNames.length === 0 && (
          <div className="col-span-full p-12 glass-panel rounded-3xl text-center space-y-4">
            <Building2 className="w-16 h-16 text-slate-500 mx-auto" />
            <div className="text-white font-bold text-xl">لم تقم بإدخال أي عمارة أو مشروع بعد</div>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              ابدأ بإدخال اسم العمارة أو المشروع أولاً، ليظهر تلقائياً في قائمة الوحدات والمصروفات ويتم حساب تكلفة المتر والوحدات بدقة.
            </p>
            {canEdit && (
              <button
                onClick={handleOpenAddProject}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة عمارة أو مشروع الآن</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selected Project Analysis & Units Cost Allocation - Apple Glassmorphism Design */}
      {currentMetrics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.15 }}
          className="glass-panel rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-6 sm:p-8 space-y-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200/60 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2.5">
                <Calculator className="w-6 h-6 text-indigo-500" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  كشف توزيع تكلفة المشروع على الوحدات بنسبة المساحة: <span className="text-indigo-600 dark:text-indigo-400">{selectedBuilding}</span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                توزيع المصروفات الإنشائية الإجمالية على وحدات العمارة بناءً على مساحة كل وحدة (م²) لتحديد التكلفة الفعلية وهامش الربح
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <button
                  onClick={() => setIsQuickUnitOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition border border-blue-200 dark:border-blue-800 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ إضافة وحدة لهذا المشروع</span>
                </button>
              )}
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('🧾 المصروفات', selectedBuilding)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold transition border border-red-200 dark:border-red-800 cursor-pointer"
                >
                  <span>مصروفات المشروع ({formatCurrency(currentMetrics.totalExpenses)})</span>
                </button>
              )}
              <button
                onClick={handleExportBuildingReportCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير Excel</span>
              </button>
              <button
                onClick={handlePrintCostTable}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الكشف</span>
              </button>
            </div>
          </div>

          {/* Key Formula & Highlights Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-100 via-indigo-50 to-slate-100 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-sm">
            <div>
              <span className="text-xs text-slate-600 dark:text-slate-400 block mb-1">إجمالي مصروفات العمارة</span>
              <div className="text-xl font-black text-rose-700 dark:text-rose-300">{formatCurrency(currentMetrics.totalExpenses)}</div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">كافة الفواتير والمقاولين المسجلين</span>
            </div>

            <div>
              <span className="text-xs text-slate-600 dark:text-slate-400 block mb-1">إجمالي مساحات الوحدات</span>
              <div className="text-xl font-black text-blue-700 dark:text-blue-300">{formatNumber(currentMetrics.totalArea)} م²</div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{currentMetrics.unitsCount} وحدة سكنية / تجارية</span>
            </div>

            <div>
              <span className="text-xs text-slate-600 dark:text-slate-400 block mb-1">تكلفة المتر المربع الفعلي (م²)</span>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                {formatCurrency(Math.round(currentMetrics.costPerM2))}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">المصروفات ÷ إجمالي المساحات</span>
            </div>

            <div>
              <span className="text-xs text-slate-600 dark:text-slate-400 block mb-1">صافي أرباح المشروع التقديري</span>
              <div className="text-xl font-black text-amber-700 dark:text-amber-300">
                {formatCurrency(Math.round(currentMetrics.totalEstimatedProfit))}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">إجمالي الإيرادات المتوقعة - المصروفات</span>
            </div>
          </div>

          {/* Unit Cost Allocation Table */}
          <div id="project-cost-breakdown-print" className="overflow-x-auto">
            <div className="hidden print:block mb-4 text-center">
              <h2 className="text-xl font-bold text-slate-900">كشف توزيع تكلفة المشروع على الوحدات بالمساحة</h2>
              <p className="text-sm text-slate-600">المشروع / العمارة: {selectedBuilding} | تاريخ الاستخراج: {new Date().toLocaleDateString('ar-EG')}</p>
              <p className="text-xs text-slate-500">
                إجمالي المصروفات: {formatCurrency(currentMetrics.totalExpenses)} | إجمالي المساحات: {formatNumber(currentMetrics.totalArea)} م² | تكلفة المتر: {formatCurrency(Math.round(currentMetrics.costPerM2))}
              </p>
            </div>

            <table className="w-full text-right text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-3">رقم الوحدة</th>
                  <th className="py-3 px-3">الدور</th>
                  <th className="py-3 px-3">المساحة (م²)</th>
                  <th className="py-3 px-3">نسبة المساحة %</th>
                  <th className="py-3 px-3">التكلفة المحسوبة للوحدة (ج.م)</th>
                  <th className="py-3 px-3">سعر الوحدة (ج.م)</th>
                  <th className="py-3 px-3">سعر المتر البيعي</th>
                  <th className="py-3 px-3">صافي الربح التقديري</th>
                  <th className="py-3 px-3">هامش الربح %</th>
                  <th className="py-3 px-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentMetrics.units.map(unit => {
                  const unitCost = Math.round(unit.area * currentMetrics.costPerM2);
                  const areaRatio = currentMetrics.totalArea > 0 ? (unit.area / currentMetrics.totalArea) * 100 : 0;
                  const profit = unit.price - unitCost;
                  const margin = unit.price > 0 ? Math.round((profit / unit.price) * 100) : 0;
                  const pricePerM2 = unit.area > 0 ? Math.round(unit.price / unit.area) : 0;

                  return (
                    <tr key={unit.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-bold text-slate-900">{unit.unitNumber}</td>
                      <td className="py-3 px-3 text-slate-600">الدور {unit.floor}</td>
                      <td className="py-3 px-3 font-semibold text-blue-700">{unit.area} م²</td>
                      <td className="py-3 px-3 font-medium text-slate-600">
                        {areaRatio.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 font-bold text-rose-700 bg-rose-50/40">
                        {formatCurrency(unitCost)}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {formatCurrency(unit.price)}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {formatCurrency(pricePerM2)} /م²
                      </td>
                      <td className={`py-3 px-3 font-bold ${profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatCurrency(profit)}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          margin >= 20 ? 'bg-emerald-100 text-emerald-800' : margin >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {margin}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          unit.status === 'متاحة'
                            ? 'bg-emerald-100 text-emerald-800'
                            : unit.status === 'محجوزة'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {unit.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {currentMetrics.units.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      لا توجد وحدات مسجلة لهذه العمارة حتى الآن. انقر على "+ إضافة وحدة لهذا المشروع" للبدء.
                    </td>
                  </tr>
                )}
              </tbody>

              {currentMetrics.units.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="py-3 px-3">المجموع الكلي</td>
                    <td className="py-3 px-3">{currentMetrics.unitsCount} وحدة</td>
                    <td className="py-3 px-3 text-blue-700">{formatNumber(currentMetrics.totalArea)} م²</td>
                    <td className="py-3 px-3">100%</td>
                    <td className="py-3 px-3 text-rose-700 bg-rose-100/50">
                      {formatCurrency(currentMetrics.totalExpenses)}
                    </td>
                    <td className="py-3 px-3">
                      {formatCurrency(currentMetrics.totalExpectedRevenue)}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {currentMetrics.totalArea > 0 ? formatCurrency(Math.round(currentMetrics.totalExpectedRevenue / currentMetrics.totalArea)) : '0'} /م²
                    </td>
                    <td className="py-3 px-3 text-emerald-700">
                      {formatCurrency(Math.round(currentMetrics.totalEstimatedProfit))}
                    </td>
                    <td className="py-3 px-3">
                      {currentMetrics.totalExpectedRevenue > 0
                        ? `${Math.round((currentMetrics.totalEstimatedProfit / currentMetrics.totalExpectedRevenue) * 100)}%`
                        : '0%'}
                    </td>
                    <td className="py-3 px-3">-</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </motion.div>
      )}

      {/* Add / Edit Project Modal */}
      <AnimatePresence>
        {isProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={springTransition}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 text-base">
                  {editingProjectId ? 'تعديل بيانات العمارة أو المشروع' : 'إضافة عمارة أو مشروع جديد'}
                </h3>
                <button
                  onClick={() => setIsProjectModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

            <form onSubmit={handleSaveProject} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اسم العمارة أو المشروع *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="مثال: عمارة النور أو برج الصفوة أو مشروع التجمع"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الموقع / العنوان (اختياري)
                </label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={e => setFormLocation(e.target.value)}
                  placeholder="مثال: المعادي - شارع النصر، أو الشيخ زايد"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  وصف المشروع (اختياري)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="مثال: عمارة سكنية 5 أدوار وروف وتجاري أرضي"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ملاحظات إضافية (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="أي بيانات تراخيص أو مقاولين أو مساحة الأرض..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition cursor-pointer"
                >
                  {editingProjectId ? 'حفظ التعديلات' : 'إضافة المشروع'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
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

      {/* Quick Add Unit Modal for Selected Building */}
      <AnimatePresence>
        {isQuickUnitOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={springTransition}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 text-base">
                  إضافة وحدة جديدة في: <span className="text-indigo-600">{selectedBuilding}</span>
                </h3>
                <button
                  onClick={() => setIsQuickUnitOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

            <form onSubmit={handleSaveQuickUnit} className="p-6 space-y-4">
              {quickUnitError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{quickUnitError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الوحدة *</label>
                  <input
                    type="text"
                    required
                    value={quickUnitNumber}
                    onChange={e => setQuickUnitNumber(e.target.value)}
                    placeholder="مثال: 101 أو A-1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الدور</label>
                  <input
                    type="number"
                    min="0"
                    value={quickUnitFloor}
                    onChange={e => setQuickUnitFloor(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">المساحة (م²) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quickUnitArea}
                    onChange={e => setQuickUnitArea(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الحالة</label>
                  <select
                    value={quickUnitStatus}
                    onChange={e => setQuickUnitStatus(e.target.value as UnitStatus)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="متاحة">متاحة</option>
                    <option value="محجوزة">محجوزة</option>
                    <option value="مباعة">مباعة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">سعر الوحدة (ج.م) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={quickUnitPrice}
                  onChange={e => setQuickUnitPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {formatCurrency(quickUnitPrice)}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition cursor-pointer"
                >
                  إضافة الوحدة
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuickUnitOpen(false)}
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
    </div>
  );
};
