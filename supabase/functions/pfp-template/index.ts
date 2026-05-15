/**
 * pfp-template v1.0 — Party Favor Photo Template Generator
 *
 * Uses MuAPI nano-banana-2 to generate custom photo booth strip templates.
 * JWT verification: disabled.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const MUAPI_KEY = Deno.env.get('MUAPI_API_KEY');

  try {
    const { action, prompt, event_name, event_date, style, aspect_ratio } = await req.json();

    if (!MUAPI_KEY) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'MUAPI_API_KEY not configured in Supabase secrets',
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── GENERATE TEMPLATE ─────────────────────────────────────
    if (action === 'generate' || action === 'generate_template') {
      // Build prompt from event details if not provided directly
      const finalPrompt = prompt || [
        `Photo booth strip template for ${event_name || 'event'}`,
        event_date ? `dated ${event_date}` : '',
        `${style || 'elegant celebration'} design`,
        '4 photo frames in vertical layout',
        'gold glitter background with decorative elements',
        'space for event name and date at top',
        'professional photo booth quality, print-ready',
        'no people, no faces, template only',
      ].filter(Boolean).join(', ');

      const genResult = await fetch('https://api.muapi.ai/api/v1/nano-banana-2', {
        method: 'POST',
        headers: {
          'x-api-key': MUAPI_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          aspect_ratio: aspect_ratio || '3:4',
        }),
      });

      const genData = await genResult.json();
      
      if (!genData.request_id) {
        return new Response(JSON.stringify({
          status: 'error',
          message: 'Failed to start generation',
          details: genData,
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Poll for completion (up to 30 seconds)
      const requestId = genData.request_id;
      let attempts = 0;
      let result;

      while (attempts < 20) {
        await new Promise(r => setTimeout(r, 3000));
        const pollResult = await fetch(
          `https://api.muapi.ai/api/v1/predictions/${requestId}/result`,
          { headers: { 'x-api-key': MUAPI_KEY } }
        );
        const pollData = await pollResult.json();

        if (pollData.status === 'completed') {
          result = pollData;
          break;
        }
        if (pollData.status === 'failed') {
          return new Response(JSON.stringify({
            status: 'error',
            message: 'Template generation failed',
            details: pollData,
          }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        attempts++;
      }

      if (!result) {
        return new Response(JSON.stringify({
          status: 'timeout',
          message: 'Generation is taking longer than expected',
          request_id: requestId,
          check_url: `https://api.muapi.ai/api/v1/predictions/${requestId}/result`,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({
        status: 'completed',
        prompt: finalPrompt,
        cost: genData.cost,
        image_url: result.outputs?.[0] || result.output,
        request_id: requestId,
        aspect_ratio: aspect_ratio || '3:4',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── LIST STYLES ───────────────────────────────────────────
    if (action === 'styles') {
      return new Response(JSON.stringify({
        status: 'ok',
        styles: [
          { id: 'elegant', name: 'Elegant Gold', description: 'Gold glitter with script typography' },
          { id: 'modern', name: 'Modern Minimal', description: 'Clean white with accent colors' },
          { id: 'graduation', name: 'Graduation Classic', description: 'School colors with cap and diploma motifs' },
          { id: 'confetti', name: 'Party Confetti', description: 'Colorful confetti celebration' },
          { id: 'wedding', name: 'Wedding Romance', description: 'Soft pastels with floral elements' },
          { id: 'corporate', name: 'Corporate Branded', description: 'Clean layout with logo placement' },
        ],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      status: 'error',
      message: 'Invalid action. Use: generate, generate_template, or styles',
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({
      status: 'error',
      message: err.message,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
