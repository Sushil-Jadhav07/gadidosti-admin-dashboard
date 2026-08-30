import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, CheckCircle, XCircle, ChevronLeft, ChevronRight, FileText, ShieldCheck, Loader2, ImageOff } from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { api, getToken } from '../services/api';

const STATUS_LABEL = { submitted: 'Pending', verified: 'Verified', rejected: 'Rejected' };

function DocumentPreview({ label, url }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (!url) {
    return (
      <div className="bg-neutral-100 border-2 border-dashed border-neutral-200 rounded-lg p-4 flex flex-col items-center justify-center text-center opacity-60">
        <ImageOff size={20} className="text-neutral-400 mb-1" />
        <span className="text-xs text-neutral-500">{label}</span>
        <span className="text-[10px] text-neutral-400">Not uploaded</span>
      </div>
    );
  }

  const handleOpen = async () => {
    if (blobUrl) { window.open(blobUrl, '_blank'); return; }
    setLoading(true);
    setError(false);
    try {
      const resolved = await api.getFileBlobUrl(url, getToken());
      setBlobUrl(resolved);
      window.open(resolved, '_blank');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={loading}
      className="bg-white border-2 border-primary/20 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-60 w-full"
    >
      {loading ? (
        <Loader2 size={20} className="text-primary mb-1 animate-spin" />
      ) : (
        <FileText size={20} className="text-primary mb-1" />
      )}
      <span className="text-xs text-neutral-700 font-medium">{label}</span>
      <span className="text-[10px] text-primary">{error ? 'Failed to load — retry' : 'View document'}</span>
    </button>
  );
}

function mapBroker(s) {
  const d = s.documents || {};
  return {
    id: s.user_id,
    name: s.name,
    pan: d.pan_number || '—',
    panPhotoUrl: d.pan_photo_url || null,
    aadhaar: d.aadhaar_number || '—',
    aadhaarPhotoUrl: d.aadhaar_photo_url || null,
    gst: d.gst_number || '—',
    bankAccount: d.bank_account_number || '—',
    businessReg: d.business_registration_number || null,
    submissionDate: s.submitted_at ? s.submitted_at.slice(0, 10) : '—',
    status: STATUS_LABEL[s.kyc_status] || s.kyc_status,
    rejectionReason: s.rejection_reason,
  };
}

function mapDriver(s) {
  const d = s.documents || {};
  return {
    id: s.user_id,
    name: s.name,
    licenseNo: d.license_number || '—',
    licensePhotoUrl: d.license_photo_url || null,
    aadhaar: d.aadhaar_number || '—',
    aadhaarPhotoUrl: d.aadhaar_photo_url || null,
    vehicleReg: d.vehicle_registration_number || null,
    vehicleIns: d.vehicle_insurance_number || null,
    submissionDate: s.submitted_at ? s.submitted_at.slice(0, 10) : '—',
    status: STATUS_LABEL[s.kyc_status] || s.kyc_status,
    rejectionReason: s.rejection_reason,
  };
}

export default function KYC() {
  const [activeTab, setActiveTab] = useState('brokers');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedKYC, setSelectedKYC] = useState(null);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);
  const [brokerData, setBrokerData] = useState([]);
  const [driverData, setDriverData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const itemsPerPage = 8;

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchKyc = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [brokerRes, driverRes] = await Promise.all([
        api.get('/api/admin/kyc/pending?role=broker&limit=100', getToken()),
        api.get('/api/admin/kyc/pending?role=driver&limit=100', getToken()),
      ]);
      if (brokerRes.success) setBrokerData(brokerRes.data.submissions.map(mapBroker));
      if (driverRes.success) setDriverData(driverRes.data.submissions.map(mapDriver));
      if (!brokerRes.success || !driverRes.success) setError('Failed to load some KYC data');
    } catch {
      setError('Network error — could not load KYC submissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKyc(); }, [fetchKyc]);

  const data = activeTab === 'brokers' ? brokerData : driverData;
  const setData = activeTab === 'brokers' ? setBrokerData : setDriverData;

  const filtered = useMemo(() => data.filter((k) =>
    !searchTerm || k.name.toLowerCase().includes(searchTerm.toLowerCase())
  ), [data, searchTerm]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  const handleApprove = async (id, name) => {
    setActionLoading(id + '_verify');
    try {
      const res = await api.patch(`/api/admin/kyc/${id}/verify`, {}, getToken());
      if (res.success) {
        setData((prev) => prev.map((k) => k.id === id ? { ...k, status: 'Verified' } : k));
        showToast(`${name}'s KYC approved successfully`);
      } else {
        showToast(res.message || 'Failed to approve KYC', 'error');
      }
    } catch {
      showToast('Network error — could not approve KYC', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id, name, reason) => {
    if (!reason.trim()) return showToast('Please provide a rejection reason', 'error');
    setActionLoading(id + '_reject');
    try {
      const res = await api.patch(`/api/admin/kyc/${id}/reject`, { reason: reason.trim() }, getToken());
      if (res.success) {
        setData((prev) => prev.map((k) => k.id === id ? { ...k, status: 'Rejected', rejectionReason: reason.trim() } : k));
        showToast(`${name}'s KYC rejected`);
        setShowRejectBox(false);
        setRejectReason('');
        setSelectedKYC(null);
      } else {
        showToast(res.message || 'Failed to reject KYC', 'error');
      }
    } catch {
      showToast('Network error — could not reject KYC', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectFlow = (kyc) => {
    setSelectedKYC(kyc);
    setShowRejectBox(true);
    setRejectReason('');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">KYC Verification</h1>
        <p className="text-sm text-neutral-500 mt-1">Review and approve KYC documents for brokers and drivers</p>
      </div>

      {error && (
        <div className="card p-4 text-sm text-danger flex items-center gap-2">
          <span>{error}</span>
          <button onClick={fetchKyc} className="underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="card p-10 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 pt-4 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => { setActiveTab('brokers'); setCurrentPage(1); setSearchTerm(''); }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'brokers' ? 'bg-white text-primary shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                Brokers ({brokerData.length})
              </button>
              <button
                onClick={() => { setActiveTab('drivers'); setCurrentPage(1); setSearchTerm(''); }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'drivers' ? 'bg-white text-primary shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                Drivers ({driverData.length})
              </button>
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="form-input pl-9 !py-2"
              />
            </div>
          </div>

          <div className="px-5 pb-2">
            <h3 className="text-base font-poppins font-semibold text-secondary">{activeTab === 'brokers' ? 'Broker KYC' : 'Driver KYC'}</h3>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  {activeTab === 'brokers' ? (
                    <>
                      <th>PAN</th>
                      <th>Aadhaar</th>
                      <th>GST</th>
                      <th>Bank Account</th>
                      <th>Business Reg.</th>
                    </>
                  ) : (
                    <>
                      <th>Driving License</th>
                      <th>Aadhaar</th>
                      <th>Vehicle Reg.</th>
                      <th>Vehicle Insurance</th>
                    </>
                  )}
                  <th>Submission</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={activeTab === 'brokers' ? 9 : 8} className="text-center py-10 text-neutral-400 text-sm">No {activeTab.slice(0, -1)} KYC submissions found</td></tr>
                ) : paginated.map((kyc) => (
                  <tr key={kyc.id}>
                    <td className="font-medium whitespace-nowrap">{kyc.name}</td>
                    {activeTab === 'brokers' ? (
                      <>
                        <td className="text-xs whitespace-nowrap">{kyc.pan}</td>
                        <td className="text-xs whitespace-nowrap">{kyc.aadhaar}</td>
                        <td className="text-xs whitespace-nowrap">{kyc.gst}</td>
                        <td className="text-xs whitespace-nowrap">{kyc.bankAccount}</td>
                        <td>{kyc.businessReg || '-'}</td>
                      </>
                    ) : (
                      <>
                        <td className="text-xs whitespace-nowrap">{kyc.licenseNo}</td>
                        <td className="text-xs whitespace-nowrap">{kyc.aadhaar}</td>
                        <td className="text-xs whitespace-nowrap">{kyc.vehicleReg || '—'}</td>
                        <td className="text-xs whitespace-nowrap">{kyc.vehicleIns || '—'}</td>
                      </>
                    )}
                    <td className="whitespace-nowrap">{kyc.submissionDate}</td>
                    <td><Badge status={kyc.status} /></td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setSelectedKYC(kyc); setShowRejectBox(false); }} className="p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors" title="View Documents">
                          <FileText size={14} />
                        </button>
                        {kyc.status === 'Pending' && (
                          <>
                            <button onClick={() => handleApprove(kyc.id, kyc.name)} disabled={actionLoading === kyc.id + '_verify'} className="p-1.5 text-tertiary bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-40" title="Approve">
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => openRejectFlow(kyc)} className="p-1.5 text-danger bg-red-50 rounded-lg hover:bg-red-100 transition-colors" title="Reject">
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">Showing {currentPage} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"><ChevronLeft size={16} /></button>
              {pageNumbers.map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-50 border border-neutral-200'}`}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={!!selectedKYC} onClose={() => { setSelectedKYC(null); setShowRejectBox(false); setRejectReason(''); }} title={`${activeTab === 'brokers' ? 'Broker' : 'Driver'} KYC Details`} size="lg">
        {selectedKYC && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-poppins font-semibold text-secondary">{selectedKYC.name}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <Badge status={selectedKYC.status} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {activeTab === 'brokers' ? (
                <>
                  <div className="bg-neutral-50 rounded-xl p-4"><span className="text-neutral-500">PAN</span><p className="mt-1 font-medium text-neutral-800">{selectedKYC.pan}</p></div>
                  <div className="bg-neutral-50 rounded-xl p-4"><span className="text-neutral-500">Aadhaar</span><p className="mt-1 font-medium text-neutral-800">{selectedKYC.aadhaar}</p></div>
                  <div className="bg-neutral-50 rounded-xl p-4"><span className="text-neutral-500">GST</span><p className="mt-1 font-medium text-neutral-800">{selectedKYC.gst}</p></div>
                  <div className="bg-neutral-50 rounded-xl p-4"><span className="text-neutral-500">Bank Account</span><p className="mt-1 font-medium text-neutral-800">{selectedKYC.bankAccount}</p></div>
                </>
              ) : (
                <>
                  <div className="bg-neutral-50 rounded-xl p-4"><span className="text-neutral-500">Driving License</span><p className="mt-1 font-medium text-neutral-800">{selectedKYC.licenseNo}</p></div>
                  <div className="bg-neutral-50 rounded-xl p-4"><span className="text-neutral-500">Aadhaar</span><p className="mt-1 font-medium text-neutral-800">{selectedKYC.aadhaar}</p></div>
                  <div className="bg-neutral-50 rounded-xl p-4"><span className="text-neutral-500">Vehicle Registration</span><p className="mt-1 font-medium text-neutral-800">{selectedKYC.vehicleReg || '—'}</p></div>
                  <div className="bg-neutral-50 rounded-xl p-4"><span className="text-neutral-500">Vehicle Insurance</span><p className="mt-1 font-medium text-neutral-800">{selectedKYC.vehicleIns || '—'}</p></div>
                </>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-secondary mb-3">Uploaded Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeTab === 'brokers' ? (
                  <>
                    <DocumentPreview label="PAN Document" url={selectedKYC.panPhotoUrl} />
                    <DocumentPreview label="Aadhaar Document" url={selectedKYC.aadhaarPhotoUrl} />
                  </>
                ) : (
                  <>
                    <DocumentPreview label="License Document" url={selectedKYC.licensePhotoUrl} />
                    <DocumentPreview label="Aadhaar Document" url={selectedKYC.aadhaarPhotoUrl} />
                  </>
                )}
              </div>
            </div>

            {selectedKYC.rejectionReason && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-danger">
                <span className="font-semibold">Last rejection:</span> {selectedKYC.rejectionReason}
              </div>
            )}

            {showRejectBox && (
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
                className="form-input resize-none"
              />
            )}

            <div className="flex justify-between gap-2">
              <div className="flex gap-2">
                {selectedKYC.status === 'Pending' && (
                  <button
                    onClick={() => handleApprove(selectedKYC.id, selectedKYC.name)}
                    disabled={actionLoading === selectedKYC.id + '_verify'}
                    className="btn-success disabled:opacity-40"
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                )}
                {selectedKYC.status === 'Pending' && !showRejectBox && (
                  <button onClick={() => setShowRejectBox(true)} className="btn-danger">
                    <XCircle size={16} /> Reject
                  </button>
                )}
                {selectedKYC.status === 'Pending' && showRejectBox && (
                  <button
                    onClick={() => handleReject(selectedKYC.id, selectedKYC.name, rejectReason)}
                    disabled={actionLoading === selectedKYC.id + '_reject'}
                    className="btn-danger disabled:opacity-40"
                  >
                    <XCircle size={16} /> Confirm Reject
                  </button>
                )}
              </div>
              <button onClick={() => { setSelectedKYC(null); setShowRejectBox(false); setRejectReason(''); }} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
