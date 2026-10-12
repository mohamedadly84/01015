import React from 'react';
import { AppDatabase } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import {
  DollarSign, TrendingUp, Wallet, Landmark, FileText,
  Clock, AlertTriangle, Building, CheckCircle2, ArrowUpRight
} from 'lucide-react';

interface Props {
  db: AppDatabase;
  onNavigateTab: (tab: string) => void;
  onPayInstallmentQuick: (installmentId: number) => void;
}

export const DashboardView: React.FC<Props> = ({
  db,
  onNavigateTab,
  onPayInstallmentQuick,
}) => {
  // Financial computations
  const totalSales = db.contracts.reduce((sum, c) => sum + c.totalPrice, 0);
  const totalDown = db.contracts.reduce((sum, c) => sum + c.downPayment, 0);
  const remainingSales = totalSales - totalDown;

  const totalCollected = db.installments.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalDue = db.installments.reduce((sum, i) => sum + (i.amount - i.paidAmount), 0);

  const totalExpenses = db.expenses.reduce((sum, e) => sum + e.amount, 0);

  const totalBorrowed = db.loans.reduce((sum, l) => sum + l.amount, 0);
  const totalLoanRepaid = db.loanPayments.reduce((sum, lp) => sum + lp.paidAmount, 0);
  const totalDebt = db.loanPayments.reduce((sum, lp) => sum + (lp.amount - lp.paidAmount), 0);

  const cashIn = totalCollected;
  const cashOut = totalExpenses + totalLoanRepaid;
  const netCashflow = cashIn - cashOut;

  const today = new Date().toISOString().split('T')[0];
  const next30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const overdueInstallments = db.installments.filter(
    i => i.dueDate < today && i.status !== 'مدفوع'
  );

  const upcomingLoanPayments = db.loanPayments.filter(
    lp => lp.dueDate >= today && lp.dueDate <= next30Days && lp.status !== 'مدفوع'
  );

  const totalUpcomingLoanAmount = upcomingLoanPayments.reduce(
    (sum, lp) => sum + (lp.amount - lp.paidAmount),
    0
  );

  const unitsSold = db.units.filter(u => u.status === 'مباعة').length;
  const unitsReserved = db.units.filter(u => u.status === 'محجوزة').length;
  const unitsAvailable = db.units.filter(u => u.status === 'متاحة').length;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            <h1 className="text-2xl font-black">لوحة التحكم والمؤشرات المالية</h1>
          </div>
          <p className="text-slate-300 text-sm mt-1">
            متابعة فورية للمبيعات، التحصيلات، السيولة، وحالة الوحدات العقارية
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab('🏗️ المشاريع')}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-700/80 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-indigo-700/20"
          >
            <span>🏗️ المشاريع والتكاليف</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigateTab('💰 البيع')}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-indigo-600/30"
          >
            <span>عقد بيع جديد</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigateTab('💵 التحصيل')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-emerald-600/30"
          >
            <span>تحصيل قسط</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigateTab('🧾 المصروفات')}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-semibold transition"
          >
            <span>إضافة مصروف</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 1 Metrics: Key Cash & Sales indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-sm mb-2">
            <span className="font-medium">💵 صافي التدفق النقدي</span>
            <div className={`p-2 rounded-xl ${netCashflow >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl font-black ${netCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(netCashflow)}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            التحصيلات ({formatCurrency(cashIn)}) - المصروفات ({formatCurrency(cashOut)})
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-sm mb-2">
            <span className="font-medium">📈 إجمالي المبيعات</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatCurrency(totalSales)}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            إجمالي قيمة {db.contracts.length} عقد مبرم
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-sm mb-2">
            <span className="font-medium">💰 المحصّل الفعلي</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {formatCurrency(totalCollected)}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            متبقي للتحصيل: {formatCurrency(totalDue)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-sm mb-2">
            <span className="font-medium">🏦 المديونية المتبقية</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            {formatCurrency(totalDebt)}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            من إجمالي مقترض {formatCurrency(totalBorrowed)}
          </div>
        </div>
      </div>

      {/* Row 2 Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
          <span className="text-xs text-slate-500 block">🏢 عقود البيع</span>
          <span className="text-xl font-bold text-slate-800 mt-1 block">{db.contracts.length} عقد</span>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
          <span className="text-xs text-slate-500 block">⏳ متبقي على العملاء</span>
          <span className="text-xl font-bold text-blue-700 mt-1 block">{formatCurrency(remainingSales)}</span>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
          <span className="text-xs text-slate-500 block">🧾 مصروفات الإنشاء</span>
          <span className="text-xl font-bold text-red-700 mt-1 block">{formatCurrency(totalExpenses)}</span>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
          <span className="text-xs text-slate-500 block">🏦 إجمالي المقترض</span>
          <span className="text-xl font-bold text-slate-800 mt-1 block">{formatCurrency(totalBorrowed)}</span>
        </div>
      </div>

      {/* Widgets Grid: Overdue Installments & Units Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Installments */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">أقساط متأخرة مستحقة</h3>
                <span className="text-xs text-slate-500">تحتاج متابعة مع العملاء</span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              overdueInstallments.length > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {overdueInstallments.length > 0 ? `${overdueInstallments.length} قسط متأخر` : 'لا توجد متأخرات'}
            </span>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between">
            {overdueInstallments.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-800">ممتاز! لا توجد أي أقساط متأخرة حالياً</p>
                <p className="text-xs text-slate-500">جميع الأقساط مسددة في مواعيدها المحددة.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400">
                        <th className="pb-2">العميل والوحدة</th>
                        <th className="pb-2">التاريخ</th>
                        <th className="pb-2">المبلغ</th>
                        <th className="pb-2 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overdueInstallments.slice(0, 5).map(inst => {
                        const contract = db.contracts.find(c => c.id === inst.contractId);
                        const customer = db.customers.find(c => c.id === contract?.customerId);
                        const unit = db.units.find(u => u.id === contract?.unitId);
                        const dueAmount = inst.amount - inst.paidAmount;

                        return (
                          <tr key={inst.id} className="hover:bg-slate-50">
                            <td className="py-2.5">
                              <span className="font-bold text-slate-800 block">{customer?.name || 'عميل'}</span>
                              <span className="text-slate-400 text-[11px]">
                                {unit ? `وحدة ${unit.unitNumber} - ${unit.building}` : ''}
                              </span>
                            </td>
                            <td className="py-2.5 font-mono text-red-600 font-medium">
                              {inst.dueDate}
                            </td>
                            <td className="py-2.5 font-bold text-slate-900">
                              {formatCurrency(dueAmount)}
                            </td>
                            <td className="py-2.5 text-center">
                              <button
                                onClick={() => onPayInstallmentQuick(inst.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                              >
                                تحصيل
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {overdueInstallments.length > 5 && (
                  <button
                    onClick={() => onNavigateTab('💵 التحصيل')}
                    className="w-full py-2 text-center text-xs text-blue-600 hover:underline font-semibold"
                  >
                    عرض جميع الأقساط المتأخرة ({overdueInstallments.length})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Units Status & Upcoming Loans */}
        <div className="space-y-6">
          {/* Units Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">حالة الوحدات العقارية</h3>
              </div>
              <button
                onClick={() => onNavigateTab('🏢 الوحدات')}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                إدارة الوحدات
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-xs text-emerald-800 block font-medium">مباعة</span>
                <span className="text-2xl font-black text-emerald-700">{unitsSold}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-xs text-amber-800 block font-medium">محجوزة</span>
                <span className="text-2xl font-black text-amber-700">{unitsReserved}</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <span className="text-xs text-blue-800 block font-medium">متاحة للبيع</span>
                <span className="text-2xl font-black text-blue-700">{unitsAvailable}</span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            {db.units.length > 0 && (
              <div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${(unitsSold / db.units.length) * 100}%` }}
                    className="bg-emerald-500 h-full"
                    title={`مباعة: ${unitsSold}`}
                  />
                  <div
                    style={{ width: `${(unitsReserved / db.units.length) * 100}%` }}
                    className="bg-amber-400 h-full"
                    title={`محجوزة: ${unitsReserved}`}
                  />
                  <div
                    style={{ width: `${(unitsAvailable / db.units.length) * 100}%` }}
                    className="bg-blue-500 h-full"
                    title={`متاحة: ${unitsAvailable}`}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-medium">
                  <span>إجمالي {db.units.length} وحدة</span>
                  <span>نسبة المبيعات: {Math.round((unitsSold / db.units.length) * 100)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Upcoming Loan Payments Alert */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">سداد قروض مستحقة خلال 30 يوم</h3>
                  <span className="text-xs text-slate-500">التزامات للمقرضين والبنوك</span>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('🏦 القروض')}
                className="text-xs font-semibold text-amber-700 hover:underline"
              >
                تفاصيل القروض
              </button>
            </div>

            {upcomingLoanPayments.length === 0 ? (
              <p className="text-xs text-emerald-600 font-semibold py-2">
                ✅ لا توجد أقساط قروض مستحقة خلال الـ 30 يوماً القادمة.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex justify-between items-center text-sm">
                  <span className="font-bold text-amber-900">المطلوب سداده خلال شهر:</span>
                  <span className="font-black text-amber-800 text-base">{formatCurrency(totalUpcomingLoanAmount)}</span>
                </div>
                <div className="space-y-1">
                  {upcomingLoanPayments.map(lp => {
                    const loan = db.loans.find(l => l.id === lp.loanId);
                    return (
                      <div key={lp.id} className="flex justify-between items-center text-xs py-1 px-2 hover:bg-slate-50 rounded">
                        <span className="font-semibold text-slate-800">{loan?.lenderName}</span>
                        <span className="font-mono text-slate-500">{lp.dueDate}</span>
                        <span className="font-bold text-slate-900">{formatCurrency(lp.amount - lp.paidAmount)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
