import { reddit } from '@devvit/web/server';

export const DEFAULT_FLAIR_ID = 'daf89c46-6b1d-11f1-aaa5-b2e19f196212';
export const REDDIT_TITLE_MAX = 300;

export function postFlairId(): string | undefined {
  const configured = process.env.TENNIS_POST_FLAIR_ID?.trim();
  if (configured === '') return undefined;
  return configured || DEFAULT_FLAIR_ID;
}

function isBadFlairError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('BAD_FLAIR_TEMPLATE_ID');
}

export function redditTitle(line: string): string {
  const title = line.trim();
  if (title.length <= REDDIT_TITLE_MAX) return title;
  return `${title.slice(0, REDDIT_TITLE_MAX - 1)}…`;
}

export async function submitMatchPost(options: {
  subredditName: string;
  title: string;
  text: string;
  runAs?: 'USER' | 'APP';
}) {
  const base = {
    subredditName: options.subredditName,
    title: redditTitle(options.title),
    text: options.text,
    runAs: options.runAs ?? 'APP',
  };

  const flairId = postFlairId();
  if (!flairId) {
    return reddit.submitPost(base);
  }

  try {
    return await reddit.submitPost({ ...base, flairId });
  } catch (err) {
    if (!isBadFlairError(err)) throw err;
    console.warn(
      `[match-post] Flair ${flairId} not found in r/${options.subredditName}, posting without flair`
    );
    return reddit.submitPost(base);
  }
}
