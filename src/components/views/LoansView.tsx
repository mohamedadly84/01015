import React, { useState } from 'react';
import { AppDatabase, Loan, LoanPayment, LenderType } from '../../types';
import { formatCurrency, downloadCSV, addMonths } from '../../utils/helpers';
import {
  Landmark, Plus, Download, CheckCircle, AlertCircle,
  Calendar, CreditCard
} from 'lucide-react';

interface Props {
  db: AppDatabase;
  canEdit: boolean;
  onUpdateDb: (updated: AppDatabase) => void;
}

export const LoansView: React.FC<Props> = ({
  db,
  canEdit,
  onUpdateDb,
}) => {
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<number | 'all'>('all');

  // New loan form states
  const [lenderName, setLenderName] = useState('');
  const [lenderType, setLenderType] = useState<LenderType>('بنك');
  const [amount, setAmount] = useState<number>(500000);
  const [interestRate, setInterestRate] = useState<number>(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentsCount, setPaymentsCount] = useState<number>(4);
  const [frequencyMonths, setFrequencyMonths] = useState<number>(3);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Repay modal state
  const [payingPayment, setPayingPayment] = useState<LoanPayment | null>(null);
  const [repayAmount, setRepayAmount] = useState<number>(0);

  const totalBorrowed = db.loans.reduce((sum, l) => sum + l.amount, 0);
  const totalRepaid = db.loanPayments.reduce((sum, lp) => sum + lp.paidAmount, 0);
  const totalDebt = db.loanPayments.reduce((sum, lp) => sum + (lp.amount - lp.paidAmount), 0);

  const today = new Date().toISOString().split('T')[0];
  const next30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const upcomingPayments = db.loanPayments.filter(
    lp => lp.dueDate >= today && lp.dueDate <= next30Days && lp.status !== 'مدفوع'
  );

  const resetLoanForm = () => {
    setLenderName('');
    setLenderType('بنك');
    setAmount(500000);
    setInterestRate(0);
    setPaymentsCount(4);
    setFrequencyMonths(3);
    setNotes('');
    setFormError('');
    setIsAddLoanOpen(false);
  };

  const handleAddLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lenderName.trim()) {
      setFormError('يرجى إدخال اسم البنك أو المقرض');
      return;
    }
    if (amount <= 0) {
      setFormError('يرجى إدخال مبلغ القرض');
      return;
    }

    const newLoanId = db.loans.length > 0 ? Math.max(...db.loans.map(l => l.id)) + 1 : 1;
    const newLoan: Loan = {
      id: newLoanId,
      lenderName: lenderName.trim(),
      lenderType,
      amount: Number(amount),
      interestRate: Number(interestRate),
      startDate,
      notes: notes.trim(),
      status: 'نشط',
    };

    // Calculate installments with interest
    const totalAmountToRepay = amount * (1 + interestRate / 100);
    const amountPerTerm = Math.round(totalAmountToRepay / paymentsCount);

    let currentPaymentId =
      db.loanPayments.length > 0 ? Math.max(...db.loanPayments.map(p => p.id)) + 1 : 1;

    const newPayments: LoanPayment[] = [];
    for (let i = 1; i <= paymentsCount; i++) {
      const isLast = i === paymentsCount;
      const paymentAmt = isLast
        ? totalAmountToRepay - amountPerTerm * (paymentsCount - 1)
        : amountPerTerm;

      newPayments.push({
        id: currentPaymentId++,
        loanId: newLoanId,
        paymentNumber: i,
        dueDate: addMonths(startDate, i * frequencyMonths),
        amount: paymentAmt,
        paidAmount: 0,
        status: 'مستحق',
      });
    }

    onUpdateDb({
      ...db,
      loans: [newLoan, ...db.loans],
      loanPayments: [...db.loanPayments, ...newPayments],
    });

    resetLoanForm();
  };

  const handleOpenRepay = (payment: LoanPayment) => {
    setPayingPayment(payment);
    setRepayAmount(payment.amount - payment.paidAmount);
  };

  const handleConfirmRepay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPayment || repayAmount <= 0) return;

    const remainingDue = payingPayment.amount - payingPayment.paidAmount;
    const actualPay = Math.min(repayAmount, remainingDue);
    const newPaidAmount = payingPayment.paidAmount + actualPay;
    const newStatus: LoanPayment['status'] = newPaidAmount >= payingPayment.amount ? 'مدفوع' : 'مدفوع جزئيًا';

    const updatedPayments = db.loanPayments.map(p =>
      p.id === payingPayment.id
        ? {
            ...p,
            paidAmount: newPaidAmount,
            status: newStatus,
          }
        : p
    );

    // Check if entire loan is now fully repaid
    const loanPayments = updatedPayments.filter(p => p.loanId === payingPayment.loanId);
    const allPaid = loanPayments.every(p => p.status === 'مدفوع');

    const updatedLoans = db.loans.map(l =>
      l.id === payingPayment.loanId
        ? { ...l, status: allPaid ? ('مسدد' as const) : ('نشط' as const) }
        : l
    );

    onUpdateDb({
      ...db,
      loans: updatedLoans,
      loanPayments: updatedPayments,
    });

    setPayingPayment(null);
    setRepayAmount(0);
  };

  const filteredPayments = db.loanPayments.filter(lp => {
    if (selectedLoanId === 'all') return true;
    return lp.loanId === selectedLoanId;
  });

  const handleExportCSV = () => {
    const headers = [
      'اسم المقرض', 'نوع المقرض', 'رقم الدفعة', 'تاريخ الاستحقاق',
      'المبلغ المستحق', 'المدفوع', 'المتبقي', 'الحالة'
    ];
    const rows = db.loanPayments.map(lp => {
      const loan = db.loans.find(l => l.id === lp.loanId);
      return [
        loan?.lenderName || '',
        loan?.lenderType || '',
        lp.paymentNumber,
        lp.dueDate,
        lp.amount,
        lp.paidAmount,
        lp.amount - lp.paidAmount,
        lp.status,
      ];
    });
    downloadCSV('سداد_أقساط_القروض', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="w-6 h-6 text-amber-600" />
            <h2 className="text-2xl font-bold text-slate-800">إدارة القروض والتمويلات البنكية</h2>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            تسجيل القروض للأفراد والبنوك، جدولة السداد، ومتابعة الالتزامات والمديونيات
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
            <button
              onClick={() => setIsAddLoanOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة قرض / تمويل جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">إجمالي المقترض</span>
          <span className="text-2xl font-black text-slate-800 mt-1 block">
            {formatCurrency(totalBorrowed)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">أصل التمويلات</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">المسدد للمقرضين</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {formatCurrency(totalRepaid)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">دفعات تم سدادها</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">المديونية المتبقية</span>
          <span className="text-2xl font-black text-red-600 mt-1 block">
            {formatCurrency(totalDebt)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">مطلوب سدادها</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">مستحق خلال 30 يوم</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {upcomingPayments.length} أقساط
          </span>
          <span className="text-xs text-slate-400 mt-1 block">التزام قريب الأجل</span>
        </div>
      </div>

      {/* Add Loan Modal */}
      {isAddLoanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">تسجيل قرض أو تمويل جديد</h3>
              <button
                onClick={resetLoanForm}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLoan} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المقرض / البنك *</label>
                  <input
                    type="text"
                    required
                    value={lenderName}
                    onChange={e => setLenderName(e.target.value)}
                    placeholder="مثال: البنك الأهلي أو فلان"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">نوع المقرض</label>
                  <select
                    value={lenderType}
                    onChange={e => setLenderType(e.target.value as LenderType)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="بنك">بنك / مؤسسة تمويل</option>
                    <option value="فرد">شخص / فرد</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">مبلغ القرض (ج.م) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    required
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">نسبة الفائدة (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={interestRate}
                    onChange={e => setInterestRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border border-slate-200 p-3 rounded-xl bg-slate-50">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">تاريخ البدء</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">عدد الدفعات</label>
                  <input
                    type="number"
                    min="1"
                    value={paymentsCount}
                    onChange={e => setPaymentsCount(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">دورية السداد</label>
                  <select
                    value={frequencyMonths}
                    onChange={e => setFrequencyMonths(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value={1}>شهري</option>
                    <option value={3}>ربع سنوي</option>
                    <option value={6}>نصف سنوي</option>
                    <option value={12}>سنوي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="بيانات الضمانات أو تفاصيل السداد..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm transition shadow-sm"
                >
                  حفظ القرض وتوليد جدول السداد
                </button>
                <button
                  type="button"
                  onClick={resetLoanForm}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repay Modal */}
      {payingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">سداد دفعة قرض</h3>
              <button
                onClick={() => setPayingPayment(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmRepay} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
                {(() => {
                  const loan = db.loans.find(l => l.id === payingPayment.loanId);
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">المقرض:</span>
                        <span className="font-bold text-slate-900">{loan?.lenderName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">الدفعة رقم:</span>
                        <span className="font-semibold text-slate-800">
                          {payingPayment.paymentNumber} (استحقاق {payingPayment.dueDate})
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-amber-200 pt-1">
                        <span className="text-slate-600">المتبقي من الدفعة:</span>
                        <span className="font-bold text-red-600">
                          {formatCurrency(payingPayment.amount - payingPayment.paidAmount)}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">المبلغ المراد سداده (ج.م) *</label>
                <input
                  type="number"
                  min="1"
                  max={payingPayment.amount - payingPayment.paidAmount}
                  step="100"
                  required
                  value={repayAmount}
                  onChange={e => setRepayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm transition shadow-sm"
                >
                  تأكيد سداد الدفعة
                </button>
                <button
                  type="button"
                  onClick={() => setPayingPayment(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loans Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {db.loans.map(loan => {
          const payments = db.loanPayments.filter(p => p.loanId === loan.id);
          const paidSum = payments.reduce((s, p) => s + p.paidAmount, 0);
          const totalSum = payments.reduce((s, p) => s + p.amount, 0);
          const remaining = totalSum - paidSum;

          return (
            <div
              key={loan.id}
              onClick={() => setSelectedLoanId(selectedLoanId === loan.id ? 'all' : loan.id)}
              className={`p-5 rounded-2xl border transition cursor-pointer ${
                selectedLoanId === loan.id
                  ? 'border-amber-500 bg-amber-50/20 shadow-md ring-2 ring-amber-500/20'
                  : 'border-slate-200 bg-white shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{loan.lenderName}</h3>
                  <span className="text-xs text-slate-400">نوع المقرض: {loan.lenderType} | فائدة: {loan.interestRate}%</span>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    loan.status === 'مسدد'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {loan.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block">أصل المبلغ</span>
                  <span className="font-bold text-slate-800">{formatCurrency(loan.amount)}</span>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <span className="text-emerald-700 block">المسدد</span>
                  <span className="font-bold text-emerald-800">{formatCurrency(paidSum)}</span>
                </div>
                <div className="p-2 bg-red-50 rounded-lg">
                  <span className="text-red-700 block">المتبقي</span>
                  <span className="font-bold text-red-800">{formatCurrency(remaining)}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 mt-3 flex justify-between items-center">
                <span>تاريخ البدء: {loan.startDate}</span>
                <span className="font-semibold text-amber-700">
                  {selectedLoanId === loan.id ? 'إلغاء التحديد' : 'عرض جدول السداد ↓'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Repayments Schedule Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 text-sm">
            جدول استحقاق دفعات القروض{' '}
            {selectedLoanId !== 'all' && (
              <span className="text-amber-700">
                (المحددة: {db.loans.find(l => l.id === selectedLoanId)?.lenderName})
              </span>
            )}
          </h3>
          {selectedLoanId !== 'all' && (
            <button
              onClick={() => setSelectedLoanId('all')}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              عرض جميع الدفعات
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">رقم الدفعة</th>
                <th className="py-3 px-4">المقرض</th>
                <th className="py-3 px-4">تاريخ الاستحقاق</th>
                <th className="py-3 px-4">المبلغ المستحق</th>
                <th className="py-3 px-4">المدفوع</th>
                <th className="py-3 px-4">المتبقي</th>
                <th className="py-3 px-4">الحالة</th>
                {canEdit && <th className="py-3 px-4 text-center">سداد</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map(payment => {
                const loan = db.loans.find(l => l.id === payment.loanId);
                const remaining = payment.amount - payment.paidAmount;

                return (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold">#{payment.paymentNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{loan?.lenderName}</td>
                    <td className="py-3 px-4 font-mono text-xs">{payment.dueDate}</td>
                    <td className="py-3 px-4 font-bold">{formatCurrency(payment.amount)}</td>
                    <td className="py-3 px-4 text-emerald-700 font-medium">{formatCurrency(payment.paidAmount)}</td>
                    <td className="py-3 px-4 font-bold text-red-600">{formatCurrency(remaining)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        payment.status === 'مدفوع' ? 'bg-emerald-100 text-emerald-800' :
                        payment.status === 'مدفوع جزئيًا' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="py-3 px-4 text-center">
                        {payment.status !== 'مدفوع' && (
                          <button
                            onClick={() => handleOpenRepay(payment)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
                          >
                            سداد
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
