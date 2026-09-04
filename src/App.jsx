import { Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Toast from './components/Toast';
import ChatLauncher from './components/ChatLauncher';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import ViewBooking from './pages/ViewBooking';
import EditBooking from './pages/EditBooking';
import Users from './pages/Users';
import Brokers from './pages/Brokers';
import Drivers from './pages/Drivers';
import Trucks from './pages/Trucks';
import CreateDriver from './pages/CreateDriver';
import RegisterTruck from './pages/RegisterTruck';
import Pricing from './pages/Pricing';
import Disputes from './pages/Disputes';
import Incidents from './pages/Incidents';
import KYC from './pages/KYC';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Tracking from './pages/Tracking';
import TrackingDetail from './pages/TrackingDetail';
import Invoices from './pages/Invoices';
import Chats from './pages/Chats';
import Login from './pages/Login';
import { api } from './services/api';
import { requestFcmToken, onForegroundMessage } from './lib/firebase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [authData, setAuthData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ssk_admin_auth')); } catch { return null; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pushToast, setPushToast] = useState(null);
  const [chatThreads, setChatThreads] = useState([]);
  const fcmTokenRef = useRef(null);
  const chatThreadsSnapshotRef = useRef(null);
  const navigate = useNavigate();

  const isLoggedIn = !!authData;
  const accessToken = authData?.tokens?.access_token;

  const handleLogin = (user, tokens) => {
    const data = { user, tokens };
    localStorage.setItem('ssk_admin_auth', JSON.stringify(data));
    setAuthData(data);
  };

  const handleLogout = async () => {
    try {
      if (fcmTokenRef.current && accessToken) {
        await api.delete('/api/users/device-token', accessToken, { token: fcmTokenRef.current });
      }
    } catch { /* silently ignore — logging out should never block on this */ }
    try {
      if (authData?.tokens) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authData.tokens.access_token}`,
          },
          body: JSON.stringify({ refresh_token: authData.tokens.refresh_token }),
        });
      }
    } catch { /* silently ignore */ }
    localStorage.removeItem('ssk_admin_auth');
    setAuthData(null);
  };

  const toggleMobile = () => setMobileOpen(!mobileOpen);

  // Registers (or re-registers, on every login/session-start — see the
  // comment in lib/firebase.js on why that covers rotation on web) the FCM
  // device token right after login. Best-effort: a user who denies the
  // notification permission, or opens this in a browser without push
  // support, should still be able to use the dashboard normally.
  useEffect(() => {
    if (!isLoggedIn || !accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const fcmToken = await requestFcmToken();
        if (cancelled || !fcmToken) return;
        fcmTokenRef.current = fcmToken;
        await api.post('/api/users/device-token', { token: fcmToken, platform: 'web' }, accessToken);
      } catch {
        // Push is a nice-to-have here, not a login blocker.
      }
    })();

    return () => { cancelled = true; };
  }, [isLoggedIn, accessToken]);

  // Foreground push only — background/killed-tab push is handled by
  // public/firebase-messaging-sw.js. Shows a toast; tapping it applies
  // data.type's UI action (currently: booking → open that booking).
  useEffect(() => {
    if (!isLoggedIn) return;
    let unsubscribe = () => {};
    let cancelled = false;

    onForegroundMessage((payload) => {
      const { notification = {}, data = {} } = payload;
      const navigateTo = data.type === 'booking' && data.booking_id
        ? `/bookings?bookingId=${data.booking_id}`
        : null;
      setPushToast({
        message: [notification.title, notification.body].filter(Boolean).join(' — ') || 'New notification',
        navigateTo,
      });
    }).then((unsub) => {
      if (cancelled) unsub();
      else unsubscribe = unsub;
    });

    return () => { cancelled = true; unsubscribe(); };
  }, [isLoggedIn]);

  // Admin isn't a participant on any booking, so it never gets a socket `chat-message` event
  // for someone else's thread — the pragmatic substitute is polling the thread list and
  // toasting only on the delta, app-wide (not just while the Chats page is mounted) so a
  // client typing into the bot, or a broker replying, still surfaces while admin is elsewhere.
  // Pulled out of the effect (as a stable callback) so the floating ChatLauncher can trigger an
  // early tick when it's opened, without needing a second poller of its own.
  const pollChatThreads = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await api.get('/api/chat/threads', accessToken);
      if (!res?.success) return;
      const threads = res.data?.threads || [];
      setChatThreads(threads);
      const previous = chatThreadsSnapshotRef.current;
      if (previous) {
        const updated = threads.find((t) => (
          t.lastMessageAt
          && t.lastSenderRole !== 'admin'
          && new Date(t.lastMessageAt).getTime() > (previous.get(t.threadId) || 0)
        ));
        if (updated) {
          setPushToast({
            message: `New chat activity — ${updated.bookingNumber || 'a booking'}: ${updated.lastMessage || 'New message'}`,
            navigateTo: '/chats',
          });
        }
      }
      chatThreadsSnapshotRef.current = new Map(threads.map((t) => [t.threadId, new Date(t.lastMessageAt || 0).getTime()]));
    } catch {
      // Best-effort — the next tick will just diff against a slightly older snapshot.
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isLoggedIn || !accessToken) return;
    pollChatThreads();
    const interval = setInterval(pollChatThreads, 45000);
    return () => clearInterval(interval);
  }, [isLoggedIn, accessToken, pollChatThreads]);

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F6F8F7]">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)}></div>
          <div className="absolute left-0 top-0 h-full">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="lg:ml-64">
        <TopBar onMenuClick={toggleMobile} onLogout={handleLogout} user={authData?.user} />
        <main className="px-4 pt-4 pb-8 lg:px-6 lg:pt-5 lg:pb-1 min-h-[calc(100vh-4rem)]">
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/bookings"  element={<Bookings />} />
            <Route path="/bookings/:id/edit" element={<EditBooking />} />
            <Route path="/bookings/:id" element={<ViewBooking />} />
            <Route path="/users"     element={<Users />} />
            <Route path="/brokers"   element={<Brokers />} />
            <Route path="/drivers"   element={<Drivers />} />
            <Route path="/drivers/create" element={<CreateDriver />} />
            <Route path="/trucks"    element={<Trucks />} />
            <Route path="/trucks/create" element={<RegisterTruck />} />
            <Route path="/tracking"        element={<Tracking />} />
            <Route path="/tracking/:imei"  element={<TrackingDetail />} />
            <Route path="/invoices"  element={<Invoices />} />
            <Route path="/chats"     element={<Chats />} />
            <Route path="/pricing"   element={<Pricing />} />
            <Route path="/disputes"  element={<Disputes />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/kyc"       element={<KYC />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings"  element={<Settings />} />
          </Routes>
        </main>
      </div>

      {pushToast && (
        <Toast
          message={pushToast.message}
          type="info"
          onClose={() => setPushToast(null)}
          onClick={pushToast.navigateTo ? () => { navigate(pushToast.navigateTo); setPushToast(null); } : undefined}
        />
      )}

      <ChatLauncher threads={chatThreads} onRefresh={pollChatThreads} />
    </div>
  );
}
