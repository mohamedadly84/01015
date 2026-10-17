import React, { useState } from 'react';
import { Unit } from '../types';
import { Maximize2, Download, Compass, Eye, Image as ImageIcon } from 'lucide-react';

interface Props {
  unit: Unit;
  heightClass?: string;
  showControls?: boolean;
  interactive?: boolean;
}

export const UnitFloorPlan: React.FC<Props> = ({
  unit,
  heightClass = 'h-64 sm:h-72',
  showControls = true,
  interactive = true,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Derive rooms count from unit or estimate based on area
  const rooms = unit.roomsCount || (unit.area >= 160 ? 4 : unit.area >= 120 ? 3 : 2);
  const baths = unit.bathroomsCount || (unit.area >= 140 ? 2 : 1);
  const balconies = unit.balconiesCount || (unit.area >= 130 ? 2 : 1);
  const orientation = unit.orientation || 'بحري';
  const finishing = unit.finishingType || 'سوبر لوكس';

  // Calculate proportional dimensions
  const approxWidth = (Math.sqrt(unit.area * 1.3)).toFixed(1);
  const approxLength = (unit.area / parseFloat(approxWidth)).toFixed(1);

  // Download SVG or image
  const handleDownload = () => {
    if (unit.floorPlanImage) {
      const a = document.createElement('a');
      a.href = unit.floorPlanImage;
      a.download = `مخطط_الوحدة_${unit.unitNumber}_${unit.building}.png`;
      a.click();
    } else {
      const svg = document.getElementById(`floorplan-svg-${unit.id}`);
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `رسم_توضيحي_الوحدة_${unit.unitNumber}_${unit.building}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const renderContent = (fullscreenMode = false) => {
    if (unit.floorPlanImage) {
      return (
        <div className="relative w-full h-full flex items-center justify-center bg-slate-950 p-2 overflow-hidden">
          <img
            src={unit.floorPlanImage}
            alt={`مخطط توضيحي للوحدة ${unit.unitNumber}`}
            className="max-h-full max-w-full object-contain rounded-lg shadow-inner"
          />
          <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-slate-300 border border-slate-700/60 flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3 text-indigo-400" />
            <span>مخطط هندسي معتمد</span>
          </div>
        </div>
      );
    }

    // Dynamic Architectural Blueprint Vector Diagram
    return (
      <svg
        id={`floorplan-svg-${unit.id}`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 600 420"
        className="w-full h-full select-none"
        style={{ backgroundColor: '#090d16' }}
      >
        <defs>
          {/* Blueprint Grid */}
          <pattern id={`blueprint-grid-${unit.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.6" strokeOpacity="0.7" />
          </pattern>
          <pattern id={`blueprint-grid-dense-${unit.id}`} width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill={`url(#blueprint-grid-${unit.id})`} />
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#334155" strokeWidth="1.2" strokeOpacity="0.8" />
          </pattern>
          {/* Tile hatch for bathrooms & kitchens */}
          <pattern id={`tile-hatch-${unit.id}`} width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="#0f172a" />
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#1e3a8a" strokeWidth="0.5" />
          </pattern>
          {/* Wood parquet hatch for bedrooms */}
          <pattern id={`parquet-hatch-${unit.id}`} width="16" height="8" patternUnits="userSpaceOnUse">
            <rect width="16" height="8" fill="#0f172a" />
            <path d="M 0 0 L 16 0 M 0 4 L 16 4 M 0 8 L 16 8 M 8 0 L 8 4 M 0 4 L 0 8" fill="none" stroke="#334155" strokeWidth="0.4" strokeOpacity="0.4" />
          </pattern>
        </defs>

        {/* Blueprint background */}
        <rect width="600" height="420" fill={`url(#blueprint-grid-dense-${unit.id})`} />

        {/* Outer Dimension Lines */}
        <g stroke="#64748b" strokeWidth="0.8" opacity="0.85">
          {/* Top dimension line */}
          <line x1="60" y1="20" x2="540" y2="20" markerEnd="url(#arrow)" />
          <line x1="60" y1="15" x2="60" y2="25" />
          <line x1="540" y1="15" x2="540" y2="25" />
          <text x="300" y="16" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace">
            الطول الإجمالي: {approxLength} م
          </text>

          {/* Left dimension line */}
          <line x1="25" y1="40" x2="25" y2="380" />
          <line x1="20" y1="40" x2="30" y2="40" />
          <line x1="20" y1="380" x2="30" y2="380" />
          <text x="20" y="215" fill="#94a3b8" fontSize="11" textAnchor="middle" transform="rotate(-90 20 215)" fontFamily="monospace">
            العرض: {approxWidth} م
          </text>
        </g>

        {/* Outer Boundary Wall (Heavy Double Line) */}
        <rect x="58" y="38" width="484" height="344" fill="none" stroke="#3b82f6" strokeWidth="4" rx="2" />
        <rect x="62" y="42" width="476" height="336" fill="#0b1120" stroke="#1d4ed8" strokeWidth="1.5" rx="1" />

        {/* ROOM 1: Reception / Living Room (Right Top & Mid, approx 40% area) */}
        <g id="room-reception">
          <rect x="300" y="42" width="238" height="200" fill="#111827" fillOpacity="0.9" />
          {/* Furniture sketch: sofa & coffee table */}
          <rect x="420" y="60" width="100" height="32" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          <rect x="440" y="100" width="60" height="24" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
          <circle cx="360" cy="80" r="14" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
          {/* Balcony / Terrace */}
          <rect x="480" y="42" width="58" height="28" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.2" strokeDasharray="3 2" />
          <text x="509" y="58" fill="#93c5fd" fontSize="9" textAnchor="middle" fontWeight="bold">تراس / بلكونة</text>

          {/* Label */}
          <text x="380" y="150" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">
            صالة الاستقبال والريسبشن
          </text>
          <text x="380" y="172" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace">
            {Math.round(unit.area * 0.35)} م² • 7.5م × 5.2م
          </text>
        </g>

        {/* ROOM 2: Master Bedroom (Top Left) */}
        <g id="room-master-bed">
          <rect x="62" y="42" width="238" height="150" fill={`url(#parquet-hatch-${unit.id})`} />
          {/* Bed sketch */}
          <rect x="80" y="60" width="65" height="75" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          <rect x="86" y="64" width="24" height="18" rx="2" fill="#334155" stroke="#64748b" strokeWidth="0.5" />
          <rect x="115" y="64" width="24" height="18" rx="2" fill="#334155" stroke="#64748b" strokeWidth="0.5" />
          {/* Wardrobe */}
          <rect x="180" y="45" width="100" height="20" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />

          {/* Label */}
          <text x="200" y="105" fill="#f8fafc" fontSize="13" fontWeight="bold" textAnchor="middle">
            غرفة نوم ماستر (رئيسية)
          </text>
          <text x="200" y="125" fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">
            {Math.round(unit.area * 0.22)} م² • 4.5م × 4.2م
          </text>
        </g>

        {/* ROOM 3: Bedroom 2 / Children's Room (Bottom Left) */}
        <g id="room-bed-2">
          <rect x="62" y="192" width="238" height="186" fill={`url(#parquet-hatch-${unit.id})`} />
          {/* Beds */}
          <rect x="80" y="270" width="45" height="70" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
          <rect x="85" y="275" width="35" height="15" rx="2" fill="#334155" stroke="#64748b" strokeWidth="0.5" />
          {rooms > 2 && (
            <>
              <rect x="150" y="270" width="45" height="70" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
              <rect x="155" y="275" width="35" height="15" rx="2" fill="#334155" stroke="#64748b" strokeWidth="0.5" />
            </>
          )}

          {/* Label */}
          <text x="180" y="225" fill="#f8fafc" fontSize="13" fontWeight="bold" textAnchor="middle">
            {rooms > 3 ? 'غرفة نوم أطفال / ضيوف' : 'غرفة نوم 2'}
          </text>
          <text x="180" y="245" fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">
            {Math.round(unit.area * 0.18)} م² • 4.0م × 3.8م
          </text>
        </g>

        {/* ROOM 4: Kitchen (Bottom Mid-Right) */}
        <g id="room-kitchen">
          <rect x="300" y="242" width="130" height="136" fill={`url(#tile-hatch-${unit.id})`} />
          {/* Kitchen counter L-shape */}
          <path d="M 305 247 L 420 247 L 420 270 L 330 270 L 330 370 L 305 370 Z" fill="#1e293b" stroke="#3b82f6" strokeWidth="0.8" />
          <circle cx="380" cy="258" r="7" fill="#0f172a" stroke="#60a5fa" strokeWidth="0.6" />
          <rect x="345" y="252" width="18" height="12" fill="#0f172a" stroke="#60a5fa" strokeWidth="0.6" />

          {/* Label */}
          <text x="365" y="315" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">
            المطبخ
          </text>
          <text x="365" y="335" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">
            {Math.round(unit.area * 0.11)} م²
          </text>
        </g>

        {/* ROOM 5: Bathroom (Bottom Far-Right) */}
        <g id="room-bathroom">
          <rect x="430" y="242" width="108" height="136" fill={`url(#tile-hatch-${unit.id})`} />
          {/* Bathtub sketch */}
          <rect x="440" y="325" width="90" height="45" rx="6" fill="#1e293b" stroke="#0284c7" strokeWidth="1" />
          {/* Vanity */}
          <rect x="440" y="250" width="35" height="25" rx="3" fill="#1e293b" stroke="#0284c7" strokeWidth="0.8" />
          <circle cx="457" cy="262" r="7" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.6" />

          {/* Label */}
          <text x="484" y="295" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">
            {baths > 1 ? 'حمام رئيسي' : 'الحمام'}
          </text>
          <text x="484" y="313" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">
            {Math.round(unit.area * 0.08)} م²
          </text>
        </g>

        {/* Internal Partition Walls (Solid Blue Accent) */}
        <g stroke="#3b82f6" strokeWidth="3" strokeLinecap="round">
          {/* Vertical divider between left rooms & right rooms */}
          <line x1="300" y1="42" x2="300" y2="378" />
          {/* Horizontal divider between Master and Bed 2 */}
          <line x1="62" y1="192" x2="300" y2="192" />
          {/* Horizontal divider under reception */}
          <line x1="300" y1="242" x2="538" y2="242" />
          {/* Vertical divider between Kitchen and Bath */}
          <line x1="430" y1="242" x2="430" y2="378" />
        </g>

        {/* Door Openings (Architectural Quarter Arc) */}
        <g stroke="#e2e8f0" strokeWidth="1.2" fill="none">
          {/* Main Unit Entrance Door (Bottom Reception) */}
          <path d="M 330 378 A 30 30 0 0 0 360 348" stroke="#22c55e" strokeWidth="1.8" />
          <line x1="330" y1="378" x2="330" y2="348" stroke="#22c55e" strokeWidth="2" />
          <text x="345" y="396" fill="#4ade80" fontSize="9" fontWeight="bold" textAnchor="middle">مدخل الوحدة 🚪</text>

          {/* Bed 1 Door */}
          <path d="M 270 192 A 25 25 0 0 1 295 167" stroke="#94a3b8" />
          <line x1="270" y1="192" x2="295" y2="192" stroke="#94a3b8" />

          {/* Bed 2 Door */}
          <path d="M 270 192 A 25 25 0 0 0 295 217" stroke="#94a3b8" />
          <line x1="270" y1="192" x2="295" y2="192" stroke="#94a3b8" />

          {/* Kitchen Door */}
          <path d="M 320 242 A 22 22 0 0 1 342 220" stroke="#94a3b8" />

          {/* Bathroom Door */}
          <path d="M 450 242 A 20 20 0 0 1 470 222" stroke="#94a3b8" />
        </g>

        {/* Architectural Compass (Rose de Vents) */}
        <g transform="translate(555, 75)" opacity="0.9">
          <circle cx="0" cy="0" r="18" fill="#0f172a" stroke="#475569" strokeWidth="1" />
          {/* North needle */}
          <polygon points="0,-15 4,-3 0,0 -4,-3" fill="#ef4444" />
          <polygon points="0,15 4,3 0,0 -4,3" fill="#94a3b8" />
          <polygon points="-15,0 -3,4 0,0 -3,-4" fill="#64748b" />
          <polygon points="15,0 3,4 0,0 3,-4" fill="#64748b" />
          <text x="0" y="-18" fill="#f87171" fontSize="9" fontWeight="bold" textAnchor="middle">ش</text>
          <text x="0" y="27" fill="#94a3b8" fontSize="8" textAnchor="middle">ج</text>
          <text x="26" y="3" fill="#94a3b8" fontSize="8" textAnchor="middle">ق</text>
          <text x="-26" y="3" fill="#94a3b8" fontSize="8" textAnchor="middle">غ</text>
          <text x="0" y="38" fill="#cbd5e1" fontSize="8" textAnchor="middle">{orientation}</text>
        </g>

        {/* Title Block & Blueprint Badge (Bottom Right corner inside) */}
        <g transform="translate(68, 50)">
          <rect x="0" y="0" width="130" height="42" rx="4" fill="#020617" fillOpacity="0.85" stroke="#1e293b" strokeWidth="1" />
          <text x="120" y="16" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="end">
            رسم توضيحي للوحدة {unit.unitNumber}
          </text>
          <text x="120" y="32" fill="#94a3b8" fontSize="9" textAnchor="end">
            المساحة الإجمالية: {unit.area} م²
          </text>
        </g>
      </svg>
    );
  };

  return (
    <div className="relative group rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-xl">
      {/* Container with specified height */}
      <div className={`w-full ${heightClass} flex items-center justify-center relative`}>
        {renderContent(false)}
      </div>

      {/* Floating Specs Bar */}
      <div className="bg-slate-950/90 backdrop-blur-md px-4 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-indigo-300 font-semibold">
            <span>📐 المساحة:</span>
            <span className="font-mono text-white font-bold">{unit.area} م²</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300">
            {rooms} غرف • {baths} حمام • {balconies} بلكونة
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-emerald-400 font-medium hidden sm:inline">
            الواجهة: {orientation}
          </span>
        </div>

        {/* Action Controls */}
        {showControls && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition border border-slate-700/60"
              title="تحميل المخطط التوضيحي"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            {interactive && (
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition border border-slate-700/60"
                title="تكبير المخطط بملء الشاشة"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Modal View */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 sm:p-8 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 max-w-5xl w-full mx-auto">
            <div>
              <h3 className="text-lg font-black text-white">
                المخطط الهندسي التوضيحي • وحدة {unit.unitNumber} ({unit.building})
              </h3>
              <p className="text-xs text-slate-400">
                المساحة: {unit.area} م² • الدور {unit.floor} • {rooms} غرف نوم • {baths} حمام • التشطيب: {finishing}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل</span>
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
              >
                إغلاق ✕
              </button>
            </div>
          </div>
          <div className="flex-1 max-w-5xl w-full mx-auto my-auto flex items-center justify-center p-2">
            <div className="w-full h-full max-h-[80vh] flex items-center justify-center">
              {renderContent(true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
