import { useEffect, useState, useCallback, useRef } from "react";
import { MapPinned, Plus, Trash2, Download, Upload, FileSpreadsheet, AlertTriangle } from "lucide-react";
import Toast from "../components/Toast";
import { api, getToken } from "../services/api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

  const [downloadingSample, setDownloadingSample] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const fileInputRef = useRef(null);

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

  const handleDownloadSample = async () => {
    setDownloadingSample(true);
    try {
      await api.downloadFile(`${API_BASE}/api/admin/geofencing/pincodes/sample`, getToken(), "pincode-upload-sample.xlsx");
    } catch {
      setToast({ message: "Could not download the sample file", type: "error" });
    } finally {
      setDownloadingSample(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setBulkResult(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await api.postFile("/api/admin/geofencing/pincodes/bulk", formData, getToken());
      if (!res.success) {
        setToast({ message: res.message || "Bulk upload failed", type: "error" });
        return;
      }
      setBulkResult(res.data);
      setToast({
        message: `${res.data.inserted} added, ${res.data.updated} updated${res.data.invalid.length ? `, ${res.data.invalid.length} skipped` : ""}`,
        type: res.data.inserted || res.data.updated ? "success" : "error",
      });
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchPincodes();
    } catch {
      setToast({ message: "Network error — could not upload the file", type: "error" });
    } finally {
      setUploading(false);
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
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet size={17} className="text-primary" />
            </div>
            <h3 className="card-title">Bulk upload</h3>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-neutral-500">
            Upload an .xlsx or .csv with <span className="font-semibold text-neutral-700">Pincode</span> and{" "}
            <span className="font-semibold text-neutral-700">Label</span> columns to whitelist many pincodes at
            once. A pincode already on the list just has its label updated, not duplicated.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleDownloadSample} disabled={downloadingSample} className="btn-secondary">
              {downloadingSample ? <Spinner className="w-4 h-4 border-2 border-primary/30 border-t-primary" /> : <Download size={15} />}
              Download Sample
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => { setUploadFile(e.target.files?.[0] || null); setBulkResult(null); }}
              className="text-sm text-neutral-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer cursor-pointer"
            />
            <button onClick={handleBulkUpload} disabled={!uploadFile || uploading} className="btn-primary">
              {uploading ? <><Spinner />Uploading...</> : <><Upload size={15} />Upload</>}
            </button>
          </div>

          {bulkResult && (
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 space-y-3">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-success font-semibold">{bulkResult.inserted} added</span>
                <span className="text-primary font-semibold">{bulkResult.updated} updated</span>
                {bulkResult.invalid.length > 0 && (
                  <span className="text-danger font-semibold">{bulkResult.invalid.length} skipped</span>
                )}
                <span className="text-neutral-400">of {bulkResult.totalRows} rows</span>
              </div>
              {bulkResult.invalid.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-danger" /> Rows skipped
                  </p>
                  <div className="max-h-40 overflow-y-auto divide-y divide-neutral-100 rounded-lg border border-neutral-100 bg-white">
                    {bulkResult.invalid.map((item, i) => (
                      <div key={i} className="px-3 py-1.5 text-xs text-neutral-500 flex items-center justify-between gap-3">
                        <span>Row {item.row}</span>
                        <span className="text-danger">{item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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
