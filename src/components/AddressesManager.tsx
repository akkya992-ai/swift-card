import React, { useState } from 'react';
import { MapPin, Plus, Trash2, Home, Briefcase, PlusCircle, ArrowLeft } from 'lucide-react';

interface AddressItem {
  id: string;
  label: string;
  address: string;
}

interface AddressesManagerProps {
  savedAddresses: AddressItem[];
  activeAddressId: string | null;
  onSelect: (address: string, id: string) => void;
  onAdd: (label: string, address: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export default function AddressesManager({
  savedAddresses,
  activeAddressId,
  onSelect,
  onAdd,
  onDelete,
  onBack
}: AddressesManagerProps) {
  const [newLabel, setNewLabel] = useState('Home');
  const [newAddress, setNewAddress] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Address templates
  const presets = ['Home', 'Work', 'Friends', 'Gym', 'Parents'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalLabel = newLabel === 'Custom' ? customLabel.trim() : newLabel;
    if (!finalLabel || !newAddress.trim()) return;

    onAdd(finalLabel, newAddress.trim());
    setNewAddress('');
    setCustomLabel('');
    setShowForm(false);
  };

  const getLabelIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('home')) return <Home className="w-4 h-4 text-emerald-600" />;
    if (l.includes('work') || l.includes('office')) return <Briefcase className="w-4 h-4 text-emerald-600" />;
    return <MapPin className="w-4 h-4 text-emerald-600" />;
  };

  return (
    <div id="addresses-manager" className="max-w-md mx-auto bg-white rounded-3xl p-5 border border-slate-100 shadow-sm text-left space-y-5">
      {/* Head */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-slate-500 hover:text-emerald-700 font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </button>
        <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">
          Saved Destinations
        </span>
      </div>

      {/* List */}
      <div className="space-y-2.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Choose Delivery Address:</label>
        {savedAddresses.map((ad) => {
          const isActive = activeAddressId === ad.id;
          return (
            <div
              key={ad.id}
              className={`p-3 rounded-2xl border transition duration-150 flex items-start gap-3 relative group ${
                isActive 
                  ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500/15'
                  : 'border-slate-150 bg-white hover:bg-slate-50'
              }`}
            >
              <div 
                className="flex-1 flex gap-2.5 items-start cursor-pointer"
                onClick={() => onSelect(ad.address, ad.id)}
              >
                <div className="p-2 bg-emerald-100/60 rounded-xl mt-0.5 shrink-0">
                  {getLabelIcon(ad.label)}
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5 leading-none">
                    {ad.label}
                    {isActive && (
                      <span className="text-[8px] bg-emerald-600 text-white font-black uppercase rounded px-1 py-px tracking-wider">
                        Active
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal pr-8">
                    {ad.address}
                  </p>
                </div>
              </div>

              {/* Delete */}
              {savedAddresses.length > 1 && (
                <button
                  onClick={() => onDelete(ad.id)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
                  title="Remove Address"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Form Trigger Toggle */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-dashed border-slate-250 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 text-slate-400" /> Save New Address Location
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <h4 className="text-xs font-black text-slate-700 uppercase">Enter Destination Point</h4>
          
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Label:</span>
            <div className="flex flex-wrap gap-1">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNewLabel(p)}
                  className={`px-2 py-1 rounded text-[11px] font-bold border ${
                    newLabel === p 
                      ? 'bg-emerald-600 border-emerald-600 text-white' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setNewLabel('Custom')}
                className={`px-2 py-1 rounded text-[11px] font-bold border ${
                  newLabel === 'Custom' 
                    ? 'bg-emerald-600 border-emerald-600 text-white' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Custom Label
              </button>
            </div>
          </div>

          {newLabel === 'Custom' && (
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Enter custom tag (e.g. 'Hostel', 'Office Tower')"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                className="w-full bg-white px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Complete Address details:</span>
            <textarea
              placeholder="e.g. H.No 5-2/12, Main Road, Mahabubabad, Telangana"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="w-full bg-white px-2.5 py-1.5 border border-slate-250 rounded-lg text-xs h-16 focus:ring-1 focus:ring-emerald-500 outline-none"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg transition"
            >
              Save Address
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
