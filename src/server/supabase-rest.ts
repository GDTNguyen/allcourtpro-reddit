import { SUPABASE_REST_BASE } from './supabase-config';

export type RestFilter =
  | { type: 'eq'; column: string; value: string }
  | { type: 'ilike'; column: string; value: string }
  | { type: 'in'; column: string; values: string[] };

export type RestQuery = {
  select: string;
  filters?: RestFilter[];
  order?: string;
  limit?: number;
};

function appendFilter(params: URLSearchParams, filter: RestFilter): void {
  switch (filter.type) {
    case 'eq':
      params.append(filter.column, `eq.${filter.value}`);
      break;
    case 'ilike':
      params.append(filter.column, `ilike.${filter.value}`);
      break;
    case 'in': {
      const values = filter.values.map((value) => encodeURIComponent(value)).join(',');
      params.append(filter.column, `in.(${values})`);
      break;
    }
  }
}

export async function supabaseRestQuery<T extends Record<string, unknown>>(
  key: string,
  table: string,
  query: RestQuery,
): Promise<T[]> {
  const params = new URLSearchParams({ select: query.select });
  for (const filter of query.filters ?? []) {
    appendFilter(params, filter);
  }
  if (query.order) {
    params.set('order', query.order);
  }
  if (query.limit != null) {
    params.set('limit', String(query.limit));
  }

  const url = `${SUPABASE_REST_BASE}/${table}?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PostgREST ${table} HTTP ${res.status}${text ? `: ${text}` : ''}`);
  }

  return (await res.json()) as T[];
}
