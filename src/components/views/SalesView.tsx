import React, { useState } from 'react';
import { AppDatabase, Contract, Installment, Unit } from '../../types';
import { formatCurrency, downloadCSV, addMonths } from '../../utils/helpers';
import {
  FileText, Plus, Search, Eye, Printer, Download,
  CheckCircle, AlertCircle, Calendar, DollarSign,
  Trash2, PlusCircle, Check, Clock, Sparkles
} from 'lucide-react';

interface ManualInstallmentItem {
  id: string;
  amount: number;
  dueDate: string;
  notes?: string;
}

interface Props {
  db: AppDatabase;
  canEdit: boolean;
  onUpdateDb: (updated: AppDatabase) => void;
  onOpenContractModal: (contract: Contract) => void;
}

export const SalesView: React.FC<Props> = ({
  db,
  canEdit,
  onUpdateDb,
  onOpenContractModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states
  const [selectedUnitId, setSelectedUnitId] = useState<number | ''>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [contractDate, setContractDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  // Installment schedule mode: 'auto' (automatic) vs 'manual' (custom manual payments)
  const [scheduleMode, setScheduleMode] = useState<'auto' | 'manual'>('auto');

  // Automatic schedule settings
  const [installmentCount, setInstallmentCount] = useState<number>(4);
  const [frequencyMonths, setFrequencyMonths] = useState<number>(3); // Default quarterly
  const [firstInstallmentDate, setFirstInstallmentDate] = useState<string>(
    addMonths(new Date().toISOString().split('T')[0], 3)
  );

  // Manual custom installments schedule
  const [manualInstallments, setManualInstallments] = useState<ManualInstallmentItem[]>([]);

  const [formError, setFormError] = useState('');

  // Units available for sale (or currently selected)
  const availableUnits = db.units.filter(u => u.status === 'متاحة');

  const handleUnitChange = (unitIdStr: string) => {
    const uid = Number(unitIdStr);
    setSelectedUnitId(uid);
    const unit = db.units.find(u => u.id === uid);
    if (unit) {
      setTotalPrice(unit.price);
      setDownPayment(Math.round(unit.price * 0.2)); // Suggest 20% down payment
    }
  };

  const remainingBalance = Math.max(0, totalPrice - downPayment);
  const installmentAmountPerTerm =
    installmentCount > 0 ? Math.round(remainingBalance / installmentCount) : 0;

  const totalManualAmount = manualInstallments.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );
  const manualDifference = remainingBalance - totalManualAmount;

  const handleSwitchToManual = () => {
    setScheduleMode('manual');
    if (manualInstallments.length === 0 && remainingBalance > 0) {
      const count = installmentCount > 0 ? installmentCount : 4;
      const baseAmt = Math.round(remainingBalance / count);
      const generated: ManualInstallmentItem[] = [];
      for (let i = 1; i <= count; i++) {
        const isLast = i === count;
        const amt = isLast ? remainingBalance - baseAmt * (count - 1) : baseAmt;
        generated.push({
          id: Math.random().toString(36).substring(2, 9),
          amount: amt,
          dueDate: addMonths(firstInstallmentDate, (i - 1) * frequencyMonths),
          notes: `دفعة ${i}`,
        });
      }
      setManualInstallments(generated);
    } else if (manualInstallments.length === 0) {
      setManualInstallments([
        {
          id: Math.random().toString(36).substring(2, 9),
          amount: remainingBalance > 0 ? remainingBalance : 0,
          dueDate: addMonths(contractDate, 3),
          notes: 'دفعة 1',
        },
      ]);
    }
  };

  const handleAddManualRow = () => {
    const lastDate = manualInstallments.length > 0
      ? manualInstallments[manualInstallments.length - 1].dueDate
      : contractDate;
    const nextDate = addMonths(lastDate, 3);
    const unallocated = Math.max(0, manualDifference);

    setManualInstallments([
      ...manualInstallments,
      {
        id: Math.random().toString(36).substring(2, 9),
        amount: unallocated,
        dueDate: nextDate,
        notes: `دفعة ${manualInstallments.length + 1}`,
      },
    ]);
  };

  const handleRemoveManualRow = (id: string) => {
    setManualInstallments(manualInstallments.filter(item => item.id !== id));
  };

  const handleUpdateManualRow = (id: string, field: keyof ManualInstallmentItem, val: any) => {
    setManualInstallments(
      manualInstallments.map(item => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleDistributeEqually = () => {
    if (manualInstallments.length === 0 || remainingBalance <= 0) return;
    const count = manualInstallments.length;
    const baseAmt = Math.floor(remainingBalance / count);
    const updated = manualInstallments.map((item, idx) => ({
      ...item,
      amount: idx === count - 1 ? remainingBalance - baseAmt * (count - 1) : baseAmt,
    }));
    setManualInstallments(updated);
  };

  const resetForm = () => {
    setSelectedUnitId('');
    setSelectedCustomerId('');
    setTotalPrice(0);
    setDownPayment(0);
    setNotes('');
    setScheduleMode('auto');
    setInstallmentCount(4);
    setFrequencyMonths(3);
    setFirstInstallmentDate(addMonths(new Date().toISOString().split('T')[0], 3));
    setManualInstallments([]);
    setFormError('');
    setIsFormOpen(false);
  };

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId) {
      setFormError('يرجى اختيار الوحدة السكنية للتعاقد');
      return;
    }
    if (!selectedCustomerId) {
      setFormError('يرجى اختيار العميل المشتري');
      return;
    }
    if (totalPrice <= 0) {
      setFormError('يرجى إدخال إجمالي سعر العقد');
      return;
    }
    if (downPayment < 0 || downPayment > totalPrice) {
      setFormError('قيمة المقدم غير صحيحة');
      return;
    }

    if (scheduleMode === 'manual' && remainingBalance > 0) {
      if (manualInstallments.length === 0) {
        setFormError('يرجى إضافة دفعة واحدة على الأقل في جدول الدفعات اليدوي');
        return;
      }
      for (let idx = 0; idx < manualInstallments.length; idx++) {
        const item = manualInstallments[idx];
        if (!item.dueDate) {
          setFormError(`يرجى تحديد تاريخ استحقاق الدفعة رقم ${idx + 1}`);
          return;
        }
        if (Number(item.amount) <= 0) {
          setFormError(`يرجى إدخال مبلغ أكبر من صفر للدفعة رقم ${idx + 1}`);
          return;
        }
      }
      if (Math.abs(manualDifference) > 1) {
        setFormError(
          `إجمالي الدفعات اليدوية (${formatCurrency(totalManualAmount)}) لا يساوي المتبقي المطلوب جدولته (${formatCurrency(remainingBalance)}). الفارق: ${formatCurrency(Math.abs(manualDifference))}`
        );
        return;
      }
    }

    const newContractId =
      db.contracts.length > 0 ? Math.max(...db.contracts.map(c => c.id)) + 1 : 1;

    const newContract: Contract = {
      id: newContractId,
      unitId: Number(selectedUnitId),
      customerId: Number(selectedCustomerId),
      totalPrice: Number(totalPrice),
      downPayment: Number(downPayment),
      contractDate,
      notes: notes.trim(),
    };

    // Generate scheduled installments
    let currentInstallmentId =
      db.installments.length > 0 ? Math.max(...db.installments.map(i => i.id)) + 1 : 1;

    const newInstallments: Installment[] = [];
    if (remainingBalance > 0) {
      if (scheduleMode === 'manual') {
        // Custom manual installments
        manualInstallments.forEach((item, index) => {
          newInstallments.push({
            id: currentInstallmentId++,
            contractId: newContractId,
            installmentNumber: index + 1,
            dueDate: item.dueDate,
            amount: Number(item.amount),
            paidAmount: 0,
            status: 'مستحق',
            notes: item.notes?.trim() || undefined,
          });
        });
      } else {
        // Automatic mode (kept completely intact)
        if (installmentCount > 0) {
          for (let i = 1; i <= installmentCount; i++) {
            // distribute rounding to last installment
            const isLast = i === installmentCount;
            const currentAmount = isLast
              ? remainingBalance - installmentAmountPerTerm * (installmentCount - 1)
              : installmentAmountPerTerm;

            const dueDate = addMonths(firstInstallmentDate, (i - 1) * frequencyMonths);

            newInstallments.push({
              id: currentInstallmentId++,
              contractId: newContractId,
              installmentNumber: i,
              dueDate,
              amount: currentAmount,
              paidAmount: 0,
              status: 'مستحق',
            });
          }
        }
      }
    }

    // Automatically update unit status to 'مباعة'
    const updatedUnits = db.units.map(u =>
      u.id === Number(selectedUnitId) ? { ...u, status: 'مباعة' as const } : u
    );

    onUpdateDb({
      ...db,
      units: updatedUnits,
      contracts: [newContract, ...db.contracts],
      installments: [...db.installments, ...newInstallments],
    });

    resetForm();
    onOpenContractModal(newContract);
  };

  const filteredContracts = db.contracts.filter(c => {
    const customer = db.customers.find(cu => cu.id === c.customerId);
    const unit = db.units.find(u => u.id === c.unitId);
    const q = searchTerm.toLowerCase();

    return (
      c.id.toString().includes(q) ||
      (customer && customer.name.toLowerCase().includes(q)) ||
      (unit && unit.unitNumber.toLowerCase().includes(q)) ||
      (unit && unit.building.toLowerCase().includes(q))
    );
  });

  const handleExportCSV = () => {
    const headers = [
      'رقم العقد', 'الوحدة', 'العمارة', 'العميل',
      'إجمالي السعر', 'المقدم', 'المتبقي', 'تاريخ العقد', 'ملاحظات'
    ];
    const rows = db.contracts.map(c => {
      const u = db.units.find(x => x.id === c.unitId);
      const cust = db.customers.find(x => x.id === c.customerId);
      return [
        c.id,
        u?.unitNumber || '',
        u?.building || '',
        cust?.name || '',
        c.totalPrice,
        c.downPayment,
        c.totalPrice - c.downPayment,
        c.contractDate,
        c.notes,
      ];
    });
    downloadCSV('عقود_البيع', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            <h2 className="text-2xl font-bold text-slate-800">عقود البيع وجدولة الأقساط</h2>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            إبرام عقود البيع، توليد جداول الأقساط آلياً، وطباعة العقود الرسمية
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
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إبرام عقد بيع جديد</span>
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
            placeholder="بحث برقم العقد، اسم العميل، أو رقم الوحدة..."
            className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          عدد العقود: {filteredContracts.length}
        </div>
      </div>

      {/* New Contract Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">إبرام عقد بيع وحدة جديدة</h3>
              <button
                onClick={resetForm}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Selection: Unit and Customer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الوحدة السكنية (المتاحة فقط) *</label>
                  <select
                    required
                    value={selectedUnitId}
                    onChange={e => handleUnitChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- اختر الوحدة المراد بيعها --</option>
                    {availableUnits.map(u => (
                      <option key={u.id} value={u.id}>
                        وحدة {u.unitNumber} - {u.building} (الدور {u.floor} - {u.area} م² - {formatCurrency(u.price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">العميل المشتري *</label>
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- اختر العميل --</option>
                    {db.customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing terms */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">إجمالي سعر البيع (ج.م) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={totalPrice}
                    onChange={e => setTotalPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">المقدم المدفوع (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={downPayment}
                    onChange={e => setDownPayment(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">المتبقي المطلوب جدولته</label>
                  <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-blue-700">
                    {formatCurrency(remainingBalance)}
                  </div>
                </div>
              </div>

              {/* Contract Date & Schedule Mode Selector */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ تحرير العقد</label>
                    <input
                      type="date"
                      value={contractDate}
                      onChange={e => setContractDate(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white"
                    />
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setScheduleMode('auto')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        scheduleMode === 'auto'
                          ? 'bg-white text-emerald-800 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>جدولة آلية منتظمة (تلقائي)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSwitchToManual}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        scheduleMode === 'manual'
                          ? 'bg-white text-emerald-800 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>إدخال دفعات وتواريخ يدوياً</span>
                    </button>
                  </div>
                </div>

                {/* AUTOMATIC SCHEDULE (Current method preserved intact) */}
                {scheduleMode === 'auto' && (
                  <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-bold text-slate-800 text-sm">جدولة وتوزيع الأقساط آلياً</h4>
                      <span className="text-[11px] text-slate-400 font-normal">(حساب الأقساط بالتساوي بناءً على الدورية)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">عدد الأقساط</label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={installmentCount}
                          onChange={e => setInstallmentCount(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">دورية السداد</label>
                        <select
                          value={frequencyMonths}
                          onChange={e => setFrequencyMonths(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        >
                          <option value={1}>شهري (كل شهر)</option>
                          <option value={3}>ربع سنوي (كل 3 شهور)</option>
                          <option value={6}>نصف سنوي (كل 6 شهور)</option>
                          <option value={12}>سنوي (كل سنة)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">تاريخ أول قسط</label>
                        <input
                          type="date"
                          value={firstInstallmentDate}
                          onChange={e => setFirstInstallmentDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        />
                      </div>
                    </div>

                    {remainingBalance > 0 && installmentCount > 0 && (
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex justify-between items-center text-xs">
                        <span className="font-semibold text-emerald-900">
                          قيمة كل قسط تقريبياً ({installmentCount} أقساط):
                        </span>
                        <span className="font-black text-emerald-800 text-sm">
                          {formatCurrency(installmentAmountPerTerm)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* MANUAL SCHEDULE (Custom manual payments and due dates) */}
                {scheduleMode === 'manual' && (
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">جدول الدفعات والمواعيد اليدوية</h4>
                          <span className="text-[11px] text-slate-500">
                            قم بتحديد قيمة وتاريخ استحقاق كل دفعة يدوياً بحرية كاملة
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {manualInstallments.length > 0 && (
                          <button
                            type="button"
                            onClick={handleDistributeEqually}
                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                            title="توزيع المتبقي بالتساوي على الدفعات الحالية"
                          >
                            توزيع المتبقي بالتساوي
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleAddManualRow}
                          className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة دفعة</span>
                        </button>
                      </div>
                    </div>

                    {manualInstallments.length === 0 ? (
                      <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-300">
                        <p className="text-xs text-slate-500 mb-2">لا توجد دفعات مضافة حتى الآن</p>
                        <button
                          type="button"
                          onClick={handleAddManualRow}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          إضافة أول دفعة ({formatCurrency(remainingBalance)})
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 px-2">
                          <span className="col-span-1 text-center">م</span>
                          <span className="col-span-4">تاريخ الاستحقاق *</span>
                          <span className="col-span-3">قيمة الدفعة (ج.م) *</span>
                          <span className="col-span-3">البيان / الوصف</span>
                          <span className="col-span-1 text-center">حذف</span>
                        </div>

                        {manualInstallments.map((item, idx) => (
                          <div
                            key={item.id}
                            className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition"
                          >
                            <span className="col-span-1 text-center font-bold text-xs text-slate-700">
                              #{idx + 1}
                            </span>
                            <div className="col-span-4">
                              <input
                                type="date"
                                required
                                value={item.dueDate}
                                onChange={e => handleUpdateManualRow(item.id, 'dueDate', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number"
                                min="1"
                                step="any"
                                required
                                value={item.amount || ''}
                                onChange={e => handleUpdateManualRow(item.id, 'amount', Number(e.target.value))}
                                placeholder="0"
                                className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold text-emerald-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="text"
                                value={item.notes || ''}
                                onChange={e => handleUpdateManualRow(item.id, 'notes', e.target.value)}
                                placeholder={`دفعة ${idx + 1}`}
                                className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                            <div className="col-span-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveManualRow(item.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="حذف هذه الدفعة"
                              >
                                <Trash2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Manual Balance Verification Bar */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-slate-400 block text-[10px]">مجموع الدفعات اليدوية:</span>
                          <span className="font-black text-slate-800 text-sm">{formatCurrency(totalManualAmount)}</span>
                        </div>
                        <div className="border-r border-slate-200 pr-3">
                          <span className="text-slate-400 block text-[10px]">المتبقي المطلوب:</span>
                          <span className="font-black text-blue-700 text-sm">{formatCurrency(remainingBalance)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {Math.abs(manualDifference) <= 1 ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200 flex items-center gap-1 text-[11px]">
                            <Check className="w-3.5 h-3.5" />
                            متطابق تماماً مع المتبقي
                          </span>
                        ) : manualDifference > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 font-bold rounded-lg border border-amber-200 flex items-center gap-1 text-[11px]">
                              <AlertCircle className="w-3.5 h-3.5" />
                              متبقي للتوزيع: {formatCurrency(manualDifference)}
                            </span>
                            <button
                              type="button"
                              onClick={handleAddManualRow}
                              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition"
                            >
                              + إضافة بالمتبقي
                            </button>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 bg-red-50 text-red-700 font-bold rounded-lg border border-red-200 flex items-center gap-1 text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5" />
                            تجاوز المتبقي بـ {formatCurrency(Math.abs(manualDifference))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات وشروط خاصة</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="مثال: الاستلام خلال سنتين بعد سداد 50% من الأقساط..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition shadow-sm"
                >
                  حفظ العقد وتوليد الأقساط وطباعة العقد
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

      {/* Contracts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">رقم العقد</th>
                <th className="py-3 px-4">الوحدة والعمارة</th>
                <th className="py-3 px-4">العميل المشتري</th>
                <th className="py-3 px-4">إجمالي السعر</th>
                <th className="py-3 px-4">المقدم المدفوع</th>
                <th className="py-3 px-4">المتبقي المطلوب</th>
                <th className="py-3 px-4">تاريخ التعاقد</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    لا توجد عقود مسجلة تطابق البحث
                  </td>
                </tr>
              ) : (
                filteredContracts.map(contract => {
                  const unit = db.units.find(u => u.id === contract.unitId);
                  const customer = db.customers.find(c => c.id === contract.customerId);
                  const remaining = contract.totalPrice - contract.downPayment;

                  return (
                    <tr key={contract.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        #{contract.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block">
                          وحدة {unit?.unitNumber || '-'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {unit?.building} (الدور {unit?.floor})
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {customer?.name || '-'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {customer?.phone || ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatCurrency(contract.totalPrice)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-emerald-700">
                        {formatCurrency(contract.downPayment)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-blue-700">
                        {formatCurrency(remaining)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                        {contract.contractDate}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onOpenContractModal(contract)}
                          title="عرض وطباعة العقد"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>عرض وطباعة</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
