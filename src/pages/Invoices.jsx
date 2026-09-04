import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Download, Eye, ChevronLeft, ChevronRight, Receipt, Plus } from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import InvoiceDocument, { invoiceNumberFor } from '../components/InvoiceDocument';
import { downloadElementAsPdf } from '../lib/pdfExport';
import { getInvoiceRegistry, hasGeneratedInvoice, markInvoiceGenerated } from '../lib/invoiceRegistry';
import { api, getToken } from '../services/api';

function money(v) {
  return `₹${Number(v || 0).toLocaleString('en-IN')}`;
}

function shortId(id) {
  return id ? `#${id.slice(0, 8)}` : '—';
}

function bookingRef(booking) {
  return booking?.bookingNumber || shortId(booking?.id);
}

const PAYMENT_STATUS_LABEL = { paid: 'Paid', pending: 'Pending', refunded: 'Refunded' };

export default function Invoices() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [invoiceBooking, setInvoiceBooking] = useState(null);
  const [autoDownload, setAutoDownload] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [invoiceRegistry, setInvoiceRegistry] = useState({});
  const invoiceRef = useRef(null);
  const itemsPerPage = 10;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/bookings?limit=200', getToken());
      if (res.success) {
        setBookings(res.data?.bookings || []);
      } else {
        setError(res.message || 'Failed to load bookings');
      }
    } catch {
      setError('Network error — could not load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);
  useEffect(() => { setInvoiceRegistry(getInvoiceRegistry()); }, []);

  const filtered = useMemo(() => bookings.filter((booking) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      String(booking.bookingNumber || '').toLowerCase().includes(q) ||
      String(booking.client || '').toLowerCase().includes(q) ||
      String(booking.broker || '').toLowerCase().includes(q) ||
      String(booking.driver?.name || '').toLowerCase().includes(q)
    );
  }), [bookings, searchTerm]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  const pickerResults = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const source = !q ? bookings : bookings.filter((b) =>
      String(b.bookingNumber || '').toLowerCase().includes(q) ||
      String(b.client || '').toLowerCase().includes(q)
    );
    return source.slice(0, 20);
  }, [bookings, pickerSearch]);

  const openInvoice = (booking, { download = false } = {}) => {
    setPickerOpen(false);
    setInvoiceBooking(booking);
    setAutoDownload(download);
  };

  const handleDownload = useCallback(async () => {
    if (!invoiceRef.current || !invoiceBooking) return;
    setDownloading(true);
    try {
      await downloadElementAsPdf(invoiceRef.current, `${invoiceNumberFor(invoiceBooking)}.pdf`);
      markInvoiceGenerated(invoiceBooking);
      setInvoiceRegistry(getInvoiceRegistry());
    } catch {
      setError('Failed to generate the invoice PDF.');
    } finally {
      setDownloading(false);
      setAutoDownload(false);
    }
  }, [invoiceBooking]);

  // Row "Download" skips the preview step — this fires once the modal (and the ref inside
  // it) has actually mounted, matching the old one-click download UX.
  useEffect(() => {
    if (invoiceBooking && autoDownload) handleDownload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceBooking, autoDownload]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-poppins font-bold text-secondary">Invoices &amp; Receipts</h1>
          <p className="text-sm text-neutral-500 mt-1">Create, preview, and download branded invoices for any booking.</p>
        </div>
        <button onClick={() => { setPickerSearch(''); setPickerOpen(true); }} className="btn-primary flex-shrink-0">
          <Plus size={16} /> Create Invoice
        </button>
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by booking ID, client, broker, driver..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="form-input pl-9"
          />
        </div>
      </div>

      {error && (
        <div className="card p-4 text-sm text-danger flex items-center gap-2">
          <span>{error}</span>
          <button onClick={fetchBookings} className="underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="card p-10 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Client</th>
                  <th>Broker / Driver</th>
                  <th>Route</th>
                  <th className="text-right">Amount</th>
                  <th>Payment / Invoice</th>
                  <th>Date</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((booking) => (
                  <tr key={booking.id}>
                    <td className="font-medium text-neutral-800 whitespace-nowrap">{bookingRef(booking)}</td>
                    <td>{booking.client || '-'}</td>
                    <td className="whitespace-nowrap">
                      <div className="text-neutral-700">{booking.broker || '—'}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">{booking.driver?.name || 'No driver assigned'}</div>
                    </td>
                    <td className="max-w-[220px] truncate" title={`${booking.pickup} → ${booking.drop}`}>{booking.pickup} → {booking.drop}</td>
                    <td className="text-right font-medium whitespace-nowrap">{money(booking.amount)}</td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Badge status={PAYMENT_STATUS_LABEL[booking.paymentStatus] || booking.paymentStatus} />
                        {hasGeneratedInvoice(booking.id) && (
                          <span title="Invoice generated" className="w-5 h-5 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center flex-shrink-0">
                            <Receipt size={11} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-IN') : '-'}</td>
                    <td className="text-center whitespace-nowrap">
                      <button
                        onClick={() => openInvoice(booking)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors mr-1.5"
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        onClick={() => openInvoice(booking, { download: true })}
                        disabled={downloading && invoiceBooking?.id === booking.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
                      >
                        <Download size={13} /> {invoiceRegistry[booking.id] ? 'Download' : 'Generate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-neutral-400">
                      <Receipt size={22} className="mx-auto mb-2 text-neutral-300" />
                      No bookings found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
              <p className="text-sm text-neutral-500">Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} entries</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"><ChevronLeft size={16} /></button>
                <button onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={pickerOpen} onClose={() => setPickerOpen(false)} title="Create Invoice" size="lg">
        <div className="space-y-3">
          <p className="text-sm text-neutral-500">Pick the booking this invoice is for — its details fill the invoice automatically.</p>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              autoFocus
              placeholder="Search by booking ID or client..."
              value={pickerSearch}
              onChange={(event) => setPickerSearch(event.target.value)}
              className="form-input pl-9"
            />
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100 border border-neutral-100 rounded-xl">
            {pickerResults.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-8">No bookings found.</p>
            ) : pickerResults.map((booking) => (
              <button
                key={booking.id}
                onClick={() => openInvoice(booking)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-secondary truncate">{bookingRef(booking)} · {booking.client || 'Unknown client'}</p>
                  <p className="text-xs text-neutral-400 truncate">{booking.pickup} → {booking.drop}</p>
                </div>
                <span className="text-sm font-medium text-neutral-700 flex-shrink-0">{money(booking.amount)}</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!invoiceBooking} onClose={() => setInvoiceBooking(null)} title="Invoice Preview" size="full">
        {invoiceBooking && (
          <div className="space-y-4">
            <div className="border border-neutral-100 rounded-2xl overflow-auto bg-neutral-50 p-6">
              <InvoiceDocument ref={invoiceRef} booking={invoiceBooking} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setInvoiceBooking(null)} className="btn-secondary">Close</button>
              <button onClick={handleDownload} disabled={downloading} className="btn-primary disabled:opacity-60">
                <Download size={15} /> {downloading ? 'Preparing PDF...' : 'Download PDF'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
