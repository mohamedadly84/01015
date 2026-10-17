import React, { useState } from 'react';
import { AppDatabase, Customer } from '../../types';
import { downloadCSV, formatCurrency } from '../../utils/helpers';
import {
  Users, Plus, Search, Trash2, Edit2, Download, Phone, MapPin,
  FileText, AlertCircle
} from 'lucide-react';

interface Props {
  db: AppDatabase;
  canEdit: boolean;
  onUpdateDb: (updated: AppDatabase) => void;
  onViewContract: (contractId: number) => void;
}

export const CustomersView: React.FC<Props> = ({
  db,
  canEdit,
  onUpdateDb,
  onViewContract,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const filteredCustomers = (db.customers || []).filter(c => {
    const q = searchTerm.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.nationalId && c.nationalId.includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  });

  const resetForm = () => {
    setEditingCustomerId(null);
    setName('');
    setPhone('');
    setNationalId('');
    setAddress('');
    setNotes('');
    setFormError('');
    setIsFormOpen(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    setName(customer.name);
    setPhone(customer.phone);
    setNationalId(customer.nationalId);
    setAddress(customer.address);
    setNotes(customer.notes);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('يرجى إدخال اسم العميل');
      return;
    }

    if (editingCustomerId) {
      const updatedCustomers = db.customers.map(c =>
        c.id === editingCustomerId
          ? {
              ...c,
              name: name.trim(),
              phone: phone.trim(),
              nationalId: nationalId.trim(),
              address: address.trim(),
              notes: notes.trim(),
            }
          : c
      );
      onUpdateDb({ ...db, customers: updatedCustomers });
    } else {
      const newId = db.customers.length > 0 ? Math.max(...db.customers.map(c => c.id)) + 1 : 1;
      const newCustomer: Customer = {
        id: newId,
        name: name.trim(),
        phone: phone.trim(),
        nationalId: nationalId.trim(),
        address: address.trim(),
        notes: notes.trim(),
      };
      onUpdateDb({ ...db, customers: [...db.customers, newCustomer] });
    }

    resetForm();
  };

  const handleDeleteCustomer = (customerId: number) => {
    const hasContract = db.contracts.some(c => c.customerId === customerId);
    if (hasContract) {
      alert('لا يمكن حذف هذا العميل لوجود عقود مسجلة باسمه.');
      return;
    }
    if (confirm('هل أنت متأكد من حذف بيانات هذا العميل؟')) {
      const updated = db.customers.filter(c => c.id !== customerId);
      onUpdateDb({ ...db, customers: updated });
    }
  };

  const handleExportCSV = () => {
    const headers = ['الاسم', 'الموبايل', 'الرقم القومي', 'العنوان', 'ملاحظات'];
    const rows = db.customers.map(c => [c.name, c.phone, c.nationalId, c.address, c.notes]);
    downloadCSV('قائمة_العملاء', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-8 rounded-3xl glass-panel border border-indigo-500/20 shadow-2xl shadow-indigo-500/10 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-slate-800">إدارة العملاء والمشترين</h2>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            سجل العملاء، أرقام الهواتف، الأرقام القومية، ومتابعة العقود المبرمة
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
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عميل جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم، رقم الموبايل، أو الرقم القومي..."
            className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          عدد العملاء: {filteredCustomers.length}
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingCustomerId ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
              </h3>
              <button
                onClick={resetForm}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">اسم العميل بالكامل *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="مثال: أحمد محمد عبد الرحمن"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الموبايل</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="010xxxxxxxx"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الرقم القومي (14 رقم)</label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={e => setNationalId(e.target.value)}
                    placeholder="290xxxxxxxxxxx"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">العنوان بالتفصيل</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="المحافظة - الحي - الشارع"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="أي متطلبات أو شروط خاصة بالعميل..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition"
                >
                  {editingCustomerId ? 'حفظ التعديلات' : 'إضافة العميل'}
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

      {/* Customers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
            لا يوجد عملاء يطابقون معايير البحث
          </div>
        ) : (
          filteredCustomers.map(customer => {
            const customerContracts = db.contracts.filter(c => c.customerId === customer.id);
            const totalContractValue = customerContracts.reduce((s, c) => s + c.totalPrice, 0);

            return (
              <div
                key={customer.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{customer.name}</h3>
                      <span className="text-xs text-slate-400 font-mono">ID: #{customer.id}</span>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(customer)}
                          title="تعديل العميل"
                          className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          title={customerContracts.length > 0 ? 'لا يمكن حذف عميل لديه عقود' : 'حذف العميل'}
                          disabled={customerContracts.length > 0}
                          className={`p-1.5 rounded-lg transition ${
                            customerContracts.length > 0
                              ? 'text-slate-200 cursor-not-allowed'
                              : 'hover:bg-red-50 text-slate-400 hover:text-red-600'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-800">{customer.phone || 'غير مسجل'}</span>
                    </div>
                    {customer.nationalId && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-400">الرقم القومي:</span>
                        <span className="font-mono">{customer.nationalId}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{customer.address}</span>
                      </div>
                    )}
                    {customer.notes && (
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-500 italic mt-2">
                        {customer.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Contracts section */}
                <div className="mt-5 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="font-semibold text-slate-700">العقود المبرمة ({customerContracts.length})</span>
                    {totalContractValue > 0 && (
                      <span className="font-bold text-emerald-700">{formatCurrency(totalContractValue)}</span>
                    )}
                  </div>

                  {customerContracts.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">لا توجد عقود مسجلة بعد</span>
                  ) : (
                    <div className="space-y-1">
                      {customerContracts.map(c => {
                        const unit = db.units.find(u => u.id === c.unitId);
                        return (
                          <div
                            key={c.id}
                            onClick={() => onViewContract(c.id)}
                            className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/60 hover:bg-indigo-100/70 cursor-pointer text-xs transition"
                          >
                            <span className="font-medium text-indigo-900">
                              عقد #{c.id} - وحدة {unit?.unitNumber} ({unit?.building})
                            </span>
                            <span className="text-[11px] font-bold text-indigo-700">عرض العقد ←</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
