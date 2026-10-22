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
  Compass, FileText, QrCode, Grid, MessageSquare, Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  unitId: number;
  initialDb?: AppDatabase;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onGoToApp?: () => void;
  onGoToCatalog?: () => void;
  onBack?: () => void;
}

export const PublicUnitView: React.FC<Props> = ({
  unitId,
  initialDb,
  isDarkMode: externalDarkMode,
  onToggleDarkMode,
  onGoToApp,
  onGoToCatalog,
  onBack,
}) => {
  const [db, setDb] = useState<AppDatabase>(initialDb || getLocalDatabase());
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString('ar-EG'));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQrBrochureModal, setShowQrBrochureModal] = useState(false);

  // Internal theme fallback
  const [internalDarkMode, setInternalDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hermes-theme');
      return saved ? saved === 'dark' : true;
    }
    return true;
  });

  const isDarkMode = externalDarkMode !== undefined ? externalDarkMode : internalDarkMode;

  const handleToggleTheme = () => {
    if (onToggleDarkMode) {
      onToggleDarkMode();
    } else {
      const nextMode = !internalDarkMode;
      setInternalDarkMode(nextMode);
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        const body = document.body;
        if (nextMode) {
          root.classList.remove('light-mode');
          root.classList.add('dark-mode');
          body.classList.remove('light-mode');
          body.classList.add('dark-mode');
        } else {
          root.classList.remove('dark-mode', 'dark');
          root.classList.add('light-mode');
          body.classList.remove('dark-mode', 'dark');
          body.classList.add('light-mode');
        }
        localStorage.setItem('hermes-theme', nextMode ? 'dark' : 'light');
      }
    }
  };

  // Subscribe to live real-time Firestore updates
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

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else if (onGoToCatalog) {
      onGoToCatalog();
    } else if (onGoToApp) {
      onGoToApp();
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastRefreshed(new Date().toLocaleTimeString('ar-EG'));
      setIsRefreshing(false);
    }, 400);
  };

  const formatFloorName = (floorNum: number) => {
    if (floorNum === 0) return 'الدور الأرضي';
    if (floorNum === 1) return 'الدور الأول';
    if (floorNum === 2) return 'الدور الثاني';
    if (floorNum === 3) return 'الدور الثالث';
    if (floorNum === 4) return 'الدور الرابع';
    if (floorNum === 5) return 'الدور الخامس';
    if (floorNum === 6) return 'الدور السادس';
    if (floorNum === 7) return 'الدور السابع';
    if (floorNum === 8) return 'الدور الثامن';
    if (floorNum === 9) return 'الدور التاسع';
    if (floorNum === 10) return 'الدور العاشر';
    if (floorNum < 0) return `بدروم (${floorNum})`;
    return `الدور ${floorNum}`;
  };

  if (!unit) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
        isDarkMode ? 'bg-[#070b14] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
      }`}>
        <div className="glass-panel rounded-3xl p-8 max-w-md w-full text-center border shadow-2xl space-y-4">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
            <XCircle className="w-9 h-9" />
          </div>
          <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            الوحدة غير موجودة أو تم تعديلها
          </h2>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            تأكد من مسح الرمز الصحيح أو تصفح باقي الوحدات المعروضة في المعرض.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleGoBack}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الرجوع للصفحة السابقة</span>
            </button>
            {onGoToCatalog && (
              <button
                onClick={onGoToCatalog}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer border ${
                  isDarkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                <Grid className="w-4 h-4 text-indigo-400" />
                <span>تصفح معرض كافة الوحدات كزائر</span>
              </button>
            )}
            {onGoToApp && (
              <button
                onClick={onGoToApp}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  isDarkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                دخول نظام إدارة الشركة
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isSold = unit.status === 'مباعة';
  const isReserved = unit.status === 'محجوزة';

  // Status configuration
  const statusConfig = {
    متاحة: {
      bg: isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800',
      badgeBg: 'bg-emerald-600 text-white',
      glow: 'shadow-emerald-500/20',
      icon: CheckCircle2,
      title: 'الوحدة متاحة للتعاقد والبيع الفوري',
      desc: 'يمكنك التواصل الآن مع إدارة المبيعات لحجز ومعاينة الوحدة فوراً.',
      actionText: 'احجز أو استفسر عن الوحدة الآن'
    },
    محجوزة: {
      bg: isDarkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-800',
      badgeBg: 'bg-amber-500 text-slate-950 font-black',
      glow: 'shadow-amber-500/20',
      icon: Clock,
      title: 'الوحدة محجوزة حالياً',
      desc: 'هذه الوحدة قيد استكمال إجراءات التعاقد أو الحجز المبدئي.',
      actionText: 'التواصل للاستفسار عن إمكانية الحجز أو البدائل'
    },
    مباعة: {
      bg: isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-800',
      badgeBg: 'bg-rose-600 text-white',
      glow: 'shadow-rose-500/20',
      icon: ShieldCheck,
      title: 'تم بيع هذه الوحدة بالكامل',
      desc: 'تم إبرام عقد بيع رسمي لهذه الوحدة وهي مملوكة لأحد العملاء. يمكنك الاستعلام عن الوحدات الأخرى المتاحة لدينا في هذا المشروع أو المشروعات الأخرى.',
      actionText: 'استعلام عن وحدات أخرى متاحة عبر واتساب'
    }
  }[unit.status] || {
    bg: isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700',
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

  // Construct WhatsApp inquiry link - tailored for sold vs available units
  const phone = company.phone ? company.phone.replace(/[^0-9]/g, '') : '';
  const whatsappMessage = isSold
    ? `مرحباً، قمت بالاطلاع على الوحدة رقم (${unit.unitNumber}) في مشروع (${unit.building}) ووجدتها مباعة. أود الاستفسار عن الوحدات الأخرى المتاحة لديكم والبدائل المشابهة في هذا المشروع أو المشاريع الأخرى.`
    : isReserved
    ? `مرحباً، أود الاستفسار عن الوحدة رقم (${unit.unitNumber}) في مشروع (${unit.building}) - ${formatFloorName(unit.floor)}، المسجلة كـ (محجوزة)، لمعرفة إمكانية الحجز أو البدائل المتاحة.`
    : `مرحباً، قمت بمسح كود QR وأود الاستفسار عن حجز ومعاينة الوحدة رقم (${unit.unitNumber}) في مشروع (${unit.building}) - ${formatFloorName(unit.floor)}، المساحة ${unit.area} م².`;

  const whatsappUrl = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className={`min-h-screen flex flex-col justify-between py-6 px-4 sm:px-6 transition-colors duration-300 ${
      isDarkMode ? 'bg-[#070b14] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
    }`}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="max-w-xl w-full mx-auto space-y-5"
      >
        {/* Company Header & Navigation Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`flex items-center justify-between pb-3 border-b ${
            isDarkMode ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Back Button (زر رجوع للصفحة السابقة) */}
            <motion.button
              whileHover={{ scale: 1.04, x: 2 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleGoBack}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs ${
                isDarkMode
                  ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
              }`}
              title="الرجوع للصفحة السابقة"
            >
              <ArrowRight className="w-4 h-4 text-amber-500" />
              <span>رجوع</span>
            </motion.button>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-slate-950 font-black shadow-md shrink-0"
            >
              <Building2 className="w-5 h-5" />
            </motion.div>
            <div>
              <h1 className={`text-sm sm:text-base font-black tracking-tight leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {company.name?.trim() || 'المعرض العقاري للوحدات'}
              </h1>
              <span className={`text-[11px] flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                بيانات الوحدة المحدثة لحظياً
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleToggleTheme}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isDarkMode
                  ? 'bg-amber-400/15 hover:bg-amber-400/25 text-amber-400 border-amber-400/30'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
              }`}
              title={isDarkMode ? 'الوضع الفاتح' : 'الوضع الليلي'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-amber-600" />}
            </motion.button>

            {onGoToCatalog && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={onGoToCatalog}
                className="px-2.5 sm:px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-xl transition border border-indigo-500/30 flex items-center gap-1 text-xs font-bold cursor-pointer"
                title="معرض كافة الوحدات"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">معرض الوحدات</span>
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleManualRefresh}
              title="تحديث البيانات لحظياً"
              className={`p-2 rounded-xl transition border cursor-pointer ${
                isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
            </motion.button>
          </div>
        </motion.div>

        {/* Live Status Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28, delay: 0.05 }}
          className={`p-5 rounded-3xl border shadow-xl ${statusConfig.bg} ${statusConfig.glow}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <StatusIcon className="w-6 h-6 shrink-0" />
              <span className="text-xs font-bold tracking-wider uppercase">
                الحالة المحدثة الآن
              </span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black shadow-xs ${statusConfig.badgeBg}`}>
              {unit.status}
            </span>
          </div>

          <h2 className="text-xl font-black mb-1.5">
            {statusConfig.title}
          </h2>
          <p className="text-xs leading-relaxed opacity-95">
            {statusConfig.desc}
          </p>

          <div className="mt-3 pt-3 border-t border-black/10 flex items-center justify-between text-[11px] opacity-80">
            <span>آخر فحص وتحديث للحالة:</span>
            <span className="font-mono font-bold">{lastRefreshed}</span>
          </div>
        </motion.div>

        {/* Architectural Floor Plan Drawing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28, delay: 0.1 }}
          className="glass-panel rounded-3xl p-4 border shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold flex items-center gap-1.5 text-amber-500">
              <Compass className="w-4 h-4" />
              <span>المخطط الهندسي المعماري للوحدة</span>
            </span>
            <span className="text-[11px] font-mono font-bold">
              {unit.area} م²
            </span>
          </div>

          <UnitFloorPlan
            unit={unit}
            heightClass="h-60 sm:h-72"
            showControls={true}
            interactive={true}
          />
        </motion.div>

        {/* Unit Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28, delay: 0.15 }}
          className="glass-panel rounded-3xl p-5 border shadow-xl space-y-4"
        >
          <div className="flex items-baseline justify-between border-b pb-3 border-slate-200/20">
            <div>
              <span className={`text-[11px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>رقم الوحدة</span>
              <span className={`text-3xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {unit.unitNumber}
              </span>
            </div>
            <div className="text-left">
              <span className={`text-[11px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>العمارة / المشروع</span>
              <span className="text-lg font-black text-amber-500">{unit.building}</span>
            </div>
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <motion.div
              whileHover={{ y: -2 }}
              className={`p-3 rounded-2xl border ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`text-[10px] block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>المساحة الإجمالية</span>
              <span className={`text-xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {unit.area}
              </span>
              <span className={`text-xs mr-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>م²</span>
            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              className={`p-3 rounded-2xl border ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`text-[10px] block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>الدور والتقسيم</span>
              <span className={`text-sm font-bold block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {formatFloorName(unit.floor)}
              </span>
              <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {rooms} غرف • {baths} حمام
              </span>
            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              className="col-span-2 p-3.5 rounded-2xl border flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-slate-900/20 to-indigo-500/10 border-amber-500/20"
            >
              <div>
                <span className={`text-xs block mb-0.5 font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                  السعر المعلن
                </span>
                <span className="text-2xl font-black font-mono text-emerald-500">
                  {formatCurrency(unit.price)}
                </span>
              </div>
              <div className="text-left">
                <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>سعر المتر</span>
                <span className={`text-xs font-bold font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {formatCurrency(Math.round(unit.price / unit.area))}
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Contact and Booking Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28, delay: 0.2 }}
          className="space-y-3 pt-2"
        >
          {/* Sold unit guidance alert */}
          {isSold && (
            <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 shadow-sm ${
              isDarkMode
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div>
                <p className="font-bold">هذه الوحدة مباعة بالفعل</p>
                <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-rose-400/90' : 'text-rose-700'}`}>
                  تم بيع هذه الوحدة رسميًا. يمكنك النقر على الزر أدناه للتواصل مع المبيعات عبر واتساب للاستعلام عن الوحدات الأخرى المتاحة والبدائل المشابهة.
                </p>
              </div>
            </div>
          )}

          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full py-3.5 px-4 font-black rounded-2xl text-sm transition flex items-center justify-center gap-2.5 shadow-lg cursor-pointer ${
              isSold
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-teal-600/25'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>
              {isSold
                ? 'استعلام عن وحدات أخرى متاحة عبر واتساب'
                : isReserved
                ? 'استفسار عن إمكانية الحجز والبدائل عبر واتساب'
                : 'حجز أو استفسار مباشر عبر واتساب'}
            </span>
          </motion.a>

          {company.phone && (
            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href={`tel:${company.phone}`}
              className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-700'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
              }`}
            >
              <Phone className="w-4 h-4 text-amber-500" />
              <span>
                {isSold
                  ? `اتصال هاتفي للاستفسار عن الوحدات المتاحة (${company.phone})`
                  : `اتصال هاتفي مباشر بإدارة المبيعات (${company.phone})`}
              </span>
            </motion.a>
          )}

          {/* Full-width Back Button (زر رجوع للصفحة السابقة) */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoBack}
            className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold border transition flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
              isDarkMode
                ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
            }`}
          >
            <ArrowRight className="w-4 h-4 text-amber-500" />
            <span>الرجوع للصفحة السابقة</span>
          </motion.button>

          <div className="flex items-center gap-2 pt-1">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowQrBrochureModal(true)}
              className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              <QrCode className="w-4 h-4 text-indigo-500" />
              <span>كود QR وبروشور الوحدة</span>
            </motion.button>

            {onGoToApp && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onGoToApp}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-300'
                }`}
              >
                دخول الإدارة
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <div className={`mt-8 text-center text-xs space-y-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
        <p>{company.name || 'المعرض العقاري للوحدات'}</p>
        <p className="text-[10px]">
          تم إنشاء هذا الرابط للعرض السريع عبر مسح رمز QR
        </p>
      </div>

      {/* QR Code Brochure Modal */}
      {showQrBrochureModal && (
        <QRCodeModal
          unit={unit}
          companyName={company.name}
          companyPhone={company.phone}
          companyAddress={company.address}
          onClose={() => setShowQrBrochureModal(false)}
        />
      )}
    </div>
  );
};
