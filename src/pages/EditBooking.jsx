import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ClipboardEdit, MapPin, Package, User } from 'lucide-react';
import { api, getToken } from '../services/api';

const TRUCK_CATEGORIES = ['small', 'medium', 'large', 'part'];

function bookingRef(b) {
  return b?.bookingNumber || (b?.id ? `#${b.id.slice(0, 8)}` : '—');
}

function bookingToForm(b) {
  return {
    client: b?.client || '',
    clientPhone: b?.clientPhone || '',
    clientEmail: b?.clientEmail || '',
    pickup: b?.pickup || '',
    drop: b?.drop || '',
    truckCategory: b?.truckCategory || 'small',
    material: b?.material || '',
    weight: b?.weight != null ? String(b.weight) : '',
    weightUnit: b?.weightUnit || 'kg',
    quantity: b?.quantity != null ? String(b.quantity) : '',
    amount: b?.amount != null ? String(b.amount) : '',
  };
}

// Reached from the booking list's row menu — the booking object is usually handed over via
// navigation state (no refetch needed), but a direct link or a page refresh won't have that,
// so we fall back to fetching it by id.
export default function EditBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(() => bookingToForm(location.state?.booking));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

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
          setForm(bookingToForm(res.data.booking));
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

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaveError('');
    if (!form.client.trim()) { setSaveError('Client name is required.'); return; }
    if (!form.pickup.trim() || !form.drop.trim()) { setSaveError('Pickup and drop locations are required.'); return; }

    setSaving(true);
    try {
      const res = await api.patch(`/api/bookings/${id}`, {
        client: form.client.trim(),
        client_phone: form.clientPhone.trim() || undefined,
        client_email: form.clientEmail.trim() || undefined,
        pickup: form.pickup.trim(),
        drop: form.drop.trim(),
        truck_category: form.truckCategory,
        material: form.material.trim() || undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        weight_unit: form.weightUnit || undefined,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        amount: form.amount ? Number(form.amount) : undefined,
      }, getToken());
      if (!res.success) throw new Error(res.message || 'Failed to update booking');
      navigate('/bookings', { state: { toast: { message: `${bookingRef(booking)} updated successfully`, type: 'success' } } });
    } catch (err) {
      setSaveError(err.message || 'Failed to update booking.');
    } finally {
      setSaving(false);
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

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleSubmit} className="card p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ClipboardEdit size={22} />
            </div>
            <div>
              <h2 className="font-poppins text-xl font-semibold text-secondary">Edit Booking</h2>
              <p className="text-sm text-neutral-500">{bookingRef(booking)} · Update client, route, and load details.</p>
            </div>
          </div>

          <div className="mt-8 space-y-8">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="form-label">Client Name *</label>
                <input value={form.client} onChange={(e) => setField('client', e.target.value)} className="form-input" placeholder="Ramesh Traders" />
              </div>
              <div>
                <label className="form-label">Client Phone</label>
                <input value={form.clientPhone} onChange={(e) => setField('clientPhone', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Client Email</label>
                <input type="email" value={form.clientEmail} onChange={(e) => setField('clientEmail', e.target.value)} className="form-input" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="form-label">Pickup Location *</label>
                <input value={form.pickup} onChange={(e) => setField('pickup', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Drop Location *</label>
                <input value={form.drop} onChange={(e) => setField('drop', e.target.value)} className="form-input" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="form-label">Truck Type</label>
                <select value={form.truckCategory} onChange={(e) => setField('truckCategory', e.target.value)} className="form-select">
                  {TRUCK_CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Weight</label>
                <div className="flex gap-2">
                  <input value={form.weight} onChange={(e) => setField('weight', e.target.value.replace(/[^\d.]/g, ''))} className="form-input" placeholder="500" />
                  <input value={form.weightUnit} onChange={(e) => setField('weightUnit', e.target.value)} className="form-input w-20" placeholder="kg" />
                </div>
              </div>
              <div>
                <label className="form-label">Quantity</label>
                <input value={form.quantity} onChange={(e) => setField('quantity', e.target.value.replace(/[^\d]/g, ''))} className="form-input" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="form-label">Material</label>
                <input value={form.material} onChange={(e) => setField('material', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Amount (₹)</label>
                <input value={form.amount} onChange={(e) => setField('amount', e.target.value.replace(/[^\d.]/g, ''))} className="form-input" />
              </div>
            </div>

            {saveError && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-danger">{saveError}</div>}

            <div className="flex flex-wrap justify-end gap-3 border-t border-neutral-100 pt-6">
              <button type="button" onClick={() => navigate('/bookings')} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </form>

        <aside className="card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Booking summary</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><User size={18} /></div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-secondary truncate">{form.client || 'Client name'}</p>
                <p className="text-xs text-neutral-400 truncate">{form.clientPhone || 'No phone on file'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-500 flex items-center justify-center flex-shrink-0"><MapPin size={18} /></div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-secondary truncate">{form.pickup || 'Pickup'} → {form.drop || 'Drop'}</p>
                <p className="text-xs text-neutral-400">Route</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-500 flex items-center justify-center flex-shrink-0"><Package size={18} /></div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-secondary truncate">{form.weight ? `${form.weight} ${form.weightUnit}` : '—'} · {form.quantity || '—'} pcs</p>
                <p className="text-xs text-neutral-400">Load</p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
