import { useState } from 'react';
import { Search, CheckCircle, XCircle, ChevronLeft, ChevronRight, FileText, ShieldCheck } from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { brokerKYC, driverKYC } from '../data/mockData';

function DocumentPlaceholder({ label }) {
  return (
    <div className="bg-neutral-100 border-2 border-dashed border-neutral-200 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:border-primary/30 transition-colors cursor-pointer">
      <FileText size={20} className="text-neutral-400 mb-1" />
      <span className="text-xs text-neutral-500">{label}</span>
    </div>
  );
}

export default function KYC() {
  const [activeTab, setActiveTab] = useState('brokers');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedKYC, setSelectedKYC] = useState(null);
  const [toast, setToast] = useState(null);
  const [brokerData, setBrokerData] = useState(brokerKYC);
  const [driverData, setDriverData] = useState(driverKYC);
  const itemsPerPage = 8;

  const data = activeTab === 'brokers' ? brokerData : driverData;

  const filtered = data.filter((k) =>
    !searchTerm || k.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handleApprove = (name) => {
    if (activeTab === 'brokers') {
      setBrokerData(prev => prev.map(k => k.name === name ? { ...k, status: 'Verified' } : k));
    } else {
      setDriverData(prev => prev.map(k => k.name === name ? { ...k, status: 'Verified' } : k));
    }
    setToast({ message: `${name}'s KYC approved successfully`, type: 'success' });
  };

  const handleReject = (name) => {
    if (activeTab === 'brokers') {
      setBrokerData(prev => prev.map(k => k.name === name ? { ...k, status: 'Rejected' } : k));
    } else {
      setDriverData(prev => prev.map(k => k.name === name ? { ...k, status: 'Rejected' } : k));
    }
    setToast({ message: `${name}'s KYC rejected`, type: 'error' });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">KYC Verification</h1>
        <p className="text-sm text-neutral-500 mt-1">Review and approve KYC documents for brokers and drivers</p>
      </div>

      {/* Tabs */}
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

      <div className="card p-4">
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="form-input pl-9"
          />
        </div>
      </div>

      {/* Broker KYC Table */}
      {activeTab === 'brokers' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>PAN</th>
                  <th>Aadhaar</th>
                  <th>GST</th>
                  <th>Bank Account</th>
                  <th>Business Reg.</th>
                  <th>Submission</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((kyc) => (
                  <tr key={kyc.name}>
                    <td className="font-medium">{kyc.name}</td>
                    <td className="text-xs">{kyc.pan}</td>
                    <td className="text-xs">{kyc.aadhaar}</td>
                    <td className="text-xs">{kyc.gst}</td>
                    <td className="text-xs">{kyc.bankAccount}</td>
                    <td>{kyc.businessReg || '-'}</td>
                    <td>{kyc.submissionDate}</td>
                    <td><Badge status={kyc.status} /></td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setSelectedKYC(kyc)} className="p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors" title="View Documents">
                          <FileText size={14} />
                        </button>
                        {kyc.status === 'Pending' && (
                          <>
                            <button onClick={() => handleApprove(kyc.name)} className="p-1.5 text-tertiary bg-green-50 rounded-lg hover:bg-green-100 transition-colors" title="Approve">
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => handleReject(kyc.name)} className="p-1.5 text-danger bg-red-50 rounded-lg hover:bg-red-100 transition-colors" title="Reject">
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

      {/* Driver KYC Table */}
      {activeTab === 'drivers' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Driving License</th>
                  <th>Aadhaar</th>
                  <th>Vehicle Docs</th>
                  <th>Submission</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((kyc) => (
                  <tr key={kyc.name}>
                    <td className="font-medium">{kyc.name}</td>
                    <td className="text-xs whitespace-nowrap">{kyc.licenseNo}</td>
                    <td className="text-xs">{kyc.aadhaar}</td>
                    <td>
                      <Badge status={kyc.vehicleDocs ? 'Verified' : 'Pending'}>
                        {kyc.vehicleDocs ? 'Submitted' : 'Missing'}
                      </Badge>
                    </td>
                    <td>{kyc.submissionDate}</td>
                    <td><Badge status={kyc.status} /></td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setSelectedKYC(kyc)} className="p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors" title="View Documents">
                          <FileText size={14} />
                        </button>
                        {kyc.status === 'Pending' && (
                          <>
                            <button onClick={() => handleApprove(kyc.name)} className="p-1.5 text-tertiary bg-green-50 rounded-lg hover:bg-green-100 transition-colors" title="Approve">
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => handleReject(kyc.name)} className="p-1.5 text-danger bg-red-50 rounded-lg hover:bg-red-100 transition-colors" title="Reject">
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

      {/* View Documents Modal */}
      <Modal isOpen={!!selectedKYC} onClose={() => setSelectedKYC(null)} title="KYC Documents" size="md">
        {selectedKYC && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <ShieldCheck size={18} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-secondary">{selectedKYC.name}</h3>
                <Badge status={selectedKYC.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {activeTab === 'brokers' ? (
                <>
                  <DocumentPlaceholder label="PAN Card" />
                  <DocumentPlaceholder label="Aadhaar Card" />
                  <DocumentPlaceholder label="GST Certificate" />
                  <DocumentPlaceholder label="Bank Statement" />
                  {selectedKYC.businessReg && <DocumentPlaceholder label="Business Registration" />}
                </>
              ) : (
                <>
                  <DocumentPlaceholder label="Driving License" />
                  <DocumentPlaceholder label="Aadhaar Card" />
                  {selectedKYC.vehicleDocs && <DocumentPlaceholder label="Vehicle Documents" />}
                </>
              )}
            </div>

            <div className="bg-neutral-50 rounded-lg p-4 space-y-2 text-sm">
              {activeTab === 'brokers' ? (
                <>
                  <div className="flex justify-between"><span className="text-neutral-500">PAN</span><span className="font-medium">{selectedKYC.pan}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Aadhaar</span><span className="font-medium">{selectedKYC.aadhaar}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">GST</span><span className="font-medium">{selectedKYC.gst}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Bank Account</span><span className="font-medium">{selectedKYC.bankAccount}</span></div>
                </>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-neutral-500">License No.</span><span className="font-medium">{selectedKYC.licenseNo}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Aadhaar</span><span className="font-medium">{selectedKYC.aadhaar}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Vehicle Docs</span><span className="font-medium">{selectedKYC.vehicleDocs ? 'Submitted' : 'Missing'}</span></div>
                </>
              )}
              <div className="flex justify-between"><span className="text-neutral-500">Submission Date</span><span className="font-medium">{selectedKYC.submissionDate}</span></div>
            </div>

            {selectedKYC.status === 'Pending' && (
              <div className="flex gap-2">
                <button onClick={() => { handleApprove(selectedKYC.name); setSelectedKYC(null); }} className="btn-success flex-1">
                  <CheckCircle size={16} /> Approve
                </button>
                <button onClick={() => { handleReject(selectedKYC.name); setSelectedKYC(null); }} className="btn-danger flex-1">
                  <XCircle size={16} /> Reject
                </button>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={() => setSelectedKYC(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
