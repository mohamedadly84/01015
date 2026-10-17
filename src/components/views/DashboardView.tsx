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
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Quick Actions - Luxury Glass Panel */}
      <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-3xl glass-panel border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-cyan-500/25 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/30">🏢</span>
            <div>
              <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-white via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
                لوحة التحكم والمؤشرات المالية
              </h1>
              <p className="text-slate-300 text-sm mt-1 font-medium">
                متابعة فورية ذكية للمبيعات، التحصيلات، السيولة، وحالة الوحدات العقارية
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('🏗️ المشاريع')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-white rounded-xl text-sm font-semibold transition border border-slate-700/60 shadow-lg shadow-black/20 hover:scale-[1.02]"
          >
            <span>🏗️ المشاريع</span>
            <ArrowUpRight className="w-4 h-4 text-indigo-400" />
          </button>
          <button
            onClick={() => onNavigateTab('💰 البيع')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-600/30 hover:scale-[1.02]"
          >
            <span>عقد بيع جديد</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigateTab('💵 التحصيل')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-600/30 hover:scale-[1.02]"
          >
            <span>تحصيل قسط</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigateTab('🧾 المصروفات')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 rounded-xl text-sm font-semibold transition hover:scale-[1.02]"
          >
            <span>إضافة مصروف</span>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Row 1 Metrics: Key Cash & Sales indicators - Luxury Glass Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition" />
          <div className="flex items-center justify-between text-slate-400 text-sm mb-3">
            <span className="font-semibold">💵 صافي التدفق النقدي</span>
            <div className={`p-2.5 rounded-2xl ${netCashflow >= 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'}`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl font-black ${netCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(netCashflow)}
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">
            التحصيلات ({formatCurrency(cashIn)}) - المصروفات ({formatCurrency(cashOut)})
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition" />
          <div className="flex items-center justify-between text-slate-400 text-sm mb-3">
            <span className="font-semibold">📈 إجمالي المبيعات</span>
            <div className="p-2.5 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {formatCurrency(totalSales)}
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">
            إجمالي قيمة {db.contracts.length} عقد مبرم
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition" />
          <div className="flex items-center justify-between text-slate-400 text-sm mb-3">
            <span className="font-semibold">💰 المحصّل الفعلي</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {formatCurrency(totalCollected)}
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">
            متبقي للتحصيل: {formatCurrency(totalDue)}
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition" />
          <div className="flex items-center justify-between text-slate-400 text-sm mb-3">
            <span className="font-semibold">🏦 المديونية المتبقية</span>
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400">
            {formatCurrency(totalDebt)}
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">
            من إجمالي مقترض {formatCurrency(totalBorrowed)}
          </div>
        </div>
      </div>

      {/* Row 2 Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl text-center">
          <span className="text-xs text-slate-400 block font-medium">🏢 عقود البيع</span>
          <span className="text-xl font-black text-white mt-1 block">{db.contracts.length} عقد</span>
        </div>
        <div className="glass-card p-4 rounded-2xl text-center">
          <span className="text-xs text-slate-400 block font-medium">⏳ متبقي على العملاء</span>
          <span className="text-xl font-black text-cyan-400 mt-1 block">{formatCurrency(remainingSales)}</span>
        </div>
        <div className="glass-card p-4 rounded-2xl text-center">
          <span className="text-xs text-slate-400 block font-medium">🧾 مصروفات الإنشاء</span>
          <span className="text-xl font-black text-red-400 mt-1 block">{formatCurrency(totalExpenses)}</span>
        </div>
        <div className="glass-card p-4 rounded-2xl text-center">
          <span className="text-xs text-slate-400 block font-medium">🏦 إجمالي المقترض</span>
          <span className="text-xl font-black text-amber-400 mt-1 block">{formatCurrency(totalBorrowed)}</span>
        </div>
      </div>

      {/* Widgets Grid: Overdue Installments & Units Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Installments */}
        <div className="glass-panel rounded-3xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-500/15 text-red-400 border border-red-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">أقساط متأخرة مستحقة</h3>
                <span className="text-xs text-slate-400">تحتاج متابعة مع العملاء</span>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              overdueInstallments.length > 0 ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {overdueInstallments.length > 0 ? `${overdueInstallments.length} قسط متأخر` : 'لا توجد متأخرات'}
            </span>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            {overdueInstallments.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="font-bold text-white">ممتاز! لا توجد أي أقساط متأخرة حالياً</p>
                <p className="text-xs text-slate-400">جميع الأقساط مسددة في مواعيدها المحددة.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-3">العميل والوحدة</th>
                        <th className="pb-3">التاريخ</th>
                        <th className="pb-3">المبلغ</th>
                        <th className="pb-3 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {overdueInstallments.slice(0, 5).map(inst => {
                        const contract = db.contracts.find(c => c.id === inst.contractId);
                        const customer = db.customers.find(c => c.id === contract?.customerId);
                        const unit = db.units.find(u => u.id === contract?.unitId);
                        const dueAmount = inst.amount - inst.paidAmount;

                        return (
                          <tr key={inst.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3">
                              <span className="font-bold text-white block">{customer?.name || 'عميل'}</span>
                              <span className="text-slate-400 text-[11px]">
                                {unit ? `وحدة ${unit.unitNumber} - ${unit.building}` : ''}
                              </span>
                            </td>
                            <td className="py-3 font-mono text-red-400 font-semibold">
                              {inst.dueDate}
                            </td>
                            <td className="py-3 font-bold text-white">
                              {formatCurrency(dueAmount)}
                            </td>
                            <td className="py-3 text-center">
                              <button
                                onClick={() => onPayInstallmentQuick(inst.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20"
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
                    className="w-full py-2.5 text-center text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition"
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
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">حالة الوحدات العقارية</h3>
              </div>
              <button
                onClick={() => onNavigateTab('🏢 الوحدات')}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
              >
                إدارة الوحدات
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center mb-5">
              <div className="p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <span className="text-xs text-emerald-300 block font-medium">مباعة</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">{unitsSold}</span>
              </div>
              <div className="p-3.5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <span className="text-xs text-amber-300 block font-medium">محجوزة</span>
                <span className="text-2xl font-black text-amber-400 mt-1 block">{unitsReserved}</span>
              </div>
              <div className="p-3.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <span className="text-xs text-blue-300 block font-medium">متاحة للبيع</span>
                <span className="text-2xl font-black text-blue-400 mt-1 block">{unitsAvailable}</span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            {db.units.length > 0 && (
              <div>
                <div className="h-3 w-full bg-slate-800/80 rounded-full overflow-hidden flex p-0.5 border border-slate-700/60">
                  <div
                    style={{ width: `${(unitsSold / db.units.length) * 100}%` }}
                    className="bg-emerald-500 rounded-full transition-all"
                    title={`مباعة: ${unitsSold}`}
                  />
                  <div
                    style={{ width: `${(unitsReserved / db.units.length) * 100}%` }}
                    className="bg-amber-400 rounded-full transition-all"
                    title={`محجوزة: ${unitsReserved}`}
                  />
                  <div
                    style={{ width: `${(unitsAvailable / db.units.length) * 100}%` }}
                    className="bg-blue-500 rounded-full transition-all"
                    title={`متاحة: ${unitsAvailable}`}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-2.5 font-medium">
                  <span>إجمالي {db.units.length} وحدة</span>
                  <span>نسبة المبيعات: <strong className="text-white">{Math.round((unitsSold / db.units.length) * 100)}%</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Upcoming Loan Payments Alert */}
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">سداد قروض مستحقة خلال 30 يوم</h3>
                  <span className="text-xs text-slate-400">التزامات للمقرضين والبنوك</span>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('🏦 القروض')}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 transition"
              >
                تفاصيل القروض
              </button>
            </div>

            {upcomingLoanPayments.length === 0 ? (
              <p className="text-xs text-emerald-400 font-semibold py-2">
                ✅ لا توجد أقساط قروض مستحقة خلال الـ 30 يوماً القادمة.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20 flex justify-between items-center text-sm">
                  <span className="font-bold text-amber-300">المطلوب سداده خلال شهر:</span>
                  <span className="font-black text-amber-400 text-base">{formatCurrency(totalUpcomingLoanAmount)}</span>
                </div>
                <div className="space-y-2">
                  {upcomingLoanPayments.map(lp => {
                    const loan = db.loans.find(l => l.id === lp.loanId);
                    return (
                      <div key={lp.id} className="flex justify-between items-center text-xs py-2 px-3 bg-slate-800/40 rounded-xl border border-slate-800">
                        <span className="font-bold text-white">{loan?.lenderName}</span>
                        <span className="font-mono text-slate-400">{lp.dueDate}</span>
                        <span className="font-bold text-amber-400">{formatCurrency(lp.amount - lp.paidAmount)}</span>
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
