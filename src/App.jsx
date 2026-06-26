import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import Users from './pages/Users';
import Brokers from './pages/Brokers';
import Drivers from './pages/Drivers';
import Trucks from './pages/Trucks';
import Pricing from './pages/Pricing';
import Disputes from './pages/Disputes';
import KYC from './pages/KYC';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Login from './pages/Login';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [authData, setAuthData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ssk_admin_auth')); } catch { return null; }
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoggedIn = !!authData;

  const handleLogin = (user, tokens) => {
    const data = { user, tokens };
    localStorage.setItem('ssk_admin_auth', JSON.stringify(data));
    setAuthData(data);
  };

  const handleLogout = async () => {
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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
  const toggleMobile = () => setMobileOpen(!mobileOpen);

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)}></div>
          <div className="absolute left-0 top-0 h-full">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        <TopBar onMenuClick={toggleMobile} sidebarCollapsed={sidebarCollapsed} onLogout={handleLogout} user={authData?.user} />
        <main className="px-4 pt-4 pb-8 lg:px-6 lg:pt-5 lg:pb-10 min-h-[calc(100vh-4rem)]">
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/bookings"  element={<Bookings />} />
            <Route path="/users"     element={<Users />} />
            <Route path="/brokers"   element={<Brokers />} />
            <Route path="/drivers"   element={<Drivers />} />
            <Route path="/trucks"    element={<Trucks />} />
            <Route path="/pricing"   element={<Pricing />} />
            <Route path="/disputes"  element={<Disputes />} />
            <Route path="/kyc"       element={<KYC />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings"  element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
