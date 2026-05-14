// Cron Proxy: routes pg_cron -> target Edge Functions without DB-stored secrets
// Guidelines followed: Deno.serve, no bare specifiers, no external deps.

interface ProxyRequest {
  path: string;            // target function slug, e.g. "code-monitor-daemon"
  method?: string;         // default POST
  body?: unknown;          // optional JSON body
  headers?: Record<string, string>; // optional extra headers
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required env SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

console.info('cron-proxy started');

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Use POST' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    const payload = (await req.json().catch(() => ({}))) as ProxyRequest;
    const method = (payload.method || 'POST').toUpperCase();
    const path = (payload.path || '').replace(/^\/+|\/+$/g, '');

    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing required env' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      ...(payload.headers || {}),
    };

    const upstream = await fetch(url, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(payload.body ?? {}),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
    });
  } catch (e) {
    console.error('cron-proxy error', e);
    return new Response(JSON.stringify({ error: 'cron-proxy failure', detail: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});