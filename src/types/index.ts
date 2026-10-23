export type UserRole = 'admin' | 'accountant' | 'sales';

export interface User {
  id: number;
  username: string;
  passwordHash?: string;
  password?: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export type UnitStatus = 'متاحة' | 'محجوزة' | 'مباعة';

export interface Unit {
  id: number;
  unitNumber: string;
  building: string;
  floor: number;
  area: number; // m2
  price: number; // EGP
  status: UnitStatus;
  floorPlanImage?: string; // صورة الرسم التوضيحي / كروكي معماري (Base64 أو رابط)
  floorPlanPdf?: string; // رابط أو ملف PDF توضيحي
  roomsCount?: number; // عدد الغرف
  bathroomsCount?: number; // عدد الحمامات
  balconiesCount?: number; // عدد البلكونات / التراس
  finishingType?: string; // نوع التشطيب (نصف تشطيب، سوبر لوكس، ألترا لوكس)
  orientation?: string; // الواجهة (بحري، شرقي، قبلي، غربي، ناصية)
  description?: string; // مميزات ووصف الوحدة
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  nationalId: string;
  address: string;
  notes: string;
}

export interface Contract {
  id: number;
  unitId: number;
  customerId: number;
  totalPrice: number;
  downPayment: number;
  contractDate: string;
  notes: string;
}

export type InstallmentStatus = 'مستحق' | 'مدفوع جزئيًا' | 'مدفوع';

export interface Installment {
  id: number;
  contractId: number;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: InstallmentStatus;
  notes?: string;
}

export type LenderType = 'فرد' | 'بنك';
export type LoanStatus = 'نشط' | 'مسدد';

export interface Loan {
  id: number;
  lenderName: string;
  lenderType: LenderType;
  amount: number;
  interestRate: number; // percentage
  startDate: string;
  notes: string;
  status: LoanStatus;
}

export interface LoanPayment {
  id: number;
  loanId: number;
  paymentNumber: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: InstallmentStatus;
}

export interface ExpenseCategory {
  id: number;
  name: string;
}

export interface Expense {
  id: number;
  categoryId: number;
  building: string;
  description: string;
  amount: number;
  expenseDate: string;
  vendor: string;
  notes: string;
}

export interface Project {
  id: number;
  name: string;
  location?: string;
  description?: string;
  notes?: string;
  createdAt?: string;
  masterPlanImage?: string; // صورة أو كروكي المخطط العام للمشروع / العمارات
}

export interface CompanySettings {
  name: string;
  phone: string;
  taxNumber: string;
  address: string;
  currency: string;
  masterPlanImage?: string; // صورة المخطط العام للمشروع ككل
  inactivityTimeoutMinutes?: number; // مهلة الخروج التلقائي عند عدم النشاط بالدقائق (الافتراضي 15 دقيقة)
}

export type ActivityActionType =
  | 'login'
  | 'logout'
  | 'session_terminate'
  | 'unit_add'
  | 'unit_update'
  | 'unit_delete'
  | 'customer_add'
  | 'customer_update'
  | 'customer_delete'
  | 'contract_add'
  | 'contract_update'
  | 'contract_delete'
  | 'installment_pay'
  | 'installment_update'
  | 'expense_add'
  | 'expense_delete'
  | 'project_add'
  | 'project_update'
  | 'project_delete'
  | 'loan_add'
  | 'loan_pay'
  | 'user_add'
  | 'user_update'
  | 'user_delete'
  | 'settings_update';

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO date-time string
  userId: number;
  username: string;
  fullName: string;
  role: UserRole;
  actionType: ActivityActionType;
  actionLabel: string; // تسمية واضحة للعملية بالعربية
  targetTitle?: string; // e.g. "وحدة 102 - عمارة النور"
  details: string; // تفاصيل العملية الدقيقة
}

export interface UserSession {
  id: string; // معرف الجلسة الفريد
  userId: number;
  username: string;
  fullName: string;
  role: UserRole;
  loginTime: string; // وقت بدء الجلسة
  lastActiveTime: string; // وقت آخر نبضة نشاط
  logoutTime?: string; // وقت تسجيل الخروج
  deviceInfo?: string; // نوع المتصفح والجهاز
  activePage?: string; // الصفحة أو التبويب الحالي
  isOnline?: boolean; // حالة الاتصال المباشرة
  terminatedReason?: string; // سبب إنهاء الجلسة (يدوي / عدم نشاط)
  terminatedBy?: string; // اسم من قام بالإنهاء
}

export interface AppDatabase {
  projects?: Project[];
  users: User[];
  units: Unit[];
  customers: Customer[];
  contracts: Contract[];
  installments: Installment[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  expenseCategories: ExpenseCategory[];
  expenses: Expense[];
  settings: CompanySettings;
  sessions?: UserSession[]; // سجل جلسات المستخدمين والاتصال
  activityLogs?: ActivityLog[]; // سجل العمليات والمراقبة الشامل
}
