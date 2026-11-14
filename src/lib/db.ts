import 'server-only';
import pg, { type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { databaseUrl, isDatabaseConfigured } from './config';

let pool: pg.Pool | undefined;
let warnedMock = false;

function mockResult<R extends QueryResultRow = QueryResultRow>(rows: R[] = []): QueryResult<R> {
  return { rows, rowCount: rows.length, command: 'SELECT', oid: 0, fields: [] };
}

function createMockClient(): PoolClient {
  return {
    query: async <R extends QueryResultRow = QueryResultRow>() => mockResult<R>([]),
    release: () => {},
  } as unknown as PoolClient;
}

function createMockPool(): pg.Pool {
  if (!warnedMock) {
    warnedMock = true;
    console.warn('[AI Studio] Database not connected — mock active');
  }
  const mockPool = {
    query: async <R extends QueryResultRow = QueryResultRow>() => mockResult<R>([]),
    connect: async () => createMockClient(),
    on: () => mockPool,
    end: async () => {},
  };
  return mockPool as unknown as pg.Pool;
}

export function database(): pg.Pool {
  if (!isDatabaseConfigured()) {
    return createMockPool();
  }
  if (!pool) {
    try {
      pool = new pg.Pool({ connectionString: databaseUrl(), max: 10, connectionTimeoutMillis: 4000, statement_timeout: 12000 });
      pool.on('error', () => console.warn('Local PostgreSQL connection closed.'));
    } catch {
      return createMockPool();
    }
  }
  return pool;
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>, consistentRead = false): Promise<T> {
  const client = await database().connect();
  try {
    await client.query(consistentRead ? 'begin isolation level repeatable read read only' : 'begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export function asUser<T>(userId: string, work: (client: PoolClient) => Promise<T>, consistentRead = false): Promise<T> {
  return transaction(async client => {
    await client.query('set local role authenticated');
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ]);
    return work(client);
  }, consistentRead);
}

export async function isConfigured(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  try {
    const { rows } = await database().query<{ configured: boolean }>('select tennis_runtime.is_configured() as configured');
    return Boolean(rows[0]?.configured);
  } catch (err) {
    console.warn('[AI Studio] Database offline in isConfigured — falling back to mock:', (err as Error).message);
    return false;
  }
}

export async function hasManagerAccess(userId: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  try {
    return await asUser(userId, async client => {
      const { rows } = await client.query<{ allowed: boolean }>(`
        select exists (select from public.organization_members
          where user_id=$1 and active and role in ('owner','admin')) as allowed
      `, [userId]);
      return Boolean(rows[0]?.allowed);
    });
  } catch {
    return false;
  }
}
