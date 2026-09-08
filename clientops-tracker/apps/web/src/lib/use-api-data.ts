'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './auth';

export function useApiData<T>(loader: () => Promise<T>, dependencies: React.DependencyList = []) {
  const { user, status } = useAuth();
  const requestId = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    if (status !== 'authenticated') {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const result = await loaderRef.current();
      if (id === requestId.current) setData(result);
    } catch (caught) {
      if (id === requestId.current) {
        setData(null);
        setError(caught instanceof Error ? caught.message : 'Request failed.');
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [status, user?.id, ...dependencies]);

  useEffect(() => {
    void load();
    return () => {
      requestId.current++;
    };
  }, [load]);

  return {
    data,
    error,
    loading,
    reload: load,
    setData,
  };
}
