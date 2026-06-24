/**
 * Local smoke test for Supabase recently-added reads (mirrors
 * src/server/supabase-recently-added.ts).
 *
 * Uses the same host, table, headers, and PostgREST query as the Devvit server.
 * Key source: SUPABASE_SERVICE_ROLE_KEY env var (same value as devvit settings
 * `supabase-service-role-key` and AllCourt Pro's .env.local).
 *
 * Usage:
 *   npm run test:supabase
 *   npm run test:supabase -- --limit 5
 *   npm run test:supabase -- --ignore-max-age
 *   npm run test:supabase -- --env-file ../allcourtpro/.env.local
 *   SUPABASE_SERVICE_ROLE_KEY=... npm run test:supabase
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..');
const ALLCOURT_ENV = join(REPO_ROOT, '..', 'allcourtpro', '.env.local');

const SUPABASE_HOST = 'amspslqidldfolaborfi.supabase.co';
const SUPABASE_REST_BASE = `https://${SUPABASE_HOST}/rest/v1`;
const MATCHES_TABLE = 'tennis_results_matches';
const NEW_MATCH_MAX_AGE_MINUTES = 10;

type MatchRow = {
  event_key: string;
  line: string;
  match_date: string;
  match_time: string | null;
  first_seen_at: string;
};

function loadEnvFile(path: string, override = false): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function readFlag(argv: string[], names: string[]): string | undefined {
  for (const name of names) {
    const eq = `--${name}=`;
    const idx = argv.findIndex((arg) => arg === `--${name}` || arg.startsWith(eq));
    if (idx < 0) continue;
    const arg = argv[idx];
    if (arg.startsWith(eq)) return arg.slice(eq.length).trim() || undefined;
    return argv[idx + 1]?.trim() || undefined;
  }
  return undefined;
}

function hasFlag(argv: string[], ...names: string[]): boolean {
  return names.some((name) => argv.includes(`--${name}`));
}

function supabaseHeaders(key: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

function buildRecentlyAddedUrl(limit: number, ignoreMaxAge: boolean): string {
  const params = new URLSearchParams({
    select: 'event_key,line,match_date,match_time,first_seen_at',
    order: 'first_seen_at.desc',
    limit: String(limit),
  });
  const cutoffAt = ignoreMaxAge
    ? null
    : new Date(Date.now() - NEW_MATCH_MAX_AGE_MINUTES * 60_000).toISOString();
  if (cutoffAt) {
    params.append('first_seen_at', `gte.${cutoffAt}`);
  }
  return `${SUPABASE_REST_BASE}/${MATCHES_TABLE}?${params.toString()}`;
}

async function fetchRecentlyAdded(
  key: string,
  limit: number,
  ignoreMaxAge: boolean,
): Promise<void> {
  const queriedAt = new Date().toISOString();
  const cutoffAt = ignoreMaxAge
    ? null
    : new Date(Date.now() - NEW_MATCH_MAX_AGE_MINUTES * 60_000).toISOString();
  const url = buildRecentlyAddedUrl(limit, ignoreMaxAge);

  console.log('[test] GET (same as loadRecentlyAddedFromSupabase)', {
    host: SUPABASE_HOST,
    table: MATCHES_TABLE,
    limit,
    ignoreMaxAge,
    newMatchMaxAgeMinutes: NEW_MATCH_MAX_AGE_MINUTES,
    cutoffAt,
    queriedAt,
    url,
  });

  const res = await fetch(url, {
    headers: supabaseHeaders(key),
    signal: AbortSignal.timeout(30_000),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PostgREST returned HTTP ${res.status}: ${text}`);
  }

  const rows = JSON.parse(text) as MatchRow[];
  console.log('[test] Connection OK', {
    httpStatus: res.status,
    rowCount: rows.length,
    results: rows.map((m) => ({
      eventKey: m.event_key,
      line: m.line,
      date: m.match_date,
      time: m.match_time,
      detectedAt: m.first_seen_at,
    })),
  });

  if (!ignoreMaxAge && rows.length === 0) {
    console.log(
      '[test] No rows in the default window — re-run with --ignore-max-age to fetch without the 10-minute cutoff.',
    );
  }
}

async function main(): Promise<void> {
  loadEnvFile(join(REPO_ROOT, '.env'));
  loadEnvFile(ALLCOURT_ENV, true);

  const argv = process.argv.slice(2);
  const envFile = readFlag(argv, ['env-file']);
  if (envFile) {
    loadEnvFile(envFile, true);
  }

  const limitRaw = readFlag(argv, ['limit']);
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 10;
  if (!Number.isFinite(limit) || limit < 1) {
    console.error('--limit must be a positive integer');
    process.exit(1);
  }

  const ignoreMaxAge = hasFlag(argv, 'ignore-max-age', 'ignoreMaxAge');

  const key =
    readFlag(argv, ['key', 'service-role-key'])?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    '';

  if (!key) {
    console.error(
      [
        'Missing Supabase service role key.',
        'Set SUPABASE_SERVICE_ROLE_KEY (same as devvit `supabase-service-role-key` / AllCourt Pro .env.local), or pass --key.',
        'Example:',
        '  SUPABASE_SERVICE_ROLE_KEY=eyJ... npm run test:supabase',
        '  npm run test:supabase -- --env-file ../allcourtpro/.env.local',
      ].join('\n'),
    );
    process.exit(1);
  }

  console.log('[test] Using Supabase project', {
    host: SUPABASE_HOST,
    keyPreview: `${key.slice(0, 8)}…${key.slice(-4)} (${key.length} chars)`,
  });

  await fetchRecentlyAdded(key, limit, ignoreMaxAge);
}

main().catch((error: unknown) => {
  console.error('[test] Failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
