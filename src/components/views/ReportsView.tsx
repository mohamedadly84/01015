import React from 'react';
import { AppDatabase } from '../../types';
import { formatCurrency, downloadCSV } from '../../utils/helpers';
import {
  TrendingUp, Printer, Download, DollarSign, Wallet,
  Building, PieChart, BarChart3, CheckCircle, ArrowDownRight, ArrowUpRight
} from 'lucide-react';

interface Props {
  db: AppDatabase;
  onOpenSummaryReport: () => void;
}

export const ReportsView: React.FC<Props> = ({ db, onOpenSummaryReport }) => {
  // Cashflow
  const totalCollected = db.installments.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalExpenses = db.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalLoanRepaid = db.loanPayments.reduce((sum, lp) => sum + lp.paidAmount, 0);

  const cashIn = totalCollected;
  const cashOut = totalExpenses + totalLoanRepaid;
  const netCashflow = cashIn - cashOut;

  // Sales
  const totalSales = db.contracts.reduce((sum, c) => sum + c.totalPrice, 0);
  const totalDown = db.contracts.reduce((sum, c) => sum + c.downPayment, 0);
  const remainingSales = totalSales - totalDown;

  // Buildings list
  const buildings = Array.from(
    new Set([
      ...db.units.map(u => u.building),
      ...db.expenses.map(e => e.building),
    ].filter(Boolean))
  );

  // Sales by building
  const salesByBuilding = buildings.map(b => {
    const contractsInB = db.contracts.filter(c => {
      const u = db.units.find(x => x.id === c.unitId);
      return u?.building === b;
    });
    const sum = contractsInB.reduce((s, c) => s + c.totalPrice, 0);
    return { building: b, count: contractsInB.length, sum };
  });

  // Unit Profitability Calculation
  const unitProfitability = db.units.map(unit => {
    const buildingExpenses = db.expenses
      .filter(e => e.building === unit.building)
      .reduce((s, e) => s + e.amount, 0);

    const unitsInBuilding = db.units.filter(u => u.building === unit.building).length || 1;
    const unitCost = buildingExpenses / unitsInBuilding;

    const contract = db.contracts.find(c => c.unitId === unit.id);
    const salePrice = contract ? contract.totalPrice : 0;
    const profit = salePrice > 0 ? salePrice - unitCost : -unitCost;
    const margin = salePrice > 0 ? Math.round((profit / salePrice) * 100) : 0;

    return {
      unitNumber: unit.unitNumber,
      building: unit.building,
      floor: unit.floor,
      area: unit.area,
      listPrice: unit.price,
      status: unit.status,
      salePrice,
      unitCost,
      profit,
      margin,
    };
  });

  const handleExportProfitabilityCSV = () => {
    const headers = [
      'رقم الوحدة', 'العمارة', 'المساحة', 'السعر المعروض',
      'الحالة', 'سعر البيع الفعلي', 'تكلفة الوحدة', 'صافي الربح', 'هامش الربح %'
    ];
    const rows = unitProfitability.map(p => [
      p.unitNumber,
      p.building,
      p.area,
      p.listPrice,
      p.status,
      p.salePrice,
      Math.round(p.unitCost),
      Math.round(p.profit),
      `${p.margin}%`,
    ]);
    downloadCSV('تقرير_ربحية_الوحدات_العقارية', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-slate-800">التقارير المالية وتحليل الربحية</h2>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            تحليل التدفق النقدي، المبيعات حسب المشروع، وربحية كل وحدة بناءً على تكاليف الإنشاء
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportProfitabilityCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition border border-slate-200"
          >
            <Download className="w-4 h-4" />
            <span>تصدير ربحية الوحدات Excel</span>
          </button>
          <button
            onClick={onOpenSummaryReport}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير الشامل</span>
          </button>
        </div>
      </div>

      {/* Cashflow Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-indigo-600" />
          <span>💵 تقرير التدفق النقدي (Cash Flow Statement)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-medium mb-1">
              <span>التدفق الداخل (تحصيلات)</span>
              <ArrowDownRight className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-2xl font-black text-emerald-700 block">
              {formatCurrency(cashIn)}
            </span>
            <span className="text-[11px] text-emerald-600 mt-1 block">توريدات نقدية من العملاء</span>
          </div>

          <div className="p-4 bg-red-50 rounded-xl border border-red-100">
            <div className="flex items-center justify-between text-xs text-red-800 font-medium mb-1">
              <span>مصروفات الإنشاء</span>
              <ArrowUpRight className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-2xl font-black text-red-700 block">
              {formatCurrency(totalExpenses)}
            </span>
            <span className="text-[11px] text-red-600 mt-1 block">مواد ومقاولات ومصاريف</span>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <div className="flex items-center justify-between text-xs text-amber-800 font-medium mb-1">
              <span>سداد أقساط القروض</span>
              <ArrowUpRight className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-2xl font-black text-amber-700 block">
              {formatCurrency(totalLoanRepaid)}
            </span>
            <span className="text-[11px] text-amber-600 mt-1 block">تسديدات للبنوك والمقرضين</span>
          </div>

          <div className={`p-4 rounded-xl border ${
            netCashflow >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-red-50 border-red-200'
          }`}>
            <span className="text-xs font-semibold text-slate-700 block mb-1">
              صافي السيولة النقدية
            </span>
            <span className={`text-2xl font-black block ${
              netCashflow >= 0 ? 'text-indigo-800' : 'text-red-700'
            }`}>
              {formatCurrency(netCashflow)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              الفائض / العجز النقدي الفعلي
            </span>
          </div>
        </div>
      </div>

      {/* Sales Summary & Sales by Building */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <span>💰 ملخص المبيعات والتعاقدات</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block">إجمالي العقود الموقعة</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">{db.contracts.length} عقد</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block">إجمالي قيمة المبيعات</span>
              <span className="text-xl font-bold text-blue-700 mt-1 block">{formatCurrency(totalSales)}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block">المقدمات المسددة</span>
              <span className="text-xl font-bold text-emerald-700 mt-1 block">{formatCurrency(totalDown)}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block">المتبقي على العملاء</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{formatCurrency(remainingSales)}</span>
            </div>
          </div>
        </div>

        {/* Sales by building */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-600" />
            <span>🏢 المبيعات حسب المشروع / العمارة</span>
          </h3>

          <div className="space-y-3">
            {salesByBuilding.map(sb => (
              <div key={sb.building} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-sm">{sb.building}</span>
                  <span className="text-xs text-slate-400">{sb.count} عقود بيع</span>
                </div>
                <div className="text-left">
                  <span className="font-black text-slate-900 block text-sm">{formatCurrency(sb.sum)}</span>
                  <span className="text-[10px] text-slate-400">
                    {totalSales > 0 ? `${Math.round((sb.sum / totalSales) * 100)}% من المبيعات` : '0%'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unit Profitability Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">🎯 تحليل ربحية الوحدات (Unit Profitability)</h3>
            <span className="text-xs text-slate-500">
              يتم توزيع تكلفة إنشاء العمارة بالتساوي على عدد وحداتها ومقارنتها بسعر البيع الفعلي
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-xs">
              <tr>
                <th className="py-3 px-4">الوحدة</th>
                <th className="py-3 px-4">العمارة</th>
                <th className="py-3 px-4">المساحة</th>
                <th className="py-3 px-4">السعر المعروض</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4">سعر البيع الفعلي</th>
                <th className="py-3 px-4">التكلفة التقديرية</th>
                <th className="py-3 px-4">صافي الربح</th>
                <th className="py-3 px-4 text-center">هامش الربح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {unitProfitability.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4 font-black text-slate-900">{p.unitNumber}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">{p.building}</td>
                  <td className="py-3.5 px-4 text-slate-600">{p.area} م²</td>
                  <td className="py-3.5 px-4 text-slate-700">{formatCurrency(p.listPrice)}</td>
                  <td className="py-3.5 px-4">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                      p.status === 'مباعة' ? 'bg-emerald-50 text-emerald-700' :
                      p.status === 'محجوزة' ? 'bg-amber-50 text-amber-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {p.salePrice > 0 ? formatCurrency(p.salePrice) : '---'}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-red-600">
                    {formatCurrency(Math.round(p.unitCost))}
                  </td>
                  <td className="py-3.5 px-4 font-black">
                    {p.salePrice > 0 ? (
                      <span className={p.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                        {formatCurrency(Math.round(p.profit))}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">لم تُبع بعد</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold">
                    {p.salePrice > 0 ? (
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        p.margin >= 20 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {p.margin}%
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
