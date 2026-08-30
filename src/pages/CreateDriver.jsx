import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Copy, IdCard, Mail, Phone, ShieldCheck, Truck, UserPlus } from 'lucide-react';
import BrokerPicker from '../components/BrokerPicker';
import Toast from '../components/Toast';
import { api, getToken } from '../services/api';

const EMPTY_FORM = { brokerId: '', name: '', phone: '', email: '', licenseNo: '', licenseExpiry: '', aadhaar: '', truckId: '' };

const formatAadhaar = (digits) => {
  const groups = [];
  for (let i = 0; i < digits.length; i += 4) groups.push(digits.slice(i, i + 4));
  return groups.map((g, i) => (i === groups.length - 1 ? g : 'X'.repeat(g.length))).join('-');
};

const FIELD_SPECS = [
  { key: 'name', label: 'Full Name', placeholder: 'Ramesh Kumar', required: true },
  { key: 'phone', label: 'Phone Number', placeholder: '10-digit phone number', required: true, icon: Phone },
  { key: 'email', label: 'Email Address', placeholder: 'driver@example.com', required: true, type: 'email', icon: Mail },
  { key: 'licenseNo', label: 'License Number', placeholder: 'MH-2020123456789', icon: IdCard },
  { key: 'licenseExpiry', label: 'License Expiry', type: 'date', icon: BadgeCheck },
];

export default function CreateDriver() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [aadhaarDigits, setAadhaarDigits] = useState('');
  const [errors, setErrors] = useState({});
  const [registering, setRegistering] = useState(false);
  const [trucks, setTrucks] = useState([]);
  const [loadingTrucks, setLoadingTrucks] = useState(false);
  const [truckError, setTruckError] = useState('');
  const [toast, setToast] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const loadTrucks = async () => {
      setLoadingTrucks(true);
      setTruckError('');
      try {
        const res = await api.get('/api/vehicles/trucks?limit=100', getToken());
        if (!cancelled) {
          if (res.success) setTrucks(res.data.trucks || []);
          else setTruckError(res.message || 'Failed to load trucks.');
        }
      } catch {
        if (!cancelled) setTruckError('Network error while loading trucks.');
      } finally {
        if (!cancelled) setLoadingTrucks(false);
      }
    };
    loadTrucks();
    return () => { cancelled = true; };
  }, []);

  const availableTrucksForBroker = useMemo(
    () => trucks.filter((truck) => truck.brokerId === form.brokerId && !truck.driverId),
    [trucks, form.brokerId]
  );

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const validate = () => {
    const next = {};
    if (!form.brokerId) next.brokerId = 'Select which broker this driver will belong to.';
    if (!form.name.trim()) next.name = 'Name is required.';
    if (form.phone.replace(/\D/g, '').length !== 10) next.phone = 'Enter a valid 10-digit phone number.';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    if (form.licenseExpiry) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(form.licenseExpiry) < today) next.licenseExpiry = 'License expiry cannot be in the past.';
    }
    if (aadhaarDigits && aadhaarDigits.length !== 12) next.aadhaar = 'Aadhaar must be 12 digits.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setRegistering(true);
    try {
      const res = await api.post('/api/vehicles/drivers/register', {
        broker_id: form.brokerId,
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, ''),
        email: form.email.trim(),
        license_no: form.licenseNo.trim() || undefined,
        license_expiry: form.licenseExpiry || undefined,
        aadhaar: aadhaarDigits.length === 12 ? aadhaarDigits : undefined,
        truck_id: form.truckId || undefined,
      }, getToken());
      if (!res.success) throw new Error(res.message || 'Failed to register driver');
      setResult({
        name: form.name.trim(),
        email: form.email.trim(),
        tempPassword: res.data.tempPassword,
      });
      setToast({ message: `${form.name.trim()} registered successfully`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to register driver', type: 'error' });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {result ? (
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="card p-6 lg:p-8">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-800">
              <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <h2 className="font-poppins text-lg font-semibold">Driver created successfully</h2>
                <p className="mt-1 text-sm">{result.name} is now part of the selected broker fleet.</p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-neutral-100 bg-neutral-50 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">Share these credentials once</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs text-neutral-400">Email</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-800">{result.email}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-neutral-400">Temporary Password</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-neutral-800">{result.tempPassword}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(result.tempPassword);
                        setToast({ message: 'Password copied', type: 'success' });
                      }}
                      className="rounded-xl border border-neutral-200 p-2 text-neutral-500 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                    >
                      <Copy size={15} />
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-amber-600">This password is shown only once. Ask the driver to change it after first login.</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => navigate('/drivers')} className="btn-primary">Return To Drivers</button>
              <button
                type="button"
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setAadhaarDigits('');
                  setErrors({});
                  setResult(null);
                }}
                className="btn-secondary"
              >
                Create Another Driver
              </button>
            </div>
          </div>

          <aside className="card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">What happens next</p>
            <div className="mt-4 space-y-4">
              {[
                ['Send login details', 'The driver uses email and temporary password to sign in.'],
                ['Complete profile setup', 'Aadhaar and licence info help operations verify readiness faster.'],
                ['Assign a truck', 'If you skipped assignment now, the driver can be mapped later from fleet ops.'],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                  <p className="font-medium text-secondary">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">{copy}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={handleSubmit} className="card p-6 lg:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserPlus size={22} />
              </div>
              <div>
                <h2 className="font-poppins text-xl font-semibold text-secondary">Driver Information</h2>
                <p className="text-sm text-neutral-500">Capture contact, compliance, and fleet ownership in one place.</p>
              </div>
            </div>

            <div className="mt-8 space-y-8">
              <div className="grid gap-5">
                <div>
                  <label className="form-label">Broker *</label>
                  <BrokerPicker value={form.brokerId} onChange={(id) => { setField('brokerId', id); setField('truckId', ''); }} />
                  {errors.brokerId && <p className="mt-1 text-xs text-danger">{errors.brokerId}</p>}
                  <p className="mt-1 text-[11px] text-neutral-400">The driver will be added to this broker&apos;s fleet.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {FIELD_SPECS.map((field) => {
                  const Icon = field.icon;
                  const isFull = field.key === 'name';
                  return (
                    <div key={field.key} className={isFull ? 'md:col-span-2' : ''}>
                      <label className="form-label">{field.label}{field.required ? ' *' : ''}</label>
                      <div className="relative">
                        {Icon && <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />}
                        <input
                          type={field.type || 'text'}
                          value={form[field.key]}
                          onChange={(event) => {
                            const nextValue = field.key === 'phone'
                              ? event.target.value.replace(/\D/g, '').slice(0, 10)
                              : event.target.value;
                            setField(field.key, nextValue);
                          }}
                          className={`form-input ${Icon ? 'pl-10' : ''} ${field.key === 'phone' ? 'font-mono' : ''}`}
                          placeholder={field.placeholder}
                        />
                      </div>
                      {errors[field.key] && <p className="mt-1 text-xs text-danger">{errors[field.key]}</p>}
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="form-label">Aadhaar</label>
                  <input
                    value={formatAadhaar(aadhaarDigits)}
                    onChange={(event) => {
                      setAadhaarDigits(event.target.value.replace(/\D/g, '').slice(0, 12));
                      setErrors((current) => ({ ...current, aadhaar: '' }));
                    }}
                    className="form-input font-mono"
                    placeholder="XXXX-XXXX-1234"
                  />
                  {errors.aadhaar && <p className="mt-1 text-xs text-danger">{errors.aadhaar}</p>}
                </div>
                <div>
                  <label className="form-label">Assign Truck</label>
                  <select
                    value={form.truckId}
                    onChange={(event) => setField('truckId', event.target.value)}
                    className="form-select"
                    disabled={!form.brokerId || loadingTrucks}
                  >
                    <option value="">{!form.brokerId ? 'Select broker first' : 'No truck assigned'}</option>
                    {availableTrucksForBroker.map((truck) => (
                      <option key={truck.id} value={truck.id}>{truck.registration}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-neutral-400">
                    {loadingTrucks ? 'Loading available trucks...' : 'Only unassigned trucks for the selected broker are shown.'}
                  </p>
                  {truckError && <p className="mt-1 text-xs text-danger">{truckError}</p>}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-neutral-100 pt-6">
                <button type="button" onClick={() => navigate('/drivers')} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={registering} className="btn-primary disabled:opacity-60">
                  {registering ? 'Creating Driver...' : 'Create Driver'}
                </button>
              </div>
            </div>
          </form>

          <aside className="space-y-6">
            <div className="card overflow-hidden">
              <div className="border-b border-neutral-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ecfdf5_100%)] px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Operational checklist</p>
                <h3 className="mt-2 font-poppins text-lg font-semibold text-secondary">Build a complete driver record from the start.</h3>
              </div>
              <div className="space-y-4 p-6">
                {[
                  [Phone, 'Primary contact', 'Use the active phone number the operations team reaches on trip day.'],
                  [Mail, 'Login identity', 'Email becomes the sign-in credential for the driver app.'],
                  [Truck, 'Truck assignment', 'Optional during onboarding, useful when the fleet is already fixed.'],
                ].map(([Icon, title, copy]) => (
                  <div key={title} className="flex gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-secondary">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-neutral-500">{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Before submitting</p>
              <div className="mt-4 space-y-3">
                {[
                  'Broker is selected correctly.',
                  'Phone and email belong to the actual driver.',
                  'Licence expiry is not already in the past.',
                  'Aadhaar is complete if you choose to enter it.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-neutral-600">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
