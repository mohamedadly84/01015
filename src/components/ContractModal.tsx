import React, { useState } from 'react';
import { Contract, Customer, Installment, Unit, CompanySettings } from '../types';
import { formatCurrency, formatNumber, numberToArabicWords } from '../utils/helpers';
import { exportElementToPdf, exportElementToImage, printDirectly } from '../utils/pdfExport';
import { X, Printer, FileText, Download, Loader2 } from 'lucide-react';

interface Props {
  contract: Contract | null;
  customer: Customer | null;
  unit: Unit | null;
  installments: Installment[];
  settings: CompanySettings;
  onClose: () => void;
}

export const ContractModal: React.FC<Props> = ({
  contract,
  customer,
  unit,
  installments,
  settings,
  onClose,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingImg, setIsExportingImg] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!contract || !customer || !unit) return null;

  const remainingAmount = contract.totalPrice - contract.downPayment;
  const baseFilename = `عقد_بيع_وحدة_${unit.unitNumber}_${customer.name}`;

  const handlePrint = () => {
    printDirectly('contract-print-area');
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    setNotice(null);
    try {
      const res = await exportElementToPdf('contract-print-area', baseFilename);
      if (!res.success && res.message) {
        setNotice(res.message);
      }
    } catch (err) {
      console.error(err);
      setNotice('تم تنزيل ملف العقد كملف طباعة مستقل.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    setIsExportingImg(true);
    setNotice(null);
    try {
      await exportElementToImage('contract-print-area', baseFilename);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingImg(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] flex flex-col">
        {/* Top bar (Hidden on print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-lg">عقد بيع وحدة سكنية #{contract.id}</h3>
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
              title="طباعة العقد"
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

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto flex-1">
          {/* Contract printable container */}
          <div className="p-8 bg-white text-slate-900 font-['Cairo',sans-serif] print:p-6 print:m-0 space-y-6" id="contract-print-area">
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-center text-center">
              <div className="text-right">
                <h2 className="text-xl font-bold text-slate-900">{settings.name}</h2>
                <p className="text-xs text-slate-600">{settings.address}</p>
                <p className="text-xs text-slate-600">هاتف: {settings.phone}</p>
              </div>
              <div className="border-2 border-slate-900 px-6 py-2 rounded-lg bg-slate-50">
                <h1 className="text-2xl font-black tracking-wider text-slate-900">عقد بيع ابتدائي لوحدة سكنية</h1>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">رقم العقد: #{contract.id} | التاريخ: {contract.contractDate}</p>
              </div>
              <div className="text-left font-mono text-xs text-slate-500">
                <span>بتاريخ: {contract.contractDate}</span>
              </div>
            </div>

            <div className="text-sm leading-relaxed text-slate-700">
              أنه في يوم {contract.contractDate}، تحرر هذا العقد بين كلاً من:
            </div>

            {/* Parties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl border border-slate-300 bg-slate-50">
                <h3 className="font-bold text-slate-900 mb-2 border-b border-slate-200 pb-1">الطرف الأول (البائع):</h3>
                <p className="font-semibold text-slate-800">{settings.name}</p>
                <p className="text-xs text-slate-600 mt-1">المقر: {settings.address}</p>
                <p className="text-xs text-slate-600">السجل التجاري والبطاقة الضريبية: {settings.taxNumber}</p>
                <p className="text-xs text-slate-600">ويمثلها قانوناً: الإدارة المفوضة</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-300 bg-slate-50">
                <h3 className="font-bold text-slate-900 mb-2 border-b border-slate-200 pb-1">الطرف الثاني (المشتري):</h3>
                <p className="font-semibold text-slate-800">{customer.name}</p>
                <p className="text-xs text-slate-600 mt-1">الرقم القومي: {customer.nationalId || '---'}</p>
                <p className="text-xs text-slate-600">رقم الهاتف: {customer.phone || '---'}</p>
                <p className="text-xs text-slate-600">العنوان: {customer.address || '---'}</p>
              </div>
            </div>

            {/* Unit Description */}
            <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 text-sm">
              <h3 className="font-bold text-slate-900 mb-2 border-b border-slate-200 pb-1">أولاً: بيانات موضوع البيع:</h3>
              <p className="leading-relaxed">
                باع وأسقط وتنازل الطرف الأول بكافة الضمانات الفعلية والقانونية إلى الطرف الثاني القابل لذلك الوحدة السكنية رقم{' '}
                <strong className="text-slate-900">({unit.unitNumber})</strong> الكائنة بالعقار المشيد باسم{' '}
                <strong className="text-slate-900">({unit.building})</strong>، بالدور{' '}
                <strong className="text-slate-900">({unit.floor})</strong>، وبمساحة إجمالية قدرها{' '}
                <strong className="text-slate-900">({unit.area} م²)</strong> تقريباً تحت العجز والزيادة.
              </p>
            </div>

            {/* Financial Terms */}
            <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 text-sm space-y-2">
              <h3 className="font-bold text-slate-900 mb-2 border-b border-slate-200 pb-1">ثانياً: الثمن وطريقة السداد:</h3>
              <p>
                تم هذا البيع نظير ثمن إجمالي متفق عليه وقدره <strong className="text-emerald-700 text-base">{formatCurrency(contract.totalPrice)}</strong> ({numberToArabicWords(contract.totalPrice)})، يُسدد على النحو التالي:
              </p>
              <div className="grid grid-cols-3 gap-3 pt-2 text-center">
                <div className="p-2.5 bg-white rounded border border-slate-200">
                  <span className="text-xs text-slate-500 block">إجمالي القيمة</span>
                  <span className="font-bold text-slate-800">{formatCurrency(contract.totalPrice)}</span>
                </div>
                <div className="p-2.5 bg-white rounded border border-slate-200">
                  <span className="text-xs text-slate-500 block">المقدم المدفوع عند التعاقد</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(contract.downPayment)}</span>
                </div>
                <div className="p-2.5 bg-white rounded border border-slate-200">
                  <span className="text-xs text-slate-500 block">المتبقي المطلوب جدولته</span>
                  <span className="font-bold text-blue-700">{formatCurrency(remainingAmount)}</span>
                </div>
              </div>
              {contract.notes && (
                <p className="text-xs text-slate-500 italic mt-2">ملاحظات العقد: {contract.notes}</p>
              )}
            </div>

            {/* Installments Table */}
            {installments.length > 0 && (
              <div className="text-sm">
                <h3 className="font-bold text-slate-900 mb-2">ثالثاً: جدول استحقاق الأقساط والدفعات:</h3>
                <div className="overflow-x-auto border border-slate-300 rounded-lg">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <tr>
                        <th className="py-2 px-3 text-center w-14">م</th>
                        {installments.some(i => !!i.notes) && (
                          <th className="py-2 px-3">البيان / الوصف</th>
                        )}
                        <th className="py-2 px-3">تاريخ الاستحقاق</th>
                        <th className="py-2 px-3">القيمة المستحقة</th>
                        <th className="py-2 px-3">المدفوع</th>
                        <th className="py-2 px-3 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {installments.map(inst => (
                        <tr key={inst.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-center font-bold">{inst.installmentNumber}</td>
                          {installments.some(i => !!i.notes) && (
                            <td className="py-2 px-3 text-slate-700 font-medium">{inst.notes || `قسط ${inst.installmentNumber}`}</td>
                          )}
                          <td className="py-2 px-3 font-mono">{inst.dueDate}</td>
                          <td className="py-2 px-3 font-bold">{formatCurrency(inst.amount)}</td>
                          <td className="py-2 px-3 text-emerald-700 font-medium">{formatCurrency(inst.paidAmount)}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              inst.status === 'مدفوع' ? 'bg-emerald-100 text-emerald-800' :
                              inst.status === 'مدفوع جزئيًا' ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {inst.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-center text-sm">
              <div className="space-y-12">
                <p className="font-bold text-slate-900">الطرف الأول (البائع):</p>
                <div className="border-b border-slate-400 w-52 mx-auto"></div>
                <p className="text-xs text-slate-500">خاتم الشركة / التوقيع</p>
              </div>
              <div className="space-y-12">
                <p className="font-bold text-slate-900">الطرف الثاني (المشتري):</p>
                <div className="border-b border-slate-400 w-52 mx-auto"></div>
                <p className="text-xs text-slate-500">الاسم والتوقيع والبصمة</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
