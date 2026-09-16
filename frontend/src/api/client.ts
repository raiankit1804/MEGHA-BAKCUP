const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

function getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wgpt_token') : null;
  const headers: Record<string, string> = {
    ...extraHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function apiPost<T = any>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiDelete<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiPatch<T = any>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = { post: apiPost, get: apiGet, delete: apiDelete, patch: apiPatch };
