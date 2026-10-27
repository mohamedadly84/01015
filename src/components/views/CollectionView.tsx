import React, { useState, useEffect } from 'react';
import { AppDatabase, Installment } from '../../types';
import { formatCurrency, downloadCSV } from '../../utils/helpers';
import {
  DollarSign, Search, Filter, AlertTriangle, CheckCircle,
  Printer, Download, ArrowDownLeft, Calendar, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  db: AppDatabase;
  canEdit: boolean;
  onUpdateDb: (updated: AppDatabase) => void;
  onOpenReceiptModal: (installment: Installment) => void;
  quickPayInstallmentId?: number | null;
  onClearQuickPay?: () => void;
}

export const CollectionView: React.FC<Props> = ({
  db,
  canEdit,
  onUpdateDb,
  onOpenReceiptModal,
  quickPayInstallmentId,
  onClearQuickPay,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  // Pay modal state
  const [payingInstallment, setPayingInstallment] = useState<Installment | null>(() => {
    if (!quickPayInstallmentId) return null;
    return (db.installments || []).find(i => i.id === quickPayInstallmentId) || null;
  });
  const [paymentAmount, setPaymentAmount] = useState<number>(() => {
    if (!quickPayInstallmentId) return 0;
    const found = (db.installments || []).find(i => i.id === quickPayInstallmentId);
    return found ? Math.max(0, found.amount - found.paidAmount) : 0;
  });

  useEffect(() => {
    if (quickPayInstallmentId) {
      const found = (db.installments || []).find(i => i.id === quickPayInstallmentId) || null;
      setPayingInstallment(found);
      if (found) {
        setPaymentAmount(Math.max(0, found.amount - found.paidAmount));
      }
    }
  }, [quickPayInstallmentId, db.installments]);

  const today = new Date().toISOString().split('T')[0];

  const totalCollected = db.installments.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalDue = db.installments.reduce((sum, i) => sum + (i.amount - i.paidAmount), 0);
  const overdueCount = db.installments.filter(
    i => i.dueDate < today && i.status !== 'مدفوع'
  ).length;

  const handleOpenPayModal = (installment: Installment) => {
    setPayingInstallment(installment);
    const due = Math.max(0, installment.amount - installment.paidAmount);
    setPaymentAmount(due);
  };

  const handleClosePayModal = () => {
    setPayingInstallment(null);
    setPaymentAmount(0);
    if (onClearQuickPay) onClearQuickPay();
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInstallment || paymentAmount <= 0) return;

    const remainingDue = payingInstallment.amount - payingInstallment.paidAmount;
    const actualPay = Math.min(paymentAmount, remainingDue);
    const newPaidAmount = payingInstallment.paidAmount + actualPay;
    const newStatus: Installment['status'] = newPaidAmount >= payingInstallment.amount ? 'مدفوع' : 'مدفوع جزئيًا';

    const updatedInstallments = db.installments.map(i =>
      i.id === payingInstallment.id
        ? {
            ...i,
            paidAmount: newPaidAmount,
            status: newStatus,
          }
        : i
    );

    const updatedDb = { ...db, installments: updatedInstallments };
    onUpdateDb(updatedDb);

    const updatedCurrent = updatedInstallments.find(i => i.id === payingInstallment.id);
    handleClosePayModal();

    if (updatedCurrent) {
      onOpenReceiptModal(updatedCurrent);
    }
  };

  const filteredInstallments = db.installments.filter(inst => {
    const contract = db.contracts.find(c => c.id === inst.contractId);
    const customer = db.customers.find(c => c.id === contract?.customerId);
    const unit = db.units.find(u => u.id === contract?.unitId);

    const q = searchTerm.toLowerCase();
    const matchesSearch =
      inst.id.toString().includes(q) ||
      inst.contractId.toString().includes(q) ||
      (customer && customer.name && customer.name.toLowerCase().includes(q)) ||
      (unit && unit.unitNumber && unit.unitNumber.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'الكل' || inst.status === statusFilter;
    const isOverdue = inst.dueDate < today && inst.status !== 'مدفوع';
    const matchesOverdue = !showOverdueOnly || isOverdue;

    return matchesSearch && matchesStatus && matchesOverdue;
  });

  const handleExportCSV = () => {
    const headers = [
      'رقم القسط', 'رقم العقد', 'العميل', 'الوحدة', 'العمارة',
      'تاريخ الاستحقاق', 'قيمة القسط', 'المدفوع', 'المتبقي', 'الحالة'
    ];
    const rows = db.installments.map(i => {
      const c = db.contracts.find(x => x.id === i.contractId);
      const cust = db.customers.find(x => x.id === c?.customerId);
      const u = db.units.find(x => x.id === c?.unitId);
      return [
        i.installmentNumber,
        i.contractId,
        cust?.name || '',
        u?.unitNumber || '',
        u?.building || '',
        i.dueDate,
        i.amount,
        i.paidAmount,
        i.amount - i.paidAmount,
        i.status,
      ];
    });
    downloadCSV('جدول_تحصيل_الأقساط', headers, rows);
  };

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
            <span className="text-3xl p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30">💰</span>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:bg-gradient-to-r dark:from-white dark:via-emerald-200 dark:to-cyan-300 dark:bg-clip-text dark:text-transparent">
                إدارة التحصيلات والأقساط
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-1 font-medium">متابعة المدفوعات والأقساط المستحقة وتقارير التحصيل بدقة</p>
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:text-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold transition border cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>تصدير Excel</span>
        </motion.button>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.05 }}
          whileHover={{ y: -4 }}
          className="glass-card p-5 rounded-2xl border border-slate-200 shadow-sm"
        >
          <span className="text-xs text-slate-500 font-medium block">إجمالي المحصّل الفعلي</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {formatCurrency(totalCollected)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">توريدات في حسابات الشركة</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.1 }}
          whileHover={{ y: -4 }}
          className="glass-card p-5 rounded-2xl border border-slate-200 shadow-sm"
        >
          <span className="text-xs text-slate-500 font-medium block">المتبقي المطلوب تحصيله</span>
          <span className="text-2xl font-black text-blue-700 mt-1 block">
            {formatCurrency(totalDue)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">أقساط مجدولة قادمة</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.15 }}
          whileHover={{ y: -4 }}
          className="glass-card p-5 rounded-2xl border border-slate-200 shadow-sm"
        >
          <span className="text-xs text-slate-500 font-medium block">أقساط متأخرة مستحقة</span>
          <div className="flex items-center justify-between mt-1">
            <span className={`text-2xl font-black ${overdueCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {overdueCount} قسط
            </span>
            {overdueCount > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowOverdueOnly(!showOverdueOnly)}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                  showOverdueOnly
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                }`}
              >
                {showOverdueOnly ? 'إلغاء التصفية' : 'تصفية المتأخرات فقط'}
              </motion.button>
            )}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">تجاوزت تاريخ الاستحقاق</span>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.18 }}
        className="glass-panel p-5 rounded-3xl shadow-xl shadow-indigo-500/5 flex flex-col md:flex-row gap-4 items-center justify-between border border-indigo-500/20"
      >
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="بحث بالعميل، الوحدة، أو رقم العقد..."
            className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>حالة القسط:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="الكل">جميع الحالات</option>
              <option value="مستحق">مستحق</option>
              <option value="مدفوع جزئيًا">مدفوع جزئيًا</option>
              <option value="مدفوع">مدفوع بالكامل</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Pay Modal */}
      <AnimatePresence>
        {payingInstallment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={springTransition}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-800 text-lg">تسجيل تحصيل قسط</h3>
                </div>
                <button
                  onClick={handleClosePayModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

            <form onSubmit={handleConfirmPayment} className="p-6 space-y-4">
              {(() => {
                const contract = db.contracts.find(c => c.id === payingInstallment.contractId);
                const customer = db.customers.find(c => c.id === contract?.customerId);
                const unit = db.units.find(u => u.id === contract?.unitId);
                const remainingDue = payingInstallment.amount - payingInstallment.paidAmount;

                return (
                  <>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">العميل:</span>
                        <span className="font-bold text-slate-900">{customer?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">الوحدة:</span>
                        <span className="font-medium text-slate-800">
                          وحدة {unit?.unitNumber} ({unit?.building})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">القسط رقم:</span>
                        <span className="font-semibold text-slate-800">
                          {payingInstallment.installmentNumber} (استحقاق: {payingInstallment.dueDate})
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1.5">
                        <span className="text-slate-500">المتبقي من القسط:</span>
                        <span className="font-bold text-red-600">{formatCurrency(remainingDue)}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          المبلغ المدفوع الآن (ج.م) *
                        </label>
                        <button
                          type="button"
                          onClick={() => setPaymentAmount(remainingDue)}
                          className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold underline bg-emerald-50 px-2 py-0.5 rounded transition"
                        >
                          سداد كامل القسط ({formatCurrency(remainingDue)})
                        </button>
                      </div>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        required
                        value={paymentAmount || ''}
                        onChange={e => setPaymentAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        {formatCurrency(paymentAmount)}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition shadow-sm cursor-pointer"
                      >
                        تأكيد التحصيل وطباعة الإيصال
                      </button>
                      <button
                        type="button"
                        onClick={handleClosePayModal}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  </>
                );
              })()}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Installments Table - Apple Glassmorphism Design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.2 }}
        className="glass-panel rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-100/70 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 border-b border-slate-200/80 dark:border-white/10 font-black">
              <tr>
                <th className="py-4 px-4 font-black">رقم القسط</th>
                <th className="py-4 px-4 font-bold">العقد والعميل</th>
                <th className="py-4 px-4 font-bold">الوحدة</th>
                <th className="py-4 px-4 font-bold">تاريخ الاستحقاق</th>
                <th className="py-4 px-4 font-bold">قيمة القسط</th>
                <th className="py-4 px-4 font-bold">المدفوع</th>
                <th className="py-4 px-4 font-bold">المتبقي</th>
                <th className="py-4 px-4 font-bold">الحالة</th>
                <th className="py-4 px-4 text-center font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/40 dark:divide-white/5">
              {filteredInstallments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock className="w-8 h-8 opacity-40" />
                      <p className="font-semibold text-sm">لا توجد أقساط تطابق خيارات التصفية</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInstallments.map(inst => {
                  const contract = db.contracts.find(c => c.id === inst.contractId);
                  const customer = db.customers.find(c => c.id === contract?.customerId);
                  const unit = db.units.find(u => u.id === contract?.unitId);
                  const remaining = inst.amount - inst.paidAmount;
                  const isOverdue = inst.dueDate < today && inst.status !== 'مدفوع';

                  return (
                    <tr
                      key={inst.id}
                      className={`hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors duration-150 ${
                        isOverdue ? 'bg-red-500/10' : ''
                      }`}
                    >
                      <td className="py-4 px-4 font-mono font-black text-slate-800 dark:text-slate-100">
                        #{inst.installmentNumber}
                        {inst.notes && (
                          <span className="block text-[10px] font-sans font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md mt-1 w-fit">
                            {inst.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">{customer?.name || '-'}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">عقد #{inst.contractId}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-800 dark:text-slate-100 block">وحدة {unit?.unitNumber}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{unit?.building}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`font-mono text-xs font-bold ${
                          isOverdue ? 'text-red-600 dark:text-red-400 font-black' : 'text-slate-600 dark:text-slate-300'
                        }`}>
                          {inst.dueDate}
                        </span>
                        {isOverdue && (
                          <span className="block text-[10px] text-red-500 dark:text-red-400 font-black">متأخر</span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-black text-slate-900 dark:text-white">
                        {formatCurrency(inst.amount)}
                      </td>
                      <td className="py-4 px-4 font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(inst.paidAmount)}
                      </td>
                      <td className="py-4 px-4 font-black text-slate-800 dark:text-slate-100">
                        {formatCurrency(remaining)}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block text-xs font-bold py-1.5 px-3 rounded-xl border ${
                            inst.status === 'مدفوع'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40'
                              : inst.status === 'مدفوع جزئيًا'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40'
                              : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {inst.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {canEdit && inst.status !== 'مدفوع' && (
                            <button
                              onClick={() => handleOpenPayModal(inst)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer"
                            >
                              تحصيل
                            </button>
                          )}
                          {inst.paidAmount > 0 && (
                            <button
                              onClick={() => onOpenReceiptModal(inst)}
                              title="طباعة إيصال الاستلام"
                              className="p-2 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-900/40 text-slate-600 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300 rounded-xl transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
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
