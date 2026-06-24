import { useState, useEffect, useCallback } from 'react';
import {
  Save, Globe, Bell, Shield, User, Lock,
  Camera, Eye, EyeOff, Mail, Phone, IndianRupee, AlertCircle, CheckCircle,
} from 'lucide-react';
import Toast from '../components/Toast';
import { settingsData } from '../data/mockData';
import { api, getStoredAuth } from '../services/api';

const tabs = [
  { id: 'profile',       label: 'My Profile',    icon: User },
  { id: 'platform',      label: 'Platform',       icon: Globe },
  { id: 'commission',    label: 'Commission',     icon: IndianRupee },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'security',      label: 'Security',       icon: Shield },
];

function Toggle({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <div className="flex-1 pr-6">
        <p className="text-sm font-semibold text-neutral-800">{label}</p>
        {description && <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none ${enabled ? 'bg-primary' : 'bg-neutral-200'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function Field({ label, description, children }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
      {description && <p className="text-xs text-neutral-400 mt-1">{description}</p>}
    </div>
  );
}

function PwField({ label, value, show, onToggleShow, onChange, placeholder }) {
  return (
    <div className="max-w-sm">
      <label className="form-label">{label}</label>
      <div className="relative">
        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="form-input pl-10 pr-10"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [settings, setSettings] = useState(settingsData);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Super Admin',
    joined: '',
  });

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  const getToken = useCallback(() => getStoredAuth()?.tokens?.access_token, []);

  // Load real profile from API
  useEffect(() => {
    const fetchProfile = async () => {
      const token = getToken();
      if (!token) { setProfileLoading(false); return; }
      try {
        const data = await api.get('/api/user/profile', token);
        if (data.success) {
          const u = data.data.user;
          setProfile({
            name: u.name || '',
            email: u.email || '',
            phone: u.phone ? `+91 ${u.phone}` : '',
            role: u.role === 'admin' ? 'Super Admin' : u.role,
            joined: u.created_at
              ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : '',
          });
        }
      } catch {}
      setProfileLoading(false);
    };
    fetchProfile();
  }, [getToken]);

  const saveProfile = async () => {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const data = await api.put('/api/user/profile', { name: profile.name, email: profile.email }, token);
      if (data.success) {
        setToast({ message: 'Profile saved successfully', type: 'success' });
        // Update stored auth with new user data
        const stored = getStoredAuth();
        if (stored) {
          stored.user = { ...stored.user, name: profile.name, email: profile.email };
          localStorage.setItem('ssk_admin_auth', JSON.stringify(stored));
        }
      } else {
        setToast({ message: data.message || 'Failed to save profile', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwords.current || !passwords.next || !passwords.confirm) {
      return setToast({ message: 'Please fill all password fields', type: 'error' });
    }
    if (passwords.next !== passwords.confirm) {
      return setToast({ message: 'New passwords do not match', type: 'error' });
    }
    if (passwords.next.length < 6) {
      return setToast({ message: 'Password must be at least 6 characters', type: 'error' });
    }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const data = await api.put('/api/user/change-password', {
        current_password: passwords.current,
        new_password: passwords.next,
      }, token);
      if (data.success) {
        setPasswords({ current: '', next: '', confirm: '' });
        setToast({ message: 'Password updated successfully', type: 'success' });
      } else {
        setToast({ message: data.message || 'Failed to change password', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const save = (section) => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setToast({ message: `${section} saved successfully`, type: 'success' });
    }, 700);
  };

  const initials = profile.name
    ? profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AU';

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Settings</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Manage your account, platform configuration, and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* ── Left Tab Nav ── */}
        <div className="w-full lg:w-52 flex-shrink-0">
          <div className="card p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left ${
                    active ? 'bg-primary text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  }`}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right Content ── */}
        <div className="flex-1 min-w-0">

          {/* ═══ MY PROFILE ═══ */}
          {activeTab === 'profile' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">My Profile</h3>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{profile.role}</span>
              </div>
              <div className="p-6 space-y-6">
                {profileLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Avatar row */}
                    <div className="flex items-center gap-5 p-4 bg-neutral-50 rounded-2xl">
                      <div className="relative flex-shrink-0">
                        <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-sm">
                          <span className="text-white font-poppins font-bold text-2xl">{initials}</span>
                        </div>
                        <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-secondary rounded-lg flex items-center justify-center border-2 border-white hover:bg-secondary-light transition-colors">
                          <Camera size={12} className="text-white" />
                        </button>
                      </div>
                      <div>
                        <p className="font-poppins font-bold text-secondary text-lg leading-tight">{profile.name}</p>
                        <p className="text-sm text-neutral-500 mt-0.5">{profile.email}</p>
                        {profile.joined && (
                          <p className="text-xs text-neutral-400 mt-2 bg-white border border-neutral-200 rounded-lg px-2.5 py-1 inline-block">
                            Member since {profile.joined}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Full Name">
                        <input
                          type="text"
                          value={profile.name}
                          onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                          className="form-input"
                        />
                      </Field>
                      <Field label="Role">
                        <input
                          type="text"
                          value={profile.role}
                          readOnly
                          className="form-input bg-neutral-50 text-neutral-400 cursor-not-allowed"
                        />
                      </Field>
                      <Field label="Email Address">
                        <div className="relative">
                          <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                          <input
                            type="email"
                            value={profile.email}
                            onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                            className="form-input pl-10"
                          />
                        </div>
                      </Field>
                      <Field label="Phone Number" description="Contact support to change phone number">
                        <div className="relative">
                          <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                          <input
                            type="tel"
                            value={profile.phone}
                            readOnly
                            className="form-input pl-10 bg-neutral-50 text-neutral-400 cursor-not-allowed"
                          />
                        </div>
                      </Field>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-neutral-100">
                      <button onClick={saveProfile} disabled={saving} className="btn-primary">
                        {saving
                          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                          : <><Save size={15} />Save Profile</>}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ═══ PLATFORM ═══ */}
          {activeTab === 'platform' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Platform Information</h3>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Platform Name">
                    <input
                      type="text"
                      value={settings.platformName}
                      onChange={(e) => setSettings((p) => ({ ...p, platformName: e.target.value }))}
                      className="form-input"
                    />
                  </Field>
                  <Field label="Contact Email">
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="email"
                        value={settings.contactEmail}
                        onChange={(e) => setSettings((p) => ({ ...p, contactEmail: e.target.value }))}
                        className="form-input pl-10"
                      />
                    </div>
                  </Field>
                </div>

                <Field label="Platform Logo">
                  <div className="flex items-center gap-4 mt-1.5">
                    <div className="w-16 h-16 rounded-2xl border-2 border-neutral-100 flex items-center justify-center overflow-hidden flex-shrink-0 bg-white">
                      <img src="/gadidost-logo.png" alt="Logo" className="w-full h-full object-contain p-1.5" />
                    </div>
                    <div>
                      <button className="btn-secondary text-xs">Upload New Logo</button>
                      <p className="text-xs text-neutral-400 mt-1.5">PNG or SVG · Max 2 MB · Recommended 256 × 256 px</p>
                    </div>
                  </div>
                </Field>

                <div className="flex justify-end pt-2 border-t border-neutral-100">
                  <button onClick={() => save('Platform')} className="btn-primary">
                    <Save size={15} /> Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ COMMISSION ═══ */}
          {activeTab === 'commission' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Commission Settings</h3>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Default Platform Fee (%)" description="Applied automatically to every booking">
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={settings.commissionRate}
                        onChange={(e) => setSettings((p) => ({ ...p, commissionRate: parseFloat(e.target.value) || 0 }))}
                        className="form-input pr-10"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-semibold">%</span>
                    </div>
                  </Field>
                  <Field label="Minimum Fare (₹)" description="Bookings below this amount are not accepted">
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium">₹</span>
                      <input type="number" defaultValue={500} min={0} className="form-input pl-8" />
                    </div>
                  </Field>
                </div>

                <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4">
                  <p className="text-xs font-bold text-primary mb-1.5">How commission is calculated</p>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Platform fee is deducted before the remaining amount is paid to the broker/driver.
                    At <span className="font-semibold">{settings.commissionRate}%</span>, a ₹10,000 booking yields{' '}
                    <span className="font-semibold text-tertiary">₹{(10000 * (1 - settings.commissionRate / 100)).toLocaleString('en-IN')}</span> to the driver.
                  </p>
                </div>

                <div className="flex justify-end pt-2 border-t border-neutral-100">
                  <button onClick={() => save('Commission')} className="btn-primary">
                    <Save size={15} /> Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ NOTIFICATIONS ═══ */}
          {activeTab === 'notifications' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Notification Preferences</h3>
              </div>
              <div className="p-6">
                <div className="divide-y divide-neutral-100">
                  <Toggle enabled={settings.emailAlerts} onChange={() => setSettings((p) => ({ ...p, emailAlerts: !p.emailAlerts }))} label="Email Alerts" description="Booking confirmations, cancellations, and platform reports via email" />
                  <Toggle enabled={settings.smsAlerts} onChange={() => setSettings((p) => ({ ...p, smsAlerts: !p.smsAlerts }))} label="SMS Alerts" description="Critical alerts and OTPs sent to your registered mobile number" />
                  <Toggle enabled={settings.pushNotifications} onChange={() => setSettings((p) => ({ ...p, pushNotifications: !p.pushNotifications }))} label="Push Notifications" description="Real-time browser notifications for new bookings and open disputes" />
                  <Toggle enabled onChange={() => {}} label="Weekly Summary Report" description="Automated report delivered every Monday at 9 AM IST" />
                </div>
                <div className="flex justify-end pt-4 border-t border-neutral-100 mt-2">
                  <button onClick={() => save('Notification preferences')} className="btn-primary">
                    <Save size={15} /> Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ SECURITY ═══ */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Change Password</h3>
                </div>
                <div className="p-6 space-y-4">
                  <PwField
                    label="Current Password"
                    value={passwords.current} show={showPw.current}
                    onToggleShow={() => setShowPw((p) => ({ ...p, current: !p.current }))}
                    onChange={(v) => setPasswords((p) => ({ ...p, current: v }))}
                    placeholder="Enter your current password"
                  />
                  <PwField
                    label="New Password"
                    value={passwords.next} show={showPw.next}
                    onToggleShow={() => setShowPw((p) => ({ ...p, next: !p.next }))}
                    onChange={(v) => setPasswords((p) => ({ ...p, next: v }))}
                    placeholder="Minimum 6 characters"
                  />
                  <PwField
                    label="Confirm New Password"
                    value={passwords.confirm} show={showPw.confirm}
                    onToggleShow={() => setShowPw((p) => ({ ...p, confirm: !p.confirm }))}
                    onChange={(v) => setPasswords((p) => ({ ...p, confirm: v }))}
                    placeholder="Re-enter new password"
                  />
                  <div className="flex justify-end pt-2 border-t border-neutral-100">
                    <button onClick={handlePasswordChange} disabled={saving} className="btn-primary">
                      {saving
                        ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                        : <><Shield size={15} /> Update Password</>}
                    </button>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Active Session</h3>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between p-4 bg-tertiary/5 border border-tertiary/20 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-tertiary/10 rounded-xl flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-tertiary rounded-full animate-pulse" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-800">Current device</p>
                        <p className="text-xs text-neutral-500 mt-0.5">Windows · Chrome · India</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-tertiary bg-tertiary/10 px-3 py-1 rounded-full">
                      Active now
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-3">Only one session is active at a time. Logging in from a new device will end this session.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
