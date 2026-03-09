import { createMiddleware } from 'hono/factory';
import { verifyToken, type JwtPayload } from '../lib/jwt';
import { db } from '../../db';
import { apiKeys } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { unauthorized } from '../lib/errors';

// Extend Hono context
declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload;
  }
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) throw unauthorized('Missing Authorization header');

  // API Key auth
  if (authHeader.startsWith('ApiKey ')) {
    const rawKey = authHeader.slice(7);
    const keyHash = new Bun.CryptoHasher('sha256').update(rawKey).digest('hex');

    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);
    if (!key) throw unauthorized('Invalid API key');

    // Update lastUsedAt (fire and forget)
    db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id)).execute();

    // Get user info
    const { users } = await import('../../db/schema');
    const [user] = await db.select().from(users).where(eq(users.id, key.userId)).limit(1);
    if (!user) throw unauthorized('User not found');

    c.set('user', { sub: user.id, username: user.username });
    return next();
  }

  // Bearer JWT auth
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyToken(token);
      c.set('user', payload);
      return next();
    } catch {
      throw unauthorized('Invalid token');
    }
  }

  throw unauthorized('Invalid Authorization format');
});
