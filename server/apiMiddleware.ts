import fs from 'fs';
import path from 'path';
import type { Plugin, ViteDevServer } from 'vite';
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

export function apiPlugin(): Plugin {
  return {
    name: 'realestate-api-server',
    configureServer(server: ViteDevServer) {
      ensureDbFile();

      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/data')) {
          return next();
        }

        if (req.method === 'GET') {
          try {
            ensureDbFile();
            const data = fs.readFileSync(DB_FILE, 'utf-8');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.statusCode = 200;
            res.end(data);
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
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
  };
}
