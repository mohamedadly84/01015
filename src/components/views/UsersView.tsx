import React, { useState } from 'react';
import { AppDatabase, User, UserRole } from '../../types';
import { setCurrentUser } from '../../services/storage';
import { Shield, Plus, Edit2, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Props {
  db: AppDatabase;
  currentUser: User;
  onUpdateDb: (updated: AppDatabase) => void;
}

export const UsersView: React.FC<Props> = ({ db, currentUser, onUpdateDb }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('sales');
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState('');

  const resetForm = () => {
    setEditingUserId(null);
    setUsername('');
    setFullName('');
    setPassword('');
    setRole('sales');
    setActive(true);
    setFormError('');
    setIsAddOpen(false);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUserId(user.id);
    setUsername(user.username);
    setFullName(user.fullName);
    setPassword('');
    setRole(user.role);
    setActive(user.active);
    setFormError('');
    setIsAddOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setFormError('يرجى إدخال اسم المستخدم');
      return;
    }
    if (!editingUserId && !password.trim()) {
      setFormError('يرجى إدخال كلمة المرور');
      return;
    }

    if (editingUserId) {
      const updatedUsers = db.users.map(u => {
        if (u.id === editingUserId) {
          return {
            ...u,
            fullName: fullName.trim(),
            role,
            active,
            ...(password.trim() ? { password: password.trim() } : {}),
          };
        }
        return u;
      });
      if (editingUserId === currentUser.id) {
        setCurrentUser({
          ...currentUser,
          fullName: fullName.trim(),
          role,
          active,
        });
      }
      onUpdateDb({ ...db, users: updatedUsers });
    } else {
      const exists = db.users.some(u => u.username.toLowerCase() === username.trim().toLowerCase());
      if (exists) {
        setFormError('اسم المستخدم موجود بالفعل');
        return;
      }

      const newId = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
      const newUser: User = {
        id: newId,
        username: username.trim(),
        fullName: fullName.trim(),
        role,
        active,
        createdAt: new Date().toISOString().split('T')[0],
        password: password.trim(),
      };
      onUpdateDb({ ...db, users: [...db.users, newUser] });
    }

    resetForm();
  };

  const handleDeleteUser = (userId: number) => {
    const user = db.users.find(u => u.id === userId);
    if (user?.username === 'admin') {
      alert('لا يمكن حذف المستخدم الرئيسي (admin).');
      return;
    }
    if (confirm(`هل أنت متأكد من حذف المستخدم ${user?.fullName || user?.username}؟`)) {
      const updated = db.users.filter(u => u.id !== userId);
      onUpdateDb({ ...db, users: updated });
    }
  };

  const roleLabels: Record<UserRole, { label: string; badge: string }> = {
    admin: { label: 'مدير النظام', badge: 'bg-red-50 text-red-700 border-red-200' },
    accountant: { label: 'محاسب مالي', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    sales: { label: 'مسؤول مبيعات', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-8 rounded-3xl glass-panel border border-indigo-500/20 shadow-2xl shadow-indigo-500/10 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 rounded-2xl bg-blue-500/20 border border-blue-500/30">👤</span>
            <div>
              <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-white via-blue-200 to-indigo-300 bg-clip-text text-transparent">
                إدارة المستخدمين وصلاحيات الفريق
              </h2>
              <p className="text-slate-300 text-sm mt-1 font-medium">
                إضافة مستخدمين، تعيين الأدوار والصلاحيات (مدير / محاسب / مبيعات)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsAddOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مستخدم جديد</span>
        </button>
      </div>

      {/* Add / Edit User Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-800 text-lg mb-4">
              {editingUserId ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المستخدم (Username) *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingUserId}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="مثال: ahmed_sales"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="مثال: أحمد محمد عبد العال"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {editingUserId ? 'كلمة المرور الجديدة (اتركها فارغة للإبقاء على الحالية)' : 'كلمة المرور *'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الصلاحية / الدور</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="sales">🟢 مبيعات (Sales)</option>
                    <option value="accountant">🟡 محاسب (Accountant)</option>
                    <option value="admin">🔴 مدير عام (Admin)</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={e => setActive(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-700">حساب نشط</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition"
                >
                  حفظ البيانات
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">اسم المستخدم</th>
                <th className="py-3 px-4">الاسم الكامل</th>
                <th className="py-3 px-4">الدور / الصلاحية</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4">تاريخ الإنشاء</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {u.username}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {u.fullName}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${roleLabels[u.role]?.badge}`}>
                      {roleLabels[u.role]?.label || u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {u.active ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>نشط</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>معطل</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                    {u.createdAt}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {u.username !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
