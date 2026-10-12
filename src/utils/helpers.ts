// Formatting numbers to Egyptian Pounds
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0 ج.م';
  return new Intl.NumberFormat('ar-EG', {
    maximumFractionDigits: 0,
  }).format(amount) + ' ج.م';
}

// Format numbers clean
export function formatNumber(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '0';
  return new Intl.NumberFormat('ar-EG', {
    maximumFractionDigits: 0,
  }).format(val);
}

// Convert numbers to Arabic words (Tafqeet) for official receipts
export function numberToArabicWords(num: number): string {
  if (!num || isNaN(num) || num === 0) return 'صفر جنيه مصري فقط لا غير';

  const ones = [
    '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
    'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
    'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'
  ];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(n: number): string {
    let result = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    if (h > 0) {
      result += hundreds[h];
    }
    if (remainder > 0) {
      if (result) result += ' و';
      if (remainder < 20) {
        result += ones[remainder];
      } else {
        const o = remainder % 10;
        const t = Math.floor(remainder / 10);
        if (o > 0) {
          result += ones[o] + ' و' + tens[t];
        } else {
          result += tens[t];
        }
      }
    }
    return result;
  }

  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remain = Math.floor(num % 1000);

  const parts: string[] = [];

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(convertGroup(millions) + ' ملايين');
    else parts.push(convertGroup(millions) + ' مليون');
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(convertGroup(thousands) + ' آلاف');
    else parts.push(convertGroup(thousands) + ' ألف');
  }

  if (remain > 0) {
    parts.push(convertGroup(remain));
  }

  return 'فقط ' + parts.join(' و') + ' جنيه مصري لا غير';
}

// Export array of objects to CSV with UTF-8 BOM for Arabic Excel compatibility
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const bom = '\uFEFF';
  const csvContent = [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');

  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Generate future date helper
export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

import type { AppDatabase, Unit } from '../types';

export interface BuildingMetrics {
  buildingName: string;
  units: Unit[];
  totalArea: number;
  totalExpenses: number;
  costPerM2: number;
  unitsCount: number;
  unitsAvailableCount: number;
  unitsSoldCount: number;
  unitsReservedCount: number;
  totalSalesValue: number;
  totalExpectedRevenue: number;
  totalEstimatedProfit: number;
}

export function getBuildingList(db: AppDatabase): string[] {
  const names = new Set<string>();
  if (Array.isArray(db.projects)) {
    db.projects.forEach(p => {
      if (p.name && p.name.trim()) names.add(p.name.trim());
    });
  }
  if (Array.isArray(db.units)) {
    db.units.forEach(u => {
      if (u.building && u.building.trim()) names.add(u.building.trim());
    });
  }
  if (Array.isArray(db.expenses)) {
    db.expenses.forEach(e => {
      if (e.building && e.building.trim()) names.add(e.building.trim());
    });
  }
  return Array.from(names);
}

export function calculateBuildingMetrics(db: AppDatabase, buildingName: string): BuildingMetrics {
  const trimmedName = buildingName.trim();
  const units = (db.units || []).filter(u => u.building?.trim() === trimmedName);
  const totalArea = units.reduce((sum, u) => sum + (Number(u.area) || 0), 0);
  
  const totalExpenses = (db.expenses || [])
    .filter(e => e.building?.trim() === trimmedName)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const costPerM2 = totalArea > 0 ? totalExpenses / totalArea : 0;

  const unitsSold = units.filter(u => u.status === 'مباعة');
  const unitsReserved = units.filter(u => u.status === 'محجوزة');
  const unitsAvailable = units.filter(u => u.status === 'متاحة');

  // Actual contracted sales for this building
  const contractedSales = (db.contracts || [])
    .filter(c => units.some(u => u.id === c.unitId))
    .reduce((sum, c) => sum + c.totalPrice, 0);

  // Remaining potential sales from available/reserved units list price
  const unsoldValue = units
    .filter(u => u.status !== 'مباعة')
    .reduce((sum, u) => sum + (Number(u.price) || 0), 0);

  const totalExpectedRevenue = contractedSales + unsoldValue;
  const totalEstimatedProfit = totalExpectedRevenue - totalExpenses;

  return {
    buildingName: trimmedName,
    units,
    totalArea,
    totalExpenses,
    costPerM2,
    unitsCount: units.length,
    unitsAvailableCount: unitsAvailable.length,
    unitsSoldCount: unitsSold.length,
    unitsReservedCount: unitsReserved.length,
    totalSalesValue: contractedSales,
    totalExpectedRevenue,
    totalEstimatedProfit,
  };
}
