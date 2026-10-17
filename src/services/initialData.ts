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
  }
};

// بيانات تجريبية اختيارية في حال رغب المستخدم في استدعائها للاختبار فقط
export const sampleDemoData: AppDatabase = {
  projects: [
    { id: 1, name: 'عمارة النور', location: 'المعادي - القاهرة', description: 'عمارة سكنية راقية 4 أدوار' },
    { id: 2, name: 'برج الياسمين', location: 'الشيخ زايد - الجيزة', description: 'برج سكني متميز' }
  ],
  users: [
    {
      id: 1,
      username: 'admin',
      fullName: 'المدير العام',
      role: 'admin',
      active: true,
      createdAt: '2026-01-01',
      password: 'admin'
    },
    {
      id: 2,
      username: 'accountant',
      fullName: 'أحمد المحاسب',
      role: 'accountant',
      active: true,
      createdAt: '2026-01-05',
      password: '123'
    },
    {
      id: 3,
      username: 'sales',
      fullName: 'محمود مبيعات',
      role: 'sales',
      active: true,
      createdAt: '2026-01-10',
      password: '123'
    }
  ],
  units: [
    { id: 1, unitNumber: '101', building: 'عمارة النور', floor: 1, area: 145, price: 1850000, status: 'مباعة' },
    { id: 2, unitNumber: '102', building: 'عمارة النور', floor: 1, area: 130, price: 1650000, status: 'محجوزة' },
    { id: 3, unitNumber: '201', building: 'عمارة النور', floor: 2, area: 160, price: 2100000, status: 'متاحة' },
    { id: 4, unitNumber: '202', building: 'عمارة النور', floor: 2, area: 155, price: 1950000, status: 'متاحة' },
    { id: 5, unitNumber: '301', building: 'برج الياسمين', floor: 3, area: 180, price: 2600000, status: 'مباعة' },
    { id: 6, unitNumber: '302', building: 'برج الياسمين', floor: 3, area: 175, price: 2500000, status: 'متاحة' }
  ],
  customers: [
    { id: 1, name: 'محمد عبد الله الشريف', phone: '01012345678', nationalId: '29010151234567', address: 'القاهرة - المعادي', notes: 'عميل مميز' },
    { id: 2, name: 'سارة خالد المنشاوي', phone: '01123456789', nationalId: '29205121234568', address: 'الجيزة - الشيخ زايد', notes: 'تشطيب صالة' },
    { id: 3, name: 'م/ طارق عبد العزيز', phone: '01234567890', nationalId: '28807201234569', address: 'الإسكندرية - سموحة', notes: 'مهتم بالدور الثاني' }
  ],
  contracts: [
    { id: 1, unitId: 1, customerId: 1, totalPrice: 1850000, downPayment: 400000, contractDate: '2026-01-15', notes: 'سداد على 4 أقساط' },
    { id: 2, unitId: 5, customerId: 2, totalPrice: 2600000, downPayment: 600000, contractDate: '2026-02-01', notes: 'سداد على 4 أقساط' }
  ],
  installments: [
    { id: 1, contractId: 1, installmentNumber: 1, dueDate: '2026-04-15', amount: 362500, paidAmount: 362500, status: 'مدفوع' },
    { id: 2, contractId: 1, installmentNumber: 2, dueDate: '2026-07-15', amount: 362500, paidAmount: 362500, status: 'مدفوع' },
    { id: 3, contractId: 1, installmentNumber: 3, dueDate: '2026-10-15', amount: 362500, paidAmount: 0, status: 'مستحق' },
    { id: 4, contractId: 1, installmentNumber: 4, dueDate: '2027-01-15', amount: 362500, paidAmount: 0, status: 'مستحق' },
    { id: 5, contractId: 2, installmentNumber: 1, dueDate: '2026-05-01', amount: 500000, paidAmount: 500000, status: 'مدفوع' },
    { id: 6, contractId: 2, installmentNumber: 2, dueDate: '2026-08-01', amount: 500000, paidAmount: 200000, status: 'مدفوع جزئيًا' },
    { id: 7, contractId: 2, installmentNumber: 3, dueDate: '2026-11-01', amount: 500000, paidAmount: 0, status: 'مستحق' },
    { id: 8, contractId: 2, installmentNumber: 4, dueDate: '2027-02-01', amount: 500000, paidAmount: 0, status: 'مستحق' }
  ],
  loans: [
    { id: 1, lenderName: 'البنك الأهلي المصري', lenderType: 'بنك', amount: 1500000, interestRate: 12, startDate: '2026-01-01', notes: 'تمويل إنشاءات برج الياسمين', status: 'نشط' },
    { id: 2, lenderName: 'الحاج محمود إبراهيم', lenderType: 'فرد', amount: 500000, interestRate: 0, startDate: '2026-02-10', notes: 'شراكة تمويل مواد بناء', status: 'نشط' }
  ],
  loanPayments: [
    { id: 1, loanId: 1, paymentNumber: 1, dueDate: '2026-04-01', amount: 300000, paidAmount: 300000, status: 'مدفوع' },
    { id: 2, loanId: 1, paymentNumber: 2, dueDate: '2026-07-01', amount: 300000, paidAmount: 300000, status: 'مدفوع' },
    { id: 3, loanId: 1, paymentNumber: 3, dueDate: '2026-10-01', amount: 300000, paidAmount: 0, status: 'مستحق' },
    { id: 4, loanId: 1, paymentNumber: 4, dueDate: '2027-01-01', amount: 300000, paidAmount: 0, status: 'مستحق' },
    { id: 5, loanId: 1, paymentNumber: 5, dueDate: '2027-04-01', amount: 300000, paidAmount: 0, status: 'مستحق' },
    { id: 6, loanId: 2, paymentNumber: 1, dueDate: '2026-06-10', amount: 250000, paidAmount: 250000, status: 'مدفوع' },
    { id: 7, loanId: 2, paymentNumber: 2, dueDate: '2026-12-10', amount: 250000, paidAmount: 0, status: 'مستحق' }
  ],
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
  expenses: [
    { id: 1, categoryId: 1, building: 'عمارة النور', description: 'توريد حديد عز وأسمنت لافارج', amount: 480000, expenseDate: '2026-01-20', vendor: 'شركة الأهرام للتجارة', notes: 'فاتورة ضريبية 452' },
    { id: 2, categoryId: 2, building: 'عمارة النور', description: 'أعمال خرسانة الدور الثاني', amount: 220000, expenseDate: '2026-02-15', vendor: 'المقاول حسن شحاتة', notes: 'مستخلص رقم 2' },
    { id: 3, categoryId: 4, building: 'عمارة النور', description: 'أتعاب المكتب الاستشاري الهندسية', amount: 45000, expenseDate: '2026-01-10', vendor: 'مكتب الرؤية للاستشارات', notes: 'دفعة أولى' },
    { id: 4, categoryId: 1, building: 'برج الياسمين', description: 'توريد رمل وسن وطوب أحمر', amount: 160000, expenseDate: '2026-02-05', vendor: 'شركة الدلتا للتوريدات', notes: 'سداد نقدي' },
    { id: 5, categoryId: 6, building: 'عمارة النور', description: 'تأسيس مواسير وتمديدات سباكة وكهرباء', amount: 95000, expenseDate: '2026-03-01', vendor: 'مؤسسة الشروق للمقاولات', notes: '' },
    { id: 6, categoryId: 7, building: 'برج الياسمين', description: 'رسوم تجديد تصاريح الحفر والبناء', amount: 35000, expenseDate: '2026-01-05', vendor: 'الحي الهندسي', notes: 'إيصال رسمي' }
  ],
  settings: {
    name: 'شركة الصرح للتطوير والاستثمار العقاري',
    phone: '01099887766',
    taxNumber: '123-456-789',
    address: 'شارع التسعين الشمالي، التجمع الخامس، القاهرة الجديدة',
    currency: 'ج.م'
  }
};
