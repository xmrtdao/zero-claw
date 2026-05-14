import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = "https://vawouugtzwmejxqkeqqj.supabase.co";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "inbox") {
      const recipient = body.recipient;
      if (!recipient) return jsonError("'recipient' is required", 400);

      const res = await fetch(
        `${supabaseUrl}/rest/v1/agent_messages?recipient=eq.${recipient}&read=eq.false&order=created_at.asc&limit=${body.limit ?? 20}`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Accept: "application/json",
          },
        }
      );

      const messages = await res.json();
      return jsonOk({ messages });
    }

    if (action === "send") {
      const { sender, recipient, message, thread_id } = body;
      if (!sender || !recipient || !message) {
        return jsonError("'sender', 'recipient', and 'message' are required", 400);
      }

      const res = await fetch(`${supabaseUrl}/rest/v1/agent_messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({ sender, recipient, message, thread_id: thread_id ?? null }),
      });

      const result = await res.json();
      return jsonOk({ message_id: result[0]?.id, created_at: result[0]?.created_at });
    }

    if (action === "mark_read") {
      const { id } = body;
      if (!id) return jsonError("'id' is required", 400);

      await fetch(`${supabaseUrl}/rest/v1/agent_messages?id=eq.${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ read: true, read_at: new Date().toISOString() }),
      });

      return jsonOk({ status: "read", id });
    }

    return jsonError("Use: inbox | send | mark_read", 400);
  } catch (err: any) {
    console.error("agent-message-bus error:", err);
    return jsonError(err.message, 500);
  }
});

function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
