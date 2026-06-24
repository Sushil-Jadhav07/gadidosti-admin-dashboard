import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Users, Building2, Truck,
  CarFront, IndianRupee, AlertTriangle, ShieldCheck, BarChart3,
  Settings, ChevronLeft, ChevronRight,
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
    label: 'Compliance',
    items: [
      { path: '/disputes', label: 'Disputes', icon: AlertTriangle },
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

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-secondary z-40 transition-all duration-300 flex flex-col ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className={`flex items-center h-16 border-b border-white/10 flex-shrink-0 ${collapsed ? 'justify-center px-2' : 'px-4 justify-between'}`}>
        {!collapsed && (
          <>
            <div className="bg-white rounded-xl px-2.5 py-1.5">
              <img src="/gadidost-logo.png" alt="GadiDost" className="h-7 w-auto object-contain" />
            </div>
            <button onClick={onToggle} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
              <ChevronLeft size={16} />
            </button>
          </>
        )}
        {collapsed && (
          <button onClick={onToggle} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden">
            <img src="/gadidost-logo.png" alt="GD" className="h-6 w-auto object-contain object-left" style={{ minWidth: 56, marginLeft: -4 }} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin">
        {sections.map((section) => (
          <div key={section.label} className="mb-1">
            {!collapsed && (
              <p className="px-4 py-2 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
                {section.label}
              </p>
            )}
            {collapsed && <div className="mx-3 my-1.5 h-px bg-white/10" />}
            <div className="px-2 space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 rounded-xl transition-all duration-200 ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5'} ${active ? 'bg-primary text-white shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/8'}`}
                  >
                    <Icon size={collapsed ? 20 : 18} className="flex-shrink-0" />
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                    {!collapsed && active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
          <p className="text-white/25 text-[11px] font-medium">© 2024 SSK Logistics</p>
        </div>
      )}
    </aside>
  );
}
