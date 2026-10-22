import { AppDatabase } from '../types';

// قاعدة بيانات جديدة ونظيفة تماماً وخالية من أي بيانات تجريبية
export const initialData: AppDatabase = {
  projects: [],
  users: [
    {
      id: 1,
      username: 'admin',
      fullName: 'المدير العام',
      role: 'admin',
      active: true,
      createdAt: '2026-01-01',
      password: 'admin'
    }
  ],
  units: [],
  customers: [],
  contracts: [],
  installments: [],
  loans: [],
  loanPayments: [],
  expenseCategories: [
    { id: 1, name: 'مواد بناء' },
    { id: 2, name: 'مقاولون' },
    { id: 3, name: 'عمالة' },
    { id: 4, name: 'إشراف هندسي' },
    { id: 5, name: 'تشطيبات' },
    { id: 6, name: 'كهرباء وسباكة' },
    { id: 7, name: 'رخصة وتراخيص' },
    { id: 8, name: 'مصاريف إدارية' },
    { id: 9, name: 'أخرى' }
  ],
  expenses: [],
  settings: {
    name: '',
    phone: '',
    taxNumber: '',
    address: '',
    currency: 'ج.م'
  },
  sessions: [],
  activityLogs: []
};


// تم إلغاء أي بيانات افتراضية أو شركات وهمية بناءً على طلب المستخدم

