import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { syncRecentMatchPosts } from '../core/sync-recent-match-posts';

export const schedulerRoutes = new Hono();

schedulerRoutes.post('/sync-recent-matches', async (c) => {
  await c.req.json<TaskRequest>();

  const result = await syncRecentMatchPosts();
  console.log(
    `[scheduler/sync-recent-matches] source=${result.source} fetched=${result.fetched} posted=${result.posted} skipped=${result.skippedAlreadyPosted} pending=${result.pending}`,
  );

  if (result.errors.length > 0) {
    console.warn('[scheduler/sync-recent-matches]', result.errors.join('; '));
  }

  return c.json<TaskResponse>({ status: 'ok' });
});
