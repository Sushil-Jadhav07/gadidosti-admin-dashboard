// Generated initials avatar — used wherever we need to show a person (client, driver) but
// don't have a real photo URL for them. Color is derived from the name so the same person
// always gets the same color.
export default function Avatar({ name, size = 28 }) {
  const initials = (name || '?').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const hue = Array.from(name || '?').reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 text-white text-[11px] font-semibold"
      style={{ width: size, height: size, backgroundColor: `hsl(${hue}, 45%, 42%)` }}
    >
      {initials || '?'}
    </div>
  );
}
