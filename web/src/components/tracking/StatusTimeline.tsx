import { LIFECYCLE, formatDateTime, type ParcelStatus, type TrackingEvent } from '../../lib/tracking';

const PROBLEM_STATUSES: ReadonlySet<ParcelStatus> = new Set(['FAILED', 'RETURNED', 'CANCELLED']);

/**
 * Vertical status timeline. Shows every recorded event (oldest first), then the
 * remaining steps of the normal delivery path as upcoming, unless the parcel
 * has reached a final or problem state.
 */
export default function StatusTimeline({
  events,
  currentStatus,
  isFinal,
  showNotes = false,
}: {
  events: TrackingEvent[];
  currentStatus: ParcelStatus;
  isFinal: boolean;
  showNotes?: boolean;
}) {
  const reached = new Set(events.map((e) => e.status));
  const lastIndex = LIFECYCLE.reduce((max, step, i) => (reached.has(step.status) ? i : max), -1);
  const upcoming = isFinal || PROBLEM_STATUSES.has(currentStatus) ? [] : LIFECYCLE.slice(lastIndex + 1);

  if (events.length === 0 && upcoming.length === 0) {
    return <p className="text-sm text-slate-400">No status updates have been recorded yet.</p>;
  }

  return (
    <ol className="relative" aria-label="Status timeline">
      {events.map((event, i) => {
        const latest = i === events.length - 1;
        const problem = PROBLEM_STATUSES.has(event.status);
        const isLast = latest && upcoming.length === 0;
        return (
          <li key={`${event.status}-${event.timestamp}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && <span className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-200" aria-hidden="true" />}
            <span
              className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                problem ? 'border-red-500 bg-red-500' : latest ? 'border-[#ff6600] bg-[#ff6600]' : 'border-emerald-500 bg-emerald-500'
              }`}
              aria-hidden="true"
            >
              {problem ? (
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" /></svg>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-black ${latest ? 'text-slate-900' : 'text-slate-700'}`}>
                {event.label}
                {latest && !problem && !isFinal && (
                  <span className="ml-2 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#ff6600]">Latest</span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatDateTime(event.timestamp)}
                {event.location && <span className="text-slate-400"> · {event.location}</span>}
              </p>
              {showNotes && event.note && <p className="mt-1 text-xs text-slate-500 italic">{event.note}</p>}
            </div>
          </li>
        );
      })}
      {upcoming.map((step, i) => (
        <li key={`upcoming-${step.status}`} className="relative flex gap-4 pb-6 last:pb-0">
          {i < upcoming.length - 1 && <span className="absolute left-[11px] top-6 bottom-0 w-0.5 border-l-2 border-dashed border-slate-200" aria-hidden="true" />}
          <span className="relative z-10 mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-slate-200 bg-white" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-slate-400">{step.label}</p>
            <p className="mt-0.5 text-xs text-slate-300">Upcoming</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
