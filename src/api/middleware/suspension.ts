import { createMiddleware } from 'hono/factory';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const suspensionMiddleware = createMiddleware(async (c, next) => {
  const user = c.get('user');
  if (!user) return next(); // Skip for unauthenticated requests

  // If suspended info was already loaded by auth middleware (API key path), use it
  if (user.suspended !== undefined) {
    if (user.suspended) {
      return c.json(
        { error: 'Account suspended', reason: user.suspendReason },
        403,
      );
    }
    return next();
  }

  // JWT path: need to check DB
  const [dbUser] = await db.select({
    suspended: users.suspended,
    suspendReason: users.suspendReason,
  }).from(users).where(eq(users.id, user.sub)).limit(1);

  if (dbUser?.suspended) {
    return c.json(
      { error: 'Account suspended', reason: dbUser.suspendReason },
      403,
    );
  }

  return next();
});
