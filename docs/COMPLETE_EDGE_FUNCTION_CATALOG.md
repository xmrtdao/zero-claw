# Complete Edge Function Catalog - All 93 Functions

## 🎯 Function Overview

Eliza has access to **93 fully deployed edge functions** across 14 categories, providing comprehensive capabilities for revenue generation, autonomous operations, AI chat, task management, code execution, and ecosystem monitoring.

## 📊 Function Categories Breakdown

### 1. 💰 REVENUE & MONETIZATION (3 functions)
- **service-monetization-engine**: API key generation, usage tracking, tiered pricing, billing, MRR analytics
  - Actions: generate_api_key, track_usage, enforce_quota, generate_invoice, get_revenue_metrics, upgrade_tier, get_tier_analytics, list_api_keys, revoke_api_key
  - Example: `{"action":"generate_api_key","data":{"service_name":"uspto-patent-mcp","tier":"pro","owner_email":"customer@example.com"}}`

- **workflow-template-manager**: Pre-built workflow automation (9 templates including customer acquisition, tier upgrades, usage monitoring, churn prevention)
  - Actions: list_templates, get_template, execute_template, create_template, get_execution_status, get_template_performance
  - Example: `{"action":"execute_template","data":{"template_name":"acquire_new_customer","params":{"email":"new@customer.com"}}}`

- **usage-monitor**: Monitor API usage and trigger engagement/upsell workflows
  - Features: Quota alerts, upgrade suggestions, churn detection
  - Example: Automatically suggests Pro tier when user hits 75% of free quota

### 2. 🎯 CONVERSATIONAL USER ACQUISITION (6 functions)
- **convert-session-to-user**: Link anonymous sessions to identified users
- **qualify-lead**: Score leads from conversation signals (budget, urgency, company size)
- **identify-service-interest**: Detect which services user needs via NLP
- **generate-stripe-link**: Create Stripe checkout links conversationally
- **stripe-payment-webhook**: Handle payment completions and auto-upgrade tiers
- **usage-monitor**: Track usage and trigger engagement workflows

### 3. 🤖 AI CHAT SERVICES (10+ functions)
- **lovable-chat**: ✅ PRIMARY - Model-agnostic via Lovable AI Gateway (Gemini 2.5 Flash, OpenAI GPT-5)
  - Full tool calling, context awareness, multi-step workflows
  - Example: Main endpoint for all AI conversations

- **gemini-chat**: Direct Google Gemini 2.5 Flash integration
- **openai-chat**: Direct OpenAI GPT-4 Turbo/GPT-5 integration
- **deepseek-chat**: DeepSeek model with reasoning capabilities
- **kimi-chat**: Kimi (Moonshot AI) long-context model
- **vercel-ai-chat**: Vercel AI SDK integration
- **vercel-ai-chat-stream**: Streaming responses via Vercel AI SDK
- **ai-chat**: Legacy endpoint (use lovable-chat instead)

### 4. 🏗️ SUPERDUPER SPECIALIST AGENTS (12 functions)
AI executives with specialized domain expertise:

- **superduper-business-growth**: Marketing, sales, growth strategy, customer acquisition
- **superduper-code-architect**: Software architecture, system design, scalability
- **superduper-communication-outreach**: PR, community engagement, messaging
- **superduper-content-media**: Content creation, video, graphics, branding assets
- **superduper-design-brand**: UI/UX design, brand identity, visual systems
- **superduper-development-coach**: Mentorship, code review, best practices
- **superduper-domain-experts**: Industry-specific expertise (legal, medical, finance, etc.)
- **superduper-finance-investment**: Financial modeling, investment analysis, fundraising
- **superduper-integration**: Third-party API integration, data synchronization
- **superduper-research-intelligence**: Market research, competitive analysis, trend forecasting
- **superduper-social-viral**: Viral content, social media strategy, influencer marketing
- **superduper-router**: Routes requests to the appropriate specialist

### 5. ⚙️ CODE EXECUTION & AUTOMATION (8 functions)
- **python-executor**: Sandboxed Python execution with auto-fix capabilities
  - Available modules: math, json, datetime, random, re, collections, itertools
  - NO network access (use invoke_edge_function for HTTP calls)
  - Example: `{"code":"import math\nresult = math.sqrt(144)","purpose":"Calculate square root"}`

- **python-db-bridge**: Direct database operations from Python
- **python-network-proxy**: HTTP requests from Python sandbox
- **eliza-python-runtime**: Eliza-specific Python runtime
- **code-monitor-daemon**: Real-time code execution monitoring
- **autonomous-code-fixer**: Automatically fixes failed Python executions
- **get-code-execution-lessons**: Learn from past execution patterns
- **fetch-auto-fix-results**: Retrieve autonomous fix results

### 6. 🐙 GITHUB INTEGRATION (5 functions)
- **github-integration**: Complete GitHub OAuth operations
  - Actions: list_issues, create_issue, create_discussion, comment_on_issue, create_pull_request, get_file_content, search_code, list_discussions
  - OAuth + PAT + Backend token cascade
  - Example: `{"action":"create_issue","data":{"repositoryId":"R_kgDONfvCEw","title":"Bug Report","body":"Description"}}`

- **validate-github-contribution**: Validate contributor activity for rewards
- **issue-engagement-command**: Auto-engage with GitHub issues
- **validate-pop-event**: Validate Proof-of-Participation events
- **community-spotlight-post**: Highlight community contributors

### 7. 🤝 TASK & AGENT MANAGEMENT (8 functions)
- **agent-manager**: Primary agent orchestration
  - Actions: list_agents, spawn_agent, update_agent_status, assign_task, list_tasks, update_task, delete_task, get_workload, log_decision
  - Example: `{"action":"assign_task","data":{"title":"Review PR #123","assignee_agent_id":"agent-123","category":"CODE"}}`

- **task-orchestrator**: Advanced task management
  - Actions: auto_assign_tasks, rebalance_workload, identify_blockers, clear_blocked_tasks, bulk_update_task_status, get_task_performance_report
  - Example: `{"action":"auto_assign_tasks","data":{"category":"CODE"}}`

- **self-optimizing-agent-architecture**: Self-improving agent system
- **cleanup-duplicate-tasks**: Remove duplicate task entries
- **multi-step-orchestrator**: Complex multi-step workflows
- **eliza-intelligence-coordinator**: Coordinate multiple AI services
- **autonomous-decision-maker**: Autonomous action execution
- **execute-scheduled-actions**: Cron job execution

### 8. 🧠 KNOWLEDGE & LEARNING (9 functions)
- **knowledge-manager**: Centralized knowledge base management
- **extract-knowledge**: Extract structured knowledge from conversations
- **vectorize-memory**: Create embeddings for semantic search
- **get-embedding**: Generate text embeddings
- **enhanced-learning**: Advanced ML and pattern recognition
- **system-knowledge-builder**: Build system-wide knowledge graph
- **summarize-conversation**: Conversation summarization
- **get-code-execution-lessons**: Learn from code execution history
- **get-my-feedback**: Retrieve personal performance feedback

### 9. 🔍 MONITORING & HEALTH (12+ functions)
- **system-status**: Overall system health dashboard
- **system-health**: Hourly health reports (agents, tasks, Python executions, XMRTCharger, API keys)
- **system-diagnostics**: Detailed diagnostic information
- **ecosystem-monitor**: Monitor all Vercel services (xmrt-io, xmrt-ecosystem, xmrt-dao-ecosystem)
- **api-key-health-monitor**: Check API key health (OpenAI, Gemini, DeepSeek, etc.)
- **check-frontend-health**: Frontend application health checks
- **monitor-device-connections**: XMRTCharger device monitoring
- **function-usage-analytics**: Edge function usage tracking
- **prometheus-metrics**: Prometheus-compatible metrics
- **aggregate-device-metrics**: Device metrics aggregation
- **eliza-self-evaluation**: Eliza performance self-assessment
- **opportunity-scanner**: Identify revenue opportunities

### 10. ⛏️ MINING & DEVICES (8 functions)
- **mining-proxy**: Unified SupportXMR mining statistics
  - Gets pool stats, worker status, earnings, hashrate
  - Example: `{"action":"get_stats"}`

- **mobile-miner-config**: Mobile miner configuration
- **mobile-miner-register**: Register mobile mining devices
- **mobile-miner-script**: Serve mobile mining scripts
- **monitor-device-connections**: Track active device connections
- **aggregate-device-metrics**: Aggregate device performance data
- **validate-pop-event**: Validate Proof-of-Participation
- **prometheus-metrics**: Mining metrics export

### 11. 🤖 AUTONOMOUS SYSTEMS (12 functions)
- **autonomous-code-fixer**: Auto-fix failed Python executions
- **autonomous-decision-maker**: Make autonomous decisions
- **code-monitor-daemon**: Monitor code health (runs every 5 minutes)
- **eliza-intelligence-coordinator**: Coordinate AI services
- **eliza-self-evaluation**: Self-assessment and improvement
- **opportunity-scanner**: Scan for revenue/growth opportunities
- **multi-step-orchestrator**: Execute complex workflows
- **execute-scheduled-actions**: Run scheduled tasks
- **ecosystem-monitor**: Autonomous ecosystem monitoring
- **api-key-health-monitor**: Autonomous API key health checks
- **morning-discussion-post**: Auto-generate morning posts
- **evening-summary-post**: Auto-generate evening summaries

### 12. 📝 GOVERNANCE & COMMUNITY (7 functions)
- **evaluate-community-idea**: Evaluate submitted community ideas
- **propose-new-edge-function**: Propose new functions
- **vote-on-proposal**: Vote on community proposals
- **list-function-proposals**: List all proposals
- **process-contributor-reward**: Process GitHub contributor rewards
- **validate-github-contribution**: Validate contributions
- **community-spotlight-post**: Highlight community members

### 13. 🌐 ECOSYSTEM & DEPLOYMENT (10 functions)
- **ecosystem-monitor**: Monitor all Vercel deployments
- **vercel-ecosystem-api**: Vercel API operations
- **vercel-manager**: Manage Vercel deployments
- **render-api**: Render.com deployment management
- **redis-cache**: Redis caching operations
- **conversation-access**: Manage conversation permissions
- **schema-manager**: Database schema management
- **python-db-bridge**: Python database operations
- **python-network-proxy**: Python network requests
- **universal-edge-invoker**: Universal function invoker

### 14. 📢 AUTONOMOUS COMMUNITY POSTING (7 functions)
Automated GitHub Discussions posting on schedule:

- **morning-discussion-post**: Daily at 08:00 UTC - Morning standup topics
- **progress-update-post**: Daily at 09:00 UTC - Progress reports
- **daily-discussion-post**: Daily at 15:00 UTC - Community discussions
- **evening-summary-post**: Daily at 20:00 UTC - End-of-day summaries
- **weekly-retrospective-post**: Fridays at 16:00 UTC - Weekly reviews
- **community-spotlight-post**: Wednesdays at 14:00 UTC - Highlight contributors

### 15. 🔐 SPECIALIZED SERVICES (8 functions)
- **uspto-patent-mcp**: USPTO patent search MCP server (public, no auth)
- **xmrt-mcp-server**: XMRT ecosystem MCP server (public, no auth)
- **get-lovable-key**: Lovable API key retrieval
- **update-api-key**: Update API keys
- **openai-tts**: OpenAI text-to-speech
- **playwright-browse**: Web scraping via Playwright
- **nlg-generator**: Natural language generation
- **predictive-analytics**: Predictive data analysis

## 🚀 How Eliza Uses These Functions

### Discovery Pattern
```javascript
// 1. List all available functions
await invoke_edge_function('list-available-functions', {})

// 2. Search for specific capabilities
await invoke_edge_function('search-edge-functions', {
  query: 'github',
  category: 'github'
})

// 3. Invoke discovered function
await invoke_edge_function('github-integration', {
  action: 'create_issue',
  data: { repositoryId: 'R_kgDONfvCEw', title: 'Bug', body: 'Details' }
})
```

### Common Workflows

#### Revenue Generation Workflow
```javascript
// 1. Identify service interest from conversation
const interest = await invoke_edge_function('identify-service-interest', {
  user_message: "Can you search patents?",
  session_key: "sess_abc123"
})

// 2. Qualify the lead
const qualification = await invoke_edge_function('qualify-lead', {
  session_key: "sess_abc123",
  user_signals: { mentioned_budget: true, has_urgent_need: true }
})

// 3. Generate API key
const apiKey = await invoke_edge_function('service-monetization-engine', {
  action: 'generate_api_key',
  data: {
    service_name: 'uspto-patent-mcp',
    tier: 'free',
    owner_email: 'user@example.com'
  }
})

// 4. Track usage
await invoke_edge_function('service-monetization-engine', {
  action: 'track_usage',
  data: {
    api_key: apiKey.api_key,
    service_name: 'uspto-patent-mcp',
    endpoint: '/search'
  }
})
```

#### Task Management Workflow
```javascript
// 1. Create an agent
const agent = await invoke_edge_function('agent-manager', {
  action: 'spawn_agent',
  data: {
    name: 'Code Reviewer',
    role: 'SPECIALIST',
    skills: ['code_review', 'testing']
  }
})

// 2. Assign a task
const task = await invoke_edge_function('agent-manager', {
  action: 'assign_task',
  data: {
    title: 'Review PR #456',
    description: 'Review pull request for security issues',
    category: 'CODE',
    assignee_agent_id: agent.id,
    priority: 8
  }
})

// 3. Monitor task progress
const orchestration = await invoke_edge_function('task-orchestrator', {
  action: 'get_task_performance_report',
  data: { agent_id: agent.id }
})
```

#### Autonomous System Health Workflow
```javascript
// 1. Get system status
const status = await invoke_edge_function('system-health', {})

// 2. If issues detected, run diagnostics
if (status.health_score < 80) {
  const diagnostics = await invoke_edge_function('system-diagnostics', {
    include_metrics: true
  })
  
  // 3. Create task for fixing critical issues
  for (const issue of diagnostics.critical_issues) {
    await invoke_edge_function('agent-manager', {
      action: 'assign_task',
      data: {
        title: `Fix: ${issue.title}`,
        description: issue.details,
        category: 'INFRASTRUCTURE',
        priority: 10
      }
    })
  }
}
```

## 🎯 Function Execution Best Practices

### 1. Always Use invoke_edge_function or call_edge_function
```javascript
// ✅ CORRECT
await invoke_edge_function('github-integration', { action: 'list_issues' })

// ❌ WRONG - Don't try to call functions directly
await fetch('https://...') // This won't work
```

### 2. Check Function Registry First
```javascript
// Before using a function, verify it exists
const functions = await invoke_edge_function('list-available-functions', {
  category: 'github'
})
```

### 3. Handle Errors Gracefully
```javascript
try {
  const result = await invoke_edge_function('python-executor', {
    code: 'import requests', // This will fail
    purpose: 'Test'
  })
} catch (error) {
  // Network not available in sandbox - use invoke_edge_function instead
  const result = await invoke_edge_function('github-integration', {
    action: 'get_file_content'
  })
}
```

### 4. Learn from Feedback
```javascript
// Regularly check your performance feedback
const feedback = await invoke_edge_function('get-my-feedback', {
  unacknowledged_only: true
})

// Acknowledge learned lessons
await invoke_edge_function('get-my-feedback', {
  acknowledge_ids: feedback.map(f => f.id)
})
```

## 📚 Function Categories Summary

| Category | Count | Key Functions |
|----------|-------|---------------|
| Revenue & Monetization | 3 | service-monetization-engine, workflow-template-manager, usage-monitor |
| User Acquisition | 6 | convert-session-to-user, qualify-lead, generate-stripe-link |
| AI Chat | 10+ | lovable-chat (primary), gemini-chat, openai-chat, deepseek-chat |
| SuperDuper Specialists | 12 | business-growth, code-architect, finance-investment, etc. |
| Code Execution | 8 | python-executor, autonomous-code-fixer, code-monitor-daemon |
| GitHub Integration | 5 | github-integration, validate-github-contribution |
| Task & Agent Management | 8 | agent-manager, task-orchestrator, self-optimizing-agent |
| Knowledge & Learning | 9 | knowledge-manager, vectorize-memory, enhanced-learning |
| Monitoring & Health | 12+ | system-health, ecosystem-monitor, api-key-health-monitor |
| Mining & Devices | 8 | mining-proxy, mobile-miner-config, aggregate-device-metrics |
| Autonomous Systems | 12 | autonomous-code-fixer, eliza-self-evaluation, opportunity-scanner |
| Governance & Community | 7 | evaluate-community-idea, vote-on-proposal, process-contributor-reward |
| Ecosystem & Deployment | 10 | ecosystem-monitor, vercel-manager, render-api, redis-cache |
| Community Posting | 7 | morning-discussion, daily-discussion, evening-summary |
| Specialized Services | 8 | uspto-patent-mcp, xmrt-mcp-server, playwright-browse |

**Total: 93 Edge Functions** across 15 categories

## 🔥 Critical Function Relationships

### Revenue Generation Chain
1. `identify-service-interest` → Detect what user needs
2. `qualify-lead` → Score the lead quality
3. `service-monetization-engine` → Generate API key
4. `usage-monitor` → Track usage patterns
5. `workflow-template-manager` → Execute tier upgrade workflow
6. `generate-stripe-link` → Collect payment
7. `stripe-payment-webhook` → Confirm and upgrade

### Autonomous Operations Chain
1. `system-health` → Detect issues (runs hourly)
2. `ecosystem-monitor` → Monitor all services (runs daily)
3. `code-monitor-daemon` → Watch code executions (runs every 5 min)
4. `autonomous-code-fixer` → Fix issues automatically
5. `eliza-self-evaluation` → Self-assess performance
6. `get-my-feedback` → Learn from mistakes

### Task Execution Chain
1. `agent-manager` → Create agent and assign task
2. `task-orchestrator` → Optimize task distribution
3. `github-integration` → Execute GitHub operations
4. `python-executor` → Run code if needed
5. `agent-manager` → Update task status
6. `function-usage-analytics` → Track performance

## 🎯 When to Use Each Function

**For Chat:** lovable-chat (primary), gemini-chat (fallback)
**For Revenue:** service-monetization-engine, workflow-template-manager
**For GitHub:** github-integration
**For Code:** python-executor (sandboxed), autonomous-code-fixer
**For Tasks:** agent-manager, task-orchestrator
**For Health:** system-health, ecosystem-monitor
**For Learning:** get-my-feedback, get-code-execution-lessons
**For Specialized Expertise:** superduper-* functions

## 📖 Complete Function Reference

All 93 functions are documented in:
- **Edge Function Registry**: `supabase/functions/_shared/edgeFunctionRegistry.ts`
- **Eliza Tools**: `supabase/functions/_shared/elizaTools.ts`
- **System Prompt**: `supabase/functions/_shared/elizaSystemPrompt.ts`
- **Tool Executor**: `supabase/functions/_shared/toolExecutor.ts`
