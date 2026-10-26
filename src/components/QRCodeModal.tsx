import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Unit } from '../types';
import { formatCurrency } from '../utils/helpers';
import { printDirectly, exportElementToPdf } from '../utils/pdfExport';
import { UnitFloorPlan } from './UnitFloorPlan';
import {
  X, Download, Printer, ExternalLink, Copy, Check,
  Sparkles, FileText, Building2, Phone, MapPin, Loader2, Compass
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  unit: Unit | null;
  companyName?: string;
  companyPhone?: string;
  companyAddress?: string;
  onClose: () => void;
  onOpenUnitPreview?: (unitId: number) => void;
}

export const QRCodeModal: React.FC<Props> = ({
  unit,
  companyName = '',
  companyPhone = '',
  companyAddress = '',
  onClose,
  onOpenUnitPreview,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Build the live public URL for scanning
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const liveScanUrl = unit ? `${currentOrigin}/?unit=${unit.id}` : '';

  useEffect(() => {
    if (!unit || !liveScanUrl) return;

    // Generate QR Code containing the live URL so when scanned it always loads the latest status
    QRCode.toDataURL(liveScanUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setQrUrl(url))
      .catch(err => console.error('QR generation error:', err));
  }, [unit, liveScanUrl]);

  if (!unit) return null;

  const handleDownloadQrImage = () => {
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `QR_Unit_${unit.unitNumber}_${unit.building}.png`;
    a.click();
  };

  const handlePrint = () => {
    printDirectly('qr-printable-poster');
  };

  const handleDownloadPdfBrochure = async () => {
    try {
      setIsExportingPdf(true);
      await exportElementToPdf('qr-printable-poster', `بروشور_الوحدة_${unit.unitNumber}_${unit.building}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      // Fallback to direct print
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCopyLink = () => {
    if (!liveScanUrl) return;
    navigator.clipboard.writeText(liveScanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPreview = () => {
    if (!unit) return;
    if (onOpenUnitPreview) {
      onOpenUnitPreview(unit.id);
      onClose();
    } else if (liveScanUrl) {
      window.open(liveScanUrl, '_blank');
    }
  };

  // Status badges
  const statusColor =
    unit.status === 'متاحة'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : unit.status === 'محجوزة'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-rose-100 text-rose-800 border-rose-300';

  const rooms = unit.roomsCount || (unit.area >= 160 ? 4 : unit.area >= 120 ? 3 : 2);
  const baths = unit.bathroomsCount || (unit.area >= 140 ? 2 : 1);
  const finishing = unit.finishingType || 'سوبر لوكس';
  const orientation = unit.orientation || 'بحري';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-indigo-600/30">
              QR
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <span>رمز QR والبروشور التوضيحي للوحدة</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                  محدث لحظياً
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                يشمل رمز الاستجابة السريعة + الرسم التوضيحي المعماري للوحدة + المواصفات الكاملة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative notice for user */}
        <div className="px-6 pt-4 pb-2 print:hidden">
          <div className="p-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/80 rounded-2xl text-right text-xs text-indigo-950 flex items-start gap-2.5 shadow-sm">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">كود QR تفاعلي + كروكي ورسم توضيحي: </span>
              اطبع هذه البطاقة أو حملها كملف <strong>PDF</strong> وعلقها على باب الوحدة. سيشاهد العميل الرسم التوضيحي فوراً على البطاقة، وبمجرد مسح الكود بهاتفه سيتعرف على حالة الوحدة (متاحة أو محجوزة أو مباعة) المحدثة في لحظتها!
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Printable Area: Designed for high-res A4 Poster & PDF export */}
          <div
            id="qr-printable-poster"
            className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-md text-right space-y-4 print:m-0 print:border-none print:p-4 print:shadow-none"
          >
            {/* Poster Header */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-indigo-600">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black shadow-md">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {companyName?.trim() || unit.building || 'المشروع العقاري'}
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold">
                    بطاقة المعاينة والاستعلام الذكي • {unit.building}
                  </p>
                </div>
              </div>
              <div className="text-left">
                <span className="text-[11px] text-slate-400 block font-semibold">رقم الوحدة السكنية</span>
                <span className="text-2xl font-black text-indigo-700 font-mono">
                  #{unit.unitNumber}
                </span>
              </div>
            </div>

            {/* Poster Main Content: Split Columns (QR Code on right, Blueprint Floor Plan on left) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-1">
              {/* QR Code Column */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt={`QR Unit ${unit.unitNumber}`}
                      className="w-44 h-44 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                      جاري توليد الرمز...
                    </div>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <span className="text-xs font-bold text-slate-800 block">
                    امسح بكاميرا الهاتف 📱
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    لمعاينة الحالة اللحظية (متاحة / محجوزة / مباعة)
                  </span>
                </div>
              </div>

              {/* Architectural Drawing Floor Plan Column */}
              <div className="md:col-span-7 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-600" />
                    <span>الرسم التوضيحي وتوزيع المساحة (Floor Plan)</span>
                  </span>
                  <span className="text-[11px] text-indigo-600 font-mono font-bold">
                    {unit.area} م²
                  </span>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-300">
                  <UnitFloorPlan
                    unit={unit}
                    heightClass="h-44 sm:h-48"
                    showControls={false}
                    interactive={false}
                  />
                </div>
              </div>
            </div>

            {/* Specifications Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px] mb-0.5">الدور والطابق</span>
                <span className="font-bold text-slate-800">الدور {unit.floor}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px] mb-0.5">التقسيم الداخلي</span>
                <span className="font-bold text-slate-800">{rooms} غرف • {baths} حمام</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px] mb-0.5">الواجهة والتشطيب</span>
                <span className="font-bold text-slate-800">{orientation} • {finishing}</span>
              </div>
              <div className="p-2.5 bg-indigo-50/70 rounded-xl border border-indigo-200">
                <span className="text-indigo-600 block text-[10px] mb-0.5 font-bold">السعر الإجمالي</span>
                <span className="font-black text-indigo-900 font-mono text-sm">
                  {formatCurrency(unit.price)}
                </span>
              </div>
            </div>

            {/* Status & Contact Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">الحالة الحالية:</span>
                <span className={`font-black px-3 py-1 rounded-full text-xs border ${statusColor}`}>
                  {unit.status}
                </span>
                <span className="text-[10px] text-slate-400">
                  (تتحدث تلقائياً عند أي تغيير)
                </span>
              </div>

              {companyPhone && (
                <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>مبيعات: {companyPhone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Link bar for admin */}
          <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-100 rounded-xl text-xs print:hidden border border-slate-200">
            <span className="text-slate-500 truncate text-[11px] font-mono dir-ltr select-all">
              {liveScanUrl}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-700 rounded-lg transition border border-slate-200 font-medium flex items-center gap-1"
                title="نسخ الرابط"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenPreview}
                className="px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-700 rounded-lg transition border border-slate-200 font-medium flex items-center gap-1"
                title="معاينة كزائر"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>معاينة كزائر</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 print:hidden">
            {/* Download PDF Flyer/Brochure */}
            <button
              onClick={handleDownloadPdfBrochure}
              disabled={isExportingPdf}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md shadow-indigo-600/30 text-xs sm:text-sm disabled:opacity-50"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إنشاء PDF...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>تحميل بروشور توضيحي PDF</span>
                </>
              )}
            </button>

            {/* Direct Print */}
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition text-xs sm:text-sm shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة للتعليق (A4)</span>
            </button>

            {/* Download QR Only */}
            <button
              onClick={handleDownloadQrImage}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition border border-slate-300 text-xs sm:text-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>تحميل QR صورة فقط</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
