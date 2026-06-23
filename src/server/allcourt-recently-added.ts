import type { RecentlyAddedResponse } from '../shared/api';
import { mockRecentlyAddedResponse } from './mock-recently-added';

const DEFAULT_ALLCOURT_ORIGIN = 'https://www.allcourt.pro';

const DOMAIN_PENDING_NOTICE =
  'www.allcourt.pro is listed in devvit.json but pending Reddit approval. Using sample data until Developer Settings shows the domain as approved.';

function allcourtApiOrigin(): string {
  const raw = process.env.ALLCOURT_API_ORIGIN?.trim().replace(/\/$/, '');
  if (!raw) return DEFAULT_ALLCOURT_ORIGIN;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') {
      console.warn(
        `[allcourt] Ignoring non-HTTPS ALLCOURT_API_ORIGIN (${raw}); using ${DEFAULT_ALLCOURT_ORIGIN}`
      );
      return DEFAULT_ALLCOURT_ORIGIN;
    }
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      console.warn(
        `[allcourt] localhost is unreachable from Devvit; using ${DEFAULT_ALLCOURT_ORIGIN}`
      );
      return DEFAULT_ALLCOURT_ORIGIN;
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return DEFAULT_ALLCOURT_ORIGIN;
  }
}

function useMockOnly(): boolean {
  const raw = process.env.ALLCOURT_USE_MOCK?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

function isDomainNotAllowedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('PERMISSION_DENIED') ||
    message.includes('not allowed') ||
    message.includes('not allow-listed')
  );
}

export async function loadAllCourtRecentlyAdded(
  limit: number,
  ignoreMaxAge: boolean
): Promise<RecentlyAddedResponse> {
  if (useMockOnly()) {
    return mockRecentlyAddedResponse(limit);
  }

  const ignoreMaxAgeParam = ignoreMaxAge ? '1' : '0';
  const url = `${allcourtApiOrigin()}/api/tennis-results/recently-added?limit=${limit}&ignoreMaxAge=${ignoreMaxAgeParam}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      throw new Error(`AllCourt API returned HTTP ${res.status}`);
    }

    const payload = (await res.json()) as Omit<RecentlyAddedResponse, 'type' | 'source' | 'notice'>;
    return {
      type: 'recently-added',
      source: 'live',
      notice: null,
      queriedAt: payload.queriedAt,
      newMatchMaxAgeMinutes: payload.newMatchMaxAgeMinutes,
      cutoffAt: payload.cutoffAt,
      ageFilterApplied: payload.ageFilterApplied,
      results: payload.results ?? [],
    };
  } catch (error) {
    if (isDomainNotAllowedError(error)) {
      console.warn('[allcourt] HTTP fetch blocked — returning mock recently-added data');
      const mock = mockRecentlyAddedResponse(limit);
      return { ...mock, notice: DOMAIN_PENDING_NOTICE };
    }
    throw error;
  }
}
