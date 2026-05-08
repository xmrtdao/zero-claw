// ZeroClaw - check-vote
// Allows Eliza (or any agent) to query if a proposal is approved before acting.
// Returns ONLY the tally and status. Individual votes are not returned to agents.
// Usage: POST { "proposal_hash": "abc..." }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { proposal_hash } = await req.json()

    if (!proposal_hash) {
      return new Response(JSON.stringify({ error: 'Missing proposal_hash' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get proposal status only (agent does NOT see individual votes)
    const { data: proposal, error: propErr } = await supabase
      .from('proposals')
      .select('proposal_hash, status, yes_votes, no_votes, threshold, title')
      .eq('proposal_hash', proposal_hash)
      .maybeSingle()

    if (propErr) throw propErr
    if (!proposal) {
      return new Response(JSON.stringify({ success: false, error: 'Proposal not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const approved = proposal.status === 'APPROVED'
    const rejected = proposal.status === 'REJECTED'
    const can_execute = approved

    return new Response(JSON.stringify({
      success: true,
      proposal_hash,
      title: proposal.title,
      status: proposal.status,
      can_execute,
      tally: {
        yes: proposal.yes_votes,
        no: proposal.no_votes,
        threshold: proposal.threshold
      },
      // Agents never see WHO voted or HOW. Only the aggregate.
      privacy_preservation: 'Agent receives tally only. Voter identities hidden.'
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
