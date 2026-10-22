import React, { useState } from 'react';
import { Contract, Customer, Installment, Unit, CompanySettings } from '../types';
import { formatCurrency, formatNumber, numberToArabicWords } from '../utils/helpers';
import { exportElementToPdf, exportElementToImage, printDirectly } from '../utils/pdfExport';
import { X, Printer, CheckCircle, Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  installment: Installment | null;
  contract: Contract | null;
  customer: Customer | null;
  unit: Unit | null;
  settings: CompanySettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<Props> = ({
  installment,
  contract,
  customer,
  unit,
  settings,
  onClose,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingImg, setIsExportingImg] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!installment) return null;

  if (!contract || !customer || !unit) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl border border-slate-200">
          <p className="text-sm font-bold text-slate-800">
            تعذر العثور على بيانات العقد أو العميل أو الوحدة المرتبطة بهذا القسط
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    );
  }

  const receiptNumber = `REC-${contract.id.toString().padStart(3, '0')}-${installment.installmentNumber}`;
  const amountWords = numberToArabicWords(installment.paidAmount || installment.amount);
  const baseFilename = `إيصال_استلام_${receiptNumber}_${customer.name}`;

  const handlePrint = () => {
    printDirectly('receipt-print-area');
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    setNotice(null);
    try {
      const res = await exportElementToPdf('receipt-print-area', baseFilename);
      if (!res.success && res.message) {
        setNotice(res.message);
      }
    } catch (err) {
      console.error(err);
      setNotice('تم تنزيل ملف المستند كملف طباعة مستقل.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    setIsExportingImg(true);
    setNotice(null);
    try {
      await exportElementToImage('receipt-print-area', baseFilename);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingImg(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-6"
      >
        {/* Modal Top Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-lg">إيصال استلام نقدية</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm disabled:opacity-60 cursor-pointer"
              title="تنزيل كملف PDF"
            >
              {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isExportingPdf ? 'جاري التحميل...' : 'تحميل PDF'}</span>
            </button>
            <button
              onClick={handleDownloadImage}
              disabled={isExportingImg}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm disabled:opacity-60 cursor-pointer"
              title="تنزيل صورة للواتساب"
            >
              {isExportingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>صورة (واتساب)</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm cursor-pointer"
              title="طباعة الإيصال"
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

        {/* Printable Receipt Body */}
        <div className="p-8 bg-white text-slate-800 font-['Cairo',sans-serif] print:p-6 print:m-0" id="receipt-print-area">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-5 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">{settings.name}</h1>
              <p className="text-xs text-slate-600 mt-1">{settings.address}</p>
              <p className="text-xs text-slate-600">هاتف: {settings.phone} | الرقم الضريبي: {settings.taxNumber}</p>
            </div>
            <div className="text-left">
              <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold px-3 py-1 rounded text-sm mb-1">
                إيصال استلام نقدية
              </span>
              <p className="text-xs text-slate-500 font-mono mt-1">رقم الإيصال: {receiptNumber}</p>
              <p className="text-xs text-slate-500">التاريخ: {installment.dueDate}</p>
            </div>
          </div>

          {/* Main Statement */}
          <div className="space-y-4 text-sm leading-relaxed border border-slate-200 rounded-xl p-6 bg-slate-50/50">
            <div className="flex items-baseline">
              <span className="font-semibold text-slate-700 w-36">استلمنا من السيد/ة:</span>
              <span className="font-bold text-slate-900 text-base border-b border-dotted border-slate-400 flex-1 pb-1">
                {customer.name}
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="font-semibold text-slate-700 w-36">الرقم القومي:</span>
              <span className="font-mono text-slate-800 border-b border-dotted border-slate-400 flex-1 pb-1">
                {customer.nationalId || '---'}
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="font-semibold text-slate-700 w-36">مبلغ وقدره:</span>
              <div className="flex-1 border-b border-dotted border-slate-400 pb-1 flex justify-between items-center">
                <span className="font-extrabold text-emerald-700 text-lg">
                  {formatCurrency(installment.paidAmount || installment.amount)}
                </span>
                <span className="text-xs text-slate-500">({formatNumber(installment.paidAmount || installment.amount)} {settings.currency})</span>
              </div>
            </div>

            <div className="flex items-baseline">
              <span className="font-semibold text-slate-700 w-36">فقط وقدره كتابةً:</span>
              <span className="font-semibold text-slate-800 border-b border-dotted border-slate-400 flex-1 pb-1 text-xs">
                {amountWords}
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="font-semibold text-slate-700 w-36">وذلك عن سداد:</span>
              <span className="font-medium text-slate-800 border-b border-dotted border-slate-400 flex-1 pb-1">
                {installment.notes ? `${installment.notes} (القسط رقم ${installment.installmentNumber})` : `القسط رقم (${installment.installmentNumber})`} من عقد البيع رقم #{contract.id}
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="font-semibold text-slate-700 w-36">بيانات الوحدة:</span>
              <span className="font-medium text-slate-800 border-b border-dotted border-slate-400 flex-1 pb-1">
                شقة رقم ({unit.unitNumber}) - {unit.building} - الدور {unit.floor} - المساحة {unit.area} م²
              </span>
            </div>
          </div>

          {/* Dues summary */}
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">إجمالي قيمة القسط</span>
              <span className="font-bold text-slate-800 text-sm">{formatCurrency(installment.amount)}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-xs text-emerald-700 block">المبلغ المدفوع</span>
              <span className="font-bold text-emerald-800 text-sm">{formatCurrency(installment.paidAmount || installment.amount)}</span>
            </div>
            <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">المتبقي من القسط</span>
              <span className="font-bold text-slate-800 text-sm">
                {formatCurrency(Math.max(0, installment.amount - (installment.paidAmount || installment.amount)))}
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-10 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-sm">
            <div>
              <p className="font-semibold text-slate-700">توقيع المستلم (الخزينة):</p>
              <div className="mt-8 border-b border-slate-400 w-48 mx-auto"></div>
            </div>
            <div>
              <p className="font-semibold text-slate-700">توقيع المودع / العميل:</p>
              <div className="mt-8 border-b border-slate-400 w-48 mx-auto"></div>
            </div>
          </div>

          <div className="mt-8 text-center text-slate-400 text-[11px]">
            * هذا الإيصال معتمد ومولد آلياً من نظام إدارة المحاسبة العقارية.
          </div>
        </div>
      </motion.div>
    </div>
  );
};
