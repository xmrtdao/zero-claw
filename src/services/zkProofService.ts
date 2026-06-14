/**
 * ZK Proof Service for ZeroClaw Governance
 * 
 * Handles proof generation, verification, and submission
 * to the Supabase backend for tallying.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  generateVoteCommitments,
  generateVoterSecret,
  verifyVoteCommitment,
  computeVoterCommitment,
  type VoteCommitment,
} from '@/utils/zkVote';

export interface VotePayload {
  proposalId: string;
  voteChoice: 0 | 1; // 0 = reject, 1 = approve
}

export interface VoteResult {
  success: boolean;
  nullifier: string;
  voteCommitment: string;
  message?: string;
}

/**
 * Cast a vote with ZK proof
 */
export async function castVote(payload: VotePayload): Promise<VoteResult> {
  try {
    // 1. Get or generate voter secret
    let secret = localStorage.getItem('zc_voter_secret');
    if (!secret) {
      secret = generateVoterSecret();
      localStorage.setItem('zc_voter_secret', secret);
    }

    // 2. Generate commitments
    const commitments = generateVoteCommitments(
      secret,
      payload.proposalId,
      payload.voteChoice
    );

    // 3. Verify locally
    if (!verifyVoteCommitment(commitments, secret)) {
      return { success: false, nullifier: '', voteCommitment: '', message: 'Commitment verification failed' };
    }

    // 4. Submit to Supabase edge function
    const { data, error } = await supabase.functions.invoke('submit-vote', {
      body: {
        proposal_id: payload.proposalId,
        vote_choice: payload.voteChoice,
        nullifier: commitments.nullifier,
        vote_commitment: commitments.voteCommitment,
      },
    });

    if (error) throw error;

    return {
      success: true,
      nullifier: commitments.nullifier,
      voteCommitment: commitments.voteCommitment,
    };
  } catch (err: any) {
    console.error('[ZK Vote] Error:', err);
    return {
      success: false,
      nullifier: '',
      voteCommitment: '',
      message: err.message || 'Vote submission failed',
    };
  }
}

/**
 * Get current vote tally for a proposal
 */
export async function getVoteTally(proposalId: string): Promise<{
  approve: number;
  reject: number;
  threshold_met: boolean;
}> {
  const { data, error } = await supabase.functions.invoke('check-vote', {
    body: { proposal_id: proposalId },
  });

  if (error) throw error;

  return data || { approve: 0, reject: 0, threshold_met: false };
}

export { generateVoterSecret, verifyVoteCommitment, computeVoterCommitment };
export type { VoteCommitment };
