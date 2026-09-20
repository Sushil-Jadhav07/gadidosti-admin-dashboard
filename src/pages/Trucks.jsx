import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Truck, Plus, CheckCircle2, Navigation, Wrench, LayoutGrid, List, Trash2 } from 'lucide-react';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { api, getToken } from '../services/api';
import { TRUCK_IMAGES } from '../lib/truckImages';

const STATUS_META = {
  available: { label: 'Available', color: '#17D86B' },
  on_trip: { label: 'On Trip', color: '#F59E0B' },
  maintenance: { label: 'Under Maintenance', color: '#F97316' },
};
const STATUS_LABEL = Object.fromEntries(Object.entries(STATUS_META).map(([k, v]) => [k, v.label]));
const STATUS_OPTIONS = Object.keys(STATUS_META);
// Mirrors gadidosti-backend's vehicle.validation.js TRUCK_CATEGORIES — keep in sync.
const CATEGORY_OPTIONS = ['small', 'medium', 'large', 'part'];

function isInsuranceExpiring(dateStr) {
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

function MiniBars({ ratio, color }) {
  const total = 22;
  const filled = Math.round(Math.max(0, Math.min(1, ratio || 0)) * total);
  return (
    <div className="flex items-end gap-[3px] h-7 mt-3">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className="flex-1 rounded-full" style={{ height: '100%', backgroundColor: i < filled ? color : '#E2E8F0' }} />
      ))}
    </div>
  );
}

function shortId(id) {
  return id ? `#${id.slice(0, 8)}` : '—';
}

function mapTruck(t) {
  return {
    id: t.id,
    regNo: t.registration,
    type: t.type || '—',
    category: t.category,
    make: t.make || '—',
    year: t.year || '—',
    capacity: t.capacity || '—',
    broker: shortId(t.brokerId),
    driver: t.driver || '—',
    driverId: t.driverId,
    lastTrip: t.lastTrip || '—',
    insuranceExpiry: t.insuranceExpiry,
    status: t.status,
    statusLabel: STATUS_LABEL[t.status] || t.status,
  };
}

export default function Trucks() {
  const navigate = useNavigate();
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [toast, setToast] = useState(null);
  const itemsPerPage = 9;

  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTrucks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/vehicles/trucks?limit=100', getToken());
      if (res.success) {
        setTrucks(res.data.trucks.map(mapTruck));
      } else {
        setError(res.message || 'Failed to load trucks');
      }
    } catch {
      setError('Network error — could not load trucks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrucks(); }, [fetchTrucks]);

  const filtered = trucks.filter((t) => {
    const matchStatus = statusTab === 'All' || t.status === statusTab;
    const term = searchTerm.toLowerCase();
    const matchSearch = !term ||
      t.regNo?.toLowerCase().includes(term) ||
      t.type?.toLowerCase().includes(term) ||
      t.broker?.toLowerCase().includes(term) ||
      t.driver?.toLowerCase().includes(term) ||
      t.id.toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  const totalTrucks = trucks.length;
  const statusCounts = useMemo(() => {
    const counts = { available: 0, on_trip: 0, maintenance: 0 };
    trucks.forEach((t) => { if (counts[t.status] !== undefined) counts[t.status] += 1; });
    return counts;
  }, [trucks]);

  // mapTruck substitutes '—' for any missing type/make/year/capacity for display purposes —
  // that placeholder must never leak into an editable input as if it were real data.
  const stripPlaceholder = (v) => (v === '—' ? '' : v ?? '');

  const openTruck = (truck) => {
    setSelectedTruck(truck);
    setEditForm({
      category: truck.category || '',
      capacity: stripPlaceholder(truck.capacity),
      type: stripPlaceholder(truck.type),
      make: stripPlaceholder(truck.make),
      year: stripPlaceholder(truck.year),
      insuranceExpiry: truck.insuranceExpiry ? String(truck.insuranceExpiry).slice(0, 10) : '',
      status: truck.status,
    });
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!selectedTruck || !editForm) return;
    setSavingEdit(true);
    setEditError('');
    try {
      const res = await api.patch(`/api/vehicles/trucks/${selectedTruck.id}`, {
        category: editForm.category || undefined,
        capacity: editForm.capacity.trim() || undefined,
        type: editForm.type.trim() || undefined,
        make: editForm.make.trim() || undefined,
        year: editForm.year ? Number(editForm.year) : undefined,
        insurance_expiry: editForm.insuranceExpiry || undefined,
        status: editForm.status || undefined,
      }, getToken());
      if (!res.success) throw new Error(res.message || 'Failed to update truck');
      const updated = mapTruck(res.data.truck);
      setTrucks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
      setSelectedTruck(updated);
      setToast({ message: `${updated.regNo} updated successfully`, type: 'success' });
    } catch (err) {
      setEditError(err.message || 'Network error — could not update truck');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/api/vehicles/trucks/${deleteTarget.id}`, getToken());
      if (!res.success) throw new Error(res.message || 'Failed to delete truck');
      setTrucks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      if (selectedTruck?.id === deleteTarget.id) setSelectedTruck(null);
      setDeleteTarget(null);
      setToast({ message: 'Truck deleted successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Network error — could not delete truck', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-poppins font-bold text-secondary">Trucks</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage fleet and track truck availability</p>
        </div>
        <button onClick={() => navigate('/trucks/create')} className="btn-primary flex-shrink-0"><Plus size={16} /> Register Truck</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Truck size={15} className="text-neutral-400" /> Total Trucks
          </div>
          <p className="text-3xl font-poppins font-bold text-secondary tracking-tight mt-2">{totalTrucks}</p>
          <p className="text-xs text-neutral-400 mt-1">Registered fleet</p>
          <MiniBars ratio={1} color="#166534" />
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <CheckCircle2 size={15} className="text-neutral-400" /> Available
          </div>
          <p className="text-3xl font-poppins font-bold text-secondary tracking-tight mt-2">
            {statusCounts.available}<span className="text-base text-neutral-400 font-medium">/{totalTrucks}</span>
          </p>
          <p className="text-xs text-neutral-400 mt-1">Ready to dispatch</p>
          <MiniBars ratio={totalTrucks ? statusCounts.available / totalTrucks : 0} color={STATUS_META.available.color} />
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Navigation size={15} className="text-neutral-400" /> On Trip
          </div>
          <p className="text-3xl font-poppins font-bold text-secondary tracking-tight mt-2">
            {statusCounts.on_trip}<span className="text-base text-neutral-400 font-medium">/{totalTrucks}</span>
          </p>
          <p className="text-xs text-neutral-400 mt-1">Currently on the road</p>
          <MiniBars ratio={totalTrucks ? statusCounts.on_trip / totalTrucks : 0} color={STATUS_META.on_trip.color} />
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Wrench size={15} className="text-neutral-400" /> Under Maintenance
          </div>
          <p className="text-3xl font-poppins font-bold text-secondary tracking-tight mt-2">
            {statusCounts.maintenance}<span className="text-base text-neutral-400 font-medium">/{totalTrucks}</span>
          </p>
          <p className="text-xs text-neutral-400 mt-1">Out of service</p>
          <MiniBars ratio={totalTrucks ? statusCounts.maintenance / totalTrucks : 0} color={STATUS_META.maintenance.color} />
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by registration, driver, broker..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="form-input pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['All', ...STATUS_OPTIONS].map((tab) => (
              <button
                key={tab}
                onClick={() => { setStatusTab(tab); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  statusTab === tab ? 'bg-primary/10 text-primary border border-primary/20' : 'text-neutral-500 hover:bg-neutral-50 border border-transparent'
                }`}
              >
                {tab === 'All' ? 'All' : STATUS_LABEL[tab]}
              </button>
            ))}
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
          <button onClick={fetchTrucks} className="underline">Retry</button>
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
                <div className="card p-12 text-center text-neutral-400 sm:col-span-2 xl:col-span-3">No trucks found matching your filters.</div>
              ) : paginated.map((truck) => (
                <button
                  key={truck.id}
                  onClick={() => openTruck(truck)}
                  className="card p-4 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-poppins font-semibold text-secondary truncate">{truck.regNo}</h3>
                      <p className="text-xs text-neutral-400 mt-0.5 truncate">{truck.make} · {truck.type}</p>
                    </div>
                    <Badge status={truck.statusLabel} />
                  </div>

                  <div className="h-28 flex items-center justify-center my-3 bg-neutral-50 rounded-xl">
                    {TRUCK_IMAGES[truck.category] ? (
                      <img src={TRUCK_IMAGES[truck.category]} alt={truck.category} className="h-20 object-contain" />
                    ) : (
                      <Truck size={32} className="text-neutral-300" />
                    )}
                  </div>

                  <div className="space-y-2 text-sm border-t border-neutral-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400">Driver</span>
                      {truck.driver !== '—' ? (
                        <span className="flex items-center gap-2 min-w-0">
                          <Avatar name={truck.driver} size={22} />
                          <span className="font-medium text-neutral-700 truncate">{truck.driver}</span>
                        </span>
                      ) : (
                        <span className="text-neutral-400">Unassigned</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400">Last Trip</span>
                      <span className="font-medium text-neutral-700 truncate max-w-[60%]">{formatDate(truck.lastTrip)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400">Capacity</span>
                      <span className="font-medium text-neutral-700">{truck.capacity}</span>
                    </div>
                    {isInsuranceExpiring(truck.insuranceExpiry) && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-400">Insurance</span>
                        <span className="font-semibold text-danger">Expires {formatDate(truck.insuranceExpiry)}</span>
                      </div>
                    )}
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
                      <th>Truck ID</th>
                      <th>Registration No.</th>
                      <th>Type</th>
                      <th>Make / Year</th>
                      <th>Driver Assigned</th>
                      <th>Last Trip</th>
                      <th>Insurance Expiry</th>
                      <th>Capacity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-12 text-neutral-400">No trucks found matching your filters.</td></tr>
                    ) : paginated.map((truck) => (
                      <tr key={truck.id} onClick={() => openTruck(truck)} className="cursor-pointer">
                        <td className="font-medium text-neutral-800">{shortId(truck.id)}</td>
                        <td className="font-medium whitespace-nowrap">{truck.regNo}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center flex-shrink-0 p-0.5">
                              {TRUCK_IMAGES[truck.category] ? (
                                <img src={TRUCK_IMAGES[truck.category]} alt={truck.category} className="w-full h-full object-contain" />
                              ) : (
                                <Truck size={13} className="text-neutral-300" />
                              )}
                            </div>
                            {truck.type}
                          </div>
                        </td>
                        <td className="whitespace-nowrap">{truck.make} <span className="text-neutral-400">· {truck.year}</span></td>
                        <td>{truck.driver}</td>
                        <td className="whitespace-nowrap text-neutral-500">{formatDate(truck.lastTrip)}</td>
                        <td className={`whitespace-nowrap ${isInsuranceExpiring(truck.insuranceExpiry) ? 'text-danger font-semibold' : ''}`}>{formatDate(truck.insuranceExpiry)}</td>
                        <td>{truck.capacity}</td>
                        <td><Badge status={truck.statusLabel} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1 py-2">
              <p className="text-sm text-neutral-500">Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} trucks</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"><ChevronLeft size={16} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>{page}</button>
                ))}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={!!selectedTruck} onClose={() => setSelectedTruck(null)} title="Edit Truck" size="md">
        {selectedTruck && editForm && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                {TRUCK_IMAGES[selectedTruck.category] ? (
                  <img src={TRUCK_IMAGES[selectedTruck.category]} alt={selectedTruck.category} className="w-11 h-11 object-contain" />
                ) : (
                  <Truck size={24} className="text-primary" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary">{selectedTruck.regNo}</h3>
                <Badge status={selectedTruck.statusLabel} />
              </div>
            </div>

            <div className="bg-neutral-50 rounded-lg p-3 flex justify-between text-sm">
              <span className="text-neutral-500">Truck ID</span><span className="font-medium">{shortId(selectedTruck.id)}</span>
            </div>
            <div className="bg-neutral-50 rounded-lg p-3 flex justify-between text-sm">
              <span className="text-neutral-500">Broker</span><span className="font-medium">{selectedTruck.broker}</span>
            </div>
            <div className="bg-neutral-50 rounded-lg p-3 flex justify-between text-sm">
              <span className="text-neutral-500">Driver</span><span className="font-medium">{selectedTruck.driver}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Category</label>
                <select value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} className="form-select">
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Capacity</label>
                <input value={editForm.capacity} onChange={(e) => setEditForm((f) => ({ ...f, capacity: e.target.value }))} className="form-input" placeholder="e.g. 10 tons" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Type</label>
                <input value={editForm.type} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))} className="form-input" placeholder="e.g. Large Truck" />
              </div>
              <div>
                <label className="form-label">Make</label>
                <input value={editForm.make} onChange={(e) => setEditForm((f) => ({ ...f, make: e.target.value }))} className="form-input" placeholder="e.g. Tata Ace" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Year</label>
                <input type="number" value={editForm.year} onChange={(e) => setEditForm((f) => ({ ...f, year: e.target.value }))} className="form-input" placeholder="e.g. 2022" />
              </div>
              <div>
                <label className="form-label">Insurance Expiry</label>
                <input type="date" value={editForm.insuranceExpiry} onChange={(e) => setEditForm((f) => ({ ...f, insuranceExpiry: e.target.value }))} className="form-input" />
              </div>
            </div>

            <div>
              <label className="form-label">Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className="form-select">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>

            {editError && <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">{editError}</div>}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={() => { setDeleteTarget(selectedTruck); setSelectedTruck(null); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-danger hover:bg-red-50 transition-colors text-sm font-semibold"
              >
                <Trash2 size={14} /> Delete
              </button>
              <div className="flex gap-2">
                <button onClick={() => setSelectedTruck(null)} className="btn-secondary">Cancel</button>
                <button onClick={handleSaveEdit} disabled={savingEdit} className="btn-primary disabled:opacity-50">{savingEdit ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Truck" size="sm">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Are you sure you want to delete <span className="font-semibold text-neutral-800">{deleteTarget.regNo}</span>?
              This cannot be undone if it has no booking history — otherwise mark it under maintenance instead.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="btn-danger disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete Truck'}</button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
