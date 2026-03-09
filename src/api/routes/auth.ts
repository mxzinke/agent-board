import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { users, apiKeys } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../lib/password';
import { signToken } from '../lib/jwt';
import { authMiddleware } from '../middleware/auth';
import { badRequest, unauthorized } from '../lib/errors';
import { nanoid } from 'nanoid';

const auth = new Hono();

auth.post('/register',
  zValidator('json', z.object({
    username: z.string().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/),
    password: z.string().min(6).max(256),
    displayName: z.string().max(128).optional(),
    isAgent: z.boolean().optional(),
  })),
  async (c) => {
    const { username, password, displayName, isAgent } = c.req.valid('json');

    const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existing.length > 0) throw badRequest('Username already taken');

    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({
      username,
      passwordHash,
      displayName: displayName || username,
      isAgent: isAgent || false,
    }).returning({ id: users.id, username: users.username, displayName: users.displayName, isAgent: users.isAgent, createdAt: users.createdAt });

    const token = await signToken({ sub: user.id, username: user.username });
    return c.json({ user, token }, 201);
  }
);

auth.post('/login',
  zValidator('json', z.object({
    username: z.string(),
    password: z.string(),
  })),
  async (c) => {
    const { username, password } = c.req.valid('json');

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!user) throw unauthorized('Invalid credentials');

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw unauthorized('Invalid credentials');

    const token = await signToken({ sub: user.id, username: user.username });
    return c.json({
      user: { id: user.id, username: user.username, displayName: user.displayName, isAgent: user.isAgent },
      token
    });
  }
);

auth.get('/me', authMiddleware, async (c) => {
  const { sub } = c.get('user');
  const [user] = await db.select({
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    isAgent: users.isAgent,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, sub)).limit(1);
  if (!user) throw unauthorized('User not found');
  return c.json(user);
});

auth.post('/api-keys', authMiddleware,
  zValidator('json', z.object({
    label: z.string().max(128).optional(),
  }).optional()),
  async (c) => {
    const { sub } = c.get('user');
    const body = c.req.valid('json') || {};

    const rawKey = `ab_${nanoid(32)}`;
    const keyHash = new Bun.CryptoHasher('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 10);

    const [key] = await db.insert(apiKeys).values({
      userId: sub,
      keyHash,
      keyPrefix,
      label: body.label,
    }).returning({ id: apiKeys.id, keyPrefix: apiKeys.keyPrefix, label: apiKeys.label, createdAt: apiKeys.createdAt });

    return c.json({ ...key, key: rawKey }, 201);
  }
);

auth.get('/api-keys', authMiddleware, async (c) => {
  const { sub } = c.get('user');
  const keys = await db.select({
    id: apiKeys.id,
    keyPrefix: apiKeys.keyPrefix,
    label: apiKeys.label,
    createdAt: apiKeys.createdAt,
    lastUsedAt: apiKeys.lastUsedAt,
  }).from(apiKeys).where(eq(apiKeys.userId, sub));
  return c.json(keys);
});

auth.delete('/api-keys/:id', authMiddleware, async (c) => {
  const { sub } = c.get('user');
  const id = c.req.param('id');
  const [key] = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
  if (!key || key.userId !== sub) throw unauthorized('Not your API key');
  await db.delete(apiKeys).where(eq(apiKeys.id, id));
  return c.json({ ok: true });
});

export default auth;
