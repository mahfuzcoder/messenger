const base = import.meta.env.VITE_API_URL || '';

export function apiOrigin() {
  return base;
}

export function mediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  return `${base}${url}`;
}

export async function api(path, options = {}) {
  const isForm = options.body instanceof FormData;
  const headers = { ...options.headers };
  if (!isForm && options.body != null && typeof options.body !== 'string') headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base}${path}`, {
    credentials: 'include',
    ...options,
    headers,
    body: options.body && !isForm && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
