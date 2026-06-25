import {
  parseNameInitials,
  parseResultPlayers,
  primaryLastName,
  type ParsedResultPlayers,
} from './parse-result-players';
import { supabaseRestQuery } from './supabase-rest';

type Tour = ParsedResultPlayers['tour'];

const STATS_TABLE = 'charting_stats';
const MATCHES_TABLE = 'charting_matches';
const OVERVIEW_CATEGORY = 'Overview';
const TOTAL_ROW_LABEL = 'Total';
const MAX_MATCH_LOOKUP_ROWS = 4000;
const MAX_STAT_ROWS = 5000;

const OVERVIEW_METRIC_KEYS = [
  'serve_pts',
  'aces',
  'dfs',
  'first_in',
  'first_won',
  'second_in',
  'second_won',
  'bk_pts',
  'bp_saved',
  'return_pts',
  'return_pts_won',
  'winners',
  'unforced',
] as const;

type OverviewMetricKey = (typeof OVERVIEW_METRIC_KEYS)[number];

type Aggregate = Record<OverviewMetricKey, number> & { matches: number };

export type StatUnit = 'percent' | 'perMatch' | 'ratio' | 'count';
type StatDirection = 'higher' | 'lower' | 'neutral';

type StatDefinition = {
  key: string;
  label: string;
  unit: StatUnit;
  direction: StatDirection;
  value: (agg: Aggregate) => number | null;
};

export type ChartingPlayer = {
  abbrev: string;
  fullName: string;
  matches: number;
};

export type ChartingStatRow = {
  key: string;
  label: string;
  unit: StatUnit;
  a: number | null;
  b: number | null;
  aDisplay: string;
  bDisplay: string;
  leader: 'a' | 'b' | 'tie' | null;
};

export type ChartingFact = {
  statKey: string;
  label: string;
  leaderName: string;
  leaderDisplay: string;
  trailDisplay: string;
};

export type ChartingComparison = {
  tour: Tour;
  playerA: ChartingPlayer;
  playerB: ChartingPlayer;
  rows: ChartingStatRow[];
  facts: ChartingFact[];
};

type StatRecord = { player: string; match_id: string; metrics: Record<string, unknown> | null };

const STAT_DEFINITIONS: StatDefinition[] = [
  {
    key: 'matches',
    label: 'Matches charted',
    unit: 'count',
    direction: 'neutral',
    value: (aggregate) => aggregate.matches,
  },
  {
    key: 'aces_per_match',
    label: 'Aces / match',
    unit: 'perMatch',
    direction: 'higher',
    value: (aggregate) => (aggregate.matches ? aggregate.aces / aggregate.matches : null),
  },
  {
    key: 'dfs_per_match',
    label: 'Double faults / match',
    unit: 'perMatch',
    direction: 'lower',
    value: (aggregate) => (aggregate.matches ? aggregate.dfs / aggregate.matches : null),
  },
  {
    key: 'first_in_pct',
    label: '1st serve in %',
    unit: 'percent',
    direction: 'higher',
    value: (aggregate) =>
      aggregate.serve_pts ? (aggregate.first_in / aggregate.serve_pts) * 100 : null,
  },
  {
    key: 'first_won_pct',
    label: '1st serve won %',
    unit: 'percent',
    direction: 'higher',
    value: (aggregate) => (aggregate.first_in ? (aggregate.first_won / aggregate.first_in) * 100 : null),
  },
  {
    key: 'second_won_pct',
    label: '2nd serve won %',
    unit: 'percent',
    direction: 'higher',
    value: (aggregate) =>
      aggregate.second_in ? (aggregate.second_won / aggregate.second_in) * 100 : null,
  },
  {
    key: 'bp_saved_pct',
    label: 'Break points saved %',
    unit: 'percent',
    direction: 'higher',
    value: (aggregate) => (aggregate.bk_pts ? (aggregate.bp_saved / aggregate.bk_pts) * 100 : null),
  },
  {
    key: 'return_won_pct',
    label: 'Return points won %',
    unit: 'percent',
    direction: 'higher',
    value: (aggregate) =>
      aggregate.return_pts ? (aggregate.return_pts_won / aggregate.return_pts) * 100 : null,
  },
  {
    key: 'winners_per_match',
    label: 'Winners / match',
    unit: 'perMatch',
    direction: 'higher',
    value: (aggregate) => (aggregate.matches ? aggregate.winners / aggregate.matches : null),
  },
  {
    key: 'unforced_per_match',
    label: 'Unforced errors / match',
    unit: 'perMatch',
    direction: 'lower',
    value: (aggregate) => (aggregate.matches ? aggregate.unforced / aggregate.matches : null),
  },
  {
    key: 'winner_ue_ratio',
    label: 'Winners : unforced ratio',
    unit: 'ratio',
    direction: 'higher',
    value: (aggregate) => (aggregate.unforced ? aggregate.winners / aggregate.unforced : null),
  },
];

function emptyAggregate(): Aggregate {
  const aggregate = { matches: 0 } as Aggregate;
  for (const key of OVERVIEW_METRIC_KEYS) aggregate[key] = 0;
  return aggregate;
}

function toNumber(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function nameMatchesAbbrev(fullName: string, abbrev: string): boolean {
  const targetLast = normalizeToken(primaryLastName(abbrev));
  if (!targetLast) return false;

  const parts = fullName.replace(/\s+/g, ' ').trim().split(' ');
  const candidateLast = parts[parts.length - 1] ?? '';
  if (normalizeToken(candidateLast) !== targetLast) return false;

  const initials = parseNameInitials(abbrev);
  if (initials.length === 0) {
    const abbrevTokens = abbrev.replace(/\./g, ' ').trim().split(/\s+/).filter(Boolean);
    if (abbrevTokens.length <= 1) return true;
    return normalizeToken(abbrevTokens.join('')) === normalizeToken(parts.join(''));
  }

  const firstNames = parts.slice(0, -1);
  if (firstNames.length === 0) return initials.length === 1;
  if (firstNames.length === 1) {
    const firstName = firstNames[0];
    const initial = initials[0];
    return firstName != null && initial != null && firstName.toUpperCase().startsWith(initial);
  }
  return initials.every((initial, index) => {
    const firstName = firstNames[index];
    return firstName != null && firstName.toUpperCase().startsWith(initial);
  });
}

function surnameNeedle(abbrev: string): string {
  return primaryLastName(abbrev).replace(/[^A-Za-z\u00C0-\u024F\s-]/g, '').trim();
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function resolvePlayerMatches(
  abbrev: string,
  tour: Tour,
  supabaseKey: string,
): Promise<{ fullName: string; matchIds: string[] } | null> {
  const needle = surnameNeedle(abbrev);
  if (!needle) return null;

  const pattern = `%${needle}%`;
  const [byPlayer1, byPlayer2] = await Promise.all([
    supabaseRestQuery<{ player_1: string; match_id: string }>(supabaseKey, MATCHES_TABLE, {
      select: 'match_id, player_1',
      filters: [
        { type: 'eq', column: 'tour', value: tour },
        { type: 'ilike', column: 'player_1', value: pattern },
      ],
      limit: MAX_MATCH_LOOKUP_ROWS,
    }),
    supabaseRestQuery<{ player_2: string; match_id: string }>(supabaseKey, MATCHES_TABLE, {
      select: 'match_id, player_2',
      filters: [
        { type: 'eq', column: 'tour', value: tour },
        { type: 'ilike', column: 'player_2', value: pattern },
      ],
      limit: MAX_MATCH_LOOKUP_ROWS,
    }),
  ]);

  const byName = new Map<string, Set<string>>();
  const add = (name: string | undefined, matchId: string | undefined) => {
    if (!name || !matchId || !nameMatchesAbbrev(name, abbrev)) return;
    const ids = byName.get(name) ?? new Set<string>();
    ids.add(matchId);
    byName.set(name, ids);
  };

  for (const row of byPlayer1) add(row.player_1, row.match_id);
  for (const row of byPlayer2) add(row.player_2, row.match_id);

  if (byName.size === 0) return null;

  let bestName = '';
  let bestIds: Set<string> | null = null;
  for (const [name, ids] of byName) {
    if (!bestIds || ids.size > bestIds.size) {
      bestName = name;
      bestIds = ids;
    }
  }

  return { fullName: bestName, matchIds: [...(bestIds ?? [])] };
}

async function aggregateOverviewByMatchIds(
  fullName: string,
  matchIds: string[],
  supabaseKey: string,
): Promise<Aggregate> {
  const batches = await Promise.all(
    chunk(matchIds, 50).map((ids) =>
      supabaseRestQuery<StatRecord>(supabaseKey, STATS_TABLE, {
        select: 'player, match_id, metrics',
        filters: [
          { type: 'eq', column: 'category', value: OVERVIEW_CATEGORY },
          { type: 'eq', column: 'row_label', value: TOTAL_ROW_LABEL },
          { type: 'in', column: 'match_id', values: ids },
        ],
        limit: MAX_STAT_ROWS,
      }),
    ),
  );

  const aggregate = emptyAggregate();
  const seenMatches = new Set<string>();
  for (const rows of batches) {
    for (const row of rows) {
      if (row.player !== fullName) continue;
      if (row.match_id) {
        if (seenMatches.has(row.match_id)) continue;
        seenMatches.add(row.match_id);
      }
      aggregate.matches += 1;
      const metrics = row.metrics ?? {};
      for (const key of OVERVIEW_METRIC_KEYS) aggregate[key] += toNumber(metrics[key]);
    }
  }

  return aggregate;
}

async function resolveAndAggregate(
  abbrev: string,
  tour: Tour,
  supabaseKey: string,
): Promise<{ fullName: string; agg: Aggregate } | null> {
  const resolved = await resolvePlayerMatches(abbrev, tour, supabaseKey);
  if (!resolved || resolved.matchIds.length === 0) return null;

  const aggregate = await aggregateOverviewByMatchIds(
    resolved.fullName,
    resolved.matchIds,
    supabaseKey,
  );
  if (aggregate.matches === 0) return null;

  return { fullName: resolved.fullName, agg: aggregate };
}

function formatValue(value: number | null, unit: StatUnit): string {
  if (value == null) return '—';
  switch (unit) {
    case 'percent':
      return `${Math.round(value)}%`;
    case 'perMatch':
      return value.toFixed(1);
    case 'ratio':
      return value.toFixed(2);
    case 'count':
      return String(Math.round(value));
  }
}

function leaderFor(
  a: number | null,
  b: number | null,
  direction: StatDirection,
): ChartingStatRow['leader'] {
  if (direction === 'neutral' || a == null || b == null) return null;
  if (a === b) return 'tie';
  const aWins = direction === 'higher' ? a > b : a < b;
  return aWins ? 'a' : 'b';
}

function buildRows(aggA: Aggregate, aggB: Aggregate): ChartingStatRow[] {
  return STAT_DEFINITIONS.map((definition) => {
    const a = definition.value(aggA);
    const b = definition.value(aggB);
    return {
      key: definition.key,
      label: definition.label,
      unit: definition.unit,
      a,
      b,
      aDisplay: formatValue(a, definition.unit),
      bDisplay: formatValue(b, definition.unit),
      leader: leaderFor(a, b, definition.direction),
    };
  });
}

function scoreRow(
  row: ChartingStatRow,
  leaderPlayer: ChartingPlayer,
): { score: number; fact: ChartingFact } | null {
  const a = row.a as number;
  const b = row.b as number;
  const avg = (Math.abs(a) + Math.abs(b)) / 2;
  if (avg === 0) return null;
  const score = Math.abs(a - b) / avg;
  const leaderDisplay = row.leader === 'a' ? row.aDisplay : row.bDisplay;
  const trailDisplay = row.leader === 'a' ? row.bDisplay : row.aDisplay;
  return {
    score,
    fact: {
      statKey: row.key,
      label: row.label,
      leaderName: leaderPlayer.fullName,
      leaderDisplay,
      trailDisplay,
    },
  };
}

function buildFacts(
  rows: ChartingStatRow[],
  playerA: ChartingPlayer,
  playerB: ChartingPlayer,
  limit = 4,
): ChartingFact[] {
  const scored = rows
    .filter((row) => row.unit !== 'count' && row.a != null && row.b != null && row.leader === 'a')
    .map((row) => scoreRow(row, playerA))
    .concat(
      rows
        .filter((row) => row.unit !== 'count' && row.a != null && row.b != null && row.leader === 'b')
        .map((row) => scoreRow(row, playerB)),
    )
    .filter((entry): entry is { score: number; fact: ChartingFact } => entry !== null);

  scored.sort((left, right) => right.score - left.score);
  return scored.slice(0, limit).map((entry) => entry.fact);
}

export async function buildChartingComparison(
  parsed: ParsedResultPlayers,
  supabaseKey: string,
): Promise<ChartingComparison> {
  if (parsed.isDoubles) {
    throw new Error('Charting comparison is only available for singles matches.');
  }

  const [resolvedA, resolvedB] = await Promise.all([
    resolveAndAggregate(parsed.winner, parsed.tour, supabaseKey),
    resolveAndAggregate(parsed.loser, parsed.tour, supabaseKey),
  ]);

  if (!resolvedA) throw new Error(`No charting data found for ${parsed.winner}.`);
  if (!resolvedB) throw new Error(`No charting data found for ${parsed.loser}.`);

  const playerA: ChartingPlayer = {
    abbrev: parsed.winner,
    fullName: resolvedA.fullName,
    matches: resolvedA.agg.matches,
  };
  const playerB: ChartingPlayer = {
    abbrev: parsed.loser,
    fullName: resolvedB.fullName,
    matches: resolvedB.agg.matches,
  };

  const rows = buildRows(resolvedA.agg, resolvedB.agg);
  const facts = buildFacts(rows, playerA, playerB);

  return { tour: parsed.tour, playerA, playerB, rows, facts };
}

export async function buildChartingComparisonForLine(
  line: string,
  supabaseKey: string,
): Promise<ChartingComparison | null> {
  const parsed = parseResultPlayers(line);
  if (!parsed) return null;
  try {
    return await buildChartingComparison(parsed, supabaseKey);
  } catch {
    return null;
  }
}
