import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import { serveStatic } from 'hono/bun';
import api from './api';
import { runMigrations } from './db/migrate';

// Run migrations on startup
await runMigrations();

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API routes
app.route('/api/v1', api);

// Error handling
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Serve SPA static files (production)
app.use('/assets/*', serveStatic({ root: './web/dist' }));
app.get('/favicon.ico', serveStatic({ path: './web/dist/favicon.ico' }));
app.get('/logo.svg', serveStatic({ path: './web/dist/logo.svg' }));
app.get('/apple-touch-icon.png', serveStatic({ path: './web/dist/apple-touch-icon.png' }));
app.get('/manifest.json', serveStatic({ path: './web/dist/manifest.json' }));
app.get('/sw.js', serveStatic({ path: './web/dist/sw.js' }));

// SPA fallback — serve index.html for all non-API routes
app.get('*', serveStatic({ path: './web/dist/index.html' }));

const port = parseInt(process.env.PORT || '3000');
console.log(`🚀 agent-board running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
