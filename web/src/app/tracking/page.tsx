import TrackingSearch from '../../components/tracking/TrackingSearch';

export default function TrackingLandingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-12 pt-28 sm:pt-32">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] sm:p-8">
        <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-900">Track a parcel</h1>
        <p className="mb-6 text-sm text-slate-500">
          Enter the tracking number from your booking confirmation. No sign-in needed.
        </p>
        <TrackingSearch />
      </div>
    </div>
  );
}
