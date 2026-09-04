import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Radar, ClipboardList, Truck, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

const FEATURES = [
  { icon: Radar, label: 'Live GPS tracking for every truck on the road' },
  { icon: ClipboardList, label: 'End-to-end booking management' },
  { icon: Truck, label: 'Fleet, driver & broker oversight in one place' },
  { icon: ShieldCheck, label: 'Built-in KYC & compliance workflows' },
];

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { email, password });
      if (data.success) {
        onLogin(data.data.user, data.data.tokens);
      } else {
        setError(data.message || 'Invalid email or password.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left — brand panel, full height, blue throughout. Hidden below lg so the form gets
          the full (small) screen on mobile instead of being squeezed under this. */}
      <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-primary-dark p-12 xl:p-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-light/25 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[28rem] h-[28rem] bg-primary-light/15 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <div className="inline-flex bg-white rounded-xl px-3 py-2 shadow-lg">
            <img src="/gadidost-logo.png" alt="GadiDost" className="h-8 w-auto object-contain" />
          </div>
          <span className="block mt-3 text-xs font-semibold text-white/50 tracking-widest uppercase">
            Admin Panel
          </span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl xl:text-4xl font-poppins font-bold text-white leading-tight">
            Run your logistics operations from one place.
          </h1>
          <p className="text-white/60 text-sm mt-3">
            Bookings, fleet, drivers and disputes — everything your team needs to keep shipments moving.
          </p>

          <div className="mt-9 space-y-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-white" />
                </span>
                <span className="text-sm text-white/80">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/30 text-xs">© 2024 SSK Logistics · GadiDost</p>
      </div>

      {/* Right — the form, unchanged behavior, just given the whole column instead of a
          floating card. */}
      <div className="flex flex-col items-center justify-center bg-white p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <img src="/gadidost-logo.png" alt="GadiDost" className="h-12 w-auto object-contain mb-2" />
            <span className="text-xs font-semibold text-neutral-400 tracking-widest uppercase">
              Admin Panel
            </span>
          </div>

          <h2 className="text-2xl font-poppins font-bold text-secondary mb-1">Welcome back</h2>
          <p className="text-sm text-neutral-500 mb-8">Sign in to your admin account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ssklogistics.in"
                  required
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5">
                <AlertCircle size={15} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-all duration-200 mt-2 flex items-center justify-center gap-2 shadow-md shadow-primary/25"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-neutral-300 text-xs mt-8 lg:hidden">© 2024 SSK Logistics · GadiDost</p>
        </div>
      </div>
    </div>
  );
}
