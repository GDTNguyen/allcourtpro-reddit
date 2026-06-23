import { context, redis, reddit } from '@devvit/web/server';
import type { RecentlyAddedResult } from '../../shared/api';
import { loadAllCourtRecentlyAdded } from '../allcourt-recently-added';

const DEFAULT_FLAIR_ID = 'daf89c46-6b1d-11f1-aaa5-b2e19f196212';
const REDIS_POSTED_PREFIX = 'tennis:posted:';
const REDDIT_TITLE_MAX = 300;

export type SyncRecentMatchPostsResult = {
  source: 'live' | 'mock';
  fetched: number;
  pending: number;
  posted: number;
  skippedAlreadyPosted: number;
  errors: string[];
};

function postFlairId(): string {
  return process.env.TENNIS_POST_FLAIR_ID?.trim() || DEFAULT_FLAIR_ID;
}

function postsDisabled(): boolean {
  const raw = process.env.TENNIS_POSTS_DISABLED?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

function redditTitle(line: string): string {
  const title = line.trim();
  if (title.length <= REDDIT_TITLE_MAX) return title;
  return `${title.slice(0, REDDIT_TITLE_MAX - 1)}…`;
}

async function isAlreadyPosted(eventKey: string): Promise<boolean> {
  const existing = await redis.get(`${REDIS_POSTED_PREFIX}${eventKey}`);
  return existing != null;
}

async function markPosted(eventKey: string, postId: string): Promise<void> {
  await redis.set(`${REDIS_POSTED_PREFIX}${eventKey}`, postId);
}

async function postMatchResult(
  result: RecentlyAddedResult,
  subredditName: string
): Promise<string> {
  const post = await reddit.submitPost({
    subredditName,
    title: redditTitle(result.line),
    text: result.comparisonMarkdown ?? '',
    flairId: postFlairId(),
  });
  return post.id;
}

/** Poll recently-added matches and submit Reddit posts for ones we have not posted yet. */
export async function syncRecentMatchPosts(limit = 50): Promise<SyncRecentMatchPostsResult> {
  const outcome: SyncRecentMatchPostsResult = {
    source: 'live',
    fetched: 0,
    pending: 0,
    posted: 0,
    skippedAlreadyPosted: 0,
    errors: [],
  };

  if (postsDisabled()) {
    outcome.errors.push('TENNIS_POSTS_DISABLED is set');
    return outcome;
  }

  const payload = await loadAllCourtRecentlyAdded(limit, false);
  outcome.source = payload.source;
  outcome.fetched = payload.results.length;

  if (payload.source === 'mock') {
    outcome.errors.push(
      'Skipped posting — AllCourt API unavailable (using sample data until domain is approved)'
    );
    return outcome;
  }

  const subredditName = context.subredditName;
  if (!subredditName) {
    outcome.errors.push('subredditName missing from Devvit context');
    return outcome;
  }

  for (const result of payload.results) {
    if (await isAlreadyPosted(result.eventKey)) {
      outcome.skippedAlreadyPosted++;
      continue;
    }

    outcome.pending++;

    try {
      const postId = await postMatchResult(result, subredditName);
      await markPosted(result.eventKey, postId);
      outcome.posted++;
      console.log(`[tennis-posts] Posted ${result.eventKey} → ${postId}: ${result.line}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      outcome.errors.push(`${result.eventKey}: ${message}`);
      console.error(`[tennis-posts] Failed ${result.eventKey}:`, err);
    }
  }

  return outcome;
}
