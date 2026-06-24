import { useState, useMemo } from 'react';
import { Search, Eye, ChevronLeft, ChevronRight, X, CheckCircle, MapPin, Package, IndianRupee, User, Truck, Calendar } from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { allBookings } from '../data/mockData';

const statusOptions = ['All', 'Requested', 'Accepted', 'Assigned', 'En Route', 'Picked Up', 'In Transit', 'Delivered', 'Completed', 'Cancelled'];
const truckTypeOptions = ['All', 'Small', 'Medium', 'Large', 'Part Truck'];
const timelineSteps = ['Requested', 'Accepted', 'Assigned', 'En Route Pickup', 'Picked Up', 'In Transit', 'Delivered', 'Completed'];

function InfoCard({ icon: Icon, title, rows }) {
  return (
    <div className="border border-neutral-100 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-neutral-100">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={14} className="text-primary" />
        </div>
        <h4 className="text-sm font-semibold text-secondary">{title}</h4>
      </div>
      <div className="space-y-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4">
            <span className="text-xs text-neutral-400 flex-shrink-0">{label}</span>
            <span className="text-xs font-semibold text-neutral-700 text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingDetailModal({ booking, onClose }) {
  if (!booking) return null;
  const currentStepIndex = timelineSteps.findIndex(s =>
    s === booking.status || (booking.status === 'En Route' && s === 'En Route Pickup')
  );

  return (
    <Modal isOpen={!!booking} onClose={onClose} title={`Booking Details — ${booking.id}`} size="xl">
      <div className="space-y-5">

        {/* Status Timeline */}
        <div className="border border-neutral-100 rounded-2xl p-4">
          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Status Timeline</h4>
          <div className="relative flex items-start overflow-x-auto pb-1">
            {timelineSteps.map((step, idx) => {
              const done = idx < currentStepIndex;
              const current = idx === currentStepIndex;
              const pending = idx > currentStepIndex;
              return (
                <div key={step} className="flex-1 flex flex-col items-center relative min-w-[72px]">
                  {/* Connector line — left half */}
                  {idx > 0 && (
                    <div className={`absolute top-[15px] right-1/2 w-1/2 h-0.5 ${idx <= currentStepIndex ? 'bg-primary' : 'bg-neutral-200'}`} />
                  )}
                  {/* Connector line — right half */}
                  {idx < timelineSteps.length - 1 && (
                    <div className={`absolute top-[15px] left-1/2 w-1/2 h-0.5 ${idx < currentStepIndex ? 'bg-primary' : 'bg-neutral-200'}`} />
                  )}
                  {/* Circle */}
                  <div className={`relative z-10 w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold border-2 flex-shrink-0
                    ${done    ? 'bg-primary border-primary text-white' : ''}
                    ${current ? 'bg-primary border-primary text-white ring-4 ring-primary/20' : ''}
                    ${pending ? 'bg-white border-neutral-200 text-neutral-400' : ''}
                  `}>
                    {done ? <CheckCircle size={13} /> : idx + 1}
                  </div>
                  <span className={`text-[10px] mt-2 text-center leading-tight px-0.5
                    ${done || current ? 'text-primary font-semibold' : 'text-neutral-400'}
                  `}>{step}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoCard icon={User}        title="Client Information" rows={[['Name', booking.client], ['Phone', booking.clientPhone], ['Email', booking.clientEmail]]} />
          <InfoCard icon={Truck}       title="Broker Information" rows={[['Broker', booking.broker], ['Driver', booking.driver], ['Driver Phone', booking.driverPhone]]} />
          <InfoCard icon={MapPin}      title="Route Details"      rows={[['Pickup', booking.pickup], ['Drop', booking.drop], ['Truck Type', booking.truckType]]} />
          <InfoCard icon={Package}     title="Load Information"   rows={[['Weight', booking.weight], ['Material', booking.material], ['Booking Date', booking.date]]} />
        </div>

        {/* Pricing */}
        <div className="border border-neutral-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-neutral-100">
            <div className="w-7 h-7 rounded-lg bg-tertiary/10 flex items-center justify-center">
              <IndianRupee size={14} className="text-tertiary" />
            </div>
            <h4 className="text-sm font-semibold text-secondary">Pricing Breakdown</h4>
          </div>
          <div className="space-y-2.5">
            {[
              ['Base Fare',    booking.pricing.baseFare],
              ['Fuel Charges', booking.pricing.fuel],
              ['Toll Charges', booking.pricing.toll],
              ['Platform Fee', booking.pricing.platformFee],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-neutral-500">{label}</span>
                <span className="font-medium text-neutral-700">₹{val.toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div className="border-t border-neutral-200 pt-3 flex justify-between items-center">
              <span className="text-sm font-bold text-secondary">Total Amount</span>
              <span className="text-lg font-bold text-primary">₹{booking.pricing.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-neutral-400 mb-1">Status</p>
              <Badge status={booking.status} />
            </div>
            <div>
              <p className="text-xs text-neutral-400 mb-1">Payment</p>
              <Badge status={booking.paymentStatus} />
            </div>
          </div>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>

      </div>
    </Modal>
  );
}

export default function Bookings() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [truckTypeFilter, setTruckTypeFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const itemsPerPage = 10;

  const filteredBookings = useMemo(() => {
    return allBookings.filter((b) => {
      const matchStatus = statusFilter === 'All' || b.status === statusFilter;
      const matchTruck = truckTypeFilter === 'All' || b.truckType === truckTypeFilter;
      const matchSearch = !searchTerm ||
        b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.pickup.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.drop.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchTruck && matchSearch;
    });
  }, [statusFilter, truckTypeFilter, searchTerm]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Bookings</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage all bookings and track their status</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="form-label">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by ID, client, route..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="form-input pl-9"
              />
            </div>
          </div>
          <div>
            <label className="form-label">Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="form-select min-w-[140px]">
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Truck Type</label>
            <select value={truckTypeFilter} onChange={(e) => { setTruckTypeFilter(e.target.value); setCurrentPage(1); }} className="form-select min-w-[140px]">
              {truckTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Client</th>
                <th>Route</th>
                <th>Truck Type</th>
                <th>Broker</th>
                <th>Driver</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
                <th>Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="font-medium text-neutral-800 whitespace-nowrap">{booking.id}</td>
                  <td>{booking.client}</td>
                  <td className="whitespace-nowrap"><span className="text-neutral-500">{booking.pickup.split(',')[0]}</span> <span className="text-neutral-300">→</span> <span className="text-neutral-500">{booking.drop.split(',')[0]}</span></td>
                  <td>{booking.truckType}</td>
                  <td className="whitespace-nowrap">{booking.broker}</td>
                  <td className="whitespace-nowrap">{booking.driver}</td>
                  <td><Badge status={booking.status} /></td>
                  <td className="text-right font-medium whitespace-nowrap">
                    {booking.amount > 0 ? `₹${booking.amount.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td className="whitespace-nowrap">{booking.date}</td>
                  <td className="text-center">
                    <button
                      onClick={() => setSelectedBooking(booking)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedBookings.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-neutral-400">
                    No bookings found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredBookings.length)} of {filteredBookings.length} entries
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
    </div>
  );
}
