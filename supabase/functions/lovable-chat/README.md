# Lovable Chat - Primary AI Gateway Function

**Function Name:** `lovable-chat`  
**Category:** AI Services (PRIMARY)  
**Status:** ✅ Active  
**Models Supported:** Google Gemini 2.5 Flash (via Lovable AI Gateway)

---

## Purpose

This is the **primary AI function** for all XMRT DAO interactions. It provides model-agnostic AI capabilities through the Lovable AI Gateway, supporting multi-step workflows, tool calling, and agent orchestration.

**Use this instead of:**
- ❌ `gemini-chat` (legacy)
- ❌ `openai-chat` (legacy)
- ❌ `deepseek-chat` (legacy)

---

## Capabilities

### **1. Conversational AI**
- Natural language understanding
- Context-aware responses
- Multi-turn conversations
- Session memory management

### **2. Tool Calling**
- Automatic tool discovery
- Parallel tool invocation
- Error handling and retries
- Result synthesis

### **3. Multi-Step Workflows**
- Complex task orchestration
- Dependency management
- Progress tracking
- Conditional logic

### **4. Agent Coordination**
- Task delegation
- Agent spawning/management
- Workload balancing
- Status monitoring

---

## API Reference

### **Request Format**

```typescript
await supabase.functions.invoke('lovable-chat', {
  body: {
    messages: [
      { role: 'system', content: 'You are a helpful assistant...' },
      { role: 'user', content: 'What is the current GitHub activity?' }
    ],
    // Optional parameters:
    model: 'google/gemini-2.5-flash', // Default model
    temperature: 0.7,                 // Creativity (0-1)
    max_tokens: 2000,                 // Response length limit
    tools: [...],                     // Available tools (auto-detected)
    stream: false                     // Enable streaming (not recommended for tools)
  }
});
```

### **Response Format**

```typescript
{
  success: true,
  message: "I've checked the GitHub activity...",
  tool_calls: [
    {
      name: 'github-integration',
      arguments: { action: 'list_issues' },
      result: { issues: [...] }
    }
  ],
  tokens_used: 1234,
  model: 'google/gemini-2.5-flash'
}
```

---

## Usage Examples

### **Example 1: Simple Query**

```typescript
const { data } = await supabase.functions.invoke('lovable-chat', {
  body: {
    messages: [
      { role: 'user', content: 'What is XMRT?' }
    ]
  }
});

console.log(data.message);
// "XMRT is a privacy-focused cryptocurrency token..."
```

### **Example 2: With Tool Calling**

```typescript
const { data } = await supabase.functions.invoke('lovable-chat', {
  body: {
    messages: [
      { role: 'user', content: 'Check the mining stats and summarize' }
    ]
  }
});

console.log(data.tool_calls);
// [{ name: 'mining-proxy', result: { hashrate: ... } }]

console.log(data.message);
// "Current hashrate is 2.5 KH/s with 122k valid shares..."
```

### **Example 3: Multi-Turn Conversation**

```typescript
// Turn 1
let messages = [
  { role: 'user', content: 'List all active agents' }
];

const response1 = await supabase.functions.invoke('lovable-chat', {
  body: { messages }
});

messages.push({ role: 'assistant', content: response1.data.message });

// Turn 2
messages.push({ role: 'user', content: 'Assign the first one a new task' });

const response2 = await supabase.functions.invoke('lovable-chat', {
  body: { messages }
});
```

### **Example 4: With Custom System Prompt**

```typescript
const { data } = await supabase.functions.invoke('lovable-chat', {
  body: {
    messages: [
      { 
        role: 'system', 
        content: 'You are a DeFi expert. Explain concepts in simple terms.' 
      },
      { role: 'user', content: 'What is liquidity mining?' }
    ]
  }
});
```

---

## Tool Integration

The function **automatically detects and invokes** edge functions when needed. Available tools are loaded from `edgeFunctionRegistry.ts`.

**How it works:**
1. User asks: "Check GitHub activity"
2. AI recognizes need for `github-integration` tool
3. Function invokes tool automatically
4. AI synthesizes results into response

**Supported tools:**
- All functions in `edgeFunctionRegistry.ts`
- Agent management (`agent-manager`)
- GitHub operations (`github-integration`)
- Mining stats (`mining-proxy`)
- System health (`system-status`, `system-diagnostics`)
- And 30+ more...

---

## Error Handling

### **Rate Limiting (429)**

```typescript
{
  success: false,
  error: "Rate limit exceeded. Please try again later.",
  retry_after: 60 // seconds
}
```

**Solution:** Implement exponential backoff or reduce request frequency

### **Payment Required (402)**

```typescript
{
  success: false,
  error: "Lovable AI credits exhausted. Please add credits to workspace.",
  billing_url: "https://lovable.dev/settings/billing"
}
```

**Solution:** Top up credits in Lovable workspace settings

### **Tool Failure**

```typescript
{
  success: true, // AI still responds
  message: "I attempted to check GitHub but the API is unavailable.",
  tool_calls: [
    {
      name: 'github-integration',
      error: "Connection timeout"
    }
  ]
}
```

**Solution:** AI provides graceful fallback response

---

## Performance Optimization

### **1. Minimize Token Usage**

```typescript
// ❌ Inefficient: Long system prompt every time
messages: [
  { role: 'system', content: '5000 words of instructions...' },
  { role: 'user', content: 'Hi' }
]

// ✅ Efficient: Concise system prompt
messages: [
  { role: 'system', content: 'You are a helpful XMRT assistant.' },
  { role: 'user', content: 'Hi' }
]
```

### **2. Reuse Conversations**

```typescript
// ✅ Store conversation in session
const session = await getSession(userId);
session.messages.push({ role: 'user', content: newMessage });

await supabase.functions.invoke('lovable-chat', {
  body: { messages: session.messages }
});
```

### **3. Parallel Tool Calls**

The AI automatically parallelizes independent tool calls:

```typescript
// User: "Check GitHub activity AND mining stats"
// AI invokes both tools simultaneously:
// - github-integration
// - mining-proxy
// Then synthesizes combined response
```

---

## Security Considerations

### **1. API Key Protection**

- ✅ `LOVABLE_API_KEY` is stored in Supabase secrets
- ✅ Never exposed to client
- ✅ Rotated automatically by Lovable

### **2. Rate Limiting**

- Lovable AI Gateway enforces per-workspace limits
- Implement client-side throttling for high-volume apps
- Monitor usage in Lovable dashboard

### **3. Input Validation**

```typescript
// Always validate user input
const sanitized = sanitizeInput(userMessage);

await supabase.functions.invoke('lovable-chat', {
  body: {
    messages: [
      { role: 'user', content: sanitized }
    ]
  }
});
```

---

## Monitoring & Debugging

### **1. View Function Logs**

[View logs in Supabase Dashboard](https://supabase.com/dashboard/project/vawouugtzwmejxqkeqqj/functions/lovable-chat/logs)

### **2. Track Token Usage**

```typescript
const { data } = await supabase.functions.invoke('lovable-chat', { ... });
console.log('Tokens used:', data.tokens_used);

// Track daily usage
await supabase.from('ai_usage_logs').insert({
  function: 'lovable-chat',
  tokens: data.tokens_used,
  cost: data.tokens_used * 0.0001 // Example pricing
});
```

### **3. Error Tracking**

```typescript
try {
  const { data, error } = await supabase.functions.invoke('lovable-chat', { ... });
  
  if (error) {
    console.error('Invocation error:', error);
    // Log to monitoring service
  }
  
  if (!data.success) {
    console.error('AI error:', data.error);
    // Handle gracefully
  }
} catch (e) {
  console.error('Network error:', e);
  // Retry with exponential backoff
}
```

---

## Migration from Legacy Functions

### **From `gemini-chat`:**

```typescript
// Before (legacy):
await supabase.functions.invoke('gemini-chat', {
  body: { message: 'Hello' }
});

// After (recommended):
await supabase.functions.invoke('lovable-chat', {
  body: {
    messages: [
      { role: 'user', content: 'Hello' }
    ]
  }
});
```

### **From `openai-chat`:**

```typescript
// Before (legacy):
await supabase.functions.invoke('openai-chat', {
  body: { 
    model: 'gpt-4',
    message: 'Hello' 
  }
});

// After (recommended):
await supabase.functions.invoke('lovable-chat', {
  body: {
    messages: [
      { role: 'user', content: 'Hello' }
    ],
    model: 'google/gemini-2.5-flash' // Or keep gpt-4 when available
  }
});
```

---

## Cost Estimation

**Lovable AI Gateway Pricing (Gemini 2.5 Flash):**
- FREE during Oct 10-13, 2025
- After trial: ~$0.0001 per 1K tokens
- Average conversation: 500-2000 tokens
- Cost per conversation: $0.00005 - $0.0002

**Example monthly cost:**
- 10,000 conversations/month
- Average 1000 tokens each
- Total: 10M tokens
- Cost: ~$1.00/month

---

## Related Documentation

- [Agent Management Guide](../../docs/AGENT_MANAGEMENT_GUIDE.md)
- [Edge Function Registry](../../src/services/edgeFunctionRegistry.ts)
- [Eliza System Prompt](../../src/services/elizaSystemPrompt.ts)
- [Edge Function Consolidation](../../docs/EDGE_FUNCTION_CONSOLIDATION.md)

---

## Support

**Issues with this function?**
1. Check [function logs](https://supabase.com/dashboard/project/vawouugtzwmejxqkeqqj/functions/lovable-chat/logs)
2. Verify `LOVABLE_API_KEY` is set in secrets
3. Check Lovable AI credits balance
4. Review error messages in response
5. Contact Lovable support if persistent issues
