# ZeroClaw Improvements Report

## Summary

Analyzed the [xmrtdao/zero-claw](https://github.com/xmrtdao/zero-claw) repository and identified 8 critical improvement areas. Delivered 13 new/modified files across 4 categories.

---

## Critical Fixes

### 1. BrowserRouter -> HashRouter (CRITICAL)
**File:** `src/App.tsx`

**Problem:** The app uses `BrowserRouter` which requires server-side rewrite support. GitHub Pages (where the app is deployed) doesn't support SPA routing - all page refreshes return 404.

**Fix:** Switched to `HashRouter` which uses `/#/path` URLs and works on any static host.

### 2. React Error Boundary (CRITICAL)
**File:** `src/components/ErrorBoundary.tsx` (NEW)

**Problem:** No error handling - any component crash brings down the entire app with a white screen.

**Fix:** Class-based error boundary with:
- Graceful fallback UI with retry/reload options
- Support for custom fallback components
- Error logging to console

### 3. Loading Skeletons (HIGH)
**Files:** `src/components/skeletons/DashboardSkeleton.tsx`, `src/components/skeletons/GovernanceSkeleton.tsx` (NEW)

**Problem:** Pages show blank screens during data fetching from Supabase.

**Fix:** Shimmer skeleton components that match the layout structure, reducing perceived load time.

---

## Zero-Knowledge Circuit Completion

### 4. Complete Noir Voting Circuit (HIGH)
**Files:** `circuits/main.nr`, `circuits/Nargo.toml` (NEW)

**Problem:** The existing `main.nr` was empty/incomplete.

**Fix:** Full SRP-6a circuit with 4 security constraints:

| Constraint | Purpose |
|-----------|---------|
| Vote validity (`choice == 0 \| 1`) | Prevents out-of-range votes |
| Nullifier integrity | Prevents double-voting via deterministic uniqueness |
| Vote commitment | Binds vote to specific voter+proposal |
| Merkle membership | Proves voter eligibility without revealing identity |

**Tests included:** 3 tests covering approve, reject, and invalid vote paths.

### 5. TypeScript ZK Client Utilities (HIGH)
**Files:** `src/utils/zkVote.ts`, `src/services/zkProofService.ts` (NEW)

**Problem:** No client-side ZK utilities - the governance page interacts directly with Supabase without any ZK abstraction.

**Fix:** Complete client-side commitment generation and proof service:
- `generateVoteCommitments()` - Creates nullifier + vote commitment
- `verifyVoteCommitment()` - Client-side validation before submission
- `castVote()` - Full vote casting with ZK proof via Supabase edge functions
- `getVoteTally()` - Retrieves aggregated tallies

---

## Encrypted Chat Web Client

### 6. WebCrypto SRP Authentication (HIGH)
**File:** `src/utils/srpAuth.ts` (NEW)

**Problem:** The encrypted chat only has Python CLI clients. No web interface.

**Fix:** Full SRP-6a implementation in TypeScript using WebCrypto:
- 4096-bit group parameters (RFC 5054)
- Three-step handshake: initiate -> respond challenge -> verify server
- Session key derivation for encryption
- Password never transmitted over the wire

### 7. E2E Encryption Module (HIGH)
**File:** `src/utils/chatEncryption.ts` (NEW)

**Fix:** WebCrypto-based encryption:
- HKDF-SHA-256 for per-case key derivation
- AES-256-GCM for message encryption (upgrades Python's AES-128-CBC)
- Compatible with case-based room architecture

### 8. WebSocket Chat Service + UI (HIGH)
**Files:** `src/services/chatService.ts`, `src/pages/Chat.tsx` (NEW)

**Fix:** Complete real-time encrypted chat:
- WebSocket client with auto-reconnection
- RAM-only message storage (wiped on disconnect)
- Optimistic message updates
- Dark-themed UI with encryption status indicators
- "Wipe & Disconnect" for manual cleanup

---

## SEO & Performance

### 9. Improved index.html (MEDIUM)
**File:** `index.html`

**Improvements:**
- Theme color meta tag for mobile browsers
- Full Open Graph tags for social sharing
- Twitter Card meta tags
- Preconnect to Google Fonts for faster loading
- `<noscript>` message for JS-disabled browsers
- Canonical URL

---

## File Inventory

```
zero-claw-improvements/
├── IMPROVEMENTS.md                           # This report
├── index.html                                # SEO-enhanced HTML
├── circuits/
│   ├── Nargo.toml                            # Noir package config
│   └── main.nr                               # Complete ZK voting circuit
└── src/
    ├── App.tsx                               # HashRouter + ErrorBoundary
    ├── components/
    │   ├── ErrorBoundary.tsx                 # Error boundary wrapper
    │   └── skeletons/
    │       ├── DashboardSkeleton.tsx         # Dashboard loading UI
    │       └── GovernanceSkeleton.tsx        # Governance loading UI
    ├── pages/
    │   └── Chat.tsx                          # Encrypted chat web client
    ├── services/
    │   ├── chatService.ts                    # WebSocket chat service
    │   └── zkProofService.ts               # ZK vote casting service
    └── utils/
        ├── srpAuth.ts                        # SRP-6a auth (WebCrypto)
        ├── chatEncryption.ts               # AES-GCM encryption (WebCrypto)
        └── zkVote.ts                         # ZK commitment generator
```

## Integration Steps

### Immediate (copy directly to repo):
```bash
cp src/App.tsx $ZERO_CLAW/src/App.tsx
cp src/components/ErrorBoundary.tsx $ZERO_CLAW/src/components/
cp src/components/skeletons/*.tsx $ZERO_CLAW/src/components/skeletons/
cp index.html $ZERO_CLAW/index.html
```

### ZK Circuit (requires Noir):
```bash
cd circuits
noirup --version 0.33.0
nargo test        # Run 3 circuit tests
nargo compile     # Compile to ACIR
```

### Encrypted Chat (requires WebSocket relay):
```bash
# Add Chat page to App.tsx routes:
# <Route path="/chat" element={<Chat />} />
cp src/pages/Chat.tsx $ZERO_CLAW/src/pages/
cp src/services/chatService.ts $ZERO_CLAW/src/services/
cp src/utils/srpAuth.ts $ZERO_CLAW/src/utils/
cp src/utils/chatEncryption.ts $ZERO_CLAW/src/utils/
```

### ZK Governance Integration:
```bash
cp src/services/zkProofService.ts $ZERO_CLAW/src/services/
cp src/utils/zkVote.ts $ZERO_CLAW/src/utils/
# Update Governance.tsx to use castVote() instead of direct Supabase calls
```

## Security Notes

1. **SRP Authentication**: Uses 4096-bit group from RFC 5054. Session keys are ephemeral.
2. **AES-256-GCM**: Upgrades the Python implementation's AES-128-CBC with authenticated encryption.
3. **RAM-Only Storage**: Messages are held in a JavaScript array and explicitly wiped on disconnect.
4. **ZK Privacy**: Individual votes are hidden from the AI; only aggregate tallies are visible.
5. **Merkle Membership**: Voter eligibility is proven via Merkle path without revealing voter identity.

## Known Limitations

1. The Poseidon hash in `zkVote.ts` uses SHA-256 as a placeholder. Replace with actual Poseidon WASM from `@noir-lang/barretenberg` for production.
2. The WebSocket relay server needs to be deployed (Python server from `chat/` directory).
3. The Merkle tree root management (adding/removing voters) is handled off-chain.
4. `nargo compile` may require adjusting Noir syntax for the specific version installed.
