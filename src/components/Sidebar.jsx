import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Users, Building2, Truck,
  CarFront, IndianRupee, AlertTriangle, Flag, ShieldCheck, BarChart3,
  Settings, Radar, Receipt, MessageCircle,
} from 'lucide-react';

const sections = [
  {
    label: 'Main',
    items: [{ path: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Operations',
    items: [
      { path: '/bookings', label: 'Bookings', icon: ClipboardList },
      { path: '/drivers', label: 'Drivers', icon: CarFront },
      { path: '/trucks', label: 'Trucks', icon: Truck },
      { path: '/tracking', label: 'Live Tracking', icon: Radar },
      { path: '/chats', label: 'Chats', subLabel: 'Trip conversations', icon: MessageCircle },
    ],
  },
  {
    label: 'Management',
    items: [
      { path: '/users', label: 'Users', icon: Users },
      { path: '/brokers', label: 'Brokers', icon: Building2 },
      { path: '/pricing', label: 'Pricing', icon: IndianRupee },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/invoices', label: 'Invoices & Receipts', icon: Receipt },
    ],
  },
  {
    // Both are "something went wrong, admin needs to act" queues — Incidents are
    // driver-reported problems on an active trip, Disputes are client/broker complaints
    // raised on a booking after the fact. Grouped together since they're the same kind
    // of screen even though they're backed by different tables.
    label: 'Issues & Disputes',
    items: [
      { path: '/incidents', label: 'Incidents', subLabel: 'Reported by drivers', icon: AlertTriangle },
      { path: '/disputes', label: 'Disputes', subLabel: 'Raised by broker/client', icon: Flag },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { path: '/kyc', label: 'KYC', icon: ShieldCheck },
    ],
  },
  {
    label: 'Insights',
    items: [
      { path: '/analytics', label: 'Analytics', icon: BarChart3 },
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

// Always rendered at full width — there used to be a hover-to-expand / icon-only collapsed
// mode here, but the sidebar is now always open, so that state machine (and the props that
// drove it from App.jsx) was dropped rather than left in as dead code.
export default function Sidebar() {
  const location = useLocation();

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-primary z-40 flex flex-col">
      {/* Logo */}
      <div className="flex items-center h-16 border-b border-white/10 px-4 flex-shrink-0">
        <div className="bg-white rounded-xl px-2.5 py-1.5">
          <img src="/gadidost-logo.png" alt="GadiDost" className="h-7 w-auto object-contain" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto no-scrollbar">
        {sections.map((section) => (
          <div key={section.label} className="mb-1">
            <p className="px-4 py-2 text-[10px] font-semibold text-white/50 uppercase tracking-widest">
              {section.label}
            </p>
            <div className="px-2 space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 rounded-xl transition-all duration-200 ${item.subLabel ? 'px-3 py-2' : 'px-3 py-2.5'} ${
                      active ? 'bg-white text-primary font-semibold shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-tight">{item.label}</span>
                      {item.subLabel && (
                        <span className={`block text-[10px] leading-tight ${active ? 'text-primary/60' : 'text-white/50'}`}>
                          {item.subLabel}
                        </span>
                      )}
                    </span>
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
        <p className="text-white/40 text-[11px] font-medium">© 2024 SSK Logistics</p>
      </div>
    </aside>
  );
}
