import React, { useState } from 'react';
import { AppDatabase, Expense } from '../../types';
import { formatCurrency, downloadCSV } from '../../utils/helpers';
import {
  Receipt, Plus, Filter, Download, AlertCircle, Trash2
} from 'lucide-react';

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
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Extract unique buildings
  const buildings = Array.from(
    new Set([
      ...db.units.map(u => u.building),
      ...db.expenses.map(e => e.building),
    ].filter(Boolean))
  );

  const totalExpenses = db.expenses.reduce((sum, e) => sum + e.amount, 0);

  const resetExpenseForm = () => {
    setCategoryId(db.expenseCategories[0]?.id || 1);
    setBuilding('');
    setDescription('');
    setAmount(0);
    setVendor('');
    setNotes('');
    setFormError('');
    setIsAddExpenseOpen(false);
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

    const newExpenseId = db.expenses.length > 0 ? Math.max(...db.expenses.map(e => e.id)) + 1 : 1;
    const newExpense: Expense = {
      id: newExpenseId,
      categoryId: Number(categoryId),
      building: building.trim(),
      description: description.trim(),
      amount: Number(amount),
      expenseDate,
      vendor: vendor.trim(),
      notes: notes.trim(),
    };

    onUpdateDb({
      ...db,
      expenses: [newExpense, ...db.expenses],
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

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-6 h-6 text-red-600" />
            <h2 className="text-2xl font-bold text-slate-800">مصروفات الإنشاء والتطوير</h2>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            تسجيل فواتير ومصروفات المواد والمقاولين والتشطيبات وتوزيعها على المشاريع
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition border border-slate-200"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => setIsAddCatOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition border border-slate-200"
              >
                <span>➕ بند جديد</span>
              </button>
              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مصروف جديد</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards & Category distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
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
        </div>

        <div className="col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-3">توزيع المصروفات حسب البند</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {expensesByCategory.slice(0, 6).map(c => (
              <div key={c.name} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block truncate">{c.name}</span>
                <span className="font-bold text-slate-800 text-sm">{formatCurrency(c.sum)}</span>
                <span className="text-[10px] text-slate-400 block">
                  {totalExpenses > 0 ? `${Math.round((c.sum / totalExpenses) * 100)}%` : '0%'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
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
      </div>

      {/* Add Category Modal */}
      {isAddCatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
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
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition"
                >
                  إضافة البند
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddCatOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">إضافة مصروف إنشائي جديد</h3>
              <button
                onClick={resetExpenseForm}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">العمارة / المشروع</label>
                  <input
                    type="text"
                    value={building}
                    onChange={e => setBuilding(e.target.value)}
                    placeholder="مثال: عمارة النور أو عام"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

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
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition shadow-sm"
                >
                  حفظ المصروف
                </button>
                <button
                  type="button"
                  onClick={resetExpenseForm}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">البند</th>
                <th className="py-3 px-4">العمارة</th>
                <th className="py-3 px-4">البيان والوصف</th>
                <th className="py-3 px-4">المبلغ</th>
                <th className="py-3 px-4">المورد / المقاول</th>
                <th className="py-3 px-4">ملاحظات</th>
                {canEdit && <th className="py-3 px-4 text-center">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    لا توجد مصروفات تطابق معايير التصفية
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(expense => {
                  const cat = db.expenseCategories.find(c => c.id === expense.categoryId);

                  return (
                    <tr key={expense.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {expense.expenseDate}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                          {cat?.name || 'عام'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {expense.building || 'عام'}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {expense.description}
                      </td>
                      <td className="py-3.5 px-4 font-black text-red-600">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {expense.vendor || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-xs">
                        {expense.notes || '-'}
                      </td>
                      {canEdit && (
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
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
      </div>
    </div>
  );
};
