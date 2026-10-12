import React, { useState } from 'react';
import { AppDatabase, Unit, UnitStatus } from '../../types';
import { formatCurrency, downloadCSV } from '../../utils/helpers';
import {
  Building, Plus, Search, Filter, QrCode, Trash2, Edit2, Download,
  CheckCircle, AlertCircle, Eye
} from 'lucide-react';

interface Props {
  db: AppDatabase;
  canEdit: boolean;
  onUpdateDb: (updated: AppDatabase) => void;
  onOpenQr: (unit: Unit) => void;
}

export const UnitsView: React.FC<Props> = ({
  db,
  canEdit,
  onUpdateDb,
  onOpenQr,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('الكل');
  const [filterStatus, setFilterStatus] = useState('الكل');

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);

  const [formUnitNumber, setFormUnitNumber] = useState('');
  const [formBuilding, setFormBuilding] = useState('');
  const [formFloor, setFormFloor] = useState<number>(1);
  const [formArea, setFormArea] = useState<number>(120);
  const [formPrice, setFormPrice] = useState<number>(1500000);
  const [formStatus, setFormStatus] = useState<UnitStatus>('متاحة');
  const [formError, setFormError] = useState('');

  // Extract unique buildings
  const buildings = Array.from(new Set(db.units.map(u => u.building).filter(Boolean)));

  const filteredUnits = db.units.filter(u => {
    const matchesSearch =
      u.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.building.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBuilding = filterBuilding === 'الكل' || u.building === filterBuilding;
    const matchesStatus = filterStatus === 'الكل' || u.status === filterStatus;
    return matchesSearch && matchesBuilding && matchesStatus;
  });

  const resetForm = () => {
    setEditingUnitId(null);
    setFormUnitNumber('');
    setFormBuilding('');
    setFormFloor(1);
    setFormArea(120);
    setFormPrice(1500000);
    setFormStatus('متاحة');
    setFormError('');
    setIsFormOpen(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (unit: Unit) => {
    setEditingUnitId(unit.id);
    setFormUnitNumber(unit.unitNumber);
    setFormBuilding(unit.building);
    setFormFloor(unit.floor);
    setFormArea(unit.area);
    setFormPrice(unit.price);
    setFormStatus(unit.status);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUnitNumber.trim() || !formBuilding.trim()) {
      setFormError('يرجى إدخال رقم الوحدة واسم العمارة');
      return;
    }

    // Check duplicate unit number in same building
    const duplicate = db.units.find(
      u => u.unitNumber === formUnitNumber.trim() &&
           u.building === formBuilding.trim() &&
           u.id !== editingUnitId
    );
    if (duplicate) {
      setFormError(`رقم الوحدة ${formUnitNumber} مسجل بالفعل في ${formBuilding}`);
      return;
    }

    if (editingUnitId) {
      const updatedUnits = db.units.map(u =>
        u.id === editingUnitId
          ? {
              ...u,
              unitNumber: formUnitNumber.trim(),
              building: formBuilding.trim(),
              floor: Number(formFloor),
              area: Number(formArea),
              price: Number(formPrice),
              status: formStatus,
            }
          : u
      );
      onUpdateDb({ ...db, units: updatedUnits });
    } else {
      const newId = db.units.length > 0 ? Math.max(...db.units.map(u => u.id)) + 1 : 1;
      const newUnit: Unit = {
        id: newId,
        unitNumber: formUnitNumber.trim(),
        building: formBuilding.trim(),
        floor: Number(formFloor),
        area: Number(formArea),
        price: Number(formPrice),
        status: formStatus,
      };
      onUpdateDb({ ...db, units: [...db.units, newUnit] });
    }

    resetForm();
  };

  const handleDeleteUnit = (unitId: number) => {
    const hasContract = db.contracts.some(c => c.unitId === unitId);
    if (hasContract) {
      alert('لا يمكن حذف هذه الوحدة لوجود عقد بيع مسجل عليها.');
      return;
    }
    if (confirm('هل أنت متأكد من رغبتك في حذف هذه الوحدة؟')) {
      const updatedUnits = db.units.filter(u => u.id !== unitId);
      onUpdateDb({ ...db, units: updatedUnits });
    }
  };

  const handleQuickStatusChange = (unitId: number, newStatus: UnitStatus) => {
    const updatedUnits = db.units.map(u => (u.id === unitId ? { ...u, status: newStatus } : u));
    onUpdateDb({ ...db, units: updatedUnits });
  };

  const handleExportCSV = () => {
    const headers = ['رقم الوحدة', 'العمارة', 'الدور', 'المساحة (م²)', 'السعر (ج.م)', 'الحالة'];
    const rows = db.units.map(u => [u.unitNumber, u.building, u.floor, u.area, u.price, u.status]);
    downloadCSV('قائمة_الوحدات_العقارية', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-800">إدارة الوحدات السكنية والعقارات</h2>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            عرض وتعديل الوحدات، الأسعار، المواصفات، وتوليد رموز QR Code
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition border border-slate-200"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>
          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة وحدة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="بحث برقم الوحدة أو العمارة..."
            className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>العمارة:</span>
            <select
              value={filterBuilding}
              onChange={e => setFilterBuilding(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="الكل">جميع العمائر</option>
              {buildings.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>الحالة:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="الكل">جميع الحالات</option>
              <option value="متاحة">متاحة</option>
              <option value="محجوزة">محجوزة</option>
              <option value="مباعة">مباعة</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add / Edit Unit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingUnitId ? 'تعديل بيانات الوحدة' : 'إضافة وحدة جديدة'}
              </h3>
              <button
                onClick={resetForm}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الوحدة *</label>
                  <input
                    type="text"
                    required
                    value={formUnitNumber}
                    onChange={e => setFormUnitNumber(e.target.value)}
                    placeholder="مثال: 101 أو A-12"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">العمارة / المشروع *</label>
                  <input
                    type="text"
                    required
                    value={formBuilding}
                    onChange={e => setFormBuilding(e.target.value)}
                    placeholder="مثال: عمارة النور"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الدور</label>
                  <input
                    type="number"
                    min="0"
                    value={formFloor}
                    onChange={e => setFormFloor(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">المساحة (م²)</label>
                  <input
                    type="number"
                    min="1"
                    value={formArea}
                    onChange={e => setFormArea(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الحالة</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as UnitStatus)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="متاحة">متاحة</option>
                    <option value="محجوزة">محجوزة</option>
                    <option value="مباعة">مباعة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">سعر الوحدة (ج.م) *</label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  required
                  value={formPrice}
                  onChange={e => setFormPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {formatCurrency(formPrice)}
                </span>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition"
                >
                  {editingUnitId ? 'حفظ التعديلات' : 'إضافة الوحدة'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Units Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">رقم الوحدة</th>
                <th className="py-3 px-4">العمارة</th>
                <th className="py-3 px-4">الدور</th>
                <th className="py-3 px-4">المساحة</th>
                <th className="py-3 px-4">السعر المطلوب</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">QR Code</th>
                {canEdit && <th className="py-3 px-4 text-center">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    لا توجد وحدات تطابق معايير البحث
                  </td>
                </tr>
              ) : (
                filteredUnits.map(unit => {
                  const hasContract = db.contracts.some(c => c.unitId === unit.id);

                  return (
                    <tr key={unit.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-black text-slate-900 text-base">
                        {unit.unitNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {unit.building}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        الدور {unit.floor}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {unit.area} م²
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        {formatCurrency(unit.price)}
                      </td>
                      <td className="py-3.5 px-4">
                        {canEdit ? (
                          <select
                            value={unit.status}
                            onChange={e => handleQuickStatusChange(unit.id, e.target.value as UnitStatus)}
                            className={`text-xs font-bold py-1 px-2.5 rounded-lg border focus:outline-none ${
                              unit.status === 'متاحة'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : unit.status === 'محجوزة'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            <option value="متاحة">متاحة</option>
                            <option value="محجوزة">محجوزة</option>
                            <option value="مباعة">مباعة</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-block text-xs font-bold py-1 px-2.5 rounded-lg ${
                              unit.status === 'متاحة'
                                ? 'bg-blue-50 text-blue-700'
                                : unit.status === 'محجوزة'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {unit.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onOpenQr(unit)}
                          title="عرض رمز QR Code"
                          className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg transition"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </td>
                      {canEdit && (
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(unit)}
                              title="تعديل الوحدة"
                              className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUnit(unit.id)}
                              title={hasContract ? 'لا يمكن حذف وحدة مرتبطة بعقد' : 'حذف الوحدة'}
                              disabled={hasContract}
                              className={`p-1.5 rounded-lg transition ${
                                hasContract
                                  ? 'text-slate-200 cursor-not-allowed'
                                  : 'hover:bg-red-50 text-slate-400 hover:text-red-600'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>إجمالي المعروض: {filteredUnits.length} وحدة</span>
          <span>إجمالي القيمة: {formatCurrency(filteredUnits.reduce((s, u) => s + u.price, 0))}</span>
        </div>
      </div>
    </div>
  );
};
