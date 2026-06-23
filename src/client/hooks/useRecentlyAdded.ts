import { useCallback, useEffect, useState } from 'react';
import type { RecentlyAddedResponse } from '../../shared/api';

type RecentlyAddedState = {
  loading: boolean;
  error: string | null;
  data: RecentlyAddedResponse | null;
};

function isRecentlyAddedResponse(value: unknown): value is RecentlyAddedResponse {
  if (typeof value !== 'object' || value === null) return false;
  if (!('type' in value) || value.type !== 'recently-added') return false;
  if (!('results' in value) || !Array.isArray(value.results)) return false;
  if (!('source' in value) || (value.source !== 'live' && value.source !== 'mock')) {
    return false;
  }
  return true;
}

function errorMessageFromPayload(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null;
  if (!('status' in value) || value.status !== 'error') return null;
  if (!('message' in value) || typeof value.message !== 'string') return null;
  return value.message;
}

async function fetchRecentlyAdded(limit: number): Promise<RecentlyAddedResponse> {
  const res = await fetch(
    `/api/recently-added?limit=${encodeURIComponent(String(limit))}`
  );
  const data: unknown = await res.json();

  if (!res.ok) {
    throw new Error(errorMessageFromPayload(data) ?? `HTTP ${res.status}`);
  }

  const apiError = errorMessageFromPayload(data);
  if (apiError) {
    throw new Error(apiError);
  }

  if (isRecentlyAddedResponse(data)) {
    return data;
  }

  throw new Error('Unexpected response');
}

export const useRecentlyAdded = (limit = 10) => {
  const [state, setState] = useState<RecentlyAddedState>({
    loading: true,
    error: null,
    data: null,
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const data = await fetchRecentlyAdded(limit);
        if (!cancelled) {
          setState({ loading: false, error: null, data });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load matches',
            data: null,
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [limit, reloadToken]);

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return { ...state, refresh };
};
