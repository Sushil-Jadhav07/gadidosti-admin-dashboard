import { useEffect, useMemo, useState } from "react";
import { Receipt, Send, CheckCircle2, X, Loader2 } from "lucide-react";
import Toast from "../components/Toast";
import { api, getToken } from "../services/api";

function Spinner({ className = "w-4 h-4 border-2 border-white/30 border-t-white" }) {
  return <div className={`${className} rounded-full animate-spin`} />;
}

const STATUS_META = {
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700" },
  paid: { label: "Paid", className: "bg-emerald-50 text-emerald-700" },
};

const TRIGGER_META = {
  monthly: "Monthly",
  credit_limit: "Credit Limit Reached",
};

export default function PostpaidBills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const [detailTarget, setDetailTarget] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [payModalTarget, setPayModalTarget] = useState(null);
  const [payMode, setPayMode] = useState("bank_transfer");
  const [payNote, setPayNote] = useState("");
  const [markingPaid, setMarkingPaid] = useState(false);

  const fetchBills = async () => {
    setLoading(true);
    setError("");
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}&limit=200` : "?limit=200";
      const res = await api.get(`/api/admin/postpaid-bills${params}`, getToken());
      if (res.success) setBills(res.data?.bills || []);
      else setError(res.message || "Failed to load bills");
    } catch {
      setError("Network error — could not load bills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBills(); }, [statusFilter]);

  const totalPending = useMemo(
    () => bills.filter((b) => b.status === "pending").reduce((sum, b) => sum + Number(b.total_amount), 0),
    [bills]
  );

  const handleSend = async (bill) => {
    setActionLoading(bill.id + "_send");
    try {
      const res = await api.post(`/api/admin/postpaid-bills/${bill.id}/send`, {}, getToken());
      if (!res.success) throw new Error(res.message);
      setBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, sent_at: res.data.bill.sent_at } : b)));
      setToast({ message: `Bill sent to ${bill.client_name}`, type: "success" });
    } catch (err) {
      setToast({ message: err.message || "Failed to send bill", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const openDetail = async (bill) => {
    setDetailTarget(bill);
    setDetailLoading(true);
    try {
      const res = await api.get(`/api/admin/postpaid-bills/${bill.id}`, getToken());
      if (res.success) setDetailItems(res.data.items || []);
    } finally {
      setDetailLoading(false);
    }
  };

  const openPayModal = (bill) => {
    setPayModalTarget(bill);
    setPayMode("bank_transfer");
    setPayNote("");
  };

  const submitMarkPaid = async () => {
    setMarkingPaid(true);
    try {
      const res = await api.post(`/api/admin/postpaid-bills/${payModalTarget.id}/mark-paid`, { payment_mode: payMode, note: payNote.trim() || undefined }, getToken());
      if (!res.success) throw new Error(res.message);
      setBills((prev) => prev.map((b) => (b.id === payModalTarget.id ? { ...b, status: "paid" } : b)));
      setToast({ message: `Bill for ${payModalTarget.client_name} marked as paid`, type: "success" });
      setPayModalTarget(null);
    } catch (err) {
      setToast({ message: err.message || "Failed to mark bill as paid", type: "error" });
    } finally {
      setMarkingPaid(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Postpaid Bills</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Bills raised for postpaid clients — monthly, or when a client reaches their credit limit.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Total Pending</p>
          <p className="text-2xl font-poppins font-bold text-secondary">{loading ? "—" : `₹${totalPending.toLocaleString("en-IN")}`}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Pending Bills</p>
          <p className="text-2xl font-poppins font-bold text-secondary">{loading ? "—" : bills.filter((b) => b.status === "pending").length}</p>
        </div>
      </div>

      {error && (
        <div className="card p-4 text-sm text-danger flex items-center gap-2">
          <span>{error}</span>
          <button onClick={fetchBills} className="underline">Retry</button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 pt-4 pb-4 border-b border-neutral-50">
          <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg w-fit">
            {["all", "pending", "paid"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all capitalize ${statusFilter === s ? "bg-white text-primary shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Phone</th>
                  <th>Amount</th>
                  <th>Trigger</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-neutral-400 text-sm">No bills found</td></tr>
                ) : bills.map((b) => (
                  <tr key={b.id}>
                    <td className="font-medium whitespace-nowrap">
                      <button onClick={() => openDetail(b)} className="hover:text-primary hover:underline">{b.client_name}</button>
                    </td>
                    <td className="text-xs whitespace-nowrap">{b.client_phone || "—"}</td>
                    <td className="font-semibold whitespace-nowrap">₹{Number(b.total_amount).toLocaleString("en-IN")}</td>
                    <td className="text-xs whitespace-nowrap">{TRIGGER_META[b.trigger] || b.trigger}</td>
                    <td>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_META[b.status]?.className}`}>
                        {STATUS_META[b.status]?.label || b.status}
                      </span>
                    </td>
                    <td className="text-xs whitespace-nowrap text-neutral-400">{b.sent_at ? new Date(b.sent_at).toLocaleDateString("en-IN") : "Not sent"}</td>
                    <td className="text-center">
                      {b.status === "pending" && (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSend(b)}
                            disabled={actionLoading === b.id + "_send"}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-40"
                            title={b.sent_at ? "Resend" : "Send to client"}
                          >
                            <Send size={12} /> {b.sent_at ? "Resend" : "Send"}
                          </button>
                          <button
                            onClick={() => openPayModal(b)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
                          >
                            <CheckCircle2 size={12} /> Mark Paid
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mark-paid modal */}
      {payModalTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-poppins font-semibold text-lg text-secondary">Mark Bill Paid</h3>
              <button onClick={() => setPayModalTarget(null)} className="text-neutral-400 hover:text-neutral-600"><X size={18} /></button>
            </div>
            <p className="text-sm text-neutral-500 mb-1">{payModalTarget.client_name}</p>
            <p className="text-xs text-neutral-400 mb-4">Amount: ₹{Number(payModalTarget.total_amount).toLocaleString("en-IN")}</p>

            <label className="text-xs font-semibold text-neutral-500 mb-1.5 block">Payment Mode</label>
            <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className="form-select w-full mb-4">
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>

            <label className="text-xs font-semibold text-neutral-500 mb-1.5 block">Note (optional)</label>
            <textarea
              value={payNote}
              onChange={(e) => setPayNote(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="e.g. NEFT ref #12345"
              className="form-input w-full resize-none mb-5"
            />

            <div className="flex gap-2.5">
              <button onClick={() => setPayModalTarget(null)} disabled={markingPaid} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={submitMarkPaid} disabled={markingPaid} className="flex-1 btn-primary justify-center">
                {markingPaid ? <><Spinner />Saving...</> : "Mark Paid"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 flex-shrink-0">
              <div>
                <h3 className="font-poppins font-semibold text-lg text-secondary">{detailTarget.client_name}</h3>
                <p className="text-xs text-neutral-400">₹{Number(detailTarget.total_amount).toLocaleString("en-IN")} • {STATUS_META[detailTarget.status]?.label}</p>
              </div>
              <button onClick={() => setDetailTarget(null)} className="text-neutral-400 hover:text-neutral-600"><X size={18} /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {detailLoading ? (
                <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
              ) : detailItems.length === 0 ? (
                <div className="p-10 text-center text-sm text-neutral-400">No line items</div>
              ) : (
                <div className="divide-y divide-neutral-50">
                  {detailItems.map((item) => (
                    <div key={item.id} className="px-6 py-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2.5">
                        <Receipt size={14} className="text-neutral-300 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800">{item.booking_number}</p>
                          <p className="text-xs text-neutral-400 truncate">{item.pickup_location} → {item.drop_location}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold flex-shrink-0">₹{Number(item.amount).toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
