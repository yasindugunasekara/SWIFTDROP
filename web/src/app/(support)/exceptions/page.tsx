'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchApi } from '../../../lib/api';
import { getStoredUser, User } from '../../../lib/auth';

export type ResolutionStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'RESCHEDULED'
  | 'RETURN_TO_SENDER'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'RESOLVED';

interface SupportAuditLog {
  id: string;
  exception_id: string;
  changed_by_id: string;
  changed_by_name?: string;
  action: string;
  previous_state: any;
  new_state: any;
  created_at: string;
}

interface ParcelException {
  id: string;
  parcel_id: string;
  tracking_number: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  parcel_status: string;
  weight_kg?: number;
  total_fee?: number;
  special_notes?: string;
  raised_by_id: string;
  raised_by_name?: string;
  reason: string;
  resolution_status: ResolutionStatus;
  resolution_notes: string | null;
  resolved_by_id: string | null;
  resolved_by_name?: string | null;
  created_at: string;
  resolved_at: string | null;
  photo_url?: string | null;
  failure_reason?: string | null;
  audit_logs?: SupportAuditLog[];
}

export default function ExceptionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [exceptions, setExceptions] = useState<ParcelException[]>([]);
  const [selectedException, setSelectedException] = useState<ParcelException | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Resolution Form States
  const [targetStatus, setTargetStatus] = useState<ResolutionStatus>('INVESTIGATING');
  const [resolutionComment, setResolutionComment] = useState<string>('');
  const [standaloneNote, setStandaloneNote] = useState<string>('');

  // Create Modal States
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createTrackingNum, setCreateTrackingNum] = useState<string>('');
  const [createReason, setCreateReason] = useState<string>('');
  const [createNotes, setCreateNotes] = useState<string>('');
  const [createLoading, setCreateLoading] = useState<boolean>(false);

  // 1. Fetch live exceptions
  const loadExceptions = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (activeFilter !== 'ALL') queryParams.append('status', activeFilter);
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());

      const url = `/support/exceptions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const res = await fetchApi<{ count: number; exceptions: ParcelException[] }>(url);
      setExceptions(res.exceptions || []);

      // If an exception was selected, refresh its details
      if (selectedException) {
        const refreshed = res.exceptions.find((e) => e.id === selectedException.id);
        if (refreshed) {
          loadExceptionDetail(refreshed.id);
        }
      } else if (res.exceptions.length > 0) {
        loadExceptionDetail(res.exceptions[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load exceptions:', err);
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to fetch exceptions list' });
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery]);

  // 2. Fetch specific exception details with audit trail
  const loadExceptionDetail = async (exceptionId: string) => {
    try {
      const res = await fetchApi<{ exception: ParcelException }>(`/support/exceptions/${exceptionId}`);
      setSelectedException(res.exception);
      setTargetStatus(res.exception.resolution_status || 'INVESTIGATING');
    } catch (err: any) {
      console.error('Failed to load exception detail:', err);
    }
  };

  useEffect(() => {
    setUser(getStoredUser());
    loadExceptions();
  }, [loadExceptions]);

  // Handle Resolution Status Update
  const handleUpdateStatus = async () => {
    if (!selectedException) return;
    try {
      setActionLoading(true);
      setFeedbackMsg(null);

      const res = await fetchApi<{ message: string; exception: ParcelException }>(
        `/support/exceptions/${selectedException.tracking_number}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: targetStatus,
            notes: resolutionComment,
          }),
        }
      );

      setFeedbackMsg({ type: 'success', text: `Status successfully updated to ${targetStatus}` });
      setResolutionComment('');
      setSelectedException(res.exception);
      await loadExceptions();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update resolution status' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Adding Quick Support Note
  const handleAddNote = async () => {
    if (!selectedException || !standaloneNote.trim()) return;
    try {
      setActionLoading(true);
      setFeedbackMsg(null);

      const res = await fetchApi<{ message: string; exception: ParcelException }>(
        `/support/exceptions/${selectedException.tracking_number}/notes`,
        {
          method: 'POST',
          body: JSON.stringify({ note: standaloneNote.trim() }),
        }
      );

      setFeedbackMsg({ type: 'success', text: 'Support note logged to audit trail' });
      setStandaloneNote('');
      setSelectedException(res.exception);
      await loadExceptions();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to append note' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Logging New Exception
  const handleCreateException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTrackingNum.trim() || !createReason.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Tracking number and incident reason are required.' });
      return;
    }
    try {
      setCreateLoading(true);
      setFeedbackMsg(null);
      const res = await fetchApi<{ message: string; exception: ParcelException }>(
        '/support/exceptions',
        {
          method: 'POST',
          body: JSON.stringify({
            parcelId: createTrackingNum.trim(),
            reason: createReason.trim(),
            initialNotes: createNotes.trim() || undefined,
          }),
        }
      );

      setFeedbackMsg({ type: 'success', text: `Incident successfully created for ${createTrackingNum}` });
      setShowCreateModal(false);
      setCreateTrackingNum('');
      setCreateReason('');
      setCreateNotes('');
      await loadExceptions();
      if (res.exception?.id) {
        await loadExceptionDetail(res.exception.id);
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to create exception record' });
    } finally {
      setCreateLoading(false);
    }
  };

  // Color helpers
  const getStatusBadgeClass = (status: ResolutionStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-red-50 text-red-600 border-red-200';
      case 'INVESTIGATING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RESCHEDULED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'RETURN_TO_SENDER':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getParcelStatusClass = (status: string) => {
    switch (status) {
      case 'FAILED':
        return 'bg-rose-100 text-rose-800 font-black';
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800 font-black';
      case 'CONFIRMED':
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800 font-black';
      case 'RETURNED':
        return 'bg-purple-100 text-purple-800 font-black';
      default:
        return 'bg-slate-100 text-slate-800 font-black';
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/60 flex flex-col font-sans antialiased text-slate-800">
      {/* ===================================================================== */}
      {/* Top Header */}
      {/* ===================================================================== */}
      <header className="w-full bg-white border-b border-slate-200/80 px-6 sm:px-10 py-4 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-2xl font-black text-slate-900 tracking-tight">
            swiftdrop<span className="text-[#ff6600]">.</span>
          </Link>
          <div className="h-5 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider bg-orange-50 text-[#ff6600] border border-orange-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff6600] animate-pulse" />
              Exceptions Desk
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Logged in as:</span>
              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                {user.fullName || user.email} ({user.role})
              </span>
            </div>
          )}
          <Link
            href="/dispatch"
            className="text-xs font-bold text-slate-600 hover:text-[#ff6600] flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-orange-200 transition-all bg-white"
          >
            <span>&larr;</span> Back to Dispatch
          </Link>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* Main Container */}
      {/* ===================================================================== */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6">
        {/* Banner Title */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Parcel Support &amp; Exception Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Review failed delivery attempts, resolve recipient disputes, append support notes, and track tamper-proof audit trails.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-[#ff6600] hover:bg-[#ea580c] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Log Incident</span>
            </button>
            <button
              onClick={loadExceptions}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <svg
                className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`mb-6 p-4 rounded-2xl text-xs font-bold border flex items-center justify-between transition-all ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="text-xs opacity-60 hover:opacity-100 font-black ml-4"
            >
              &times;
            </button>
          </div>
        )}

        {/* Status Filters & Search Bar */}
        <div className="bg-white rounded-2xl p-4 mb-6 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {['ALL', 'OPEN', 'INVESTIGATING', 'RESCHEDULED', 'RETURN_TO_SENDER', 'RESOLVED'].map((status) => (
              <button
                key={status}
                onClick={() => setActiveFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === status
                    ? 'bg-[#ff6600] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Search tracking, recipient, issue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#ff6600] bg-slate-50/50"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* Main 2-Column Grid */}
        {/* ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ----------------------------------------------------------------- */}
          {/* LEFT COLUMN: Exception Incident Queue */}
          {/* ----------------------------------------------------------------- */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1 px-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Active Incidents ({exceptions.length})
              </h2>
              {loading && <span className="text-[11px] font-bold text-[#ff6600] animate-pulse">Syncing...</span>}
            </div>

            {exceptions.length === 0 && !loading && (
              <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center text-slate-400 text-xs">
                No parcel delivery exceptions matching this criteria.
              </div>
            )}

            {exceptions.map((exc) => {
              const isSelected = selectedException?.id === exc.id;
              return (
                <div
                  key={exc.id}
                  onClick={() => loadExceptionDetail(exc.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative bg-white ${
                    isSelected
                      ? 'border-[#ff6600] ring-2 ring-orange-500/20 shadow-md'
                      : 'border-slate-200/80 hover:border-orange-200 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-black text-slate-900 tracking-tight">
                      {exc.tracking_number}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getStatusBadgeClass(exc.resolution_status)}`}>
                        {exc.resolution_status.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded-md ${getParcelStatusClass(exc.parcel_status)}`}>
                        {exc.parcel_status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-800 font-semibold mb-2 line-clamp-2">
                    {exc.reason}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2 mt-2">
                    <span className="font-medium text-slate-500 truncate max-w-[160px]">
                      📍 {exc.recipient_name}
                    </span>
                    <span className="text-[10px]">
                      {new Date(exc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* RIGHT COLUMN: Resolution Workspace & Audit Information */}
          {/* ----------------------------------------------------------------- */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
            {selectedException ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        {selectedException.tracking_number}
                      </h3>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getStatusBadgeClass(selectedException.resolution_status)}`}>
                        {selectedException.resolution_status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Logged by <span className="font-bold text-slate-600">{selectedException.raised_by_name || 'System'}</span> on {new Date(selectedException.created_at).toLocaleString()}
                    </p>
                  </div>

                  {selectedException.failure_reason && (
                    <span className="self-start text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-xl">
                      Code: {selectedException.failure_reason}
                    </span>
                  )}
                </div>

                {/* Recipient & Parcel Info Card */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Recipient Details
                    </span>
                    <span className="font-bold text-slate-900 block">{selectedException.recipient_name}</span>
                    <span className="text-slate-500 block">{selectedException.recipient_phone}</span>
                    <span className="text-slate-600 block mt-1">{selectedException.delivery_address}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Parcel Parameters
                    </span>
                    <span className="text-slate-700 block">
                      Weight: <span className="font-bold">{selectedException.weight_kg || '1.0'} kg</span>
                    </span>
                    <span className="text-slate-700 block">
                      Fee: <span className="font-bold">LKR {selectedException.total_fee || '450.00'}</span>
                    </span>
                    {selectedException.special_notes && (
                      <span className="text-amber-800 text-[11px] block mt-1 bg-amber-50/80 p-1.5 rounded-lg border border-amber-200/60">
                        &quot;{selectedException.special_notes}&quot;
                      </span>
                    )}
                  </div>
                </div>

                {/* Doorstep Proof / Failure Evidence Photo (if exists) */}
                {selectedException.photo_url && (
                  <div className="p-4 bg-orange-50/40 rounded-2xl border border-orange-200/60 flex items-center gap-4">
                    <img
                      src={selectedException.photo_url}
                      alt="Delivery attempt proof"
                      className="w-16 h-16 object-cover rounded-xl border border-orange-200 flex-shrink-0"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">Courier Doorstep Proof Photo</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Recorded on courier mobile device during delivery failure execution.
                      </p>
                    </div>
                  </div>
                )}

                {/* Detailed Incident Reason */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Documented Failure Reason:
                  </h4>
                  <div className="p-3 bg-red-50/50 rounded-xl border border-red-200/60 text-xs font-medium text-slate-800">
                    {selectedException.reason}
                  </div>
                </div>

                {/* ============================================================= */}
                {/* Resolution Status Transition Workspace */}
                {/* ============================================================= */}
                <div className="p-5 bg-gradient-to-br from-slate-50 to-orange-50/20 rounded-2xl border border-slate-200">
                  <h4 className="text-sm font-black text-slate-900 tracking-tight mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ff6600]" />
                    Update Resolution &amp; Re-dispatch Action
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">
                        Select Target Status:
                      </label>
                      <select
                        value={targetStatus}
                        onChange={(e) => setTargetStatus(e.target.value as ResolutionStatus)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:border-[#ff6600]"
                      >
                        <option value="INVESTIGATING">INVESTIGATING (Contacting Customer)</option>
                        <option value="RESCHEDULED">RESCHEDULED (Ready for Re-Delivery &rarr; CONFIRMED)</option>
                        <option value="RETURN_TO_SENDER">RETURN TO SENDER (Flag RTS &rarr; RETURNED)</option>
                        <option value="REFUNDED">REFUNDED (Process Customer Refund)</option>
                        <option value="RESOLVED">RESOLVED (Close Incident)</option>
                        <option value="CANCELLED">CANCELLED (Cancel Parcel)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">
                        Resolution Decision Note:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Customer agreed to Monday morning delivery"
                        value={resolutionComment}
                        onChange={(e) => setResolutionComment(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-[#ff6600]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleUpdateStatus}
                    disabled={actionLoading}
                    className="w-full py-2.5 bg-[#ff6600] hover:bg-[#ea580c] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {actionLoading && <span className="animate-spin">&bull;</span>}
                    <span>Commit Resolution &amp; Cascade Status</span>
                  </button>
                </div>

                {/* ============================================================= */}
                {/* Support Notes History & Appending */}
                {/* ============================================================= */}
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Support Notes &amp; Staff Correspondence:
                  </h4>

                  {selectedException.resolution_notes ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed mb-3 max-h-48 overflow-y-auto">
                      {selectedException.resolution_notes}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic mb-3">No support notes recorded yet.</p>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add an internal note or communication update..."
                      value={standaloneNote}
                      onChange={(e) => setStandaloneNote(e.target.value)}
                      className="flex-1 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-[#ff6600]"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={actionLoading || !standaloneNote.trim()}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                    >
                      Add Note
                    </button>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* Immutable Tamper-Proof Audit Trail Section */}
                {/* ============================================================= */}
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                    <span>Tamper-Proof Audit Trail ({selectedException.audit_logs?.length || 0})</span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Immutable Log
                    </span>
                  </h4>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {selectedException.audit_logs && selectedException.audit_logs.length > 0 ? (
                      selectedException.audit_logs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 text-xs flex items-start justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-900 text-[11px] bg-slate-200 px-1.5 py-0.5 rounded">
                                {log.action}
                              </span>
                              <span className="text-[11px] font-medium text-slate-600">
                                by {log.changed_by_name || 'Staff Member'}
                              </span>
                            </div>
                            {log.new_state && (
                              <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                                {log.new_state.resolution_status
                                  ? `Resolution status: ${log.new_state.resolution_status}`
                                  : (log.new_state.added_note
                                    ? `Note: "${log.new_state.added_note}"`
                                    : JSON.stringify(log.new_state))}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No audit records available.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-16 text-center text-slate-400 text-xs my-auto flex flex-col items-center justify-center">
                <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-bold text-slate-600">Select an active exception from the queue</span>
                <p className="text-slate-400 text-[11px] mt-1 max-w-xs">
                  Review courier delivery proofs, inspect customer details, and resolve delivery failures.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* LOG NEW INCIDENT MODAL */}
        {/* ===================================================================== */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-[#ff6600] flex items-center justify-center font-bold">
                    !
                  </div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Log New Delivery Exception
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-black text-lg p-1"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateException} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tracking Number or Parcel ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SWIFT-882233 or SWIFT-991122"
                    value={createTrackingNum}
                    onChange={(e) => setCreateTrackingNum(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#ff6600]/20 focus:border-[#ff6600]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Enter the tracking number of any registered parcel in the system.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Incident Reason *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Recipient absent after 3 attempts, address incomplete, or parcel damaged"
                    value={createReason}
                    onChange={(e) => setCreateReason(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#ff6600]/20 focus:border-[#ff6600]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Initial Dispatcher Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Customer contacted support hotline; requested call back before next attempt"
                    value={createNotes}
                    onChange={(e) => setCreateNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#ff6600]/20 focus:border-[#ff6600]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-5 py-2 rounded-xl bg-[#ff6600] hover:bg-[#ea580c] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {createLoading ? 'Logging...' : 'Submit Incident'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
