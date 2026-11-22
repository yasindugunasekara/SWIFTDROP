export default function NotificationSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-slate-100 bg-white p-4 sm:p-5"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex items-center justify-between gap-4">
                <div className="h-3 w-28 rounded-full bg-slate-100" />
                <div className="h-3 w-16 rounded-full bg-slate-100" />
              </div>
              <div className="h-4 w-2/3 rounded-full bg-slate-200" />
              <div className="h-3 w-full rounded-full bg-slate-100" />
              <div className="h-3 w-4/5 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
