import type { RecentlyAddedResponse } from '../../shared/api';

export function DataSourceNotice({ data }: { data: RecentlyAddedResponse }) {
  if (!data.notice) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
      {data.source === 'mock' ? 'Sample data · ' : ''}
      {data.notice}
    </div>
  );
}
