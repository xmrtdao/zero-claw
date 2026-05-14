# Vercel AI SDK Integration

## Overview

XMRT-DAO uses the Vercel AI SDK as the primary AI gateway for all conversational AI features. This document outlines the architecture, model selection, tool calling, and optimization strategies.

## Architecture

### Core Components

1. **Non-Streaming Endpoint**: `supabase/functions/vercel-ai-chat/index.ts`
   - Uses `generateText()` from Vercel AI SDK
   - Supports tool calling for database queries
   - Returns complete responses with metadata

2. **Streaming Endpoint**: `supabase/functions/vercel-ai-chat-stream/index.ts`
   - Uses `streamText()` from Vercel AI SDK
   - Real-time token-by-token responses
   - Server-Sent Events (SSE) format

3. **Fallback Chain**: Vercel AI → DeepSeek → Lovable AI → Office Clerk
   - Automatic failover if primary service unavailable
   - Maintains service availability during outages

## Model Selection

### Available Models

We use Anthropic Claude models through Vercel AI Gateway:

- **`claude-sonnet-4`** (Default) - Latest flagship model
  - Best for: General conversation, strategic planning, complex reasoning
  - Performance: Excellent across all tasks
  - Cost: Moderate

- **`claude-opus-4`** - Most capable model
  - Best for: Highly complex reasoning, critical decisions
  - Performance: Superior reasoning and nuance
  - Cost: Highest

- **`claude-3-7-sonnet`** - Extended thinking
  - Best for: Deep strategic analysis, multi-step planning
  - Performance: Extended context reasoning
  - Cost: Moderate-High

- **`claude-3-5-haiku`** - Fastest model
  - Best for: Simple queries, quick responses
  - Performance: Fast but less nuanced
  - Cost: Lowest

### Model Selection Guide

```typescript
// Simple query → Use Haiku
if (isSimpleQuery(userInput)) {
  model = anthropic('claude-3-5-haiku');
}

// Complex reasoning → Use Opus
if (requiresDeepReasoning(userInput)) {
  model = anthropic('claude-opus-4');
}

// Default → Use Sonnet 4
model = anthropic('claude-sonnet-4');
```

## Tool Calling

### Available Tools

The Vercel AI integration provides four database query tools:

#### 1. getMiningStats
```typescript
{
  description: 'Get current mining statistics',
  parameters: z.object({}),
  returns: {
    activeDevices: number,
    devices: Device[],
    timestamp: string
  }
}
```

**Use Case**: "How many miners are active?"

#### 2. getDAOMemberStats
```typescript
{
  description: 'Get DAO member statistics',
  parameters: z.object({}),
  returns: {
    totalMembers: number,
    totalVotingPower: number,
    totalContributions: number,
    timestamp: string
  }
}
```

**Use Case**: "What's our current voting power?"

#### 3. getRecentActivity
```typescript
{
  description: 'Get recent autonomous actions',
  parameters: z.object({
    limit: z.number().optional().default(5)
  }),
  returns: {
    activities: Activity[],
    count: number,
    timestamp: string
  }
}
```

**Use Case**: "What has Eliza been doing lately?"

#### 4. getDeviceHealth
```typescript
{
  description: 'Get battery health statistics',
  parameters: z.object({
    deviceId: z.string().optional()
  }),
  returns: {
    healthSnapshots: HealthSnapshot[],
    count: number,
    timestamp: string
  }
}
```

**Use Case**: "How's my device battery health?"

### Multi-Step Tool Calling

The AI can chain multiple tool calls:

```
User: "Give me a full system status report"

Step 1: Call getMiningStats()
Step 2: Call getDAOMemberStats()
Step 3: Call getRecentActivity()
Step 4: Synthesize comprehensive report
```

Maximum steps allowed: **5**

## Streaming Implementation

### Backend (Edge Function)

```typescript
const result = await streamText({
  model: anthropic('claude-sonnet-4'),
  messages,
  maxTokens: 4000,
  temperature: 0.7,
  apiKey: VERCEL_API_KEY
});

// Return SSE stream
for await (const textPart of result.textStream) {
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({
      type: 'text',
      content: textPart
    })}\n\n`)
  );
}
```

### Frontend (React)

```typescript
const eventSource = new EventSource(
  `${SUPABASE_URL}/functions/v1/vercel-ai-chat-stream`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'text') {
    appendToMessage(data.content);
  }
  
  if (data.type === 'done') {
    console.log('Tokens used:', data.usage);
    eventSource.close();
  }
};
```

## Cost Optimization

### 1. Prompt Caching

Cache system prompts to reduce costs:

```typescript
messages: [
  { 
    role: 'system', 
    content: systemPrompt,
    // Cache for 5 minutes
    experimental_providerMetadata: {
      anthropic: { cacheControl: { type: 'ephemeral' } }
    }
  }
]
```

**Savings**: ~90% reduction on repeated system prompts

### 2. Smart Model Selection

Use cheaper models when appropriate:

- Simple queries → Haiku (5x cheaper)
- Complex reasoning → Sonnet 4 (default)
- Critical decisions → Opus (highest quality)

### 3. Request Batching

For bulk operations, batch requests:

```typescript
const results = await Promise.all(
  queries.map(q => generateText({ model, messages: q.messages }))
);
```

### 4. Token Limiting

Set appropriate `maxTokens` based on task:

- Simple answers: 500 tokens
- Detailed explanations: 2000 tokens
- Complex reports: 4000 tokens

## Error Handling

### Rate Limits (429)

```typescript
try {
  const { text } = await generateText({ ... });
} catch (error) {
  if (error.statusCode === 429) {
    // Fallback to DeepSeek
    return await fallbackToDeepSeek(messages);
  }
}
```

### Credit Depletion (402)

```typescript
if (error.statusCode === 402) {
  return {
    error: 'Vercel AI credits depleted. Please add credits.',
    helpUrl: 'https://vercel.com/account/billing'
  };
}
```

### Service Unavailable (503)

Automatic fallback chain:
1. Vercel AI Gateway fails
2. Try DeepSeek
3. Try Lovable AI
4. Fall back to Office Clerk (local WebGPU)

## Usage Tracking

Every response includes usage metrics:

```json
{
  "success": true,
  "response": "...",
  "usage": {
    "promptTokens": 1234,
    "completionTokens": 567,
    "totalTokens": 1801
  },
  "finishReason": "stop",
  "provider": "vercel_ai",
  "model": "claude-sonnet-4"
}
```

## Best Practices

### 1. System Prompts

- Keep system prompts under 2000 tokens
- Use prompt caching for repeated prompts
- Include relevant context only

### 2. Tool Calling

- Define clear tool descriptions
- Use Zod for parameter validation
- Handle tool errors gracefully
- Limit to 5 tool steps max

### 3. Streaming

- Use streaming for long responses (>1000 tokens)
- Handle connection drops gracefully
- Implement client-side buffering
- Show typing indicators

### 4. Cost Management

- Monitor usage with `usage` metrics
- Use Haiku for 80% of simple queries
- Reserve Opus for critical operations
- Implement rate limiting per user

## Testing

### Basic Response
```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/vercel-ai-chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is XMRT?"}]}'
```

### Tool Calling
```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/vercel-ai-chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"How many miners are active?"}]}'
```

### Streaming
```bash
curl -N https://<project-ref>.supabase.co/functions/v1/vercel-ai-chat-stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Explain XMRT in detail"}]}'
```

## Performance Metrics

### Target Metrics

- **Response Time**: <3s for typical queries
- **Streaming Latency**: <100ms for first token
- **Tool Call Overhead**: <500ms per tool
- **Error Rate**: <1%
- **Cost Per Query**: <$0.01 average

### Monitoring

Track these metrics in production:

```typescript
{
  totalTokens: usage.totalTokens,
  responseTime: endTime - startTime,
  toolCallCount: toolCalls.length,
  model: aiModel,
  finishReason: finishReason
}
```

## Migration Notes

### From Raw HTTP to SDK

**Before:**
```typescript
const response = await fetch('https://api.vercel.com/v1/ai/chat', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${key}` },
  body: JSON.stringify({ model, messages })
});
const data = await response.json();
```

**After:**
```typescript
const { text, usage } = await generateText({
  model: anthropic('claude-sonnet-4'),
  messages,
  apiKey: key
});
```

**Benefits:**
- 50% less code
- Built-in retries
- Type-safe responses
- Automatic error handling
- Usage tracking included

## Troubleshooting

### Import Errors in Deno

Use `npm:` specifiers:
```typescript
import { anthropic } from "npm:@ai-sdk/anthropic@1.0.0";
import { generateText } from "npm:ai@4.0.0";
```

### Tool Not Called

Check:
1. Tool description is clear
2. Parameters match user query
3. `maxSteps` is sufficient (default: 5)
4. Tool execution doesn't throw errors

### Streaming Breaks

Ensure:
1. Client handles SSE format correctly
2. Network supports long-lived connections
3. Proper error handling in stream reader
4. Cleanup on component unmount

## Resources

- [Vercel AI SDK Docs](https://vercel.com/docs/ai-sdk)
- [Anthropic Claude Models](https://docs.anthropic.com/claude/docs/models-overview)
- [Tool Calling Guide](https://vercel.com/docs/ai-sdk/tools-and-tool-calling)
- [Streaming Guide](https://vercel.com/docs/ai-sdk/streaming)

## Support

For issues or questions:
- Check edge function logs: `https://supabase.com/dashboard/project/<project-id>/functions/vercel-ai-chat/logs`
- Review usage metrics in response objects
- Test with different models (Haiku → Sonnet → Opus)
- Verify API key health in ExecutiveStatusIndicator
