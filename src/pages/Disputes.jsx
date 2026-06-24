import { useState } from 'react';
import { Search, Eye, CheckCircle, ChevronLeft, ChevronRight, AlertTriangle, ShieldCheck, ArrowUpCircle } from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { disputes } from '../data/mockData';

export default function Disputes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolveModal, setResolveModal] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolveStatus, setResolveStatus] = useState('Resolved');
  const [toast, setToast] = useState(null);
  const [disputeData, setDisputeData] = useState(disputes);
  const itemsPerPage = 10;

  const filtered = disputeData.filter((d) => {
    const matchStatus = statusFilter === 'All' || d.status === statusFilter;
    const matchSearch = !searchTerm ||
      d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.issueType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handleResolve = (disputeId) => {
    if (!resolutionNotes.trim()) return;
    setDisputeData(prev => prev.map(d => d.id === disputeId ? { ...d, status: resolveStatus, resolution: resolutionNotes } : d));
    setToast({ message: `Dispute ${resolveStatus.toLowerCase()} successfully`, type: 'success' });
    setResolveModal(null);
    setResolutionNotes('');
  };

  const handleEscalate = (disputeId) => {
    setDisputeData(prev => prev.map(d => d.id === disputeId ? { ...d, status: 'Under Review' } : d));
    setToast({ message: 'Dispute escalated to senior management', type: 'info' });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Disputes</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage and resolve booking disputes</p>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative max-w-xs flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search disputes..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="form-input pl-9"
            />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="form-select min-w-[140px]">
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Dispute ID</th>
                <th>Booking ID</th>
                <th>Raised By</th>
                <th>Issue Type</th>
                <th>Description</th>
                <th>Status</th>
                <th>Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((dispute) => (
                <tr key={dispute.id}>
                  <td className="font-medium text-neutral-800">{dispute.id}</td>
                  <td>{dispute.bookingId}</td>
                  <td>{dispute.raisedBy}</td>
                  <td>{dispute.issueType}</td>
                  <td className="max-w-xs truncate">{dispute.description}</td>
                  <td><Badge status={dispute.status} /></td>
                  <td>{dispute.date}</td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setSelectedDispute(dispute)} className="p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors" title="View Details">
                        <Eye size={14} />
                      </button>
                      {dispute.status !== 'Resolved' && (
                        <>
                          <button onClick={() => setResolveModal(dispute)} className="p-1.5 text-tertiary bg-green-50 rounded-lg hover:bg-green-100 transition-colors" title="Resolve">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={() => handleEscalate(dispute.id)} className="p-1.5 text-warning bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors" title="Escalate">
                            <ArrowUpCircle size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-neutral-400">No disputes found.</td></tr>
              )}
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

      {/* View Modal */}
      <Modal isOpen={!!selectedDispute} onClose={() => setSelectedDispute(null)} title="Dispute Details" size="md">
        {selectedDispute && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertTriangle size={18} className="text-danger" />
              </div>
              <div>
                <h3 className="font-semibold text-secondary">{selectedDispute.issueType}</h3>
                <p className="text-xs text-neutral-500">{selectedDispute.id} • {selectedDispute.bookingId}</p>
              </div>
            </div>
            <div className="bg-neutral-50 rounded-lg p-4 space-y-3 text-sm">
              <div><span className="text-neutral-500">Description</span><p className="mt-1 text-neutral-700">{selectedDispute.description}</p></div>
              <div className="flex justify-between"><span className="text-neutral-500">Raised By</span><span className="font-medium">{selectedDispute.raisedBy}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Date</span><span className="font-medium">{selectedDispute.date}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Status</span><Badge status={selectedDispute.status} /></div>
              {selectedDispute.resolution && (
                <div><span className="text-neutral-500">Resolution</span><p className="mt-1 text-neutral-700">{selectedDispute.resolution}</p></div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedDispute(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Resolve Modal */}
      <Modal isOpen={!!resolveModal} onClose={() => { setResolveModal(null); setResolutionNotes(''); }} title="Resolve Dispute" size="md">
        {resolveModal && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-sm text-blue-800"><strong>{resolveModal.issueType}</strong> - {resolveModal.bookingId}</p>
            </div>
            <div>
              <label className="form-label">Resolution Status</label>
              <select value={resolveStatus} onChange={(e) => setResolveStatus(e.target.value)} className="form-select">
                <option value="Resolved">Resolved</option>
                <option value="Under Review">Under Review</option>
              </select>
            </div>
            <div>
              <label className="form-label">Resolution Notes</label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Enter resolution details..."
                rows={4}
                className="form-input resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setResolveModal(null); setResolutionNotes(''); }} className="btn-secondary">Cancel</button>
              <button onClick={() => handleResolve(resolveModal.id)} disabled={!resolutionNotes.trim()} className="btn-primary">
                <CheckCircle size={16} /> Resolve
              </button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
