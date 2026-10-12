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
}

export interface CompanySettings {
  name: string;
  phone: string;
  taxNumber: string;
  address: string;
  currency: string;
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
}
