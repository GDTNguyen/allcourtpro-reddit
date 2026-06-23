import { showForm, showToast } from '@devvit/web/client';
import type { CreatePostFromResultResponse, RecentlyAddedResult } from '../../shared/api';

function isCreatePostResponse(value: unknown): value is CreatePostFromResultResponse {
  if (typeof value !== 'object' || value === null) return false;
  if (!('type' in value) || value.type !== 'post-created') return false;
  if (!('postId' in value) || typeof value.postId !== 'string') return false;
  return true;
}

function errorMessageFromPayload(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null;
  if (!('status' in value) || value.status !== 'error') return null;
  if (!('message' in value) || typeof value.message !== 'string') return null;
  return value.message;
}

/** Open a pre-filled form so the user can review and post a match thread. */
export async function draftMatchPost(result: RecentlyAddedResult): Promise<void> {
  const formResult = await showForm({
    title: 'Draft match post',
    description: 'Edit the title and body, then post to the subreddit.',
    acceptLabel: 'Post',
    cancelLabel: 'Cancel',
    fields: [
      {
        type: 'string',
        name: 'title',
        label: 'Title',
        defaultValue: result.line,
        required: true,
      },
      {
        type: 'paragraph',
        name: 'body',
        label: 'Body (markdown)',
        defaultValue: result.comparisonMarkdown ?? '',
      },
    ],
  });

  if (formResult.action !== 'SUBMITTED') {
    return;
  }

  const title =
    typeof formResult.values.title === 'string' ? formResult.values.title.trim() : '';
  if (!title) {
    showToast({ text: 'Title is required', appearance: 'neutral' });
    return;
  }

  const body = typeof formResult.values.body === 'string' ? formResult.values.body : '';

  try {
    const res = await fetch('/api/posts/from-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventKey: result.eventKey,
        title,
        text: body,
      }),
    });

    const data: unknown = await res.json();
    if (!res.ok) {
      throw new Error(errorMessageFromPayload(data) ?? `HTTP ${res.status}`);
    }

    const apiError = errorMessageFromPayload(data);
    if (apiError) {
      throw new Error(apiError);
    }

    if (!isCreatePostResponse(data)) {
      throw new Error('Unexpected response');
    }

    showToast({ text: 'Post created', appearance: 'success' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create post';
    showToast({ text: message, appearance: 'neutral' });
  }
}
