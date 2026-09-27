const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// A 422 validation failure's `message` is always the generic "Validation failed" — the actually
// useful, field-specific reason lives in `errors[].msg` instead. Every call site just does
// `throw new Error(res.message)`, so folding the specific reason into `message` here — the one
// place every request passes through — fixes it everywhere at once, with no changes needed at
// any individual call site.
const withValidationDetail = (data) => {
  if (data?.success === false && Array.isArray(data.errors) && data.errors.length > 0) {
    const detail = data.errors.map((e) => e?.msg).filter(Boolean).join('; ');
    if (detail) data.message = detail;
  }
  return data;
};

const request = async (method, path, body, token) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  return withValidationDetail(await res.json());
};

// Fetches a protected file (e.g. a KYC document) as a blob. Plain <a href> tags can't
// carry the Authorization header, so the file-serving endpoint would 401 without this —
// fetch it here instead and hand back an object URL the browser can open/render.
const getFileBlobUrl = async (url, token) => {
  const res = await fetch(url, { headers: { ...(token && { Authorization: `Bearer ${token}` }) } });
  if (!res.ok) throw new Error(`Failed to load document (${res.status})`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

export const api = {
  post:   (path, body, token) => request('POST',   path, body, token),
  get:    (path, token)       => request('GET',    path, null, token),
  put:    (path, body, token) => request('PUT',    path, body, token),
  patch:  (path, body, token) => request('PATCH',  path, body, token),
  delete: (path, token, body) => request('DELETE', path, body, token),
  getFileBlobUrl,
};

export const getStoredAuth = () => {
  try { return JSON.parse(localStorage.getItem('ssk_admin_auth')); } catch { return null; }
};

export const getToken = () => getStoredAuth()?.tokens?.access_token || null;
