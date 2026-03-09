import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import { serveStatic } from 'hono/bun';
import api from './api';

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

// SPA fallback — serve index.html for all non-API routes
app.get('*', serveStatic({ path: './web/dist/index.html' }));

const port = parseInt(process.env.PORT || '3000');
console.log(`🚀 agent-board running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
