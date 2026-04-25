'use client';
import { useState, useEffect, useCallback } from 'react';
import { SubscriptionStatus, DEFAULT_STATUS, PLAN_FEATURES } from './subscription';

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(false);

  // Siempre retorna plan máximo — todas las funciones desbloqueadas
  const load = useCallback(async () => {
    setStatus({
      ...DEFAULT_STATUS,
      features: PLAN_FEATURES['despacho'],
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const invalidate = () => { load(); };

  return { status, loading, invalidate };
}
