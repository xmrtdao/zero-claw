// eliza-direct
// Stripped-down AI chat that bypasses the tool iteration gatekeeper.
// Call this when you want a direct answer without forced inventory loops.
// Usage: POST { "userQuery": "hello", "execute_tools": false, "session_id": "optional" }
// If execute_tools is true, it runs ONE tool pass max (not 5).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || 'https://vawouugtzwmejxqkeqqj.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const requestId = crypto.randomUUID()
  const startTime = Date.now()

  try {
    const { userQuery, execute_tools = false, session_id, executive_name = 'Eliza' } = await req.json()

    if (!userQuery) {
      return new Response(JSON.stringify({ error: 'Missing userQuery' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Simple, minimal system prompt — NO historical summaries, NO forced tools
    const systemPrompt = `You are ${executive_name}, an AI assistant for XMRT DAO. Answer directly and concisely. Only use tools if explicitly asked.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery }
    ]

    // Call DeepSeek directly (same as ai-chat but without the loop)
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 4000,
        stream: false
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`DeepSeek API error ${response.status}: ${errText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Optional: single tool pass if requested
    let toolsExecuted = 0
    if (execute_tools) {
      // Parse any tool calls from the content (using the same regex as ai-chat)
      const toolCalls = parseToolCalls(content)
      if (toolCalls.length > 0) {
        console.log(`[eliza-direct] Executing ${toolCalls.length} tool(s) (max 1 pass)`)
        const results = await Promise.all(toolCalls.map(tc => executeTool(tc)))
        toolsExecuted = results.length
        // Append results to content
        const resultSummary = results.map(r => `**${r.name}**: ${JSON.stringify(r.result).slice(0,200)}`).join('\n')
        // Re-call DeepSeek with tool results for synthesis
        const followUpMessages = [
          ...messages,
          { role: 'assistant', content },
          { role: 'user', content: `Tool results:\n${resultSummary}\n\nPlease summarize.` }
        ]
        const followUp = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: followUpMessages,
            temperature: 0.7,
            max_tokens: 4000
          })
        })
        const followData = await followUp.json()
        return new Response(JSON.stringify({
          success: true,
          content: followData.choices?.[0]?.message?.content || content,
          executive: executive_name,
          provider: 'deepseek',
          model: 'deepseek-chat',
          toolsExecuted,
          request_id: requestId,
          executionTimeMs: Date.now() - startTime,
          note: 'Direct mode. Tool execution capped at 1 pass. No gatekeeper loop.'
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      content,
      executive: executive_name,
      provider: 'deepseek',
      model: 'deepseek-chat',
      toolsExecuted,
      request_id: requestId,
      executionTimeMs: Date.now() - startTime,
      note: 'Direct mode. No gatekeeper. No forced tool loop.'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
      request_id: requestId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Simple tool call parser (same regex patterns as ai-chat, but no loop)
function parseToolCalls(content: string): any[] {
  const calls: any[] = []
  // DeepSeek format: 🫎...🫎
  const deepSeekMatch = content.match(/🫎(.*?)🫎/s)
  if (deepSeekMatch) {
    const toolPattern = /🔧(.*?)🔧(.*?)🔧/gs
    let m
    while ((m = toolPattern.exec(deepSeekMatch[1])) !== null) {
      try {
        calls.push({ name: m[1].trim(), args: JSON.parse(m[2].trim() || '{}') })
      } catch { /* ignore parse errors */ }
    }
  }
  return calls
}

// Tool dispatcher (minimal — extend as needed)
async function executeTool(tool: any): Promise<{ name: string; result: any }> {
  console.log(`[eliza-direct] Tool: ${tool.name}`, tool.args)
  try {
    // For now, just return a placeholder. In production, wire to actual edge functions.
    return { name: tool.name, result: { status: 'placeholder', note: 'Tool execution not wired in direct mode' } }
  } catch (e) {
    return { name: tool.name, result: { error: e.message } }
  }
}
