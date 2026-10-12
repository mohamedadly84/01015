import React, { useState } from 'react';
import { AppDatabase } from '../types';
import { formatCurrency, formatNumber } from '../utils/helpers';
import { exportElementToPdf, exportElementToImage, printDirectly } from '../utils/pdfExport';
import { X, Printer, TrendingUp, Download, Loader2 } from 'lucide-react';

interface Props {
  db: AppDatabase;
  onClose: () => void;
}

export const SummaryReportModal: React.FC<Props> = ({ db, onClose }) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingImg, setIsExportingImg] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Calculations
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
  const baseFilename = `التقرير_المالي_الشامل_${today}`;

  const overdueInstallments = db.installments.filter(
    i => i.dueDate < today && i.status !== 'مدفوع'
  );

  const unitsStatusCount = {
    'متاحة': db.units.filter(u => u.status === 'متاحة').length,
    'محجوزة': db.units.filter(u => u.status === 'محجوزة').length,
    'مباعة': db.units.filter(u => u.status === 'مباعة').length,
  };

  const handlePrint = () => {
    printDirectly('summary-report-print-area');
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    setNotice(null);
    try {
      const res = await exportElementToPdf('summary-report-print-area', baseFilename);
      if (!res.success && res.message) {
        setNotice(res.message);
      }
    } catch (err) {
      console.error(err);
      setNotice('تم تنزيل ملف التقرير كملف طباعة مستقل.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    setIsExportingImg(true);
    setNotice(null);
    try {
      await exportElementToImage('summary-report-print-area', baseFilename);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingImg(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] flex flex-col">
        {/* Top actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-lg">التقرير المالي الشامل</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm disabled:opacity-60 cursor-pointer"
              title="تنزيل كملف PDF"
            >
              {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isExportingPdf ? 'جاري التحميل...' : 'تحميل PDF'}</span>
            </button>
            <button
              onClick={handleDownloadImage}
              disabled={isExportingImg}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm disabled:opacity-60 cursor-pointer"
              title="تنزيل صورة عالية الجودة"
            >
              {isExportingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>صورة (واتساب)</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm cursor-pointer"
              title="طباعة التقرير"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {notice && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold print:hidden">
            {notice}
          </div>
        )}

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1">
          {/* Printable content */}
          <div className="p-8 bg-white text-slate-900 font-['Cairo',sans-serif] print:p-6 print:m-0 space-y-6" id="summary-report-print-area">
            <div className="border-b-2 border-slate-900 pb-4 text-center">
              <h1 className="text-2xl font-black text-slate-900">{db.settings.name}</h1>
              <p className="text-sm font-bold text-indigo-800 mt-1">التقرير المالي والمحاسبي الموحد للتطوير العقاري</p>
              <p className="text-xs text-slate-500 mt-1">تاريخ إصدار التقرير: {today}</p>
            </div>

          {/* Cashflow Card */}
          <div className="p-5 rounded-xl border border-indigo-200 bg-indigo-50/40">
            <h3 className="font-bold text-indigo-950 text-base mb-3 flex items-center gap-1.5">
              <span>💵 التدفق النقدي (Cash Flow)</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                <span className="text-xs text-slate-500 block">التدفق الداخل (تحصيلات)</span>
                <span className="font-bold text-emerald-700 text-base">{formatCurrency(cashIn)}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                <span className="text-xs text-slate-500 block">المصروفات المنفذة</span>
                <span className="font-bold text-red-600 text-base">{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                <span className="text-xs text-slate-500 block">سداد أقساط القروض</span>
                <span className="font-bold text-amber-700 text-base">{formatCurrency(totalLoanRepaid)}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                <span className="text-xs text-slate-500 block">صافي السيولة النقدية</span>
                <span className={`font-black text-lg ${netCashflow >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatCurrency(netCashflow)}
                </span>
              </div>
            </div>
          </div>

          {/* Sales & Collections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl border border-slate-300 bg-slate-50">
              <h4 className="font-bold text-slate-900 mb-2 border-b border-slate-200 pb-1">📈 المبيعات والعقود</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-600">عدد العقود المبرمة:</span>
                  <span className="font-bold">{db.contracts.length} عقد</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">إجمالي قيمة المبيعات:</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(totalSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">إجمالي المقدم المحصل:</span>
                  <span className="font-semibold">{formatCurrency(totalDown)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">متبقي مطلوب سداده:</span>
                  <span className="font-semibold text-blue-700">{formatCurrency(remainingSales)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-300 bg-slate-50">
              <h4 className="font-bold text-slate-900 mb-2 border-b border-slate-200 pb-1">🏦 القروض والمديونيات</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-600">إجمالي القروض المقترضة:</span>
                  <span className="font-bold">{formatCurrency(totalBorrowed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">المسدد للمقرضين:</span>
                  <span className="font-semibold text-emerald-700">{formatCurrency(totalLoanRepaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">المديونية المتبقية:</span>
                  <span className="font-bold text-red-600">{formatCurrency(totalDebt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">عدد القروض النشطة:</span>
                  <span className="font-semibold">{db.loans.filter(l => l.status === 'نشط').length} قرض</span>
                </div>
              </div>
            </div>
          </div>

          {/* Units Status Breakdown */}
          <div className="p-4 rounded-xl border border-slate-300 bg-slate-50">
            <h4 className="font-bold text-slate-900 mb-2 border-b border-slate-200 pb-1">🏢 حالة الوحدات الإجمالية</h4>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-xs text-slate-500 block">إجمالي الوحدات</span>
                <span className="font-black text-slate-800 text-lg">{db.units.length}</span>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded border border-emerald-200">
                <span className="text-xs text-emerald-700 block">الوحدات المباعة</span>
                <span className="font-black text-emerald-800 text-lg">{unitsStatusCount['مباعة']}</span>
              </div>
              <div className="bg-amber-50 p-2.5 rounded border border-amber-200">
                <span className="text-xs text-amber-700 block">الوحدات المحجوزة</span>
                <span className="font-black text-amber-800 text-lg">{unitsStatusCount['محجوزة']}</span>
              </div>
              <div className="bg-blue-50 p-2.5 rounded border border-blue-200">
                <span className="text-xs text-blue-700 block">الوحدات المتاحة</span>
                <span className="font-black text-blue-800 text-lg">{unitsStatusCount['متاحة']}</span>
              </div>
            </div>
          </div>

          {/* Overdue Installments if any */}
          {overdueInstallments.length > 0 && (
            <div className="text-sm">
              <h4 className="font-bold text-red-700 mb-2 flex items-center gap-1.5">
                <span>⚠️ الأقساط المتأخرة المستحقة ({overdueInstallments.length})</span>
              </h4>
              <div className="overflow-x-auto border border-red-200 rounded-lg">
                <table className="w-full text-right text-xs">
                  <thead className="bg-red-50 text-red-900 font-bold border-b border-red-200">
                    <tr>
                      <th className="py-2 px-3">رقم العقد</th>
                      <th className="py-2 px-3">العميل</th>
                      <th className="py-2 px-3">الوحدة</th>
                      <th className="py-2 px-3">تاريخ الاستحقاق</th>
                      <th className="py-2 px-3">المبلغ المستحق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {overdueInstallments.map(inst => {
                      const contract = db.contracts.find(c => c.id === inst.contractId);
                      const customer = db.customers.find(c => c.id === contract?.customerId);
                      const unit = db.units.find(u => u.id === contract?.unitId);
                      return (
                        <tr key={inst.id} className="hover:bg-red-50/50">
                          <td className="py-1.5 px-3 font-mono font-bold">#{contract?.id}</td>
                          <td className="py-1.5 px-3">{customer?.name || '-'}</td>
                          <td className="py-1.5 px-3">{unit ? `${unit.unitNumber} (${unit.building})` : '-'}</td>
                          <td className="py-1.5 px-3 font-mono text-red-600 font-bold">{inst.dueDate}</td>
                          <td className="py-1.5 px-3 font-bold text-red-700">{formatCurrency(inst.amount - inst.paidAmount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

            {/* Signatures */}
            <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-center text-sm">
              <div>
                <p className="font-bold text-slate-800">إعداد المحاسب المسؤول:</p>
                <div className="mt-8 border-b border-slate-400 w-48 mx-auto"></div>
              </div>
              <div>
                <p className="font-bold text-slate-800">اعتماد الإدارة العامة:</p>
                <div className="mt-8 border-b border-slate-400 w-48 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
