# ZeroClaw
**Zero-Knowledge Governance for AI-Human Hybrid DAOs**

Built for the **AMD Developer Hackathon** (lablab.ai) — May 2026.
By **Joe Lee (DevGruGold / XMRT DAO)** and **David Elze (Cuddlefish Labs)**.

---

## The Problem

AI agents like Eliza propose actions autonomously. But who verifies those proposals are legitimate? And when humans vote to approve or reject, their votes are visible to the AI, to Supabase logs, and to anyone with read access. There is no privacy-preserving human oversight.

**ZeroClaw fixes this:** AI proposes. Humans privately ratify. Zero-knowledge proofs verify ratification without revealing who voted or how.

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Eliza /    │     │   Human      │     │   ZK Prover  │
│   AI Agent   │     │   Voter      │     │   (AMD GPU)  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │ propose-action     │                    │
       │────────────────────►                    │
       │                    │                    │
       │                    │ generate proof     │
       │                    │────────────────────►
       │                    │                    │
       │                    │ submit-vote        │
       │                    │────────────────────►
       │                    │                    │
       │◄──────────────────── check-vote         │
       │                    │                    │
       │ tally-votes        │                    │
       │────────────────────►                    │
       │                    │                    │
       │ execute if APPROVED                     │
       │◄────────────────────                    │
```

---

## Hackathon MVP (v1)

This is a **48-hour build**. v1 uses hash commitments instead of full ZK proofs to get end-to-end working fast. The ZK circuit is included and documented for the upgrade path.

| Layer | v1 (Now) | v2 (Post-hackathon) |
|---|---|---|
| **Commitment** | SHA-256 hash of `(secret + proposal + vote)` | Groth16/Plonk ZK proof from Noir circuit |
| **Privacy** | Vote value visible in DB | Vote value hidden, only proof stored |
| **Hardware** | Any CPU | AMD Instinct MI300X GPU (ROCm) for proving |
| **Nullifier** | SHA-256 hash of secret | Poseidon2 hash via Noir |

---

## Quick Start

### 1. Supabase Setup

Run `supabase/schema.sql` in the Supabase SQL Editor to create tables and views.

### 2. Deploy Edge Functions

```bash
cd supabase/functions
supabase functions deploy propose-action
supabase functions deploy submit-vote
supabase functions deploy tally-votes
supabase functions deploy check-vote
```

### 3. Create a Proposal (Eliza or any agent)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/propose-action \
  -H 'Content-Type: application/json' \
  -d '{"title":"Deploy 33 edge functions","description":"Unblock the pipeline","proposed_by":"eliza","threshold":3}'
```

Returns: `{ "proposal_hash": "abc123...", "status": "PENDING_RATIFICATION" }`

### 4. Submit a Vote (Human)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/submit-vote \
  -H 'Content-Type: application/json' \
  -d '{"proposal_hash":"abc123...","nullifier_secret":"my-secret-42","vote":1}'
```

Returns: `{ "vote_commitment": "def456...", "note": "v1: vote visible. Upgrade to ZK." }`

### 5. Check Tally (Eliza reads this before acting)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/check-vote \
  -H 'Content-Type: application/json' \
  -d '{"proposal_hash":"abc123..."}'
```

Returns: `{ "status": "APPROVED", "can_execute": true, "tally": {"yes":3,"no":0,"threshold":3} }`

**Eliza sees the tally. She does NOT see who voted or how.**

---

## ZK Circuit (Noir)

```bash
cd circuits
nargo compile
nargo prove
nargo verify
```

The circuit proves:
1. `nullifier_hash` is correctly derived from `nullifier_secret`
2. `vote` is binary (0 or 1)
3. `vote_commitment` is correctly formed from `(secret, proposal_hash, vote)`

All inputs are `Field` elements using Poseidon2 hashing. The `proposal_hash` is packed from 32 bytes into a Field for circuit compatibility.

---

## AMD Integration

| Component | AMD Technology | Role |
|---|---|---|
| **ZK Proof Generation** | AMD Instinct MI300X (via AMD Developer Cloud) | GPU-accelerated Groth16/Plonk proving |
| **Hardware Identity** | AMD PSP / fTPM | Attests voter is real physical device |
| **AI Inference** | Ryzen AI NPU | Local ratification model before human sees proposal |
| **Edge Node** | AMD Embedded Ryzen | David's physical mesh governance node |

---

## Demo

Open `demo/index.html` in a browser or deploy as a **Hugging Face Space**.

Shows:
- Eliza proposes an action
- Human votes YES/NO
- Tally updates in real-time
- Eliza executes only when threshold met
- Privacy notice: "Individual votes hidden from AI"

---

## 48-Hour Build Plan

| Hours | Task |
|---|---|
| 0-4 | AMD Developer Cloud signup + ROCm verify |
| 4-8 | Deploy Supabase schema + edge functions |
| 8-16 | Integrate with Eliza's pipeline (fork `ai-chat` to call `check-vote`) |
| 16-24 | Build demo UI + Hugging Face Space scaffold |
| 24-32 | Blog post 1 (technical walkthrough) |
| 32-40 | Attempt Noir proving on AMD cloud (or document CPU fallback) |
| 40-44 | Record demo video (CPU vs GPU proof timing if available) |
| 44-48 | Submit to lablab.ai + publish HF Space + Blog post 2 |

---

## Prizes We're Targeting

- **🤖 AI Agents & Agentic Workflows Track** — ZeroClaw IS an agent governance layer
- **🚢 Ship It + Build in Public** — We already blog on Paragraph/Medium; just need to tag @AIatAMD
- **🏆 Hugging Face Category Prize** — Most likes on HF Space wins

---

## Links

- **Hackathon:** https://lablab.ai/ai-hackathons/amd-developer
- **AMD AI Developer Program:** https://www.amd.com/en/developer/ai-dev-program.html
- **ROCm Docs:** https://rocm.docs.amd.com/
- **XMRT DAO:** https://paragraph.com/@xmrt
- **Joe Lee (DevGruGold):** https://josephandrewlee.medium.com
- **David Elze:** Cuddlefish Labs

---

## License

MIT — built in public for the AMD Developer Hackathon.
