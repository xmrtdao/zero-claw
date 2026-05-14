# Edge Function Parameters Reference - Complete Payload Structures

## 🎯 Purpose

This document provides the **EXACT** parameter structures and payload formats that Eliza must use when invoking each of the 93 edge functions. Each function's request body structure, required fields, optional fields, and data types are documented.

---

## 📚 How to Use This Reference

**When calling ANY edge function:**

```typescript
await supabase.functions.invoke('function-name', {
  body: {
    // Use the exact structure documented below
  }
});
```

**Critical Rules:**
1. ✅ **Always use the exact field names** documented here
2. ✅ **Check required vs optional fields** - required fields MUST be included
3. ✅ **Match data types exactly** (string, number, boolean, object, array)
4. ✅ **Nest data properly** - most functions use `{action, data}` structure
5. ❌ **Never guess parameter names** - refer to this document first

---

## 🔥 Most Commonly Used Functions

### 1. **github-integration** (GitHub Operations)

**Base Structure:**
```typescript
{
  action: string,           // REQUIRED: Action to perform
  data: object,             // REQUIRED: Action-specific data
  session_credentials?: {   // OPTIONAL: User credentials
    github_oauth_token?: string,
    github_pat?: string
  }
}
```

**Actions:**

#### `list_issues`
```typescript
{
  action: 'list_issues',
  data: {
    repositoryId: string,    // REQUIRED: GitHub repo ID (e.g., "R_kgDONfvCEw")
    state?: 'open' | 'closed' | 'all',  // OPTIONAL: Default 'open'
    labels?: string[],       // OPTIONAL: Filter by labels
    assignee?: string        // OPTIONAL: Filter by assignee username
  }
}
```

#### `create_issue`
```typescript
{
  action: 'create_issue',
  data: {
    repositoryId: string,    // REQUIRED: GitHub repo ID
    title: string,           // REQUIRED: Issue title
    body: string,            // REQUIRED: Issue description/body
    labels?: string[],       // OPTIONAL: Labels to add
    assignees?: string[]     // OPTIONAL: GitHub usernames to assign
  }
}
```

#### `create_pull_request`
```typescript
{
  action: 'create_pull_request',
  data: {
    repositoryId: string,    // REQUIRED: GitHub repo ID
    title: string,           // REQUIRED: PR title
    body: string,            // REQUIRED: PR description
    head: string,            // REQUIRED: Branch with changes (e.g., "feature-branch")
    base: string             // REQUIRED: Target branch (e.g., "main")
  }
}
```

#### `comment_on_issue`
```typescript
{
  action: 'comment_on_issue',
  data: {
    issueId: string,         // REQUIRED: GitHub issue node ID
    comment: string          // REQUIRED: Comment text
  }
}
```

#### `get_file_content`
```typescript
{
  action: 'get_file_content',
  data: {
    owner: string,           // REQUIRED: Repo owner (e.g., "DevGruGold")
    repo: string,            // REQUIRED: Repo name (e.g., "XMRT-Ecosystem")
    path: string,            // REQUIRED: File path (e.g., "src/App.tsx")
    ref?: string             // OPTIONAL: Branch/commit (default: default branch)
  }
}
```

#### `search_code`
```typescript
{
  action: 'search_code',
  data: {
    query: string,           // REQUIRED: Search query
    owner?: string,          // OPTIONAL: Limit to owner
    repo?: string            // OPTIONAL: Limit to repo
  }
}
```

---

### 2. **agent-manager** (Agent & Task Management)

**Base Structure:**
```typescript
{
  action: string,           // REQUIRED: Action to perform
  data: object              // REQUIRED: Action-specific data
}
```

**Actions:**

#### `list_agents`
```typescript
{
  action: 'list_agents',
  data: {}                  // No parameters needed
}
```

#### `spawn_agent`
```typescript
{
  action: 'spawn_agent',
  data: {
    id?: string,            // OPTIONAL: Custom agent ID (auto-generated if omitted)
    name: string,           // REQUIRED: Agent name
    role: 'ORCHESTRATOR' | 'SPECIALIST' | 'WORKER',  // REQUIRED
    skills: string[]        // REQUIRED: Array of skill identifiers
  }
}
```

#### `assign_task`
```typescript
{
  action: 'assign_task',
  data: {
    title: string,                    // REQUIRED: Task title
    description: string,              // REQUIRED: Task description
    category: 'CODE' | 'INFRASTRUCTURE' | 'GITHUB' | 'RESEARCH' | 'MONITORING',  // REQUIRED
    assignee_agent_id?: string,       // OPTIONAL: Specific agent to assign
    priority?: number,                // OPTIONAL: 1-10 (default: 5)
    repo?: string,                    // OPTIONAL: Related repo
    metadata?: object                 // OPTIONAL: Additional context
  }
}
```

#### `update_agent_status`
```typescript
{
  action: 'update_agent_status',
  data: {
    agent_id: string,                 // REQUIRED: Agent ID
    status: 'IDLE' | 'BUSY' | 'OFFLINE',  // REQUIRED
    metadata?: object                 // OPTIONAL: Additional info
  }
}
```

#### `list_tasks`
```typescript
{
  action: 'list_tasks',
  data: {
    agent_id?: string,                // OPTIONAL: Filter by agent
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED',  // OPTIONAL
    category?: string                 // OPTIONAL: Filter by category
  }
}
```

#### `update_task`
```typescript
{
  action: 'update_task',
  data: {
    task_id: string,                  // REQUIRED: Task ID
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED',  // OPTIONAL
    metadata?: object,                // OPTIONAL: Update metadata
    progress?: number                 // OPTIONAL: 0-100
  }
}
```

#### `get_workload`
```typescript
{
  action: 'get_workload',
  data: {
    agent_id: string                  // REQUIRED: Agent ID
  }
}
```

---

### 3. **task-orchestrator** (Advanced Task Management)

**Base Structure:**
```typescript
{
  action: string,           // REQUIRED
  data: object              // Action-specific (can be empty object)
}
```

**Actions:**

#### `auto_assign_tasks`
```typescript
{
  action: 'auto_assign_tasks',
  data: {
    category?: string       // OPTIONAL: Prioritize specific category
  }
}
```

#### `rebalance_workload`
```typescript
{
  action: 'rebalance_workload',
  data: {}                  // No parameters needed
}
```

#### `identify_blockers`
```typescript
{
  action: 'identify_blockers',
  data: {}                  // No parameters needed
}
```

#### `clear_blocked_tasks`
```typescript
{
  action: 'clear_blocked_tasks',
  data: {
    task_ids?: string[]     // OPTIONAL: Specific task IDs to clear
  }
}
```

#### `bulk_update_task_status`
```typescript
{
  action: 'bulk_update_task_status',
  data: {
    task_ids: string[],     // REQUIRED: Array of task IDs
    new_status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'  // REQUIRED
  }
}
```

#### `get_task_performance_report`
```typescript
{
  action: 'get_task_performance_report',
  data: {
    agent_id?: string,      // OPTIONAL: Specific agent report
    time_range?: string     // OPTIONAL: e.g., "7d", "30d"
  }
}
```

---

### 4. **service-monetization-engine** (Revenue & Billing)

**Base Structure:**
```typescript
{
  action: string,           // REQUIRED
  data: object              // REQUIRED
}
```

**Actions:**

#### `generate_api_key`
```typescript
{
  action: 'generate_api_key',
  data: {
    service_name: string,   // REQUIRED: e.g., "uspto-patent-mcp"
    tier: 'free' | 'basic' | 'pro' | 'enterprise',  // REQUIRED
    owner_email: string,    // REQUIRED: Customer email
    owner_name?: string     // OPTIONAL: Customer name
  }
}
```

#### `validate_api_key`
```typescript
{
  action: 'validate_api_key',
  data: {
    api_key: string         // REQUIRED: API key to validate
  }
}
```

#### `track_usage`
```typescript
{
  action: 'track_usage',
  data: {
    api_key: string,        // REQUIRED: API key
    service_name: string,   // REQUIRED: Service being used
    endpoint: string,       // REQUIRED: Endpoint called
    tokens_used?: number,   // OPTIONAL: Token count
    response_time_ms?: number,  // OPTIONAL: Response time
    status_code?: number    // OPTIONAL: HTTP status
  }
}
```

#### `enforce_quota`
```typescript
{
  action: 'enforce_quota',
  data: {
    api_key: string         // REQUIRED: API key to check
  }
}
```

#### `upgrade_tier`
```typescript
{
  action: 'upgrade_tier',
  data: {
    api_key: string,        // REQUIRED: API key to upgrade
    new_tier: 'basic' | 'pro' | 'enterprise'  // REQUIRED
  }
}
```

#### `get_revenue_metrics`
```typescript
{
  action: 'get_revenue_metrics',
  data: {
    service_name?: string,  // OPTIONAL: Filter by service
    start_date?: string,    // OPTIONAL: ISO date string
    end_date?: string       // OPTIONAL: ISO date string
  }
}
```

---

### 5. **workflow-template-manager** (Workflow Automation)

**Base Structure:**
```typescript
{
  action: string,           // REQUIRED
  data: object              // Action-specific
}
```

**Actions:**

#### `list_templates`
```typescript
{
  action: 'list_templates',
  data: {
    category?: string       // OPTIONAL: Filter by category
  }
}
```

#### `get_template`
```typescript
{
  action: 'get_template',
  data: {
    template_name: string   // REQUIRED: Template identifier
  }
}
```

#### `execute_template`
```typescript
{
  action: 'execute_template',
  data: {
    template_name: string,  // REQUIRED: Template to execute
    params: object          // REQUIRED: Template-specific parameters
  }
}
```

**Example - Acquire New Customer Workflow:**
```typescript
{
  action: 'execute_template',
  data: {
    template_name: 'acquire_new_customer',
    params: {
      email: 'customer@example.com',
      service_name: 'uspto-patent-mcp',
      tier: 'free'
    }
  }
}
```

#### `create_template`
```typescript
{
  action: 'create_template',
  data: {
    name: string,           // REQUIRED: Unique template name
    description: string,    // REQUIRED: Template description
    category: string,       // REQUIRED: Category
    steps: Array<{          // REQUIRED: Workflow steps
      step_number: number,
      action_type: string,
      edge_function: string,
      payload: object
    }>,
    default_params?: object  // OPTIONAL: Default parameters
  }
}
```

---

### 6. **python-executor** (Code Execution)

**Base Structure:**
```typescript
{
  code: string,             // REQUIRED: Python code to execute
  purpose: string,          // REQUIRED: What this code does
  context?: string,         // OPTIONAL: Additional context
  auto_fix?: boolean        // OPTIONAL: Auto-fix on error (default: true)
}
```

**Example:**
```typescript
{
  code: `
import math
result = math.sqrt(144)
print(f"Square root: {result}")
  `,
  purpose: 'Calculate square root of 144',
  context: 'User asked for square root calculation',
  auto_fix: true
}
```

**Available Modules:**
- `math`, `json`, `datetime`, `random`, `re`, `collections`, `itertools`
- **NO network access** - use `invoke_edge_function` for HTTP calls

---

### 7. **lovable-chat / gemini-chat / openai-chat / deepseek-chat** (AI Chat)

**Base Structure:**
```typescript
{
  messages: Array<{         // REQUIRED: Conversation history
    role: 'user' | 'assistant' | 'system',
    content: string
  }>,
  session_key?: string,     // OPTIONAL: Session identifier
  session_credentials?: {   // OPTIONAL: API keys/credentials
    openai_api_key?: string,
    gemini_api_key?: string,
    github_oauth_token?: string
  },
  tools?: Array<object>,    // OPTIONAL: Available tools
  context?: object          // OPTIONAL: Additional context
}
```

---

### 8. **knowledge-manager** (Knowledge Base)

**Base Structure:**
```typescript
{
  action: string,           // REQUIRED
  data: object              // Action-specific
}
```

**Actions:**

#### `store_knowledge`
```typescript
{
  action: 'store_knowledge',
  data: {
    category: string,       // REQUIRED: e.g., "technical", "business"
    title: string,          // REQUIRED: Knowledge title
    content: string,        // REQUIRED: Knowledge content
    tags?: string[],        // OPTIONAL: Tags for search
    source?: string         // OPTIONAL: Source reference
  }
}
```

#### `search_knowledge`
```typescript
{
  action: 'search_knowledge',
  data: {
    query: string,          // REQUIRED: Search query
    category?: string,      // OPTIONAL: Filter by category
    limit?: number          // OPTIONAL: Max results (default: 10)
  }
}
```

---

### 9. **SuperDuper Agent Functions** (Specialist Consultations)

All SuperDuper functions follow the same structure:

**Functions:**
- `superduper-business-growth`
- `superduper-code-architect`
- `superduper-communication-outreach`
- `superduper-content-media`
- `superduper-design-brand`
- `superduper-development-coach`
- `superduper-domain-experts`
- `superduper-finance-investment`
- `superduper-integration`
- `superduper-research-intelligence`
- `superduper-social-viral`

**Payload Structure:**
```typescript
{
  messages: Array<{         // REQUIRED: Conversation with specialist
    role: 'user' | 'assistant',
    content: string
  }>,
  specialist_context?: {    // OPTIONAL: Specialist-specific context
    project_details?: object,
    constraints?: string[],
    goals?: string[]
  }
}
```

---

### 10. **mining-proxy** (XMR Mining Stats)

**Base Structure:**
```typescript
{
  action: string            // REQUIRED: Action to perform
}
```

**Actions:**

#### `get_stats`
```typescript
{
  action: 'get_stats'       // Returns pool statistics
}
```

#### `get_worker_stats`
```typescript
{
  action: 'get_worker_stats',
  worker_id?: string        // OPTIONAL: Specific worker ID
}
```

---

### 11. **system-health / system-status** (Monitoring)

**No parameters required:**
```typescript
{}  // Empty object - returns full system status
```

---

### 12. **uspto-patent-mcp** (Patent Search)

**Base Structure:**
```typescript
{
  method: string,           // REQUIRED: Method to call
  params?: object           // OPTIONAL: Method-specific params
}
```

**Methods:**

#### `search_patents`
```typescript
{
  method: 'tools/call',
  params: {
    name: 'search_patents',
    arguments: {
      query: string,        // REQUIRED: Search query
      start?: number,       // OPTIONAL: Start index (default: 0)
      rows?: number         // OPTIONAL: Results per page (default: 20)
    }
  }
}
```

#### `get_patent_details`
```typescript
{
  method: 'tools/call',
  params: {
    name: 'get_patent_details',
    arguments: {
      patent_number: string  // REQUIRED: Patent number
    }
  }
}
```

---

## 🔄 User Acquisition Workflow Functions

### **qualify-lead**
```typescript
{
  session_key: string,      // REQUIRED: Current session
  user_signals: {           // REQUIRED: Detected signals
    mentioned_budget?: boolean,
    has_urgent_need?: boolean,
    company_mentioned?: string,
    use_case_complexity?: 'simple' | 'moderate' | 'complex'
  }
}
```

### **identify-service-interest**
```typescript
{
  user_message: string,     // REQUIRED: User's message
  session_key: string,      // REQUIRED: Session identifier
  conversation_history?: Array<string>  // OPTIONAL: Recent messages
}
```

### **convert-session-to-user**
```typescript
{
  session_key: string,      // REQUIRED: Anonymous session
  email: string             // REQUIRED: User email
}
```

### **generate-stripe-link**
```typescript
{
  service_name: string,     // REQUIRED: Service to purchase
  tier: 'basic' | 'pro' | 'enterprise',  // REQUIRED
  customer_email: string,   // REQUIRED: Customer email
  success_url?: string,     // OPTIONAL: Redirect after payment
  cancel_url?: string       // OPTIONAL: Redirect on cancel
}
```

---

## 📊 Monitoring & Health Functions

### **ecosystem-monitor**
```typescript
{
  check_services?: boolean, // OPTIONAL: Check Vercel services
  generate_tasks?: boolean  // OPTIONAL: Create tasks from issues
}
```

### **api-key-health-monitor**
```typescript
{}  // No parameters - checks all API keys
```

### **check-frontend-health**
```typescript
{
  url?: string              // OPTIONAL: Specific URL to check
}
```

---

## 🎯 Common Patterns

### Pattern 1: Action + Data Structure
Most functions use:
```typescript
{
  action: 'specific_action',
  data: {
    // Action-specific fields
  }
}
```

### Pattern 2: Direct Parameters
Some functions accept parameters directly:
```typescript
{
  field1: value1,
  field2: value2
}
```

### Pattern 3: Messages Array (AI functions)
```typescript
{
  messages: [
    { role: 'user', content: '...' },
    { role: 'assistant', content: '...' }
  ]
}
```

---

## ⚠️ Common Mistakes to Avoid

❌ **Wrong:** Missing `data` wrapper
```typescript
{
  action: 'assign_task',
  title: 'Do something',  // ← Should be in data object
  description: 'Fix bug'
}
```

✅ **Correct:**
```typescript
{
  action: 'assign_task',
  data: {
    title: 'Do something',
    description: 'Fix bug',
    category: 'CODE'
  }
}
```

---

❌ **Wrong:** Incorrect field names
```typescript
{
  action: 'create_issue',
  data: {
    repo_id: 'R_kgDONfvCEw',  // ← Should be repositoryId
    name: 'Bug report'         // ← Should be title
  }
}
```

✅ **Correct:**
```typescript
{
  action: 'create_issue',
  data: {
    repositoryId: 'R_kgDONfvCEw',
    title: 'Bug report',
    body: 'Description here'
  }
}
```

---

## 📝 Function Discovery

To discover available functions and their parameters:

```typescript
// List all functions
await invoke_edge_function('list-available-functions', {});

// Search for specific functions
await invoke_edge_function('search-edge-functions', {
  query: 'github',
  category: 'github'
});
```

---

## 🚀 Quick Reference - Function Categories

| Category | Key Functions | Primary Use |
|----------|--------------|-------------|
| **GitHub** | `github-integration` | Issues, PRs, comments, file access |
| **Tasks** | `agent-manager`, `task-orchestrator` | Task creation, assignment, management |
| **Revenue** | `service-monetization-engine`, `workflow-template-manager` | API keys, billing, automation |
| **AI Chat** | `lovable-chat`, `gemini-chat`, `deepseek-chat` | AI conversations, tool calling |
| **Code** | `python-executor`, `autonomous-code-fixer` | Code execution, auto-fixes |
| **Knowledge** | `knowledge-manager`, `extract-knowledge` | Knowledge storage, search |
| **Monitoring** | `system-health`, `ecosystem-monitor` | System health, metrics |
| **Mining** | `mining-proxy`, `mobile-miner-config` | Mining stats, device management |
| **Specialists** | `superduper-*` functions | Expert consultations |

---

## 📖 When in Doubt

1. **Check this document first** for exact parameter structures
2. **Use `list-available-functions`** to see all functions
3. **Look at function logs** in Supabase dashboard for examples
4. **Test with minimal required fields first**, then add optional fields
5. **Read function source code** in `supabase/functions/{function-name}/index.ts`

---

**Last Updated:** 2025-01-19  
**Total Functions Documented:** 93  
**Maintained by:** Eliza System Documentation
