import { requireConfig } from './config';

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const config = requireConfig();
  const url = `${config.server}/api/v1${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Use ApiKey auth if token starts with ab_, otherwise Bearer
  if (config.token!.startsWith('ab_')) {
    headers['Authorization'] = `ApiKey ${config.token}`;
  } else {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`${res.status}: ${body.error || res.statusText}`);
  }

  return res.json();
}
