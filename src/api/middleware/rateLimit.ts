import { createMiddleware } from 'hono/factory';
import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { config } from '../../config';

const RATE_LIMIT = config.rateLimitPerHour;
const VIOLATION_THRESHOLD = 5;

export const rateLimitMiddleware = createMiddleware(async (c, next) => {
  const user = c.get('user');
  if (!user) return next(); // Skip for unauthenticated requests

  const userId = user.sub;

  const hourTruncated = new Date();
  hourTruncated.setMinutes(0, 0, 0);
  const hourStr = hourTruncated.toISOString();

  // Atomic upsert: increment request count or insert with 1
  const result = await db.execute<{ request_count: number }>(sql`
    INSERT INTO usage_logs (user_id, hour, request_count)
    VALUES (${userId}, ${hourStr}::timestamp, 1)
    ON CONFLICT (user_id, hour) DO UPDATE SET request_count = usage_logs.request_count + 1
    RETURNING request_count
  `);

  const count = Number(result[0]?.request_count);

  if (count > RATE_LIMIT) {
    // Check how many distinct hours this user has exceeded the limit
    const violationResult = await db.execute<{ cnt: number }>(sql`
      SELECT COUNT(*) as cnt FROM usage_logs
      WHERE user_id = ${userId} AND request_count > ${RATE_LIMIT}
    `);

    const violationCount = Number(violationResult[0]?.cnt);

    if (violationCount >= VIOLATION_THRESHOLD) {
      // Auto-suspend the user
      await db.update(users).set({
        suspended: true,
        suspendedAt: new Date(),
        suspendReason: 'Automatic: exceeded rate limit 5 times',
      }).where(eq(users.id, userId));
    }

    return c.json(
      { error: `Rate limit exceeded. Max ${RATE_LIMIT} requests per hour.` },
      429,
    );
  }

  return next();
});
