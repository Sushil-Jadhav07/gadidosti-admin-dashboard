// Small helpers shared by every screen that lists or opens a chat thread (the /chats page,
// the floating launcher panel, and ChatWindow's own header) — kept in one place so the three
// don't drift on how a booking ref or a relative time gets formatted.

export function shortId(id) {
  return id ? `#${id.slice(0, 8)}` : '—';
}

export function threadRef(thread) {
  return thread?.bookingNumber || shortId(thread?.bookingId);
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function filterThreads(threads, term) {
  if (!term) return threads;
  const s = term.toLowerCase();
  return threads.filter((t) => [t.bookingNumber, t.clientName, t.brokerName, t.driverName, t.pickup, t.drop]
    .some((v) => String(v || '').toLowerCase().includes(s)));
}
