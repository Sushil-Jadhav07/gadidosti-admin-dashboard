import { useEffect, useState } from "react";
import { Truck, Save, IndianRupee, Package, TrendingUp, Percent, Clock, Wallet, Zap, Timer } from "lucide-react";
import Toast from "../components/Toast";
import { api, getToken } from "../services/api";

const CATEGORY_META = {
  small: { label: "Small Truck", color: "#166534", tint: "bg-[#166534]/10" },
  medium: { label: "Medium Truck", color: "#17D86B", tint: "bg-[#17D86B]/10" },
  large: { label: "Large Truck", color: "#F59E0B", tint: "bg-[#F59E0B]/10" },
};

const DEFAULT_CATEGORY = { baseFare: 0, perKmRate: 0, platformFee: 0, waitingCharge: 0, demandMultiplier: 1 };

const DEFAULT_CONFIG = {
  intraCity: { small: { ...DEFAULT_CATEGORY }, medium: { ...DEFAULT_CATEGORY }, large: { ...DEFAULT_CATEGORY } },
  interCity: { baseRatePerKm: 0, fuelSurcharge: 0, platformFee: 0, tollHandling: "actual", tollFixedAmount: 0 },
  partTruck: { platformFee: 0 },
  // Freight payment stages: "Advance" always offers *some* amount now (no longer gated behind
  // a minimum booking size) — three tiers by booking amount, first two flat, the top one a
  // percentage. Mirrors gadidosti-backend's pricing.model.js DEFAULT_ADVANCE_TIERS exactly;
  // these are just the client-side defaults shown until an admin has ever saved this section.
  advanceRule: {
    tiers: [
      { maxAmount: 5000, type: "flat", value: 1000 },
      { maxAmount: 10000, type: "flat", value: 2000 },
      { maxAmount: null, type: "percent", value: 0.8 },
    ],
  },
  // Delivery SLA: distance-tiered expected total delivery time — distinct from
  // intraCity.<category>.waitingCharge's per-hour rate (reused as-is for the overage amount, no
  // new rate field) and from the separate inter-city halting grace period above. Mirrors
  // gadidosti-backend's pricing.model.js DEFAULT_SLA_TIERS exactly.
  deliverySla: {
    tiers: [
      { maxKm: 300, hours: 36 },
      { maxKm: 1000, hours: 48 },
      { maxKm: null, hours: 120 },
    ],
  },
  // Express Delivery: intra-city only (confirmed scope) — a surcharge on top of the normal
  // total, and the normal SLA hours multiplied down for a tighter deadline. Mirrors
  // gadidosti-backend's pricing.model.js DEFAULT_EXPRESS_SERVICE exactly.
  expressService: { surchargePct: 0.2, slaFactor: 0.6, includesInsurance: true },
  // Estimated delivery DATE shown to the client before booking confirmation — a coarse,
  // day-granularity figure, distinct from deliverySla above (that's hour-precision, used for
  // delay-charge billing). Four bands instead of three — the confirmed anchors needed one more
  // tier to resolve cleanly without overlapping ("avoid overlapping ranges"). Mirrors
  // gadidosti-backend's pricing.model.js DEFAULT_DELIVERY_DATE_TIERS exactly.
  deliveryDateEstimate: {
    tiers: [
      { maxKm: 300, days: 1 },
      { maxKm: 500, days: 2 },
      { maxKm: 1000, days: 3 },
      { maxKm: 2000, days: 4 },
      { maxKm: null, days: 5 },
    ],
  },
};

function Spinner({ className = "w-4 h-4 border-2 border-white/30 border-t-white" }) {
  return <div className={`${className} rounded-full animate-spin`} />;
}

function NumberField({ label, value, onChange, prefix, suffix, min = 0 }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium">{prefix}</span>}
        <input
          type="number"
          min={min}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`form-input ${prefix ? "pl-8" : ""} ${suffix ? "pr-10" : ""}`}
        />
        {suffix && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium">{suffix}</span>}
      </div>
    </div>
  );
}

function DemandSlider({ value, onChange, color }) {
  const pct = Math.max(0, Math.min(100, ((value - 1) / (3 - 1)) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="form-label !mb-0">Demand Multiplier</label>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {Number(value).toFixed(1)}x
        </span>
      </div>
      <div className="relative pt-1 pb-1">
        <div className="h-2 rounded-full bg-neutral-100 relative overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-4 top-0 opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md -translate-y-1/2 pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
        <span>1.0x (off-peak)</span>
        <span>3.0x (peak surge)</span>
      </div>
    </div>
  );
}

function IntraCityCard({ category, data, onChange }) {
  const meta = CATEGORY_META[category];
  const set = (field) => (val) => onChange(category, { ...data, [field]: val });

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: `${meta.color}14` }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: meta.color }}>
          <Truck size={18} className="text-white" />
        </div>
        <h4 className="font-poppins font-semibold text-secondary text-sm">{meta.label}</h4>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Base Fare" prefix="₹" value={data.baseFare} onChange={set("baseFare")} />
          <NumberField label="Per KM Rate" prefix="₹" value={data.perKmRate} onChange={set("perKmRate")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Platform Fee" suffix="%" value={data.platformFee} onChange={set("platformFee")} />
          <NumberField label="Waiting/hr" prefix="₹" value={data.waitingCharge} onChange={set("waitingCharge")} />
        </div>
        <DemandSlider value={data.demandMultiplier} onChange={set("demandMultiplier")} color={meta.color} />
      </div>
    </div>
  );
}

function SectionShell({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon size={17} className="text-primary" />
          </div>
          <div>
            <h3 className="card-title">{title}</h3>
            {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function Pricing() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingSection, setSavingSection] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchConfig = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/admin/pricing", getToken());
      if (res.success) {
        const remote = res.data?.config || res.data || {};
        setConfig({
          intraCity: {
            small: { ...DEFAULT_CATEGORY, ...(remote.intraCity?.small || {}) },
            medium: { ...DEFAULT_CATEGORY, ...(remote.intraCity?.medium || {}) },
            large: { ...DEFAULT_CATEGORY, ...(remote.intraCity?.large || {}) },
          },
          interCity: { ...DEFAULT_CONFIG.interCity, ...(remote.interCity || {}) },
          partTruck: { ...DEFAULT_CONFIG.partTruck, ...(remote.partTruck || {}) },
          advanceRule: {
            tiers: remote.advanceRule?.tiers?.length === 3 ? remote.advanceRule.tiers : DEFAULT_CONFIG.advanceRule.tiers,
          },
          deliverySla: {
            tiers: remote.deliverySla?.tiers?.length === 3 ? remote.deliverySla.tiers : DEFAULT_CONFIG.deliverySla.tiers,
          },
          expressService: { ...DEFAULT_CONFIG.expressService, ...(remote.expressService || {}) },
          deliveryDateEstimate: {
            tiers: remote.deliveryDateEstimate?.tiers?.length === 4 ? remote.deliveryDateEstimate.tiers : DEFAULT_CONFIG.deliveryDateEstimate.tiers,
          },
        });
      } else {
        setError(res.message || "Failed to load pricing configuration");
      }
    } catch {
      setError("Network error — could not load pricing configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const save = async (sectionLabel) => {
    if (!config) return;
    setSavingSection(sectionLabel);
    try {
      const res = await api.put("/api/admin/pricing", config, getToken());
      if (res.success === false) {
        setToast({ message: res.message || "Failed to save pricing", type: "error" });
      } else {
        setToast({ message: "Pricing saved successfully", type: "success" });
      }
    } catch {
      setToast({ message: "Network error — could not save pricing", type: "error" });
    } finally {
      setSavingSection(null);
    }
  };

  const updateIntraCity = (category, next) => {
    setConfig((current) => ({
      ...current,
      intraCity: { ...current.intraCity, [category]: next },
    }));
  };

  const updateInterCity = (field, value) => {
    setConfig((current) => ({ ...current, interCity: { ...current.interCity, [field]: value } }));
  };

  const updatePartTruck = (field, value) => {
    setConfig((current) => ({ ...current, partTruck: { ...current.partTruck, [field]: value } }));
  };

  // index 0/1 are the two flat tiers (each has its own maxAmount ceiling); index 2 is the
  // open-ended percent tier above tier 1's ceiling — its own maxAmount always stays null.
  const updateAdvanceTier = (index, field, value) => {
    setConfig((current) => ({
      ...current,
      advanceRule: {
        tiers: current.advanceRule.tiers.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier)),
      },
    }));
  };

  // Same 3-tier shape as advanceRule above, keyed by distance instead of amount — index 2's
  // maxKm always stays null (open-ended, "above Tier 2's distance").
  const updateSlaTier = (index, field, value) => {
    setConfig((current) => ({
      ...current,
      deliverySla: {
        tiers: current.deliverySla.tiers.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier)),
      },
    }));
  };

  const updateExpressService = (field, value) => {
    setConfig((current) => ({ ...current, expressService: { ...current.expressService, [field]: value } }));
  };

  // Same tier-editing shape as updateAdvanceTier/updateSlaTier — four tiers here instead of
  // three; the last one's maxKm always stays null (open-ended, "above Tier 3's distance").
  const updateDeliveryDateTier = (index, field, value) => {
    setConfig((current) => ({
      ...current,
      deliveryDateEstimate: {
        tiers: current.deliveryDateEstimate.tiers.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier)),
      },
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-poppins font-bold text-secondary">Pricing Management</h1>
          <p className="text-sm text-neutral-500 mt-1">Configure pricing rules for different service types</p>
        </div>
        <div className="card p-10 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-poppins font-bold text-secondary">Pricing Management</h1>
          <p className="text-sm text-neutral-500 mt-1">Configure pricing rules for different service types</p>
        </div>
        <div className="card p-4 text-sm text-danger flex items-center gap-2">
          <span>{error}</span>
          <button onClick={fetchConfig} className="underline">Retry</button>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Pricing Management</h1>
        <p className="text-sm text-neutral-500 mt-1">Configure pricing rules for different service types</p>
      </div>

      {/* Intra-City */}
      <SectionShell icon={IndianRupee} title="Intra-City Pricing" subtitle="Per truck-category fare rules for same-city bookings">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {["small", "medium", "large"].map((cat) => (
            <IntraCityCard key={cat} category={cat} data={config.intraCity[cat]} onChange={updateIntraCity} />
          ))}
        </div>
        <div className="flex justify-end pt-5 mt-5 border-t border-neutral-100">
          <button onClick={() => save("intraCity")} disabled={savingSection === "intraCity"} className="btn-primary">
            {savingSection === "intraCity" ? <><Spinner />Saving...</> : <><Save size={15} />Save Changes</>}
          </button>
        </div>
      </SectionShell>

      {/* Inter-City */}
      <SectionShell icon={TrendingUp} title="Inter-City Pricing" subtitle="Distance-based fare rules for cross-city bookings">
        <div className="space-y-6">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral-400 mb-3">
              <Percent size={12} /> Rate &amp; Fees
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <NumberField label="Base Rate / KM" prefix="₹" value={config.interCity.baseRatePerKm} onChange={(v) => updateInterCity("baseRatePerKm", v)} />
              <NumberField label="Fuel Surcharge" suffix="%" value={config.interCity.fuelSurcharge} onChange={(v) => updateInterCity("fuelSurcharge", v)} />
              <NumberField label="Platform Fee" suffix="%" value={config.interCity.platformFee} onChange={(v) => updateInterCity("platformFee", v)} />
            </div>
          </div>

          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral-400 mb-3">
              <Clock size={12} /> Toll Handling
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Toll Charging Method</label>
                <select
                  value={config.interCity.tollHandling}
                  onChange={(e) => updateInterCity("tollHandling", e.target.value)}
                  className="form-select"
                >
                  <option value="actual">Actual</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              {config.interCity.tollHandling === "fixed" && (
                <NumberField label="Fixed Toll Amount" prefix="₹" value={config.interCity.tollFixedAmount} onChange={(v) => updateInterCity("tollFixedAmount", v)} />
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-5 mt-5 border-t border-neutral-100">
          <button onClick={() => save("interCity")} disabled={savingSection === "interCity"} className="btn-primary">
            {savingSection === "interCity" ? <><Spinner />Saving...</> : <><Save size={15} />Save Changes</>}
          </button>
        </div>
      </SectionShell>

      {/* Part Truck */}
      <SectionShell icon={Package} title="Part Truck Pricing" subtitle="Shared-load bookings billed by capacity used">
        <div className="space-y-5">
          <div className="border border-neutral-200 rounded-xl p-4">
            <p className="text-sm font-medium text-neutral-700 mb-1">Pricing Formula</p>
            <p className="text-sm font-mono font-semibold text-primary">Cost = Total Truck Cost x Capacity Used %</p>
          </div>
          <div className="max-w-xs">
            <NumberField label="Platform Fee" suffix="%" value={config.partTruck.platformFee} onChange={(v) => updatePartTruck("platformFee", v)} />
          </div>
        </div>
        <div className="flex justify-end pt-5 mt-5 border-t border-neutral-100">
          <button onClick={() => save("partTruck")} disabled={savingSection === "partTruck"} className="btn-primary">
            {savingSection === "partTruck" ? <><Spinner />Saving...</> : <><Save size={15} />Save Changes</>}
          </button>
        </div>
      </SectionShell>

      {/* Advance Payment Rule */}
      <SectionShell icon={Wallet} title="Advance Payment Rule" subtitle="How much of the fare must be paid up front when a client chooses 'Advance' instead of Pay Now / To Pay / To Be Billed">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberField
              label="Tier 1 — Up to this amount"
              prefix="₹"
              value={config.advanceRule.tiers[0].maxAmount}
              onChange={(v) => updateAdvanceTier(0, "maxAmount", v)}
            />
            <NumberField
              label="Tier 1 — Flat advance"
              prefix="₹"
              value={config.advanceRule.tiers[0].value}
              onChange={(v) => updateAdvanceTier(0, "value", v)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberField
              label="Tier 2 — Up to this amount"
              prefix="₹"
              value={config.advanceRule.tiers[1].maxAmount}
              onChange={(v) => updateAdvanceTier(1, "maxAmount", v)}
            />
            <NumberField
              label="Tier 2 — Flat advance"
              prefix="₹"
              value={config.advanceRule.tiers[1].value}
              onChange={(v) => updateAdvanceTier(1, "value", v)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Tier 3 — Above Tier 2&apos;s amount</label>
              <div className="form-input flex items-center text-neutral-400 bg-neutral-50 cursor-not-allowed">
                Everything above ₹{Number(config.advanceRule.tiers[1].maxAmount || 0).toLocaleString("en-IN")}
              </div>
            </div>
            <NumberField
              label="Tier 3 — Advance %"
              suffix="%"
              value={Math.round(Number(config.advanceRule.tiers[2].value) * 100)}
              onChange={(v) => updateAdvanceTier(2, "value", Math.max(0, Math.min(100, v)) / 100)}
            />
          </div>
        </div>
        <div className="flex justify-end pt-5 mt-5 border-t border-neutral-100">
          <button onClick={() => save("advanceRule")} disabled={savingSection === "advanceRule"} className="btn-primary">
            {savingSection === "advanceRule" ? <><Spinner />Saving...</> : <><Save size={15} />Save Changes</>}
          </button>
        </div>
      </SectionShell>

      {/* Delivery SLA */}
      <SectionShell icon={Timer} title="Delivery Time & Delay Charges" subtitle="Expected total delivery time by distance — a delay charge (same rate as Waiting/hr above) applies once a trip runs over its own tier">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberField
              label="Tier 1 — Up to this distance"
              suffix="km"
              value={config.deliverySla.tiers[0].maxKm}
              onChange={(v) => updateSlaTier(0, "maxKm", v)}
            />
            <NumberField
              label="Tier 1 — Expected delivery time"
              suffix="hrs"
              value={config.deliverySla.tiers[0].hours}
              onChange={(v) => updateSlaTier(0, "hours", v)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberField
              label="Tier 2 — Up to this distance"
              suffix="km"
              value={config.deliverySla.tiers[1].maxKm}
              onChange={(v) => updateSlaTier(1, "maxKm", v)}
            />
            <NumberField
              label="Tier 2 — Expected delivery time"
              suffix="hrs"
              value={config.deliverySla.tiers[1].hours}
              onChange={(v) => updateSlaTier(1, "hours", v)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Tier 3 — Above Tier 2&apos;s distance</label>
              <div className="form-input flex items-center text-neutral-400 bg-neutral-50 cursor-not-allowed">
                Everything above {Number(config.deliverySla.tiers[1].maxKm || 0).toLocaleString("en-IN")} km
              </div>
            </div>
            <NumberField
              label="Tier 3 — Expected delivery time"
              suffix="hrs"
              value={config.deliverySla.tiers[2].hours}
              onChange={(v) => updateSlaTier(2, "hours", v)}
            />
          </div>
          <p className="text-xs text-neutral-400">
            The overage charge reuses each truck category&apos;s existing Waiting/hr rate (Intra-City Pricing above) — no separate rate to configure.
          </p>
        </div>
        <div className="flex justify-end pt-5 mt-5 border-t border-neutral-100">
          <button onClick={() => save("deliverySla")} disabled={savingSection === "deliverySla"} className="btn-primary">
            {savingSection === "deliverySla" ? <><Spinner />Saving...</> : <><Save size={15} />Save Changes</>}
          </button>
        </div>
      </SectionShell>

      {/* Express Delivery */}
      <SectionShell icon={Zap} title="Express Delivery" subtitle="Intra-city only — a faster, costlier service tier">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberField
              label="Surcharge on normal freight"
              suffix="%"
              value={Math.round(Number(config.expressService.surchargePct) * 100)}
              onChange={(v) => updateExpressService("surchargePct", Math.max(0, v) / 100)}
            />
            <NumberField
              label="Faster than normal SLA"
              suffix="%"
              value={Math.round((1 - Number(config.expressService.slaFactor)) * 100)}
              onChange={(v) => updateExpressService("slaFactor", 1 - Math.max(0, Math.min(100, v)) / 100)}
            />
          </div>
          <p className="text-xs text-neutral-400">
            E.g. a ₹20,000 normal freight becomes ₹{Math.round(20000 * (1 + Number(config.expressService.surchargePct))).toLocaleString("en-IN")} Express, with the delivery deadline tightened to{" "}
            {Math.round(Number(config.expressService.slaFactor) * 100)}% of the normal expected time above.
          </p>
          <label className="flex items-center gap-2.5 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={!!config.expressService.includesInsurance}
              onChange={(e) => updateExpressService("includesInsurance", e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary/30"
            />
            Include transit insurance with Express bookings (informational badge only — no separate premium calculated)
          </label>
        </div>
        <div className="flex justify-end pt-5 mt-5 border-t border-neutral-100">
          <button onClick={() => save("expressService")} disabled={savingSection === "expressService"} className="btn-primary">
            {savingSection === "expressService" ? <><Spinner />Saving...</> : <><Save size={15} />Save Changes</>}
          </button>
        </div>
      </SectionShell>

      {/* Estimated Delivery Date */}
      <SectionShell icon={Clock} title="Estimated Delivery Date" subtitle="Shown to the client before booking confirmation — a coarse day estimate, separate from the hour-precision Delivery SLA above">
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField
                label={`Tier ${i + 1} — Up to this distance`}
                suffix="km"
                value={config.deliveryDateEstimate.tiers[i].maxKm}
                onChange={(v) => updateDeliveryDateTier(i, "maxKm", v)}
              />
              <NumberField
                label={`Tier ${i + 1} — Estimated delivery`}
                suffix="days"
                value={config.deliveryDateEstimate.tiers[i].days}
                onChange={(v) => updateDeliveryDateTier(i, "days", v)}
              />
            </div>
          ))}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Tier 4 — Above Tier 3&apos;s distance</label>
              <div className="form-input flex items-center text-neutral-400 bg-neutral-50 cursor-not-allowed">
                Everything above {Number(config.deliveryDateEstimate.tiers[2].maxKm || 0).toLocaleString("en-IN")} km
              </div>
            </div>
            <NumberField
              label="Tier 4 — Estimated delivery"
              suffix="days"
              value={config.deliveryDateEstimate.tiers[3].days}
              onChange={(v) => updateDeliveryDateTier(3, "days", v)}
            />
          </div>
        </div>
        <div className="flex justify-end pt-5 mt-5 border-t border-neutral-100">
          <button onClick={() => save("deliveryDateEstimate")} disabled={savingSection === "deliveryDateEstimate"} className="btn-primary">
            {savingSection === "deliveryDateEstimate" ? <><Spinner />Saving...</> : <><Save size={15} />Save Changes</>}
          </button>
        </div>
      </SectionShell>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
