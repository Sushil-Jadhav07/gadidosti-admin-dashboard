// Canonical admin-dashboard page keys — mirrors gadidosti-backend's src/constants/adminPages.js
// and Sidebar.jsx's items. Used both by App.jsx's route guard and Users.jsx's page-access editor.
export const PAGE_KEYS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'drivers', label: 'Lorry Owners' },
  { key: 'trucks', label: 'Trucks' },
  { key: 'tracking', label: 'Live Tracking' },
  { key: 'chats', label: 'Chats' },
  { key: 'monthly_hiring', label: 'Monthly Hiring' },
  { key: 'users', label: 'Users' },
  { key: 'brokers', label: 'Brokers' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'invoices', label: 'Invoices & Receipts' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'disputes', label: 'Disputes' },
  { key: 'kyc', label: 'KYC' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'settings', label: 'Settings' },
  { key: 'legal_pages', label: 'Legal Pages' },
];

// admin = always full access (superadmin, never checked). staff/gps_owner = only what's been
// explicitly granted, empty by default — gps_owner is mechanically identical to staff here, just
// a distinct label for an account meant to only ever be granted the 'tracking' page. Anyone else
// (shouldn't reach this dashboard at all) = no access.
export const hasPageAccess = (user, pageKey) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'staff' || user.role === 'gps_owner') return (user.page_permissions || []).includes(pageKey);
  return false;
};
