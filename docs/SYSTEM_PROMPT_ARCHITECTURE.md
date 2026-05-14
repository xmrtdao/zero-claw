# Eliza System Prompt Architecture

## Single Source of Truth

**Location:** `supabase/functions/_shared/elizaSystemPrompt.ts`

This file contains the master system prompt that defines Eliza's personality, capabilities, and operational guidelines. All AI edge functions MUST import and use this shared prompt.

## Shared Utilities

### 1. **System Prompt** (`_shared/elizaSystemPrompt.ts`)
- Exports: `generateElizaSystemPrompt()` - Returns the base system prompt
- Contains: Eliza's identity, philosophy, operational guidelines, and tool usage instructions
- Usage: Import and call this function to get the base prompt

### 2. **Tool Definitions** (`_shared/elizaTools.ts`)
- Exports: `ELIZA_TOOLS` - Array of all available tools/functions
- Contains: All agent management, task orchestration, Python execution, and GitHub integration tools
- Usage: Import and pass to AI model's `tools` parameter

### 3. **Context Builder** (`_shared/contextBuilder.ts`)
- Exports: `buildContextualPrompt()` - Enhances base prompt with dynamic context
- Contains: Logic for injecting conversation history, memory, user context, mining stats, system version
- Usage: Pass base prompt and context options to get enhanced prompt

## Architecture Flow

```
User Input
    ↓
UnifiedChat Component (Frontend)
    ↓
unifiedElizaService (calls edge function)
    ↓
1. Import generateElizaSystemPrompt() from _shared/elizaSystemPrompt.ts
2. Import ELIZA_TOOLS from _shared/elizaTools.ts
3. Import buildContextualPrompt() from _shared/contextBuilder.ts
4. Analyze user input → Select appropriate AI Executive
5. Call AI Executive with enhanced prompt + tools
6. Fallback to other executives if primary fails
    ↓
AI Response → User
```

## Intelligent Executive Routing

### How Eliza Selects Executives

Eliza uses the `selectAIExecutive()` method in `unifiedElizaService.ts` to intelligently route requests:

1. **Task Analysis**: Analyzes user input for keywords and context
2. **Executive Selection**: Routes to the most qualified executive
3. **Fallback Chain**: Dynamically builds fallback order if primary fails

### Routing Logic

| Task Type | Executive | Engine | Trigger Keywords |
|-----------|-----------|--------|------------------|
| Code/Technical | CTO (deepseek-chat) | DeepSeek R1 | code, debug, refactor, syntax, error |
| Vision/Media | CIO (gemini-chat) | Gemini Multimodal | image, photo, visual, diagram, screenshot |
| Complex Reasoning | CAO (openai-chat) | GPT-5 | analyze complex, strategic, forecast, predict |
| General | CSO (vercel-ai-chat) | Claude Sonnet 4 | *default for everything else* |

**Primary AI Gateway:** Vercel AI Gateway with Claude Sonnet 4 (CSO) handles all general queries and supports tool calling for database access.

### Code Example

```typescript
// User: "Fix this Python code with a syntax error"
selectAIExecutive("Fix this Python code", context)
// → Returns: "deepseek-chat" (CTO)
// → Fallback chain: deepseek → lovable → gemini → openai

// Try executives in priority order
for (const executive of executiveChain) {
  const { data, error } = await supabase.functions.invoke(executive, { body: requestBody });
  if (!error && data?.success) {
    console.log(`✅ ${executive} (${getExecutiveTitle(executive)}) responded`);
    return data;
  }
}
```

### Executive Titles

```typescript
private static getExecutiveTitle(executive: string): string {
  const titles: Record<string, string> = {
    'vercel-ai-chat': 'Chief Strategy Officer (CSO)',
    'lovable-chat': 'Backup Chief Strategy Officer',
    'deepseek-chat': 'Chief Technology Officer (CTO)',
    'gemini-chat': 'Chief Information Officer (CIO)',
    'openai-chat': 'Chief Analytics Officer (CAO)'
  };
  return titles[executive] || 'Executive';
}
```

### Tool Calling with Vercel AI

The CSO (vercel-ai-chat) supports native tool calling via the Vercel AI SDK:

```typescript
// Available tools for database queries
const tools = {
  getMiningStats: tool({
    description: 'Get current mining statistics',
    parameters: z.object({}),
    execute: async () => {
      const { data } = await supabase.from('active_devices_view').select('*');
      return { activeDevices: data?.length || 0, devices: data };
    }
  }),
  getDAOMemberStats: tool({
    description: 'Get DAO member statistics',
    parameters: z.object({}),
    execute: async () => {
      const { data } = await supabase.from('dao_members').select('*');
      return { totalMembers: data?.length || 0, /* ... */ };
    }
  }),
  getRecentActivity: tool({
    description: 'Get recent autonomous actions',
    parameters: z.object({ limit: z.number().optional() }),
    execute: async ({ limit = 5 }) => {
      const { data } = await supabase
        .from('eliza_activity_log')
        .select('*')
        .limit(limit);
      return { activities: data };
    }
  })
};

// AI can call tools automatically during conversation
const { text, toolCalls } = await generateText({
  model: anthropic('claude-sonnet-4'),
  messages,
  tools,
  maxSteps: 5 // Allow multi-step tool calling
});
```

## DO NOT

❌ **Create additional copies of the system prompt**
- There is ONE source: `_shared/elizaSystemPrompt.ts`
- Do not duplicate prompt content in individual edge functions

❌ **Build custom prompts in individual edge functions**
- Use `generateElizaSystemPrompt()` for the base
- Use `buildContextualPrompt()` to add context

❌ **Hardcode tool definitions in edge functions**
- Import `ELIZA_TOOLS` from `_shared/elizaTools.ts`
- Do not duplicate tool definitions

❌ **Modify prompts differently across endpoints**
- All changes to Eliza's personality/instructions must be made in the shared prompt
- This ensures consistency across all AI endpoints

## DO

✅ **Import shared utilities**
```typescript
import { generateElizaSystemPrompt } from '../_shared/elizaSystemPrompt.ts';
import { ELIZA_TOOLS } from '../_shared/elizaTools.ts';
import { buildContextualPrompt } from '../_shared/contextBuilder.ts';
```

✅ **Build enhanced prompts consistently**
```typescript
const basePrompt = generateElizaSystemPrompt();
const enhancedPrompt = buildContextualPrompt(basePrompt, {
  conversationHistory,
  userContext,
  miningStats,
  systemVersion
});
```

✅ **Use shared tools**
```typescript
body: JSON.stringify({
  model: 'google/gemini-2.5-flash',
  messages: [
    { role: 'system', content: enhancedPrompt },
    ...userMessages
  ],
  tools: ELIZA_TOOLS,
  tool_choice: 'auto'
})
```

✅ **Update the single source when adding capabilities**
- Add new tool definitions to `_shared/elizaTools.ts`
- Add new personality traits to `_shared/elizaSystemPrompt.ts`
- Changes automatically propagate to all endpoints

## Files Using Shared Prompt

| Edge Function | Purpose | Uses Shared Prompt | Uses Shared Tools | Uses Context Builder | Uses Intelligent Routing |
|--------------|---------|-------------------|-------------------|---------------------|-------------------------|
| `lovable-chat` | Primary chat endpoint | ✅ | ✅ | ✅ | ✅ (Frontend) |
| `gemini-chat` | Legacy Gemini endpoint | ✅ | ✅ | ✅ | ✅ (Frontend) |
| `deepseek-chat` | DeepSeek fallback | ✅ | ✅ | ✅ | ✅ (Frontend) |
| `openai-chat` | OpenAI fallback | ✅ | ✅ | ✅ | ✅ (Frontend) |

## Updating Eliza's Capabilities

### Adding a New Tool

1. Edit `supabase/functions/_shared/elizaTools.ts`
2. Add the new tool definition to `ELIZA_TOOLS` array
3. Changes automatically apply to all edge functions

Example:
```typescript
export const ELIZA_TOOLS = [
  // ... existing tools
  {
    type: 'function',
    function: {
      name: 'new_capability',
      description: 'What this new capability does',
      parameters: {
        type: 'object',
        properties: {
          param1: { type: 'string', description: 'Parameter description' }
        },
        required: ['param1']
      }
    }
  }
];
```

### Updating Eliza's Personality

1. Edit `supabase/functions/_shared/elizaSystemPrompt.ts`
2. Modify the `generateElizaSystemPrompt()` function
3. Changes automatically apply to all edge functions

### Adding Context Types

1. Edit `supabase/functions/_shared/contextBuilder.ts`
2. Update the `ContextOptions` interface
3. Update the `buildContextualPrompt()` function logic

### Modifying Executive Routing

1. Edit `src/services/unifiedElizaService.ts`
2. Update `selectAIExecutive()` method with new routing rules
3. Modify keyword patterns or add new task categories
4. Update executive titles in `getExecutiveTitle()` if needed

## Testing Consistency

After making changes, verify:

1. **Personality is consistent:** Send the same question to different endpoints and verify similar responses
2. **Tools are available:** Test tool calling across different endpoints
3. **Context is injected:** Verify memory, conversation history, and user context appear in responses
4. **No regressions:** Check edge function logs for errors
5. **Executive routing works:** Verify correct executive is selected for each task type
6. **Fallback chain activates:** Test that fallback works when primary executive fails

## Benefits of This Architecture

✅ **Single Source of Truth** - Update once, applies everywhere  
✅ **Consistent Personality** - Same Eliza across all endpoints  
✅ **Reduced Code Duplication** - ~600 lines eliminated  
✅ **Easier Maintenance** - No need to sync multiple prompts  
✅ **Better Organization** - Clear separation of concerns  
✅ **Prevents Drift** - No more siloed prompt variations  
✅ **Easier Testing** - One prompt to test instead of many  
✅ **Intelligent Routing** - Right executive for each task type  
✅ **Automatic Fallback** - Guaranteed response even if executive fails  
✅ **Transparent Operation** - Can see which executive handled each request  

## Troubleshooting

### Different responses from different endpoints?
→ Check if all endpoints are using `generateElizaSystemPrompt()` and `buildContextualPrompt()`

### Tool not working in specific endpoint?
→ Verify the endpoint is importing `ELIZA_TOOLS` from `_shared/elizaTools.ts`

### Context not appearing in responses?
→ Check if `buildContextualPrompt()` is being called with the correct options

### Prompt changes not reflected?
→ Restart the edge function or trigger a new deployment

### Wrong executive being selected?
→ Check `selectAIExecutive()` routing rules and keyword patterns  
→ Verify `context.inputMode` is being set correctly

### Executive fallback not working?
→ Check console logs for executive selection and fallback chain  
→ Verify all executives are returning proper response format with `success` and `executive` fields

## Deployment Notes

- Edge functions automatically redeploy when code changes
- No manual deployment needed for prompt/tool updates
- Changes are live immediately after code push
- Frontend service routing updates require browser refresh
