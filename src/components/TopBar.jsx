import { Bell, Search, User, Menu, LogOut } from 'lucide-react';
import { useState } from 'react';

export default function TopBar({ onMenuClick, sidebarCollapsed, onLogout }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-neutral-200/80 h-16 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neutral-100 text-neutral-600 transition-colors">
          <Menu size={20} />
        </button>
        <img src="/gadidost-logo.png" alt="GadiDost" className="h-7 w-auto object-contain lg:hidden" />
        <div className={`relative hidden sm:block transition-all duration-300 ${searchOpen ? 'w-72' : 'w-52'}`}>
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search anything..."
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neutral-100 text-neutral-500 transition-colors">
          <Bell size={19} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full ring-2 ring-white" />
        </button>

        {/* User info */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-neutral-200 ml-1">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <User size={17} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-neutral-800 leading-tight">Admin User</p>
            <p className="text-xs text-neutral-400 leading-tight">Super Admin</p>
          </div>
        </div>

        {/* Logout */}
        <div className="relative">
          <button
            onClick={() => setShowLogout(!showLogout)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
          {showLogout && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLogout(false)} />
              <div className="absolute right-0 top-11 w-60 bg-white border border-neutral-200 rounded-2xl shadow-modal p-4 z-50 animate-fade-in">
                <p className="text-sm font-semibold text-neutral-800 mb-0.5">Sign out?</p>
                <p className="text-xs text-neutral-400 mb-4">You'll need to log in again to access the dashboard.</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowLogout(false)} className="flex-1 btn-secondary py-2 text-xs">Cancel</button>
                  <button onClick={onLogout} className="flex-1 btn-danger py-2 text-xs">Sign out</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
