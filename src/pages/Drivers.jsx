import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { api, getToken } from '../services/api';

const STATUS_LABEL = { available: 'Available', on_trip: 'On Trip', offline: 'Offline' };
const KYC_LABEL = { pending: 'Pending', submitted: 'Pending', verified: 'Verified', rejected: 'Rejected' };

function isLicenseExpiring(dateStr) {
  if (!dateStr) return false;
  const expiry = new Date(dateStr);
  const daysLeft = (expiry - new Date()) / (1000 * 60 * 60 * 24);
  return daysLeft < 60;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// GET /api/vehicles/drivers doesn't join a broker display name (only brokerId) —
// fall back to a shortened id so the column still shows something meaningful.
function shortId(id) {
  return id ? `#${id.slice(0, 8)}` : '—';
}

function mapDriver(d) {
  return {
    id: d.id,
    name: d.name,
    phone: d.phone,
    licenseNo: d.licenseNo || '—',
    licenseExpiry: d.licenseExpiry,
    aadhaar: d.aadhaar || '—',
    broker: d.broker || shortId(d.brokerId),
    truckReg: d.truckReg,
    truckId: d.truckId,
    totalTrips: d.totalTrips ?? 0,
    avatar: d.avatar,
    status: d.status,
    statusLabel: STATUS_LABEL[d.status] || d.status,
    kycStatus: d.kycStatus,
    kycStatusLabel: KYC_LABEL[d.kycStatus] || d.kycStatus,
  };
}

function DriverAvatar({ driver, size = 'w-10 h-10' }) {
  if (driver.avatar) {
    return <img src={driver.avatar} alt={driver.name} className={`${size} rounded-full object-cover`} />;
  }
  const initials = driver.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className={`${size} rounded-full bg-primary/10 flex items-center justify-center`}>
      <span className="text-primary font-semibold text-sm">{initials}</span>
    </div>
  );
}

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const itemsPerPage = 10;

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/vehicles/drivers?limit=100', getToken());
      if (res.success) {
        setDrivers(res.data.drivers.map(mapDriver));
      } else {
        setError(res.message || 'Failed to load drivers');
      }
    } catch {
      setError('Network error — could not load drivers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const filtered = drivers.filter((d) =>
    !searchTerm ||
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone?.includes(searchTerm) ||
    d.licenseNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Drivers</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage drivers and monitor their availability</p>
      </div>

      <div className="card p-4">
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search drivers..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="form-input pl-9"
          />
        </div>
      </div>

      {error && (
        <div className="card p-4 text-sm text-danger flex items-center gap-2">
          <span>{error}</span>
          <button onClick={fetchDrivers} className="underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="card p-10 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>License No. / Expiry</th>
                <th>Assigned Broker</th>
                <th>Truck</th>
                <th>KYC</th>
                <th>Status</th>
                <th className="text-right">Total Trips</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-neutral-400">No data found.</td></tr>
              ) : paginated.map((driver) => (
                <tr key={driver.id}>
                  <td className="font-medium text-neutral-800">{shortId(driver.id)}</td>
                  <td className="font-medium">
                    <div className="flex items-center gap-2">
                      <DriverAvatar driver={driver} size="w-8 h-8" />
                      {driver.name}
                    </div>
                  </td>
                  <td className="whitespace-nowrap">{driver.phone}</td>
                  <td className="text-xs whitespace-nowrap">
                    <div>{driver.licenseNo}</div>
                    <div className={isLicenseExpiring(driver.licenseExpiry) ? 'text-danger font-semibold' : 'text-neutral-400'}>Exp: {formatDate(driver.licenseExpiry)}</div>
                  </td>
                  <td>{driver.broker}</td>
                  <td className="whitespace-nowrap">{driver.truckReg || '—'}</td>
                  <td><Badge status={driver.kycStatusLabel} /></td>
                  <td><Badge status={driver.statusLabel} /></td>
                  <td className="text-right font-medium">{driver.totalTrips}</td>
                  <td className="text-center">
                    <button onClick={() => setSelectedDriver(driver)} className="p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors" title="View Details">
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} entries</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"><ChevronLeft size={16} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
      )}

      <Modal isOpen={!!selectedDriver} onClose={() => setSelectedDriver(null)} title="Driver Details" size="md">
        {selectedDriver && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <DriverAvatar driver={selectedDriver} size="w-14 h-14" />
              <div>
                <h3 className="text-lg font-semibold text-secondary">{selectedDriver.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge status={selectedDriver.statusLabel} />
                  <Badge status={selectedDriver.kycStatusLabel} />
                </div>
              </div>
            </div>
            <div className="bg-neutral-50 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Driver ID</span><span className="font-medium">{shortId(selectedDriver.id)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Phone</span><span className="font-medium">{selectedDriver.phone}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">License Number</span><span className="font-medium">{selectedDriver.licenseNo}</span></div>
              <div className="flex justify-between">
                <span className="text-neutral-500">License Expiry</span>
                <span className={`font-medium ${isLicenseExpiring(selectedDriver.licenseExpiry) ? 'text-danger' : ''}`}>{formatDate(selectedDriver.licenseExpiry)}</span>
              </div>
              <div className="flex justify-between"><span className="text-neutral-500">Aadhaar</span><span className="font-medium">{selectedDriver.aadhaar}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Assigned Broker</span><span className="font-medium">{selectedDriver.broker}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Assigned Truck</span><span className="font-medium">{selectedDriver.truckReg || '—'}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Total Trips</span><span className="font-medium">{selectedDriver.totalTrips}</span></div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedDriver(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
