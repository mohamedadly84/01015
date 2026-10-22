import { AppDatabase, User, ActivityLog, ActivityActionType, UserSession } from '../types';

const SESSION_STORAGE_KEY = 'realestate_active_session_id_v1';
const MAX_ACTIVITY_LOGS = 1000;
const MAX_SESSIONS = 500;
const ONLINE_THRESHOLD_MS = 90 * 1000; // 90 seconds threshold for heartbeat

/**
 * Detects client device and browser in a clean, human-readable Arabic format
 */
export function getClientDeviceSummary(): string {
  if (typeof window === 'undefined' || !navigator) return 'متصفح ويب';

  const ua = navigator.userAgent;
  let os = 'جهاز غير معروف';
  if (/android/i.test(ua)) os = 'هاتف أندرويد';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'آيفون / آيباد (iOS)';
  else if (/windows/i.test(ua)) os = 'كمبيوتر (Windows)';
  else if (/macintosh|mac os x/i.test(ua)) os = 'جهاز ماك (macOS)';
  else if (/linux/i.test(ua)) os = 'لينكس (Linux)';

  let browser = 'متصفح ويب';
  if (/samsungbrowser/i.test(ua)) browser = 'متصفح سامسونج';
  else if (/chrome|crios/i.test(ua) && !/edge|edg|opr/i.test(ua)) browser = 'كروم (Chrome)';
  else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) browser = 'سفاري (Safari)';
  else if (/firefox|fxios/i.test(ua)) browser = 'فايرفوكس (Firefox)';
  else if (/edg/i.test(ua)) browser = 'إيدج (Edge)';
  else if (/opr\//i.test(ua)) browser = 'أوبرا (Opera)';

  return `${browser} • ${os}`;
}

/**
 * Gets or creates the current browser session ID
 */
export function getCurrentSessionId(): string {
  if (typeof window === 'undefined') return 'session_default';
  let sId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sId) {
    sId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    sessionStorage.setItem(SESSION_STORAGE_KEY, sId);
  }
  return sId;
}

/**
 * Checks whether a session is currently online based on heartbeat timestamp and logout status
 */
export function isSessionOnline(session: UserSession): boolean {
  if (session.logoutTime) return false;
  const lastActive = new Date(session.lastActiveTime).getTime();
  if (isNaN(lastActive)) return false;
  return Date.now() - lastActive < ONLINE_THRESHOLD_MS;
}

/**
 * Formats a duration into Arabic format: e.g. "25 دقيقة" or "ساعة و 15 دقيقة"
 */
export function formatDurationArabic(minutes: number): string {
  if (isNaN(minutes) || minutes <= 0) return 'أقل من دقيقة';
  const m = Math.floor(minutes);
  if (m < 1) return 'أقل من دقيقة';
  if (m === 1) return 'دقيقة واحدة';
  if (m === 2) return 'دقيقتان';
  if (m >= 3 && m <= 10) return `${m} دقائق`;
  if (m < 60) return `${m} دقيقة`;

  const hours = Math.floor(m / 60);
  const remainingMinutes = m % 60;

  let hourStr = '';
  if (hours === 1) hourStr = 'ساعة';
  else if (hours === 2) hourStr = 'ساعتان';
  else if (hours >= 3 && hours <= 10) hourStr = `${hours} ساعات`;
  else hourStr = `${hours} ساعة`;

  if (remainingMinutes === 0) return hourStr;
  let minStr = '';
  if (remainingMinutes === 1) minStr = 'دقيقة واحدة';
  else if (remainingMinutes === 2) minStr = 'دقيقتان';
  else if (remainingMinutes >= 3 && remainingMinutes <= 10) minStr = `${remainingMinutes} دقائق`;
  else minStr = `${remainingMinutes} دقيقة`;

  return `${hourStr} و ${minStr}`;
}

/**
 * Calculates session duration from login to logout or current time
 */
export function calculateSessionDuration(session: UserSession): { text: string; minutes: number } {
  const start = new Date(session.loginTime).getTime();
  const end = session.logoutTime 
    ? new Date(session.logoutTime).getTime() 
    : new Date(session.lastActiveTime).getTime();

  if (isNaN(start) || isNaN(end) || end < start) {
    return { text: 'غير محدد', minutes: 0 };
  }

  const diffMs = end - start;
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  return {
    text: formatDurationArabic(minutes),
    minutes
  };
}

/**
 * Appends a new activity log entry to the database
 */
export function logActivity(
  db: AppDatabase,
  user: User | null,
  actionType: ActivityActionType,
  actionLabel: string,
  details: string,
  targetTitle?: string
): AppDatabase {
  if (!user) return db;

  const newLog: ActivityLog = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    username: user.username,
    fullName: user.fullName || user.username,
    role: user.role,
    actionType,
    actionLabel,
    targetTitle,
    details
  };

  const existingLogs = Array.isArray(db.activityLogs) ? db.activityLogs : [];
  const updatedLogs = [newLog, ...existingLogs].slice(0, MAX_ACTIVITY_LOGS);

  return {
    ...db,
    activityLogs: updatedLogs
  };
}

/**
 * Starts or ensures an active session for the logged in user
 */
export function startOrUpdateUserSession(
  db: AppDatabase,
  user: User,
  activePage: string = 'الرئيسية'
): { updatedDb: AppDatabase; sessionId: string } {
  const sessionId = getCurrentSessionId();
  const now = new Date().toISOString();
  const existingSessions = Array.isArray(db.sessions) ? [...db.sessions] : [];
  const sessionIndex = existingSessions.findIndex(s => s.id === sessionId);

  if (sessionIndex >= 0) {
    // Update existing session heartbeat
    existingSessions[sessionIndex] = {
      ...existingSessions[sessionIndex],
      lastActiveTime: now,
      activePage,
      isOnline: true
    };
    return {
      updatedDb: { ...db, sessions: existingSessions },
      sessionId
    };
  }

  // Create new session
  const newSession: UserSession = {
    id: sessionId,
    userId: user.id,
    username: user.username,
    fullName: user.fullName || user.username,
    role: user.role,
    loginTime: now,
    lastActiveTime: now,
    deviceInfo: getClientDeviceSummary(),
    activePage,
    isOnline: true
  };

  const updatedSessions = [newSession, ...existingSessions].slice(0, MAX_SESSIONS);

  // Also log login activity
  const updatedDbWithLog = logActivity(
    { ...db, sessions: updatedSessions },
    user,
    'login',
    'تسجيل دخول للنظام',
    `قام المستخدم ${user.fullName || user.username} بتسجيل الدخول عبر ${newSession.deviceInfo}`,
    'جلسة مستخدم جديدة'
  );

  return {
    updatedDb: updatedDbWithLog,
    sessionId
  };
}

/**
 * Updates session heartbeat (runs every 30s)
 */
export function heartbeatUserSession(
  db: AppDatabase,
  user: User,
  activePage: string
): AppDatabase {
  const sessionId = getCurrentSessionId();
  const now = new Date().toISOString();
  const existingSessions = Array.isArray(db.sessions) ? [...db.sessions] : [];
  const sessionIndex = existingSessions.findIndex(s => s.id === sessionId);

  if (sessionIndex >= 0) {
    existingSessions[sessionIndex] = {
      ...existingSessions[sessionIndex],
      lastActiveTime: now,
      activePage,
      isOnline: true
    };
    return {
      ...db,
      sessions: existingSessions
    };
  }

  // If session was purged or missing, recreate it
  return startOrUpdateUserSession(db, user, activePage).updatedDb;
}

/**
 * Ends session on logout or window unload
 */
export function endUserSession(
  db: AppDatabase,
  user: User
): AppDatabase {
  const sessionId = getCurrentSessionId();
  const now = new Date().toISOString();
  const existingSessions = Array.isArray(db.sessions) ? [...db.sessions] : [];
  const sessionIndex = existingSessions.findIndex(s => s.id === sessionId);

  if (sessionIndex >= 0) {
    existingSessions[sessionIndex] = {
      ...existingSessions[sessionIndex],
      logoutTime: now,
      lastActiveTime: now,
      isOnline: false
    };
  }

  // Clear session ID from storage
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }

  // Log logout activity
  return logActivity(
    { ...db, sessions: existingSessions },
    user,
    'logout',
    'تسجيل خروج من النظام',
    `قام المستخدم ${user.fullName || user.username} بتسجيل الخروج من النظام`,
    'إنهاء الجلسة'
  );
}

/**
 * Formats a timestamp into friendly Arabic display (e.g. "اليوم 10:30 ص" or "أمس 04:15 م" or date)
 */
export function formatArabicDateTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;

  const isToday = now.toDateString() === date.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.toDateString() === date.toDateString();

  const timeStr = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (isToday) return `اليوم، ${timeStr}`;
  if (isYesterday) return `أمس، ${timeStr}`;

  return `${date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })} - ${timeStr}`;
}
