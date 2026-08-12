// Builds a rotated truck marker icon for live-tracking positions — a plain <Marker icon="..."/>
// URL can't rotate a PNG, but wrapping it in an inline SVG <image> with a rotate() transform
// can. headingDeg comes from the Bolt GPS device's `course` field (a string per the vendor's
// spec, e.g. "75" — Number.isFinite doesn't coerce strings, so it's coerced with Number()
// first or it'd always fall back to 0). Defaults to 0 (pointing up/north) when unknown rather
// than skipping rotation entirely.
//
// The <image> href MUST be an absolute URL, not "/truck/truck-marker.png" — this whole SVG is
// itself embedded as a data: URI (no origin of its own), and Google Maps loads marker icons via
// its own internal image-loading path rather than a normal same-document <img> tag, so a
// relative href has no reliable base to resolve against and silently fails to load — the
// marker renders as nothing (no dot) rather than an error. window.location.origin gives it an
// explicit, unambiguous base.
export const buildTruckIcon = (headingDeg) => {
  const numericHeading = Number(headingDeg);
  const angle = Number.isFinite(numericHeading) ? numericHeading : 0;
  const iconUrl = `${window.location.origin}/truck/truck-marker.png`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">` +
    `<g transform="rotate(${angle} 20 20)"><image href="${iconUrl}" x="4" y="4" width="32" height="32" /></g>` +
    `</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};
