import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function mapLegacyAction(action: string, params: Record<string, any> = {}): Record<string, any> {
  switch (action) {
    case 'list_tables':
    case 'view_schema':
      return { action: 'list_tables' };
    case 'view_table_details':
      return { action: 'get_table_schema', table_name: params.table_name };
    case 'create_index':
      return {
        action: 'manage_schema',
        schema_action: 'create',
        entity_type: 'index',
        definition: {
          index_name: params.index_name,
          table_name: params.table_name,
          columns: [params.column_name],
          method: params.index_type || 'btree',
        },
      };
    case 'vacuum_analyze':
      return { action: 'execute_sql', query: `VACUUM ANALYZE public.${params.table_name};`, allow_dangerous: true };
    default:
      return { action, ...params };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, params = {} } = await req.json();
    const payload = mapLegacyAction(action, params);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');

    const response = await fetch(`${supabaseUrl}/functions/v1/supabase-integration`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    return new Response(JSON.stringify({
      ...data,
      deprecated: true,
      message: 'schema-manager is deprecated. Please call supabase-integration directly.',
      forwarded_action: payload.action,
    }), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
