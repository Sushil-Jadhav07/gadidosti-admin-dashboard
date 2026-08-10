import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Radar, History } from 'lucide-react';
import Badge from '../components/Badge';
import MapView from '../components/MapView';
import { api, getToken } from '../services/api';
import { buildTruckIcon } from '../lib/truckIcon';

const POLL_INTERVAL_MS = 15000;

function statusLabel(status) {
  return status === 'online' ? 'Available' : 'Offline';
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const FIELDS = [
  ['deviceId', 'Device ID'],
  ['name', 'Tracker Name'],
  ['deviceImei', 'Vehicle IMEI'],
  ['type', 'Vehicle Type'],
  ['phone', 'Tracker Phone'],
  ['speed', 'Speed (km/hr)'],
  ['course', 'Heading (degrees)'],
  ['totalDistance', 'Total Distance'],
  ['ignition', 'Ignition'],
  ['alarm', 'Alarm'],
  ['deviceFixTime', 'Last GPS Fix'],
  ['lastUpdate', 'Last Server Update'],
];

function formatFieldValue(key, value) {
  if (value == null || value === '') return '—';
  if (key === 'ignition') return value === true ? 'On' : value === false ? 'Off' : '—';
  if (key === 'lastUpdate' || key === 'deviceFixTime') return formatDateTime(value);
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
        setDevice(res.data.device);
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
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Radar size={24} className="text-primary" />
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
                <div className="flex items-center justify-center bg-neutral-50 rounded-xl" style={{ height: '480px' }}>
                  <p className="text-sm text-neutral-500">No location reported yet for this device.</p>
                </div>
              )}
            </div>

            <div className="card p-4">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">Device Details</p>
              <div className="bg-neutral-50 rounded-lg p-4 space-y-3 text-sm">
                {FIELDS.map(([key, label]) => (
                  <div key={key} className="flex justify-between gap-3">
                    <span className="text-neutral-500">{label}</span>
                    <span className="font-medium text-right">{formatFieldValue(key, device[key])}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
