"""
ZeroClaw — Zero-Knowledge Governance for AI-Human Hybrid DAOs
AMD Developer Hackathon 2026 — AI Agents Track
"""
import gradio as gr
import hashlib
import random
import time

proposals_db = {}
votes_db = {}


def hash_b64(data):
    return hashlib.sha256(data.encode()).hexdigest()[:16]


def propose(title, desc, threshold):
    ts = int(time.time())
    phash = hash_b64(f"{title}{desc}{ts}{random.random()}")
    proposals_db[phash] = {
        "hash": phash,
        "title": title,
        "desc": desc,
        "threshold": threshold,
        "status": "PENDING",
        "yes": 0,
        "no": 0,
        "created": ts,
    }
    return (
        f"## Proposal Created\n\n**Hash:** `{phash}`\n**Title:** {title}\n**Threshold:** {threshold} votes",
        list_proposals()
    )


def vote(phash, voter, choice, secret):
    if phash not in proposals_db:
        return "Error: Proposal not found", list_proposals()
    p = proposals_db[phash]
    if p["status"] != "PENDING":
        return "Error: Voting closed", list_proposals()
    nid = hash_b64(f"{voter}:{phash}")
    if nid in votes_db:
        return "Error: Already voted", list_proposals()
    votes_db[nid] = True
    if choice == "YES":
        p["yes"] += 1
    else:
        p["no"] += 1

    # Auto-update status
    if p["yes"] >= p["threshold"] and p["yes"] > p["no"]:
        p["status"] = "APPROVED"
    elif (p["yes"] + p["no"]) >= p["threshold"] * 2 and p["no"] >= p["threshold"]:
        p["status"] = "REJECTED"

    return f"Vote committed. Nullifier: `{nid}`", list_proposals()


def tally(phash):
    if phash not in proposals_db:
        return "Error: Proposal not found", ""
    p = proposals_db[phash]
    total = p["yes"] + p["no"]
    pct_yes = p["yes"] / total * 100 if total else 0
    pct_no = p["no"] / total * 100 if total else 0

    result = f"""
## Tally Result

- **Status:** {p['status']}
- **Yes:** {p['yes']} ({pct_yes:.0f}%)
- **No:** {p['no']} ({pct_no:.0f}%)
- **Total:** {total}
- **Threshold:** {p['threshold']}
"""
    agent = f"""
**Eliza sees:** {p['status']} | Yes: {p['yes']} | No: {p['no']} | Threshold: {p['threshold']}
**Eliza does NOT see:** voter IDs, choices, secrets, or nullifiers.
"""
    return result, agent


def list_proposals():
    if not proposals_db:
        return "_No proposals yet._"
    lines = ["## Active Proposals\n"]
    for p in proposals_db.values():
        icon = "🟡" if p["status"] == "PENDING" else ("🟢" if p["status"] == "APPROVED" else "🔴")
        lines.append(f"{icon} **{p['title']}** — `{p['hash']}`")
        lines.append(f"   Yes: {p['yes']} | No: {p['no']} | Threshold: {p['threshold']} | **{p['status']}**")
        lines.append("")
    return "\n".join(lines)


with gr.Blocks(title="ZeroClaw — ZK Governance Demo", theme=gr.themes.Soft()) as demo:
    gr.Markdown("""
    # ZeroClaw
    ## Zero-Knowledge Governance for AI-Human Hybrid DAOs
    **AMD Developer Hackathon 2026 — AI Agents Track**
    """)

    with gr.Tab("1️⃣ Propose (AI Agent)"):
        gr.Markdown("Eliza proposes an action. Creates a hash-committed proposal.")
        with gr.Row():
            with gr.Column():
                t = gr.Textbox(label="Title", value="Deploy XMRT MeshNet Node — Seattle")
                d = gr.Textbox(label="Description", lines=3, value="Add cjdns node on Raspberry Pi 5")
                th = gr.Slider(1, 10, value=3, step=1, label="Approval Threshold")
                b1 = gr.Button("Propose", variant="primary")
            with gr.Column():
                h = gr.Markdown()
                plist = gr.Markdown()
        b1.click(propose, inputs=[t, d, th], outputs=[h, plist])

    with gr.Tab("2️⃣ Vote (Human)"):
        gr.Markdown("Humans submit private votes. Votes are hidden from the AI.")
        with gr.Row():
            with gr.Column():
                vh = gr.Textbox(label="Proposal Hash")
                vv = gr.Textbox(label="Voter ID", value="alice")
                vc = gr.Radio(["YES", "NO"], value="YES", label="Vote")
                vs = gr.Textbox(label="Secret Salt", value="secret", type="password")
                b2 = gr.Button("Submit Vote", variant="primary")
            with gr.Column():
                vr = gr.Markdown()
                vplist = gr.Markdown()
        b2.click(vote, inputs=[vh, vv, vc, vs], outputs=[vr, vplist])
        demo.load(list_proposals, outputs=vplist)

    with gr.Tab("3️⃣ Tally (AI Gatekeeper)"):
        gr.Markdown("AI queries the tally. Counts only — never identities or choices.")
        with gr.Row():
            with gr.Column():
                th2 = gr.Textbox(label="Proposal Hash")
                b3 = gr.Button("Tally", variant="primary")
            with gr.Column():
                tr = gr.Markdown()
                ai_view = gr.Textbox(label="What Eliza Sees", lines=4)
        b3.click(tally, inputs=[th2], outputs=[tr, ai_view])

    with gr.Tab("📜 All Proposals"):
        refresh = gr.Button("Refresh")
        allp = gr.Markdown()
        refresh.click(list_proposals, outputs=allp)
        demo.load(list_proposals, outputs=allp)

    gr.Markdown("---\n**Team:** Joe Lee + David Elze | **Repo:** github.com/xmrtdao/zero_claw")

if __name__ == "__main__":
    demo.launch()
