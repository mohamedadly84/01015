import fs from 'fs';
import path from 'path';
import type { Plugin, ViteDevServer, PreviewServer } from 'vite';
import { initialData } from '../src/services/initialData';

const DB_DIR = path.resolve(process.cwd(), 'data');
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
const MAX_REQUESTS_PER_MINUTE = 100; // max API calls per minute per IP
const MAX_POST_REQUESTS_PER_MINUTE = 40; // max database sync posts per minute per IP
const MAX_PAYLOAD_BYTES = 15 * 1024 * 1024; // 15 Megabytes

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

// Cleanup stale rate limit records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now >= value.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

function registerMiddlewares(server: ViteDevServer | PreviewServer) {
  ensureDbFile();

  server.middlewares.use((req, res, next) => {
        // Global HTTP Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('X-XSS-Protection', '1; mode=block');

        if (!req.url?.startsWith('/api/data')) {
          return next();
        }

        const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
        const isPost = req.method === 'POST';

        // Check Rate Limiting to prevent DoS / high load
        const rateCheck = checkRateLimit(clientIp, isPost);
        res.setHeader('X-RateLimit-Limit', isPost ? String(MAX_POST_REQUESTS_PER_MINUTE) : String(MAX_REQUESTS_PER_MINUTE));
        res.setHeader('X-RateLimit-Remaining', String(rateCheck.remaining));

        if (!rateCheck.allowed) {
          res.statusCode = 429;
          res.setHeader('Retry-After', String(rateCheck.resetInSec));
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            error: 'تم تجاوز الحد الأقصى المسموح من الطلبات لمنع الضغط العالي على الخادم (Anti-DoS). يرجى الانتظار دقيقة واحدة.',
            retryAfterSeconds: rateCheck.resetInSec
          }));
          return;
        }

        if (req.method === 'GET') {
          try {
            ensureDbFile();
            const data = fs.readFileSync(DB_FILE, 'utf-8');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.statusCode = 200;
            res.end(data);
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        if (req.method === 'POST') {
          // Check Content-Length header to prevent oversized payloads
          const contentLength = parseInt(req.headers['content-length'] || '0', 10);
          if (contentLength > MAX_PAYLOAD_BYTES) {
            res.statusCode = 413;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'حجم البيانات يتجاوز الحد المسموح به (15 ميجابايت).' }));
            return;
          }

          let body = '';
          let totalBytes = 0;

          req.on('data', chunk => {
            totalBytes += chunk.length;
            if (totalBytes > MAX_PAYLOAD_BYTES) {
              res.statusCode = 413;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'حجم البيانات يتجاوز الحد المسموح به (15 ميجابايت).' }));
              req.destroy();
              return;
            }
            body += chunk;
          });

          req.on('end', () => {
            try {
              ensureDbFile();
              const parsed = JSON.parse(body);
              fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
}

export function apiPlugin(): Plugin {
  return {
    name: 'realestate-api-server',
    configureServer(server: ViteDevServer) {
      registerMiddlewares(server);
    },
    configurePreviewServer(server: PreviewServer) {
      registerMiddlewares(server);
    }
  };
}

