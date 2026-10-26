import { AppDatabase, UserRole } from '../types';
import { initialData } from './initialData';
import { saveToCloudDatabase } from './firebase';

const STORAGE_KEY = 'realestate_db_v2';
const CURRENT_USER_KEY = 'realestate_current_user_v2';

export function getLocalDatabase(): AppDatabase {
  try {
    // Clean up obsolete v1 demo storage if present
    if (localStorage.getItem('realestate_db_v1')) {
      localStorage.removeItem('realestate_db_v1');
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.units) && Array.isArray(parsed.customers)) {
        if (Array.isArray(parsed.users)) {
          const hasAdmin = parsed.users.some((u: any) => u.username?.toLowerCase() === 'admin');
          const hasEngineer = parsed.users.some((u: any) => u.username?.toLowerCase() === 'engineer');
          if (!hasAdmin || !hasEngineer) {
            const missing = initialData.users.filter(
              iu => !parsed.users.some((pu: any) => pu.username?.toLowerCase() === iu.username.toLowerCase())
            );
            parsed.users = [...parsed.users, ...missing];
          }
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read from local storage', err);
  }
  return initialData;
}

export function saveLocalDatabase(data: AppDatabase) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Could not save to local storage', err);
  }
}

// Server API Sync (allows entire team to share identical database state)
export async function fetchServerDatabase(): Promise<AppDatabase | null> {
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.units)) {
        saveLocalDatabase(data);
        return data;
      }
    }
  } catch {
    // If backend /api/data is unavailable or offline, seamlessly fallback
  }
  return null;
}

export async function syncServerDatabase(data: AppDatabase): Promise<boolean> {
  saveLocalDatabase(data);
  let cloudSuccess = false;
  try {
    cloudSuccess = await saveToCloudDatabase(data);
  } catch (err) {
    console.warn('Failed cloud sync:', err);
  }

  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      cloudSuccess = true;
    }
  } catch {
    // optional server sync
  }

  return cloudSuccess;
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  // Return null so the user must log in through the login screen
  return null;
}

export function setCurrentUser(user: any) {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch {
    // fallback
  }
}

export const PERMISSIONS: Record<UserRole, {
  view_dashboard: boolean;
  view_projects: boolean;
  edit_projects: boolean;
  view_units: boolean;
  edit_units: boolean;
  view_customers: boolean;
  edit_customers: boolean;
  view_sales: boolean;
  edit_sales: boolean;
  view_collection: boolean;
  edit_collection: boolean;
  view_loans: boolean;
  edit_loans: boolean;
  view_expenses: boolean;
  edit_expenses: boolean;
  view_reports: boolean;
  view_settings: boolean;
  view_users: boolean;
}> = {
  admin: {
    view_dashboard: true,
    view_projects: true, edit_projects: true,
    view_units: true, edit_units: true,
    view_customers: true, edit_customers: true,
    view_sales: true, edit_sales: true,
    view_collection: true, edit_collection: true,
    view_loans: true, edit_loans: true,
    view_expenses: true, edit_expenses: true,
    view_reports: true, view_settings: true, view_users: true,
  },
  manager: {
    view_dashboard: true,
    view_projects: true, edit_projects: true,
    view_units: true, edit_units: true,
    view_customers: true, edit_customers: true,
    view_sales: true, edit_sales: true,
    view_collection: true, edit_collection: true,
    view_loans: true, edit_loans: true,
    view_expenses: true, edit_expenses: true,
    view_reports: true, view_settings: false, view_users: true,
  },
  accountant: {
    view_dashboard: true,
    view_projects: true, edit_projects: false,
    view_units: true, edit_units: false,
    view_customers: true, edit_customers: false,
    view_sales: true, edit_sales: false,
    view_collection: true, edit_collection: true,
    view_loans: true, edit_loans: true,
    view_expenses: true, edit_expenses: true,
    view_reports: true, view_settings: false, view_users: false,
  },
  sales: {
    view_dashboard: true,
    view_projects: true, edit_projects: false,
    view_units: true, edit_units: false,
    view_customers: true, edit_customers: true,
    view_sales: true, edit_sales: true,
    view_collection: false, edit_collection: false,
    view_loans: false, edit_loans: false,
    view_expenses: false, edit_expenses: false,
    view_reports: false, view_settings: false, view_users: false,
  },
  engineer: {
    view_dashboard: false,
    view_projects: true, edit_projects: true,
    view_units: true, edit_units: true,
    view_customers: false, edit_customers: false,
    view_sales: false, edit_sales: false,
    view_collection: false, edit_collection: false,
    view_loans: false, edit_loans: false,
    view_expenses: false, edit_expenses: false,
    view_reports: false, view_settings: false, view_users: false,
  },
};
