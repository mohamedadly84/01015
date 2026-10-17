import React, { useState, useEffect } from 'react';
import { Unit, AppDatabase } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { subscribeToCloudDatabase } from '../../services/firebase';
import { getLocalDatabase } from '../../services/storage';
import { UnitFloorPlan } from '../UnitFloorPlan';
import { QRCodeModal } from '../QRCodeModal';
import {
  Building2, CheckCircle2, Clock, XCircle, Phone, MapPin,
  Sparkles, RefreshCw, Layers, ShieldCheck, ArrowRight,
  Compass, FileText, QrCode, Grid, MessageSquare
} from 'lucide-react';

interface Props {
  unitId: number;
  initialDb?: AppDatabase;
  onGoToApp?: () => void;
  onGoToCatalog?: () => void;
}

export const PublicUnitView: React.FC<Props> = ({
  unitId,
  initialDb,
  onGoToApp,
  onGoToCatalog,
}) => {
  const [db, setDb] = useState<AppDatabase>(initialDb || getLocalDatabase());
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString('ar-EG'));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQrBrochureModal, setShowQrBrochureModal] = useState(false);

  // Subscribe to live real-time Firestore updates so when unit status changes (e.g. booked or sold),
  // any client or customer scanning the QR code sees the real-time status instantly!
  useEffect(() => {
    const unsubscribe = subscribeToCloudDatabase(
      (cloudData) => {
        if (cloudData && Array.isArray(cloudData.units)) {
          setDb(cloudData);
          setLastRefreshed(new Date().toLocaleTimeString('ar-EG'));
        }
      },
      (err) => {
        console.warn('Real-time listener notice:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  const unit: Unit | undefined = db.units.find(u => u.id === unitId);
  const company = db.settings || { name: '', phone: '', taxNumber: '', address: '', currency: 'ج.م' };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastRefreshed(new Date().toLocaleTimeString('ar-EG'));
      setIsRefreshing(false);
    }, 400);
  };

  if (!unit) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-800/90 backdrop-blur-md rounded-3xl p-8 max-w-md w-full text-center border border-slate-700 space-y-4">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <XCircle className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold text-white">الوحدة غير موجودة أو تم تعديلها</h2>
          <p className="text-sm text-slate-400">
            تأكد من مسح الرمز الصحيح أو تصفح باقي الوحدات المعروضة في المعرض.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            {onGoToCatalog && (
              <button
                onClick={onGoToCatalog}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <Grid className="w-4 h-4" />
                <span>تصفح معرض كافة الوحدات كزائر</span>
              </button>
            )}
            {onGoToApp && (
              <button
                onClick={onGoToApp}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                دخول نظام إدارة الشركة
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Status configuration
  const statusConfig = {
    متاحة: {
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      badgeBg: 'bg-emerald-500 text-white',
      glow: 'shadow-emerald-500/20',
      icon: CheckCircle2,
      title: 'الوحدة متاحة للتعاقد والبيع الفوري',
      desc: 'يمكنك التواصل الآن مع إدارة المبيعات لحجز ومعاينة الوحدة فوراً.',
      actionText: 'احجز أو استفسر عن الوحدة الآن'
    },
    محجوزة: {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      badgeBg: 'bg-amber-500 text-white',
      glow: 'shadow-amber-500/20',
      icon: Clock,
      title: 'الوحدة محجوزة حالياً',
      desc: 'هذه الوحدة قيد استكمال إجراءات التعاقد أو الحجز المبدئي.',
      actionText: 'التواصل للاستفسار عن إمكانية الإلغاء أو البدائل'
    },
    مباعة: {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      badgeBg: 'bg-rose-600 text-white',
      glow: 'shadow-rose-500/20',
      icon: ShieldCheck,
      title: 'تم بيع هذه الوحدة بالكامل',
      desc: 'تم إبرام عقد بيع رسمي لهذه الوحدة وهي مملوكة لأحد العملاء.',
      actionText: 'استكشاف الوحدات المتاحة الأخرى في المشروع'
    }
  }[unit.status] || {
    bg: 'bg-slate-500/10 border-slate-500/30 text-slate-300',
    badgeBg: 'bg-slate-600 text-white',
    glow: 'shadow-slate-500/20',
    icon: CheckCircle2,
    title: unit.status,
    desc: '',
    actionText: 'تواصل معنا'
  };

  const StatusIcon = statusConfig.icon;
  const rooms = unit.roomsCount || (unit.area >= 160 ? 4 : unit.area >= 120 ? 3 : 2);
  const baths = unit.bathroomsCount || (unit.area >= 140 ? 2 : 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-lg w-full mx-auto space-y-5">
        {/* Company Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-600/30 border border-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">
                {company.name?.trim() || 'المعرض العقاري للوحدات'}
              </h1>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                بيانات الوحدة المحدثة لحظياً
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onGoToCatalog && (
              <button
                onClick={onGoToCatalog}
                className="p-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl transition border border-indigo-500/30 flex items-center gap-1 text-xs font-semibold"
                title="معرض كافة الوحدات"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">معرض الوحدات</span>
              </button>
            )}

            <button
              onClick={handleManualRefresh}
              title="تحديث البيانات"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700 flex items-center gap-1 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Status Hero Card */}
        <div className={`p-5 rounded-3xl border backdrop-blur-md shadow-xl ${statusConfig.bg} ${statusConfig.glow}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <StatusIcon className="w-6 h-6 shrink-0" />
              <span className="text-xs font-semibold tracking-wider uppercase opacity-90">
                الحالة المحدثة الآن
              </span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black shadow-sm ${statusConfig.badgeBg}`}>
              {unit.status}
            </span>
          </div>

          <h2 className="text-xl font-black text-white mb-1.5">
            {statusConfig.title}
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed opacity-90">
            {statusConfig.desc}
          </p>

          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>آخر فحص وتحديث للحالة:</span>
            <span className="font-mono text-slate-200">{lastRefreshed}</span>
          </div>
        </div>

        {/* Architectural Floor Plan Drawing (الرسم التوضيحي للوحدة) */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl p-4 border border-slate-700/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold flex items-center gap-1.5 text-indigo-300">
              <Compass className="w-4 h-4 text-indigo-400" />
              <span>الرسم التوضيحي والمخطط الهندسي (Floor Plan)</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {unit.area} م²
            </span>
          </div>

          {/* Render Vector Floor Plan with interactive controls */}
          <UnitFloorPlan
            unit={unit}
            heightClass="h-56 sm:h-64"
            showControls={true}
            interactive={true}
          />
        </div>

        {/* Unit Details Card */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl p-5 border border-slate-700/80 shadow-xl space-y-4">
          <div className="flex items-baseline justify-between border-b border-slate-700/60 pb-3">
            <div>
              <span className="text-[11px] text-slate-400 block">رقم الوحدة</span>
              <span className="text-3xl font-black text-white font-mono">{unit.unitNumber}</span>
            </div>
            <div className="text-left">
              <span className="text-[11px] text-slate-400 block">العمارة / المشروع</span>
              <span className="text-lg font-bold text-indigo-300">{unit.building}</span>
            </div>
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-700/50">
              <span className="text-slate-400 text-xs block mb-1">المساحة الإجمالية</span>
              <span className="text-xl font-bold text-white font-mono">{unit.area}</span>
              <span className="text-xs text-slate-400 mr-1">م²</span>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-700/50">
              <span className="text-slate-400 text-xs block mb-1">الدور والتقسيم</span>
              <span className="text-sm font-bold text-white block">الدور {unit.floor}</span>
              <span className="text-[11px] text-slate-400">{rooms} غرف • {baths} حمام</span>
            </div>

            <div className="col-span-2 bg-gradient-to-r from-indigo-950/70 to-slate-900/80 p-3.5 rounded-2xl border border-indigo-500/20 flex items-center justify-between">
              <div>
                <span className="text-indigo-300/80 text-xs block mb-0.5">السعر المعلن</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {formatCurrency(unit.price)}
                </span>
              </div>
              <div className="text-left">
                <span className="text-slate-400 text-[11px] block">سعر المتر تقريباً</span>
                <span className="text-xs font-semibold text-slate-300 font-mono">
                  {unit.area > 0 ? formatCurrency(Math.round(unit.price / unit.area)) : '-'} / م²
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Brochure & PDF / Contact Action Area */}
        <div className="space-y-2.5">
          {/* Download PDF Flyer / Brochure Button */}
          <button
            onClick={() => setShowQrBrochureModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition shadow-lg shadow-indigo-600/30 text-sm"
          >
            <FileText className="w-4 h-4" />
            <span>تحميل البروشور والمخطط التوضيحي PDF</span>
          </button>

          {/* Direct WhatsApp & Call Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {company.phone && (
              <a
                href={`tel:${company.phone}`}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition shadow-lg shadow-emerald-600/30 text-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>اتصال بالمبيعات ({company.phone})</span>
              </a>
            )}

            {company.phone && (
              <a
                href={`https://wa.me/${company.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً، أود الاستفسار عن الوحدة رقم ${unit.unitNumber} في مشروع ${unit.building}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold rounded-2xl transition text-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>محادثة واتساب</span>
              </a>
            )}
          </div>

          {/* Browse all units in catalog button */}
          {onGoToCatalog && (
            <button
              onClick={onGoToCatalog}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl transition border border-slate-700 text-xs"
            >
              <Grid className="w-4 h-4 text-indigo-400" />
              <span>استعراض باقي الوحدات المتاحة في المعرض 🏢</span>
            </button>
          )}

          {company.address && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span>{company.address}</span>
            </div>
          )}
        </div>

        {/* System entry link (for staff or owner) */}
        {onGoToApp && (
          <div className="text-center pt-2">
            <button
              onClick={onGoToApp}
              className="text-xs text-slate-500 hover:text-indigo-300 underline underline-offset-4 transition"
            >
              دخول نظام إدارة العقارات للشركة
            </button>
          </div>
        )}
      </div>

      {/* QR & PDF Brochure Modal */}
      {showQrBrochureModal && (
        <QRCodeModal
          unit={unit}
          companyName={company.name}
          companyPhone={company.phone}
          companyAddress={company.address}
          onClose={() => setShowQrBrochureModal(false)}
        />
      )}

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 pt-6">
        نظام الاستعلام العقاري المباشر • رسم توضيحي وتحديث تلقائي لحظي عبر QR
      </footer>
    </div>
  );
};
