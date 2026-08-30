import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Eye, Pencil, ChevronLeft, ChevronRight, Truck,
  Building2, Trash2, AlertTriangle, Undo2, MoreVertical, Filter, Download, TrendingUp, TrendingDown,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import InvoiceDocument, { invoiceNumberFor } from '../components/InvoiceDocument';
import { downloadElementAsPdf } from '../lib/pdfExport';
import { getInvoiceRegistry, hasGeneratedInvoice, markInvoiceGenerated } from '../lib/invoiceRegistry';
import { api, getToken } from '../services/api';

export const STATUS_MAP = {
  pending: 'Requested',
  confirmed: 'Accepted',
  assigned: 'Assigned',
  en_route_pickup: 'En Route Pickup',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_TO_QUERY = {
  Requested: 'pending',
  Accepted: 'confirmed',
  Assigned: 'assigned',
  'En Route Pickup': 'en_route_pickup',
  'Picked Up': 'picked_up',
  'In Transit': 'in_transit',
  Delivered: 'delivered',
  Completed: 'completed',
  Cancelled: 'cancelled',
};

const statusTabs = ['All', 'Requested', 'Accepted', 'Assigned', 'En Route Pickup', 'Picked Up', 'In Transit', 'Delivered', 'Completed', 'Cancelled'];

const TRUCK_TYPE_OPTIONS = ['All Types', 'Small', 'Medium', 'Large'];

export const CATEGORY_COLOR = { small: '#166534', medium: '#17D86B', large: '#F59E0B' };

// Real booking statuses grouped into the 4 buckets the Order Overview card summarizes —
// "cancelled" is deliberately excluded, same as it's excluded from the reference's overview.
const ORDER_BUCKETS = [
  { key: 'active', label: 'Active Order', color: '#0D9488', statuses: ['confirmed', 'assigned', 'en_route_pickup', 'picked_up'] },
  { key: 'pending', label: 'Pending Order', color: '#F59E0B', statuses: ['pending'] },
  { key: 'onDelivery', label: 'On Delivery', color: '#17D86B', statuses: ['in_transit'] },
  { key: 'delivered', label: 'Delivered', color: '#166534', statuses: ['delivered', 'completed'] },
];

const GAUGE_COLORS = ['#166534', '#0D9488', '#F59E0B', '#64748B'];

export function money(v) {
  return `₹${Number(v || 0).toLocaleString('en-IN')}`;
}

function shortINR(v) {
  const n = Number(v || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

// Splits bookings into the selected trailing window ("current") and the equal-length window
// immediately before it ("previous"), purely from createdAt — real dates, no invented data.
function splitByPeriod(bookings, period) {
  if (period === 'all') return { current: bookings, previous: [] };
  const now = new Date();
  const start = new Date(now);
  if (period === 'week') start.setDate(start.getDate() - 7);
  else start.setMonth(start.getMonth() - 1);
  const spanMs = now.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - spanMs);
  const current = bookings.filter((b) => b.createdAt && new Date(b.createdAt) >= start);
  const previous = bookings.filter((b) => b.createdAt && new Date(b.createdAt) >= prevStart && new Date(b.createdAt) < start);
  return { current, previous };
}

function pctChange(curr, prev) {
  if (!prev) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

export function shortId(id) {
  return id ? `#${id.slice(0, 8)}` : '—';
}

// Bookings get a real human-readable reference from the backend (e.g. "BKG-202607-017") —
// prefer that over the raw UUID, matching what every other GadiDost frontend already shows.
export function bookingRef(booking) {
  return booking?.bookingNumber || shortId(booking?.id);
}

function CategoryIcon({ category }) {
  const color = CATEGORY_COLOR[(category || '').toLowerCase()] || '#64748B';
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}1A` }}>
      <Truck size={13} style={{ color }} />
    </div>
  );
}

function RowMenu({ onView, onEdit, onDelete, invoiceCreated, onInvoiceAction }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 w-44 bg-white border border-neutral-100 rounded-xl shadow-dropdown z-20 overflow-hidden py-1">
          <button onClick={() => { setOpen(false); onView(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
            <Eye size={14} /> View details
          </button>
          <button onClick={() => { setOpen(false); onEdit(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
            <Pencil size={14} /> Edit
          </button>
          <button onClick={() => { setOpen(false); onInvoiceAction(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
            <Download size={14} /> {invoiceCreated ? 'Download invoice' : 'Generate invoice'}
          </button>
          <button onClick={() => { setOpen(false); onDelete(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/5 transition-colors">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// A broker/driver "deleting" a booking only hides it from their own list — the row still
// exists (deletedAt/deletedBy set) until an admin hard-deletes it via DELETE /api/bookings/:id.
// This tells admins apart from a booking nobody has touched.
export function DeletedBadge({ deletedAt, className = '' }) {
  if (!deletedAt) return null;
  const date = new Date(deletedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
      <Undo2 size={11} /> Removed by broker/driver on {date} — still recoverable, hard-delete to remove permanently
    </span>
  );
}

const CASCADE_ITEMS = [
  'The booking timeline',
  'Job requests',
  'Driver requests',
  'The trip record',
  'Chat thread and messages',
  'Any payment, dispute, and settlement rows tied to it',
];

// Two-step confirm, per spec: a warning screen first, then a step that only
// unlocks the delete button once the admin types the exact booking number.
// This is a real, irreversible, cascading delete — the friction is intentional.
export function DeleteBookingModal({ booking, onClose, onConfirm, deleting }) {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (booking) { setStep(1); setConfirmText(''); }
  }, [booking]);

  if (!booking) return null;
  const ref = bookingRef(booking);
  const matches = confirmText.trim() === ref;

  return (
    <Modal isOpen={!!booking} onClose={onClose} title="Delete Booking Permanently" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 bg-danger/5 border border-danger/20 rounded-xl p-3">
          <AlertTriangle size={18} className="text-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger font-medium">
            This is a real, irreversible delete. There is no undo.
          </p>
        </div>

        {step === 1 ? (
          <>
            <p className="text-sm text-neutral-600">
              Deleting <span className="font-semibold text-neutral-800">{ref}</span> will permanently remove:
            </p>
            <ul className="text-sm text-neutral-600 list-disc pl-5 space-y-1">
              {CASCADE_ITEMS.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button onClick={() => setStep(2)} className="btn-danger">Are you sure?</button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-600">
              Type the booking number <span className="font-mono font-semibold text-neutral-800">{ref}</span> to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={ref}
              autoFocus
              className="form-input font-mono"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
              <button
                onClick={() => onConfirm(booking)}
                disabled={!matches || deleting}
                className="btn-danger disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default function Bookings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [statusTab, setStatusTab] = useState('All');
  const [truckTypeFilter, setTruckTypeFilter] = useState('All Types');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [orderPeriod, setOrderPeriod] = useState('week');
  const [revenuePeriod, setRevenuePeriod] = useState('month');
  const [invoiceBooking, setInvoiceBooking] = useState(null);
  const [invoiceRegistry, setInvoiceRegistry] = useState({});
  const [invoiceAutoDownload, setInvoiceAutoDownload] = useState(false);
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);
  const invoiceRef = useRef(null);
  const filtersRef = useRef(null);
  const itemsPerPage = 10;

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleRequestDelete = (booking) => {
    setDeleteTarget(booking);
  };

  const handleConfirmDelete = async (booking) => {
    setDeleting(true);
    try {
      const res = await api.delete(`/api/bookings/${booking.id}`, getToken());
      if (res.success) {
        setBookings((prev) => prev.filter((b) => b.id !== booking.id));
        setDeleteTarget(null);
        showToast(`${bookingRef(booking)} permanently deleted`);
      } else {
        showToast(res.message || 'Failed to delete booking', 'error');
      }
    } catch {
      showToast('Network error — could not delete booking', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Fetches the full page of bookings once — status/truck-type/search are all applied
  // client-side below so the Order Overview card always reflects every status, not just
  // whichever tab happens to be selected in the table.
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const res = await api.get('/api/bookings?limit=200&sort=desc', token);
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
  useEffect(() => { setCurrentPage(1); }, [statusTab, truckTypeFilter, searchTerm]);
  useEffect(() => { setInvoiceRegistry(getInvoiceRegistry()); }, []);

  useEffect(() => {
    const handler = (e) => { if (filtersRef.current && !filtersRef.current.contains(e.target)) setFiltersOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Deep link from a push notification tap (?bookingId=...) — see
  // firebase-messaging-sw.js's notificationclick handler and App.jsx's
  // foreground-toast click, both of which navigate here the same way.
  useEffect(() => {
    const bookingId = searchParams.get('bookingId');
    if (!bookingId || bookings.length === 0) return;
    const match = bookings.find((b) => b.id === bookingId);
    setSearchParams((params) => { params.delete('bookingId'); return params; }, { replace: true });
    if (match) navigate(`/bookings/${match.id}`, { state: { booking: match } });
  }, [searchParams, bookings, setSearchParams]);

  // EditBooking navigates back here with a success message in router state (its own toast
  // would just vanish — this page outlives that navigation, so it shows the toast instead).
  useEffect(() => {
    if (location.state?.toast) {
      showToast(location.state.toast.message, location.state.toast.type);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const filteredBookings = useMemo(() => bookings.filter((booking) => {
    const matchStatus = statusTab === 'All' || booking.status === STATUS_TO_QUERY[statusTab];
    const matchTruckType = truckTypeFilter === 'All Types' ||
      (booking.truckCategory || '').toLowerCase() === truckTypeFilter.toLowerCase() ||
      (booking.truckType || '').toLowerCase().includes(truckTypeFilter.toLowerCase());
    const term = searchTerm.trim().toLowerCase();
    const matchSearch = !term ||
      String(booking.id || '').toLowerCase().includes(term) ||
      String(booking.bookingNumber || '').toLowerCase().includes(term) ||
      String(booking.client || '').toLowerCase().includes(term) ||
      String(booking.pickup || '').toLowerCase().includes(term) ||
      String(booking.drop || '').toLowerCase().includes(term);
    return matchStatus && matchTruckType && matchSearch;
  }), [bookings, statusTab, searchTerm, truckTypeFilter]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage);

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  const { current: orderWindow, previous: prevOrderWindow } = useMemo(() => splitByPeriod(bookings, orderPeriod), [bookings, orderPeriod]);
  const { current: revenueWindow, previous: prevRevenueWindow } = useMemo(() => splitByPeriod(bookings, revenuePeriod), [bookings, revenuePeriod]);

  const orderBuckets = useMemo(() => {
    const counts = { active: 0, pending: 0, onDelivery: 0, delivered: 0 };
    orderWindow.forEach((b) => {
      const bucket = ORDER_BUCKETS.find((o) => o.statuses.includes(b.status));
      if (bucket) counts[bucket.key] += 1;
    });
    return counts;
  }, [orderWindow]);
  const totalOrders = orderWindow.length;
  const totalOrdersChange = pctChange(totalOrders, prevOrderWindow.length);

  const totalRevenue = useMemo(() => revenueWindow.reduce((sum, b) => sum + Number(b.amount || 0), 0), [revenueWindow]);
  const prevRevenueTotal = useMemo(() => prevRevenueWindow.reduce((sum, b) => sum + Number(b.amount || 0), 0), [prevRevenueWindow]);
  const revenueChange = pctChange(totalRevenue, prevRevenueTotal);

  const revenueByCategory = useMemo(() => {
    const totals = revenueWindow.reduce((acc, b) => {
      const raw = (b.truckCategory || b.truckType || 'Other').toString();
      const key = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      acc[key] = (acc[key] || 0) + Number(b.amount || 0);
      return acc;
    }, {});
    return Object.entries(totals).map(([name, value]) => ({ name, value })).filter((i) => i.value > 0);
  }, [revenueWindow]);

  const allVisibleSelected = paginatedBookings.length > 0 && paginatedBookings.every((b) => selectedIds.has(b.id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) paginatedBookings.forEach((b) => next.delete(b.id));
      else paginatedBookings.forEach((b) => next.add(b.id));
      return next;
    });
  };
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openInvoice = (booking, { download = false } = {}) => {
    setInvoiceBooking(booking);
    setInvoiceAutoDownload(download);
  };

  const handleDownloadInvoice = useCallback(async () => {
    if (!invoiceRef.current || !invoiceBooking) return;
    setInvoiceDownloading(true);
    try {
      await downloadElementAsPdf(invoiceRef.current, `${invoiceNumberFor(invoiceBooking)}.pdf`);
      markInvoiceGenerated(invoiceBooking);
      setInvoiceRegistry(getInvoiceRegistry());
      showToast(`${invoiceNumberFor(invoiceBooking)} ready`);
    } catch {
      showToast('Failed to generate the invoice PDF.', 'error');
    } finally {
      setInvoiceDownloading(false);
      setInvoiceAutoDownload(false);
    }
  }, [invoiceBooking]);

  useEffect(() => {
    if (invoiceBooking && invoiceAutoDownload) handleDownloadInvoice();
  }, [invoiceBooking, invoiceAutoDownload, handleDownloadInvoice]);

  const handleExport = () => {
    const rows = selectedIds.size > 0 ? filteredBookings.filter((b) => selectedIds.has(b.id)) : filteredBookings;
    const header = ['Booking ID', 'Client', 'Truck Type', 'Broker', 'Driver', 'Pickup', 'Drop', 'Status', 'Amount', 'Date'];
    const lines = [header, ...rows.map((b) => [
      bookingRef(b), b.client || '', b.truckType || b.truckCategory || '', b.broker || '', b.driver?.name || '',
      b.pickup || '', b.drop || '', STATUS_MAP[b.status] || b.status || '', b.amount || 0,
      b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : '',
    ])];
    const csv = lines.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Bookings</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage all bookings and track their status</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-poppins font-semibold text-secondary">Order Overview</h3>
            <select
              value={orderPeriod}
              onChange={(e) => setOrderPeriod(e.target.value)}
              className="text-sm border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-600 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="all">All time</option>
            </select>
          </div>

          <p className="text-sm text-neutral-500">Total Order</p>
          <div className="flex items-center flex-wrap gap-2 mt-1">
            <h2 className="text-3xl font-poppins font-bold text-secondary tracking-tight">{totalOrders.toLocaleString('en-IN')}</h2>
            {totalOrdersChange !== null && (
              <span className={`flex items-center gap-1 text-xs font-semibold ${totalOrdersChange >= 0 ? 'text-tertiary' : 'text-danger'}`}>
                {totalOrdersChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(totalOrdersChange)}%
              </span>
            )}
            {totalOrdersChange !== null && (
              <span className="text-xs text-neutral-400">Compared to last {orderPeriod === 'month' ? 'month' : 'week'}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-neutral-100">
            {ORDER_BUCKETS.map((b, i) => (
              <div key={b.key} className={`flex items-center gap-2 ${i > 0 ? 'pl-4 border-l border-neutral-100' : ''}`}>
                <span className="w-1.5 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                <span className="text-xs text-neutral-400">{b.label}</span>
                <span className="text-sm font-semibold text-secondary">{orderBuckets[b.key]}</span>
              </div>
            ))}
          </div>

          <div className="flex h-2 rounded-full overflow-hidden bg-neutral-100 mt-4">
            {totalOrders > 0 && ORDER_BUCKETS.map((b) => orderBuckets[b.key] > 0 && (
              <div key={b.key} style={{ width: `${(orderBuckets[b.key] / totalOrders) * 100}%`, backgroundColor: b.color }} />
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-poppins font-semibold text-secondary">Revenue</h3>
            <select
              value={revenuePeriod}
              onChange={(e) => setRevenuePeriod(e.target.value)}
              className="text-sm border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-600 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="week">This week</option>
              <option value="month">Last month</option>
              <option value="all">All time</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <p className="text-sm text-neutral-500">Total Revenue</p>
              <h2 className="text-3xl font-poppins font-bold text-secondary tracking-tight mt-1">{shortINR(totalRevenue)}</h2>
              {revenueChange !== null && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`flex items-center gap-1 text-xs font-semibold ${revenueChange >= 0 ? 'text-tertiary' : 'text-danger'}`}>
                    {revenueChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {Math.abs(revenueChange)}%
                  </span>
                  <span className="text-xs text-neutral-400">Compared to last {revenuePeriod === 'week' ? 'week' : 'month'}</span>
                </div>
              )}
            </div>

            <div>
              {revenueByCategory.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={110}>
                    <PieChart>
                      <Pie data={revenueByCategory} cx="50%" cy="95%" startAngle={180} endAngle={0} innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                        {revenueByCategory.map((_, i) => <Cell key={i} fill={GAUGE_COLORS[i % GAUGE_COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 -mt-2">
                    {revenueByCategory.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: GAUGE_COLORS[i % GAUGE_COLORS.length] }} />
                        <span className="text-neutral-500">{item.name}</span>
                        <span className="font-semibold text-secondary">{shortINR(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-neutral-400 text-center py-8">No revenue in this period</p>
              )}
            </div>
          </div>
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
        <div className="px-5 pt-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-poppins font-semibold text-secondary">Bookings</h3>
          <div className="flex items-center gap-2">
            <div className="relative" ref={filtersRef}>
              <button onClick={() => setFiltersOpen((v) => !v)} className="btn-secondary !py-2 !px-3 text-sm">
                <Filter size={14} /> {truckTypeFilter === 'All Types' ? 'Filters' : truckTypeFilter}
              </button>
              {filtersOpen && (
                <div className="absolute right-0 top-10 w-48 bg-white border border-neutral-100 rounded-xl shadow-dropdown z-20 p-3">
                  <label className="form-label">Truck Type</label>
                  <select value={truckTypeFilter} onChange={(e) => setTruckTypeFilter(e.target.value)} className="form-select w-full">
                    {TRUCK_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
            </div>
            <button onClick={handleExport} className="btn-secondary !py-2 !px-3 text-sm">
              <Download size={14} /> Export{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </button>
          </div>
        </div>

        <div className="px-5 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 overflow-x-auto">
            {statusTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  statusTab === tab ? 'bg-primary/10 text-primary border border-primary/20' : 'text-neutral-500 hover:bg-neutral-50 border border-transparent'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-9 !py-2" />
          </div>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} className="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary/30 cursor-pointer" />
                </th>
                <th>Booking ID</th>
                <th>Category</th>
                <th>Merchant</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Fee</th>
                <th>Assign to</th>
                <th>Route</th>
                <th>Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {paginatedBookings.map((booking) => (
                <tr key={booking.id}>
                  <td>
                    <input type="checkbox" checked={selectedIds.has(booking.id)} onChange={() => toggleSelectOne(booking.id)} className="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary/30 cursor-pointer" />
                  </td>
                  <td className="font-medium text-neutral-800 whitespace-nowrap">
                    {bookingRef(booking)}
                    {booking.deletedAt && (
                      <span className="block mt-1"><DeletedBadge deletedAt={booking.deletedAt} className="whitespace-normal max-w-[220px]" /></span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={booking.truckCategory} />
                      <span>{booking.truckType || booking.truckCategory || '-'}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                        <Building2 size={13} className="text-neutral-400" />
                      </div>
                      <span>{booking.broker || '-'}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Avatar name={booking.client} />
                      <span>{booking.client || '-'}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-neutral-500">
                    {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                  <td className="font-medium whitespace-nowrap">{money(booking.amount)}</td>
                  <td className="whitespace-nowrap">
                    {booking.driver?.name ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={booking.driver.name} />
                        <span>{booking.driver.name}</span>
                      </div>
                    ) : <span className="text-neutral-400">-</span>}
                  </td>
                  <td className="max-w-[200px] truncate text-neutral-500" title={`${booking.pickup} → ${booking.drop}`}>{booking.pickup} → {booking.drop}</td>
                  <td><Badge status={STATUS_MAP[booking.status] || booking.status} /></td>
                  <td className="text-center">
                    <RowMenu
                      onView={() => navigate(`/bookings/${booking.id}`, { state: { booking } })}
                      onEdit={() => navigate(`/bookings/${booking.id}/edit`, { state: { booking } })}
                      onDelete={() => handleRequestDelete(booking)}
                      invoiceCreated={!!invoiceRegistry[booking.id]}
                      onInvoiceAction={() => openInvoice(booking, { download: hasGeneratedInvoice(booking.id) })}
                    />
                  </td>
                </tr>
              ))}
              {paginatedBookings.length === 0 && <tr><td colSpan={11} className="text-center py-12 text-neutral-400">No bookings found matching your filters.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100">
          <p className="text-sm text-neutral-500">Showing {currentPage} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                onClick={() => setCurrentPage(n)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  currentPage === n ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-50 border border-neutral-200'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
      )}

      <DeleteBookingModal
        booking={deleteTarget}
        onClose={() => (deleting ? null : setDeleteTarget(null))}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
      />

      <Modal isOpen={!!invoiceBooking} onClose={() => { setInvoiceBooking(null); setInvoiceAutoDownload(false); }} title="Invoice Preview" size="full">
        {invoiceBooking && (
          <div className="space-y-4">
            <div className="border border-neutral-100 rounded-2xl overflow-auto bg-neutral-50 p-6">
              <InvoiceDocument ref={invoiceRef} booking={invoiceBooking} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-neutral-500">
                {hasGeneratedInvoice(invoiceBooking.id) ? 'Invoice already created for this booking.' : 'Generate the invoice PDF for this booking.'}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setInvoiceBooking(null)} className="btn-secondary">Close</button>
                <button onClick={handleDownloadInvoice} disabled={invoiceDownloading} className="btn-primary disabled:opacity-60">
                  <Download size={15} /> {invoiceDownloading ? 'Preparing PDF...' : hasGeneratedInvoice(invoiceBooking.id) ? 'Download Invoice' : 'Generate Invoice'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
