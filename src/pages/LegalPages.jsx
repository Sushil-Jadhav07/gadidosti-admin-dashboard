import { useEffect, useMemo, useState, useCallback } from 'react';
import { FileText, Pencil, Inbox, CheckCircle, XCircle, Clock, Mail, Phone } from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import RichTextEditor from '../components/RichTextEditor';
import { api, getToken } from '../services/api';

const AUDIENCES = [
  { key: 'client', label: 'Client' },
  { key: 'driver', label: 'Driver' },
  { key: 'broker', label: 'Broker' },
];

const DELETION_STATUS_LABELS = { pending: 'Pending', completed: 'Completed', rejected: 'Rejected' };

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function LegalPages() {
  const [tab, setTab] = useState('pages');
  const [audience, setAudience] = useState('client');
  const [toast, setToast] = useState(null);

  // ── Pages ──────────────────────────────────────────────────────────────────
  const [pages, setPages] = useState([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [editingPage, setEditingPage] = useState(null); // the page row being edited in the modal
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPages = useCallback(async () => {
    setPagesLoading(true);
    try {
      const res = await api.get('/api/legal-pages', getToken());
      if (res.success) setPages(res.data?.pages || []);
      else setToast({ message: res.message || 'Failed to load pages', type: 'error' });
    } catch {
      setToast({ message: 'Network error — could not load pages', type: 'error' });
    } finally {
      setPagesLoading(false);
    }
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const pagesForAudience = useMemo(
    () => pages.filter((p) => p.audience === audience),
    [pages, audience]
  );

  const openEdit = (page) => {
    setEditingPage(page);
    setEditTitle(page.title);
    setEditContent(page.content || '');
  };

  const handleSave = async () => {
    if (!editingPage) return;
    setSaving(true);
    try {
      const res = await api.patch(`/api/legal-pages/${editingPage.id}`, { title: editTitle, content: editContent }, getToken());
      if (!res.success) throw new Error(res.message || 'Failed to save');
      setPages((current) => current.map((p) => (p.id === editingPage.id ? { ...p, title: editTitle, content: editContent, updatedAt: new Date().toISOString() } : p)));
      setToast({ message: 'Page saved', type: 'success' });
      setEditingPage(null);
    } catch (err) {
      setToast({ message: err.message || 'Failed to save page', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ── Account deletion requests ─────────────────────────────────────────────
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestNotes, setRequestNotes] = useState('');
  const [updatingRequest, setUpdatingRequest] = useState(false);

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const res = await api.get('/api/account-deletion-requests?limit=100', getToken());
      if (res.success) setRequests(res.data?.requests || []);
      else setToast({ message: res.message || 'Failed to load requests', type: 'error' });
    } catch {
      setToast({ message: 'Network error — could not load requests', type: 'error' });
    } finally {
      setRequestsLoading(false);
      setRequestsLoaded(true);
    }
  }, []);

  // Loaded lazily, the first time this tab is actually opened — a broker/client-facing admin
  // without this page open doesn't need the extra request on every dashboard load.
  useEffect(() => {
    if (tab === 'requests' && !requestsLoaded) fetchRequests();
  }, [tab, requestsLoaded, fetchRequests]);

  const filteredRequests = useMemo(() => requests.filter((r) => {
    const uiStatus = DELETION_STATUS_LABELS[r.status] || r.status;
    return statusFilter === 'All' || uiStatus === statusFilter;
  }), [requests, statusFilter]);

  const openRequest = (request) => {
    setSelectedRequest(request);
    setRequestNotes(request.adminNotes || '');
  };

  const handleUpdateRequest = async (status) => {
    if (!selectedRequest) return;
    setUpdatingRequest(true);
    try {
      const res = await api.patch(`/api/account-deletion-requests/${selectedRequest.id}`, { status, admin_notes: requestNotes }, getToken());
      if (!res.success) throw new Error(res.message || 'Failed to update');
      setRequests((current) => current.map((r) => (r.id === selectedRequest.id ? { ...r, status, adminNotes: requestNotes } : r)));
      setToast({ message: 'Request updated', type: 'success' });
      setSelectedRequest(null);
    } catch (err) {
      setToast({ message: err.message || 'Failed to update request', type: 'error' });
    } finally {
      setUpdatingRequest(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Legal Pages</h1>
        <p className="text-sm text-neutral-500 mt-1">Privacy Policy, Terms, Account Deletion and the other public compliance pages — one set per audience.</p>
      </div>

      <div className="flex items-center gap-1.5 bg-neutral-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('pages')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'pages' ? 'bg-white text-secondary shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          Pages
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'requests' ? 'bg-white text-secondary shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          Account Deletion Requests
          {pendingCount > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">{pendingCount}</span>}
        </button>
      </div>

      {tab === 'pages' && (
        <div className="card overflow-hidden">
          <div className="px-5 pt-4 pb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-poppins font-semibold text-secondary">Pages</h3>
            <div className="flex items-center gap-1.5 bg-neutral-50 rounded-lg p-1">
              {AUDIENCES.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setAudience(a.key)}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${audience === a.key ? 'bg-white text-primary shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {pagesLoading ? (
            <div className="p-10 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagesForAudience.map((page) => (
                    <tr key={page.id}>
                      <td className="font-medium text-neutral-800 flex items-center gap-2">
                        <FileText size={14} className="text-neutral-400 flex-shrink-0" /> {page.title}
                      </td>
                      <td>
                        {page.content?.trim() ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-tertiary"><CheckCircle size={12} /> Published</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-400"><Clock size={12} /> Not written yet</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-neutral-500">{formatDate(page.updatedAt)}</td>
                      <td className="text-center">
                        <button onClick={() => openEdit(page)} className="p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors" title="Edit">
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="card overflow-hidden">
          <div className="px-5 pt-4 pb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-poppins font-semibold text-secondary">Account Deletion Requests</h3>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select !py-2 min-w-[160px]">
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {requestsLoading ? (
            <div className="p-10 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Audience</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium text-neutral-800">{r.name || '—'}</td>
                      <td className="capitalize">{r.audience}</td>
                      <td className="text-neutral-500 text-xs">{r.email || r.phone || '—'}</td>
                      <td><Badge status={DELETION_STATUS_LABELS[r.status] || r.status} /></td>
                      <td className="whitespace-nowrap text-neutral-500">{formatDate(r.createdAt)}</td>
                      <td className="text-center">
                        <button onClick={() => openRequest(r)} className="p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors" title="View">
                          <Inbox size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRequests.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-neutral-400">No deletion requests found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={!!editingPage} onClose={() => setEditingPage(null)} title={editingPage ? `${AUDIENCES.find((a) => a.key === editingPage.audience)?.label} — ${editingPage.title}` : ''} size="xl">
        {editingPage && (
          <div className="space-y-4">
            <div>
              <label className="form-label">Title</label>
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="form-input" maxLength={200} />
            </div>
            <div>
              <label className="form-label">Content</label>
              <RichTextEditor value={editContent} onChange={setEditContent} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingPage(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving || !editTitle.trim()} className="btn-primary">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} title="Account Deletion Request" size="md">
        {selectedRequest && (
          <div className="space-y-4">
            <div className="bg-neutral-50 rounded-lg p-4 space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Name</span><span className="font-medium">{selectedRequest.name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Audience</span><span className="font-medium capitalize">{selectedRequest.audience}</span></div>
              {selectedRequest.email && (
                <div className="flex justify-between"><span className="text-neutral-500">Email</span><a href={`mailto:${selectedRequest.email}`} className="font-medium text-primary hover:underline flex items-center gap-1"><Mail size={12} />{selectedRequest.email}</a></div>
              )}
              {selectedRequest.phone && (
                <div className="flex justify-between"><span className="text-neutral-500">Phone</span><a href={`tel:${selectedRequest.phone}`} className="font-medium text-primary hover:underline flex items-center gap-1"><Phone size={12} />{selectedRequest.phone}</a></div>
              )}
              <div className="flex justify-between"><span className="text-neutral-500">Submitted</span><span className="font-medium">{formatDate(selectedRequest.createdAt)}</span></div>
              {selectedRequest.reason && (
                <div><span className="text-neutral-500">Reason</span><p className="mt-1 text-neutral-700">{selectedRequest.reason}</p></div>
              )}
            </div>
            <div>
              <label className="form-label">Admin Notes</label>
              <textarea
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                placeholder="What was done to action this request..."
                rows={3}
                className="form-input resize-none"
                maxLength={2000}
              />
              <p className="text-xs text-neutral-400 mt-1">Marking this as Completed/Rejected only records the outcome here — delete or anonymize the actual account through Users first, if applicable.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => handleUpdateRequest('rejected')} disabled={updatingRequest} className="btn-secondary flex items-center gap-1.5">
                <XCircle size={15} /> Reject
              </button>
              <button onClick={() => handleUpdateRequest('completed')} disabled={updatingRequest} className="btn-primary flex items-center gap-1.5">
                <CheckCircle size={15} /> Mark Completed
              </button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
