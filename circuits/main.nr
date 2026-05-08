// Noir circuit for ZeroClaw
// Proves: I know a nullifier_secret, and I voted vote (0 or 1) on proposal_hash,
// without revealing the secret or the vote.
// 
// To compile: nargo compile
// To prove: nargo prove
// To verify: nargo verify

fn main(
    // PRIVATE INPUTS (known only to voter)
    nullifier_secret: Field,
    vote: u1, // 0 = no, 1 = yes
    
    // PUBLIC INPUTS (revealed to verifier)
    proposal_hash: pub [u8; 32], // 32-byte SHA-256 hash
    nullifier_hash: pub Field,   // Poseidon(nullifier_secret)
    vote_commitment: pub Field    // Poseidon(nullifier_secret, proposal_hash, vote)
) {
    // Constraint 1: nullifier_hash is correctly derived from nullifier_secret
    let computed_nullifier = poseidon2::Poseidon2::hash([nullifier_secret]);
    assert(computed_nullifier == nullifier_hash);

    // Constraint 2: vote is binary (0 or 1)
    // u1 type enforces this automatically in Noir

    // Constraint 3: vote_commitment is correctly formed
    // We encode proposal_hash as a single Field by interpreting first 16 bytes
    let proposal_field = bytes_to_field(proposal_hash);
    let computed_commitment = poseidon2::Poseidon2::hash([
        nullifier_secret,
        proposal_field,
        vote as Field
    ]);
    assert(computed_commitment == vote_commitment);
}

// Helper: convert first 16 bytes of a [u8;32] to a Field
// This is a simplification for hackathon. In production, use proper byte packing.
fn bytes_to_field(bytes: [u8; 32]) -> Field {
    let mut result: Field = 0;
    for i in 0..16 {
        result = result * 256 + (bytes[i] as Field);
    }
    result
}
