import { PostHog } from 'posthog-node';

const POSTHOG_KEY =
  process.env.POSTHOG_API_KEY ?? 'phc_acmqFHQbEp0DQj01iVI1oL8wlCDb4wxJWgw5YXTTlxQ';
const POSTHOG_HOST = process.env.POSTHOG_HOST ?? 'https://p.unclutter.pro';
const SERVICE_NAME = process.env.POSTHOG_SERVICE ?? 'agent-board';
const ENVIRONMENT = process.env.NODE_ENV ?? 'production';
const ENABLED = process.env.POSTHOG_DISABLED !== 'true';

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!ENABLED) return null;
  if (!client) {
    client = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

/**
 * Capture an exception to PostHog.
 * Safe to call from any code path — silent no-op if disabled or already crashed.
 */
export function captureException(
  error: unknown,
  context?: {
    distinctId?: string;
    handled?: boolean;
    route?: string;
    method?: string;
    metadata?: Record<string, unknown>;
  },
): void {
  try {
    const ph = getClient();
    if (!ph) return;
    const err = error instanceof Error ? error : new Error(String(error));
    ph.capture({
      distinctId: context?.distinctId ?? `service:${SERVICE_NAME}`,
      event: '$exception',
      properties: {
        $exception_message: err.message,
        $exception_type: err.name,
        $exception_stack_trace_raw: err.stack,
        $exception_list: [
          {
            type: err.name,
            value: err.message,
            mechanism: {
              handled: context?.handled ?? true,
              synthetic: false,
            },
          },
        ],
        $exception_handled: context?.handled ?? true,
        service: SERVICE_NAME,
        environment: ENVIRONMENT,
        route: context?.route,
        method: context?.method,
        ...context?.metadata,
      },
    });
  } catch (captureErr) {
    // Never let error reporting cause additional errors
    console.error('[posthog] failed to capture exception:', captureErr);
  }
}

/**
 * Install global handlers for unhandled rejections and uncaught exceptions.
 * Call once at startup, before any async work.
 */
export function installGlobalErrorHandlers(): void {
  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
    captureException(reason, { handled: false, metadata: { source: 'unhandledRejection' } });
  });
  process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
    captureException(err, { handled: false, metadata: { source: 'uncaughtException' } });
    // Flush synchronously on fatal error
    void shutdown().finally(() => process.exit(1));
  });

  const onShutdown = async (signal: string) => {
    console.log(`[posthog] received ${signal}, flushing…`);
    await shutdown();
  };
  process.once('SIGTERM', () => void onShutdown('SIGTERM'));
  process.once('SIGINT', () => void onShutdown('SIGINT'));
}

export async function shutdown(): Promise<void> {
  if (client) {
    try {
      await client.shutdown();
    } catch {
      // best effort
    }
    client = null;
  }
}
