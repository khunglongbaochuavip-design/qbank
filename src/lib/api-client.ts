// Client-side API helper
const BASE_URL = '/api';

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = { ...options.headers as Record<string, string> };

  // Don't set Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  // Get token from cookie or localStorage fallback
  const token = typeof window !== 'undefined' ? localStorage.getItem('qbank_token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers, credentials: 'include' });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('qbank_token');
      localStorage.removeItem('qbank_user');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  return res;
}

export const api = {
  async get<T = unknown>(path: string): Promise<T> {
    const res = await apiFetch(path);
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Request failed'); }
    return res.json();
  },
  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await apiFetch(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Request failed'); }
    return res.json();
  },
  async patch<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Request failed'); }
    return res.json();
  },
  async put<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Request failed'); }
    return res.json();
  },
  async del<T = unknown>(path: string): Promise<T> {
    const res = await apiFetch(path, { method: 'DELETE' });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Request failed'); }
    return res.json();
  },
  async upload(path: string, formData: FormData): Promise<unknown> {
    const res = await apiFetch(path, { method: 'POST', body: formData });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Upload failed'); }
    return res.json();
  },
  async download(path: string, filename: string): Promise<void> {
    const res = await apiFetch(path);
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    window.URL.revokeObjectURL(url); document.body.removeChild(a);
  },
};
