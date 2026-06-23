import { REFRESH_INTERVAL_SECONDS } from '../hooks/useRecentlyAdded';

type LiveStatusBarProps = {
  lastUpdatedAt: number | null;
  secondsUntilRefresh: number;
  refreshing: boolean;
  source?: 'live' | 'mock';
};

function formatLastUpdated(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function LiveStatusBar({
  lastUpdatedAt,
  secondsUntilRefresh,
  refreshing,
  source = 'live',
}: LiveStatusBarProps) {
  const progress =
    lastUpdatedAt === null
      ? 0
      : ((REFRESH_INTERVAL_SECONDS - secondsUntilRefresh) / REFRESH_INTERVAL_SECONDS) * 100;

  return (
    <div className="live-status-bar mb-4">
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
          <span className={`live-dot ${refreshing ? 'live-dot-active' : ''}`} aria-hidden />
          {source === 'mock' ? 'Preview' : 'Live'}
        </span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span className={refreshing ? 'live-text-pulse' : undefined}>
          {refreshing
            ? 'Pulling latest results…'
            : lastUpdatedAt
              ? `Updated ${formatLastUpdated(lastUpdatedAt)}`
              : 'Connecting…'}
        </span>
        {lastUpdatedAt !== null ? (
          <>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="tabular-nums">
              Next pull in{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {secondsUntilRefresh}s
              </span>
            </span>
          </>
        ) : null}
      </div>
      <div className="live-progress-track" aria-hidden>
        <div
          className={`live-progress-fill ${refreshing ? 'live-progress-indeterminate' : ''}`}
          style={refreshing ? undefined : { width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
