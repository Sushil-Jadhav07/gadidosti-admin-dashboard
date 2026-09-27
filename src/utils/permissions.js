// Canonical admin-dashboard page keys — mirrors gadidosti-backend's src/constants/adminPages.js
// and Sidebar.jsx's items. Used both by App.jsx's route guard and Users.jsx's page-access editor.
export const PAGE_KEYS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'drivers', label: 'Drivers' },
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
];

// admin = always full access (superadmin, never checked). staff = only what's been explicitly
// granted, empty by default. Anyone else (shouldn't reach this dashboard at all) = no access.
export const hasPageAccess = (user, pageKey) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'staff') return (user.page_permissions || []).includes(pageKey);
  return false;
};
