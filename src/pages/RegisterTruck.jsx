import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, CircleGauge, ShieldCheck, Truck, TruckIcon, Waypoints } from 'lucide-react';
import BrokerPicker from '../components/BrokerPicker';
import Toast from '../components/Toast';
import { api, getToken } from '../services/api';
import { TRUCK_IMAGES } from '../lib/truckImages';

const TRUCK_CATEGORIES = ['small', 'medium', 'large', 'part'];
const REGISTRATION_REGEX = /^[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{1,4}$/i;
const EMPTY_FORM = { brokerId: '', registration: '', category: 'small', capacity: '', make: '', year: '', insuranceExpiry: '' };

const CATEGORY_COPY = {
  small: 'City and light-load movement',
  medium: 'Balanced fleet workhorse',
  large: 'High-volume long-haul capacity',
  part: 'Part-load and shared dispatch',
};

export default function RegisterTruck() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [registerError, setRegisterError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [toast, setToast] = useState(null);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setRegisterError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.brokerId) {
      setRegisterError('Select which broker this truck will belong to.');
      return;
    }
    if (!form.registration.trim()) {
      setRegisterError('Registration number is required.');
      return;
    }
    if (!REGISTRATION_REGEX.test(form.registration.trim())) {
      setRegisterError('Registration number looks invalid, e.g. MH-12-AB-1234.');
      return;
    }
    if (!form.capacity.trim()) {
      setRegisterError('Capacity is required.');
      return;
    }

    setRegistering(true);
    try {
      const res = await api.post('/api/vehicles/trucks', {
        broker_id: form.brokerId,
        registration: form.registration.trim(),
        type: form.category,
        category: form.category,
        capacity: form.capacity.trim(),
        make: form.make.trim() || undefined,
        year: Number(form.year) || undefined,
        insurance_expiry: form.insuranceExpiry || undefined,
      }, getToken());
      if (!res.success) throw new Error(res.message || 'Failed to register truck');
      setToast({ message: `${form.registration.trim()} registered successfully`, type: 'success' });
      navigate('/trucks');
    } catch (err) {
      setRegisterError(err.message || 'Failed to register truck.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleSubmit} className="card p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <TruckIcon size={22} />
            </div>
            <div>
              <h2 className="font-poppins text-xl font-semibold text-secondary">Truck Registration</h2>
              <p className="text-sm text-neutral-500">Create a clean fleet record with the right broker, category, and compliance details.</p>
            </div>
          </div>

          <div className="mt-8 space-y-8">
            <div>
              <label className="form-label">Broker *</label>
              <BrokerPicker value={form.brokerId} onChange={(id) => setField('brokerId', id)} />
              <p className="mt-1 text-[11px] text-neutral-400">The truck will be added to this broker&apos;s fleet.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="form-label">Registration Number *</label>
                <input
                  type="text"
                  value={form.registration}
                  onChange={(event) => setField('registration', event.target.value.toUpperCase())}
                  className="form-input"
                  placeholder="MH-12-AB-1234"
                />
              </div>
              <div>
                <label className="form-label">Truck Type *</label>
                <select value={form.category} onChange={(event) => setField('category', event.target.value)} className="form-select">
                  {TRUCK_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat[0].toUpperCase() + cat.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Capacity *</label>
                <input
                  type="text"
                  value={form.capacity}
                  onChange={(event) => setField('capacity', event.target.value)}
                  className="form-input"
                  placeholder="8 Ton / 14 FT"
                />
              </div>
              <div>
                <label className="form-label">Make / Model</label>
                <input
                  type="text"
                  value={form.make}
                  onChange={(event) => setField('make', event.target.value)}
                  className="form-input"
                  placeholder="Tata Signa"
                />
              </div>
              <div>
                <label className="form-label">Year</label>
                <input
                  type="text"
                  value={form.year}
                  onChange={(event) => setField('year', event.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="form-input"
                  placeholder="2023"
                />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Insurance Expiry</label>
                <input
                  type="date"
                  value={form.insuranceExpiry}
                  onChange={(event) => setField('insuranceExpiry', event.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            {registerError && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-danger">{registerError}</div>}

            <div className="flex flex-wrap justify-end gap-3 border-t border-neutral-100 pt-6">
              <button type="button" onClick={() => navigate('/trucks')} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={registering} className="btn-primary disabled:opacity-60">
                {registering ? 'Registering...' : 'Register Truck'}
              </button>
            </div>
          </div>
        </form>

        <aside className="space-y-6">
          <div className="card overflow-hidden">
            <div className="border-b border-neutral-100 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_100%)] px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700/70">Live preview</p>
              <h3 className="mt-2 font-poppins text-lg font-semibold text-secondary">Truck card before submission</h3>
            </div>
            <div className="p-6">
              <div className="rounded-[26px] border border-neutral-100 bg-white p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-poppins text-lg font-semibold text-secondary">{form.registration || 'MH-12-AB-1234'}</p>
                    <p className="mt-1 text-sm text-neutral-400">{form.make || 'Make / model'} · {form.category}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Available</span>
                </div>
                <div className="mt-5 flex h-36 items-center justify-center rounded-3xl bg-neutral-50">
                  {TRUCK_IMAGES[form.category] ? (
                    <img src={TRUCK_IMAGES[form.category]} alt={form.category} className="h-24 object-contain" />
                  ) : (
                    <Truck size={42} className="text-neutral-300" />
                  )}
                </div>
                <div className="mt-5 grid gap-3">
                  {[
                    [CircleGauge, 'Capacity', form.capacity || 'Not set'],
                    [Waypoints, 'Use case', CATEGORY_COPY[form.category]],
                    [CalendarClock, 'Insurance', form.insuranceExpiry || 'Not added'],
                  ].map(([Icon, title, copy]) => (
                    <div key={title} className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-neutral-500 shadow-sm">
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-neutral-400">{title}</p>
                        <p className="text-sm font-medium text-secondary">{copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </aside>
      </section>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
