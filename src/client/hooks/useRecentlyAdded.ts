import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecentlyAddedResponse, RecentlyAddedResult } from '../../shared/api';

export const REFRESH_INTERVAL_SECONDS = 60;
export const LOAD_MORE_PAGE_SIZE = 10;

type RecentlyAddedState = {
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  data: RecentlyAddedResponse | null;
  hasMore: boolean;
};

type FetchMode = 'initial' | 'loadMore';

function isRecentlyAddedResponse(value: unknown): value is RecentlyAddedResponse {
  if (typeof value !== 'object' || value === null) return false;
  if (!('type' in value) || value.type !== 'recently-added') return false;
  if (!('results' in value) || !Array.isArray(value.results)) return false;
  if (!('source' in value) || (value.source !== 'live' && value.source !== 'mock')) {
    return false;
  }
  if (!('hasMore' in value) || typeof value.hasMore !== 'boolean') return false;
  return true;
}

function errorMessageFromPayload(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null;
  if (!('status' in value) || value.status !== 'error') return null;
  if (!('message' in value) || typeof value.message !== 'string') return null;
  return value.message;
}

async function fetchRecentlyAdded(
  limit: number,
  offset: number,
): Promise<RecentlyAddedResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    ignoreMaxAge: '1',
  });
  const res = await fetch(`/api/recently-added?${params.toString()}`);
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

function trackDisplayedKeys(keys: Set<string>, results: RecentlyAddedResult[]): void {
  for (const result of results) {
    keys.add(result.eventKey);
  }
}

function highlightNewResults(
  results: RecentlyAddedResult[],
  setNewEventKeys: (keys: ReadonlySet<string>) => void,
  highlightTimeoutRef: { current: ReturnType<typeof setTimeout> | null },
): void {
  if (results.length === 0) return;
  if (highlightTimeoutRef.current) {
    clearTimeout(highlightTimeoutRef.current);
  }
  setNewEventKeys(new Set(results.map((result) => result.eventKey)));
  highlightTimeoutRef.current = setTimeout(() => {
    setNewEventKeys(new Set());
  }, 4000);
}

export const useRecentlyAdded = (
  initialLimit = 10,
  pageSize = LOAD_MORE_PAGE_SIZE,
) => {
  const [state, setState] = useState<RecentlyAddedState>({
    loading: true,
    refreshing: false,
    loadingMore: false,
    error: null,
    data: null,
    hasMore: false,
  });
  const [reloadToken, setReloadToken] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(REFRESH_INTERVAL_SECONDS);
  const [newEventKeys, setNewEventKeys] = useState<ReadonlySet<string>>(() => new Set());

  const displayedKeysRef = useRef<Set<string>>(new Set());
  const pollingRef = useRef(false);
  const autoRefreshPendingRef = useRef(false);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchModeRef = useRef<FetchMode>('initial');
  const loadedCountRef = useRef(initialLimit);

  const pollForNewMatches = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    setState((prev) => ({
      ...prev,
      refreshing: prev.data !== null,
      error: null,
    }));

    try {
      const poll = await fetchRecentlyAdded(initialLimit, 0);
      const newResults = poll.results.filter(
        (result) => !displayedKeysRef.current.has(result.eventKey),
      );

      setState((prev) => {
        if (!prev.data) {
          displayedKeysRef.current = new Set(poll.results.map((result) => result.eventKey));
          loadedCountRef.current = poll.results.length;
          return {
            ...prev,
            loading: false,
            refreshing: false,
            loadingMore: false,
            error: null,
            hasMore: poll.hasMore,
            data: poll,
          };
        }

        if (newResults.length > 0) {
          trackDisplayedKeys(displayedKeysRef.current, newResults);
          loadedCountRef.current = prev.data.results.length + newResults.length;
        }

        return {
          ...prev,
          loading: false,
          refreshing: false,
          loadingMore: false,
          error: null,
          hasMore: prev.hasMore,
          data: {
            ...poll,
            results:
              newResults.length > 0
                ? [...newResults, ...prev.data.results]
                : prev.data.results,
          },
        };
      });

      if (newResults.length > 0) {
        highlightNewResults(newResults, setNewEventKeys, highlightTimeoutRef);
      }

      setLastUpdatedAt(Date.now());
      setSecondsUntilRefresh(REFRESH_INTERVAL_SECONDS);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        refreshing: false,
        loadingMore: false,
        error: err instanceof Error ? err.message : 'Failed to load matches',
      }));
    } finally {
      pollingRef.current = false;
      autoRefreshPendingRef.current = false;
    }
  }, [initialLimit]);

  useEffect(() => {
    let cancelled = false;
    const mode = fetchModeRef.current;

    const load = async () => {
      if (mode === 'loadMore') {
        setState((prev) => ({ ...prev, loadingMore: true, error: null }));
      } else {
        setState((prev) => ({
          ...prev,
          loading: prev.data === null,
          error: null,
        }));
      }

      try {
        if (mode === 'loadMore') {
          const offset = loadedCountRef.current;
          const page = await fetchRecentlyAdded(pageSize, offset);
          if (cancelled) return;

          trackDisplayedKeys(displayedKeysRef.current, page.results);
          loadedCountRef.current = offset + page.results.length;
          setLastUpdatedAt(Date.now());
          setSecondsUntilRefresh(REFRESH_INTERVAL_SECONDS);
          setState((prev) => {
            if (!prev.data) {
              return {
                loading: false,
                refreshing: false,
                loadingMore: false,
                error: null,
                hasMore: page.hasMore,
                data: page,
              };
            }

            return {
              loading: false,
              refreshing: false,
              loadingMore: false,
              error: null,
              hasMore: page.hasMore,
              data: {
                ...page,
                results: [...prev.data.results, ...page.results],
              },
            };
          });
        } else {
          const data = await fetchRecentlyAdded(initialLimit, 0);
          if (cancelled) return;

          displayedKeysRef.current = new Set(data.results.map((result) => result.eventKey));
          loadedCountRef.current = data.results.length;
          setLastUpdatedAt(Date.now());
          setSecondsUntilRefresh(REFRESH_INTERVAL_SECONDS);
          setState({
            loading: false,
            refreshing: false,
            loadingMore: false,
            error: null,
            hasMore: data.hasMore,
            data,
          });
        }
      } catch (err) {
        if (cancelled) return;
        setState((prev) => ({
          loading: false,
          refreshing: false,
          loadingMore: false,
          error: err instanceof Error ? err.message : 'Failed to load matches',
          data: prev.data,
          hasMore: prev.hasMore,
        }));
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [initialLimit, pageSize, reloadToken]);

  useEffect(() => {
    if (lastUpdatedAt === null) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - lastUpdatedAt) / 1000);
      const remaining = Math.max(0, REFRESH_INTERVAL_SECONDS - elapsed);
      setSecondsUntilRefresh(remaining);

      if (
        remaining === 0 &&
        !autoRefreshPendingRef.current &&
        !pollingRef.current &&
        !state.loading &&
        !state.refreshing &&
        !state.loadingMore
      ) {
        autoRefreshPendingRef.current = true;
        void pollForNewMatches();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [
    lastUpdatedAt,
    pollForNewMatches,
    state.loading,
    state.loadingMore,
    state.refreshing,
  ]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const refresh = useCallback(() => {
    autoRefreshPendingRef.current = false;
    void pollForNewMatches();
  }, [pollForNewMatches]);

  const loadMore = useCallback(() => {
    if (!state.hasMore || state.loadingMore) return;
    fetchModeRef.current = 'loadMore';
    setReloadToken((token) => token + 1);
  }, [state.hasMore, state.loadingMore]);

  return {
    ...state,
    refresh,
    loadMore,
    lastUpdatedAt,
    secondsUntilRefresh,
    newEventKeys,
  };
};
