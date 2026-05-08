// ZeroClaw - tally-votes
// Tallies votes for a proposal and updates status if threshold met.
// Eliza calls this before executing any proposal.
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

    // Get proposal
    const { data: proposal, error: propErr } = await supabase
      .from('proposals')
      .select('*')
      .eq('proposal_hash', proposal_hash)
      .maybeSingle()

    if (propErr) throw propErr
    if (!proposal) {
      return new Response(JSON.stringify({ success: false, error: 'Proposal not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Tally votes
    const { data: votes, error: voteErr } = await supabase
      .from('votes')
      .select('vote')
      .eq('proposal_hash', proposal_hash)

    if (voteErr) throw voteErr

    const yes_votes = votes.filter(v => v.vote === 1).length
    const no_votes = votes.filter(v => v.vote === 0).length
    const total_votes = votes.length
    const unique_voters = new Set(votes.map(v => v.nullifier_hash)).size

    let status = proposal.status
    let approved = false

    if (proposal.status === 'PENDING_RATIFICATION') {
      if (yes_votes >= proposal.threshold) {
        status = 'APPROVED'
        approved = true
      } else if (no_votes >= proposal.threshold) {
        status = 'REJECTED'
      }

      // Update proposal if status changed
      if (status !== proposal.status) {
        const { error: updErr } = await supabase
          .from('proposals')
          .update({ status, yes_votes, no_votes, decided_at: new Date().toISOString() })
          .eq('proposal_hash', proposal_hash)
        if (updErr) throw updErr
      } else {
        // Just update counts
        const { error: cntErr } = await supabase
          .from('proposals')
          .update({ yes_votes, no_votes })
          .eq('proposal_hash', proposal_hash)
        if (cntErr) throw cntErr
      }
    }

    return new Response(JSON.stringify({
      success: true,
      proposal_hash,
      status,
      approved,
      tally: {
        yes: yes_votes,
        no: no_votes,
        total: total_votes,
        unique_voters,
        threshold: proposal.threshold
      },
      // Privacy note: in v1, individual votes are visible to the tally function.
      // In v2 ZK upgrade, only the tally is computed from proofs.
      privacy_level: 'v1-hash-commitment'
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
