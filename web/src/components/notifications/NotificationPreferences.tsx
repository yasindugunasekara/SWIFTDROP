'use client';

import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences as NotificationPreferencesData,
} from '../../lib/notifications';

type PreferenceKey = 'pushEnabled' | 'emailEnabled' | 'smsEnabled';

interface PreferenceRowProps {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}

function PreferenceRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: PreferenceRowProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 transition-colors hover:border-orange-200">
      <span className="min-w-0">
        <span className="block text-xs font-black text-slate-800 sm:text-sm">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
          {description}
        </span>
      </span>

      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
        />
        <span
          aria-hidden="true"
          className="block h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-[#ff6600] peer-focus-visible:ring-2 peer-focus-visible:ring-orange-400 peer-focus-visible:ring-offset-2 peer-disabled:opacity-60"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  );
}

export default function NotificationPreferences() {
  const [saved, setSaved] = useState<NotificationPreferencesData | null>(null);
  const [draft, setDraft] = useState<NotificationPreferencesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const requestId = useRef(0);

  const loadPreferences = useCallback(async () => {
    const request = ++requestId.current;

    try {
      const result = await getNotificationPreferences();
      if (request !== requestId.current) return;
      setSaved(result.preferences);
      setDraft(result.preferences);
      setError('');
      setSuccessMessage('');
    } catch (failure) {
      if (request === requestId.current) {
        setError(
          failure instanceof Error
            ? failure.message
            : 'Unable to load your notification preferences. Please try again.',
        );
      }
    } finally {
      if (request === requestId.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const request = ++requestId.current;

    getNotificationPreferences()
      .then(result => {
        if (!active || request !== requestId.current) return;
        setSaved(result.preferences);
        setDraft(result.preferences);
        setError('');
        setSuccessMessage('');
      })
      .catch((failure: unknown) => {
        if (!active || request !== requestId.current) return;
        setError(
          failure instanceof Error
            ? failure.message
            : 'Unable to load your notification preferences. Please try again.',
        );
      })
      .finally(() => {
        if (active && request === requestId.current) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const isDirty = Boolean(
    saved &&
      draft &&
      (saved.pushEnabled !== draft.pushEnabled ||
        saved.emailEnabled !== draft.emailEnabled ||
        saved.smsEnabled !== draft.smsEnabled),
  );

  const toggle = (key: PreferenceKey) => {
    setDraft(previous => (previous ? { ...previous, [key]: !previous[key] } : previous));
    setError('');
    setSuccessMessage('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || !isDirty || isSaving) return;

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await updateNotificationPreferences({
        pushEnabled: draft.pushEnabled,
        emailEnabled: draft.emailEnabled,
        smsEnabled: draft.smsEnabled,
      });
      setSaved(result.preferences);
      setDraft(result.preferences);
      setSuccessMessage('Preferences saved.');
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Unable to save your notification preferences. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    void loadPreferences();
  };

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="space-y-3 rounded-3xl border border-slate-100 bg-white p-4 sm:p-6"
      >
        <span className="sr-only">Loading notification preferences...</span>
        {[0, 1, 2].map(index => (
          <div
            key={index}
            aria-hidden="true"
            className="h-[76px] animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (!saved || !draft) {
    return (
      <div
        role="alert"
        className="rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center"
      >
        <h2 className="text-base font-black text-red-900">Channel preferences</h2>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-red-700 sm:text-sm">
          {error || 'Unable to load your notification preferences. Please try again.'}
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="mt-5 min-h-[44px] rounded-xl bg-red-600 px-5 text-xs font-black text-white transition-colors hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-6">
        <div>
          <h2 className="text-base font-black tracking-tight text-slate-900">
            Channel preferences
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Choose which channels should be recorded for your parcel updates.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <PreferenceRow
            title="Push notifications"
            description="Record your preference for push alerts about parcel progress."
            checked={draft.pushEnabled}
            disabled={isSaving}
            onChange={() => toggle('pushEnabled')}
          />
          <PreferenceRow
            title="Email notifications"
            description="Record your preference for email updates about parcel progress."
            checked={draft.emailEnabled}
            disabled={isSaving}
            onChange={() => toggle('emailEnabled')}
          />
          <PreferenceRow
            title="SMS notifications"
            description="Record your preference for text-message updates about parcel progress."
            checked={draft.smsEnabled}
            disabled={isSaving}
            onChange={() => toggle('smsEnabled')}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            {error}
          </div>
        )}

        {successMessage && (
          <p
            role="status"
            className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700"
          >
            {successMessage}
          </p>
        )}

        <div className="mt-5 rounded-2xl border border-orange-200/70 bg-orange-50/60 p-3 text-[11px] leading-relaxed text-orange-900">
          <span className="font-black">Please note: </span>
          External email, SMS and push providers are not connected in this release.
          These settings record your delivery preferences only. Your in-app inbox
          always records parcel updates.
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={!isDirty || isSaving}
            className="min-h-[44px] rounded-xl bg-[#ff6600] px-5 text-xs font-black text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save preferences'}
          </button>
        </div>
      </div>
    </form>
  );
}
