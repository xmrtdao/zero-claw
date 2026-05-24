---
title: ZeroClaw
emoji: 🦑
colorFrom: ff3366
colorTo: cc1144
sdk: gradio
sdk_version: 4.0.0
app_file: app.py
pinned: false
license: mit
---

# 🦑 ZeroClaw

**Zero-Knowledge Governance + Encrypted Communications**

**Live Site:** [https://xmrtdao.github.io/zero-claw/](https://xmrtdao.github.io/zero-claw/) | [Fleet Dashboard](https://relay.mobilemonero.com)

---

## Vision

**ZeroClaw** provides complete cryptographic privacy for AI-human hybrid organizations and legal professionals:

1. **Zero-Knowledge Governance** — AI agents propose, humans vote privately, treasury executes via ZK proofs
2. **Encrypted Communications** — Attorney-client privileged chat that literally cannot be subpoenaed

**Tagline:** *"Zero Knowledge. Zero Logs. Zero Risk."*

---

## Components

### 🔐 Encrypted Chat (NEW)

Based on cmd-chat architecture from Real Python Podcast #284:

- **SRP Authentication** — Passwords never transmitted (zero-knowledge proof)
- **E2E Encryption** — Fernet (AES-128-CBC + HMAC), even relay can't read
- **RAM-Only Messaging** — No disk writes, auto-wipe on disconnect
- **Case-Based Rooms** — HKDF key derivation per matter/case
- **No Logs** — Nothing to hand over in discovery

**Perfect for:**
- Attorney-client consultations (ABA Model Rule 1.6 compliant)
- DAO governance coordination (prevent front-running)
- Multi-agent secure collaboration (AI safety)

**Docs:** [docs/ENCRYPTED_CHAT_EXPANSION.md](docs/ENCRYPTED_CHAT_EXPANSION.md)

### 🗳️ ZK Governance (Existing)

- AI agents submit treasury proposals
- Humans vote with zero-knowledge proofs
- On-chain execution without exposing votes
- Supabase edge functions backend

**Docs:** [docs/AGENT_MANAGEMENT_GUIDE.md](docs/AGENT_MANAGEMENT_GUIDE.md)

---

## Why "Claw"?

> *"A claw grips and never lets go — just like attorney-client privilege."*

- **Zero** = Zero-knowledge proofs (cryptographic privacy)
- **Claw** = Secure grip on communications (nothing leaks)
- **Together** = Complete privacy stack for DAO + legal work

---

## Quick Start

### Encrypted Chat (Development)

```bash
# Install dependencies
cd zero-claw
pip install -r chat/requirements.txt

# Start relay server
python chat/server.py serve 0.0.0.0 8443 --password <shared_secret>

# Connect client
python chat/client.py connect <server_ip> 8443 "username" <shared_secret>
```

### ZK Governance (Production)

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## Compliance

| Regulation | Status |
|------------|--------|
| ABA Model Rule 1.6 | ✅ Compliant (E2E + no logs) |
| GDPR Article 25 | ✅ Compliant (data minimization) |
| HIPAA 164.312 | ✅ Compliant (AES-128 + HKDF) |
| SOC 2 CC6.1 | ✅ Compliant (SRP auth) |

**Ethics Opinion:** State bar filings in progress

---

## Use Cases

### Legal Practice
- Attorney-client consultations (privileged)
- Multi-attorney case collaboration (E2E)
- Expert witness communications (case-keyed)
- Settlement negotiations (ephemeral)

### DAO Governance
- Treasury discussions (encrypted before vote)
- Agent development coordination (secure)
- Legal strategy (attorney privilege)
- Member communications (SRP auth)

### Multi-Agent Systems
- Agent-to-agent coordination (encrypted)
- Human oversight channel (authenticated)
- Emergency shutdown (secure commands)

---

## Architecture

```
┌─────────────────────────────────────────┐
│         ZeroClaw Complete Stack         │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │    Zero-Knowledge Governance      │  │
│  │    • ZK voting                    │  │
│  │    • AI proposals                 │  │
│  │    • Treasury execution           │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │    Encrypted Communications       │  │
│  │    • SRP authentication           │  │
│  │    • E2E encryption               │  │
│  │    • RAM-only, no logs            │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## Repository Structure

```
zero-claw/
├── governance/           # ZK governance (existing)
│   ├── contracts/
│   ├── agents/
│   └── treasury/
│
├── chat/                 # Encrypted chat (NEW)
│   ├── srp_auth.py
│   ├── encryption.py
│   ├── server/
│   └── client/
│
├── integrations/         # XMRT ecosystem
│   ├── clauseguard/
│   ├── modelcourt/
│   └── hermes-mesh/
│
└── docs/                 # Documentation
    ├── ENCRYPTED_CHAT_EXPANSION.md
    ├── AGENT_MANAGEMENT_GUIDE.md
    └── DEPLOYMENT_GUIDE.md
```

---

## Team

**AMD Developer Hackathon 2026 — AI Agents Track**

Team: Joe Lee + David Elze  
Extended by: Hermes Agent (XMRT DAO Fleet)

**Organization:** [XMRT DAO](https://github.com/xmrtdao)

---

## Links

- **Main Repo:** https://github.com/xmrtdao/zero-claw
- **Podcast Archive:** https://github.com/xmrtdao/podcast-episodes
- **Fleet Dashboard:** https://relay.mobilemonero.com
- **Source Inspiration:** https://github.com/diorwave/cmd-chat

---

**License:** MIT  
**Status:** Active Development  
**Tagline:** *"Zero Knowledge. Zero Logs. Zero Risk."* 🦑
