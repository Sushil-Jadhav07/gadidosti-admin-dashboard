// Display-only rename: admins now see the driver role called "Lorry Owner" everywhere in this
// dashboard, but the backend role value itself stays 'driver' (DB, API payloads, route params,
// permission keys) — nothing outside what's rendered on screen changes. Every place that shows
// a user's role as text should go through this instead of a plain capitalize, so the one role
// that needs a different word than its own capitalized value can't drift between screens.
export const roleLabel = (role) => {
  if (!role) return '';
  if (role === 'driver') return 'Lorry Owner';
  if (role === 'gps_owner') return 'GPS Owner';
  return role.charAt(0).toUpperCase() + role.slice(1);
};
