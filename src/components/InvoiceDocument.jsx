import { forwardRef } from 'react';

function shortId(id) {
  return id ? `#${id.slice(0, 8)}` : '—';
}

export function invoiceNumberFor(booking) {
  const ref = (booking?.bookingNumber || shortId(booking?.id) || '').replace(/[^A-Za-z0-9]/g, '');
  return `INV-${ref.slice(-8).toUpperCase()}`;
}

// The branded document itself — rendered visibly in the preview modal and captured 1:1 into
// the downloaded PDF, so what the admin sees is exactly what gets saved.
const InvoiceDocument = forwardRef(function InvoiceDocument({ booking }, ref) {
  if (!booking) return null;
  const isReceipt = booking.paymentStatus === 'paid';
  const amount = Number(booking.amount || 0);
  const dateStr = new Date(booking.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div ref={ref} className="bg-white text-neutral-800 mx-auto" style={{ width: 760, padding: 48, fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-start justify-between pb-6 border-b-2 border-neutral-100">
        <div className="flex items-center gap-3">
          <img src="/gadidost-logo.png" alt="GadiDost" crossOrigin="anonymous" style={{ height: 40, objectFit: 'contain' }} />
          <div>
            <p className="text-lg font-bold text-secondary leading-tight">GadiDost</p>
            <p className="text-xs text-neutral-400">Logistics &amp; Fleet Management</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-secondary tracking-tight">{isReceipt ? 'PAYMENT RECEIPT' : 'TAX INVOICE'}</h1>
          <p className="text-sm text-neutral-500 mt-1">{invoiceNumberFor(booking)}</p>
          <p className="text-sm text-neutral-500">{dateStr}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <div>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Billed To</p>
          <p className="font-semibold text-secondary">{booking.client || '—'}</p>
          {booking.clientPhone && <p className="text-sm text-neutral-500">{booking.clientPhone}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Booking Reference</p>
          <p className="font-semibold text-secondary">{booking.bookingNumber || shortId(booking.id)}</p>
          <p className="text-sm text-neutral-500">{booking.pickup} → {booking.drop}</p>
        </div>
      </div>

      <table className="w-full mt-8 text-sm border-collapse">
        <thead>
          <tr className="border-b border-neutral-200">
            <th className="text-left py-2 font-semibold text-neutral-500">Description</th>
            <th className="text-right py-2 font-semibold text-neutral-500">Weight</th>
            <th className="text-right py-2 font-semibold text-neutral-500">Truck Type</th>
            <th className="text-right py-2 font-semibold text-neutral-500">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-neutral-100">
            <td className="py-3 pr-3">Freight charges — {booking.pickup} to {booking.drop}</td>
            <td className="py-3 text-right whitespace-nowrap">{booking.weight ? `${booking.weight} ${booking.weightUnit || ''}` : '—'}</td>
            <td className="py-3 text-right whitespace-nowrap">{booking.truckType || booking.truckCategory || '—'}</td>
            <td className="py-3 text-right font-medium whitespace-nowrap">₹{amount.toLocaleString('en-IN')}</td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-end mt-4">
        <div style={{ width: 260 }}>
          <div className="flex justify-between py-2 text-sm text-neutral-500">
            <span>Subtotal</span><span>₹{amount.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between py-3 border-t-2 border-secondary text-base font-bold text-secondary">
            <span>Total {isReceipt ? 'Paid' : 'Due'}</span><span>₹{amount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-neutral-100 flex items-center justify-between">
        <p className="text-xs text-neutral-400">Thank you for choosing GadiDost.</p>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isReceipt ? 'bg-tertiary/10 text-tertiary' : 'bg-warning/10 text-warning'}`}>
          {(isReceipt ? 'Paid' : booking.paymentStatus || 'Pending').toUpperCase()}
        </span>
      </div>
    </div>
  );
});

export default InvoiceDocument;
