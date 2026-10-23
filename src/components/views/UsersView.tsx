import React, { useState, useEffect, useMemo } from 'react';
import { AppDatabase, User, UserRole, ActivityActionType, UserSession } from '../../types';
import { setCurrentUser } from '../../services/storage';
import {
  isSessionOnline,
  calculateSessionDuration,
  calculateLiveSessionDuration,
  terminateUserSession,
  formatArabicDateTime,
  getCurrentSessionId,
  logActivity
} from '../../services/activityLogger';
import {
  Shield, Plus, Edit2, Trash2, CheckCircle, XCircle, AlertCircle,
  Users, Activity, Clock, Laptop, Search, Filter, RefreshCw,
  LogIn, LogOut, CheckCircle2, Eye, FileText, ChevronDown, Download,
  PowerOff, Timer, UserX, MonitorDot, AlertTriangle, Radio
} from 'lucide-react';

interface Props {
  db: AppDatabase;
  currentUser: User;
  onUpdateDb: (updated: AppDatabase, meta?: { actionType: ActivityActionType; actionLabel: string; details: string; targetTitle?: string }) => void;
  initialSubtab?: 'accounts' | 'online' | 'sessions' | 'audit';
}

export const UsersView: React.FC<Props> = ({
  db,
  currentUser,
  onUpdateDb,
  initialSubtab = 'accounts'
}) => {
  const [activeSubtab, setActiveSubtab] = useState<'accounts' | 'online' | 'sessions' | 'audit'>(initialSubtab);
  const [nowMs, setNowMs] = useState(Date.now());
  const [terminatingSessionId, setTerminatingSessionId] = useState<string | null>(null);

  // Live timer tick every 1 second for real-time duration updates
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Accounts Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('sales');
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState('');

  // Sessions and Audit Filter States
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionUserFilter, setSessionUserFilter] = useState('الكل');
  const [sessionStatusFilter, setSessionStatusFilter] = useState<'الكل' | 'online' | 'completed'>('الكل');

  const [auditSearch, setAuditSearch] = useState('');
  const [auditUserFilter, setAuditUserFilter] = useState('الكل');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('الكل');

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
      const updatedDb = logActivity(
        { ...db, users: updatedUsers },
        currentUser,
        'user_update',
        'تعديل بيانات مستخدم',
        `تم تعديل بيانات المستخدم ${fullName.trim()} (${username.trim()}) وتعيين الصلاحية كـ ${role}`,
        fullName.trim()
      );
      onUpdateDb(updatedDb);
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
      const updatedDb = logActivity(
        { ...db, users: [...db.users, newUser] },
        currentUser,
        'user_add',
        'إضافة مستخدم جديد',
        `تم إنشاء حساب مستخدم جديد باسم ${newUser.fullName} (${newUser.username}) بصلاحية ${newUser.role}`,
        newUser.fullName
      );
      onUpdateDb(updatedDb);
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
      const updatedUsers = db.users.filter(u => u.id !== userId);
      const updatedDb = logActivity(
        { ...db, users: updatedUsers },
        currentUser,
        'user_delete',
        'حذف مستخدم',
        `تم حذف حساب المستخدم ${user?.fullName || user?.username} (${user?.username}) من النظام`,
        user?.fullName || user?.username
      );
      onUpdateDb(updatedDb);
    }
  };

  const roleLabels: Record<UserRole, { label: string; badge: string; dotColor: string }> = {
    admin: { label: 'مدير عام', badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800', dotColor: 'bg-red-500' },
    manager: { label: 'مدير (بدون إعدادات)', badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800', dotColor: 'bg-blue-500' },
    accountant: { label: 'محاسب مالي', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800', dotColor: 'bg-amber-500' },
    sales: { label: 'مسؤول مبيعات', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800', dotColor: 'bg-emerald-500' },
  };

  const handleTerminateSession = (session: UserSession) => {
    const isMe = session.id === getCurrentSessionId() || (currentUser.username === session.username && currentUser.id === session.userId);
    const confirmMessage = isMe
      ? 'هل أنت متأكد من إنهاء جلستك الحالية؟ سيتم تسجيل خروجك من النظام فوراً.'
      : `هل أنت متأكد من إنهاء جلسة المستخدم "${session.fullName}" (@${session.username}) يدوياً؟ سيتم إنهاء اتصاله وتسجيل خروجه فوراً.`;

    if (window.confirm(confirmMessage)) {
      setTerminatingSessionId(session.id);
      const updatedDb = terminateUserSession(db, session.id, currentUser, 'إنهاء يدوي بواسطة مسؤول النظام');
      onUpdateDb(updatedDb, {
        actionType: 'session_terminate',
        actionLabel: 'إنهاء جلسة مستخدم يدوياً',
        details: `قام الأدمن ${currentUser.fullName || currentUser.username} بإنهاء جلسة ${session.fullName} (@${session.username}) يدوياً`,
        targetTitle: `@${session.username}`
      });
      setTimeout(() => setTerminatingSessionId(null), 600);
    }
  };

  const currentInactivityMinutes = db.settings?.inactivityTimeoutMinutes ?? 15;

  const handleUpdateInactivityTimeout = (minutes: number) => {
    const updatedSettings = {
      ...db.settings,
      inactivityTimeoutMinutes: minutes
    };
    const updatedDb = logActivity(
      { ...db, settings: updatedSettings },
      currentUser,
      'settings_update',
      'تعديل مهلة الخروج التلقائي',
      `تم ضبط مهلة الخروج التلقائي عند عدم النشاط إلى ${minutes > 0 ? `${minutes} دقيقة` : 'معطل (إلغاء الخروج التلقائي)'}`,
      'أمان الجلسات'
    );
    onUpdateDb(updatedDb);
  };

  // Sessions data calculation
  const allSessions = useMemo(() => {
    return Array.isArray(db.sessions) ? db.sessions : [];
  }, [db.sessions]);

  // Online sessions (Live presence: heartbeat within 90s and no logout)
  const onlineSessions = useMemo(() => {
    return allSessions.filter(s => isSessionOnline(s));
  }, [allSessions]);

  // Unique users currently online
  const onlineUsersCount = useMemo(() => {
    const uniqueUids = new Set(onlineSessions.map(s => s.userId));
    return uniqueUids.size;
  }, [onlineSessions]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return allSessions.filter(s => {
      const matchesUser = sessionUserFilter === 'الكل' || String(s.userId) === sessionUserFilter || s.username === sessionUserFilter;
      const isOnline = isSessionOnline(s);
      const matchesStatus = sessionStatusFilter === 'الكل'
        ? true
        : sessionStatusFilter === 'online'
        ? isOnline
        : !isOnline;

      const q = sessionSearch.trim().toLowerCase();
      const matchesSearch = !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        (s.deviceInfo && s.deviceInfo.toLowerCase().includes(q)) ||
        (s.activePage && s.activePage.toLowerCase().includes(q));

      return matchesUser && matchesStatus && matchesSearch;
    });
  }, [allSessions, sessionUserFilter, sessionStatusFilter, sessionSearch]);

  // Audit Logs calculation
  const allLogs = useMemo(() => {
    return Array.isArray(db.activityLogs) ? db.activityLogs : [];
  }, [db.activityLogs]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      const matchesUser = auditUserFilter === 'الكل' || String(log.userId) === auditUserFilter || log.username === auditUserFilter;
      
      let matchesCategory = true;
      if (auditCategoryFilter === 'sales') {
        matchesCategory = log.actionType.startsWith('contract') || log.actionType === 'installment_pay';
      } else if (auditCategoryFilter === 'units') {
        matchesCategory = log.actionType.startsWith('unit');
      } else if (auditCategoryFilter === 'expenses') {
        matchesCategory = log.actionType.startsWith('expense');
      } else if (auditCategoryFilter === 'auth') {
        matchesCategory = log.actionType === 'login' || log.actionType === 'logout';
      } else if (auditCategoryFilter === 'users') {
        matchesCategory = log.actionType.startsWith('user');
      }

      const q = auditSearch.trim().toLowerCase();
      const matchesSearch = !q ||
        log.details.toLowerCase().includes(q) ||
        log.actionLabel.toLowerCase().includes(q) ||
        log.fullName.toLowerCase().includes(q) ||
        log.username.toLowerCase().includes(q) ||
        (log.targetTitle && log.targetTitle.toLowerCase().includes(q));

      return matchesUser && matchesCategory && matchesSearch;
    });
  }, [allLogs, auditUserFilter, auditCategoryFilter, auditSearch]);

  const getActionBadge = (actionType: ActivityActionType) => {
    if (actionType.includes('delete') || actionType === 'contract_delete') {
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
    }
    if (actionType.includes('add') || actionType === 'contract_add') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
    }
    if (actionType.includes('pay')) {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
    }
    if (actionType === 'login' || actionType === 'logout') {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800';
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl glass-panel border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/30">🛡️</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                  مركز مراقبة المستخدمين وسجل العمليات
                </h2>
                {onlineUsersCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{onlineUsersCount} متصل الآن</span>
                  </span>
                )}
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-1 font-medium">
                متابعة المتصلين حالياً، تاريخ الجلسات وأوقات الاتصال، وسجل تدقيق شامل بكافة ما قام به الفريق
              </p>
            </div>
          </div>
        </div>

        {activeSubtab === 'accounts' && (
          <button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-md shadow-indigo-600/30 cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مستخدم جديد</span>
          </button>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveSubtab('accounts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition border cursor-pointer shrink-0 ${
            activeSubtab === 'accounts'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
              : 'glass-panel text-slate-700 dark:text-slate-300 hover:border-indigo-400'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>حسابات المستخدمين والصلاحيات</span>
          <span className="px-1.5 py-0.5 rounded-md bg-black/10 text-[11px] font-mono">
            {db.users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubtab('online')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition border cursor-pointer shrink-0 ${
            activeSubtab === 'online'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
              : 'glass-panel text-slate-700 dark:text-slate-300 hover:border-emerald-400'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>المتصلون الآن</span>
          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-mono font-black">
            {onlineSessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubtab('sessions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition border cursor-pointer shrink-0 ${
            activeSubtab === 'sessions'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
              : 'glass-panel text-slate-700 dark:text-slate-300 hover:border-amber-400'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>سجل الجلسات ووقت الاتصال</span>
          <span className="px-1.5 py-0.5 rounded-md bg-black/10 text-[11px] font-mono">
            {allSessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubtab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition border cursor-pointer shrink-0 ${
            activeSubtab === 'audit'
              ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
              : 'glass-panel text-slate-700 dark:text-slate-300 hover:border-purple-400'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>سجل العمليات والمراقبة (Audit Log)</span>
          <span className="px-1.5 py-0.5 rounded-md bg-black/10 text-[11px] font-mono">
            {allLogs.length}
          </span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 1. SUBTAB: ACCOUNTS MANAGEMENT                               */}
      {/* ============================================================ */}
      {activeSubtab === 'accounts' && (
        <div className="glass-panel rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
              قائمة مستخدمي النظام ({db.users.length})
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              يمكنك تعيين الصلاحيات أو تفعيل/تعطيل الحسابات فوراً
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-100/70 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 border-b border-slate-200/80 dark:border-white/10 font-black">
                <tr>
                  <th className="py-4 px-5 font-black">اسم المستخدم</th>
                  <th className="py-4 px-5 font-bold">الاسم الكامل</th>
                  <th className="py-4 px-5 font-bold">الدور / الصلاحية</th>
                  <th className="py-4 px-5 font-bold">الحالة</th>
                  <th className="py-4 px-5 font-bold">حالة الاتصال الآن</th>
                  <th className="py-4 px-5 font-bold">تاريخ الإنشاء</th>
                  <th className="py-4 px-5 text-center font-bold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-white/5">
                {db.users.map(u => {
                  const isUserOnline = onlineSessions.some(s => s.userId === u.id);
                  return (
                    <tr key={u.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors duration-150">
                      <td className="py-4 px-5 font-mono font-black text-slate-900 dark:text-white">
                        {u.username}
                      </td>
                      <td className="py-4 px-5 font-bold text-slate-800 dark:text-slate-100">
                        {u.fullName}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`inline-block px-3 py-1 rounded-xl text-xs font-bold border ${roleLabels[u.role]?.badge}`}>
                          {roleLabels[u.role]?.label || u.role}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        {u.active ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-xl">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>نشط</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs font-bold bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-xl">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>معطل</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        {isUserOnline ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>متصل الآن</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">
                            غير متصل
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {u.createdAt}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition cursor-pointer"
                            title="تعديل المستخدم"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {u.username !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition cursor-pointer"
                              title="حذف المستخدم"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. SUBTAB: ACTIVE SESSIONS DATA TABLE (الجلسات النشطة لحظياً)   */}
      {/* ============================================================ */}
      {activeSubtab === 'online' && (
        <div className="space-y-6">
          {/* Top Presence & Inactivity Controls & Security Defense */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl glass-panel border border-emerald-500/30 shadow-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  الجلسات النشطة المتصلة الآن
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {onlineSessions.length}
                  </span>
                  <span className="text-xs text-slate-500">جلسة مباشرة</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <div className="p-5 rounded-3xl glass-panel border border-indigo-500/30 shadow-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  المستخدمون المتصلون فريدون
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {onlineUsersCount}
                  </span>
                  <span className="text-xs text-slate-500">مستخدم نشط</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-3xl glass-panel border border-amber-500/30 shadow-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  الخروج التلقائي لعدم النشاط
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                    {currentInactivityMinutes > 0 ? `${currentInactivityMinutes} د` : 'معطل'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  حماية الحسابات عند الخمول
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Timer className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-3xl glass-panel border border-rose-500/30 shadow-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  درع حماية الدخول والضغط
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                    أقصى 5 محاولات
                  </span>
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                  ✓ Anti-Brute-Force & RateLimit
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Shield className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Inactivity Timeout Config Card */}
          <div className="p-5 sm:p-6 rounded-3xl glass-panel border border-slate-200/80 dark:border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-amber-500" />
                <h4 className="font-black text-slate-900 dark:text-white text-base">
                  إعداد مهلة قفل البرنامج والخروج التلقائي (Inactivity Auto-Logout)
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                يقوم البرنامج بإنهاء الجلسة وتسجيل الخروج تلقائياً عند عدم لمس الماوس أو لوحة المفاتيح للمدة المحددة، لحماية الحسابات في حال نسيان الشاشة مفتوحة.
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: '5 دقائق', value: 5 },
                { label: '10 دقائق', value: 10 },
                { label: '15 دقيقة (موصى به)', value: 15 },
                { label: '30 دقيقة', value: 30 },
                { label: '60 دقيقة', value: 60 },
                { label: 'تعطيل', value: 0 },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleUpdateInactivityTimeout(opt.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    currentInactivityMinutes === opt.value
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dedicated Active Sessions Data Table */}
          <div className="glass-panel rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <span>جدول بيانات الجلسات النشطة حالياً</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {onlineSessions.length} جلسة
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    مدة الجلسات تُحدث لحظياً كل ثانية في الوقت الفعلي مع إمكانية إنهاء أي جلسة يدوياً فوراً
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                  ● تحديث لحظي مباشر
                </span>
              </div>
            </div>

            {onlineSessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-100/70 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 border-b border-slate-200/80 dark:border-white/10 font-black">
                    <tr>
                      <th className="py-4 px-5 font-black">اسم المستخدم</th>
                      <th className="py-4 px-5 font-bold">الدور / الصلاحية</th>
                      <th className="py-4 px-5 font-bold">وقت تسجيل الدخول</th>
                      <th className="py-4 px-5 font-bold">مدة الجلسة (محدثة لحظياً)</th>
                      <th className="py-4 px-5 font-bold">الصفحة الحالية</th>
                      <th className="py-4 px-5 font-bold">الجهاز والمتصفح</th>
                      <th className="py-4 px-5 text-center font-bold">إجراء إنهاء الجلسة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/40 dark:divide-white/5">
                    {onlineSessions.map(session => {
                      const liveDuration = calculateLiveSessionDuration(session, nowMs);
                      const roleInfo = roleLabels[session.role] || roleLabels.sales;
                      const isMySession = session.id === getCurrentSessionId() || (currentUser.username === session.username && currentUser.id === session.userId);
                      const isTerminating = terminatingSessionId === session.id;

                      return (
                        <tr
                          key={session.id}
                          className={`hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors duration-150 ${
                            isMySession ? 'bg-indigo-500/5' : ''
                          }`}
                        >
                          {/* User Column */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-sm font-black text-emerald-600 dark:text-emerald-400 relative shrink-0">
                                {session.fullName.charAt(0) || session.username.charAt(0)}
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 absolute -bottom-0.5 -right-0.5 animate-pulse"></span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-slate-900 dark:text-white">
                                    {session.fullName}
                                  </span>
                                  {isMySession && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                                      جلستك الحالية
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block">
                                  @{session.username}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Role Column */}
                          <td className="py-4 px-5">
                            <span className={`inline-block px-2.5 py-1 rounded-xl text-xs font-bold border ${roleInfo.badge}`}>
                              {roleInfo.label}
                            </span>
                          </td>

                          {/* Login Time Column */}
                          <td className="py-4 px-5 font-mono text-xs text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-1.5">
                              <LogIn className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>{formatArabicDateTime(session.loginTime)}</span>
                            </div>
                          </td>

                          {/* Real-time Live Duration Column */}
                          <td className="py-4 px-5">
                            <div className="space-y-0.5">
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300 tracking-wider">
                                  {liveDuration.digital}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                                {liveDuration.text}
                              </span>
                            </div>
                          </td>

                          {/* Current Active Page Column */}
                          <td className="py-4 px-5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                              <MonitorDot className="w-3.5 h-3.5" />
                              <span>{session.activePage || 'الرئيسية'}</span>
                            </span>
                          </td>

                          {/* Device / Browser Column */}
                          <td className="py-4 px-5 text-xs text-slate-600 dark:text-slate-400 max-w-[180px] truncate" title={session.deviceInfo}>
                            {session.deviceInfo || 'متصفح ويب'}
                          </td>

                          {/* Terminate Session Button */}
                          <td className="py-4 px-5 text-center">
                            <button
                              type="button"
                              onClick={() => handleTerminateSession(session)}
                              disabled={isTerminating}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600 dark:bg-red-950/40 dark:hover:bg-red-600 dark:text-red-400 dark:hover:text-white dark:border-red-800 shadow-sm disabled:opacity-50"
                              title="إنهاء هذه الجلسة فوراً وتسجيل خروج المستخدم"
                            >
                              <PowerOff className="w-3.5 h-3.5" />
                              <span>{isTerminating ? 'جارٍ الإنهاء...' : 'إنهاء الجلسة يدوياً'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center space-y-3">
                <span className="text-4xl block">💤</span>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  لا توجد جلسات أخرى متصلة حالياً
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  تظهر في هذا الجدول كافة الجلسات النشطة لحظياً مع مدتها المستمرة بالثواني، ويمكنك إنهاء أي جلسة بنقرة زر.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. SUBTAB: SESSIONS HISTORY & DURATION                       */}
      {/* ============================================================ */}
      {activeSubtab === 'sessions' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-5 rounded-3xl glass-panel border border-slate-200/80 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={sessionSearch}
                  onChange={e => setSessionSearch(e.target.value)}
                  placeholder="بحث باسم المستخدم أو الجهاز..."
                  className="w-full pr-10 pl-3 py-2.5 rounded-2xl border text-xs sm:text-sm font-medium transition focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* User filter */}
              <div className="relative">
                <select
                  value={sessionUserFilter}
                  onChange={e => setSessionUserFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-2xl border text-xs font-bold appearance-none transition focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="الكل">كل المستخدمين</option>
                  {db.users.map(u => (
                    <option key={u.id} value={String(u.id)}>
                      {u.fullName} ({u.username})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
              </div>

              {/* Status filter */}
              <div className="relative">
                <select
                  value={sessionStatusFilter}
                  onChange={e => setSessionStatusFilter(e.target.value as any)}
                  className="px-4 py-2.5 rounded-2xl border text-xs font-bold appearance-none transition focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="الكل">جميع الجلسات</option>
                  <option value="online">🟢 نشطة حالياً</option>
                  <option value="completed">✓ جلسات منتهية</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              تم العثور على ({filteredSessions.length}) جلسة
            </span>
          </div>

          {/* Sessions Table */}
          <div className="glass-panel rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-100/70 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 border-b border-slate-200/80 dark:border-white/10 font-black">
                  <tr>
                    <th className="py-4 px-5 font-black">المستخدم</th>
                    <th className="py-4 px-5 font-bold">الدور</th>
                    <th className="py-4 px-5 font-bold">بدء الجلسة</th>
                    <th className="py-4 px-5 font-bold">انتهاء الجلسة / آخر نشاط</th>
                    <th className="py-4 px-5 font-bold">وقت الجلسة (المدة)</th>
                    <th className="py-4 px-5 font-bold">الجهاز والمتصفح</th>
                    <th className="py-4 px-5 font-bold">الحالة</th>
                    <th className="py-4 px-5 text-center font-bold">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/40 dark:divide-white/5">
                  {filteredSessions.map(session => {
                    const isOnline = isSessionOnline(session);
                    const liveDuration = isOnline ? calculateLiveSessionDuration(session, nowMs) : null;
                    const duration = calculateSessionDuration(session);
                    const roleInfo = roleLabels[session.role] || roleLabels.sales;
                    const isTerminating = terminatingSessionId === session.id;

                    return (
                      <tr key={session.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors duration-150">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {session.fullName}
                            </span>
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              @{session.username}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold border ${roleInfo.badge}`}>
                            {roleInfo.label}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {formatArabicDateTime(session.loginTime)}
                        </td>
                        <td className="py-4 px-5 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {session.logoutTime
                            ? formatArabicDateTime(session.logoutTime)
                            : isOnline
                            ? <span className="text-emerald-600 dark:text-emerald-400 font-bold">نشط حالياً</span>
                            : formatArabicDateTime(session.lastActiveTime)}
                          {session.terminatedReason && (
                            <span className="block text-[11px] text-amber-600 dark:text-amber-400 font-sans mt-0.5">
                              ({session.terminatedReason})
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5">
                          {isOnline && liveDuration ? (
                            <span className="font-black text-xs px-2.5 py-1 rounded-xl border bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 flex items-center gap-1.5 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                              <span className="font-mono">{liveDuration.digital}</span>
                            </span>
                          ) : (
                            <span className="font-bold text-xs px-2.5 py-1 rounded-xl border bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                              ⏱️ {duration.text}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-xs text-slate-600 dark:text-slate-400 truncate max-w-[200px]" title={session.deviceInfo}>
                          {session.deviceInfo || 'متصفح ويب'}
                        </td>
                        <td className="py-4 px-5">
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-xl">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>متصل الآن</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl">
                              <span>انتهت الجلسة</span>
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-center">
                          {isOnline ? (
                            <button
                              type="button"
                              onClick={() => handleTerminateSession(session)}
                              disabled={isTerminating}
                              className="px-2.5 py-1 text-xs font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 dark:bg-red-950/40 dark:hover:bg-red-600 dark:text-red-400 dark:hover:text-white dark:border-red-800 rounded-lg transition cursor-pointer"
                              title="إنهاء الجلسة يدوياً"
                            >
                              إنهاء الجلسة
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredSessions.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs font-medium">
                  لم يتم العثور على أي جلسات تطابق خيارات الفلترة المحددة.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. SUBTAB: AUDIT LOG ("اعرف هو عمل ايه")                      */}
      {/* ============================================================ */}
      {activeSubtab === 'audit' && (
        <div className="space-y-4">
          {/* Audit Filters Bar */}
          <div className="p-5 rounded-3xl glass-panel border border-slate-200/80 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  placeholder="ابحث في تفاصيل العمليات، رقم الوحدة، العميل..."
                  className="w-full pr-10 pl-3 py-2.5 rounded-2xl border text-xs sm:text-sm font-medium transition focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* User filter */}
              <div className="relative">
                <select
                  value={auditUserFilter}
                  onChange={e => setAuditUserFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-2xl border text-xs font-bold appearance-none transition focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="الكل">كل المستخدمين</option>
                  {db.users.map(u => (
                    <option key={u.id} value={String(u.id)}>
                      {u.fullName} ({u.username})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
              </div>

              {/* Action Category filter */}
              <div className="relative">
                <select
                  value={auditCategoryFilter}
                  onChange={e => setAuditCategoryFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-2xl border text-xs font-bold appearance-none transition focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="الكل">كافة أنواع العمليات</option>
                  <option value="sales">💰 المبيعات والتحصيلات</option>
                  <option value="units">🏢 الوحدات والمشاريع</option>
                  <option value="expenses">🧾 المصروفات المالية</option>
                  <option value="auth">🔑 تسجيل الدخول والخروج</option>
                  <option value="users">👤 إدارة المستخدمين</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              إجمالي السجلات: ({filteredLogs.length})
            </span>
          </div>

          {/* Audit Logs Table / Timeline */}
          <div className="glass-panel rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-100/70 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 border-b border-slate-200/80 dark:border-white/10 font-black">
                  <tr>
                    <th className="py-4 px-5 font-black">الوقت والتاريخ</th>
                    <th className="py-4 px-5 font-bold">المستخدم المنفذ</th>
                    <th className="py-4 px-5 font-bold">الصلاحية</th>
                    <th className="py-4 px-5 font-bold">نوع العملية</th>
                    <th className="py-4 px-5 font-bold">تفاصيل ما قام به المستخدم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/40 dark:divide-white/5">
                  {filteredLogs.map(log => {
                    const roleInfo = roleLabels[log.role] || roleLabels.sales;
                    const actionBadge = getActionBadge(log.actionType);

                    return (
                      <tr key={log.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors duration-150">
                        <td className="py-4 px-5 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatArabicDateTime(log.timestamp)}
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 dark:text-white">
                              {log.fullName}
                            </span>
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              @{log.username}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold border ${roleInfo.badge}`}>
                            {roleInfo.label}
                          </span>
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${actionBadge}`}>
                            <span>{log.actionLabel}</span>
                          </span>
                        </td>
                        <td className="py-4 px-5 text-xs text-slate-800 dark:text-slate-200 font-medium">
                          {log.details}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredLogs.length === 0 && (
                <div className="p-12 text-center space-y-2">
                  <span className="text-3xl block">📋</span>
                  <p className="text-slate-700 dark:text-slate-300 font-bold text-sm">
                    لا توجد سجلات عمليات مطابقة حتى الآن
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    يتم تسجيل وتوثيق كافة العمليات تلقائياً وبشكل حي وفوري فور قيام أي مستخدم بإضافة أو تعديل أي بيانات.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                    <option value="sales">🟢 مسؤول مبيعات (Sales)</option>
                    <option value="accountant">🟡 محاسب مالي (Accountant)</option>
                    <option value="manager">🔵 مدير (اطلاع كامل على البرنامج بدون الإعدادات)</option>
                    <option value="admin">🔴 مدير عام (Admin - كامل الصلاحيات)</option>
                  </select>
                  {role === 'manager' && (
                    <p className="text-[11px] text-blue-600 mt-1 font-semibold leading-relaxed">
                      * يتيح الاطلاع والعمل على جميع أقسام البرنامج مع حجب صفحة الإعدادات تماماً.
                    </p>
                  )}
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
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition cursor-pointer"
                >
                  حفظ البيانات
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
