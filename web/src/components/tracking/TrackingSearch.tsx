'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { isValidTrackingNumber, normaliseTrackingNumber } from '../../lib/tracking';

export default function TrackingSearch({ initialValue = '' }: { initialValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trackingNumber = normaliseTrackingNumber(value);
    if (!isValidTrackingNumber(trackingNumber)) {
      setError('Tracking numbers look like SWIFT-AB12CD34.');
      return;
    }
    setError('');
    router.push(`/tracking/${trackingNumber}`);
  };

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="tracking-number" className="sr-only">Tracking number</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="tracking-number"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          placeholder="e.g. SWIFT-AB12CD34"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'tracking-number-error' : undefined}
          className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold uppercase tracking-wide text-slate-900 placeholder:normal-case placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6600]"
        />
        <button
          type="submit"
          className="cursor-pointer rounded-full bg-[#ff6600] px-7 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-[#ea580c]"
        >
          Track
        </button>
      </div>
      {error && <p id="tracking-number-error" role="alert" className="mt-2 pl-4 text-xs font-bold text-red-700">{error}</p>}
    </form>
  );
}
