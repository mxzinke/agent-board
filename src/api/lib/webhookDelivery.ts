import { createHmac } from 'crypto';
import { db } from '../../db';
import { webhooks } from '../../db/schema';
import { eq } from 'drizzle-orm';

interface WebhookEvent {
  type: string;
  goalId?: string;
  data?: any;
}

export async function deliverWebhooks(
  boardId: string,
  event: WebhookEvent,
  userId?: string,
): Promise<void> {
  // Fire and forget — run delivery in background
  Promise.resolve().then(async () => {
    try {
      const activeWebhooks = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.boardId, boardId));

      const matching = activeWebhooks.filter((wh) => {
        if (!wh.active) return false;
        if (wh.events === '*') return true;
        const allowed = wh.events.split(',').map((e) => e.trim());
        return allowed.includes(event.type);
      });

      if (matching.length === 0) return;

      const payload = JSON.stringify({
        event: event.type,
        boardId,
        ...(event.goalId ? { goalId: event.goalId } : {}),
        ...(userId ? { userId } : {}),
        timestamp: new Date().toISOString(),
        ...(event.data ? { data: event.data } : {}),
      });

      await Promise.allSettled(
        matching.map(async (wh) => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };

          if (wh.secret) {
            const signature = createHmac('sha256', wh.secret)
              .update(payload)
              .digest('hex');
            headers['X-Webhook-Signature'] = signature;
          }

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10_000);

          try {
            await fetch(wh.url, {
              method: 'POST',
              headers,
              body: payload,
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timeout);
          }
        }),
      );
    } catch (err) {
      console.error('[webhookDelivery] Failed to deliver webhooks:', err);
    }
  });
}
