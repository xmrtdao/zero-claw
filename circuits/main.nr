use dep::std;

// Poseidon hash for commitments (using built-in poseidon)
fn hash_commitment(secret: Field, proposal_id: Field) -> Field {
    std::hash::poseidon::bn254::hash_2([secret, proposal_id])
}

fn hash_nullifier(secret: Field, proposal_id: Field) -> Field {
    std::hash::poseidon::bn254::hash_2([secret, proposal_id + 1])
}

fn hash_vote_commitment(vote_choice: Field, secret: Field, proposal_id: Field) -> Field {
    std::hash::poseidon::bn254::hash_3([vote_choice, secret, proposal_id])
}

// Main ZK voting circuit
// Proves: voter knows secret, vote is valid (0 or 1), generates unique nullifier
fn main(
    user_secret: Field,           // private: voter's secret key
    proposal_id: pub Field,       // public: which proposal being voted on
    vote_choice: pub Field,       // public: 0=reject, 1=approve
    nullifier: pub Field,         // public: unique nullifier (prevents double-vote)
    vote_commitment: pub Field,   // public: commitment to vote (for tallying)
    merkle_root: pub Field,       // public: root of eligible voters Merkle tree
    merkle_path: [Field; 10],     // private: Merkle path proving voter eligibility
    merkle_index: Field,          // private: index in Merkle tree
) {
    // 1. Verify vote choice is valid (0 or 1)
    assert(vote_choice == 0 | vote_choice == 1);

    // 2. Compute nullifier from secret + proposal_id
    let computed_nullifier = hash_nullifier(user_secret, proposal_id);
    assert(computed_nullifier == nullifier);

    // 3. Compute vote commitment
    let computed_vote_commitment = hash_vote_commitment(vote_choice, user_secret, proposal_id);
    assert(computed_vote_commitment == vote_commitment);

    // 4. Verify voter is in the eligible voters Merkle tree
    let voter_commitment = hash_commitment(user_secret, proposal_id);
    let computed_root = std::merkle::compute_merkle_root(voter_commitment, merkle_index, merkle_path);
    assert(computed_root == merkle_root);
}

// Constraint: Tally can only be computed when threshold is reached
// This is verified off-chain by tally-votes edge function
// The ZK proof only certifies that each individual vote is valid

#[test]
fn test_valid_approve_vote() {
    let secret = 12345;
    let proposal = 1;
    let choice = 1;
    let nf = hash_nullifier(secret, proposal);
    let vc = hash_vote_commitment(choice, secret, proposal);
    
    // Mock Merkle proof (in production, this comes from the voter registry)
    let path = [0; 10];
    let root = std::merkle::compute_merkle_root(
        hash_commitment(secret, proposal), 0, path
    );
    
    main(secret, proposal, choice, nf, vc, root, path, 0);
}

#[test]
fn test_valid_reject_vote() {
    let secret = 12345;
    let proposal = 1;
    let choice = 0;
    let nf = hash_nullifier(secret, proposal);
    let vc = hash_vote_commitment(choice, secret, proposal);
    
    let path = [0; 10];
    let root = std::merkle::compute_merkle_root(
        hash_commitment(secret, proposal), 0, path
    );
    
    main(secret, proposal, choice, nf, vc, root, path, 0);
}

#[test(should_fail)]
fn test_invalid_vote_choice() {
    let secret = 12345;
    let proposal = 1;
    let choice = 2; // Invalid: must be 0 or 1
    let nf = hash_nullifier(secret, proposal);
    let vc = hash_vote_commitment(choice, secret, proposal);
    
    let path = [0; 10];
    let root = std::merkle::compute_merkle_root(
        hash_commitment(secret, proposal), 0, path
    );
    
    main(secret, proposal, choice, nf, vc, root, path, 0);
}
