/**
 * Security Guard Service: Brute-Force Prevention & Login Rate Limiting
 */

export interface LoginSecurityState {
  attempts: number;
  maxAttempts: number;
  lockedUntil: number | null;
  isLocked: boolean;
  remainingSeconds: number;
}

const LOGIN_SECURITY_KEY = 'realestate_login_guard_v1';
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes lockout

/**
 * Retrieves current login security status for a user/device
 */
export function getLoginSecurityState(username?: string): LoginSecurityState {
  if (typeof window === 'undefined') {
    return { attempts: 0, maxAttempts: MAX_LOGIN_ATTEMPTS, lockedUntil: null, isLocked: false, remainingSeconds: 0 };
  }

  try {
    const raw = localStorage.getItem(LOGIN_SECURITY_KEY);
    if (!raw) {
      return { attempts: 0, maxAttempts: MAX_LOGIN_ATTEMPTS, lockedUntil: null, isLocked: false, remainingSeconds: 0 };
    }
    const data = JSON.parse(raw);
    const key = (username || 'global').trim().toLowerCase();
    const entry = data[key] || data['global'];

    if (!entry) {
      return { attempts: 0, maxAttempts: MAX_LOGIN_ATTEMPTS, lockedUntil: null, isLocked: false, remainingSeconds: 0 };
    }

    const now = Date.now();
    if (entry.lockedUntil && entry.lockedUntil > now) {
      const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
      return {
        attempts: entry.attempts || MAX_LOGIN_ATTEMPTS,
        maxAttempts: MAX_LOGIN_ATTEMPTS,
        lockedUntil: entry.lockedUntil,
        isLocked: true,
        remainingSeconds
      };
    }

    // Lockout expired: reset attempts
    if (entry.lockedUntil && entry.lockedUntil <= now) {
      clearLoginSecurityState(username);
      return { attempts: 0, maxAttempts: MAX_LOGIN_ATTEMPTS, lockedUntil: null, isLocked: false, remainingSeconds: 0 };
    }

    return {
      attempts: entry.attempts || 0,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      lockedUntil: null,
      isLocked: false,
      remainingSeconds: 0
    };
  } catch {
    return { attempts: 0, maxAttempts: MAX_LOGIN_ATTEMPTS, lockedUntil: null, isLocked: false, remainingSeconds: 0 };
  }
}

/**
 * Records a failed login attempt and calculates lockout if threshold reached
 */
export function recordFailedLoginAttempt(username?: string): LoginSecurityState {
  if (typeof window === 'undefined') {
    return { attempts: 1, maxAttempts: MAX_LOGIN_ATTEMPTS, lockedUntil: null, isLocked: false, remainingSeconds: 0 };
  }

  try {
    const raw = localStorage.getItem(LOGIN_SECURITY_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const key = (username || 'global').trim().toLowerCase();
    const current = data[key] || { attempts: 0, lockedUntil: null };

    const newAttempts = (current.attempts || 0) + 1;
    let lockedUntil: number | null = null;
    let isLocked = false;
    let remainingSeconds = 0;

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      isLocked = true;
      remainingSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
    }

    const record = {
      attempts: newAttempts,
      lockedUntil,
      lastFailedAt: Date.now()
    };

    data[key] = record;
    // Also update global device tracker to prevent alternating usernames
    data['global'] = record;

    localStorage.setItem(LOGIN_SECURITY_KEY, JSON.stringify(data));

    return {
      attempts: newAttempts,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      lockedUntil,
      isLocked,
      remainingSeconds
    };
  } catch {
    return { attempts: 1, maxAttempts: MAX_LOGIN_ATTEMPTS, lockedUntil: null, isLocked: false, remainingSeconds: 0 };
  }
}

/**
 * Clears failed attempts upon successful login
 */
export function clearLoginSecurityState(username?: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOGIN_SECURITY_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    const key = (username || 'global').trim().toLowerCase();
    delete data[key];
    delete data['global'];
    localStorage.setItem(LOGIN_SECURITY_KEY, JSON.stringify(data));
  } catch {}
}

/**
 * Formats seconds into MM:SS for countdown display
 */
export function formatCountdownSeconds(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
