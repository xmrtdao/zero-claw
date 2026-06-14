import { useState, useEffect, useCallback } from 'react';

interface UseAsyncDataOptions<T> {
  fetchFn: () => Promise<T>;
  initialData?: T;
  deps?: any[];
}

interface UseAsyncDataResult<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAsyncData<T>({
  fetchFn,
  initialData,
  deps = [],
}: UseAsyncDataOptions<T>): UseAsyncDataResult<T> {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err: any) {
      console.error('[useAsyncData] Fetch error:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    execute();
  }, deps);

  return {
    data,
    loading,
    error,
    refetch: execute,
  };
}
