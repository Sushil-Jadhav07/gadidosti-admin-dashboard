import { useEffect, useState } from "react";
import { Truck, Save, IndianRupee, Package, TrendingUp, Percent, Clock, Wallet, Zap, Timer, MapPinned, Route } from "lucide-react";
import Toast from "../components/Toast";
import { api, getToken } from "../services/api";
import { TRUCK_TYPES } from "../lib/truckTypes";

// Distance bands the vehicle-pricing rate card is keyed by — same 8 bands as
// gadidosti-backend's pricing.model.js DISTANCE_BANDS_KM, each a per-km rate that applies to the
// WHOLE trip once its total length falls into that band (not a progressive/cumulative rate).
const DISTANCE_BANDS = [
  { maxKm: 25, label: "Up to 25 km" },
  { maxKm: 50, label: "25–50 km" },
  { maxKm: 100, label: "50–100 km" },
  { maxKm: 300, label: "100–300 km" },
  { maxKm: 1000, label: "300–1000 km" },
  { maxKm: 1500, label: "1000–1500 km" },
  { maxKm: 2000, label: "1500–2000 km" },
  { maxKm: null, label: "2000 km+" },
];

const VEHICLE_COLORS = {
  "3_wheeler": "#0EA5E9", tata_ace: "#166534", pickup_8ft: "#17D86B", pickup_10ft: "#0D9488",
  "14ft": "#F59E0B", "17ft": "#F97316", "19ft": "#DC2626", "22ft": "#7C3AED",
};

// Mirrors gadidosti-backend's pricing.model.js DEFAULT_VEHICLE_PRICING exactly — the client-side
// defaults shown until an admin has ever saved this section.
const DEFAULT_VEHICLE_PRICING = {
  "3_wheeler":   { minimumFare: 400,  ratesByBand: [35, 27, 32, 17, 12, 12, 12, 12] },
  tata_ace:      { minimumFare: 800,  ratesByBand: [55, 32, 37, 20, 13, 13, 13, 13] },
  pickup_8ft:    { minimumFare: 900,  ratesByBand: [65, 37, 47, 26, 15, 15, 15, 15] },
  pickup_10ft:   { minimumFare: 1000, ratesByBand: [80, 53, 70, 30, 16, 16, 16, 16] },
  "14ft":        { minimumFare: 1700, ratesByBand: [110, 68, 88, 33, 20, 20, 20, 20] },
  "17ft":        { minimumFare: 2700, ratesByBand: [160, 100, 128, 36, 21, 21, 21, 21] },
  "19ft":        { minimumFare: 3800, ratesByBand: [210, 122, 146, 40, 23, 23, 23, 23] },
  "22ft":        { minimumFare: 4400, ratesByBand: [250, 142, 161, 43, 25, 25, 25, 25] },
};

// Mirrors gadidosti-backend's pricing.model.js DEFAULT_REGION_RATES / DEFAULT_REGION_ZONES.
const DEFAULT_REGION_RATES = {
  southEast:    { "3_wheeler": 17, tata_ace: 18, pickup_8ft: 20, pickup_10ft: 22, "14ft": 25, "17ft": 26, "19ft": 28, "22ft": 30 },
  guwahatiSide: { "3_wheeler": 20, tata_ace: 21, pickup_8ft: 23, pickup_10ft: 24, "14ft": 27, "17ft": 29, "19ft": 31, "22ft": 33 },
  kerala:       { "3_wheeler": 22, tata_ace: 25, pickup_8ft: 26, pickup_10ft: 26, "14ft": 29, "17ft": 31, "19ft": 33, "22ft": 35 },
};
const DEFAULT_REGION_ZONES = {
  southEast: ["Tamil Nadu", "Andhra Pradesh", "Telangana", "Karnataka", "Puducherry"],
  guwahatiSide: ["Assam", "Meghalaya", "Manipur", "Mizoram", "Nagaland", "Tripura", "Arunachal Pradesh", "Sikkim"],
  kerala: ["Kerala"],
};
const REGION_META = {
  southEast: { label: "South-East", color: "#F59E0B" },
  guwahatiSide: { label: "Guwahati Side", color: "#0EA5E9" },
  kerala: { label: "Kerala", color: "#17D86B" },
};

// The old broad small/medium/large buckets still exist for one narrower purpose: the per-hour
// waiting/halting-overage rate and platform fee — every one of the 8 new specific truck types
// resolves down to whichever of these 3 it's closest in size to (see gadidosti-backend's
// pricing.model.js VEHICLE_TYPE_TO_LEGACY_BUCKET). The old baseFare/perKmRate/demandMultiplier
// fields that used to live here are gone — the new Vehicle Pricing rate card below is the real
// fare now.
const BUCKET_META = {
  small: { label: "Small-size trucks", hint: "3 Wheeler, Tata Ace, Pickup 8ft", color: "#166534" },
  medium: { label: "Medium-size trucks", hint: "Pickup 10ft, 14ft", color: "#17D86B" },
  large: { label: "Large-size trucks", hint: "17ft, 19ft, 22ft", color: "#F59E0B" },
};
const DEFAULT_BUCKET = { platformFee: 0, waitingCharge: 0 };

const DEFAULT_CONFIG = {
  vehiclePricing: DEFAULT_VEHICLE_PRICING,
  regionRates: DEFAULT_REGION_RATES,
  regionZones: DEFAULT_REGION_ZONES,
  intraCity: { small: { ...DEFAULT_BUCKET }, medium: { ...DEFAULT_BUCKET }, large: { ...DEFAULT_BUCKET } },
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
  // Delivery SLA: distance-tiered expected total delivery time — distinct from the halting
  // waiting-charge rate above and from the separate inter-city halting grace period. Mirrors
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
      {label && <label className="form-label">{label}</label>}
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

// One card per truck type — minimum fare (the floor, never charged less than this) plus the
// 8-band distance-tiered per-km rate table. This is the actual fare-driving config now.
function VehiclePricingCard({ type, data, onChange }) {
  const meta = TRUCK_TYPES.find((t) => t.value === type);
  const color = VEHICLE_COLORS[type] || "#166534";
  const setMinimum = (v) => onChange(type, { ...data, minimumFare: v });
  const setRate = (i) => (v) => {
    const ratesByBand = [...data.ratesByBand];
    ratesByBand[i] = v;
    onChange(type, { ...data, ratesByBand });
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: `${color}14` }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
          <Truck size={18} className="text-white" />
        </div>
        <div>
          <h4 className="font-poppins font-semibold text-secondary text-sm">{meta?.label || type}</h4>
          <p className="text-[11px] text-neutral-400">{meta?.capacity}</p>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <NumberField label="Minimum Fare" prefix="₹" value={data.minimumFare} onChange={setMinimum} />
        <div>
          <p className="form-label !mb-2">Rate per KM, by trip distance</p>
          <div className="space-y-2">
            {DISTANCE_BANDS.map((band, i) => (
              <div key={band.label} className="flex items-center gap-3">
                <span className="text-xs text-neutral-500 w-28 flex-shrink-0">{band.label}</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-medium">₹</span>
                  <input
                    type="number"
                    min={0}
                    value={data.ratesByBand[i]}
                    onChange={(e) => setRate(i)(parseFloat(e.target.value) || 0)}
                    className="form-input !py-1.5 pl-6 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// One card per named region — a flat per-km rate per truck type (overrides the distance-band
// lookup above entirely for a booking dropping in one of the listed states) plus the editable
// list of states that count as this zone.
function RegionPricingCard({ zoneKey, rates, states, onRateChange, onStatesChange }) {
  const meta = REGION_META[zoneKey];
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: `${meta.color}14` }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: meta.color }}>
          <MapPinned size={18} className="text-white" />
        </div>
        <h4 className="font-poppins font-semibold text-secondary text-sm">{meta.label}</h4>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="form-label">States in this zone</label>
          <input
            type="text"
            value={states.join(", ")}
            onChange={(e) => onStatesChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            className="form-input text-sm"
            placeholder="e.g. Tamil Nadu, Karnataka"
          />
          <p className="text-[11px] text-neutral-400 mt-1">Comma-separated. Matched against the drop-off address's state.</p>
        </div>
        <div>
          <p className="form-label !mb-2">Rate per KM, by truck type</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {TRUCK_TYPES.map((t) => (
              <div key={t.value} className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 flex-1 truncate">{t.label}</span>
                <div className="relative w-20 flex-shrink-0">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-medium">₹</span>
                  <input
                    type="number"
                    min={0}
                    value={rates[t.value] ?? 0}
                    onChange={(e) => onRateChange(t.value, parseFloat(e.target.value) || 0)}
                    className="form-input !py-1.5 pl-5 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BucketCard({ bucket, data, onChange }) {
  const meta = BUCKET_META[bucket];
  const set = (field) => (val) => onChange(bucket, { ...data, [field]: val });
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: `${meta.color}14` }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: meta.color }}>
          <Truck size={18} className="text-white" />
        </div>
        <div>
          <h4 className="font-poppins font-semibold text-secondary text-sm">{meta.label}</h4>
          <p className="text-[11px] text-neutral-400">{meta.hint}</p>
        </div>
      </div>
      <div className="p-5 grid grid-cols-2 gap-3">
        <NumberField label="Platform Fee" suffix="%" value={data.platformFee} onChange={set("platformFee")} />
        <NumberField label="Waiting/hr" prefix="₹" value={data.waitingCharge} onChange={set("waitingCharge")} />
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
          vehiclePricing: Object.fromEntries(
            TRUCK_TYPES.map((t) => [
              t.value,
              {
                minimumFare: remote.vehiclePricing?.[t.value]?.minimumFare ?? DEFAULT_VEHICLE_PRICING[t.value].minimumFare,
                ratesByBand: remote.vehiclePricing?.[t.value]?.ratesByBand?.length === 8
                  ? remote.vehiclePricing[t.value].ratesByBand
                  : DEFAULT_VEHICLE_PRICING[t.value].ratesByBand,
              },
            ])
          ),
          regionRates: {
            southEast: { ...DEFAULT_REGION_RATES.southEast, ...(remote.regionRates?.southEast || {}) },
            guwahatiSide: { ...DEFAULT_REGION_RATES.guwahatiSide, ...(remote.regionRates?.guwahatiSide || {}) },
            kerala: { ...DEFAULT_REGION_RATES.kerala, ...(remote.regionRates?.kerala || {}) },
          },
          regionZones: {
            southEast: remote.regionZones?.southEast?.length ? remote.regionZones.southEast : DEFAULT_REGION_ZONES.southEast,
            guwahatiSide: remote.regionZones?.guwahatiSide?.length ? remote.regionZones.guwahatiSide : DEFAULT_REGION_ZONES.guwahatiSide,
            kerala: remote.regionZones?.kerala?.length ? remote.regionZones.kerala : DEFAULT_REGION_ZONES.kerala,
          },
          intraCity: {
            small: { ...DEFAULT_BUCKET, ...(remote.intraCity?.small || {}) },
            medium: { ...DEFAULT_BUCKET, ...(remote.intraCity?.medium || {}) },
            large: { ...DEFAULT_BUCKET, ...(remote.intraCity?.large || {}) },
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

  const updateVehiclePricing = (type, next) => {
    setConfig((current) => ({ ...current, vehiclePricing: { ...current.vehiclePricing, [type]: next } }));
  };

  const updateRegionRate = (zoneKey, truckType, value) => {
    setConfig((current) => ({
      ...current,
      regionRates: { ...current.regionRates, [zoneKey]: { ...current.regionRates[zoneKey], [truckType]: value } },
    }));
  };

  const updateRegionZoneStates = (zoneKey, states) => {
    setConfig((current) => ({ ...current, regionZones: { ...current.regionZones, [zoneKey]: states } }));
  };

  const updateBucket = (bucket, next) => {
    setConfig((current) => ({ ...current, intraCity: { ...current.intraCity, [bucket]: next } }));
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

      {/* Vehicle Pricing — the real fare-driving config now */}
      <SectionShell icon={Route} title="Vehicle Pricing" subtitle="Minimum fare + distance-tiered per-km rate, per truck type. Applies to every booking regardless of intra/inter-city.">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {TRUCK_TYPES.map((t) => (
            <VehiclePricingCard key={t.value} type={t.value} data={config.vehiclePricing[t.value]} onChange={updateVehiclePricing} />
          ))}
        </div>
        <div className="flex justify-end pt-5 mt-5 border-t border-neutral-100">
          <button onClick={() => save("vehiclePricing")} disabled={savingSection === "vehiclePricing"} className="btn-primary">
            {savingSection === "vehiclePricing" ? <><Spinner />Saving...</> : <><Save size={15} />Save Changes</>}
          </button>
        </div>
      </SectionShell>

      {/* Regional Pricing */}
      <SectionShell icon={MapPinned} title="Regional Pricing" subtitle="Flat per-km rates for named zones — overrides the distance-tier lookup above whenever the drop-off state matches one of these zones.">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Object.keys(REGION_META).map((zoneKey) => (
            <RegionPricingCard
              key={zoneKey}
              zoneKey={zoneKey}
              rates={config.regionRates[zoneKey]}
              states={config.regionZones[zoneKey]}
              onRateChange={(truckType, value) => updateRegionRate(zoneKey, truckType, value)}
              onStatesChange={(states) => updateRegionZoneStates(zoneKey, states)}
            />
          ))}
        </div>
        <div className="flex justify-end pt-5 mt-5 border-t border-neutral-100">
          <button onClick={() => save("regionPricing")} disabled={savingSection === "regionPricing"} className="btn-primary">
            {savingSection === "regionPricing" ? <><Spinner />Saving...</> : <><Save size={15} />Save Changes</>}
          </button>
        </div>
      </SectionShell>

      {/* Waiting Charge & Platform Fee (legacy size buckets — still drive halting rate + fee) */}
      <SectionShell icon={IndianRupee} title="Waiting Charge & Platform Fee" subtitle="By size bucket — every truck type above resolves to whichever of these 3 it's closest in size to.">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {["small", "medium", "large"].map((bucket) => (
            <BucketCard key={bucket} bucket={bucket} data={config.intraCity[bucket]} onChange={updateBucket} />
          ))}
        </div>
        <div className="flex justify-end pt-5 mt-5 border-t border-neutral-100">
          <button onClick={() => save("intraCity")} disabled={savingSection === "intraCity"} className="btn-primary">
            {savingSection === "intraCity" ? <><Spinner />Saving...</> : <><Save size={15} />Save Changes</>}
          </button>
        </div>
      </SectionShell>

      {/* Inter-City surcharges */}
      <SectionShell icon={TrendingUp} title="Inter-City Surcharges" subtitle="Layered on top of Vehicle Pricing above for cross-city bookings">
        <div className="space-y-6">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral-400 mb-3">
              <Percent size={12} /> Fees
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral-400 mb-3">
              <Package size={12} /> Part-Load Reference Rate
            </p>
            <div className="max-w-xs">
              <NumberField label="Full-Truck Cost / KM" prefix="₹" value={config.interCity.baseRatePerKm} onChange={(v) => updateInterCity("baseRatePerKm", v)} />
            </div>
            <p className="text-[11px] text-neutral-400 mt-2">
              Only used as the reference "full truck" linehaul cost for Part-Load pricing below (Cost = this × distance × capacity used %) — no longer drives regular full-truck fares, which now come entirely from Vehicle Pricing above.
            </p>
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
            The overage charge reuses each truck's Waiting/hr rate (Waiting Charge &amp; Platform Fee above) — no separate rate to configure.
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
