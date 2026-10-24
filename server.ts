import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { initialData } from './src/services/initialData.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production' || (!process.env.DEV_MODE && fs.existsSync(path.resolve('dist', 'index.html')));

const DB_DIR = path.resolve('data');
const DB_FILE = path.join(DB_DIR, 'realestate_db.json');

function ensureDbFile() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

// In-memory rate limiting and Anti-DoS tracker
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const MAX_REQUESTS_PER_MINUTE = 100;
const MAX_POST_REQUESTS_PER_MINUTE = 40;

function checkRateLimit(ip: string, isPost: boolean): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  const maxLimit = isPost ? MAX_POST_REQUESTS_PER_MINUTE : MAX_REQUESTS_PER_MINUTE;
  const key = `${ip}_${isPost ? 'post' : 'get'}`;

  const current = rateLimitMap.get(key);
  if (!current || now >= current.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60000 });
    return { allowed: true, remaining: maxLimit - 1, resetInSec: 60 };
  }

  if (current.count >= maxLimit) {
    const resetInSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, resetInSec };
  }

  current.count += 1;
  const resetInSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return { allowed: true, remaining: maxLimit - current.count, resetInSec };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now >= value.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Global Security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// JSON body parser with 15MB limit
app.use(express.json({ limit: '15mb' }));

// Rate limit middleware on /api
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const isPost = req.method === 'POST';
  const rateCheck = checkRateLimit(clientIp, isPost);

  res.setHeader('X-RateLimit-Limit', isPost ? String(MAX_POST_REQUESTS_PER_MINUTE) : String(MAX_REQUESTS_PER_MINUTE));
  res.setHeader('X-RateLimit-Remaining', String(rateCheck.remaining));

  if (!rateCheck.allowed) {
    res.status(429).json({
      error: 'تم تجاوز الحد الأقصى المسموح من الطلبات لمنع الضغط العالي على الخادم (Anti-DoS). يرجى الانتظار دقيقة واحدة.',
      retryAfterSeconds: rateCheck.resetInSec,
    });
    return;
  }
  next();
});

// API Routes
app.get('/api/data', (_req: Request, res: Response) => {
  try {
    ensureDbFile();
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.send(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/data', (req: Request, res: Response) => {
  try {
    ensureDbFile();
    fs.writeFileSync(DB_FILE, JSON.stringify(req.body, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Health check endpoint for Cloud Run
app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

async function startServer() {
  ensureDbFile();

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running in ${isProduction ? 'production' : 'development'} mode on http://0.0.0.0:${PORT}`);
  });
}

startServer();
