// ZeroClaw - propose-action
// Stores an AI agent proposal and returns a proposal_hash for voting
// Usage: POST { "title": "...", "description": "...", "proposed_by": "eliza", "threshold": 3 }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { title, description, proposed_by, threshold = 3, metadata = {} } = await req.json()

    if (!title || !proposed_by) {
      return new Response(JSON.stringify({ error: 'Missing title or proposed_by' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Generate deterministic proposal hash
    const proposal_text = JSON.stringify({ title, description, proposed_by, ts: Date.now() })
    const encoder = new TextEncoder()
    const data = encoder.encode(proposal_text)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const proposal_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const { data: row, error } = await supabase
      .from('proposals')
      .insert({
        title,
        description,
        proposed_by,
        proposal_hash,
        status: 'PENDING_RATIFICATION',
        threshold,
        yes_votes: 0,
        no_votes: 0,
        metadata
      })
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({
      success: true,
      proposal_id: row.id,
      proposal_hash,
      status: 'PENDING_RATIFICATION',
      threshold
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
