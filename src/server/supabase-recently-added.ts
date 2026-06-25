import { settings } from '@devvit/web/server';
import type { RecentlyAddedResponse, RecentlyAddedResult } from '../shared/api';
import { enrichMatchWithComparison } from './enrich-recently-added';
import { mockRecentlyAddedResponse } from './mock-recently-added';
import { SUPABASE_REST_BASE } from './supabase-config';

const MATCHES_TABLE = 'tennis_results_matches';
const SERVICE_ROLE_KEY_SETTING = 'supabase-service-role-key';
const NEW_MATCH_MAX_AGE_MINUTES = 10;

const DOMAIN_PENDING_NOTICE = `amspslqidldfolaborfi.supabase.co is listed in devvit.json but pending Reddit approval. Using sample data until Developer Settings shows the domain as approved.`;
const MISSING_KEY_NOTICE =
  'Supabase service role key not set (run: devvit settings set supabase-service-role-key). Using sample data.';

async function supabaseServiceRoleKey(): Promise<string | null> {
  const fromSettings = await settings.get<string>(SERVICE_ROLE_KEY_SETTING);
  const fromEnv = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const key = (typeof fromSettings === 'string' ? fromSettings : fromEnv)?.trim();
  return key && key.length > 0 ? key : null;
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

type MatchRow = {
  event_key: string;
  line: string;
  match_date: string;
  match_time: string | null;
  first_seen_at: string;
};

export async function loadRecentlyAddedFromSupabase(
  limit: number,
  offset: number,
  ignoreMaxAge: boolean,
): Promise<RecentlyAddedResponse> {
  if (useMockOnly()) {
    return mockRecentlyAddedResponse(limit, offset);
  }

  const key = await supabaseServiceRoleKey();
  const queriedAt = new Date().toISOString();
  const cutoffAt = ignoreMaxAge
    ? null
    : new Date(Date.now() - NEW_MATCH_MAX_AGE_MINUTES * 60_000).toISOString();

  if (!key) {
    console.warn('[supabase] Service role key not set — returning mock recently-added data');
    const mock = mockRecentlyAddedResponse(limit, offset);
    return { ...mock, notice: MISSING_KEY_NOTICE };
  }

  const params = new URLSearchParams({
    select: 'event_key,line,match_date,match_time,first_seen_at',
    order: 'first_seen_at.desc',
    limit: String(limit),
    offset: String(offset),
  });
  if (cutoffAt) {
    params.append('first_seen_at', `gte.${cutoffAt}`);
  }

  const url = `${SUPABASE_REST_BASE}/${MATCHES_TABLE}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`PostgREST returned HTTP ${res.status}${text ? `: ${text}` : ''}`);
    }

    const rows = (await res.json()) as MatchRow[];
    const baseResults = (rows ?? []).map((match) => ({
      eventKey: match.event_key,
      line: match.line,
      date: match.match_date,
      time: match.match_time ?? null,
      detectedAt: match.first_seen_at,
    }));

    const results: RecentlyAddedResult[] = await Promise.all(
      baseResults.map((match) => enrichMatchWithComparison(match, key)),
    );

    return {
      type: 'recently-added',
      source: 'live',
      notice: null,
      queriedAt,
      newMatchMaxAgeMinutes: NEW_MATCH_MAX_AGE_MINUTES,
      cutoffAt,
      ageFilterApplied: !ignoreMaxAge,
      offset,
      hasMore: results.length === limit,
      results,
    };
  } catch (error) {
    if (isDomainNotAllowedError(error)) {
      console.warn('[supabase] HTTP fetch blocked — returning mock recently-added data');
      const mock = mockRecentlyAddedResponse(limit, offset);
      return { ...mock, notice: DOMAIN_PENDING_NOTICE };
    }
    throw error;
  }
}
