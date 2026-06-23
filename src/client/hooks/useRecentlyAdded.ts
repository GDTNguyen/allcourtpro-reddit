import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecentlyAddedResponse } from '../../shared/api';

export const REFRESH_INTERVAL_SECONDS = 60;

type RecentlyAddedState = {
  loading: boolean;
  refreshing: boolean;
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
    refreshing: false,
    error: null,
    data: null,
  });
  const [reloadToken, setReloadToken] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(REFRESH_INTERVAL_SECONDS);
  const [newEventKeys, setNewEventKeys] = useState<ReadonlySet<string>>(() => new Set());

  const previousKeysRef = useRef<Set<string>>(new Set());
  const hasLoadedRef = useRef(false);
  const autoRefreshPendingRef = useRef(false);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((prev) => ({
        ...prev,
        loading: prev.data === null,
        refreshing: prev.data !== null,
        error: null,
      }));

      try {
        const data = await fetchRecentlyAdded(limit);
        if (cancelled) return;

        const incomingKeys = new Set(data.results.map((result) => result.eventKey));
        if (hasLoadedRef.current) {
          const added = new Set(
            [...incomingKeys].filter((key) => !previousKeysRef.current.has(key))
          );
          if (added.size > 0) {
            if (highlightTimeoutRef.current) {
              clearTimeout(highlightTimeoutRef.current);
            }
            setNewEventKeys(added);
            highlightTimeoutRef.current = setTimeout(() => {
              setNewEventKeys(new Set());
            }, 4000);
          }
        }

        previousKeysRef.current = incomingKeys;
        hasLoadedRef.current = true;
        autoRefreshPendingRef.current = false;
        setLastUpdatedAt(Date.now());
        setSecondsUntilRefresh(REFRESH_INTERVAL_SECONDS);
        setState({ loading: false, refreshing: false, error: null, data });
      } catch (err) {
        if (cancelled) return;
        autoRefreshPendingRef.current = false;
        setState((prev) => ({
          loading: false,
          refreshing: false,
          error: err instanceof Error ? err.message : 'Failed to load matches',
          data: prev.data,
        }));
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [limit, reloadToken]);

  useEffect(() => {
    if (lastUpdatedAt === null) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - lastUpdatedAt) / 1000);
      const remaining = Math.max(0, REFRESH_INTERVAL_SECONDS - elapsed);
      setSecondsUntilRefresh(remaining);

      if (
        remaining === 0 &&
        !autoRefreshPendingRef.current &&
        !state.loading &&
        !state.refreshing
      ) {
        autoRefreshPendingRef.current = true;
        setReloadToken((token) => token + 1);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastUpdatedAt, state.loading, state.refreshing]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const refresh = useCallback(() => {
    autoRefreshPendingRef.current = false;
    setReloadToken((token) => token + 1);
  }, []);

  return {
    ...state,
    refresh,
    lastUpdatedAt,
    secondsUntilRefresh,
    newEventKeys,
  };
};
