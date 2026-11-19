import type { ParcelStatus } from '../../lib/tracking';

// Tailwind classes must live under src/components or src/app (tailwind.config
// content globs), so the colour mapping is kept here rather than in src/lib.
function statusTone(status: ParcelStatus): string {
  switch (status) {
    case 'DELIVERED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'FAILED': case 'RETURNED': case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-200';
    case 'PENDING_PAYMENT': return 'bg-amber-50 text-amber-700 border-amber-200';
    default: return 'bg-orange-50 text-[#ea580c] border-orange-200';
  }
}

export default function StatusBadge({ status, label }: { status: ParcelStatus; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${statusTone(status)}`}>
      {label}
    </span>
  );
}
