import { useState } from 'react';
import { draftMatchPost } from '../lib/draft-match-post';
import type { RecentlyAddedResult } from '../../shared/api';

type DraftPostButtonProps = {
  result: RecentlyAddedResult;
  compact?: boolean;
};

export function DraftPostButton({ result, compact = false }: DraftPostButtonProps) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className={
        compact
          ? 'rounded-full border border-[#d93900]/40 px-2.5 py-0.5 text-xs font-medium text-[#d93900] transition-colors hover:bg-[#d93900]/10 disabled:opacity-50 dark:border-orange-500/40 dark:text-orange-400 dark:hover:bg-orange-500/10'
          : 'mt-3 rounded-full border border-[#d93900]/40 px-3 py-1.5 text-sm font-medium text-[#d93900] transition-colors hover:bg-[#d93900]/10 disabled:opacity-50 dark:border-orange-500/40 dark:text-orange-400 dark:hover:bg-orange-500/10'
      }
      onClick={() => {
        setBusy(true);
        void draftMatchPost(result).finally(() => {
          setBusy(false);
        });
      }}
    >
      {busy ? 'Opening…' : 'Draft post'}
    </button>
  );
}
