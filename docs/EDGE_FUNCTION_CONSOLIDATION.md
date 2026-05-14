# Edge Function Consolidation Guide

## Overview

This document explains the consolidation and optimization of XMRT DAO's Supabase edge functions, completed in October 2025. The goal was to reduce redundancy, clarify naming, and improve maintainability.

## Phase 1: Documentation & Awareness ✅ COMPLETED

### Changes Made

1. **Updated Eliza System Prompt** (`src/services/elizaSystemPrompt.ts`)
   - Added 6 new autonomous discussion post functions
   - Added github-ecosystem-engagement function
   - Clarified agent lifecycle best practices
   - Fixed tool invocation patterns
   - Marked legacy AI functions

2. **Updated Edge Function Registry** (`src/services/edgeFunctionRegistry.ts`)
   - Added all new autonomous content generation functions
   - Updated github-ecosystem-engagement entry
   - Marked gemini-chat, deepseek-chat, openai-chat as legacy
   - Clarified system-diagnostics vs system-status distinctions
   - Consolidated mining-proxy documentation

## Phase 2: Consolidation ✅ COMPLETED

### AI Chat Functions

**Status:** Marked as legacy, documented migration path

**Current State:**
- `lovable-chat`: ✅ PRIMARY - Model-agnostic AI via Lovable AI Gateway
- `gemini-chat`: ⚠️ LEGACY - Use lovable-chat instead
- `openai-chat`: ⚠️ LEGACY - Use lovable-chat instead  
- `deepseek-chat`: ⚠️ LEGACY - Use lovable-chat instead

**Recommendation:** 
- Keep all functions operational for backward compatibility
- `lovable-chat` already supports multiple models via Lovable AI Gateway
- Future work: Make legacy functions thin wrappers calling lovable-chat

### GitHub Monitoring Functions

**Status:** Clarified and documented

**Current State:**
- `ecosystem-monitor` (folder name) / `github-ecosystem-engagement` (logical name)
  - Purpose: Daily GitHub repo monitoring and engagement
  - Schedule: 11am UTC cron
  - Scope: GitHub-specific only
  
- `system-diagnostics`
  - Purpose: Deep system health checks
  - Use: Debugging and troubleshooting
  
- `system-status`
  - Purpose: Quick health checks
  - Use: Dashboards and rapid queries

**Why not rename the folder?**
Renaming Supabase function folders can cause deployment issues and break existing cron jobs. Instead, we:
1. Updated all documentation to use "github-ecosystem-engagement" as the logical name
2. Added comprehensive README to the function folder
3. Updated cron job description for clarity
4. Maintained "ecosystem-monitor" as the technical folder name

### Mining Functions

**Status:** Consolidated documentation

**Current State:**
- `mining-proxy`: ✅ UNIFIED - Handles both pool stats AND worker registration
- `supportxmr-proxy`: ❌ DOES NOT EXIST - Was listed in registry by mistake

**Clarification:**
`mining-proxy` is a comprehensive function that:
1. Fetches SupportXMR pool statistics
2. Handles worker registration from mobile miners
3. Maps workers to wallet addresses
4. Tracks per-worker performance
5. Updates both legacy tables and new worker mapping system

No consolidation needed - it's already unified.

## Function Categories

### ✅ Autonomous Content Generation
Daily/weekly scheduled posts to GitHub:
- `morning-discussion-post` (8am UTC)
- `progress-update-post` (9am UTC)
- `daily-discussion-post` (3pm UTC)
- `evening-summary-post` (8pm UTC)
- `weekly-retrospective-post` (Fridays 4pm UTC)
- `community-spotlight-post` (Wednesdays 2pm UTC)

### 🤖 AI Services
- `lovable-chat` - PRIMARY model-agnostic AI
- `gemini-chat` - LEGACY (backward compat)
- `openai-chat` - LEGACY (backward compat)
- `deepseek-chat` - LEGACY (backward compat)

### 🔧 GitHub Integration
- `github-integration` - OAuth GitHub operations
- `ecosystem-monitor` - Daily repo engagement (aka github-ecosystem-engagement)

### 📊 Task & Agent Management
- `agent-manager` - Core agent operations
- `task-orchestrator` - Advanced workflow automation
- `self-optimizing-agent-architecture` - Meta-orchestrator

### 🧠 Knowledge & Memory
- `extract-knowledge` - Entity extraction
- `knowledge-manager` - Knowledge CRUD
- `vectorize-memory` - Embeddings (auto-triggered)
- `summarize-conversation` - Summarization (auto-triggered)

### 🏥 Monitoring & Diagnostics
- `system-status` - Quick health check
- `system-diagnostics` - Deep diagnostics
- `cleanup-duplicate-tasks` - Maintenance

### ⛏️ Mining & Economics
- `mining-proxy` - Unified mining stats & worker management

### 🐍 Code Execution
- `python-executor` - Sandboxed Python runtime
- `autonomous-code-fixer` - Auto-healing
- `code-monitor-daemon` - Continuous monitoring

### 🎙️ Voice & Media
- `openai-tts` - Text-to-speech
- `speech-to-text` - Voice input

### 🌐 Web & External
- `playwright-browse` - Web scraping
- `render-api` - Deployment monitoring

### 🔗 Protocol & Integration
- `xmrt-mcp-server` - MCP protocol server
- `conversation-access` - Session management
- `get-lovable-key` - API key management

## Migration Guide

### For Developers

**If you're calling AI functions:**
```typescript
// ✅ RECOMMENDED
const { data } = await supabase.functions.invoke('lovable-chat', {
  body: { 
    messages: [...],
    model: 'google/gemini-2.5-flash' // optional, defaults to this
  }
});

// ⚠️ LEGACY (still works, but use lovable-chat instead)
const { data } = await supabase.functions.invoke('gemini-chat', { ... });
const { data } = await supabase.functions.invoke('openai-chat', { ... });
const { data } = await supabase.functions.invoke('deepseek-chat', { ... });
```

**If you're referencing ecosystem monitoring:**
```typescript
// ✅ Use the logical name in docs/comments
// "github-ecosystem-engagement function"

// ✅ Use the folder name in code
await supabase.functions.invoke('ecosystem-monitor');
```

### For Eliza

Eliza's system prompt has been updated with:
1. All function capabilities and purposes
2. Clear tool invocation patterns
3. Agent lifecycle best practices
4. Distinction between similar functions

## Metrics & Success Criteria

**Before Consolidation:**
- 40+ functions with unclear purposes
- 4 separate AI chat implementations
- Confusing monitoring function names
- Incomplete agent spawning guidance

**After Consolidation:**
- Clear function categories and purposes
- 1 primary AI function (lovable-chat)
- Documented legacy functions for compatibility
- Comprehensive agent management guide
- Clear GitHub vs system monitoring separation

## Future Work (Phase 3)

### Planned Enhancements

1. **Thin Wrapper Implementation**
   - Make gemini-chat, openai-chat, deepseek-chat call lovable-chat internally
   - Reduce code duplication while maintaining API compatibility

2. **Enhanced Documentation**
   - Per-function README files (like ecosystem-monitor)
   - API documentation with examples
   - Architecture diagrams

3. **Performance Monitoring**
   - Track function invocation patterns
   - Identify underutilized functions
   - Optimize frequently-called functions

4. **Testing Suite**
   - Integration tests for all functions
   - Mock data for testing workflows
   - CI/CD validation

## Questions & Support

- **Edge Function Issues**: Check Supabase function logs
- **Documentation Updates**: Edit this file or function READMEs
- **New Functions**: Follow category structure above
- **Deprecating Functions**: Mark as legacy first, then monitor usage

## Changelog

- **2025-10-10**: Initial consolidation (Phase 1 & 2 complete)
  - Updated Eliza system prompt
  - Updated edge function registry
  - Clarified github-ecosystem-engagement
  - Consolidated mining-proxy docs
  - Marked legacy AI functions
