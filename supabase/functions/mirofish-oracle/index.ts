import { startUsageTracking } from '../_shared/functionUsageLogger.ts';

const FUNCTION_NAME = 'mirofish-oracle';
const REPLACEMENT_FUNCTION = 'executive-swarm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const usageTracker = startUsageTracking(FUNCTION_NAME, undefined, { method: req.method });

  try {
    let payload: Record<string, unknown> = {};
    if (req.method !== 'GET') {
      const text = await req.text();
      payload = text ? JSON.parse(text) : {};
    }

    await usageTracker.success({
      action: 'deprecated',
      replacement: REPLACEMENT_FUNCTION,
    });

    return new Response(
      JSON.stringify({
        success: true,
        function: FUNCTION_NAME,
        status: 'deprecated',
        replacement_function: REPLACEMENT_FUNCTION,
        message: 'mirofish-oracle has been replaced by executive-swarm for executive decision swarm analysis.',
        received_payload: payload,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await usageTracker.failure(message, 500);
    return new Response(
      JSON.stringify({
        error: message,
        function: FUNCTION_NAME,
        replacement_function: REPLACEMENT_FUNCTION,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
