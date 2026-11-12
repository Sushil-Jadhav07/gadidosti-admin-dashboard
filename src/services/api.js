const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Plain `fetch` has no timeout of its own — if the backend is slow to respond or briefly
// unreachable (a cold DB connection, a deploy in progress), a request just hangs forever with
// no error and no way out, which is exactly what "stuck on the login screen" turned out to be:
// the login button's loading spinner never clears because the underlying fetch() never resolves
// OR rejects. Wrapping every call in an AbortController-based timeout guarantees it does one or
// the other within a bounded time. Uploads get a longer budget since a document can legitimately
// take longer than a plain JSON call.
const DEFAULT_TIMEOUT_MS = 20000;
const UPLOAD_TIMEOUT_MS = 60000;
const fetchWithTimeout = async (url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out — please check your connection and try again.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

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
  const res = await fetchWithTimeout(`${BASE}${path}`, {
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
  const res = await fetchWithTimeout(url, { headers: { ...(token && { Authorization: `Bearer ${token}` }) } });
  if (!res.ok) throw new Error(`Failed to load document (${res.status})`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

// Downloads a protected file and saves it under `filename` — same auth problem as
// getFileBlobUrl (a plain <a href> can't carry the token), plus a blob: URL on its own loses
// the server's Content-Disposition filename once opened, so this drives the save itself via a
// throwaway <a download> instead of just handing back the URL.
const downloadFile = async (url, token, filename) => {
  const res = await fetchWithTimeout(url, { headers: { ...(token && { Authorization: `Bearer ${token}` }) } });
  if (!res.ok) throw new Error(`Failed to download file (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

// Multipart upload (FormData) — deliberately NOT going through request() above, which always
// JSON.stringifies the body and sets Content-Type: application/json; a multipart boundary has
// to come from the browser itself, so Content-Type is left unset here on purpose.
const postFile = async (path, formData, token) => {
  const res = await fetchWithTimeout(`${BASE}${path}`, {
    method: 'POST',
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    body: formData,
  }, UPLOAD_TIMEOUT_MS);
  return withValidationDetail(await res.json());
};

export const api = {
  post:   (path, body, token) => request('POST',   path, body, token),
  get:    (path, token)       => request('GET',    path, null, token),
  put:    (path, body, token) => request('PUT',    path, body, token),
  patch:  (path, body, token) => request('PATCH',  path, body, token),
  delete: (path, token, body) => request('DELETE', path, body, token),
  getFileBlobUrl,
  downloadFile,
  postFile,
};

export const getStoredAuth = () => {
  try { return JSON.parse(localStorage.getItem('ssk_admin_auth')); } catch { return null; }
};

export const getToken = () => getStoredAuth()?.tokens?.access_token || null;
