import { useState } from 'react';
import { Search, Eye, PauseCircle, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { brokers } from '../data/mockData';

export default function Brokers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBroker, setSelectedBroker] = useState(null);
  const [toast, setToast] = useState(null);
  const [brokerData, setBrokerData] = useState(brokers);
  const itemsPerPage = 10;

  const filtered = brokerData.filter((b) =>
    !searchTerm ||
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.phone.includes(searchTerm) ||
    b.gst.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handleSuspend = (brokerId) => {
    setBrokerData(prev => prev.map(b => b.id === brokerId ? { ...b, status: 'Suspended' } : b));
    setToast({ message: 'Broker suspended successfully', type: 'success' });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Brokers</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage registered brokers and their fleet</p>
      </div>

      <div className="card p-4">
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search brokers..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="form-input pl-9"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Broker ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>GST</th>
                <th className="text-right">Fleet Size</th>
                <th className="text-right">Active Trucks</th>
                <th className="text-right">Total Earnings</th>
                <th>KYC Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((broker) => (
                <tr key={broker.id}>
                  <td className="font-medium text-neutral-800">{broker.id}</td>
                  <td className="font-medium">{broker.name}</td>
                  <td className="whitespace-nowrap">{broker.phone}</td>
                  <td className="text-xs whitespace-nowrap">{broker.gst}</td>
                  <td className="text-right">{broker.fleetSize}</td>
                  <td className="text-right">{broker.activeTrucks}</td>
                  <td className="text-right font-medium">&#8377;{broker.totalEarnings.toLocaleString('en-IN')}</td>
                  <td><Badge status={broker.kycStatus} /></td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setSelectedBroker(broker)} className="p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors" title="View Details">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => handleSuspend(broker.id)} className="p-1.5 text-danger bg-red-50 rounded-lg hover:bg-red-100 transition-colors" title="Suspend Broker">
                        <PauseCircle size={14} />
                      </button>
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

      <Modal isOpen={!!selectedBroker} onClose={() => setSelectedBroker(null)} title="Broker Details" size="md">
        {selectedBroker && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                <Building2 size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary">{selectedBroker.name}</h3>
                <p className="text-sm text-neutral-500">{selectedBroker.gst}</p>
              </div>
            </div>
            <div className="bg-neutral-50 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Broker ID</span><span className="font-medium">{selectedBroker.id}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Phone</span><span className="font-medium">{selectedBroker.phone}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Fleet Size</span><span className="font-medium">{selectedBroker.fleetSize} trucks</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Active Trucks</span><span className="font-medium">{selectedBroker.activeTrucks} trucks</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Total Earnings</span><span className="font-medium">&#8377;{selectedBroker.totalEarnings.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">KYC Status</span><Badge status={selectedBroker.kycStatus} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedBroker(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
