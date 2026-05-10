"""
ZeroClaw — Hugging Face Space Demo
Zero-Knowledge Governance for AI-Human Hybrid DAOs
Built for AMD Developer Hackathon 2026
"""

import gradio as gr
import hashlib
import random
import time

# In-memory demo state (HF Spaces are single-session per user)
proposals_db = {}
votes_db = {}

SYSTEM_PROMPT = """You are ZeroClaw, a zero-knowledge governance assistant.
Proposals must pass human ratification via private votes before execution.
Individual votes are hidden from you. You only see aggregate tallies."""

def hash_b64(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()[:16]

def propose_action(title, description, threshold):
    """Eliza (AI agent) proposes an action."""
    ts = int(time.time())
    phash = hash_b64(f"{title}{description}{ts}{random.random()}")
    proposals_db[phash] = {
        "hash": phash,
        "title": title,
        "description": description,
        "threshold": threshold,
        "status": "PENDING_RATIFICATION",
        "created_at": ts,
        "votes": {"yes": 0, "no": 0}
    }
    return (
        f"Proposal created: `{phash}`",
        f"Status: PENDING_RATIFICATION\nThreshold: {threshold} votes required",
        list_proposals()
    )

def submit_vote(phash, voter_id, vote_choice, secret):
    """Human voter submits a private vote."""
    if phash not in proposals_db:
        return "Error: Proposal not found.", "", list_proposals()
    if proposals_db[phash]["status"] != "PENDING_RATIFICATION":
        return "Error: Voting is closed.", "", list_proposals()

    nullifier = hash_b64(f"{voter_id}:{phash}")
    commitment = hash_b64(f"{voter_id}:{secret}:{phash}:{vote_choice}")

    # Prevent double voting
    if nullifier in votes_db:
        return "Error: You already voted on this proposal.", f"Nullifier: {nullifier}", list_proposals()

    votes_db[nullifier] = {
        "proposal": phash,
        "commitment": commitment,
        "vote": vote_choice,
        "timestamp": int(time.time())
    }

    proposals_db[phash]["votes"]["yes" if vote_choice == "YES" else "no"] += 1

    return (
        f"Vote committed: `{commitment}`",
        f"Nullifier: `{nullifier}`\nVote hidden from AI.",
        list_proposals()
    )

def tally_votes(phash):
    """Aggregate tally — AI sees this, but NOT individual votes."""
    if phash not in proposals_db:
        return "Error: Proposal not found.", ""
    p = proposals_db[phash]
    yes_v = p["votes"]["yes"]
    no_v = p["votes"]["no"]
    total = yes_v + no_v
    threshold = p["threshold"]
    approved = yes_v >= threshold and yes_v > no_v

    if approved:
        p["status"] = "APPROVED"
    elif total >= threshold * 2 and no_v > yes_v:
        p["status"] = "REJECTED"

    result = f"""Proposal: {p['title']}
Status: {p['status']}
Yes: {yes_v}  |  No: {no_v}  |  Total: {total}
Threshold: {threshold}
Can execute: {approved}
"""
    # Agent view (what Eliza sees)
    agent_view = f"""Eliza Agent View:
- Status: {p['status']}
- Yes count: {yes_v}
- No count: {no_v}
- Threshold met: {approved}
⚠️ Eliza does NOT see: voter IDs, wallet addresses, vote values, or nullifiers.
"""
    return result, agent_view

def list_proposals():
    if not proposals_db:
        return "No proposals yet."
    lines = ["## Active Proposals\n"]
    for phash, p in proposals_db.items():
        lines.append(f"**{p['title']}** — `{phash}`")
        lines.append(f"Status: {p['status']} | Yes: {p['votes']['yes']} | No: {p['votes']['no']} | Threshold: {p['threshold']}")
        lines.append("")
    return "\n".join(lines)

with gr.Blocks(title="ZeroClaw — ZK Governance Demo") as demo:
    gr.Markdown("""
    # ZeroClaw
    ## Zero-Knowledge Governance for AI-Human Hybrid DAOs
    **AMD Developer Hackathon 2026 — Track 1: AI Agents & Agentic Workflows**

    AI proposes actions. Humans vote privately. AI sees only aggregates.
    This is a standalone demo; in production, votes are ZK-proofs on-chain.
    """)

    with gr.Tab("1. Propose Action (AI)"):
        gr.Markdown("Eliza or any AI agent proposes an action. This creates a hash-committed proposal.")
        title_in = gr.Textbox(label="Action Title", value="Deploy XMRT MeshNet Node — Seattle")
        desc_in = gr.Textbox(label="Description", lines=3, value="Expand decentralized mesh network with cjdns node on Raspberry Pi 5")
        thresh_in = gr.Slider(1, 10, value=3, step=1, label="Approval Threshold")
        prop_btn = gr.Button("Propose", variant="primary")
        prop_hash = gr.Textbox(label="Proposal Hash", lines=1)
        prop_status = gr.Textbox(label="Status", lines=2)
        prop_btn.click(propose_action, inputs=[title_in, desc_in, thresh_in], outputs=[prop_hash, prop_status, gr.State()])

    with gr.Tab("2. Submit Vote (Human)"):
        gr.Markdown("Humans vote with a nullifier + commitment. Their vote is hidden from the AI.")
        v_hash = gr.Textbox(label="Proposal Hash", placeholder="Paste proposal hash here...")
        v_id = gr.Textbox(label="Voter ID", value="alice")
        v_choice = gr.Radio(["YES", "NO"], value="YES", label="Vote")
        v_secret = gr.Textbox(label="Secret Salt", value="my-secret-42", type="password")
        vote_btn = gr.Button("Submit Vote", variant="primary")
        vote_out = gr.Textbox(label="Vote Commitment", lines=1)
        vote_null = gr.Textbox(label="Nullifier", lines=2)
        vote_btn.click(submit_vote, inputs=[v_hash, v_id, v_choice, v_secret], outputs=[vote_out, vote_null, gr.State()])

    with gr.Tab("3. Tally Votes (AI Gatekeeper)"):
        gr.Markdown("The AI queries the tally. It sees counts only — never who voted or how.")
        t_hash = gr.Textbox(label="Proposal Hash", placeholder="Paste proposal hash...")
        tally_btn = gr.Button("Tally", variant="primary")
        tally_out = gr.Textbox(label="Tally Result", lines=8)
        agent_out = gr.Textbox(label="What Eliza Sees", lines=6)
        tally_btn.click(tally_votes, inputs=[t_hash], outputs=[tally_out, agent_out])

    with gr.Tab("All Proposals"):
        refresh_btn = gr.Button("Refresh")
        all_props = gr.Markdown()
        refresh_btn.click(list_proposals, outputs=all_props)
        # Auto-load on tab open
        demo.load(list_proposals, outputs=all_props)

if __name__ == "__main__":
    demo.launch()
