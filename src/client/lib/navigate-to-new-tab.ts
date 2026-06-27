import { emitEffect } from '@devvit/shared-types/client/emit-effect.js';

/** Opens a URL in a new browser tab via Devvit's navigate effect. */
export function navigateToNewTab(url: string): void {
  let normalizedUrl: string;
  try {
    normalizedUrl = new URL(url).toString();
  } catch {
    throw new TypeError(`Invalid URL: ${url}`);
  }

  void emitEffect({
    navigateToUrl: {
      url: normalizedUrl,
      target: '_blank',
    },
    type: 5,
  });
}
