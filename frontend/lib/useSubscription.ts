'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from './api';
import { SubscriptionStatus, DEFAULT_STATUS } from './subscription';

const CACHE_KEY = 'jnconta_subscription';
const CACHE_TTL = 5 * 60 * 1000; // 5 min

interface Cached { data: SubscriptionStatus; ts: number }

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Try cache first
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: Cached = JSON.parse(raw);
        if (Date.now() - cached.ts < CACHE_TTL) {
          setStatus(cached.data);
          setLoading(false);
          return;
        }
      }
    } catch {}

    try {
      const res = await apiFetch('/api/subscriptions/status');
      if (res.ok) {
        const data: SubscriptionStatus = await res.json();
        setStatus(data);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const invalidate = () => {
    sessionStorage.removeItem(CACHE_KEY);
    load();
  };

  return { status, loading, invalidate };
}
