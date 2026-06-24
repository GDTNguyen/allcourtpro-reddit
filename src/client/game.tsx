import './index.css';

import { navigateTo } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useRecentlyAdded } from './hooks/useRecentlyAdded';
import { DataSourceNotice } from './components/data-source-notice';
import { DraftPostButton } from './components/draft-post-button';
import { LoadMoreButton } from './components/load-more-button';
import { LiveStatusBar } from './components/live-status-bar';
import type { RecentlyAddedResult } from '../shared/api';

function formatPlayedAt(result: RecentlyAddedResult): string {
  if (result.time) return `${result.date} · ${result.time}`;
  return result.date;
}

function ComparisonPreview({ markdown }: { markdown: string }) {
  const lines = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  return (
    <pre className="mt-2 overflow-x-auto rounded-md bg-gray-900/5 p-2 text-xs leading-relaxed whitespace-pre-wrap text-gray-700 dark:bg-black/30 dark:text-gray-300">
      {lines.join('\n')}
    </pre>
  );
}

function MatchCard({
  result,
  isNew,
}: {
  result: RecentlyAddedResult;
  isNew: boolean;
}) {
  return (
    <article
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${
        isNew ? 'match-row-new' : ''
      }`}
    >
      <p className="text-base leading-snug font-medium text-gray-900 dark:text-gray-100">
        {result.line}
      </p>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {formatPlayedAt(result)} · detected {new Date(result.detectedAt).toLocaleString()}
      </p>
      {result.comparisonAvailable && result.comparisonMarkdown ? (
        <ComparisonPreview markdown={result.comparisonMarkdown} />
      ) : (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          No charting comparison available for this match.
        </p>
      )}
      <DraftPostButton result={result} />
    </article>
  );
}

export const App = () => {
  const {
    data,
    loading,
    refreshing,
    loadingMore,
    error,
    refresh,
    loadMore,
    hasMore,
    lastUpdatedAt,
    secondsUntilRefresh,
    newEventKeys,
  } = useRecentlyAdded(20);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 dark:bg-gray-900">
      <header className="mx-auto mb-5 flex max-w-2xl items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#d93900] dark:text-orange-400">
            AllCourt Pro
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Recent match results
          </h1>
        </div>
        <button
          type="button"
          className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-white disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          onClick={() => void refresh()}
          disabled={loading || refreshing}
        >
          {loading || refreshing ? 'Updating…' : 'Refresh now'}
        </button>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-3">
        <LiveStatusBar
          lastUpdatedAt={lastUpdatedAt}
          secondsUntilRefresh={secondsUntilRefresh}
          refreshing={refreshing}
          source={data?.source ?? 'live'}
        />

        {data ? <DataSourceNotice data={data} /> : null}

        {loading && !data ? (
          <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading matches…
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {data?.results.length ? (
          <div className={refreshing ? 'live-list-updating flex flex-col gap-3' : 'flex flex-col gap-3'}>
            {data.results.map((result) => (
              <MatchCard
                key={result.eventKey}
                result={result}
                isNew={newEventKeys.has(result.eventKey)}
              />
            ))}
          </div>
        ) : null}

        {hasMore ? (
          <div className="flex justify-center pt-1">
            <LoadMoreButton
              onClick={loadMore}
              loading={loadingMore}
              disabled={loading || refreshing}
            />
          </div>
        ) : null}

        {!loading && !error && data && data.results.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            No recent matches found.
          </p>
        ) : null}
      </main>

      <footer className="mx-auto mt-8 flex max-w-2xl justify-center gap-3 text-[0.8em] text-gray-600 dark:text-gray-400">
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
    <App />
  </StrictMode>
);
