import { Env } from "../types";

type FilterValue = string | number | boolean;

type SupabaseResponse<T> = {
  data: T | null;
  error: string | null;
};

function getRestUrl(env: Env, table: string): string {
  return `${env.SUPABASE_URL}/rest/v1/${table}`;
}

function createHeaders(env: Env, extraHeaders?: Record<string, string>): Headers {
  return new Headers({
    "Content-Type": "application/json",
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    ...extraHeaders,
  });
}

function withFilters(
  env: Env,
  table: string,
  options?: {
    select?: string;
    filters?: Record<string, FilterValue>;
    limit?: number;
  }
): string {
  const url = new URL(getRestUrl(env, table));

  if (options?.select) {
    url.searchParams.set("select", options.select);
  }

  if (options?.limit) {
    url.searchParams.set("limit", String(options.limit));
  }

  if (options?.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      url.searchParams.set(key, `eq.${String(value)}`);
    }
  }

  return url.toString();
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { message?: string; error?: string };
    return body.message || body.error || `Supabase request failed with status ${response.status}`;
  } catch {
    return `Supabase request failed with status ${response.status}`;
  }
}

export async function selectMaybeSingle<T>(
  env: Env,
  table: string,
  select: string,
  filters: Record<string, FilterValue>
): Promise<SupabaseResponse<T>> {
  const response = await fetch(
    withFilters(env, table, { select, filters, limit: 1 }),
    { headers: createHeaders(env) }
  );

  if (!response.ok) {
    return { data: null, error: await parseError(response) };
  }

  const rows = await response.json() as T[];
  return { data: rows[0] ?? null, error: null };
}

export async function insertRow(
  env: Env,
  table: string,
  row: Record<string, unknown>
): Promise<SupabaseResponse<null>> {
  const response = await fetch(getRestUrl(env, table), {
    method: "POST",
    headers: createHeaders(env, { Prefer: "return=minimal" }),
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    return { data: null, error: await parseError(response) };
  }

  return { data: null, error: null };
}

export async function upsertRow(
  env: Env,
  table: string,
  row: Record<string, unknown>,
  onConflict: string
): Promise<SupabaseResponse<null>> {
  const url = new URL(getRestUrl(env, table));
  url.searchParams.set("on_conflict", onConflict);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: createHeaders(env, {
      Prefer: "resolution=merge-duplicates,return=minimal",
    }),
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    return { data: null, error: await parseError(response) };
  }

  return { data: null, error: null };
}

export async function updateRows(
  env: Env,
  table: string,
  row: Record<string, unknown>,
  filters: Record<string, FilterValue>
): Promise<SupabaseResponse<null>> {
  const response = await fetch(withFilters(env, table, { filters }), {
    method: "PATCH",
    headers: createHeaders(env, { Prefer: "return=minimal" }),
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    return { data: null, error: await parseError(response) };
  }

  return { data: null, error: null };
}

export async function deleteRows(
  env: Env,
  table: string,
  filters: Record<string, FilterValue>
): Promise<SupabaseResponse<null>> {
  const response = await fetch(withFilters(env, table, { filters }), {
    method: "DELETE",
    headers: createHeaders(env, { Prefer: "return=minimal" }),
  });

  if (!response.ok) {
    return { data: null, error: await parseError(response) };
  }

  return { data: null, error: null };
}
