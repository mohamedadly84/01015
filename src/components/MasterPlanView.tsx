import React, { useState } from 'react';
import { Unit, Project } from '../types';
import {
  Building2, Compass, Layers, Maximize2, ZoomIn, ZoomOut,
  RotateCcw, MapPin, CheckCircle2, Clock, ShieldCheck, Eye,
  Sparkles, Image as ImageIcon, X, ExternalLink
} from 'lucide-react';

interface Props {
  buildings: string[];
  units: Unit[];
  projects?: Project[];
  masterPlanImage?: string;
  selectedBuilding: string;
  onSelectBuilding: (buildingName: string) => void;
  className?: string;
}

export const MasterPlanView: React.FC<Props> = ({
  buildings,
  units,
  projects = [],
  masterPlanImage,
  selectedBuilding,
  onSelectBuilding,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'interactive' | 'blueprint'>('interactive');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);

  // Calculate building stats
  const buildingStats = buildings.map((bName, index) => {
    const buildingUnits = units.filter(u => u.building === bName);
    const available = buildingUnits.filter(u => u.status === 'متاحة').length;
    const reserved = buildingUnits.filter(u => u.status === 'محجوزة').length;
    const sold = buildingUnits.filter(u => u.status === 'مباعة').length;
    const projectInfo = projects.find(p => p.name === bName);

    // Get floors list
    const floors = Array.from(new Set(buildingUnits.map(u => u.floor))).sort((a, b) => a - b);

    return {
      name: bName,
      units: buildingUnits,
      totalCount: buildingUnits.length,
      available,
      reserved,
      sold,
      floorsCount: floors.length > 0 ? floors.length : 1,
      minFloor: floors.length > 0 ? Math.min(...floors) : 1,
      maxFloor: floors.length > 0 ? Math.max(...floors) : 1,
      location: projectInfo?.location,
      description: projectInfo?.description,
      customImage: projectInfo?.masterPlanImage,
      index,
    };
  });

  const activeBuildingStats = buildingStats.find(b => b.name === selectedBuilding) || buildingStats[0];

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  // If there are no buildings registered in the system
  if (buildings.length === 0) {
    return (
      <div className={`bg-slate-900/60 rounded-3xl border border-slate-800 p-8 text-center text-slate-400 ${className}`}>
        <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-200">المخطط العام للعمارات</h4>
        <p className="text-xs text-slate-500 mt-1">
          لم يتم تسجيل عمارات أو مشاريع بعد في النظام. سيظهر المخطط العام التفاعلي فور تسجيل العمارات والوحدات.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl ${className}`}>
      {/* Top Header of Master Plan */}
      <div className="p-4 sm:p-6 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50 animate-pulse"></span>
            <span className="text-xs font-bold text-amber-400 tracking-wide">
              المخطط العام والتوزيع المعماري للموقع (MASTER SITE PLAN)
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>مخطط العمارات والموقع العام</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {buildings.length} {buildings.length === 1 ? 'عمارة' : 'عمارات'}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            اضغط على أي عمارة في المخطط لتحديدها واستعراض أدوارها ووحداتها المتاحة فوراً.
          </p>
        </div>

        {/* View Switcher Tabs & Zoom Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {masterPlanImage && (
            <div className="inline-flex p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('interactive')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'interactive'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>المخطط التفاعلي</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('blueprint')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'blueprint'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>المخطط المرفوع</span>
              </button>
            </div>
          )}

          {/* Zoom & Fullscreen buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="تكبير المخطط"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="تصغير المخطط"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition text-[11px] font-mono px-2"
              title="إعادة ضبط الحجم"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded-xl transition"
              title="عرض ملء الشاشة"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Master Plan Canvas */}
      <div className="relative bg-[#070b14] overflow-hidden min-h-[380px] sm:min-h-[440px] flex items-center justify-center p-4">
        {/* Subtle Architectural Blueprint Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(212, 175, 55, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(212, 175, 55, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '36px 36px',
          }}
        />

        {/* Orientation Compass (North Marker) */}
        <div className="absolute top-4 left-4 z-20 flex flex-col items-center pointer-events-none bg-slate-900/80 backdrop-blur-md px-2.5 py-2 rounded-2xl border border-slate-800 shadow-lg">
          <Compass className="w-6 h-6 text-amber-400 animate-[spin_60s_linear_infinite]" />
          <span className="text-[10px] font-bold text-amber-300 font-mono mt-0.5">شمال (N)</span>
        </div>

        {/* Scale indicator */}
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none hidden sm:flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] text-slate-400 font-mono">
          <span>مقياس الرسم:</span>
          <div className="w-16 h-1 bg-amber-400/80 relative">
            <span className="absolute -top-3 left-0 text-[8px]">0</span>
            <span className="absolute -top-3 right-0 text-[8px]">50m</span>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute top-4 right-4 z-20 bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-800 shadow-xl space-y-1.5 text-xs">
          <div className="text-[10px] font-bold text-slate-400 mb-1 border-b border-slate-800 pb-1">دليل المخطط:</div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
            <span className="text-slate-300 text-[11px]">وحدات متاحة</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-amber-500 shadow-sm shadow-amber-500/50"></span>
            <span className="text-slate-300 text-[11px]">وحدات محجوزة</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-rose-500/80"></span>
            <span className="text-slate-300 text-[11px]">مباعة بالكامل</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-slate-800 border border-amber-400/80"></span>
            <span className="text-amber-300 text-[11px]">العمارة المحددة</span>
          </div>
        </div>

        {/* Render Blueprint Image Mode or Interactive Mode */}
        {activeTab === 'blueprint' && masterPlanImage ? (
          <div
            className="transition-transform duration-300 ease-out max-w-full"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={masterPlanImage}
              alt="المخطط العام المعماري"
              className="max-h-[380px] sm:max-h-[440px] w-auto object-contain rounded-2xl shadow-2xl border border-slate-800"
            />
          </div>
        ) : (
          /* Interactive Vector Architectural Site Plan */
          <div
            className="w-full max-w-5xl transition-transform duration-300 ease-out py-6"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Site Outline & Landscaped Boulevard */}
            <div className="relative p-6 sm:p-8 rounded-3xl border-2 border-dashed border-amber-500/30 bg-slate-950/70 shadow-inner">
              {/* Site Entry Gate Marker */}
              <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-amber-400/60 px-4 py-1 rounded-full text-[11px] font-bold text-amber-300 flex items-center gap-1.5 shadow-lg">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>المدخل الرئيسي للمشروع • بوابات إلكترونية</span>
              </div>

              {/* Central Boulevard & Greenery Feature */}
              <div className="my-2 p-2.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-center mb-6">
                <span className="text-[11px] font-semibold text-emerald-400 tracking-wide">
                  🌳 ممشى حدائقي مركزي ومساحات مفتوحة ولاندسكيب 🌳
                </span>
              </div>

              {/* Dynamic Buildings Grid on Master Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {buildingStats.map((b) => {
                  const isSelected = selectedBuilding === b.name;
                  const isHovered = hoveredBuilding === b.name;
                  const hasAvailable = b.available > 0;

                  return (
                    <div
                      key={b.name}
                      onClick={() => onSelectBuilding(b.name)}
                      onMouseEnter={() => setHoveredBuilding(b.name)}
                      onMouseLeave={() => setHoveredBuilding(null)}
                      className={`relative cursor-pointer rounded-2xl p-4 sm:p-5 transition-all duration-300 text-right group ${
                        isSelected
                          ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400 shadow-xl shadow-amber-400/20 scale-[1.02]'
                          : isHovered
                          ? 'bg-slate-900/90 border border-amber-500/50 shadow-lg scale-[1.01]'
                          : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Architectural Block Top Bar */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/40'
                                : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700'
                            }`}
                          >
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] text-amber-400 font-mono block">
                              بلوك معمار #{b.index + 1}
                            </span>
                            <h4 className="text-base font-black text-white group-hover:text-amber-300 transition">
                              {b.name}
                            </h4>
                          </div>
                        </div>

                        {/* Status Pin */}
                        <div className="text-left">
                          {hasAvailable ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              <span>{b.available} متاحة</span>
                            </span>
                          ) : b.totalCount === 0 ? (
                            <span className="text-[10px] text-slate-500">بدون وحدات</span>
                          ) : (
                            <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg">
                              مباعة بالكامل
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Isometric Architectural Outline Graphic */}
                      <div className="h-14 bg-slate-950/80 rounded-xl border border-slate-800/80 p-2 flex items-center justify-between mb-3 overflow-hidden relative">
                        {/* Floor stripes visualization */}
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>الأدوار: {b.minFloor} إلى {b.maxFloor}</span>
                            <span>{b.totalCount} وحدة بالمبنى</span>
                          </div>
                          {/* Mini floor stacks */}
                          <div className="flex gap-1 h-3 mt-1 w-full">
                            {Array.from({ length: Math.min(b.floorsCount || 4, 8) }).map((_, fIdx) => (
                              <div
                                key={fIdx}
                                className={`flex-1 rounded-sm transition ${
                                  isSelected
                                    ? 'bg-amber-400/80'
                                    : hasAvailable
                                    ? 'bg-emerald-500/60'
                                    : 'bg-slate-700'
                                }`}
                                title={`الدور ${fIdx + 1}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Quick Summary Pill Details */}
                      <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                        <div className="bg-slate-950 py-1.5 px-1 rounded-lg border border-slate-800/80">
                          <span className="text-slate-400 block text-[9px]">المتاحة</span>
                          <span className="font-bold text-emerald-400 font-mono">{b.available}</span>
                        </div>
                        <div className="bg-slate-950 py-1.5 px-1 rounded-lg border border-slate-800/80">
                          <span className="text-slate-400 block text-[9px]">محجوزة</span>
                          <span className="font-bold text-amber-400 font-mono">{b.reserved}</span>
                        </div>
                        <div className="bg-slate-950 py-1.5 px-1 rounded-lg border border-slate-800/80">
                          <span className="text-slate-400 block text-[9px]">مباعة</span>
                          <span className="font-bold text-rose-400 font-mono">{b.sold}</span>
                        </div>
                      </div>

                      {/* Selection CTA */}
                      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className={`font-semibold text-[11px] ${isSelected ? 'text-amber-400' : 'text-slate-400'}`}>
                          {isSelected ? '✓ تم تحديد هذه العمارة' : 'اضغط لاختيار العمارة'}
                        </span>
                        <span className="text-slate-500 group-hover:text-white transition font-mono text-xs">
                          {isSelected ? 'عرض الأدوار ↓' : '←'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Road / Pathway */}
              <div className="mt-6 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                  <span>طريق داخلي مزدوج للمركبات ومواقف سيارات خاصة</span>
                </span>
                <span className="text-amber-400/90 font-semibold">
                  * انقر على أي عمارة لعرض أدوارها ووحداتها مباشرة أدناه
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Building Details Footer Strip */}
      {activeBuildingStats && (
        <div className="bg-slate-950 p-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300">العمارة المحددة حالياً:</span>
            <span className="px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-400 font-black">
              {activeBuildingStats.name}
            </span>
            {activeBuildingStats.location && (
              <span className="text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span>{activeBuildingStats.location}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>
              إجمالي وحدات المبنى: <strong className="text-white font-mono">{activeBuildingStats.totalCount}</strong>
            </span>
            <span>·</span>
            <span>
              المتاحة: <strong className="text-emerald-400 font-mono">{activeBuildingStats.available}</strong>
            </span>
            <span>·</span>
            <button
              onClick={() => {
                const el = document.getElementById('units-catalog-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-amber-400 hover:text-amber-300 font-bold underline underline-offset-4 cursor-pointer"
            >
              الانتقال إلى قائمة الأدوار والوحدات ↓
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-6xl flex items-center justify-between pb-4 border-b border-slate-800 text-white">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold">المخطط العام المعماري للموقع والعمارات</h3>
            </div>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4">
            {masterPlanImage ? (
              <img
                src={masterPlanImage}
                alt="المخطط العام"
                className="max-h-[80vh] max-w-full object-contain rounded-2xl border border-slate-800"
              />
            ) : (
              <div className="w-full max-w-4xl p-6 bg-slate-900/90 rounded-3xl border border-slate-800">
                <div className="text-center mb-6">
                  <h4 className="text-lg font-bold text-white">مخطط الموقع العام التفاعلي</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    توزيع العمارات والخدمات والمساحات المفتوحة
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {buildingStats.map(b => (
                    <div
                      key={b.name}
                      onClick={() => {
                        onSelectBuilding(b.name);
                        setIsLightboxOpen(false);
                      }}
                      className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-amber-400 cursor-pointer transition text-right"
                    >
                      <h5 className="font-bold text-white text-base">{b.name}</h5>
                      <p className="text-xs text-slate-400 mt-1">
                        {b.totalCount} وحدة • {b.available} متاحة
                      </p>
                      <span className="text-[11px] text-amber-400 mt-2 block font-semibold">
                        اختر هذه العمارة ←
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
