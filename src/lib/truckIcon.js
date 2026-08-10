// Builds a rotated truck marker icon for live-tracking positions — a plain <Marker icon="..."/>
// URL can't rotate a PNG, but wrapping it in an inline SVG <image> with a rotate() transform
// can. headingDeg comes from the Bolt GPS device's `course` field; defaults to 0 (pointing
// up/north) when unknown rather than skipping rotation entirely.
export const buildTruckIcon = (headingDeg) => {
  const angle = Number.isFinite(headingDeg) ? headingDeg : 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">` +
    `<g transform="rotate(${angle} 20 20)"><image href="/truck/truck-marker.png" x="4" y="4" width="32" height="32" /></g>` +
    `</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};
