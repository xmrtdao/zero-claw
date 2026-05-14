import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POOL_WALLET = "46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzSqxzDQtNLf2bsp2DX2qCCgC5mg";
const POOL_URL = "pool.supportxmr.com:3333";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_number } = await req.json();
    
    if (!user_number || user_number.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'user_number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const worker_id = `${POOL_WALLET}.${user_number}`;

    const config = {
      autosave: true,
      cpu: true,
      opencl: false,
      cuda: false,
      pools: [{
        url: POOL_URL,
        user: worker_id,
        pass: "xmrt-dao-mobile",
        keepalive: true,
        tls: false
      }],
      log: {
        level: 2
      },
      threads: null, // Auto-detect optimal threads
      background: false,
      donate: 1
    };

    return new Response(
      JSON.stringify(config, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Config generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
