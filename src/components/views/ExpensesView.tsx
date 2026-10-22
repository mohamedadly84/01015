import React, { useState } from 'react';
import { AppDatabase, Expense, Project } from '../../types';
import {
  formatCurrency, formatNumber, downloadCSV,
  getBuildingList, calculateBuildingMetrics
} from '../../utils/helpers';
import {
  Receipt, Plus, Filter, Download, AlertCircle, Trash2,
  Building2, Calculator, Layers, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  db: AppDatabase;
  canEdit: boolean;
  onUpdateDb: (updated: AppDatabase) => void;
}

export const ExpensesView: React.FC<Props> = ({
  db,
  canEdit,
  onUpdateDb,
}) => {
  const [filterBuilding, setFilterBuilding] = useState('الكل');
  const [filterCategory, setFilterCategory] = useState<number | 'الكل'>('الكل');

  // Add expense modal state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);

  const [newCatName, setNewCatName] = useState('');

  const [categoryId, setCategoryId] = useState<number>(1);
  const [building, setBuilding] = useState('');
  const [isAddingCustomBuilding, setIsAddingCustomBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Extract unique buildings
  const buildings = getBuildingList(db);

  const totalExpenses = db.expenses.reduce((sum, e) => sum + e.amount, 0);

  const resetExpenseForm = () => {
    setCategoryId(db.expenseCategories[0]?.id || 1);
    setBuilding(buildings[0] || '');
    setIsAddingCustomBuilding(false);
    setNewBuildingName('');
    setDescription('');
    setAmount(0);
    setVendor('');
    setNotes('');
    setFormError('');
    setIsAddExpenseOpen(false);
  };

  const handleOpenAddExpense = () => {
    resetExpenseForm();
    if (buildings.length > 0) {
      setBuilding(buildings[0]);
    }
    setIsAddExpenseOpen(true);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setFormError('يرجى إدخال بيان ووصف المصروف');
      return;
    }
    if (amount <= 0) {
      setFormError('يرجى إدخال مبلغ المصروف');
      return;
    }

    const effectiveBuilding = (isAddingCustomBuilding ? newBuildingName : building).trim();

    // If new building name entered, add to projects list
    let updatedProjects = db.projects || [];
    if (effectiveBuilding && effectiveBuilding !== 'عام') {
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
    }

    const newExpenseId = db.expenses.length > 0 ? Math.max(...db.expenses.map(e => e.id)) + 1 : 1;
    const newExpense: Expense = {
      id: newExpenseId,
      categoryId: Number(categoryId),
      building: effectiveBuilding,
      description: description.trim(),
      amount: Number(amount),
      expenseDate,
      vendor: vendor.trim(),
      notes: notes.trim(),
    };

    onUpdateDb({
      ...db,
      expenses: [newExpense, ...db.expenses],
      projects: updatedProjects,
    });

    resetExpenseForm();
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const exists = db.expenseCategories.some(c => c.name === newCatName.trim());
    if (exists) {
      alert('هذا البند موجود بالفعل');
      return;
    }

    const newCatId =
      db.expenseCategories.length > 0 ? Math.max(...db.expenseCategories.map(c => c.id)) + 1 : 1;

    onUpdateDb({
      ...db,
      expenseCategories: [...db.expenseCategories, { id: newCatId, name: newCatName.trim() }],
    });

    setNewCatName('');
    setIsAddCatOpen(false);
  };

  const handleDeleteExpense = (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      const updated = db.expenses.filter(e => e.id !== id);
      onUpdateDb({ ...db, expenses: updated });
    }
  };

  const filteredExpenses = db.expenses.filter(e => {
    const matchesBuilding = filterBuilding === 'الكل' || e.building === filterBuilding;
    const matchesCat = filterCategory === 'الكل' || e.categoryId === filterCategory;
    return matchesBuilding && matchesCat;
  });

  const handleExportCSV = () => {
    const headers = ['التاريخ', 'البند والتصنيف', 'العمارة', 'البيان والوصف', 'المبلغ', 'المورد / المقاول', 'ملاحظات'];
    const rows = db.expenses.map(e => {
      const cat = db.expenseCategories.find(c => c.id === e.categoryId);
      return [e.expenseDate, cat?.name || '', e.building, e.description, e.amount, e.vendor, e.notes];
    });
    downloadCSV('سجل_المصروفات_والإنشاءات', headers, rows);
  };

  // Group by category for visual analytics
  const expensesByCategory = db.expenseCategories.map(cat => {
    const sum = db.expenses.filter(e => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0);
    return { name: cat.name, sum };
  }).filter(c => c.sum > 0).sort((a, b) => b.sum - a.sum);

  const springTransition = { type: 'spring' as const, stiffness: 380, damping: 28 };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-8 rounded-3xl glass-panel border border-indigo-500/20 shadow-2xl shadow-indigo-500/10 mb-6"
      >
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/30">🧾</span>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:bg-gradient-to-r dark:from-white dark:via-rose-200 dark:to-amber-300 dark:bg-clip-text dark:text-transparent">
                مصروفات الإنشاء والتطوير
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-1 font-medium">
                تسجيل فواتير ومصروفات المواد والمقاولين والتشطيبات وتوزيعها على المشاريع
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            <>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsAddCatOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition border border-slate-200 cursor-pointer"
              >
                <span>➕ بند جديد</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleOpenAddExpense}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مصروف جديد</span>
              </motion.button>
            </>
          )}
        </div>
      </motion.div>

      {/* KPI Cards & Category distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.05 }}
          whileHover={{ y: -4 }}
          className="glass-card p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div>
            <span className="text-xs text-slate-500 font-medium block">إجمالي المصروفات المنفذة</span>
            <span className="text-3xl font-black text-red-600 mt-2 block">
              {formatCurrency(totalExpenses)}
            </span>
            <span className="text-xs text-slate-400 mt-1 block">إجمالي {db.expenses.length} عملية صرف</span>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>أكبر عمارة تكلفة:</span>
              <span className="font-bold text-slate-800">
                {buildings[0] || '---'}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className="col-span-2 glass-card p-5 rounded-2xl border border-slate-200 shadow-sm"
        >
          <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-3">توزيع المصروفات حسب البند</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {expensesByCategory.slice(0, 6).map(c => (
              <div key={c.name} className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">{c.name}</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{formatCurrency(c.sum)}</span>
                <span className="text-[10px] text-slate-400 block">
                  {totalExpenses > 0 ? `${Math.round((c.sum / totalExpenses) * 100)}%` : '0%'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Buildings & Cost per m² summary */}
      {buildings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.15 }}
          className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              مصروفات العمارات والمشاريع وتكلفة المتر المربع (م²)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {buildings.map(bName => {
              const m = calculateBuildingMetrics(db, bName);
              return (
                <div key={bName} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex flex-col justify-between hover:bg-slate-100/70 dark:hover:bg-slate-800 transition">
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{bName}</span>
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">{formatCurrency(m.totalExpenses)}</span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/70 dark:border-slate-700">
                    <div className="flex justify-between">
                      <span>إجمالي المساحات:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{formatNumber(m.totalArea)} م² ({m.unitsCount} وحدة)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>تكلفة المتر المربع:</span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-400">{formatCurrency(Math.round(m.costPerM2))} / م²</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.2 }}
        className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-wrap gap-4 items-center justify-between"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>العمارة:</span>
            <select
              value={filterBuilding}
              onChange={e => setFilterBuilding(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="الكل">جميع العمائر</option>
              {buildings.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>البند:</span>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value === 'الكل' ? 'الكل' : Number(e.target.value))}
              className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="الكل">جميع البنود</option>
              {db.expenseCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          عدد العمليات: {filteredExpenses.length} | المجموع: {formatCurrency(filteredExpenses.reduce((s, e) => s + e.amount, 0))}
        </div>
      </motion.div>

      {/* Add Category Modal */}
      <AnimatePresence>
        {isAddCatOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={springTransition}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200"
            >
              <h3 className="font-bold text-slate-800 text-base mb-3">إضافة بند مصروفات جديد</h3>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">اسم البند الجديد</label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="مثال: واجهات، حراسة، حديد..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition cursor-pointer"
                  >
                    إضافة البند
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddCatOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isAddExpenseOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={springTransition}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-6"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 text-lg">إضافة مصروف إنشائي جديد</h3>
                <button
                  onClick={resetExpenseForm}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">بند المصروف *</label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    {db.expenseCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">العمارة / المشروع</label>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomBuilding(!isAddingCustomBuilding)}
                      className="text-[11px] text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                    >
                      {isAddingCustomBuilding ? '← اختيار من القائمة' : '+ مشروع جديد'}
                    </button>
                  </div>

                  {isAddingCustomBuilding ? (
                    <input
                      type="text"
                      value={newBuildingName}
                      onChange={e => setNewBuildingName(e.target.value)}
                      placeholder="اكتب اسم العمارة / المشروع الجديد"
                      className="w-full px-3 py-2 border border-red-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-red-50/20"
                      autoFocus
                    />
                  ) : (
                    <select
                      value={building}
                      onChange={e => {
                        if (e.target.value === '__NEW__') {
                          setIsAddingCustomBuilding(true);
                          setNewBuildingName('');
                        } else {
                          setBuilding(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white"
                    >
                      <option value="">عام (غير مخصص لعمارة محددة)</option>
                      {buildings.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="__NEW__">+ إضافة عمارة أو مشروع جديد...</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Helper metrics info for chosen building */}
              {(() => {
                const targetB = (isAddingCustomBuilding ? newBuildingName : building).trim();
                if (!targetB || targetB === 'عام') return null;
                const m = calculateBuildingMetrics(db, targetB);
                return (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                      <Calculator className="w-3.5 h-3.5" />
                      <span>بيانات مشروع ({targetB}):</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">إجمالي المساحات:</span>
                        <span className="font-bold text-slate-800">{formatNumber(m.totalArea)} م² ({m.unitsCount} وحدة)</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">المصروفات السابقة:</span>
                        <span className="font-bold text-red-600">{formatCurrency(m.totalExpenses)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">تكلفة المتر الحالية:</span>
                        <span className="font-bold text-indigo-700">{formatCurrency(Math.round(m.costPerM2))} / م²</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">البيان والوصف بالتفصيل *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="مثال: توريد 10 طن حديد تسليح، مصنعية دهانات صالة..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">المبلغ (ج.م) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base font-bold text-red-600 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {formatCurrency(amount)}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الصرف</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={e => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">المورد / المقاول</label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={e => setVendor(e.target.value)}
                    placeholder="اسم الشركة أو الفني"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات / رقم الفاتورة</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="فاتورة ضريبية #123..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition shadow-sm cursor-pointer"
                >
                  حفظ المصروف
                </button>
                <button
                  type="button"
                  onClick={resetExpenseForm}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Expenses Table - Apple Glassmorphism Design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.1 }}
        className="glass-panel rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-100/70 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 border-b border-slate-200/80 dark:border-white/10 font-black">
              <tr>
                <th className="py-4 px-5 font-black">التاريخ</th>
                <th className="py-4 px-5 font-bold">البند</th>
                <th className="py-4 px-5 font-bold">العمارة</th>
                <th className="py-4 px-5 font-bold">البيان والوصف</th>
                <th className="py-4 px-5 font-bold">المبلغ</th>
                <th className="py-4 px-5 font-bold">المورد / المقاول</th>
                <th className="py-4 px-5 font-bold">ملاحظات</th>
                {canEdit && <th className="py-4 px-5 text-center font-bold">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/40 dark:divide-white/5">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-8 h-8 opacity-40" />
                      <p className="font-semibold text-sm">لا توجد مصروفات مسجلة تطابق معايير التصفية</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(expense => {
                  const cat = db.expenseCategories.find(c => c.id === expense.categoryId);

                  return (
                    <tr key={expense.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors duration-150">
                      <td className="py-4 px-5 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {expense.expenseDate}
                      </td>
                      <td className="py-4 px-5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                          {cat?.name || 'عام'}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-semibold text-slate-700 dark:text-slate-200">
                        {expense.building || 'عام'}
                      </td>
                      <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
                        {expense.description}
                      </td>
                      <td className="py-4 px-5 font-black text-red-600 dark:text-red-400">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300 text-xs font-medium">
                        {expense.vendor || '-'}
                      </td>
                      <td className="py-4 px-5 text-slate-500 dark:text-slate-400 text-xs">
                        {expense.notes || '-'}
                      </td>
                      {canEdit && (
                        <td className="py-4 px-5 text-center">
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition cursor-pointer"
                            title="حذف المصروف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};
