import { useState } from 'react';
import { Save, IndianRupee, TrendingUp } from 'lucide-react';
import Toast from '../components/Toast';
import { pricingData } from '../data/mockData';

function PricingCard({ title, icon: Icon, children, onSave }) {
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onSave();
    }, 800);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon size={16} className="text-primary" />
          </div>
          <h3 className="text-base font-poppins font-semibold text-secondary">{title}</h3>
        </div>
      </div>
      <div className="p-6">
        {children}
        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <><Save size={16} /> Save Changes</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, prefix, type = 'number', min, max, step }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">{prefix}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          min={min}
          max={max}
          step={step}
          className={`form-input ${prefix ? 'pl-8' : ''}`}
        />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="form-select">
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

export default function Pricing() {
  const [toast, setToast] = useState(null);
  const [intraCity, setIntraCity] = useState(pricingData.intraCity);
  const [interCity, setInterCity] = useState(pricingData.interCity);
  const [partTruck, setPartTruck] = useState(pricingData.partTruck);

  const handleSave = (section) => {
    setToast({ message: `${section} pricing updated successfully`, type: 'success' });
  };

  const updateIntraCity = (truckType, field, value) => {
    setIntraCity(prev => ({ ...prev, [truckType]: { ...prev[truckType], [field]: value } }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Pricing Management</h1>
        <p className="text-sm text-neutral-500 mt-1">Configure pricing rules for different service types</p>
      </div>

      {/* Intra-City Pricing */}
      <PricingCard title="Intra-City Pricing" icon={IndianRupee} onSave={() => handleSave('Intra-City')}>
        <div className="space-y-6">
          {['small', 'medium', 'large'].map((truckType) => (
            <div key={truckType} className="border border-neutral-100 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-neutral-700 mb-3 capitalize">{truckType} Truck</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InputField label="Base Fare" prefix="₹" value={intraCity[truckType].baseFare} onChange={(v) => updateIntraCity(truckType, 'baseFare', v)} />
                <InputField label="Per KM Rate" prefix="₹" value={intraCity[truckType].perKmRate} onChange={(v) => updateIntraCity(truckType, 'perKmRate', v)} />
                <InputField label="Platform Fee (%)" suffix="%" value={intraCity[truckType].platformFee} onChange={(v) => updateIntraCity(truckType, 'platformFee', v)} min={0} max={100} />
                <InputField label="Waiting Charge/hr" prefix="₹" value={intraCity[truckType].waitingCharge} onChange={(v) => updateIntraCity(truckType, 'waitingCharge', v)} />
                <div>
                  <label className="form-label">Demand Multiplier</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min={1} max={3} step={0.1}
                      value={intraCity[truckType].demandMultiplier}
                      onChange={(e) => updateIntraCity(truckType, 'demandMultiplier', parseFloat(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-sm font-medium text-primary w-12 text-right">{intraCity[truckType].demandMultiplier}x</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PricingCard>

      {/* Inter-City Pricing */}
      <PricingCard title="Inter-City Pricing" icon={TrendingUp} onSave={() => handleSave('Inter-City')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InputField label="Base Rate per KM" prefix="₹" value={interCity.baseRatePerKm} onChange={(v) => setInterCity(prev => ({ ...prev, baseRatePerKm: v }))} />
          <InputField label="Fuel Surcharge (%)" value={interCity.fuelSurcharge} onChange={(v) => setInterCity(prev => ({ ...prev, fuelSurcharge: v }))} min={0} max={100} />
          <InputField label="Platform Fee (%)" value={interCity.platformFee} onChange={(v) => setInterCity(prev => ({ ...prev, platformFee: v }))} min={0} max={100} />
          <SelectField
            label="Toll Handling"
            value={interCity.tollHandling}
            onChange={(v) => setInterCity(prev => ({ ...prev, tollHandling: v }))}
            options={['Actual', 'Fixed']}
          />
          {interCity.tollHandling === 'Fixed' && (
            <InputField label="Fixed Toll Amount" prefix="₹" value={interCity.tollFixedAmount} onChange={(v) => setInterCity(prev => ({ ...prev, tollFixedAmount: v }))} />
          )}
        </div>
      </PricingCard>

      {/* Part Truck Pricing */}
      <PricingCard title="Part Truck Pricing" icon={TrendingUp} onSave={() => handleSave('Part Truck')}>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 mb-1">Pricing Formula</p>
            <p className="text-sm text-blue-700 font-mono">Cost = Total Truck Cost × Capacity Used %</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Platform Fee (%)" value={partTruck.platformFee} onChange={(v) => setPartTruck(prev => ({ ...prev, platformFee: v }))} min={0} max={100} />
          </div>
        </div>
      </PricingCard>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
