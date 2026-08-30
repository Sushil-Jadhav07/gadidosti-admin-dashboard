const STORAGE_KEY = 'ssk_generated_invoices';

function readRegistry() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeRegistry(registry) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
}

export function getInvoiceRegistry() {
  return readRegistry();
}

export function getInvoiceRecord(bookingId) {
  if (!bookingId) return null;
  return readRegistry()[bookingId] || null;
}

export function hasGeneratedInvoice(bookingId) {
  return !!getInvoiceRecord(bookingId);
}

export function markInvoiceGenerated(booking) {
  if (!booking?.id) return null;
  const registry = readRegistry();
  const existing = registry[booking.id] || {};
  const next = {
    createdAt: existing.createdAt || new Date().toISOString(),
    invoiceNumber: existing.invoiceNumber || null,
    bookingNumber: booking.bookingNumber || null,
    amount: booking.amount || 0,
    client: booking.client || '',
    paymentStatus: booking.paymentStatus || 'pending',
  };
  registry[booking.id] = next;
  writeRegistry(registry);
  return next;
}
