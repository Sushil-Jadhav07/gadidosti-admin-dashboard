import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Search, Eye, ChevronLeft, ChevronRight, CheckCircle2, Circle, Truck,
  User, Building2, MapPin, Package, XCircle, Camera, Phone, MessageCircle,
} from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import ChatWindow from '../components/ChatWindow';
import { api, getToken } from '../services/api';

const STATUS_MAP = {
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

const TIMELINE_STEPS = [
  { key: 'pending', label: 'Requested' },
  { key: 'confirmed', label: 'Accepted' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'en_route_pickup', label: 'En Route' },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'completed', label: 'Completed' },
];

const CATEGORY_COLOR = { small: '#1976FF', medium: '#17D86B', large: '#F59E0B' };

function money(v) {
  return `₹${Number(v || 0).toLocaleString('en-IN')}`;
}

function shortId(id) {
  return id ? `#${id.slice(0, 8)}` : '—';
}

// Bookings get a real human-readable reference from the backend (e.g. "BKG-202607-017") —
// prefer that over the raw UUID, matching what every other GadiDost frontend already shows.
function bookingRef(booking) {
  return booking?.bookingNumber || shortId(booking?.id);
}

function PhoneLink({ phone }) {
  if (!phone) return null;
  return (
    <a href={`tel:${phone}`} className="text-primary hover:underline flex items-center gap-1 justify-end">
      <Phone size={12} /> {phone}
    </a>
  );
}

function InfoCard({ icon: Icon, title, rows }) {
  return (
    <div className="border border-neutral-100 rounded-2xl p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon size={15} className="text-primary" />
        </div>
        <h4 className="text-sm font-poppins font-semibold text-secondary">{title}</h4>
      </div>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-neutral-400">{label}</span>
            <span className="font-medium text-neutral-700 text-right">{value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusTimeline({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
        <XCircle size={20} className="text-danger flex-shrink-0" />
        <p className="text-sm font-medium text-danger">This booking was cancelled.</p>
      </div>
    );
  }

  const currentIndex = TIMELINE_STEPS.findIndex((s) => s.key === status);
  const lastVisibleIndex = currentIndex === -1 ? -1 : currentIndex;

  return (
    <div className="flex items-start w-full overflow-x-auto pb-1">
      {TIMELINE_STEPS.map((step, index) => {
        const done = index <= lastVisibleIndex;
        const isCurrent = index === lastVisibleIndex;
        return (
          <div key={step.key} className="flex-1 min-w-[84px] flex flex-col items-center relative">
            <div className="flex items-center w-full">
              <div className={`flex-1 h-0.5 ${index === 0 ? 'opacity-0' : done ? 'bg-primary' : 'bg-neutral-200'}`} />
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                  done ? 'bg-primary border-primary text-white' : 'bg-white border-neutral-200 text-neutral-300'
                } ${isCurrent ? 'ring-4 ring-primary/15' : ''}`}
              >
                {done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
              </div>
              <div className={`flex-1 h-0.5 ${index < lastVisibleIndex ? 'bg-primary' : 'bg-neutral-200'}`} />
            </div>
            <p className={`text-[11px] mt-2 text-center font-medium ${done ? 'text-secondary' : 'text-neutral-400'}`}>{step.label}</p>
          </div>
        );
      })}
    </div>
  );
}

function PricingBreakdown({ pricing, amount }) {
  const base = pricing?.baseFare ?? pricing?.base_fare ?? 0;
  const fuel = pricing?.fuel ?? pricing?.fuelSurcharge ?? 0;
  const toll = pricing?.toll ?? 0;
  const platformFee = pricing?.platformFee ?? pricing?.platform_fee ?? 0;
  const total = pricing?.total ?? amount ?? (Number(base) + Number(fuel) + Number(toll) + Number(platformFee));

  return (
    <div className="border border-neutral-100 rounded-2xl p-4">
      <h4 className="text-sm font-poppins font-semibold text-secondary mb-3">Pricing Breakdown</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-neutral-400">Base Fare</span><span className="font-medium text-neutral-700">{money(base)}</span></div>
        <div className="flex justify-between"><span className="text-neutral-400">Fuel Surcharge</span><span className="font-medium text-neutral-700">{money(fuel)}</span></div>
        <div className="flex justify-between"><span className="text-neutral-400">Toll</span><span className="font-medium text-neutral-700">{money(toll)}</span></div>
        <div className="flex justify-between"><span className="text-neutral-400">Platform Fee</span><span className="font-medium text-neutral-700">{money(platformFee)}</span></div>
        <div className="flex justify-between pt-2 border-t border-neutral-100">
          <span className="font-poppins font-semibold text-secondary">Total</span>
          <span className="font-poppins font-bold text-primary">{money(total)}</span>
        </div>
      </div>
    </div>
  );
}

function BookingDetailModal({ booking, onClose }) {
  const [loadingPod, setLoadingPod] = useState(false);
  const [showChat, setShowChat] = useState(false);
  // This component stays mounted (parent always renders it, just with booking=null when
  // closed) — reset the chat panel whenever a different booking is opened.
  useEffect(() => { setShowChat(false); }, [booking?.id]);
  if (!booking) return null;
  const statusLabel = STATUS_MAP[booking.status] || booking.status;
  const category = (booking.truckCategory || '').toLowerCase();
  const categoryColor = CATEGORY_COLOR[category] || '#1976FF';

  const viewProofOfDelivery = async () => {
    if (!booking.podUrl || loadingPod) return;
    setLoadingPod(true);
    try {
      const blobUrl = await api.getFileBlobUrl(booking.podUrl, getToken());
      window.open(blobUrl, '_blank');
    } catch {
      // Best-effort — no toast wired into this modal; the button re-enables on failure.
    } finally {
      setLoadingPod(false);
    }
  };

  return (
    <Modal isOpen={!!booking} onClose={onClose} title={`Booking Details — ${bookingRef(booking)}`} size="xl">
      <div className="space-y-5 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-neutral-400 mb-1">Route</p>
            <h3 className="font-poppins font-semibold text-secondary text-base">{booking.pickup} → {booking.drop}</h3>
          </div>
          <Badge status={statusLabel} />
        </div>

        <div className="bg-neutral-50 rounded-2xl p-4">
          <StatusTimeline status={booking.status} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: categoryColor }}
          >
            <Truck size={12} /> {booking.truckCategory ? `${booking.truckCategory} · ${booking.truckType || ''}` : booking.truckType || 'Truck'}
          </span>
          <span className="text-xs text-neutral-400">
            Qty: {booking.quantity ?? '—'} · {booking.weight ?? '—'}{booking.weightUnit || ''} · {booking.transportType === 'inter_city' ? 'Inter-city' : 'Intra-city'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoCard
            icon={User}
            title="Client Information"
            rows={[
              ['Name', booking.client],
              ['Phone', <PhoneLink phone={booking.clientPhone} />],
              ['Email', booking.clientEmail],
            ]}
          />
          <InfoCard
            icon={Building2}
            title="Broker Information"
            rows={[
              ['Broker', booking.broker],
              ['Broker Phone', <PhoneLink phone={booking.brokerPhone} />],
              ['Driver', booking.driver?.name],
              ['Driver Phone', <PhoneLink phone={booking.driverPhone || booking.driver?.phone} />],
              ['Truck Reg.', booking.truckReg],
            ]}
          />
          <InfoCard
            icon={MapPin}
            title="Route Details"
            rows={[
              ['Pickup', booking.pickup],
              ['Drop', booking.drop],
              ['Transport Type', booking.transportType === 'inter_city' ? 'Inter-city' : 'Intra-city'],
            ]}
          />
          <InfoCard
            icon={Package}
            title="Load Information"
            rows={[
              ['Material', booking.material],
              ['Weight', booking.weight ? `${booking.weight} ${booking.weightUnit || ''}` : '—'],
              ['Quantity', booking.quantity],
              ['Payment Status', booking.paymentStatus],
            ]}
          />
        </div>

        <PricingBreakdown pricing={booking.pricing} amount={booking.amount} />

        {booking.podUrl && (
          <button
            onClick={viewProofOfDelivery}
            disabled={loadingPod}
            className="w-full flex items-center gap-2.5 bg-neutral-50 rounded-xl p-3 hover:bg-neutral-100 transition-colors disabled:opacity-60"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Camera size={16} />
            </div>
            <span className="text-sm font-medium text-neutral-700">{loadingPod ? 'Loading...' : 'View Proof of Delivery'}</span>
          </button>
        )}

        <button
          onClick={() => setShowChat((v) => !v)}
          className="w-full flex items-center gap-2.5 bg-neutral-50 rounded-xl p-3 hover:bg-neutral-100 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <MessageCircle size={16} />
          </div>
          <span className="text-sm font-medium text-neutral-700">{showChat ? 'Hide Chat' : 'View Chat (read-only)'}</span>
        </button>

        {showChat && <ChatWindow bookingId={booking.id} />}
      </div>
    </Modal>
  );
}

export default function Bookings() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [truckTypeFilter, setTruckTypeFilter] = useState('All Types');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const itemsPerPage = 10;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const query = statusFilter !== 'All' ? `&status=${STATUS_TO_QUERY[statusFilter]}` : '';
      const res = await api.get(`/api/bookings?limit=200${query}`, token);
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
  }, [statusFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { setCurrentPage(1); }, [statusFilter, truckTypeFilter, searchTerm]);

  const filteredBookings = useMemo(() => bookings.filter((booking) => {
    const matchTruckType = truckTypeFilter === 'All Types' ||
      (booking.truckCategory || '').toLowerCase() === truckTypeFilter.toLowerCase() ||
      (booking.truckType || '').toLowerCase().includes(truckTypeFilter.toLowerCase());
    const matchSearch = !searchTerm ||
      String(booking.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(booking.bookingNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(booking.client || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(booking.pickup || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(booking.drop || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchTruckType && matchSearch;
  }), [bookings, searchTerm, truckTypeFilter]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Bookings</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage all bookings and track their status</p>
      </div>

      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="form-label">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input type="text" placeholder="Search by ID, client, route..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="form-input pl-9" />
            </div>
          </div>
          <div>
            <label className="form-label">Status</label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="form-select min-w-[160px]">
              {statusTabs.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Truck Type</label>
            <select value={truckTypeFilter} onChange={(event) => setTruckTypeFilter(event.target.value)} className="form-select min-w-[160px]">
              {TRUCK_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
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
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Client</th>
                <th>Route</th>
                <th>Truck Type</th>
                <th>Broker</th>
                <th>Driver</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
                <th>Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="font-medium text-neutral-800 whitespace-nowrap">{bookingRef(booking)}</td>
                  <td>{booking.client}</td>
                  <td className="max-w-[220px] truncate" title={`${booking.pickup} → ${booking.drop}`}>{booking.pickup} → {booking.drop}</td>
                  <td>{booking.truckType || booking.truckCategory || '-'}</td>
                  <td className="whitespace-nowrap">{booking.broker || '-'}</td>
                  <td className="whitespace-nowrap">{booking.driver?.name || '-'}</td>
                  <td><Badge status={STATUS_MAP[booking.status] || booking.status} /></td>
                  <td className="text-right font-medium whitespace-nowrap">{money(booking.amount)}</td>
                  <td className="whitespace-nowrap">{booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-IN') : '-'}</td>
                  <td className="text-center">
                    <button onClick={() => setSelectedBooking(booking)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedBookings.length === 0 && <tr><td colSpan={10} className="text-center py-12 text-neutral-400">No bookings found matching your filters.</td></tr>}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredBookings.length)} of {filteredBookings.length} entries</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
      )}

      <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
    </div>
  );
}
