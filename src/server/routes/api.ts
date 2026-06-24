import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import { loadRecentlyAddedFromSupabase } from '../supabase-recently-added';
import { submitMatchPost } from '../core/match-post';
import type {
  ApiErrorResponse,
  CreatePostFromResultResponse,
  DecrementResponse,
  IncrementResponse,
  InitResponse,
} from '../../shared/api';

const REDIS_POSTED_PREFIX = 'tennis:posted:';

type ErrorResponse = ApiErrorResponse;

function parseLimit(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n < 1) return 10;
  return Math.min(n, 50);
}

export const api = new Hono();

api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    console.error('API Init Error: postId not found in devvit context');
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required but missing from context',
      },
      400
    );
  }

  try {
    const [count, username] = await Promise.all([
      redis.get('count'),
      reddit.getCurrentUsername(),
    ]);

    return c.json<InitResponse>({
      type: 'init',
      postId: postId,
      count: count ? parseInt(count) : 0,
      username: username ?? 'anonymous',
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = 'Unknown error during initialization';
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage },
      400
    );
  }
});

api.post('/increment', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', 1);
  return c.json<IncrementResponse>({
    count,
    postId,
    type: 'increment',
  });
});

api.post('/decrement', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', -1);
  return c.json<DecrementResponse>({
    count,
    postId,
    type: 'decrement',
  });
});

api.get('/recently-added', async (c) => {
  const limit = parseLimit(c.req.query('limit'));
  const ignoreMaxAge = c.req.query('ignoreMaxAge') === '1';

  try {
    const payload = await loadRecentlyAddedFromSupabase(limit, ignoreMaxAge);
    return c.json(payload);
  } catch (error) {
    console.error('[api/recently-added]', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load recent matches';
    return c.json<ErrorResponse>({ status: 'error', message }, 502);
  }
});

api.post('/posts/from-result', async (c) => {
  const { subredditName } = context;

  if (!subredditName) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'subredditName is required but missing from context' },
      400
    );
  }

  let body: { eventKey?: string; title?: string; text?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const eventKey = body.eventKey?.trim();
  const title = body.title?.trim();
  const text = typeof body.text === 'string' ? body.text : '';

  if (!eventKey || !title) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'eventKey and title are required' },
      400
    );
  }

  const existing = await redis.get(`${REDIS_POSTED_PREFIX}${eventKey}`);
  if (existing != null) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'A post for this match was already created' },
      409
    );
  }

  try {
    const post = await submitMatchPost({
      subredditName,
      title,
      text,
      runAs: 'USER',
    });
    await redis.set(`${REDIS_POSTED_PREFIX}${eventKey}`, post.id);
    return c.json<CreatePostFromResultResponse>({
      type: 'post-created',
      postId: post.id,
      eventKey,
    });
  } catch (error) {
    console.error('[api/posts/from-result]', error);
    const message = error instanceof Error ? error.message : 'Failed to create post';
    return c.json<ErrorResponse>({ status: 'error', message }, 502);
  }
});
