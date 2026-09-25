import { useEffect, useState, useCallback } from 'react';
import { CalendarClock, RefreshCw, ChevronDown } from 'lucide-react';
import { api, getToken } from '../services/api';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ENQUIRY_STATUS = ['open', 'contacted', 'closed'];
const ENQUIRY_STATUS_CLASS = {
  open: 'bg-primary-50 text-primary',
  contacted: 'bg-amber-50 text-amber-600',
  closed: 'bg-neutral-100 text-neutral-500',
};
const LISTING_STATUS_CLASS = {
  active: 'bg-emerald-50 text-emerald-600',
  inactive: 'bg-neutral-100 text-neutral-500',
};

// Both tabs are read-mostly for admin — the only write action here is nudging an enquiry's
// status (open/contacted/closed) as a manual follow-up tracker. Nothing here matches an enquiry
// to a listing automatically; that's still a phone-call-and-judgement job for now (see
// gadidosti-backend's monthlyHiring.controller.js for the reasoning).
export default function MonthlyHiring() {
  const [tab, setTab] = useState('enquiries');

  const [enquiries, setEnquiries] = useState([]);
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState('');
  const [loadingEnquiries, setLoadingEnquiries] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);

  const loadEnquiries = useCallback(async (status) => {
    setLoadingEnquiries(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (status) params.append('status', status);
      const res = await api.get(`/api/admin/monthly-hiring/enquiries?${params}`, getToken());
      if (res?.success) setEnquiries(res.data?.enquiries || []);
    } catch {
      /* stays empty on failure */
    } finally {
      setLoadingEnquiries(false);
    }
  }, []);

  const loadListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const res = await api.get('/api/admin/monthly-hiring/listings?limit=100', getToken());
      if (res?.success) setListings(res.data?.listings || []);
    } catch {
      /* stays empty on failure */
    } finally {
      setLoadingListings(false);
    }
  }, []);

  useEffect(() => { loadEnquiries(enquiryStatusFilter); }, [enquiryStatusFilter, loadEnquiries]);
  useEffect(() => { loadListings(); }, [loadListings]);

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    try {
      const res = await api.patch(`/api/admin/monthly-hiring/enquiries/${id}/status`, { status }, getToken());
      if (res?.success) setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    } catch {
      /* leaves the dropdown as-is on failure */
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
          <CalendarClock size={18} className="text-primary" />
        </span>
        <div>
          <h1 className="text-2xl font-poppins font-bold text-secondary">Monthly Hiring</h1>
          <p className="text-sm text-neutral-500 mt-1">Client enquiries and driver/broker vehicle listings for monthly hire.</p>
        </div>
      </div>

      <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('enquiries')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === 'enquiries' ? 'bg-white text-primary shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          Enquiries {enquiries.length > 0 && `(${enquiries.length})`}
        </button>
        <button
          onClick={() => setTab('listings')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === 'listings' ? 'bg-white text-primary shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          Vehicle Listings {listings.length > 0 && `(${listings.length})`}
        </button>
      </div>

      {tab === 'enquiries' ? (
        <div className="card overflow-hidden">
          <div className="px-5 pt-4 pb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-poppins font-semibold text-secondary">Client Enquiries</h3>
            <div className="flex items-center gap-2">
              <div className="relative min-w-[150px]">
                <select
                  value={enquiryStatusFilter}
                  onChange={(e) => setEnquiryStatusFilter(e.target.value)}
                  className="form-select !py-2 pl-3 pr-8"
                >
                  <option value="">All Statuses</option>
                  {ENQUIRY_STATUS.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              </div>
              <button onClick={() => loadEnquiries(enquiryStatusFilter)} disabled={loadingEnquiries} className="btn-secondary !py-2 !px-3 text-sm disabled:opacity-40">
                <RefreshCw size={14} className={loadingEnquiries ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Location</th>
                  <th>Category</th>
                  <th>Duration</th>
                  <th>Pricing</th>
                  <th>Budget</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {loadingEnquiries ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 9 }).map((_, j) => <td key={j}><div className="h-4 bg-neutral-100 rounded animate-pulse w-20" /></td>)}</tr>
                  ))
                ) : enquiries.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-neutral-400 text-sm">No enquiries found</td></tr>
                ) : enquiries.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <p className="text-sm font-semibold text-neutral-800 leading-tight">{e.clientName}</p>
                      <p className="text-xs text-neutral-400 leading-tight">{e.clientPhone}</p>
                    </td>
                    <td className="text-sm max-w-[160px] truncate" title={e.location}>{e.location}</td>
                    <td className="text-sm">{e.truckCategory ? cap(e.truckCategory) : '—'}</td>
                    <td className="text-sm whitespace-nowrap">{e.durationMonths ? `${e.durationMonths} mo` : '—'}</td>
                    <td className="text-sm whitespace-nowrap">{e.pricingType === 'per_km' ? 'Per KM' : 'Fixed'}</td>
                    <td className="text-sm whitespace-nowrap">{e.budgetAmount != null ? `₹${e.budgetAmount.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="text-sm max-w-[220px] truncate" title={e.description || ''}>{e.description || '—'}</td>
                    <td>
                      <select
                        value={e.status}
                        onChange={(ev) => handleStatusChange(e.id, ev.target.value)}
                        disabled={updatingId === e.id}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer disabled:opacity-50 ${ENQUIRY_STATUS_CLASS[e.status] || ENQUIRY_STATUS_CLASS.open}`}
                      >
                        {ENQUIRY_STATUS.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
                      </select>
                    </td>
                    <td className="text-sm text-neutral-600 whitespace-nowrap">{fmtDate(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 pt-4 pb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-poppins font-semibold text-secondary">Vehicle Listings</h3>
            <button onClick={loadListings} disabled={loadingListings} className="btn-secondary !py-2 !px-3 text-sm disabled:opacity-40">
              <RefreshCw size={14} className={loadingListings ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Truck</th>
                  <th>Category</th>
                  <th>Pricing</th>
                  <th>Rate</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Listed</th>
                </tr>
              </thead>
              <tbody>
                {loadingListings ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j}><div className="h-4 bg-neutral-100 rounded animate-pulse w-20" /></td>)}</tr>
                  ))
                ) : listings.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-neutral-400 text-sm">No listings found</td></tr>
                ) : listings.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <p className="text-sm font-semibold text-neutral-800 leading-tight">{l.ownerName}</p>
                      <p className="text-xs text-neutral-400 leading-tight">{l.ownerPhone} · {cap(l.ownerRole)}</p>
                    </td>
                    <td className="text-sm whitespace-nowrap">{l.truckRegistration}</td>
                    <td className="text-sm">{l.truckCategory ? cap(l.truckCategory) : (l.truckType || '—')}</td>
                    <td className="text-sm whitespace-nowrap">{l.pricingType === 'per_km' ? 'Per KM' : 'Fixed'}</td>
                    <td className="text-sm whitespace-nowrap">₹{l.rateAmount.toLocaleString('en-IN')}</td>
                    <td className="text-sm max-w-[220px] truncate" title={l.availabilityNotes || ''}>{l.availabilityNotes || '—'}</td>
                    <td>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${LISTING_STATUS_CLASS[l.status] || LISTING_STATUS_CLASS.active}`}>
                        {cap(l.status)}
                      </span>
                    </td>
                    <td className="text-sm text-neutral-600 whitespace-nowrap">{fmtDate(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
