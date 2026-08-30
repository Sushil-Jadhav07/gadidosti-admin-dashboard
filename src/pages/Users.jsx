import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Eye, Ban, UserCheck, Trash2, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, ChevronDown, RefreshCw, X, Filter,
} from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { api, getToken } from '../services/api';

const KYC_LABEL = {
  pending: 'Pending',
  submitted: 'Submitted',
  verified: 'Verified',
  rejected: 'Rejected',
};

const KYC_BADGE_CLASS = {
  pending: 'bg-neutral-100 text-neutral-500',
  submitted: 'bg-amber-50 text-amber-600',
  verified: 'bg-emerald-50 text-emerald-600',
  rejected: 'bg-red-50 text-red-600',
};

function KycBadge({ status }) {
  if (!status) return <span className="text-neutral-300">—</span>;
  return (
    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${KYC_BADGE_CLASS[status] || KYC_BADGE_CLASS.pending}`}>
      {KYC_LABEL[status] || status}
    </span>
  );
}

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const ROLES = ['', 'client', 'broker', 'driver'];
const STATUSES = ['', 'active', 'inactive', 'blocked'];
const KYC_STATUSES = ['', 'pending', 'submitted', 'verified', 'rejected'];

export default function Users() {
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [total, setTotal]               = useState(0);
  const [search, setSearch]             = useState('');
  const [roleFilter, setRoleFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kycFilter, setKycFilter]       = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [kycDetail, setKycDetail]       = useState(null);
  const [kycDetailLoading, setKycDetailLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast]               = useState(null);
  const searchTimer = useRef(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchUsers = useCallback(async (pg, q, role, status, kycStatus) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: pg, limit: 10 });
      if (q)         params.append('search', q);
      if (role)      params.append('role', role);
      if (status)    params.append('status', status);
      if (kycStatus) params.append('kyc_status', kycStatus);
      const data = await api.get(`/api/admin/users?${params}`, getToken());
      if (data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.total_pages);
        setTotal(data.data.total);
      } else {
        setError(data.message || 'Failed to load users');
      }
    } catch {
      setError('Network error — could not load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page, search, roleFilter, statusFilter, kycFilter);
  }, [page, roleFilter, statusFilter, kycFilter, fetchUsers]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchUsers(1, val, roleFilter, statusFilter, kycFilter);
    }, 400);
  };

  const applyFilter = (role, status, kyc = kycFilter) => {
    setRoleFilter(role);
    setStatusFilter(status);
    setKycFilter(kyc);
    setPage(1);
  };

  const handleStatusChange = async (userId, newStatus) => {
    setActionLoading(userId + '_status');
    try {
      const data = await api.patch(`/api/admin/users/${userId}/status`, { status: newStatus }, getToken());
      if (data.success) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
        showToast(`User ${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully`);
      } else {
        showToast(data.message || 'Failed to update status', 'error');
      }
    } catch {
      showToast('Network error — could not update status', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(confirmDelete.id + '_delete');
    try {
      const data = await api.delete(`/api/admin/users/${confirmDelete.id}`, getToken());
      if (data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== confirmDelete.id));
        setTotal((t) => t - 1);
        setConfirmDelete(null);
        showToast('User deleted successfully');
      } else {
        showToast(data.message || 'Failed to delete user', 'error');
      }
    } catch {
      showToast('Network error — could not delete user', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    setKycDetail(null);
    setShowRejectBox(false);
    setRejectReason('');
    try {
      const data = await api.get(`/api/admin/users/${user.id}`, getToken());
      if (data.success) setSelectedUser(data.data.user);
    } catch {}

    if (['broker', 'driver'].includes(user.role)) {
      setKycDetailLoading(true);
      try {
        const data = await api.get(`/api/admin/kyc/${user.id}`, getToken());
        if (data.success) setKycDetail(data.data.submission);
      } catch {}
      setKycDetailLoading(false);
    }
  };

  const handleKycReview = async (status) => {
    if (!selectedUser) return;
    if (status === 'rejected' && !rejectReason.trim()) {
      return showToast('Please provide a rejection reason', 'error');
    }
    setActionLoading(selectedUser.id + '_kyc');
    try {
      const endpoint = status === 'verified'
        ? `/api/admin/kyc/${selectedUser.id}/verify`
        : `/api/admin/kyc/${selectedUser.id}/reject`;
      const data = await api.patch(endpoint, status === 'rejected' ? { reason: rejectReason.trim() } : {}, getToken());
      if (data.success) {
        setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? { ...u, kyc_status: status } : u));
        setSelectedUser((u) => ({ ...u, kyc_status: status }));
        setShowRejectBox(false);
        setRejectReason('');
        showToast(`KYC ${status}`);
      } else {
        showToast(data.message || 'Failed to review KYC', 'error');
      }
    } catch {
      showToast('Network error — could not review KYC', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const itemsPerPage = 10;
  const startIndex = (page - 1) * itemsPerPage + 1;
  const endIndex = Math.min(page * itemsPerPage, total);
  const pageNumbers = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= totalPages - 3) return totalPages - 6 + i;
    return page - 3 + i;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Users</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {loading ? 'Loading...' : `${total} registered user${total !== 1 ? 's' : ''}`}
        </p>
      </div>

      {error && (
        <div className="card p-4 text-sm text-danger flex items-center gap-2">
          <span>{error}</span>
          <button onClick={() => fetchUsers(page, search, roleFilter, statusFilter, kycFilter)} className="underline">Retry</button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-poppins font-semibold text-secondary">Users</h3>
          <button
            onClick={() => fetchUsers(page, search, roleFilter, statusFilter, kycFilter)}
            disabled={loading}
            className="btn-secondary !py-2 !px-3 text-sm disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="px-5 pt-4 pb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary">
              <Filter size={14} />
              Filters
            </div>
            <div className="relative min-w-[150px]">
              <select
                value={roleFilter}
                onChange={(e) => applyFilter(e.target.value, statusFilter)}
                className="form-select !py-2 pl-3 pr-8"
              >
                <option value="">All Roles</option>
                {ROLES.slice(1).map((r) => <option key={r} value={r}>{cap(r)}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
            <div className="relative min-w-[160px]">
              <select
                value={statusFilter}
                onChange={(e) => applyFilter(roleFilter, e.target.value)}
                className="form-select !py-2 pl-3 pr-8"
              >
                <option value="">All Statuses</option>
                {STATUSES.slice(1).map((s) => <option key={s} value={s}>{cap(s)}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
            <div className="relative min-w-[170px]">
              <select
                value={kycFilter}
                onChange={(e) => applyFilter(roleFilter, statusFilter, e.target.value)}
                className="form-select !py-2 pl-3 pr-8"
              >
                <option value="">All KYC Status</option>
                {KYC_STATUSES.slice(1).map((s) => <option key={s} value={s}>{KYC_LABEL[s]}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
            {(roleFilter || statusFilter || kycFilter) && (
              <button
                onClick={() => applyFilter('', '', '')}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                <X size={13} /> Clear
              </button>
            )}
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name, email, phone..."
              value={search}
              onChange={handleSearchChange}
              className="form-input pl-9 !py-2"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>KYC</th>
                <th>Joined</th>
                <th>Last Login</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-neutral-100 rounded animate-pulse w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-neutral-400 text-sm">
                    No users found
                  </td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-800 leading-tight">{user.name}</p>
                        <p className="text-xs text-neutral-400 leading-tight">{user.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-sm">{user.phone || '—'}</td>
                  <td><Badge status={cap(user.role)} /></td>
                  <td><Badge status={cap(user.status)} /></td>
                  <td>{['broker', 'driver'].includes(user.role) ? <KycBadge status={user.kyc_status} /> : <span className="text-neutral-300">—</span>}</td>
                  <td className="text-sm text-neutral-600 whitespace-nowrap">{fmt(user.created_at)}</td>
                  <td className="text-sm text-neutral-600 whitespace-nowrap">{fmt(user.last_login_at)}</td>
                  <td>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleViewUser(user)}
                        className="p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      {user.status === 'active' && (
                        <button
                          onClick={() => handleStatusChange(user.id, 'blocked')}
                          disabled={actionLoading === user.id + '_status'}
                          className="p-1.5 text-danger bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40"
                          title="Block User"
                        >
                          <Ban size={14} />
                        </button>
                      )}
                      {user.status === 'blocked' && (
                        <button
                          onClick={() => handleStatusChange(user.id, 'active')}
                          disabled={actionLoading === user.id + '_status'}
                          className="p-1.5 text-tertiary bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-40"
                          title="Unblock User"
                        >
                          <UserCheck size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(user)}
                        className="p-1.5 text-neutral-400 bg-neutral-100 rounded-lg hover:bg-red-50 hover:text-danger transition-colors"
                        title="Delete User"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">
              Showing {startIndex}–{endIndex} of {total} users
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    page === pageNumber ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-50 border border-neutral-200'
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="User Details" size="md">
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-primary">
                  {selectedUser.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary">{selectedUser.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge status={cap(selectedUser.role)} />
                  <Badge status={cap(selectedUser.status)} />
                </div>
              </div>
            </div>
            <div className="bg-neutral-50 rounded-xl p-4 space-y-3 text-sm">
              {[
                ['User ID',        selectedUser.id],
                ['Email',          selectedUser.email || '—'],
                ['Phone',          selectedUser.phone || '—'],
                ['Email Verified', selectedUser.is_email_verified ? 'Yes' : 'No'],
                ['Phone Verified', selectedUser.is_phone_verified ? 'Yes' : 'No'],
                ['Last Login',     fmtTime(selectedUser.last_login_at)],
                ['Registered',     fmtTime(selectedUser.created_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-neutral-500 flex-shrink-0">{label}</span>
                  <span className="font-medium text-neutral-800 text-right break-all">{value}</span>
                </div>
              ))}
            </div>

            {['broker', 'driver'].includes(selectedUser.role) && (
              <div className="bg-neutral-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-700">KYC Review</span>
                  <KycBadge status={selectedUser.kyc_status} />
                </div>

                {kycDetailLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : kycDetail?.documents && Object.keys(kycDetail.documents).length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {Object.entries(kycDetail.documents).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-[11px] text-neutral-400 uppercase tracking-wide">{key.replace(/_/g, ' ')}</p>
                        <p className="font-mono font-medium text-neutral-800">{value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400">No documents submitted yet.</p>
                )}

                {kycDetail?.rejection_reason && (
                  <p className="text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700">
                    <span className="font-semibold">Last rejection: </span>{kycDetail.rejection_reason}
                  </p>
                )}

                {selectedUser.kyc_status === 'submitted' && (
                  <div className="pt-1 space-y-2">
                    {showRejectBox && (
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection..."
                        rows={2}
                        className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleKycReview('verified')}
                        disabled={actionLoading === selectedUser.id + '_kyc'}
                        className="flex items-center gap-1.5 text-sm px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      {!showRejectBox ? (
                        <button
                          onClick={() => setShowRejectBox(true)}
                          className="flex items-center gap-1.5 text-sm px-3 py-2 bg-red-50 text-danger rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      ) : (
                        <button
                          onClick={() => handleKycReview('rejected')}
                          disabled={actionLoading === selectedUser.id + '_kyc'}
                          className="flex items-center gap-1.5 text-sm px-3 py-2 bg-danger text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          <XCircle size={14} /> Confirm Reject
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between gap-2 pt-1">
              <div className="flex gap-2">
                {selectedUser.status === 'active' && (
                  <button
                    onClick={() => { handleStatusChange(selectedUser.id, 'blocked'); setSelectedUser(null); }}
                    className="btn-danger text-sm py-2 px-4"
                  >
                    Block User
                  </button>
                )}
                {selectedUser.status === 'blocked' && (
                  <button
                    onClick={() => { handleStatusChange(selectedUser.id, 'active'); setSelectedUser(null); }}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
                  >
                    Unblock User
                  </button>
                )}
              </div>
              <button onClick={() => setSelectedUser(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete User" size="sm">
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-neutral-800">{confirmDelete.name}</span>?
              This will deactivate their account.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={!!actionLoading}
                className="btn-danger disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
