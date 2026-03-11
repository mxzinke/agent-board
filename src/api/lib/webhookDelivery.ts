import { createHmac } from 'crypto';
import { db } from '../../db';
import { webhooks } from '../../db/schema';
import { eq } from 'drizzle-orm';

interface WebhookEvent {
  type: string;
  goalId?: string;
  data?: Record<string, unknown>;
}

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1_000; // 1s, 2s, 4s exponential backoff
const DELIVERY_TIMEOUT_MS = 10_000;

/** Sleep for a given number of milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Attempt a single webhook delivery. Returns true on success (2xx). */
async function attemptDelivery(
  url: string,
  payload: string,
  headers: Record<string, string>,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: payload,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      return { ok: true, status: response.status };
    }

    // 4xx errors are not retryable (client error on the receiver side)
    if (response.status >= 400 && response.status < 500) {
      return { ok: false, status: response.status, error: `HTTP ${response.status}` };
    }

    // 5xx errors are retryable
    return { ok: false, status: response.status, error: `HTTP ${response.status}` };
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

/** Whether a failed delivery should be retried */
function isRetryable(result: { ok: boolean; status?: number }): boolean {
  if (result.ok) return false;
  // Don't retry 4xx (receiver's problem)
  if (result.status && result.status >= 400 && result.status < 500) return false;
  // Retry 5xx, timeouts, network errors
  return true;
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

          // Retry loop with exponential backoff
          let lastResult: { ok: boolean; status?: number; error?: string } = { ok: false };
          for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            if (attempt > 0) {
              const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
              await sleep(delay);
            }

            lastResult = await attemptDelivery(wh.url, payload, headers);

            if (lastResult.ok) {
              return; // Success
            }

            if (!isRetryable(lastResult)) {
              console.warn(
                `[webhookDelivery] Non-retryable failure for webhook ${wh.id} → ${wh.url}: ${lastResult.error}`,
              );
              return;
            }

            if (attempt < MAX_RETRIES) {
              console.warn(
                `[webhookDelivery] Retrying webhook ${wh.id} → ${wh.url} (attempt ${attempt + 1}/${MAX_RETRIES}): ${lastResult.error}`,
              );
            }
          }

          // All retries exhausted
          console.error(
            `[webhookDelivery] All ${MAX_RETRIES + 1} attempts failed for webhook ${wh.id} → ${wh.url}: ${lastResult.error}`,
          );
        }),
      );
    } catch (err) {
      console.error('[webhookDelivery] Failed to deliver webhooks:', err);
    }
  });
}
