import { useEffect, useMemo, useState } from "react";
import { IndianRupee, Search, Send, History, X, Loader2, Percent } from "lucide-react";
import Toast from "../components/Toast";
import { api, getToken } from "../services/api";

function Spinner({ className = "w-4 h-4 border-2 border-white/30 border-t-white" }) {
  return <div className={`${className} rounded-full animate-spin`} />;
}

const ROLE_META = {
  driver: { label: "Driver", className: "bg-primary/10 text-primary" },
  broker: { label: "Broker", className: "bg-indigo-50 text-indigo-700" },
};

const TXN_META = {
  earning: { label: "Earning", sign: "+", className: "text-tertiary" },
  payout: { label: "Payout", sign: "-", className: "text-danger" },
};

export default function Payouts() {
  const [candidates, setCandidates] = useState([]);
  const [globalCommission, setGlobalCommission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [toast, setToast] = useState(null);

  // Commission-rate editing — one field active at a time, local draft until saved.
  const [editingCommission, setEditingCommission] = useState(null); // userId
  const [commissionDraft, setCommissionDraft] = useState("");
  const [savingCommission, setSavingCommission] = useState(false);

  // Payout modal
  const [payoutTarget, setPayoutTarget] = useState(null); // candidate row
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [loggingPayout, setLoggingPayout] = useState(false);

  // History modal
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyTransactions, setHistoryTransactions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchCandidates = async () => {
    setLoading(true);
    setError("");
    try {
      const [payoutsRes, settingsRes] = await Promise.all([
        api.get("/api/admin/payouts?limit=200", getToken()),
        api.get("/api/admin/settings", getToken()),
      ]);
      if (payoutsRes.success) setCandidates(payoutsRes.data?.candidates || []);
      else setError(payoutsRes.message || "Failed to load payout candidates");
      if (settingsRes.success) setGlobalCommission(Number(settingsRes.data?.commissionRate ?? settingsRes.data?.commission_rate ?? 10));
    } catch {
      setError("Network error — could not load payout candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCandidates(); }, []);

  const filtered = useMemo(() => candidates.filter((c) => {
    if (roleFilter !== "all" && c.role !== roleFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q);
  }), [candidates, roleFilter, search]);

  const totalOwed = useMemo(() => candidates.reduce((sum, c) => sum + Number(c.balance || 0), 0), [candidates]);

  // ─── Commission override ───────────────────────────────────────────────────
  const startEditCommission = (candidate) => {
    setEditingCommission(candidate.id);
    setCommissionDraft(candidate.commission_rate != null ? String(candidate.commission_rate) : "");
  };

  const saveCommission = async (userId) => {
    const trimmed = commissionDraft.trim();
    const rate = trimmed === "" ? null : Number(trimmed);
    if (rate !== null && (Number.isNaN(rate) || rate < 0 || rate > 100)) {
      setToast({ message: "Commission must be between 0 and 100", type: "error" });
      return;
    }
    setSavingCommission(true);
    try {
      const res = await api.patch(`/api/admin/payouts/${userId}/commission`, { commission_rate: rate }, getToken());
      if (!res.success) throw new Error(res.message);
      setCandidates((prev) => prev.map((c) => (c.id === userId ? { ...c, commission_rate: rate } : c)));
      setEditingCommission(null);
      setToast({ message: "Commission rate updated", type: "success" });
    } catch (err) {
      setToast({ message: err.message || "Failed to update commission rate", type: "error" });
    } finally {
      setSavingCommission(false);
    }
  };

  // ─── Payout modal ───────────────────────────────────────────────────────────
  const openPayout = (candidate) => {
    setPayoutTarget(candidate);
    setPayoutAmount("");
    setPayoutNote("");
  };

  const submitPayout = async () => {
    const amount = Number(payoutAmount);
    if (!amount || amount <= 0) {
      setToast({ message: "Enter a valid amount", type: "error" });
      return;
    }
    setLoggingPayout(true);
    try {
      const res = await api.post(`/api/admin/payouts/${payoutTarget.id}`, { amount, note: payoutNote.trim() || undefined }, getToken());
      if (!res.success) throw new Error(res.message);
      setCandidates((prev) => prev.map((c) => (c.id === payoutTarget.id ? { ...c, balance: res.data.balance } : c)));
      setToast({ message: `Payout of ₹${amount.toLocaleString("en-IN")} logged for ${payoutTarget.name}`, type: "success" });
      setPayoutTarget(null);
    } catch (err) {
      setToast({ message: err.message || "Failed to log payout", type: "error" });
    } finally {
      setLoggingPayout(false);
    }
  };

  // ─── History modal ──────────────────────────────────────────────────────────
  const openHistory = async (candidate) => {
    setHistoryTarget(candidate);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/api/admin/payouts/${candidate.id}?limit=50`, getToken());
      if (res.success) setHistoryTransactions(res.data.transactions || []);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Payouts</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Driver/broker earnings, commission rates, and manual payout logging.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Total Owed</p>
          <p className="text-2xl font-poppins font-bold text-secondary">
            {loading ? "—" : `₹${totalOwed.toLocaleString("en-IN")}`}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">People Owed Money</p>
          <p className="text-2xl font-poppins font-bold text-secondary">
            {loading ? "—" : candidates.filter((c) => Number(c.balance) > 0).length}
          </p>
        </div>
        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Global Commission</p>
            <p className="text-2xl font-poppins font-bold text-secondary">{globalCommission != null ? `${globalCommission}%` : "—"}</p>
          </div>
          <Percent className="w-8 h-8 text-primary/20" />
        </div>
      </div>

      {error && (
        <div className="card p-4 text-sm text-danger flex items-center gap-2">
          <span>{error}</span>
          <button onClick={fetchCandidates} className="underline">Retry</button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 pt-4 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-50">
          <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg w-fit">
            {["all", "driver", "broker"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all capitalize ${roleFilter === r ? "bg-white text-primary shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
              >
                {r === "all" ? "All" : `${r}s`}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-9 !py-2"
            />
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
                  <th>Name</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Commission</th>
                  <th>Wallet Balance</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-neutral-400 text-sm">No drivers/brokers found</td></tr>
                ) : filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium whitespace-nowrap">{c.name}</td>
                    <td>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_META[c.role]?.className}`}>
                        {ROLE_META[c.role]?.label || c.role}
                      </span>
                    </td>
                    <td className="text-xs whitespace-nowrap">{c.phone || "—"}</td>
                    <td className="whitespace-nowrap">
                      {editingCommission === c.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            autoFocus
                            value={commissionDraft}
                            onChange={(e) => setCommissionDraft(e.target.value)}
                            placeholder={String(globalCommission ?? "")}
                            className="w-16 form-input !py-1 !px-2 text-xs"
                          />
                          <button onClick={() => saveCommission(c.id)} disabled={savingCommission} className="text-primary hover:bg-primary/10 rounded p-1">
                            {savingCommission ? <Spinner className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary" /> : <Send size={13} />}
                          </button>
                          <button onClick={() => setEditingCommission(null)} className="text-neutral-400 hover:bg-neutral-100 rounded p-1">
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEditCommission(c)} className="text-xs font-medium text-neutral-700 hover:text-primary underline decoration-dotted underline-offset-2">
                          {c.commission_rate != null ? `${c.commission_rate}%` : `${globalCommission ?? "—"}% (default)`}
                        </button>
                      )}
                    </td>
                    <td className="font-semibold whitespace-nowrap">₹{Number(c.balance).toLocaleString("en-IN")}</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openHistory(c)} className="p-1.5 text-neutral-400 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors" title="Transaction History">
                          <History size={14} />
                        </button>
                        <button
                          onClick={() => openPayout(c)}
                          disabled={!(Number(c.balance) > 0)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Send size={12} /> Log Payout
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout modal */}
      {payoutTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-poppins font-semibold text-lg text-secondary">Log Payout</h3>
              <button onClick={() => setPayoutTarget(null)} className="text-neutral-400 hover:text-neutral-600"><X size={18} /></button>
            </div>
            <p className="text-sm text-neutral-500 mb-1">{payoutTarget.name} ({ROLE_META[payoutTarget.role]?.label})</p>
            <p className="text-xs text-neutral-400 mb-4">Current balance: ₹{Number(payoutTarget.balance).toLocaleString("en-IN")}</p>

            <label className="text-xs font-semibold text-neutral-500 mb-1.5 block">Amount Paid</label>
            <div className="relative mb-4">
              <IndianRupee className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min={0}
                max={payoutTarget.balance}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder={String(payoutTarget.balance)}
                className="form-input pl-8 w-full"
                autoFocus
              />
            </div>

            <label className="text-xs font-semibold text-neutral-500 mb-1.5 block">Note (optional)</label>
            <textarea
              value={payoutNote}
              onChange={(e) => setPayoutNote(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="e.g. Paid via UPI, ref #12345"
              className="form-input w-full resize-none mb-5"
            />

            <div className="flex gap-2.5">
              <button onClick={() => setPayoutTarget(null)} disabled={loggingPayout} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={submitPayout} disabled={loggingPayout} className="flex-1 btn-primary justify-center">
                {loggingPayout ? <><Spinner />Logging...</> : "Log Payout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {historyTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 flex-shrink-0">
              <div>
                <h3 className="font-poppins font-semibold text-lg text-secondary">{historyTarget.name}</h3>
                <p className="text-xs text-neutral-400">Wallet transaction history</p>
              </div>
              <button onClick={() => setHistoryTarget(null)} className="text-neutral-400 hover:text-neutral-600"><X size={18} /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {historyLoading ? (
                <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
              ) : historyTransactions.length === 0 ? (
                <div className="p-10 text-center text-sm text-neutral-400">No transactions yet</div>
              ) : (
                <div className="divide-y divide-neutral-50">
                  {historyTransactions.map((t) => {
                    const meta = TXN_META[t.type] || { label: t.type, sign: "", className: "text-neutral-600" };
                    return (
                      <div key={t.id} className="px-6 py-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800">{meta.label}</p>
                          <p className="text-xs text-neutral-400">{new Date(t.created_at).toLocaleString("en-IN")}</p>
                          {t.note && <p className="text-xs text-neutral-400 italic mt-0.5">{t.note}</p>}
                        </div>
                        <p className={`text-sm font-semibold flex-shrink-0 ${meta.className}`}>
                          {meta.sign}₹{Number(t.amount).toLocaleString("en-IN")}
                        </p>
                      </div>
                    );
                  })}
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
