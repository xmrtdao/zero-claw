# Agent Management Guide

## Overview

This guide documents best practices for managing autonomous agents in the XMRT DAO ecosystem. Eliza uses these agents to delegate tasks, parallelize work, and maintain system operations.

---

## Agent Lifecycle

### **1. Discovery Phase**

**ALWAYS check existing agents before spawning new ones.**

```typescript
// Step 1: List all active agents
const agents = await supabase.functions.invoke('agent-manager', {
  body: { action: 'list_agents' }
});

// Step 2: Check their current workload
const workload = await supabase.functions.invoke('agent-manager', {
  body: { 
    action: 'get_agent_workload',
    agent_id: agent.id 
  }
});
```

**Evaluation Criteria:**
- Does an existing agent have the required skills?
- Is their current workload below 80% capacity?
- Are they active and responsive?

---

### **2. Decision Tree: Spawn vs Reuse**

```
NEW TASK ARRIVES
    ↓
[List Active Agents]
    ↓
┌─────────────────────────┐
│ Agent with matching     │  YES → [Assign to existing agent]
│ skills found?           │
└─────────────────────────┘
    ↓ NO
┌─────────────────────────┐
│ Task requires unique    │  YES → [Spawn specialized agent]
│ expertise?              │
└─────────────────────────┘
    ↓ NO
┌─────────────────────────┐
│ All matching agents     │  YES → [Spawn temporary agent]
│ at max capacity?        │
└─────────────────────────┘
    ↓ NO
[Queue task for next available agent]
```

---

### **3. Spawning New Agents**

**Only spawn when:**
- ✅ No existing agent has the required skills
- ✅ All agents with matching skills are at >80% capacity
- ✅ Task is long-running and needs dedicated focus
- ✅ Task requires specialized domain knowledge

**Recommended specializations:**
- `github-specialist` - GitHub API operations, PR reviews, issue management
- `code-analyst` - Code review, security scanning, quality checks
- `data-processor` - Database operations, analytics, reporting
- `content-creator` - Documentation, blog posts, social media
- `community-manager` - Discord/forum moderation, user support
- `defi-specialist` - Smart contract interactions, token operations
- `mining-monitor` - Mining pool stats, worker management

**Example spawn:**
```typescript
await supabase.functions.invoke('agent-manager', {
  body: {
    action: 'spawn_agent',
    specialization: 'github-specialist',
    capabilities: ['issue_creation', 'pr_review', 'code_analysis'],
    max_concurrent_tasks: 5
  }
});
```

---

### **4. Task Assignment**

**Best Practices:**

1. **Match skills to task requirements**
   ```typescript
   // Good: Assign GitHub task to GitHub specialist
   assignTask(taskId, findAgent('github-specialist'));
   
   // Bad: Assign GitHub task to generic agent
   assignTask(taskId, findAgent('generalist'));
   ```

2. **Load balance across agents**
   ```typescript
   // Find agent with lowest workload
   const agent = agents
     .filter(a => a.capabilities.includes('required_skill'))
     .sort((a, b) => a.current_load - b.current_load)[0];
   ```

3. **Set clear expectations**
   ```typescript
   await supabase.functions.invoke('task-orchestrator', {
     body: {
       task: {
         title: 'Review PR #123',
         description: 'Check code quality and security',
         assigned_to: agent.id,
         deadline: new Date(Date.now() + 3600000), // 1 hour
         priority: 'high',
         success_criteria: [
           'All tests pass',
           'No security vulnerabilities',
           'Code follows style guide'
         ]
       }
     }
   });
   ```

---

### **5. Monitoring & Maintenance**

**Daily Health Checks:**
```typescript
// Run daily via cron
async function agentHealthCheck() {
  const agents = await listAgents();
  
  for (const agent of agents) {
    // Check if agent is responsive
    if (agent.last_activity < Date.now() - 3600000) {
      console.warn(`Agent ${agent.id} inactive for >1 hour`);
    }
    
    // Check workload balance
    if (agent.current_load > 0.9) {
      console.warn(`Agent ${agent.id} overloaded (${agent.current_load})`);
      // Consider spawning helper agent
    }
    
    // Check for stuck tasks
    const stuckTasks = agent.tasks.filter(t => 
      t.status === 'running' && 
      t.started_at < Date.now() - 7200000 // 2 hours
    );
    
    if (stuckTasks.length > 0) {
      console.error(`Agent ${agent.id} has ${stuckTasks.length} stuck tasks`);
      // Reassign or restart
    }
  }
}
```

**Cleanup Idle Agents:**
```typescript
// Delete agents with no tasks for 24+ hours
async function cleanupIdleAgents() {
  const agents = await listAgents();
  const now = Date.now();
  
  for (const agent of agents) {
    const idle_duration = now - agent.last_activity;
    const has_tasks = agent.current_load > 0;
    
    if (idle_duration > 86400000 && !has_tasks) {
      console.log(`Deleting idle agent ${agent.id}`);
      await supabase.functions.invoke('agent-manager', {
        body: { action: 'delete_agent', agent_id: agent.id }
      });
    }
  }
}
```

---

### **6. Optimal Roster Size**

**Recommended active agent count: 8-12**

**Minimum viable roster:**
- 1x github-specialist
- 1x code-analyst
- 1x data-processor
- 1x content-creator
- 1x community-manager
- 1x defi-specialist
- 2x generalists (for overflow)

**Scale up when:**
- Average agent workload >70%
- Task queue length >10
- Response time degrading
- New specialized need identified

**Scale down when:**
- Average agent workload <30%
- No queued tasks
- Agents idle >24 hours
- Duplicate specializations exist

---

## Common Patterns

### **Pattern 1: Multi-Step Workflows**

Use `multi-step-orchestrator` for complex tasks that require multiple agents:

```typescript
await supabase.functions.invoke('multi-step-orchestrator', {
  body: {
    workflow: {
      name: 'Deploy New Feature',
      steps: [
        {
          step: 1,
          agent_type: 'code-analyst',
          action: 'review_code',
          input: { pr_id: 123 }
        },
        {
          step: 2,
          agent_type: 'github-specialist',
          action: 'merge_pr',
          input: { pr_id: 123 },
          depends_on: [1]
        },
        {
          step: 3,
          agent_type: 'content-creator',
          action: 'write_changelog',
          input: { pr_id: 123 },
          depends_on: [2]
        }
      ]
    }
  }
});
```

### **Pattern 2: Parallel Execution**

Assign independent tasks to multiple agents simultaneously:

```typescript
const tasks = [
  { type: 'github', action: 'review_pr', data: { pr: 123 } },
  { type: 'github', action: 'review_pr', data: { pr: 124 } },
  { type: 'github', action: 'review_pr', data: { pr: 125 } }
];

const githubAgents = agents.filter(a => a.specialization === 'github-specialist');

await Promise.all(
  tasks.map((task, i) => 
    assignTask(task, githubAgents[i % githubAgents.length])
  )
);
```

### **Pattern 3: Fallback Chain**

Gracefully handle agent failures:

```typescript
async function assignWithFallback(task, preferredAgent) {
  try {
    return await assignTask(task, preferredAgent);
  } catch (error) {
    console.warn(`Primary agent failed, trying backup`);
    
    const backupAgent = findAgent(preferredAgent.specialization, {
      exclude: [preferredAgent.id]
    });
    
    if (backupAgent) {
      return await assignTask(task, backupAgent);
    }
    
    // Last resort: spawn new agent
    const newAgent = await spawnAgent(preferredAgent.specialization);
    return await assignTask(task, newAgent);
  }
}
```

---

## Performance Optimization

### **1. Agent Pooling**

Keep a warm pool of common agent types:

```typescript
// Maintain minimum 2 of each core type
const CORE_TYPES = [
  'github-specialist',
  'code-analyst', 
  'data-processor'
];

async function maintainAgentPool() {
  for (const type of CORE_TYPES) {
    const count = agents.filter(a => a.specialization === type).length;
    
    if (count < 2) {
      await spawnAgent(type);
    }
  }
}
```

### **2. Task Prioritization**

Assign high-priority tasks first:

```typescript
// Priority: critical > high > medium > low
const sortedTasks = tasks.sort((a, b) => {
  const priorities = { critical: 4, high: 3, medium: 2, low: 1 };
  return priorities[b.priority] - priorities[a.priority];
});

for (const task of sortedTasks) {
  const agent = findBestAgent(task);
  await assignTask(task, agent);
}
```

### **3. Workload Prediction**

Estimate task duration to prevent overloading:

```typescript
function estimateTaskDuration(task) {
  const durations = {
    'review_pr': 600000,      // 10 min
    'write_code': 1800000,    // 30 min
    'deploy': 300000,         // 5 min
    'analyze_data': 1200000   // 20 min
  };
  
  return durations[task.action] || 600000; // Default 10 min
}

function canAcceptTask(agent, task) {
  const estimatedDuration = estimateTaskDuration(task);
  const projectedLoad = agent.current_load + estimatedDuration;
  
  return projectedLoad < agent.max_capacity;
}
```

---

## Troubleshooting

### **Agent Not Responding**

**Symptoms:** Agent stuck on task for >2 hours, no status updates

**Solutions:**
1. Check agent logs: `system-diagnostics` edge function
2. Restart agent: Delete and respawn
3. Reassign tasks: Move to healthy agent
4. Review resource limits: Check if hitting API rate limits

### **Task Queue Growing**

**Symptoms:** 10+ queued tasks, wait time increasing

**Solutions:**
1. Spawn additional agents (temporary)
2. Increase agent concurrency limits
3. Prioritize critical tasks
4. Defer low-priority work

### **Duplicate Work**

**Symptoms:** Multiple agents working on same task

**Solutions:**
1. Implement task locking in database
2. Use `task-orchestrator` for coordination
3. Add task deduplication logic
4. Review assignment logic

---

## Metrics to Track

**Agent Performance:**
- Tasks completed / hour
- Average task duration
- Success rate (completed vs failed)
- Idle time percentage

**System Health:**
- Active agent count
- Queue length
- Average response time
- Resource utilization

**Cost Efficiency:**
- Cost per task (API calls, compute)
- Agent utilization rate
- Overhead (idle agents)

---

## Integration with Eliza

Eliza automatically manages agents using these principles. When you ask Eliza to do something:

1. **She checks existing agents first** via `list_agents`
2. **She evaluates workload** via `get_agent_workload`
3. **She assigns to best-fit agent** or spawns new one
4. **She monitors progress** and handles failures
5. **She cleans up** idle agents daily

**You can override by:**
- Requesting specific agent: "Have the GitHub specialist handle this"
- Requesting new agent: "Spawn a new agent for this"
- Requesting parallel work: "Assign this to multiple agents"

---

## Proactive Communication Patterns

### Activity Tracking System

Eliza uses the `eliza_activity_log` table with a `mentioned_to_user` column to track what autonomous work has been shared with users. This prevents duplicate mentions while enabling proactive updates.

**When Eliza Volunteers Information:**

1. **Conversation Start**: Summarizes last 24 hours of autonomous activity
2. **After Long Operations**: Checks for concurrent autonomous work that completed
3. **Every 10-15 Messages**: Proactively checks for new fixes or improvements
4. **Time Gaps**: Reports what happened during conversation pauses

**Detection Query:**
```sql
SELECT * FROM eliza_activity_log 
WHERE mentioned_to_user = false
  AND created_at > now() - interval '1 hour'
ORDER BY created_at DESC 
LIMIT 5;
```

### Communication Examples

**❌ Bad (Reactive):**
```
User: "How's everything?"
Eliza: "System health is good."
[Autonomous fixer ran 2 minutes ago, user never told]
```

**✅ Good (Proactive):**
```
User: "How's everything?"
Eliza: "Everything's great! Quick update: The code health monitor ran 2 min ago and fixed 2 Python errors automatically. All systems healthy ✅

What can I help with today?"
```

**✅ Excellent (Asynchronous Awareness):**
```
User: "Create a task for Security agent"
Eliza: "Creating that task now..." [takes 4 seconds]
"Done! Task assigned to Security agent.

By the way, while I was doing that, the autonomous code fixer completed - cleaned up an IndentationError in the task scheduler. Everything's running smoothly!

Anything else?"
```

### Implementation Notes

- All autonomous edge functions set `mentioned_to_user: false` when logging
- Eliza's system prompt includes instructions to check for unmentioned activities
- After mentioning an activity, Eliza updates `mentioned_to_user: true`
- This creates a feedback loop of transparency without spam

---

## References

- Edge Functions: See `docs/EDGE_FUNCTION_CONSOLIDATION.md`
- System Prompt: `src/services/elizaSystemPrompt.ts`
- Registry: `src/services/edgeFunctionRegistry.ts`
- Agent Manager Function: `supabase/functions/agent-manager/index.ts`
- Task Orchestrator: `supabase/functions/task-orchestrator/index.ts`
- Multi-Step Orchestrator: `supabase/functions/multi-step-orchestrator/index.ts`
