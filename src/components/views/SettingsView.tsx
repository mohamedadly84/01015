import React, { useState } from 'react';
import { AppDatabase, CompanySettings } from '../../types';
import { initialData, sampleDemoData } from '../../services/initialData';
import { downloadCSV } from '../../utils/helpers';
import {
  Settings, Save, Download, Upload, RotateCcw, Building2,
  CheckCircle, Database, ShieldAlert, Trash2
} from 'lucide-react';

interface Props {
  db: AppDatabase;
  onUpdateDb: (updated: AppDatabase) => void;
  onSyncServer: () => void;
}

export const SettingsView: React.FC<Props> = ({ db, onUpdateDb, onSyncServer }) => {
  const [settings, setSettings] = useState<CompanySettings>(db.settings);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDb({ ...db, settings });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportFullJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `realestate_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = event => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && Array.isArray(parsed.units) && Array.isArray(parsed.customers)) {
            if (confirm('هل أنت متأكد من استرجاع هذه النسخة الاحتياطية؟ سيتم استبدال البيانات الحالية.')) {
              onUpdateDb(parsed);
              alert('✅ تم استرجاع النسخة الاحتياطية بنجاح!');
            }
          } else {
            alert('❌ ملف النسخة الاحتياطية غير صالح.');
          }
        } catch (err) {
          alert('❌ حدث خطأ أثناء قراءة ملف النسخة الاحتياطية.');
        }
      };
    }
  };

  const handleClearAllData = () => {
    if (confirm('هل أنت متأكد من تفريغ كافة البيانات؟ سيتم مسح جميع الوحدات، العملاء، العقود، والأقساط للبدء بسجل فارغ وجديد تماماً.')) {
      onUpdateDb(initialData);
      setSettings(initialData.settings);
      alert('✅ تم تفريغ البرنامج بنجاح! قاعدة البيانات الآن فارغة وجاهزة لإدخال بياناتك الحقيقية.');
    }
  };

  const handleLoadDemoData = () => {
    if (confirm('هل ترغب في تحميل بيانات نموذجية تجريبية للاختبار؟')) {
      onUpdateDb(sampleDemoData);
      setSettings(sampleDemoData.settings);
      alert('✅ تم تحميل البيانات النموذجية بنجاح.');
    }
  };

  const handleExportAllTablesCSV = () => {
    // Generate combined summary CSV
    const headers = ['النوع / الجدول', 'المعرف', 'البيان', 'القيمة 1', 'القيمة 2', 'الحالة / التاريخ'];
    const rows: (string | number)[][] = [];

    // Units
    db.units.forEach(u => {
      rows.push(['وحدة سكنية', u.unitNumber, u.building, `${u.area} م²`, u.price, u.status]);
    });

    // Customers
    db.customers.forEach(c => {
      rows.push(['عميل', c.id, c.name, c.phone, c.nationalId, c.address]);
    });

    // Contracts
    db.contracts.forEach(co => {
      rows.push(['عقد بيع', co.id, `وحدة ${co.unitId}`, co.totalPrice, co.downPayment, co.contractDate]);
    });

    // Installments
    db.installments.forEach(i => {
      rows.push(['قسط', i.id, `عقد ${i.contractId} (#${i.installmentNumber})`, i.amount, i.paidAmount, i.status]);
    });

    // Expenses
    db.expenses.forEach(ex => {
      rows.push(['مصروف', ex.id, ex.description, ex.amount, ex.building, ex.expenseDate]);
    });

    downloadCSV('تصدير_شامل_لقاعدة_البيانات', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-8 rounded-3xl glass-panel border border-indigo-500/20 shadow-2xl shadow-indigo-500/10 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 rounded-2xl bg-slate-500/20 border border-slate-500/30">⚙️</span>
            <div>
              <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                إعدادات النظام والنسخ الاحتياطي
              </h2>
              <p className="text-slate-300 text-sm mt-1 font-medium">
                تخصيص بيانات الشركة، تصدير البيانات إلى Excel، وتنزيل أو استرجاع النسخ الاحتياطية
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleExportAllTablesCSV}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 rounded-xl text-sm font-semibold transition border border-slate-700"
        >
          <Download className="w-4 h-4" />
          <span>تصدير شامل CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>بيانات الشركة والمطبوعات الرسمية</span>
          </h3>

          <form onSubmit={handleSaveCompany} className="space-y-4">
            {saveSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2 border border-emerald-200">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>تم حفظ بيانات الشركة بنجاح! ستظهر فوراً في العقود والإيصالات.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المؤسسة أو الشركة العقارية *</label>
              <input
                type="text"
                required
                value={settings.name}
                onChange={e => setSettings({ ...settings, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الهاتف والتواصل</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={e => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الرقم الضريبي / السجل التجاري</label>
                <input
                  type="text"
                  value={settings.taxNumber}
                  onChange={e => setSettings({ ...settings, taxNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">العنوان الرئيسي للشركة</label>
              <input
                type="text"
                value={settings.address}
                onChange={e => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">رمز العملة</label>
              <input
                type="text"
                value={settings.currency}
                onChange={e => setSettings({ ...settings, currency: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Master Plan Image / Blueprint */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                صورة المخطط العام للعمارات (Master Site Plan)
              </label>
              <p className="text-[11px] text-slate-500">
                ارفع صورة المخطط العام أو كروكي توزيع العمارات، وستظهر في صفحة الزائرين والمعرض العام.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = ev => {
                        const base64 = ev.target?.result as string;
                        setSettings({ ...settings, masterPlanImage: base64 });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {settings.masterPlanImage && (
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, masterPlanImage: undefined })}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                  >
                    حذف الصورة
                  </button>
                )}
              </div>
              {settings.masterPlanImage && (
                <div className="mt-2 h-24 w-auto rounded-lg overflow-hidden border border-slate-200 inline-block">
                  <img
                    src={settings.masterPlanImage}
                    alt="معاينة المخطط العام"
                    className="h-full w-auto object-contain"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات</span>
            </button>
          </form>
        </div>

        {/* Backup & Data Management */}
        <div className="space-y-6">
          {/* Cloud Sync & Export */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                <span>قاعدة البيانات السحابية الحية (Cloud Firestore)</span>
              </h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>سحابي مباشر لجميع المستخدمين</span>
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              يتم تخزين كافة البيانات ومزامنتها سحابياً فوراً عبر <strong>Firebase Cloud Firestore</strong>. أي مستخدم يضيف وحدة، عقداً، قسطاً، أو مصروفاً يظهر فوراً لجميع أعضاء الفريق على هواتفهم وحواسيبهم في نفس اللحظة دون الاعتماد على ذاكرة المتصفح.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleExportFullJson}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل نسخة JSON</span>
              </button>

              <button
                onClick={handleExportAllTablesCSV}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>تصدير شامل Excel</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                استرجاع نسخة احتياطية من ملف (JSON):
              </label>
              <label className="flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl cursor-pointer text-xs font-semibold text-slate-600 hover:text-indigo-600 transition bg-slate-50">
                <Upload className="w-4 h-4" />
                <span>اختر ملف النسخة الاحتياطية (.json)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Reset & Clean Data */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>إدارة محتوى قاعدة البيانات</span>
            </h3>

            <div className="p-4 bg-red-50 rounded-xl border border-red-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-red-900 text-xs">تفريغ البرنامج والبدء بسجل نظيف</h4>
                  <p className="text-[11px] text-red-700 mt-0.5">
                    مسح كافة الوحدات والعملاء والعقود والمصروفات للبدء بإدخال بيانات عملك الفعلية.
                  </p>
                </div>
              </div>
              <button
                onClick={handleClearAllData}
                className="flex items-center gap-2 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح وتفريغ كافة البيانات الآن</span>
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800 text-xs">تحميل بيانات تجريبية (اختياري)</h4>
              <p className="text-[11px] text-slate-500">
                إذا رغبت في أي وقت بتجربة شاشات البرنامج ببيانات وهمية.
              </p>
              <button
                onClick={handleLoadDemoData}
                className="flex items-center gap-2 py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تحميل بيانات نموذجية تجريبية</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
