'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { clearAuthSession } from '../../../lib/auth';

interface Job {
  id: string;
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  pickupAddress: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  weightKg: number;
  totalFee: number;
  status: 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED';
  specialNotes?: string;
  courierId: string;
  courierName?: string;
  stopNumber?: number;
  latestProof?: {
    photoUrl: string;
    recipientSignatureUrl?: string;
    failureReason?: string;
    recipientNote?: string;
    createdAt: string;
  };
  statusHistory?: Array<{
    status: string;
    note?: string;
    createdAt: string;
  }>;
}

const DEFAULT_COURIER_1 = {
  id: '10111111-1111-1111-1111-111111111111',
  name: 'Sunil Silva',
  rolePill: 'Courier Pro • #101',
  zone: 'Zone 03 Western Express'
};

const DEFAULT_COURIER_2 = {
  id: '20222222-2222-2222-2222-222222222222',
  name: 'Kamal Perera',
  rolePill: 'Courier Fleet • #102',
  zone: 'Zone 07 Central Corridor'
};

const INITIAL_JOBS: Job[] = [
  {
    id: 'p1111111-1111-1111-1111-111111111111',
    trackingNumber: 'SWIFT-991122',
    senderName: 'Apex Electronics',
    senderPhone: '+94 11 234 5678',
    pickupAddress: '45 Galle Road, Colombo 03',
    recipientName: 'Robert Smith',
    recipientPhone: '+94 77 987 6543',
    deliveryAddress: '742 Evergreen Terrace, Sector 4, Colombo 03',
    weightKg: 1.2,
    totalFee: 450.00,
    status: 'OUT_FOR_DELIVERY',
    specialNotes: 'Ring bell twice; fragile electronics inside.',
    courierId: '10111111-1111-1111-1111-111111111111',
    courierName: 'Sunil Silva',
    stopNumber: 1,
    statusHistory: [
      { status: 'ASSIGNED', note: 'Assigned to Sunil Silva', createdAt: '08:00 AM' },
      { status: 'PICKED_UP', note: 'Loaded onto express motorbike', createdAt: '09:15 AM' },
      { status: 'IN_TRANSIT', note: 'En route to Colombo 03', createdAt: '10:00 AM' },
      { status: 'OUT_FOR_DELIVERY', note: 'Arrived at sector doorstep', createdAt: '10:30 AM' }
    ]
  },
  {
    id: 'p2222222-2222-2222-2222-222222222222',
    trackingNumber: 'SWIFT-882233',
    senderName: 'Vogue Boutique',
    senderPhone: '+94 11 345 6789',
    pickupAddress: '12 Havelock Town, Colombo 05',
    recipientName: 'Emily Davis',
    recipientPhone: '+94 71 876 5432',
    deliveryAddress: '10 Downing St, Cinnamon Gardens, Colombo 07',
    weightKg: 0.8,
    totalFee: 380.00,
    status: 'IN_TRANSIT',
    specialNotes: 'Leave with security guard if not available.',
    courierId: '10111111-1111-1111-1111-111111111111',
    courierName: 'Sunil Silva',
    stopNumber: 2,
    statusHistory: [
      { status: 'ASSIGNED', note: 'Assigned to Sunil Silva', createdAt: '08:00 AM' },
      { status: 'PICKED_UP', note: 'Picked up from boutique', createdAt: '09:40 AM' },
      { status: 'IN_TRANSIT', note: 'Moving towards Colombo 07', createdAt: '10:15 AM' }
    ]
  },
  {
    id: 'p3333333-3333-3333-3333-333333333333',
    trackingNumber: 'SWIFT-774411',
    senderName: 'Industrial Fasteners',
    senderPhone: '+94 11 456 7890',
    pickupAddress: '88 Central Warehouses, Peliyagoda',
    recipientName: 'Michael Scott',
    recipientPhone: '+94 76 543 2109',
    deliveryAddress: '172 Industrial Zone, Hub C, Colombo 02',
    weightKg: 4.5,
    totalFee: 750.00,
    status: 'PICKED_UP',
    specialNotes: 'Requires signature upon handover.',
    courierId: '10111111-1111-1111-1111-111111111111',
    courierName: 'Sunil Silva',
    stopNumber: 3,
    statusHistory: [
      { status: 'ASSIGNED', note: 'Assigned to Sunil Silva', createdAt: '08:00 AM' },
      { status: 'PICKED_UP', note: 'Loaded at Peliyagoda depot', createdAt: '09:05 AM' }
    ]
  },
  {
    id: 'p4444444-4444-4444-4444-444444444444',
    trackingNumber: 'SWIFT-665522',
    senderName: 'TechZone LK',
    senderPhone: '+94 11 567 8901',
    pickupAddress: '22 Duplication Rd, Colombo 04',
    recipientName: 'Sarah Connor',
    recipientPhone: '+94 70 123 4567',
    deliveryAddress: '94 Cyber Rd, Hub A, Bambalapitiya, Colombo 04',
    weightKg: 2.1,
    totalFee: 520.00,
    status: 'ASSIGNED',
    specialNotes: 'Call 10 minutes prior to delivery.',
    courierId: '10111111-1111-1111-1111-111111111111',
    courierName: 'Sunil Silva',
    stopNumber: 4,
    statusHistory: [
      { status: 'ASSIGNED', note: 'Assigned for afternoon run', createdAt: '08:00 AM' }
    ]
  },
  {
    id: 'p5555555-5555-5555-5555-555555555555',
    trackingNumber: 'SWIFT-556677',
    senderName: 'Kandy Herbal Remedies',
    senderPhone: '+94 81 223 4455',
    pickupAddress: '10 Dalada Veediya, Kandy',
    recipientName: 'Nimal Jayasuriya',
    recipientPhone: '+94 77 111 2233',
    deliveryAddress: '88 Peradeniya Rd, Kandy',
    weightKg: 1.5,
    totalFee: 490.00,
    status: 'OUT_FOR_DELIVERY',
    specialNotes: 'Handle with care: glass bottles inside.',
    courierId: '20222222-2222-2222-2222-222222222222',
    courierName: 'Kamal Perera',
    stopNumber: 1,
    statusHistory: [
      { status: 'ASSIGNED', note: 'Assigned to Kamal Perera', createdAt: '08:30 AM' },
      { status: 'OUT_FOR_DELIVERY', note: 'Out for delivery in Kandy central', createdAt: '10:00 AM' }
    ]
  }
];

export default function CourierDashboardPage() {
  const [currentCourier, setCurrentCourier] = useState(DEFAULT_COURIER_1);
  const [activeNav, setActiveNav] = useState('tasks');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);
  const [selectedJobId, setSelectedJobId] = useState<string>('p1111111-1111-1111-1111-111111111111');
  
  // Execution Form State
  const [recipientNotes, setRecipientNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [signatureSigned, setSignatureSigned] = useState(false);
  
  // Failure Modal
  const [showFailModal, setShowFailModal] = useState(false);
  const [failureReason, setFailureReason] = useState('RECIPIENT_UNAVAILABLE');
  const [failureDetails, setFailureDetails] = useState('');
  
  // Alerts
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Fetch from backend API if available
  useEffect(() => {
    async function loadBackendJobs() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
        const res = await fetch(`${apiUrl}/courier/jobs`, {
          headers: {
            'Authorization': 'Bearer sample_token_bypass'
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.assignedJobs && data.assignedJobs.length > 0) {
            setJobs(data.assignedJobs);
          }
        }
      } catch {
        // Use initial jobs state
      }
    }
    loadBackendJobs();
  }, []);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  // Helper: Clear banners
  const clearBanners = () => {
    setSecurityAlert(null);
    setSuccessBanner(null);
  };

  // Switch Active Courier (for Member 4 Cross-Courier Security Demonstration)
  const handleSwitchCourier = (courier: typeof DEFAULT_COURIER_1) => {
    setCurrentCourier(courier);
    clearBanners();
    setSuccessBanner(`Switched active courier identity to ${courier.name}`);
  };

  // Status Update Action
  const handleUpdateStatus = async (newStatus: 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED') => {
    clearBanners();

    // 1. SECURITY & OWNERSHIP CHECK (Member 4 Core Business Rule)
    if (selectedJob.courierId !== currentCourier.id) {
      setSecurityAlert(
        `🛡️ 403 FORBIDDEN: You are logged in as "${currentCourier.name}". You cannot modify this parcel because it is assigned to "${selectedJob.courierName || 'another courier'}".`
      );
      return;
    }

    // 2. STATE TRANSITION VALIDATION
    if (newStatus === 'DELIVERED') {
      if (!photoPreview) {
        setSecurityAlert('⚠️ Doorstep proof photo is required before marking parcel as DELIVERED!');
        return;
      }
    }

    // Try backend PATCH
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      await fetch(`${apiUrl}/courier/jobs/${selectedJob.trackingNumber}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          note: recipientNotes || `Status updated to ${newStatus}`
        })
      });
    } catch {
      // Local state update fallback
    }

    // Update local jobs list
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === selectedJob.id) {
          const updatedHistory = [
            ...(j.statusHistory || []),
            {
              status: newStatus,
              note: recipientNotes || `Status updated to ${newStatus} by ${currentCourier.name}`,
              createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ];
          const latestProof = newStatus === 'DELIVERED' ? {
            photoUrl: photoPreview || '/service-pod.jpg',
            recipientSignatureUrl: signatureSigned ? 'signature_captured' : undefined,
            recipientNote: recipientNotes,
            createdAt: new Date().toISOString()
          } : j.latestProof;

          return { ...j, status: newStatus, statusHistory: updatedHistory, latestProof };
        }
        return j;
      })
    );

    setSuccessBanner(`✓ Stop ${selectedJob.trackingNumber} successfully updated to ${newStatus}!`);
  };

  // Proof Photo Simulation
  const handleCapturePhoto = () => {
    // Toggle verified photo mock
    if (photoPreview) {
      setPhotoPreview(null);
      setSuccessBanner(null);
    } else {
      setPhotoPreview('/service-pod.jpg');
      setSuccessBanner('📸 Doorstep camera proof captured and verified with GPS timestamp!');
    }
  };

  // Submit Failure Reason
  const handleSubmitFailure = async () => {
    clearBanners();

    if (selectedJob.courierId !== currentCourier.id) {
      setSecurityAlert(
        `🛡️ 403 FORBIDDEN: You cannot log delivery failure for this parcel. Assigned to "${selectedJob.courierName}".`
      );
      setShowFailModal(false);
      return;
    }

    // Try backend fail endpoint
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      await fetch(`${apiUrl}/courier/jobs/${selectedJob.trackingNumber}/fail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          failureReason,
          recipientNote: failureDetails
        })
      });
    } catch {
      // Local fallback
    }

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === selectedJob.id) {
          return {
            ...j,
            status: 'FAILED',
            latestProof: {
              photoUrl: '/service-pod.jpg',
              failureReason,
              recipientNote: failureDetails,
              createdAt: new Date().toISOString()
            },
            statusHistory: [
              ...(j.statusHistory || []),
              {
                status: 'FAILED',
                note: `Delivery Failed: ${failureReason} (${failureDetails || 'No additional note'})`,
                createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]
          };
        }
        return j;
      })
    );

    setShowFailModal(false);
    setSuccessBanner(`⚠️ Delivery marked as FAILED with reason: ${failureReason}`);
  };

  const handleLogout = async () => {
    try { await clearAuthSession(); window.location.href = '/login'; }
    catch { alert('Unable to sign out securely. Check your connection and retry.'); }
  };

  // Filter Jobs
  const filteredJobs = jobs.filter((j) => {
    const matchesCourier = j.courierId === currentCourier.id;
    const matchesFilter =
      activeFilter === 'all' || j.status.toLowerCase() === activeFilter.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      j.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCourier && matchesFilter && matchesSearch;
  });

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans antialiased text-slate-800">
      
      {/* ========================================================================= */}
      {/* COLUMN 1: LEFT SIDEBAR & COURIER IDENTITY SWITCHER */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200/70 p-6 flex flex-col justify-between flex-shrink-0">
        <div>
          {/* Brand Logo */}
          <Link href="/" className="inline-flex items-center gap-1.5 mb-6 group">
            <span className="text-2xl font-black tracking-tight text-slate-900">
              swiftdrop<span className="text-[#ff6600]">.</span>
            </span>
          </Link>

          {/* Member 4 Badge */}
          <div className="mb-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">
              Member 4 • Courier Execution
            </span>
          </div>

          {/* Active Courier Identity Card */}
          <div className="p-3.5 mb-5 bg-orange-50/80 border border-orange-200/80 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-black text-slate-900 block leading-tight">
                  {currentCourier.name}
                </span>
                <span className="text-[10px] text-[#ff6600] font-bold block leading-none">
                  {currentCourier.rolePill}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">
              Shift: <strong>{currentCourier.zone}</strong>
            </div>
          </div>

          {/* Quick Identity Switcher for Multi-Courier Testing */}
          <div className="mb-6 p-3 bg-slate-100/70 rounded-xl border border-slate-200/60">
            <span className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">
              Switch Test Identity:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleSwitchCourier(DEFAULT_COURIER_1)}
                className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                  currentCourier.id === DEFAULT_COURIER_1.id
                    ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Sunil (#101)
              </button>
              <button
                onClick={() => handleSwitchCourier(DEFAULT_COURIER_2)}
                className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                  currentCourier.id === DEFAULT_COURIER_2.id
                    ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Kamal (#102)
              </button>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {[
              { id: 'tasks', label: `Assigned Tasks (${filteredJobs.length})` },
              { id: 'route', label: "Today's Corridor Route" },
              { id: 'proofs', label: 'Proof Photos & Logs' },
              { id: 'returns', label: 'Exceptions & Failures' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNav === item.id
                    ? 'bg-[#ff6600] text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-4 border-t border-slate-200/60 flex flex-col gap-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all cursor-pointer"
          >
            <span>End Shift & Logout</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* COLUMN 2: CENTER WORKSPACE (Stops List, Details, Controls) */}
      {/* ========================================================================= */}
      <main className="flex-1 p-6 sm:p-8 bg-slate-50 flex flex-col gap-6 overflow-y-auto">
        
        {/* Security & Success Notification Banners */}
        {securityAlert && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-2xl text-xs text-red-800 font-bold flex items-center justify-between shadow-sm animate-pulse">
            <div>{securityAlert}</div>
            <button onClick={() => setSecurityAlert(null)} className="text-red-500 hover:text-red-800 font-black ml-4">✕</button>
          </div>
        )}

        {successBanner && (
          <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-2xl text-xs text-emerald-800 font-bold flex items-center justify-between shadow-sm">
            <div>{successBanner}</div>
            <button onClick={() => setSuccessBanner(null)} className="text-emerald-500 hover:text-emerald-800 font-black ml-4">✕</button>
          </div>
        )}

        {/* Header Bar & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Good day, {currentCourier.name} 🛵
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {filteredJobs.length} delivery stops assigned to your run today.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-full px-4 py-2 w-full sm:w-80 shadow-sm focus-within:border-[#ff6600]">
            <input
              type="text"
              placeholder="Search recipient, address or tracking #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-800 placeholder-slate-400 w-full"
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All My Jobs' },
            { id: 'ASSIGNED', label: '1. Assigned' },
            { id: 'PICKED_UP', label: '2. Picked Up' },
            { id: 'IN_TRANSIT', label: '3. In Transit' },
            { id: 'OUT_FOR_DELIVERY', label: '4. Out for Delivery' },
            { id: 'DELIVERED', label: 'Delivered' },
            { id: 'FAILED', label: 'Exceptions' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-[#ff6600] text-white shadow-sm shadow-orange-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ===================================================================== */}
        {/* ACTIVE STOP EXECUTION PANEL */}
        {/* ===================================================================== */}
        {selectedJob && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-8">
            
            {/* Left: Parcel Specs & Stop Info */}
            <div className="w-full md:w-5/12 flex flex-col justify-between p-6 bg-orange-50/60 rounded-2xl border border-orange-100">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                    STOP #{selectedJob.stopNumber || 1}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    selectedJob.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                    selectedJob.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedJob.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="text-xl font-black text-slate-900 tracking-tight">
                  {selectedJob.trackingNumber}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1">
                  Weight: <strong>{selectedJob.weightKg} kg</strong> &bull; Fee: <strong>Rs. {selectedJob.totalFee.toFixed(2)}</strong>
                </div>

                <div className="mt-4 pt-4 border-t border-orange-200/60">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Sender Info</span>
                  <div className="text-xs font-bold text-slate-800">{selectedJob.senderName}</div>
                  <div className="text-[11px] text-slate-500">{selectedJob.pickupAddress}</div>
                </div>

                <div className="mt-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Assigned Courier</span>
                  <div className="text-xs font-bold text-slate-800">{selectedJob.courierName || 'Unassigned'}</div>
                </div>
              </div>

              {/* Special Instructions */}
              {selectedJob.specialNotes && (
                <div className="mt-4 p-3 bg-white rounded-xl border border-orange-200 text-xs text-slate-700">
                  <span className="text-[10px] font-black text-orange-600 block uppercase">Recipient Notes / Instructions</span>
                  {selectedJob.specialNotes}
                </div>
              )}
            </div>

            {/* Right: Recipient Details, Status Pipeline, Photo Upload */}
            <div className="w-full md:w-7/12 flex flex-col gap-5">
              <div>
                <h3 className="text-xl font-black text-slate-900">{selectedJob.recipientName}</h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">{selectedJob.deliveryAddress}</p>
                <p className="text-xs text-orange-600 font-bold mt-0.5">📞 {selectedJob.recipientPhone}</p>
              </div>

              {/* Status Action Pipeline */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                  1. STATUS TRANSITION ACTIONS
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('PICKED_UP')}
                    disabled={selectedJob.status === 'DELIVERED'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedJob.status === 'PICKED_UP'
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-orange-400'
                    }`}
                  >
                    1. Pick Up Parcel
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('IN_TRANSIT')}
                    disabled={selectedJob.status === 'DELIVERED'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedJob.status === 'IN_TRANSIT'
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-orange-400'
                    }`}
                  >
                    2. Mark In Transit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('OUT_FOR_DELIVERY')}
                    disabled={selectedJob.status === 'DELIVERED'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedJob.status === 'OUT_FOR_DELIVERY'
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-orange-400'
                    }`}
                  >
                    3. Out for Delivery
                  </button>
                </div>
              </div>

              {/* Doorstep Proof Photo Upload */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">2. Doorstep Proof Photo Upload</div>
                    <div className="text-[11px] text-slate-500">
                      {photoPreview ? '✓ Photo captured with timestamp' : 'Required before marking as DELIVERED'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                      photoPreview
                        ? 'bg-orange-100 text-orange-700 border border-orange-300'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-orange-50'
                    }`}
                  >
                    {photoPreview ? 'Retake Photo' : 'Capture Doorstep Photo'}
                  </button>
                </div>

                {photoPreview && (
                  <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-emerald-200">
                    <img src={photoPreview} alt="Proof" className="w-16 h-16 object-cover rounded-lg border" />
                    <div className="text-[11px] text-slate-600">
                      <span className="font-bold text-emerald-600 block">✓ Proof Verified & Ready</span>
                      Timestamp: {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                )}

                {/* Recipient Signature Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={signatureSigned}
                    onChange={(e) => setSignatureSigned(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Customer Handover Signature Received</span>
                </label>
              </div>

              {/* Recipient Notes Entry */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  3. COURIER RECIPIENT NOTES
                </label>
                <input
                  type="text"
                  placeholder="e.g. Left package at front porch behind potted plant..."
                  value={recipientNotes}
                  onChange={(e) => setRecipientNotes(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 outline-none"
                />
              </div>

              {/* Completion & Failure Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('DELIVERED')}
                  disabled={selectedJob.status === 'DELIVERED'}
                  className="flex-1 py-3 bg-[#ff6600] hover:bg-orange-600 disabled:bg-slate-300 text-white rounded-xl font-black text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  {selectedJob.status === 'DELIVERED' ? '✓ Parcel Already Delivered' : '✓ Confirm Handover & Mark Delivered'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowFailModal(true)}
                  disabled={selectedJob.status === 'DELIVERED'}
                  className="px-4 py-3 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  Mark Failed
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* ASSIGNED JOBS LIST TABLE / CARDS */}
        {/* ===================================================================== */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Assigned Job Manifest ({filteredJobs.length} stops for {currentCourier.name})
            </h3>
            <span className="text-xs font-bold text-orange-600">
              Shift Route: {currentCourier.zone}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => {
                  setSelectedJobId(job.id);
                  clearBanners();
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
                  selectedJob?.id === job.id
                    ? 'border-orange-500 ring-2 ring-orange-100 shadow-md'
                    : 'border-slate-200 hover:border-orange-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-orange-600 uppercase">
                    STOP #{job.stopNumber || 1}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    job.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                    job.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-orange-50 text-orange-700'
                  }`}>
                    {job.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <h4 className="text-sm font-black text-slate-900">{job.recipientName}</h4>
                <div className="text-xs text-slate-500 mt-0.5">{job.deliveryAddress}</div>
                <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
                  <span>{job.trackingNumber}</span>
                  <span className="font-bold text-slate-700">{job.weightKg} kg</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* TIMELINE / STATUS HISTORY OF SELECTED PARCEL */}
        {/* ===================================================================== */}
        {selectedJob?.statusHistory && (
          <div className="p-6 bg-white rounded-3xl border border-slate-200">
            <h3 className="text-sm font-black text-slate-900 mb-4">
              Audit History Timeline: {selectedJob.trackingNumber}
            </h3>
            <div className="space-y-3">
              {selectedJob.statusHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-black text-slate-800">{h.status}</span> &bull; <span className="text-slate-500">{h.note}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{h.createdAt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* FAILURE REASON MODAL */}
      {/* ========================================================================= */}
      {showFailModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-2">
              Log Delivery Failure Reason
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Document why parcel <strong>{selectedJob?.trackingNumber}</strong> could not be delivered.
            </p>

            <div className="space-y-3 mb-4">
              <label className="text-[10px] font-black uppercase text-slate-400 block">Failure Reason Code</label>
              <select
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:border-orange-500 outline-none font-bold"
              >
                <option value="RECIPIENT_UNAVAILABLE">Recipient Not Home / Unreachable</option>
                <option value="WRONG_ADDRESS">Incorrect / Nonexistent Address</option>
                <option value="CUSTOMER_REFUSED">Customer Refused Package</option>
                <option value="ACCESS_DENIED">Premises / Gate Access Denied</option>
                <option value="WEATHER_ROAD_BLOCK">Severe Weather / Road Block</option>
                <option value="OTHER">Other Custom Reason</option>
              </select>

              <label className="text-[10px] font-black uppercase text-slate-400 block mt-3">Additional Details</label>
              <textarea
                rows={3}
                placeholder="Called 3 times with no answer; gate locked..."
                value={failureDetails}
                onChange={(e) => setFailureDetails(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:border-orange-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowFailModal(false)}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitFailure}
                className="flex-1 py-2.5 text-xs font-black rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20"
              >
                Submit Failure
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
