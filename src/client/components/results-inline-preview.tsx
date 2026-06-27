import { useCallback, useEffect, useRef, type MouseEvent } from 'react';
import { useInlinePreviewCapacity } from '../hooks/useInlinePreviewCapacity';
import { useRecentlyAdded } from '../hooks/useRecentlyAdded';
import { useDevvitPresentation } from '../hooks/useDevvitPresentation';
import { useInlineFeedScrollPassthrough } from '../hooks/useInlineFeedScrollPassthrough';
import { DataSourceNotice } from './data-source-notice';
import { LiveStatusBar } from './live-status-bar';
import type { RecentlyAddedResult } from '../../shared/api';

const INITIAL_INLINE_FETCH = 8;

type ResultsInlinePreviewProps = {
  onExpand: (event: MouseEvent<HTMLElement>) => void;
};

function formatPlayedAt(result: RecentlyAddedResult): string {
  if (result.time) return `${result.date} · ${result.time}`;
  return result.date;
}

function PreviewMatchRow({
  result,
  isNew,
}: {
  result: RecentlyAddedResult;
  isNew: boolean;
}) {
  return (
    <li
      className={`results-app__preview-row rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/80 ${
        isNew ? 'match-row-new' : ''
      }`}
    >
      <p className="text-sm leading-snug text-gray-900 dark:text-gray-100">{result.line}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>{formatPlayedAt(result)}</span>
        {result.comparisonAvailable ? (
          <span className="rounded-full bg-teal-100 px-2 py-0.5 font-medium text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
            Charting stats
          </span>
        ) : null}
      </div>
    </li>
  );
}

export function ResultsInlinePreview({ onExpand }: ResultsInlinePreviewProps) {
  useDevvitPresentation();
  useInlineFeedScrollPassthrough();

  const shellRef = useRef<HTMLDivElement>(null);
  const expandRequestedRef = useRef(false);

  const {
    data,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    loadMore,
    lastUpdatedAt,
    secondsUntilRefresh,
    newEventKeys,
  } = useRecentlyAdded(INITIAL_INLINE_FETCH);

  const targetCount = useInlinePreviewCapacity(shellRef, [
    data?.results.length,
    loading,
    error,
    data?.notice,
  ]);

  useEffect(() => {
    if (!data || loading || refreshing || loadingMore) return;
    if (data.results.length < targetCount && hasMore) {
      loadMore();
    }
  }, [
    data,
    hasMore,
    loadMore,
    loading,
    loadingMore,
    refreshing,
    targetCount,
  ]);

  const handleActivate = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (expandRequestedRef.current) return;
      expandRequestedRef.current = true;
      event.preventDefault();
      event.stopPropagation();
      onExpand(event);
    },
    [onExpand]
  );

  const previewResults = data?.results.slice(0, targetCount) ?? [];

  return (
    <div
      ref={shellRef}
      className="results-app results-app--splash flex min-h-full flex-col px-4 py-5"
      role="button"
      tabIndex={0}
      aria-label="Open full match results"
      onClick={handleActivate}
    >
      <header data-inline-fixed className="mb-4 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#d93900] dark:text-orange-400">
          AllCourt Pro
        </p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Latest ATP / WTA results
        </h1>
        {data ? (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {data.results.length} match{data.results.length === 1 ? '' : 'es'}
            {data.ageFilterApplied ? ` · last ${data.newMatchMaxAgeMinutes} min` : ''}
          </p>
        ) : null}
      </header>

      <div data-inline-fixed className="shrink-0">
        <LiveStatusBar
          lastUpdatedAt={lastUpdatedAt}
          secondsUntilRefresh={secondsUntilRefresh}
          refreshing={refreshing}
          source={data?.source ?? 'live'}
        />
      </div>

      {data?.notice ? (
        <div data-inline-fixed className="shrink-0">
          <DataSourceNotice data={data} />
        </div>
      ) : null}

      {loading && !data ? (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          Loading matches…
        </div>
      ) : null}

      {error ? (
        <div
          data-inline-fixed
          className="mb-4 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}

      {!loading && !error && data && data.results.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
          No new matches in the current window.
        </div>
      ) : null}

      {previewResults.length > 0 ? (
        <div className="relative min-h-0 flex-1">
          <ul
            className={`results-app__preview-list flex h-full flex-col justify-start gap-2 ${
              refreshing ? 'live-list-updating' : ''
            }`}
          >
            {previewResults.map((result) => (
              <PreviewMatchRow
                key={result.eventKey}
                result={result}
                isNew={newEventKeys.has(result.eventKey)}
              />
            ))}
          </ul>
        </div>
      ) : null}

      <div className="results-app__inline-overlay" aria-hidden="true">
        <span className="results-app__inline-cta">Tap to open full view</span>
      </div>
    </div>
  );
}
