import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Unit } from '../types';
import { formatCurrency } from '../utils/helpers';
import { printDirectly } from '../utils/pdfExport';
import { X, Download, Printer } from 'lucide-react';

interface Props {
  unit: Unit | null;
  onClose: () => void;
}

export const QRCodeModal: React.FC<Props> = ({ unit, onClose }) => {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (!unit) return;
    const info = `الوحدة: ${unit.unitNumber}\nالعمارة: ${unit.building}\nالدور: ${unit.floor}\nالمساحة: ${unit.area} م²\nالسعر: ${unit.price} ج.م\nالحالة: ${unit.status}`;
    QRCode.toDataURL(info, { width: 300, margin: 2 })
      .then(url => setQrUrl(url))
      .catch(err => console.error(err));
  }, [unit]);

  if (!unit) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `QR_Unit_${unit.unitNumber}_${unit.building}.png`;
    a.click();
  };

  const handlePrint = () => {
    printDirectly('qr-print-area');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏢</span>
            <h3 className="font-bold text-slate-800 text-lg">
              رمز الاستجابة السريع (QR Code)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center space-y-4" id="qr-print-area">
          <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 inline-block">
            {qrUrl ? (
              <img src={qrUrl} alt="Unit QR Code" className="w-56 h-56 mx-auto rounded-lg shadow-sm" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400">جاري التوليد...</div>
            )}
          </div>

          <div className="bg-slate-100/70 p-4 rounded-xl text-right space-y-1 text-sm border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500">رقم الوحدة:</span>
              <span className="font-bold text-slate-800">{unit.unitNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">العمارة:</span>
              <span className="font-semibold text-slate-800">{unit.building}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الدور:</span>
              <span className="text-slate-800">الدور {unit.floor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">المساحة:</span>
              <span className="font-semibold text-slate-800">{unit.area} م²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">السعر:</span>
              <span className="font-bold text-emerald-600">{formatCurrency(unit.price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الحالة:</span>
              <span className="font-semibold text-slate-700">{unit.status}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>تحميل الصورة</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-xl transition"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
