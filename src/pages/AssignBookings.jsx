import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, User, Package, IndianRupee, Truck, Phone,
  Send, CheckCircle2, RefreshCw, ShieldCheck,
} from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { api, getToken } from '../services/api';
import { money, bookingRef, CATEGORY_COLOR } from './Bookings';
import { timeAgo } from '../utils/chat';

// One central place to assign a driver straight to any still-unassigned ("Requested") booking —
// built so admin doesn't have to open each booking's own detail page one at a time (ViewBooking.jsx
// still has its own inline version of this too, for when admin is already looking at one booking).
// Every assignment made here goes through the same POST /api/admin/bookings/:id/assign-driver as
// that inline version — no negotiation, ever: the driver can only accept or decline the booking's
// current price, never counter it (see driverRequest.controller.js's isDirectAssignment).
export default function AssignBookings() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  // Tracks bookings an assignment was just sent for, in this session — the booking's own status
  // stays 'pending' until the driver actually accepts (same as every other driver_requests flow),
  // so this is the only way to tell "already handled" from "still needs a driver" without a
  // second per-booking driver_requests fetch for every card.
  const [justAssigned, setJustAssigned] = useState(() => new Set());

  const [assignTarget, setAssignTarget] = useState(null); // the booking being assigned right now
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/bookings?status=pending&limit=100&sort=desc', getToken());
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
  };

  useEffect(() => { fetchBookings(); }, []);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return bookings.filter((b) => {
      if (justAssigned.has(b.id)) return false;
      if (!term) return true;
      return [b.bookingNumber, b.client, b.clientPhone, b.pickup, b.drop]
        .some((v) => String(v || '').toLowerCase().includes(term));
    });
  }, [bookings, searchTerm, justAssigned]);

  const openAssign = async (booking) => {
    setAssignTarget(booking);
    setSelectedDriverId('');
    setDriverSearch('');
    setLoadingDrivers(true);
    try {
      // status=available already excludes both 'on_trip' (mid-delivery) and 'offline' drivers —
      // exactly "free and online right now" with no extra filtering needed on top of it.
      const res = await api.get('/api/vehicles/drivers?status=available&limit=100', getToken());
      if (res.success) {
        setDrivers(res.data?.drivers || []);
      } else {
        setToast({ message: res.message || 'Failed to load drivers.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error — could not load drivers.', type: 'error' });
    } finally {
      setLoadingDrivers(false);
    }
  };

  const closeAssign = () => {
    if (assigning) return;
    setAssignTarget(null);
  };

  const handleConfirmAssign = async () => {
    if (!assignTarget || !selectedDriverId) return;
    setAssigning(true);
    try {
      const res = await api.post(`/api/admin/bookings/${assignTarget.id}/assign-driver`, { driver_id: selectedDriverId }, getToken());
      if (res.success) {
        setToast({ message: `Request sent — awaiting the driver's response.`, type: 'success' });
        setJustAssigned((prev) => new Set(prev).add(assignTarget.id));
        setAssignTarget(null);
      } else {
        setToast({ message: res.message || 'Failed to assign driver.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error — could not assign driver.', type: 'error' });
    } finally {
      setAssigning(false);
    }
  };

  const filteredDrivers = useMemo(() => {
    const term = driverSearch.trim().toLowerCase();
    if (!term) return drivers;
    return drivers.filter((d) => [d.name, d.truckReg, d.broker].some((v) => String(v || '').toLowerCase().includes(term)));
  }, [drivers, driverSearch]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-poppins font-bold text-secondary flex items-center gap-2">
            <Send size={22} className="text-primary" /> Assign Bookings
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Bookings still waiting for a driver — pick one directly from anywhere in the system, no
            distance restriction. The price is fixed; the driver can accept or decline, not negotiate.
          </p>
        </div>
        <button onClick={fetchBookings} className="btn-secondary !py-2 !px-3 text-sm flex-shrink-0">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="card p-4">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by booking number, client, pickup or drop..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-9 !py-2 w-full"
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
      ) : filtered.length === 0 ? (
        <div className="card p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
            <CheckCircle2 size={24} className="text-emerald-500" />
          </div>
          <h3 className="text-base font-poppins font-semibold text-secondary mb-1">
            {bookings.length === 0 ? 'Nothing waiting for a driver' : 'No matches'}
          </h3>
          <p className="text-sm text-neutral-400">
            {bookings.length === 0
              ? 'Every booking already has a broker, driver, or request in flight.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((booking) => {
            const category = (booking.truckCategory || '').toLowerCase();
            const categoryColor = CATEGORY_COLOR[category] || '#166534';
            return (
              <div key={booking.id} className="card p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button
                      onClick={() => navigate(`/bookings/${booking.id}`, { state: { booking } })}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {bookingRef(booking)}
                    </button>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{timeAgo(booking.createdAt)}</p>
                  </div>
                  <Badge status="Requested" />
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center pt-1 pb-1 flex-shrink-0 w-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
                    <span className="flex-1 w-0 border-l-2 border-dashed border-neutral-200 my-1" />
                    <MapPin size={14} className="text-success flex-shrink-0" fill="currentColor" fillOpacity={0.15} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2 text-sm">
                    <p className="text-neutral-700 font-medium truncate">{booking.pickup || '—'}</p>
                    <p className="text-neutral-700 font-medium truncate">{booking.drop || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <User size={14} className="text-neutral-400 flex-shrink-0" />
                  <span className="truncate">{booking.client || '—'}</span>
                  {booking.clientPhone && (
                    <a href={`tel:${booking.clientPhone}`} className="ml-auto flex items-center gap-1 text-primary hover:underline text-xs flex-shrink-0">
                      <Phone size={11} /> {booking.clientPhone}
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: categoryColor }}
                  >
                    <Truck size={11} /> {booking.truckCategory ? `${booking.truckCategory}${booking.truckType ? ` · ${booking.truckType}` : ''}` : booking.truckType || 'Truck'}
                  </span>
                  {(booking.weight || booking.quantity) && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
                      <Package size={11} /> {booking.quantity ? `Qty ${booking.quantity}` : ''}{booking.weight ? ` · ${booking.weight}${booking.weightUnit || ''}` : ''}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                  <span className="flex items-center gap-1 font-poppins font-bold text-lg text-primary">
                    <IndianRupee size={16} /> {Number(booking.amount || 0).toLocaleString('en-IN')}
                  </span>
                  <button onClick={() => openAssign(booking)} className="btn-primary !py-2 !px-3.5 text-sm">
                    <Send size={14} /> Assign Driver
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!assignTarget} onClose={closeAssign} title={assignTarget ? `Assign Driver — ${bookingRef(assignTarget)}` : ''} size="lg">
        {assignTarget && (
          <div className="space-y-4">
            <div className="bg-neutral-50 rounded-xl p-4 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-neutral-700 truncate">{assignTarget.pickup} → {assignTarget.drop}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{assignTarget.client}</p>
              </div>
              <span className="font-poppins font-bold text-primary flex-shrink-0">{money(assignTarget.amount)}</span>
            </div>

            <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-3 text-xs text-indigo-800">
              <ShieldCheck size={15} className="flex-shrink-0 mt-0.5" />
              <span>Fixed price, direct assignment — no distance restriction, and the driver can only accept or decline, not negotiate.</span>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by driver name or truck registration..."
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                className="form-input pl-9 !py-2 w-full"
              />
            </div>

            {loadingDrivers ? (
              <div className="py-8 flex justify-center">
                <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filteredDrivers.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-6">No available, online drivers found.</p>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-1.5 border border-neutral-100 rounded-xl p-2">
                {filteredDrivers.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDriverId(d.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-left transition-colors ${
                      selectedDriverId === d.id ? 'bg-primary text-white' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${selectedDriverId === d.id ? 'text-white' : 'text-neutral-800'}`}>{d.name}</p>
                      <p className={`text-xs truncate ${selectedDriverId === d.id ? 'text-white/80' : 'text-neutral-400'}`}>
                        {d.truckReg || 'No truck'} · {d.broker || '—'}
                      </p>
                    </div>
                    <Badge status="Available" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={closeAssign} disabled={assigning} className="btn-secondary disabled:opacity-60">Cancel</button>
              <button onClick={handleConfirmAssign} disabled={!selectedDriverId || assigning} className="btn-primary disabled:opacity-50">
                {assigning ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
