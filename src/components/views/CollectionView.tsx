import React, { useState } from 'react';
import { AppDatabase, Installment } from '../../types';
import { formatCurrency, downloadCSV } from '../../utils/helpers';
import {
  DollarSign, Search, Filter, AlertTriangle, CheckCircle,
  Printer, Download, ArrowDownLeft, Calendar
} from 'lucide-react';

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
  const [payingInstallment, setPayingInstallment] = useState<Installment | null>(
    quickPayInstallmentId
      ? db.installments.find(i => i.id === quickPayInstallmentId) || null
      : null
  );
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

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

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            <h2 className="text-2xl font-bold text-slate-800">تحصيل الأقساط وإصدار الإيصالات</h2>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            متابعة استحقاق أقساط العملاء، تسجيل التحصيل، وطباعة إيصالات الاستلام المعتمدة
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition border border-slate-200"
        >
          <Download className="w-4 h-4" />
          <span>تصدير Excel</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">إجمالي المحصّل الفعلي</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {formatCurrency(totalCollected)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">توريدات في حسابات الشركة</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">المتبقي المطلوب تحصيله</span>
          <span className="text-2xl font-black text-blue-700 mt-1 block">
            {formatCurrency(totalDue)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">أقساط مجدولة قادمة</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">أقساط متأخرة مستحقة</span>
          <div className="flex items-center justify-between mt-1">
            <span className={`text-2xl font-black ${overdueCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {overdueCount} قسط
            </span>
            {overdueCount > 0 && (
              <button
                onClick={() => setShowOverdueOnly(!showOverdueOnly)}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition ${
                  showOverdueOnly
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                }`}
              >
                {showOverdueOnly ? 'إلغاء التصفية' : 'تصفية المتأخرات فقط'}
              </button>
            )}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">تجاوزت تاريخ الاستحقاق</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
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
      </div>

      {/* Pay Modal */}
      {payingInstallment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-lg">تسجيل تحصيل قسط</h3>
              </div>
              <button
                onClick={handleClosePayModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
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
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition shadow-sm"
                      >
                        تأكيد التحصيل وطباعة الإيصال
                      </button>
                      <button
                        type="button"
                        onClick={handleClosePayModal}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
                      >
                        إلغاء
                      </button>
                    </div>
                  </>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      {/* Installments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">رقم القسط</th>
                <th className="py-3 px-4">العقد والعميل</th>
                <th className="py-3 px-4">الوحدة</th>
                <th className="py-3 px-4">تاريخ الاستحقاق</th>
                <th className="py-3 px-4">قيمة القسط</th>
                <th className="py-3 px-4">المدفوع</th>
                <th className="py-3 px-4">المتبقي</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInstallments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    لا توجد أقساط تطابق خيارات التصفية
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
                      className={`hover:bg-slate-50/80 transition ${
                        isOverdue ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        #{inst.installmentNumber}
                        {inst.notes && (
                          <span className="block text-[10px] font-sans font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5 w-fit">
                            {inst.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{customer?.name || '-'}</span>
                        <span className="text-xs text-slate-400 font-mono">عقد #{inst.contractId}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800 block">وحدة {unit?.unitNumber}</span>
                        <span className="text-xs text-slate-400">{unit?.building}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-mono text-xs font-semibold ${
                          isOverdue ? 'text-red-600 font-bold' : 'text-slate-600'
                        }`}>
                          {inst.dueDate}
                        </span>
                        {isOverdue && (
                          <span className="block text-[10px] text-red-500 font-bold">متأخر</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatCurrency(inst.amount)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-700">
                        {formatCurrency(inst.paidAmount)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {formatCurrency(remaining)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-xs font-bold py-1 px-2.5 rounded-lg ${
                            inst.status === 'مدفوع'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inst.status === 'مدفوع جزئيًا'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {inst.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canEdit && inst.status !== 'مدفوع' && (
                            <button
                              onClick={() => handleOpenPayModal(inst)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                            >
                              تحصيل
                            </button>
                          )}
                          {inst.paidAmount > 0 && (
                            <button
                              onClick={() => onOpenReceiptModal(inst)}
                              title="طباعة إيصال الاستلام"
                              className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg transition"
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
      </div>
    </div>
  );
};
