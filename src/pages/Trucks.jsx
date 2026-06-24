import { useState } from 'react';
import { Search, Eye, ChevronLeft, ChevronRight, Truck } from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { trucks } from '../data/mockData';

export default function Trucks() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const itemsPerPage = 10;

  const filtered = trucks.filter((t) =>
    !searchTerm ||
    t.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.broker.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Trucks</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage fleet and track truck availability</p>
      </div>

      <div className="card p-4">
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search trucks..."
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
                <th>Truck ID</th>
                <th>Registration No.</th>
                <th>Type</th>
                <th>Broker</th>
                <th>Driver Assigned</th>
                <th>Capacity</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((truck) => (
                <tr key={truck.id}>
                  <td className="font-medium text-neutral-800">{truck.id}</td>
                  <td className="font-medium whitespace-nowrap">{truck.regNo}</td>
                  <td>{truck.type}</td>
                  <td className="whitespace-nowrap">{truck.broker}</td>
                  <td>{truck.driver}</td>
                  <td>{truck.capacity}</td>
                  <td><Badge status={truck.status} /></td>
                  <td className="text-center">
                    <button onClick={() => setSelectedTruck(truck)} className="p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors" title="View Details">
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

      <Modal isOpen={!!selectedTruck} onClose={() => setSelectedTruck(null)} title="Truck Details" size="md">
        {selectedTruck && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                <Truck size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary">{selectedTruck.regNo}</h3>
                <Badge status={selectedTruck.status} />
              </div>
            </div>
            <div className="bg-neutral-50 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Truck ID</span><span className="font-medium">{selectedTruck.id}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Registration Number</span><span className="font-medium">{selectedTruck.regNo}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Type</span><span className="font-medium">{selectedTruck.type}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Capacity</span><span className="font-medium">{selectedTruck.capacity}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Broker</span><span className="font-medium">{selectedTruck.broker}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Driver</span><span className="font-medium">{selectedTruck.driver}</span></div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedTruck(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
