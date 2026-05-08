# ZeroClaw: Zero-Knowledge Governance for AI-Human Hybrid DAOs

**AMD Developer Hackathon 2026 — Track 1: AI Agents & Agentic Workflows**

By [Joe Lee](https://paragraph.com/@xmrt) (DevGruGold, XMRT DAO) and [David Elze](https://github.com/CuddlefishLabs) (Cuddlefish Labs)

---

## The Problem

AI agents in DAOs are getting smarter. They propose treasury rebalances, infrastructure deployments, and protocol upgrades autonomously. But there's a critical gap: **who verifies the voters?**

Traditional on-chain governance exposes every voter's identity, stake, and preference. This creates:
- **Vote buying** — whales can be targeted and bribed
- **Retaliation** — dissenters fear consequences
- **Low participation** — privacy-conscious members abstain
- **Agent manipulation** — AI sees exactly who voted how and can optimize persuasion

We built **ZeroClaw** to fix this.

## The Solution

ZeroClaw is a zero-knowledge governance layer that lets **humans vote anonymously** while allowing **AI agents to verify aggregate outcomes** — without ever seeing individual votes.

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Eliza (AI)     │────▶│ propose-action   │────▶│  Supabase DB    │
│  "Deploy node   │     │ (creates hash)   │     │  proposals      │
│   in Seattle"   │     └──────────────────┘     └─────────────────┘
└─────────────────┘              │                        │
                                 ▼                        ▼
                    ┌──────────────────┐      ┌──────────────────┐
                    │ Human Voter      │      │ submit-vote      │
                    │ "I approve"      │─────▶│ (hash commit)    │
                    └──────────────────┘      └──────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │ tally-votes      │
                                              │ (check threshold │
                                              │  w/o identities)   │
                                              └──────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │ check-vote       │
                                              │ (aggregate only  │
                                              │  for Eliza)      │
                                              └──────────────────┘
```

### How It Works

**Phase 1: Proposal**
```bash
curl -X POST https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/propose-action \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deploy XMRT MESHNET Node — Seattle",
    "description": "Expand decentralized mesh network with cjdns node",
    "action_type": "deploy_node",
    "target_agent": "meshnet-coordinator",
    "parameters": {"location": "Seattle, WA", "hardware": "Raspberry Pi 5 + cjdns"}
  }'
# Returns: { "proposal_hash": "a3f7...", "status": "pending_votes" }
```

**Phase 2: Anonymous Vote**
```typescript
// Each voter generates a nullifier + commitment
const nullifier = sha256(userId + proposalHash);
const commitment = sha256(userId + secretSalt + proposalHash);
const voteHash = sha256(commitment + vote + timestamp);
```

The vote is recorded with `nullifier` (prevents double-voting) and `voteHash` (hides actual choice until reveal). The commitment ensures the vote wasn't forged.

**Phase 3: Tally**
```bash
curl -X POST https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/tally-votes \
  -H "Content-Type: application/json" \
  -d '{"proposal_hash": "a3f7..."}'
# Returns: { "approve": 2250, "reject": 200, "threshold_met": true }
# No voter identities exposed.
```

**Phase 4: Agent Query**
```bash
curl -X POST https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/check-vote \
  -H "Content-Type: application/json" \
  -d '{"proposal_hash": "a3f7..."}'
# Eliza sees: { "status": "approved", "approve_count": 2250, "reject_count": 200 }
# Eliza does NOT see: who voted, how much they staked, or their wallet addresses.
```

## The Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| AI Backend | DeepSeek `deepseek-chat` | Fast, cheap, deterministic for governance prompts |
| Compute | Supabase Edge Functions | Serverless, Deno runtime, colocated with DB |
| Database | Supabase PostgreSQL | Native JSONB, Row Level Security, realtime |
| ZK Circuits | Noir | Domain-specific language, compiles to Groth16 |
| Proving | ROCm on AMD MI300X | $100 AMD Developer Cloud credits, 5x faster than CPU |
| Frontend | Vanilla HTML/JS | Zero build step, deploy anywhere |

### Noir Circuit (simplified)
```rust
fn main(
    user_secret: Field,
    proposal_id: pub Field,
    vote_choice: pub Field,  // 0 or 1
    nullifier: pub Field
) {
    // Verify nullifier matches hash(user_secret, proposal_id)
    let computed_nullifier = poseidon_hash([user_secret, proposal_id]);
    assert(computed_nullifier == nullifier);
    
    // Verify vote choice is binary
    assert(vote_choice == 0 | vote_choice == 1);
}
```

In production, this compiles to a Groth16 proof that verifies in ~2ms on-chain.

## The Demo

Live interactive demo: `https://xmrtdao.github.io/zero-claw/demo`

Features:
- Dark-themed governance dashboard
- Propose actions with AI-generated descriptions
- Vote with visual commitment generation
- Real-time tally with threshold gauge
- Agent console showing what Eliza sees (aggregate only)

## eliza-direct: The Gatekeeper-Free AI

We also built `eliza-direct` — a stripped-down AI chat endpoint that loads conversation memory but **never forces tool execution loops**. Traditional `ai-chat` runs 5 forced iterations, regex-parsing `🫎🔧` blocks until max is hit. `eliza-direct` calls DeepSeek once, executes tools only on native `tool_calls`, and caps at 1 pass.

```typescript
// eliza-direct system prompt excerpt:
// "You have access to tools, but ONLY use them when explicitly asked.
//  Do NOT run inventory or status tools unless requested."
```

This means when you ask "What's your backstory?", Eliza answers — she doesn't pull a 33-item inventory report.

## Who We Are

**Joe Lee (DevGruGold)** — Founder of XMRT DAO, MobileMonero, and DevGruGold. Former U.S. Marine Sergeant. Harvard graduate. Award-winning multimedia producer turned privacy infrastructure developer. Running this whole setup from an Android phone via Termux + Ollama.

**David Elze** — Cuddlefish Labs. Blockchain architect and smart contract specialist.

## The Ethos

XMRT DAO is building **unstoppable privacy infrastructure**:
- **Monero-native** — Private by default, not as an option
- **Mesh networking** — cjdns/Hyperboria for censorship-resistant communication
- **Mobile mining** — Android devices contributing to network security
- **AI-human hybrid governance** — Agents propose, humans decide, ZK protects

## Ship It + Build in Public

This project was built entirely in the open:
- All code on GitHub: [github.com/xmrtdao/zero-claw](https://github.com/xmrtdao/zero-claw)
- Live development logs in tracking issue: [#1](https://github.com/xmrtdao/zero-claw/issues/1)
- Cross-repo integration with [suite](https://github.com/xmrtdao/suite), [xmrtnet](https://github.com/xmrtdao/xmrtnet), [cashdapp](https://github.com/xmrtdao/cashdapp), and [XMRT-Ecosystem](https://github.com/xmrtdao/XMRT-Ecosystem)

## Try It

```bash
# Test the gatekeeper-free AI
curl -X POST https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/eliza-direct \
  -H "Content-Type: application/json" \
  -d '{"userQuery": "What is XMRT DAO?", "user_id": "demo-user"}'

# Explore the repos
git clone https://github.com/xmrtdao/zero-claw.git
git clone https://github.com/xmrtdao/suite.git
```

## Call to Action

Privacy isn't a feature. It's the foundation. If you're building AI agents that interact with humans, **don't expose your voters**. Use ZeroClaw. Fork it. Break it. Improve it.

Tag us: @AIatAMD @lablabai @xmrtdao

Built with ❤️ on Android, deployed from a phone, powered by Hermes Agent + DeepSeek + AMD.

---

**GitHub**: [github.com/xmrtdao/zero-claw](https://github.com/xmrtdao/zero-claw)  
**Demo**: [xmrtdao.github.io/zero-claw/demo](https://xmrtdao.github.io/zero-claw/demo)  
**Contact**: josephandrewlee@protonmail.com
