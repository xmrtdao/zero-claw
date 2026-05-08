// ZeroClaw - submit-vote
// Accepts a vote commitment. In hackathon v1, uses simple hash commitment.
// Upgrade path: swap commitment for ZK proof (Groth16/Plonk).
// Usage: POST { "proposal_hash": "abc...", "nullifier_secret": "secret123", "vote": 1 }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { proposal_hash, nullifier_secret, vote } = await req.json()

    if (!proposal_hash || !nullifier_secret || (vote !== 0 && vote !== 1)) {
      return new Response(JSON.stringify({
        error: 'Missing proposal_hash, nullifier_secret, or vote (0/1)'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Derive nullifier_hash from secret
    const encoder = new TextEncoder()
    const secretData = encoder.encode(nullifier_secret)
    const secretHash = await crypto.subtle.digest('SHA-256', secretData)
    const secretArray = Array.from(new Uint8Array(secretHash))
    const nullifier_hash = secretArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Derive commitment (in v1, hash of nullifier+proposal+vote)
    const commitData = encoder.encode(nullifier_secret + proposal_hash + vote)
    const commitHash = await crypto.subtle.digest('SHA-256', commitData)
    const commitArray = Array.from(new Uint8Array(commitHash))
    const vote_commitment = commitArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Check if nullifier already used for this proposal
    const { data: existing, error: checkErr } = await supabase
      .from('votes')
      .select('id')
      .eq('nullifier_hash', nullifier_hash)
      .eq('proposal_hash', proposal_hash)
      .maybeSingle()

    if (checkErr) throw checkErr
    if (existing) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Nullifier already used for this proposal (double-spend)'
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify proposal exists and is pending
    const { data: proposal, error: propErr } = await supabase
      .from('proposals')
      .select('id, status')
      .eq('proposal_hash', proposal_hash)
      .maybeSingle()

    if (propErr) throw propErr
    if (!proposal) {
      return new Response(JSON.stringify({ success: false, error: 'Proposal not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (proposal.status !== 'PENDING_RATIFICATION') {
      return new Response(JSON.stringify({ success: false, error: 'Proposal not open for voting' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Store vote
    const { data: voteRow, error: voteErr } = await supabase
      .from('votes')
      .insert({
        proposal_hash,
        nullifier_hash,
        vote_commitment,
        vote, // In v1, we store vote plaintext. ZK upgrade hides this.
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (voteErr) throw voteErr

    return new Response(JSON.stringify({
      success: true,
      vote_id: voteRow.id,
      nullifier_hash,
      vote_commitment,
      note: 'v1: vote is visible. Upgrade to ZK proof to hide vote value.'
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
