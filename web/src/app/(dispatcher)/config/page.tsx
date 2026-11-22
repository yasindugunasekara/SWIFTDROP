'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchApi } from '../../../lib/api';


interface DeliveryZone {
  id: string;
  zoneName: string;
  baseRate: number;
  perKgRate: number;
  perKmRate: number;
  isActive: boolean;
}

interface ServiceConfigData {
  baseBookingFee: number;
  perKgRate: number;
  perKmRate: number;
  holidaySurgeMultiplier: number;
  peakHourSurgeMultiplier: number;
  maxCourierCapacity: number;
  zones: DeliveryZone[];
}

interface MerchantApplication {
  id: string;
  companyName: string;
  registrationNumber?: string;
  approvalStatus: string;
  createdAt: string;
}

export default function ServiceConfigPage() {
  const [config, setConfig] = useState<ServiceConfigData>({
    baseBookingFee: 350.0,
    perKgRate: 50.0,
    perKmRate: 20.0,
    holidaySurgeMultiplier: 1.25,
    peakHourSurgeMultiplier: 1.15,
    maxCourierCapacity: 15,
    zones: [
      { id: 'z-colombo', zoneName: 'Western Province (Colombo Urban)', baseRate: 350.0, perKgRate: 50.0, perKmRate: 20.0, isActive: true },
      { id: 'z-kandy', zoneName: 'Central Province (Kandy Metro)', baseRate: 450.0, perKgRate: 70.0, perKmRate: 30.0, isActive: true },
      { id: 'z-galle', zoneName: 'Southern Coastal (Galle / Matara)', baseRate: 400.0, perKgRate: 60.0, perKmRate: 25.0, isActive: true },
      { id: 'z-island', zoneName: 'Island-wide Express Delivery', baseRate: 600.0, perKgRate: 90.0, perKmRate: 45.0, isActive: true },
    ]
  });

  const [merchants, setMerchants] = useState<MerchantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded,setLoaded]=useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, merchantsRes] = await Promise.all([
        fetchApi<{ success: boolean; config: ServiceConfigData }>('/dispatch/config'),
        fetchApi<{ success: boolean; merchants: MerchantApplication[] }>('/dispatch/merchants?status=PENDING')
      ]);

      if (configRes && configRes.config) {
        setConfig(configRes.config);
        setLoaded(true);
      }
      if (merchantsRes && merchantsRes.merchants) {
        setMerchants(merchantsRes.merchants);
      }
    } catch (err: any) {
      setLoaded(false);
      setStatusMessage({type:'error',text:'Unable to load configuration. Please retry.'});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSaveRates = async () => {
    if(!loaded){setStatusMessage({type:'error',text:'Load configuration before saving.'});return;}
    setSaving(true);
    setStatusMessage(null);

    // Client-side validation
    if (config.baseBookingFee < 0 || config.perKgRate < 0 || config.perKmRate < 0) {
      setStatusMessage({ type: 'error', text: 'Pricing rates cannot be negative.' });
      setSaving(false);
      return;
    }

    if (config.holidaySurgeMultiplier < 1.0 || config.holidaySurgeMultiplier > 5.0) {
      setStatusMessage({ type: 'error', text: 'Holiday surge multiplier must be between 1.0 and 5.0' });
      setSaving(false);
      return;
    }

    try {
      const res = await fetchApi<{ success: boolean; message: string; config: ServiceConfigData }>('/dispatch/config', {
        method: 'PUT',
        body: JSON.stringify(config)
      });

      setStatusMessage({
        type: 'success',
        text: `✓ ${res.message || 'Service rates & zone parameters saved successfully!'}`
      });
      if (res.config) setConfig(res.config);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to save configuration settings.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMerchantDecision = async (merchantId: string, status: 'APPROVED' | 'REJECTED') => {
    setStatusMessage(null);
    try {
      await fetchApi(`/dispatch/merchants/${merchantId}/approval`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });

      setStatusMessage({
        type: 'success',
        text: `✓ Merchant application marked as ${status} successfully.`
      });

      setMerchants(prev => prev.filter(m => m.id !== merchantId));
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || `Failed to update merchant status.`
      });
    }
  };

  if(!loading&&!loaded)return <div role="alert" className="p-10">Unable to load configuration. <button onClick={()=>void loadData()} className="underline">Retry</button></div>;
  return (
    <div className="w-full min-h-screen bg-white flex flex-col font-sans antialiased text-slate-800">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-100 px-6 sm:px-10 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-2xl font-black text-slate-900 tracking-tight">
            swiftdrop<span className="text-[#ff6600]">.</span>
          </Link>
          <span className="text-xs font-bold bg-orange-50 text-[#ff6600] border border-orange-200/80 px-2.5 py-0.5 rounded-full">
            Member 5 &bull; Operations Config
          </span>
        </div>
        <Link
          href="/dispatch"
          className="text-xs font-bold text-[#ff6600] hover:underline"
        >
          &larr; Back to Dispatch Console
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 sm:px-10 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Service Rates &amp; Zone Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Administrator control panel for distance pricing, base delivery fees (LKR), surge multipliers, and partner verification.
          </p>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold mb-6 border transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        <div className="space-y-6">
          {/* Rate Matrix Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Base Delivery Rate Matrix (LKR)
              </h3>
              <span className="text-xs font-bold text-slate-400">Currency: Sri Lankan Rupees</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Base Booking Fee (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={config.baseBookingFee}
                  onChange={(e) => setConfig({ ...config, baseBookingFee: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6600]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Per Kilogram Surcharge (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={config.perKgRate}
                  onChange={(e) => setConfig({ ...config, perKgRate: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6600]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Per Kilometer Distance Rate (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={config.perKmRate}
                  onChange={(e) => setConfig({ ...config, perKmRate: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6600]"
                />
              </div>
            </div>

            {/* Surge Pricing Multipliers */}
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
              Dynamic Surge Multipliers
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Holiday Surge Multiplier
                </label>
                <input
                  type="number"
                  min="1.0"
                  max="5.0"
                  step="0.05"
                  value={config.holidaySurgeMultiplier}
                  onChange={(e) => setConfig({ ...config, holidaySurgeMultiplier: parseFloat(e.target.value) || 1.0 })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6600]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Valid range: 1.0x – 5.0x</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Peak Hours Multiplier
                </label>
                <input
                  type="number"
                  min="1.0"
                  max="5.0"
                  step="0.05"
                  value={config.peakHourSurgeMultiplier}
                  onChange={(e) => setConfig({ ...config, peakHourSurgeMultiplier: parseFloat(e.target.value) || 1.0 })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6600]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Rush hour dispatch factor</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Max Courier Capacity
                </label>
                <input
                  type="number"
                  disabled
                  value={config.maxCourierCapacity || 15}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Vehicle stop limit (Fixed)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveRates}
              disabled={saving}
              className="px-6 py-2.5 bg-[#ff9900] hover:bg-[#ff8800] text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Rate Configuration'}
            </button>
          </div>

          {/* Regional Zone Management Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-4">
              Regional Delivery Zones Matrix
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3">Zone Region</th>
                    <th className="pb-3">Base (LKR)</th>
                    <th className="pb-3">Per Kg (LKR)</th>
                    <th className="pb-3">Per Km (LKR)</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {config.zones.map((zone) => (
                    <tr key={zone.id}>
                      <td className="py-3 font-bold text-slate-900">{zone.zoneName}</td>
                      <td className="py-3 font-semibold text-slate-700">{zone.baseRate.toFixed(2)}</td>
                      <td className="py-3 text-slate-600">{zone.perKgRate.toFixed(2)}</td>
                      <td className="py-3 text-slate-600">{zone.perKmRate.toFixed(2)}</td>
                      <td className="py-3 text-right">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Merchant Approvals */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-4">
              Pending Merchant Partner Approvals
            </h3>

            {merchants.length > 0 ? (
              <div className="space-y-3">
                {merchants.map((m) => (
                  <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">{m.companyName}</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Registration: #{m.registrationNumber || 'LK-PENDING'} &bull; Status: {m.approvalStatus}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleMerchantDecision(m.id, 'APPROVED')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Approve Partner
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMerchantDecision(m.id, 'REJECTED')}
                        className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No pending merchant applications to review.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
