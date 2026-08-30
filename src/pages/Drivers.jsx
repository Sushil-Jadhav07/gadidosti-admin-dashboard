import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Phone, Mail, Truck, Plus, MoreVertical, LayoutGrid, List } from 'lucide-react';
import Badge from '../components/Badge';
import { api, getToken } from '../services/api';

const STATUS_LABEL = { available: 'Available', on_trip: 'On Route', offline: 'Off Duty' };
const STATUS_OPTIONS = Object.keys(STATUS_LABEL);
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

function shortId(id) {
  return id ? `#${id.slice(0, 8)}` : '—';
}

function mapDriver(d) {
  return {
    id: d.id,
    name: d.name,
    phone: d.phone,
    email: d.email,
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
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const driversRes = await api.get('/api/vehicles/drivers?limit=100', getToken());
      if (driversRes.success) {
        setDrivers(driversRes.data.drivers.map(mapDriver));
      } else {
        setError(driversRes.message || 'Failed to load drivers');
      }
    } catch {
      setError('Network error — could not load drivers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  useEffect(() => {
    if (!selectedDriver && drivers.length > 0) setSelectedDriver(drivers[0]);
  }, [drivers, selectedDriver]);

  const statusCounts = useMemo(() => {
    const counts = { available: 0, on_trip: 0, offline: 0 };
    drivers.forEach((d) => { if (counts[d.status] !== undefined) counts[d.status] += 1; });
    return counts;
  }, [drivers]);

  const filtered = drivers.filter((d) => {
    const matchStatus = statusTab === 'All' || d.status === statusTab;
    const term = searchTerm.toLowerCase();
    const matchSearch = !term ||
      d.name?.toLowerCase().includes(term) ||
      d.phone?.includes(searchTerm) ||
      d.licenseNo?.toLowerCase().includes(term) ||
      d.id.toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-poppins font-bold text-secondary">Drivers</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage drivers and monitor their availability</p>
        </div>
        <button onClick={() => navigate('/drivers/create')} className="btn-primary flex-shrink-0"><Plus size={16} /> Add New Driver</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-1.5">
                {['All', ...STATUS_OPTIONS].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setStatusTab(tab); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      statusTab === tab ? 'bg-primary text-white' : 'text-neutral-500 hover:bg-neutral-50 border border-transparent'
                    }`}
                  >
                    {tab === 'All' ? `All (${drivers.length})` : `${STATUS_LABEL[tab]} (${statusCounts[tab]})`}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search driver..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="form-input pl-9"
                />
              </div>
              <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Box view"
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                  <List size={16} />
                </button>
              </div>
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
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paginated.length === 0 ? (
                    <div className="card p-12 text-center text-neutral-400 sm:col-span-2 xl:col-span-3">No drivers found matching your filters.</div>
                  ) : paginated.map((driver) => (
                    <button
                      key={driver.id}
                      onClick={() => setSelectedDriver(driver)}
                      className={`card p-4 text-left transition-all duration-200 ${
                        selectedDriver?.id === driver.id ? 'ring-2 ring-primary/40 border-primary/20' : 'hover:shadow-lg hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex flex-col items-center text-center">
                        <DriverAvatar driver={driver} size="w-16 h-16" />
                        <h3 className="font-poppins font-semibold text-secondary mt-3 truncate w-full">{driver.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs text-neutral-400">{shortId(driver.id)}</span>
                          <Badge status={driver.statusLabel} />
                        </div>
                      </div>
                      <div className="space-y-1.5 mt-4 text-sm text-neutral-500">
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="flex-shrink-0 text-neutral-400" /> <span className="truncate">{driver.phone || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail size={13} className="flex-shrink-0 text-neutral-400" /> <span className="truncate">{driver.email || '—'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 bg-neutral-50 rounded-lg px-3 py-2">
                        <Truck size={14} className="text-neutral-400 flex-shrink-0" />
                        <span className="text-xs text-neutral-600 truncate">{driver.truckReg || 'No assigned vehicle'}</span>
                      </div>
                    </button>
                  ))}
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
                          <th>Truck</th>
                          <th>KYC</th>
                          <th>Status</th>
                          <th className="text-right">Total Trips</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.length === 0 ? (
                          <tr><td colSpan={8} className="text-center py-12 text-neutral-400">No drivers found matching your filters.</td></tr>
                        ) : paginated.map((driver) => (
                          <tr
                            key={driver.id}
                            onClick={() => setSelectedDriver(driver)}
                            className={`cursor-pointer ${selectedDriver?.id === driver.id ? 'bg-primary/[0.04]' : ''}`}
                          >
                            <td className="font-medium text-neutral-800">{shortId(driver.id)}</td>
                            <td className="font-medium">
                              <div className="flex items-center gap-2">
                                <DriverAvatar driver={driver} size="w-8 h-8" />
                                {driver.name}
                              </div>
                            </td>
                            <td className="whitespace-nowrap">
                              {driver.phone ? (
                                <a href={`tel:${driver.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-primary hover:underline">
                                  <Phone size={12} /> {driver.phone}
                                </a>
                              ) : '—'}
                            </td>
                            <td className="text-xs whitespace-nowrap">
                              <div>{driver.licenseNo}</div>
                              <div className={isLicenseExpiring(driver.licenseExpiry) ? 'text-danger font-semibold' : 'text-neutral-400'}>Exp: {formatDate(driver.licenseExpiry)}</div>
                            </td>
                            <td className="whitespace-nowrap">{driver.truckReg || '—'}</td>
                            <td><Badge status={driver.kycStatusLabel} /></td>
                            <td><Badge status={driver.statusLabel} /></td>
                            <td className="text-right font-medium">{driver.totalTrips}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between px-1 py-2 flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  Show
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="border border-neutral-200 rounded-lg px-2 py-1 text-sm text-neutral-700 focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value={9}>9</option>
                    <option value={12}>12</option>
                    <option value={15}>15</option>
                  </select>
                  of {filtered.length} results
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"><ChevronLeft size={16} /></button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>{page}</button>
                    ))}
                    <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"><ChevronRight size={16} /></button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="card p-5 lg:sticky lg:top-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-poppins font-semibold text-secondary">Driver Details</h3>
            <button type="button" aria-label="More options" className="text-neutral-400 hover:text-neutral-600 transition-colors">
              <MoreVertical size={18} />
            </button>
          </div>
          {!selectedDriver ? (
            <p className="text-sm text-neutral-400 text-center py-10">Select a driver to see their details.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <DriverAvatar driver={selectedDriver} size="w-14 h-14" />
                <div className="min-w-0">
                  <h4 className="font-poppins font-semibold text-secondary truncate">{selectedDriver.name}</h4>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge status={selectedDriver.statusLabel} />
                    <Badge status={selectedDriver.kycStatusLabel} />
                  </div>
                </div>
              </div>
              <div className="bg-neutral-50 rounded-xl p-4 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-neutral-500">Driver ID</span><span className="font-medium">{shortId(selectedDriver.id)}</span></div>
                <div className="flex justify-between items-center"><span className="text-neutral-500">Phone</span>{selectedDriver.phone ? <a href={`tel:${selectedDriver.phone}`} className="font-medium text-primary hover:underline flex items-center gap-1"><Phone size={12} />{selectedDriver.phone}</a> : <span className="font-medium">—</span>}</div>
                <div className="flex justify-between items-center"><span className="text-neutral-500">Email</span>{selectedDriver.email ? <a href={`mailto:${selectedDriver.email}`} className="font-medium text-primary hover:underline flex items-center gap-1 truncate max-w-[65%]"><Mail size={12} className="flex-shrink-0" />{selectedDriver.email}</a> : <span className="font-medium">—</span>}</div>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
