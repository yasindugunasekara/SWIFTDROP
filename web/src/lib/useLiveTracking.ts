'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  TrackingRequestError,
  fetchPublicTracking,
  fetchTrackingConfig,
  type PublicTracking,
} from './tracking';

/** Fallback refresh interval when no WebSocket is available. */
export const POLL_MS = 20_000;
const MAX_RECONNECT_ATTEMPTS = 5;

export type LiveTrackingState =
  | { kind: 'loading' }
  | { kind: 'ready'; data: PublicTracking; checkedAt: Date }
  | { kind: 'error'; status: number; message: string };

/** 'websocket' = pushed live; 'polling' = refreshed every POLL_MS; 'idle' = final status, nothing to watch. */
export type LiveTransport = 'connecting' | 'websocket' | 'polling' | 'idle';

type Keyed<T> = { trackingNumber: string; value: T };

/**
 * Public tracking with live updates. Loads once over HTTP, then subscribes over
 * the tracking WebSocket when the API advertises one; otherwise (Vercel, or the
 * socket drops) it polls the public endpoint while the tab is visible. Stops
 * watching once the parcel reaches a final status.
 */
export function useLiveTracking(trackingNumber: string) {
  const [state, setState] = useState<Keyed<LiveTrackingState> | null>(null);
  const [transport, setTransport] = useState<Keyed<LiveTransport> | null>(null);

  useEffect(() => {
    let disposed = false;
    let isFinal = false;
    let socket: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const controller = new AbortController();

    const setMode = (value: LiveTransport) => { if (!disposed) setTransport({ trackingNumber, value }); };
    const apply = (data: PublicTracking) => {
      if (disposed) return;
      isFinal = data.isFinal;
      setState({ trackingNumber, value: { kind: 'ready', data, checkedAt: new Date() } });
      if (isFinal) stopWatching();
    };
    const fail = (status: number, message: string) => {
      if (disposed) return;
      // Keep the last good result on a transient failure; replace it on 404/400.
      setState((previous) => previous?.trackingNumber === trackingNumber
        && previous.value.kind === 'ready' && status !== 404 && status !== 400
        ? previous
        : { trackingNumber, value: { kind: 'error', status, message } });
    };

    const load = async () => {
      try {
        apply(await fetchPublicTracking(trackingNumber, controller.signal));
      } catch (error) {
        if (controller.signal.aborted) return;
        const status = error instanceof TrackingRequestError ? error.status : 0;
        fail(status, error instanceof Error ? error.message : 'Unable to load tracking information.');
        // Unknown or malformed number: nothing will ever change, stop watching.
        if (status === 404 || status === 400) { isFinal = true; stopWatching(); }
      }
    };

    const stopPolling = () => { if (pollTimer) clearInterval(pollTimer); pollTimer = null; };
    const startPolling = () => {
      if (disposed || isFinal) return;
      setMode('polling');
      pollTimer ??= setInterval(() => {
        if (!isFinal && document.visibilityState === 'visible') void load();
      }, POLL_MS);
    };
    function stopWatching() {
      stopPolling();
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      socket?.close();
      socket = null;
      setMode('idle');
    }

    const connect = (url: string) => {
      if (disposed || isFinal) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        startPolling();
        return;
      }
      socket = ws;
      ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', trackingNumber }));
      ws.onmessage = (event) => {
        let message: { type?: string; trackingNumber?: string; data?: PublicTracking; status?: number; error?: string };
        try { message = JSON.parse(String(event.data)); } catch { return; }
        if (message.trackingNumber && message.trackingNumber !== trackingNumber) return;
        if ((message.type === 'snapshot' || message.type === 'update') && message.data) {
          attempts = 0;
          stopPolling();
          if (!message.data.isFinal) setMode('websocket');
          apply(message.data);
        } else if (message.type === 'error') {
          fail(message.status ?? 0, message.error ?? 'Live tracking failed.');
          if (message.status === 404 || message.status === 400) {
            isFinal = true;
            stopWatching();
          } else {
            // The server refused the subscription (busy, rate limited, DB error):
            // drop this socket without reconnecting and keep the page fresh by polling.
            socket = null;
            ws.close();
            startPolling();
          }
        }
      };
      ws.onclose = () => {
        if (disposed || socket !== ws) return;
        socket = null;
        if (isFinal) return;
        startPolling(); // keep the page fresh while reconnecting
        if (attempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(30_000, 2_000 * 2 ** attempts++);
          retryTimer = setTimeout(() => connect(url), delay);
        }
      };
    };

    void load();
    fetchTrackingConfig().then((config) => {
      if (disposed || isFinal) return;
      if (config.websocketUrl && typeof WebSocket !== 'undefined') {
        setMode('connecting');
        connect(config.websocketUrl);
      } else {
        startPolling();
      }
    });

    const onVisible = () => {
      if (pollTimer && !isFinal && document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      disposed = true;
      controller.abort();
      stopPolling();
      if (retryTimer) clearTimeout(retryTimer);
      const open = socket;
      socket = null;
      open?.close();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [trackingNumber]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchPublicTracking(trackingNumber);
      setState({ trackingNumber, value: { kind: 'ready', data, checkedAt: new Date() } });
    } catch (error) {
      const status = error instanceof TrackingRequestError ? error.status : 0;
      const message = error instanceof Error ? error.message : 'Unable to load tracking information.';
      // Same rule as background refreshes: a transient failure (offline, rate
      // limited) keeps the timeline that is already on screen.
      setState((previous) => previous?.trackingNumber === trackingNumber
        && previous.value.kind === 'ready' && status !== 404 && status !== 400
        ? previous
        : { trackingNumber, value: { kind: 'error', status, message } });
    }
  }, [trackingNumber]);

  return {
    state: state?.trackingNumber === trackingNumber ? state.value : ({ kind: 'loading' } as LiveTrackingState),
    transport: transport?.trackingNumber === trackingNumber ? transport.value : ('connecting' as LiveTransport),
    refresh,
  };
}
