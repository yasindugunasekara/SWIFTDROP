import Link from 'next/link';

export default function CustomerHeader({ badge, backHref = '/booking', backLabel = 'Back to Dashboard' }: {
  badge: string; backHref?: string; backLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-slate-100 bg-white px-6 py-4 print:hidden sm:px-10">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-2xl font-black tracking-tight text-slate-900">
          swiftdrop<span className="text-[#ff6600]">.</span>
        </Link>
        <span className="hidden rounded-full border border-orange-200/80 bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-[#ff6600] sm:inline">
          {badge}
        </span>
      </div>
      <Link href={backHref} className="text-xs font-bold text-[#ff6600] hover:underline">
        &larr; {backLabel}
      </Link>
    </header>
  );
}
