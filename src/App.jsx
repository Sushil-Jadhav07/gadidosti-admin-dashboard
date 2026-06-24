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

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('ssk_auth') === 'true');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogin = () => {
    localStorage.setItem('ssk_auth', 'true');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('ssk_auth');
    setIsLoggedIn(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
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
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)}></div>
          <div className="absolute left-0 top-0 h-full">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        <TopBar onMenuClick={toggleMobile} sidebarCollapsed={sidebarCollapsed} onLogout={handleLogout} />
        <main className="px-4 pt-4 pb-8 lg:px-6 lg:pt-5 lg:pb-10 min-h-[calc(100vh-4rem)]">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/users" element={<Users />} />
            <Route path="/brokers" element={<Brokers />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/trucks" element={<Trucks />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/disputes" element={<Disputes />} />
            <Route path="/kyc" element={<KYC />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
