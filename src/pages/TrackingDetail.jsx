import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, History } from 'lucide-react';
import Badge from '../components/Badge';
import MapView from '../components/MapView';
import { api, getToken } from '../services/api';
import { buildTruckIcon } from '../lib/truckIcon';

const POLL_INTERVAL_MS = 15000;
const TRUCK_IMAGE = '/truck/truck-marker.png';

function statusLabel(status) {
  return status === 'online' ? 'Available' : 'Offline';
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Vendor sends enum-ish values as camelCase ("lowBattery") or snake_case
// ("In_Motion") depending on the field — normalize both into "Low Battery" / "In Motion".
function humanize(value) {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

// Bolt GPS reports distance in meters — raw values like 20300806.61 aren't
// readable, so every distance-ish field is shown in km instead.
function formatKm(value) {
  return `${(Number(value) / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} km`;
}

function formatYesNo(value) {
  return value === true || value === 'true' || value === 1 || value === '1' ? 'Yes' : 'No';
}

const FIELD_GROUPS = [
  {
    title: 'Identity',
    fields: [
      ['deviceId', 'Device ID'],
      ['name', 'Tracker Name'],
      ['deviceImei', 'Vehicle IMEI'],
      ['type', 'Vehicle Type'],
      ['phone', 'Tracker Phone'],
      ['status', 'Connection Status'],
      ['vehicle_status', 'Vehicle Status'],
    ],
  },
  {
    title: 'Motion',
    fields: [
      ['speed', 'Speed (km/hr)'],
      ['course', 'Heading (degrees)'],
      ['ignition', 'Ignition'],
      ['armed', 'Armed'],
      ['valid', 'GPS Fix Valid'],
    ],
  },
  {
    title: 'Power & Sensors',
    fields: [
      ['batteryLevel', 'Battery Level'],
      ['external_power', 'External Power'],
      ['ac', 'AC'],
      ['fuel', 'Fuel'],
      ['soc', 'State of Charge'],
      ['temperature', 'Temperature'],
      ['alarm', 'Alarm'],
    ],
  },
  {
    title: 'Distance & Location',
    fields: [
      ['totalDistance', 'Total Distance'],
      ['daily_distance', 'Daily Distance'],
      ['prevOdometer', 'Previous Odometer'],
      ['latitude', 'Latitude'],
      ['longitude', 'Longitude'],
    ],
  },
  {
    title: 'History & Meta',
    fields: [
      ['harshAccelerationHistory', 'Harsh Acceleration Events'],
      ['harshBrakingHistory', 'Harsh Braking Events'],
      ['region', 'Region'],
      ['dealer', 'Dealer'],
      ['posId', 'Position ID'],
      ['deviceFixTime', 'Last GPS Fix'],
      ['deviceTime', 'Device Time'],
      ['lastUpdate', 'Last Server Update'],
    ],
  },
];

const KM_FIELDS = new Set(['totalDistance', 'daily_distance', 'prevOdometer']);
const YES_NO_FIELDS = new Set(['armed', 'valid']);
const HUMANIZED_FIELDS = new Set(['alarm', 'vehicle_status']);
const DATE_FIELDS = new Set(['lastUpdate', 'deviceFixTime', 'deviceTime']);
const HISTORY_FIELDS = new Set(['harshAccelerationHistory', 'harshBrakingHistory']);

function formatFieldValue(key, value) {
  if (HISTORY_FIELDS.has(key)) return Array.isArray(value) && value.length ? `${value.length} event${value.length === 1 ? '' : 's'}` : 'None';
  if (value == null || value === '') return '—';
  if (key === 'ignition') return value === true || value === 'true' ? 'On' : value === false || value === 'false' ? 'Off' : '—';
  if (YES_NO_FIELDS.has(key)) return formatYesNo(value);
  if (DATE_FIELDS.has(key)) return formatDateTime(value);
  if (KM_FIELDS.has(key)) return formatKm(value);
  if (key === 'batteryLevel') return `${value}%`;
  if (key === 'latitude' || key === 'longitude') return Number(value).toFixed(6);
  if (key === 'status') return statusLabel(value);
  if (HUMANIZED_FIELDS.has(key)) return humanize(value);
  return String(value);
}

export default function TrackingDetail() {
  const { imei } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDevice = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const res = await api.get(`/api/tracking/devices/imei/${imei}`, getToken());
      if (res.success) {
        // The endpoint wraps the device in an array (`data.device: [ {...} ]`) even
        // though it's always a single device for a given IMEI — unwrap it here so the
        // rest of the component can keep treating `device` as a plain object.
        const raw = res.data.device;
        setDevice(Array.isArray(raw) ? raw[0] || null : raw);
        setError('');
      } else if (!silent) {
        setError(res.message || 'Device not found');
      }
    } catch {
      if (!silent) setError('Network error — could not load this device');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [imei]);

  useEffect(() => {
    fetchDevice();
    const interval = setInterval(() => fetchDevice({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchDevice]);

  const marker = device && device.latitude != null && device.longitude != null
    ? [{ id: device.deviceImei, position: { lat: Number(device.latitude), lng: Number(device.longitude) }, iconUrl: buildTruckIcon(device.course), title: device.name }]
    : [];

  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={() => navigate('/tracking')} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-secondary transition-colors">
        <ArrowLeft size={15} /> Back to Live Tracking
      </button>

      {error && (
        <div className="card p-4 text-sm text-danger flex items-center gap-2">
          <span>{error}</span>
          <button onClick={() => fetchDevice()} className="underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="card p-10 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : device ? (
        <>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src={TRUCK_IMAGE} alt="" className="w-11 h-11 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-poppins font-bold text-secondary">{device.name || 'Unnamed device'}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge status={statusLabel(device.status)} />
                <span className="text-xs text-neutral-400 font-mono">{device.deviceImei}</span>
              </div>
            </div>
          </div>

          {device.source === 'cached' && (
            <div className="card p-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 flex items-center gap-2">
              <History size={16} className="flex-shrink-0" />
              <span>Live tracking is unavailable right now — showing the last known position{device.lastSeenAt ? `, from ${formatDateTime(device.lastSeenAt)}` : ''}.</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-2 overflow-hidden">
              {marker.length ? (
                <MapView markers={marker} height="480px" />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 bg-neutral-50 rounded-xl" style={{ height: '480px' }}>
                  <img src={TRUCK_IMAGE} alt="" className="w-24 h-24 object-contain opacity-50" />
                  <p className="text-sm text-neutral-500">No location reported yet for this device.</p>
                </div>
              )}
            </div>

            <div className="card p-4 space-y-5">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Device Details</p>
              {FIELD_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-2">{group.title}</p>
                  <div className="bg-neutral-50 rounded-lg p-4 space-y-3 text-sm">
                    {group.fields.map(([key, label]) => (
                      <div key={key} className="flex justify-between gap-3">
                        <span className="text-neutral-500">{label}</span>
                        <span className="font-medium text-right">{formatFieldValue(key, device[key])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        // Shouldn't normally happen (a failed/empty fetch sets `error` above instead) — but
        // rendering nothing here previously meant the whole page looked silently blank with no
        // way to tell what went wrong. Always show something actionable instead.
        <div className="card p-10 flex flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-neutral-500">Couldn't load this device's details.</p>
          <button onClick={() => fetchDevice()} className="text-sm text-primary underline">Retry</button>
        </div>
      )}
    </div>
  );
}
