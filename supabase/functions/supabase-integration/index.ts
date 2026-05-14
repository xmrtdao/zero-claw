import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SchemaAction = 'create' | 'alter' | 'drop';
type EntityType = 'table' | 'index' | 'rls_policy';

function getProjectRef(): string {
  const ref = Deno.env.get('SUPABASE_PROJECT_REF');
  if (ref) return ref;

  const url = Deno.env.get('SUPABASE_URL') || '';
  const match = url.match(/https?:\/\/([^.]+)\./i);
  if (!match) throw new Error('Unable to resolve Supabase project ref. Set SUPABASE_PROJECT_REF env var.');
  return match[1];
}

function getMgmtHeaders(): HeadersInit {
  const token = Deno.env.get('SUPABASE_ACCESS_TOKEN') || Deno.env.get('SUPABASE_MANAGEMENT_TOKEN');
  if (!token) throw new Error('Missing SUPABASE_ACCESS_TOKEN (or SUPABASE_MANAGEMENT_TOKEN) for management actions.');

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function assertSqlSafety(query: string, allowDangerous = false) {
  const normalized = query.toLowerCase();
  const dangerous = ['drop ', 'truncate ', 'alter ', 'grant ', 'revoke ', 'create role', 'drop role'];

  if (!allowDangerous && dangerous.some((k) => normalized.includes(k))) {
    throw new Error('Dangerous SQL detected. Re-submit with allow_dangerous: true for DDL/security statements.');
  }
}

function assertSelectOnlyQuery(query: string) {
  const trimmed = query.trim();
  if (!trimmed) throw new Error('query is required');

  const firstToken = trimmed.split(/\s+/)[0]?.toLowerCase();
  if (firstToken !== 'select') {
    throw new Error('Only SELECT queries are allowed for this action');
  }
}

async function executeSql(query: string, params: unknown[] = [], allowDangerous = false) {
  if (!query?.trim()) throw new Error('query is required');
  assertSqlSafety(query, allowDangerous);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const rpc = await supabase.rpc('exec_sql' as never, { query, params } as never);
  if (!rpc.error) return { source: 'rpc.exec_sql', data: rpc.data };

  const projectRef = getProjectRef();
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: getMgmtHeaders(),
    body: JSON.stringify({ query }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`SQL execution failed via RPC and management API: ${rpc.error.message}; ${response.status} ${JSON.stringify(payload)}`);
  }

  return { source: 'management_api.database.query', data: payload };
}

function buildSchemaSql(action: SchemaAction, entityType: EntityType, definition: Record<string, any>): string {
  if (entityType === 'table') {
    const tableName = definition.table_name;
    if (!tableName) throw new Error('definition.table_name is required for table actions');

    if (action === 'create') {
      const columns = definition.columns;
      if (!Array.isArray(columns) || columns.length === 0) {
        throw new Error('definition.columns must be a non-empty array for table creation');
      }
      const cols = columns.map((c: any) => `${c.name} ${c.type}${c.constraints ? ` ${c.constraints}` : ''}`).join(', ');
      return `CREATE TABLE IF NOT EXISTS ${tableName} (${cols});`;
    }

    if (action === 'alter') {
      if (!definition.statement) throw new Error('definition.statement is required for alter table');
      return `ALTER TABLE ${tableName} ${definition.statement};`;
    }

    return `DROP TABLE IF EXISTS ${tableName}${definition.cascade ? ' CASCADE' : ''};`;
  }

  if (entityType === 'index') {
    const indexName = definition.index_name;
    const tableName = definition.table_name;

    if (action === 'create') {
      if (!indexName || !tableName || !definition.columns?.length) {
        throw new Error('index create requires definition.index_name, definition.table_name, and definition.columns[]');
      }
      const method = definition.method || 'btree';
      return `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} USING ${method} (${definition.columns.join(', ')});`;
    }

    if (action === 'drop') {
      if (!indexName) throw new Error('index drop requires definition.index_name');
      return `DROP INDEX IF EXISTS ${indexName};`;
    }

    throw new Error('index alter is not supported. Use action=create or drop.');
  }

  const policyName = definition.policy_name;
  const tableName = definition.table_name;

  if (action === 'drop') {
    if (!policyName || !tableName) throw new Error('rls_policy drop requires definition.policy_name and definition.table_name');
    return `DROP POLICY IF EXISTS ${policyName} ON ${tableName};`;
  }

  if (!policyName || !tableName || !definition.command || !definition.role || !definition.using) {
    throw new Error('rls policy requires policy_name, table_name, command, role, and using');
  }

  if (action === 'alter') {
    return `ALTER POLICY ${policyName} ON ${tableName} USING (${definition.using});`;
  }

  const withCheck = definition.with_check ? ` WITH CHECK (${definition.with_check})` : '';
  return `CREATE POLICY ${policyName} ON ${tableName} FOR ${definition.command} TO ${definition.role} USING (${definition.using})${withCheck};`;
}

async function callManagement(path: string, init?: RequestInit) {
  const projectRef = getProjectRef();
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}${path}`, {
    ...init,
    headers: {
      ...getMgmtHeaders(),
      ...(init?.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Management API error ${response.status} on ${path}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

const SUPPORTED_ACTIONS = [
  'execute_sql',
  'query',
  'exec_sql',
  'manage_schema',
  'deploy_edge_function',
  'list_edge_functions',
  'get_function_logs',
  'backup_database',
  'restore_database',
  'manage_secrets',
  'list_tables',
  'get_table_schema',
  'health',
  'list_actions',
] as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body?.action as string;

    if (!action) throw new Error('action is required');

    let result: unknown;

    switch (action) {
      case 'execute_sql': {
        result = await executeSql(body.query, body.params, body.allow_dangerous === true);
        break;
      }

      case 'query':
      case 'exec_sql': {
        if (!body.query) throw new Error('query is required');
        assertSelectOnlyQuery(body.query);
        result = await executeSql(body.query, body.params, false);
        break;
      }

      case 'health': {
        result = {
          status: 'ok',
          function: 'supabase-integration',
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'list_actions': {
        result = { actions: SUPPORTED_ACTIONS };
        break;
      }

      case 'manage_schema': {
        const sql = buildSchemaSql(body.schema_action, body.entity_type, body.definition || {});
        result = await executeSql(sql, [], true);
        break;
      }

      case 'deploy_edge_function': {
        if (!body.name || !body.code) throw new Error('name and code are required');
        result = await callManagement(`/functions/${body.name}/deploy`, {
          method: 'POST',
          body: JSON.stringify({
            entrypoint_path: 'index.ts',
            import_map: body.config?.import_map,
            verify_jwt: body.config?.verify_jwt ?? true,
            files: [
              { name: 'index.ts', content: body.code },
            ],
          }),
        });
        break;
      }

      case 'list_edge_functions': {
        result = await callManagement('/functions', { method: 'GET' });
        break;
      }

      case 'get_function_logs': {
        if (!body.function_name) throw new Error('function_name is required');
        const limit = Number(body.limit || 100);
        result = await callManagement(`/functions/${body.function_name}/logs?limit=${limit}`, { method: 'GET' });
        break;
      }

      case 'backup_database': {
        const strategy = body.strategy || 'full';
        result = await callManagement('/database/backups', {
          method: 'POST',
          body: JSON.stringify({ type: strategy }),
        });
        break;
      }

      case 'restore_database': {
        if (!body.backup_id) throw new Error('backup_id is required');
        result = await callManagement('/database/backups/restore', {
          method: 'POST',
          body: JSON.stringify({ backup_id: body.backup_id }),
        });
        break;
      }

      case 'manage_secrets': {
        const secretAction = body.secret_action;
        if (!body.key) throw new Error('key is required');

        if (secretAction === 'set') {
          if (typeof body.value !== 'string') throw new Error('value is required for set');
          result = await callManagement('/secrets', {
            method: 'POST',
            body: JSON.stringify([{ name: body.key, value: body.value }]),
          });
        } else if (secretAction === 'delete') {
          result = await callManagement(`/secrets/${body.key}`, { method: 'DELETE' });
        } else if (secretAction === 'get') {
          const secrets = await callManagement('/secrets', { method: 'GET' }) as Array<{ name: string }>;
          result = {
            key: body.key,
            exists: secrets.some((s) => s.name === body.key),
            message: 'Secret values are write-only and cannot be retrieved from Supabase Management API.',
          };
        } else {
          throw new Error('secret_action must be set | get | delete');
        }
        break;
      }

      case 'list_tables': {
        result = await executeSql(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`,
        );
        break;
      }

      case 'get_table_schema': {
        if (!body.table_name) throw new Error('table_name is required');
        result = await executeSql(
          `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position;`,
          [body.table_name],
        );
        break;
      }

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, action, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('supabase-integration error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
