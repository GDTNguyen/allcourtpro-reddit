import { parseTournamentName, googleSearchUrl } from '../lib/parse-tournament-name';
import { navigateToNewTab } from '../lib/navigate-to-new-tab';
import type { RecentlyAddedResult } from '../../shared/api';

type GoogleTournamentSearchButtonProps = {
  result: RecentlyAddedResult;
  compact?: boolean;
};

const buttonClassName = {
  compact:
    'rounded-full border border-gray-300 px-2.5 py-0.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/60',
  default:
    'rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/60',
} as const;

export function GoogleTournamentSearchButton({
  result,
  compact = false,
}: GoogleTournamentSearchButtonProps) {
  const tournament = parseTournamentName(result.line);
  if (!tournament) return null;

  return (
    <button
      type="button"
      className={compact ? buttonClassName.compact : buttonClassName.default}
      onClick={() => navigateToNewTab(googleSearchUrl(tournament))}
    >
      Search tournament
    </button>
  );
}
