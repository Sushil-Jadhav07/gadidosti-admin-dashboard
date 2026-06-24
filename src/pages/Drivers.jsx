import { useState } from 'react';
import { Search, Eye, ChevronLeft, ChevronRight, CarFront, Phone } from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { drivers } from '../data/mockData';

export default function Drivers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const itemsPerPage = 10;

  const filtered = drivers.filter((d) =>
    !searchTerm ||
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone.includes(searchTerm) ||
    d.licenseNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>License No.</th>
                <th>Assigned Broker</th>
                <th>Status</th>
                <th className="text-right">Total Trips</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((driver) => (
                <tr key={driver.id}>
                  <td className="font-medium text-neutral-800">{driver.id}</td>
                  <td className="font-medium">{driver.name}</td>
                  <td className="whitespace-nowrap">{driver.phone}</td>
                  <td className="text-xs whitespace-nowrap">{driver.licenseNo}</td>
                  <td>{driver.broker}</td>
                  <td><Badge status={driver.status} /></td>
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

      <Modal isOpen={!!selectedDriver} onClose={() => setSelectedDriver(null)} title="Driver Details" size="md">
        {selectedDriver && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                <CarFront size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary">{selectedDriver.name}</h3>
                <Badge status={selectedDriver.status} />
              </div>
            </div>
            <div className="bg-neutral-50 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Driver ID</span><span className="font-medium">{selectedDriver.id}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Phone</span><span className="font-medium">{selectedDriver.phone}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">License Number</span><span className="font-medium">{selectedDriver.licenseNo}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Assigned Broker</span><span className="font-medium">{selectedDriver.broker}</span></div>
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
