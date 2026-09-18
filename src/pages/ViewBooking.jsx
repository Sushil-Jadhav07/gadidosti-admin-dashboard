import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ChevronLeft, Pencil, Trash2, AlertTriangle, CheckCircle2, Circle, XCircle,
  Camera, MessageCircle, User, Building2, MapPin, Package, Truck, Phone,
  Wrench, ChevronDown, ChevronUp,
} from 'lucide-react';
import Badge from '../components/Badge';
import ChatWindow from '../components/ChatWindow';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { api, getToken } from '../services/api';
import { STATUS_MAP, money, bookingRef, CATEGORY_COLOR, DeletedBadge, DeleteBookingModal } from './Bookings';
import { useTripStatusSocket } from '../hooks/useTripStatusSocket';

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

// The trip's own status enum (distinct from the booking's — no 'pending'/'assigned'), in the
// order it can only move forward through. Used to build the "what can this become next"
// dropdown in ManageTripSection — 'cancelled' is always offered separately as an escape hatch.
const TRIP_STATUS_ORDER = ['confirmed', 'en_route_pickup', 'picked_up', 'in_transit', 'delivered', 'completed'];

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

// Admin/broker override panel — the trip normally only advances via the driver's own app;
// this exists purely so a stuck/unreachable driver (dead phone, crashed app, etc.) doesn't
// leave the trip stranded. Fetches the trip fresh (on expand, and again after every action)
// rather than trusting `booking` for trip-level fields like `stops`, which the booking
// payload doesn't carry. Extra loading/unloading stops must be completed in order within
// each type — mirrored here so "Mark complete" only ever shows on the one that's actually
// next, matching the 409 the backend would otherwise return.
function ManageTripSection({ booking, onToast, onChanged }) {
  const [open, setOpen] = useState(false);
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completingIndex, setCompletingIndex] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchTrip = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/trips/booking/${booking.id}`, getToken());
      if (res.success && res.data?.trip) {
        setTrip(res.data.trip);
      } else {
        setTrip(null);
        setError(res.message || 'No trip found for this booking yet.');
      }
    } catch {
      setTrip(null);
      setError('Network error — could not load trip.');
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchTrip();
  };

  const handleCompleteStop = async (index) => {
    setCompletingIndex(index);
    try {
      const res = await api.patch(`/api/trips/${trip.id}/stops/${index}/complete`, {}, getToken());
      if (res.success) {
        onToast({ message: 'Stop marked complete.', type: 'success' });
        await fetchTrip();
      } else {
        onToast({ message: res.message || 'Failed to complete stop.', type: 'error' });
      }
    } catch {
      onToast({ message: 'Network error — could not complete stop.', type: 'error' });
    } finally {
      setCompletingIndex(null);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!trip || !selectedStatus) return;
    setSubmitting(true);
    try {
      const res = await api.patch(`/api/trips/${trip.id}/status`, { status: selectedStatus }, getToken());
      if (res.success) {
        onToast({ message: `Trip status set to ${STATUS_MAP[selectedStatus] || selectedStatus}.`, type: 'success' });
        setConfirmOpen(false);
        setSelectedStatus('');
        await fetchTrip();
        onChanged();
      } else {
        onToast({ message: res.message || 'Failed to update trip status.', type: 'error' });
      }
    } catch {
      onToast({ message: 'Network error — could not update trip status.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const stops = Array.isArray(trip?.stops) ? trip.stops : [];
  const extraStops = stops
    .map((stop, index) => ({ ...stop, index }))
    .filter((stop) => stop.type === 'loading' || stop.type === 'unloading');
  const earliestPendingByType = {};
  extraStops.forEach((stop) => {
    if (stop.status !== 'done' && earliestPendingByType[stop.type] === undefined) {
      earliestPendingByType[stop.type] = stop.index;
    }
  });

  const currentIndex = trip ? TRIP_STATUS_ORDER.indexOf(trip.status) : -1;
  const statusOptions = trip && currentIndex !== -1
    ? [...TRIP_STATUS_ORDER.slice(currentIndex + 1), 'cancelled']
    : [];

  return (
    <div className="border border-amber-200 bg-amber-50/40 rounded-2xl overflow-hidden">
      <button onClick={toggleOpen} className="w-full flex items-center justify-between gap-2.5 p-4 hover:bg-amber-50 transition-colors">
        <span className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <Wrench size={15} />
          </div>
          <span className="text-sm font-poppins font-semibold text-secondary">Manage Trip · Driver Unreachable</span>
        </span>
        {open ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
      </button>

      {open && (
        <div className="p-4 border-t border-amber-200 space-y-4">
          <p className="text-xs text-neutral-500">
            Only use this to move the trip forward on the driver's behalf if they're stuck or unreachable
            (dead phone, crashed app, etc.). Every action below overrides the driver's own app.
          </p>

          {loading && <div className="text-sm text-neutral-400">Loading trip...</div>}
          {!loading && error && <div className="text-sm text-danger">{error}</div>}

          {!loading && trip && (
            <>
              <div className="flex items-center justify-between text-sm bg-white rounded-xl p-3">
                <span className="text-neutral-500">Current trip status</span>
                <Badge status={STATUS_MAP[trip.status] || trip.status} />
              </div>

              {extraStops.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Loading / Unloading Stops</p>
                  {extraStops.map((stop) => {
                    const isDone = stop.status === 'done';
                    const isNext = earliestPendingByType[stop.type] === stop.index;
                    return (
                      <div key={stop.index} className="flex items-center justify-between gap-3 text-sm bg-white rounded-xl p-3">
                        <div>
                          <span className="font-medium text-neutral-700 capitalize">{stop.type}</span>
                          <span className="text-neutral-400"> · {stop.location || '—'}</span>
                        </div>
                        {isDone ? (
                          <span className="flex items-center gap-1 text-tertiary text-xs font-semibold flex-shrink-0">
                            <CheckCircle2 size={13} /> Done
                          </span>
                        ) : isNext ? (
                          <button
                            onClick={() => handleCompleteStop(stop.index)}
                            disabled={completingIndex === stop.index}
                            className="btn-secondary !py-1.5 !px-3 text-xs disabled:opacity-60 flex-shrink-0"
                          >
                            {completingIndex === stop.index ? 'Completing...' : 'Mark complete'}
                          </button>
                        ) : (
                          <span className="text-xs text-neutral-400 flex-shrink-0">Waiting on earlier {stop.type} stop</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {statusOptions.length > 0 ? (
                <div className="space-y-2 pt-2 border-t border-amber-200">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Override Trip Status</p>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="form-select flex-1"
                    >
                      <option value="">Select new status...</option>
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>{STATUS_MAP[s] || s}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setConfirmOpen(true)}
                      disabled={!selectedStatus}
                      className="btn-primary !py-2 !px-3 text-sm disabled:opacity-50 flex-shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-neutral-400">This trip has no further status to move to.</p>
              )}
            </>
          )}
        </div>
      )}

      <Modal isOpen={confirmOpen} onClose={() => (submitting ? null : setConfirmOpen(false))} title="Override Trip Status" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 font-medium">
              This overrides the driver's own status update — only use this if the driver can't act themselves.
            </p>
          </div>
          <p className="text-sm text-neutral-600">
            Set this trip's status to <span className="font-semibold text-neutral-800">{STATUS_MAP[selectedStatus] || selectedStatus}</span>?
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setConfirmOpen(false)} disabled={submitting} className="btn-secondary disabled:opacity-60">Cancel</button>
            <button onClick={handleConfirmStatusChange} disabled={submitting} className="btn-danger disabled:opacity-60">
              {submitting ? 'Updating...' : 'Confirm Override'}
            </button>
          </div>
        </div>
      </Modal>
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

// Reached from the booking list's row menu, or a push-notification deep link — the booking
// is usually handed over via navigation state (no refetch needed), with a fetch-by-id
// fallback for a direct link or a page refresh.
export default function ViewBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);
  const [loadError, setLoadError] = useState('');
  const [loadingPod, setLoadingPod] = useState(false);
  const [showChat, setShowChat] = useState(!!location.state?.openChat);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const chatSectionRef = useRef(null);

  useEffect(() => {
    if (booking) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await api.get(`/api/bookings/${id}`, getToken());
        if (cancelled) return;
        if (res.success && res.data?.booking) {
          setBooking(res.data.booking);
        } else {
          setLoadError(res.message || 'Failed to load this booking.');
        }
      } catch {
        if (!cancelled) setLoadError('Network error — could not load this booking.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, booking]);

  // Silent re-fetch, shared by the live socket push below and by ManageTripSection's status
  // override — an admin-driven status change doesn't go through the socket's own driver/broker
  // path, so the override handler calls this directly to make the read-only timeline/badge
  // reflect it immediately, same as a driver-driven change would.
  const refreshBooking = useCallback(() => {
    return api.get(`/api/bookings/${id}`, getToken())
      .then((res) => { if (res?.success && res.data?.booking) setBooking(res.data.booking); })
      .catch(() => {});
  }, [id]);

  // Live push — the moment a driver/broker changes this trip's status, silently re-fetch so the
  // timeline/status badge update instantly instead of needing a manual reload. Booking was
  // previously only ever fetched once (see the effect above, guarded on `if (booking) return`).
  useTripStatusSocket((trip) => {
    if (!trip?.bookingId || trip.bookingId !== id) return;
    refreshBooking();
  });

  // Arriving from the Chats list opens straight to the conversation instead of making
  // admin re-find and click "View Chat" on a page full of other booking details.
  useEffect(() => {
    if (location.state?.openChat && booking) {
      chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.state?.openChat, booking]);

  const viewProofOfDelivery = async () => {
    if (!booking.podUrl || loadingPod) return;
    setLoadingPod(true);
    try {
      const blobUrl = await api.getFileBlobUrl(booking.podUrl, getToken());
      window.open(blobUrl, '_blank');
    } catch {
      setToast({ message: 'Failed to load proof of delivery.', type: 'error' });
    } finally {
      setLoadingPod(false);
    }
  };

  const handleConfirmDelete = async (target) => {
    setDeleting(true);
    try {
      const res = await api.delete(`/api/bookings/${target.id}`, getToken());
      if (res.success) {
        navigate('/bookings', { state: { toast: { message: `${bookingRef(target)} permanently deleted`, type: 'success' } } });
      } else {
        setToast({ message: res.message || 'Failed to delete booking', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error — could not delete booking', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-10 flex justify-center animate-fade-in">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError || !booking) {
    return (
      <div className="card p-6 text-sm text-danger flex items-center gap-2 animate-fade-in">
        <span>{loadError || 'Booking not found.'}</span>
        <button onClick={() => navigate('/bookings')} className="underline">Back to bookings</button>
      </div>
    );
  }

  const statusLabel = STATUS_MAP[booking.status] || booking.status;
  const category = (booking.truckCategory || '').toLowerCase();
  const categoryColor = CATEGORY_COLOR[category] || '#166534';

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate('/bookings')} className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors">
          <ChevronLeft size={16} /> Back to Bookings
        </button>
        <button
          onClick={() => navigate(`/bookings/${booking.id}/edit`, { state: { booking } })}
          className="btn-secondary !py-2 !px-3 text-sm"
        >
          <Pencil size={14} /> Edit Booking
        </button>
      </div>

      <div className="card p-6 lg:p-8 space-y-5 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-neutral-400 mb-1">Booking {bookingRef(booking)} · Route</p>
            <h1 className="font-poppins font-semibold text-secondary text-xl">{booking.pickup} → {booking.drop}</h1>
          </div>
          <Badge status={statusLabel} />
        </div>

        <DeletedBadge deletedAt={booking.deletedAt} />

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

        {booking.status !== 'completed' && booking.status !== 'cancelled' && (
          <ManageTripSection booking={booking} onToast={setToast} onChanged={refreshBooking} />
        )}

        <div ref={chatSectionRef}>
          <button
            onClick={() => setShowChat((v) => !v)}
            className="w-full flex items-center gap-2.5 bg-neutral-50 rounded-xl p-3 hover:bg-neutral-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <MessageCircle size={16} />
            </div>
            <span className="text-sm font-medium text-neutral-700">{showChat ? 'Hide Chat' : 'View Chat'}</span>
          </button>

          {showChat && <div className="mt-3"><ChatWindow bookingId={booking.id} clientName={booking.client} /></div>}
        </div>

        <div className="border border-danger/20 bg-danger/5 rounded-2xl p-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-danger flex items-center gap-1.5"><AlertTriangle size={14} /> Danger Zone</p>
            <p className="text-xs text-neutral-500 mt-1">Permanently delete this booking and everything tied to it. This cannot be undone.</p>
          </div>
          <button
            onClick={() => setDeleteTarget(booking)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-danger rounded-lg hover:bg-danger/90 transition-colors"
          >
            <Trash2 size={13} /> Delete Booking
          </button>
        </div>
      </div>

      <DeleteBookingModal
        booking={deleteTarget}
        onClose={() => (deleting ? null : setDeleteTarget(null))}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
