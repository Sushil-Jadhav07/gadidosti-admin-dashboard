import { useState } from 'react';
import { Search, Eye, Ban, ChevronLeft, ChevronRight, UserCheck, UserX } from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { users } from '../data/mockData';

export default function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [userData, setUserData] = useState(users);
  const itemsPerPage = 10;

  const filtered = userData.filter((u) =>
    !searchTerm ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone.includes(searchTerm) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handleBlock = (userId, action) => {
    setUserData(prev => prev.map(u => u.id === userId ? { ...u, status: action === 'block' ? 'Blocked' : 'Active' } : u));
    setToast({ message: `User ${action === 'block' ? 'blocked' : 'unblocked'} successfully`, type: 'success' });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Users (Clients)</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage registered clients and their activity</p>
      </div>

      <div className="card p-4">
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search users..."
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
                <th>User ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th className="text-right">Total Bookings</th>
                <th className="text-right">Total Spend</th>
                <th>Joined Date</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium text-neutral-800">{user.id}</td>
                  <td className="font-medium">{user.name}</td>
                  <td className="whitespace-nowrap">{user.phone}</td>
                  <td>{user.email}</td>
                  <td className="text-right">{user.totalBookings}</td>
                  <td className="text-right font-medium">&#8377;{user.totalSpend.toLocaleString('en-IN')}</td>
                  <td>{user.joinedDate}</td>
                  <td><Badge status={user.status} /></td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      {user.status === 'Active' ? (
                        <button
                          onClick={() => handleBlock(user.id, 'block')}
                          className="p-1.5 text-danger bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          title="Block User"
                        >
                          <Ban size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBlock(user.id, 'unblock')}
                          className="p-1.5 text-tertiary bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                          title="Unblock User"
                        >
                          <UserCheck size={14} />
                        </button>
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

      {/* View Modal */}
      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="User Details" size="md">
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-primary">{selectedUser.name.charAt(0)}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary">{selectedUser.name}</h3>
                <Badge status={selectedUser.status} />
              </div>
            </div>
            <div className="bg-neutral-50 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">User ID</span><span className="font-medium">{selectedUser.id}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Phone</span><span className="font-medium">{selectedUser.phone}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Email</span><span className="font-medium">{selectedUser.email}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Total Bookings</span><span className="font-medium">{selectedUser.totalBookings}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Total Spend</span><span className="font-medium">&#8377;{selectedUser.totalSpend.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Joined Date</span><span className="font-medium">{selectedUser.joinedDate}</span></div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedUser(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
