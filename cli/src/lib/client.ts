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

/**
 * Upload a file via multipart/form-data.
 * Content-Type is NOT set manually — fetch sets it with the boundary automatically.
 */
export async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const config = requireConfig();
  const url = `${config.server}/api/v1${path}`;

  const headers: Record<string, string> = {};
  if (config.token!.startsWith('ab_')) {
    headers['Authorization'] = `ApiKey ${config.token}`;
  } else {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`${res.status}: ${body.error || res.statusText}`);
  }

  return res.json();
}

/**
 * Download a file as raw Response (for binary data).
 */
export async function downloadRaw(path: string): Promise<Response> {
  const config = requireConfig();
  const url = `${config.server}/api/v1${path}`;

  const headers: Record<string, string> = {};
  if (config.token!.startsWith('ab_')) {
    headers['Authorization'] = `ApiKey ${config.token}`;
  } else {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`${res.status}: ${body.error || res.statusText}`);
  }

  return res;
}
