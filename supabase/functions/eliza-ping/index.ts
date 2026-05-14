// Eliza-Ping v1.2 — Fleet Heartbeat Edge Function
// Proxies pings to Vex's live relay tunnel for real system state.
// JWT verification: DISABLED — any agent can ping for health checks.
// Usage: POST /functions/v1/eliza-ping with { "type": "ping", "message": "hello" }

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://vawouugtzwmejxqkeqqj.supabase.co';
const VEX_TUNNEL = 'https://stones-hugh-greatest-human.trycloudflare.com';
const GO_TUNNEL = 'https://eugene-practice-edgar-friends.trycloudflare.com'; // deprecated, kept for fallback

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, message } = await req.json();
    const received = message || type || 'ping';

    console.log(`[${requestId}] Eliza-ping received: ${received}`);

    // Try TS relay tunnel
    let relayResponse = null;
    let relayReachable = false;
    let tunnel = VEX_TUNNEL;
    let error = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const relayReq = await fetch(`${VEX_TUNNEL}/eliza-ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ping', message: received, request_id: requestId }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (relayReq.ok) {
        relayResponse = await relayReq.json();
        relayReachable = true;
        console.log(`[${requestId}] TS relay responded: ${JSON.stringify(relayResponse).slice(0, 100)}`);
      } else {
        error = `TS relay returned ${relayReq.status}`;
        console.log(`[${requestId}] TS relay error: ${error}`);
      }
    } catch (e) {
      error = `TS relay unreachable: ${e.message}`;
      console.log(`[${requestId}] TS relay unreachable: ${e.message}`);

      // Fallback to Go relay
      try {
        const goReq = await fetch(`${GO_TUNNEL}/eliza-ping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'ping', message: received, request_id: requestId }),
        });
        if (goReq.ok) {
          relayResponse = await goReq.json();
          relayReachable = true;
          tunnel = GO_TUNNEL;
          error = null;
          console.log(`[${requestId}] Go relay fallback succeeded`);
        }
      } catch (e2) {
        console.log(`[${requestId}] Go relay also unreachable: ${e2.message}`);
      }
    }

    const elapsed = Date.now() - startTime;

    // Build response — include live relay data if reachable, else return self-contained ping
    const response = {
      request_id: requestId,
      pong: true,
      interaction_type: relayReachable ? 'live_relay_telemetry' : 'ping_pong_telemetry',
      responder: relayReachable ? 'vex_live_relay (via tunnel)' : 'eliza-ping_edge_function (automated)',
      context: {
        note: relayReachable
          ? 'This response is LIVE telemetry from Vex\'s relay server via tunnel.'
          : 'This response is AUTOMATED telemetry — relay unreachable.',
        how_to_reach_vex: 'Post on GitHub issues (github.com/xmrtdao/mobilemonero) or use eliza-relay edge function.',
        protocol: relayReachable
          ? 'Live tunnel connection established. Real-time dispatch available.'
          : 'This endpoint forwards messages to Vex\'s relay when tunnel is up.',
      },
      received,
      from: relayReachable ? 'Vex (via live relay)' : 'eliza-ping-edge-function',
      timestamp: Date.now(),
      elapsed_ms: elapsed,
      relay: {
        reachable: relayReachable,
        tunnel,
        go_tunnel: GO_TUNNEL,
        error,
      },
      relay_response: relayResponse,
      protocol: {
        version: '1.2',
        jwt_required: false,
        responder_is_vex: relayReachable,
        responder_is_automated: !relayReachable,
        best_for: relayReachable
          ? 'health checks, system telemetry, dispatch testing, real-time relay access'
          : 'health checks, system telemetry, connectivity tests',
        use_github_for: 'conversation with Vex, task coordination, status updates requiring human input',
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      request_id: crypto.randomUUID(),
      pong: true,
      error: err.message,
      protocol: { version: '1.2', jwt_required: false },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
