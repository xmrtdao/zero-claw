import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { startUsageTracking } from '../_shared/functionUsageLogger.ts';

const FUNCTION_NAME = 'propose-new-edge-function';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const usageTracker = startUsageTracking(FUNCTION_NAME, undefined, { method: req.method });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    const authHeader = req.headers.get('Authorization');
    let authenticatedUser: { id: string; email?: string } | null = null;
    if (authHeader && supabaseAnonKey) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user } } = await authClient.auth.getUser();
      if (user) {
        authenticatedUser = { id: user.id, email: user.email };
      }
    }

    const { 
      function_name,
      description,
      proposed_by, // CSO, CTO, CIO, CAO, or 'eliza' (optional for authenticated users)
      category,
      rationale,
      use_cases,
      implementation_outline,
      auto_vote // If true, automatically trigger executive voting
    } = await req.json();

    const resolvedProposedBy = proposed_by || authenticatedUser?.email || authenticatedUser?.id || null;

    // Validate required fields
    if (!function_name || !description || !resolvedProposedBy || !category || !rationale || !use_cases) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields', suggestion: 'Provide function_name, description, category, rationale, use_cases, and either proposed_by or an authenticated user context.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Status-aware duplicate check
    const { data: existing } = await supabase
      .from('edge_function_proposals')
      .select('id, status, voting_phase')
      .eq('function_name', function_name)
      .single();

    if (existing) {
      // Block if actively voting
      if (existing.status === 'voting') {
        console.log(`⚠️ Function "${function_name}" is currently in voting phase: ${existing.voting_phase}`);
        return new Response(
          JSON.stringify({ 
            error: 'Function is currently in active voting',
            existing_status: existing.status,
            existing_phase: existing.voting_phase,
            proposal_id: existing.id,
            suggestion: 'Wait for voting to complete or vote on the existing proposal using vote_on_function_proposal'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
        );
      }
      
      // Block if already approved
      if (existing.status === 'approved') {
        console.log(`✅ Function "${function_name}" is already approved`);
        return new Response(
          JSON.stringify({ 
            error: 'Function already approved and available',
            existing_status: 'approved',
            function_name,
            suggestion: `This function exists! Use invoke_edge_function("${function_name}", {...}) to call it directly.`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
        );
      }
      
      // Allow re-proposal for rejected functions
      if (existing.status === 'rejected') {
        console.log(`📋 Re-proposing previously rejected function: ${function_name}`);
        // Delete old rejected proposal to allow fresh start
        await supabase.from('edge_function_proposals').delete().eq('id', existing.id);
      }
    }

    // Create proposal
    const { data: proposal, error: insertError } = await supabase
      .from('edge_function_proposals')
      .insert({
        function_name,
        description,
        proposed_by: resolvedProposedBy,
        category,
        rationale,
        use_cases: Array.isArray(use_cases) ? use_cases : [use_cases],
        implementation_code: implementation_outline || null,
        status: 'voting'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`📋 Proposal created: ${proposal.id} by ${resolvedProposedBy}`);

    // Notify all executives via activity feed
    const executives = ['CSO', 'CTO', 'CIO', 'CAO', 'COO'];
    const notifications = executives.map(exec => ({
      type: 'function_proposal',
      title: `New Edge Function Proposed: ${function_name}`,
      description: `${resolvedProposedBy} proposes: ${description}`,
      data: {
        proposal_id: proposal.id,
        function_name,
        proposed_by: resolvedProposedBy,
        category
      }
    }));

    await supabase
      .from('activity_feed')
      .insert(notifications);

    // Auto-trigger executive voting (default: true for new proposals)
    const shouldAutoVote = auto_vote !== false;
    let votingResult = null;

    if (shouldAutoVote) {
      console.log('🗳️ Auto-triggering executive voting...');
      
      try {
        const { data: voteData, error: voteError } = await supabase.functions.invoke('request-executive-votes', {
          body: { proposal_id: proposal.id }
        });

        if (voteError) {
          console.error('⚠️ Auto-voting trigger failed:', voteError);
        } else {
          votingResult = voteData;
          console.log(`✅ Executive voting completed: ${voteData?.final_status || 'in progress'}`);
        }
      } catch (voteErr) {
        console.error('⚠️ Auto-voting error:', voteErr);
      }
    }

    await usageTracker.success({ proposal_id: proposal.id, function_name });

    return new Response(
      JSON.stringify({
        success: true,
        proposal_id: proposal.id,
        proposal,
        auto_voting_triggered: shouldAutoVote,
        voting_result: votingResult,
        message: shouldAutoVote 
          ? `Proposal submitted and executives are deliberating.${votingResult?.consensus_reached ? ` Consensus: ${votingResult.final_status}` : ''}`
          : `Proposal submitted. Awaiting votes from 5 executives (need 4/5 approval).`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201 
      }
    );

  } catch (error: unknown) {
    console.error('Proposal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await usageTracker.failure(errorMessage, 500);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
