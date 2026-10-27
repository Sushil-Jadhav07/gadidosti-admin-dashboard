import { useEffect, useState, useCallback } from "react";
import { MapPinned, Plus, Trash2 } from "lucide-react";
import Toast from "../components/Toast";
import { api, getToken } from "../services/api";

function Spinner({ className = "w-4 h-4 border-2 border-white/30 border-t-white" }) {
  return <div className={`${className} rounded-full animate-spin`} />;
}

const Toggle = ({ checked, onChange }) => (
  <button onClick={() => onChange(!checked)}
    className={`w-10 h-5.5 rounded-full transition-all relative flex-shrink-0 ${checked ? "bg-primary" : "bg-neutral-200"}`}>
    <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${checked ? "left-5" : "left-0.5"}`} />
  </button>
);

// Superadmin-only — deliberately not gated by the ADMIN_PAGE_KEYS/page_permissions system other
// admin pages use (see Sidebar.jsx/App.jsx: this page's pageKey is never added there, and the
// backend's /api/admin/geofencing routes are authorize('admin') only, no 'staff'). There's no
// separate "superadmin" role in this codebase — plain 'admin' is already unconditionally
// full-access everywhere else; this is what "superadmin-only" means here in practice.
export default function Geofencing() {
  const [pincodes, setPincodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [newPincode, setNewPincode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchPincodes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/admin/geofencing/pincodes", getToken());
      if (res.success) setPincodes(res.data?.pincodes || []);
      else setError(res.message || "Failed to load pincodes");
    } catch {
      setError("Network error — could not load pincodes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPincodes(); }, [fetchPincodes]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(newPincode.trim())) {
      setToast({ message: "Pincode must be 6 digits", type: "error" });
      return;
    }
    setAdding(true);
    try {
      const res = await api.post("/api/admin/geofencing/pincodes", { pincode: newPincode.trim(), label: newLabel.trim() || undefined }, getToken());
      if (res.success) {
        setPincodes((prev) => [res.data.pincode, ...prev]);
        setNewPincode("");
        setNewLabel("");
        setToast({ message: "Pincode added", type: "success" });
      } else {
        setToast({ message: res.message || "Failed to add pincode", type: "error" });
      }
    } catch {
      setToast({ message: "Network error — could not add pincode", type: "error" });
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id, active) => {
    setPincodes((prev) => prev.map((p) => (p.id === id ? { ...p, active } : p)));
    try {
      const res = await api.patch(`/api/admin/geofencing/pincodes/${id}`, { active }, getToken());
      if (!res.success) throw new Error(res.message);
    } catch {
      setPincodes((prev) => prev.map((p) => (p.id === id ? { ...p, active: !active } : p)));
      setToast({ message: "Failed to update pincode", type: "error" });
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/api/admin/geofencing/pincodes/${id}`, getToken());
      if (!res.success) throw new Error(res.message);
      setPincodes((prev) => prev.filter((p) => p.id !== id));
      setToast({ message: "Pincode removed", type: "success" });
    } catch {
      setToast({ message: "Failed to remove pincode", type: "error" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Geofencing</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Whitelist the pincodes bookings are allowed in. Both the pickup and drop pincode must be
          on this list — leave it empty to allow every pincode (no restriction).
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPinned size={17} className="text-primary" />
            </div>
            <h3 className="card-title">Add a pincode</h3>
          </div>
        </div>
        <form onSubmit={handleAdd} className="p-5 flex flex-wrap items-end gap-3">
          <div>
            <label className="form-label">Pincode</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={newPincode}
              onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, ""))}
              placeholder="452001"
              className="form-input w-40"
            />
          </div>
          <div>
            <label className="form-label">Label (optional)</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Indore"
              className="form-input w-48"
            />
          </div>
          <button type="submit" disabled={adding || newPincode.length !== 6} className="btn-primary">
            {adding ? <><Spinner />Adding...</> : <><Plus size={15} />Add</>}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Whitelisted pincodes ({pincodes.length})</h3>
        </div>
        {loading ? (
          <div className="p-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-danger flex items-center gap-2">
            <span>{error}</span>
            <button onClick={fetchPincodes} className="underline">Retry</button>
          </div>
        ) : pincodes.length === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-400">
            No pincodes whitelisted yet — every pincode is currently allowed.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {pincodes.map((p) => (
              <div key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-secondary">{p.pincode}</p>
                  {p.label && <p className="text-xs text-neutral-400">{p.label}</p>}
                </div>
                <div className="flex items-center gap-4">
                  <Toggle checked={p.active} onChange={(v) => handleToggle(p.id, v)} />
                  <button onClick={() => handleDelete(p.id)} className="text-neutral-400 hover:text-danger transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
