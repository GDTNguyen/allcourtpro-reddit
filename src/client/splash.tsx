import './index.css';

import { navigateTo, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useRecentlyAdded } from './hooks/useRecentlyAdded';
import { DataSourceNotice } from './components/data-source-notice';
import { DraftPostButton } from './components/draft-post-button';
import { LiveStatusBar } from './components/live-status-bar';
import type { RecentlyAddedResult } from '../shared/api';

function formatPlayedAt(result: RecentlyAddedResult): string {
  if (result.time) return `${result.date} · ${result.time}`;
  return result.date;
}

function MatchRow({
  result,
  isNew,
}: {
  result: RecentlyAddedResult;
  isNew: boolean;
}) {
  return (
    <li
      className={`rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/80 ${
        isNew ? 'match-row-new' : ''
      }`}
    >
      <p className="text-sm leading-snug text-gray-900 dark:text-gray-100">
        {result.line}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>{formatPlayedAt(result)}</span>
        {result.comparisonAvailable ? (
          <span className="rounded-full bg-teal-100 px-2 py-0.5 font-medium text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
            Charting stats
          </span>
        ) : null}
        <DraftPostButton result={result} compact />
      </div>
    </li>
  );
}

export const Splash = () => {
  const {
    data,
    loading,
    refreshing,
    error,
    refresh,
    lastUpdatedAt,
    secondsUntilRefresh,
    newEventKeys,
  } = useRecentlyAdded(10);

  return (
    <div className="flex min-h-screen flex-col bg-white px-4 py-5 dark:bg-gray-900">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#d93900] dark:text-orange-400">
            AllCourt Pro
          </p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Latest ATP / WTA results
          </h1>
          {data ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {data.results.length} match{data.results.length === 1 ? '' : 'es'}
              {data.ageFilterApplied
                ? ` · last ${data.newMatchMaxAgeMinutes} min`
                : ''}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          onClick={() => void refresh()}
          disabled={loading || refreshing}
        >
          {loading || refreshing ? 'Updating…' : 'Refresh now'}
        </button>
      </header>

      <LiveStatusBar
        lastUpdatedAt={lastUpdatedAt}
        secondsUntilRefresh={secondsUntilRefresh}
        refreshing={refreshing}
        source={data?.source ?? 'live'}
      />

      {data ? <DataSourceNotice data={data} /> : null}

      {loading && !data ? (
        <div className="flex flex-1 items-center justify-center py-10 text-sm text-gray-500 dark:text-gray-400">
          Loading matches…
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {!loading && !error && data && data.results.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          No new matches in the current window.
        </div>
      ) : null}

      {data && data.results.length > 0 ? (
        <ul className={`flex flex-col gap-2 ${refreshing ? 'live-list-updating' : ''}`}>
          {data.results.map((result) => (
            <MatchRow
              key={result.eventKey}
              result={result}
              isNew={newEventKeys.has(result.eventKey)}
            />
          ))}
        </ul>
      ) : null}

      <div className="mt-5 flex items-center justify-center">
        <button
          type="button"
          className="flex h-10 cursor-pointer items-center justify-center rounded-full bg-[#d93900] px-4 text-white transition-colors hover:bg-[#c23300] dark:bg-orange-600 dark:hover:bg-orange-700"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          Open full view
        </button>
      </div>

      <footer className="mt-6 flex justify-center gap-3 text-[0.8em] text-gray-600 dark:text-gray-400">
        <button
          type="button"
          className="cursor-pointer transition-colors hover:text-gray-900 dark:hover:text-white"
          onClick={() => navigateTo('https://www.allcourt.pro/tennis-results/discuss')}
        >
          allcourt.pro
        </button>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <button
          type="button"
          className="cursor-pointer transition-colors hover:text-gray-900 dark:hover:text-white"
          onClick={() => navigateTo('https://www.reddit.com/r/ATPWTA/')}
        >
          r/ATPWTA
        </button>
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
