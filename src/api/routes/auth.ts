import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { users, apiKeys, passkeys, challenges } from '../../db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../lib/password';
import { signToken } from '../lib/jwt';
import { authMiddleware } from '../middleware/auth';
import { badRequest, unauthorized } from '../lib/errors';
import { nanoid } from 'nanoid';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticatorTransportFuture,
} from '@simplewebauthn/types';

const rpName = 'agent-board';
const rpID = process.env.RP_ID || 'board.unclutter.pro';
const origin = process.env.RP_ORIGIN || 'https://board.unclutter.pro';

// DB-backed challenge store — survives pod restarts
async function storeChallenge(key: string, challenge: string) {
  await db.insert(challenges).values({ key, challenge }).onConflictDoUpdate({
    target: challenges.key,
    set: { challenge, createdAt: new Date() },
  });
}

async function getAndDeleteChallenge(key: string): Promise<string | null> {
  const [row] = await db.select().from(challenges).where(eq(challenges.key, key)).limit(1);
  if (!row) return null;
  // Check 5-min TTL
  if (Date.now() - row.createdAt.getTime() > 5 * 60 * 1000) {
    await db.delete(challenges).where(eq(challenges.key, key));
    return null;
  }
  await db.delete(challenges).where(eq(challenges.key, key));
  return row.challenge;
}

async function cleanupChallenges() {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  await db.delete(challenges).where(lt(challenges.createdAt, cutoff));
}

const auth = new Hono();

// ─── Public routes (no auth) ───

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

// Check if a username has passkeys (public, for login flow)
auth.post('/check-username',
  zValidator('json', z.object({
    username: z.string(),
  })),
  async (c) => {
    const { username } = c.req.valid('json');
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (!user) return c.json({ exists: false, hasPasskeys: false });
    const userPasskeys = await db.select({ id: passkeys.id }).from(passkeys).where(eq(passkeys.userId, user.id)).limit(1);
    return c.json({ exists: true, hasPasskeys: userPasskeys.length > 0 });
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

    // If user has passkeys, password login is disabled
    const userPasskeys = await db.select({ id: passkeys.id }).from(passkeys).where(eq(passkeys.userId, user.id)).limit(1);
    if (userPasskeys.length > 0) throw badRequest('This account uses passkey authentication. Please sign in with your passkey.');

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw unauthorized('Invalid credentials');

    const token = await signToken({ sub: user.id, username: user.username });
    return c.json({
      user: { id: user.id, username: user.username, displayName: user.displayName, isAgent: user.isAgent },
      token
    });
  }
);

// ─── Passkey login (public, no auth) ───

auth.post('/passkey/login-options',
  zValidator('json', z.object({
    username: z.string().optional(),
  }).optional()),
  async (c) => {
    cleanupChallenges();

    const body = c.req.valid('json') || {};
    let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] = [];

    if (body.username) {
      const [user] = await db.select().from(users).where(eq(users.username, body.username)).limit(1);
      if (user) {
        const userPasskeys = await db.select().from(passkeys).where(eq(passkeys.userId, user.id));
        allowCredentials = userPasskeys.map((pk) => ({
          id: pk.credentialId,
          transports: pk.transports ? (JSON.parse(pk.transports) as AuthenticatorTransportFuture[]) : undefined,
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    const storeKey = body.username || `anon_${nanoid(16)}`;
    await storeChallenge(storeKey, options.challenge);

    return c.json({ options, storeKey });
  }
);

auth.post('/passkey/login-verify',
  zValidator('json', z.object({
    storeKey: z.string(),
    credential: z.any(),
  })),
  async (c) => {
    const { storeKey, credential } = c.req.valid('json');

    const challenge = await getAndDeleteChallenge(storeKey);
    if (!challenge) throw badRequest('Challenge expired or not found');

    // Find the passkey by credential ID
    const credentialId = credential.id;
    const [pk] = await db.select().from(passkeys).where(eq(passkeys.credentialId, credentialId)).limit(1);
    if (!pk) throw unauthorized('Passkey not registered');

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: pk.credentialId,
        publicKey: Buffer.from(pk.publicKey, 'base64url'),
        counter: pk.counter,
        transports: pk.transports ? (JSON.parse(pk.transports) as AuthenticatorTransportFuture[]) : undefined,
      },
    });

    if (!verification.verified) throw unauthorized('Passkey verification failed');

    // Update counter and lastUsedAt
    await db.update(passkeys).set({
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    }).where(eq(passkeys.id, pk.id));

    // Get user and issue JWT
    const [user] = await db.select().from(users).where(eq(users.id, pk.userId)).limit(1);
    if (!user) throw unauthorized('User not found');

    const token = await signToken({ sub: user.id, username: user.username });
    return c.json({
      user: { id: user.id, username: user.username, displayName: user.displayName, isAgent: user.isAgent },
      token,
    });
  }
);

// ─── Protected routes ───

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

auth.patch('/me', authMiddleware,
  zValidator('json', z.object({
    displayName: z.string().min(1).max(128),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const { displayName } = c.req.valid('json');
    const [user] = await db.update(users)
      .set({ displayName })
      .where(eq(users.id, sub))
      .returning({ id: users.id, username: users.username, displayName: users.displayName, isAgent: users.isAgent });
    if (!user) throw unauthorized('User not found');
    return c.json(user);
  }
);

auth.post('/change-password', authMiddleware,
  zValidator('json', z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(6).max(256),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const { currentPassword, newPassword } = c.req.valid('json');

    const [user] = await db.select().from(users).where(eq(users.id, sub)).limit(1);
    if (!user) throw unauthorized('User not found');

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw badRequest('Current password is incorrect');

    const passwordHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash }).where(eq(users.id, sub));

    return c.json({ ok: true });
  }
);

// ─── Passkey registration (protected) ───

auth.post('/passkey/register-options', authMiddleware, async (c) => {
  cleanupChallenges();

  const { sub, username } = c.get('user');

  const userPasskeys = await db.select().from(passkeys).where(eq(passkeys.userId, sub));

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: username,
    attestationType: 'none',
    excludeCredentials: userPasskeys.map((pk) => ({
      id: pk.credentialId,
      transports: pk.transports ? (JSON.parse(pk.transports) as AuthenticatorTransportFuture[]) : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  await storeChallenge(`reg_${sub}`, options.challenge);

  return c.json(options);
});

auth.post('/passkey/register-verify', authMiddleware,
  zValidator('json', z.object({
    credential: z.any(),
    name: z.string().max(128).optional(),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const { credential, name } = c.req.valid('json');

    const challenge = await getAndDeleteChallenge(`reg_${sub}`);
    if (!challenge) throw badRequest('Challenge expired or not found');

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw badRequest('Passkey registration failed');
    }

    const { credential: cred, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    const [pk] = await db.insert(passkeys).values({
      userId: sub,
      credentialId: cred.id,
      publicKey: Buffer.from(cred.publicKey).toString('base64url'),
      counter: cred.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: cred.transports ? JSON.stringify(cred.transports) : null,
      name: name || null,
    }).returning();

    return c.json({ id: pk.id, name: pk.name, createdAt: pk.createdAt }, 201);
  }
);

auth.get('/passkeys', authMiddleware, async (c) => {
  const { sub } = c.get('user');
  const pks = await db.select({
    id: passkeys.id,
    credentialId: passkeys.credentialId,
    deviceType: passkeys.deviceType,
    backedUp: passkeys.backedUp,
    name: passkeys.name,
    createdAt: passkeys.createdAt,
    lastUsedAt: passkeys.lastUsedAt,
  }).from(passkeys).where(eq(passkeys.userId, sub));
  return c.json(pks);
});

auth.delete('/passkeys/:id', authMiddleware, async (c) => {
  const { sub } = c.get('user');
  const id = c.req.param('id');
  const [pk] = await db.select().from(passkeys).where(eq(passkeys.id, id)).limit(1);
  if (!pk || pk.userId !== sub) throw unauthorized('Not your passkey');
  await db.delete(passkeys).where(eq(passkeys.id, id));
  return c.json({ ok: true });
});

// ─── API Keys (protected) ───

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
