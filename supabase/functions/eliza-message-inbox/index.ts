import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let body = {};
    try { body = await req.json(); } catch {}
    const action = url.searchParams.get("action") || body.action || "receive";

    if (action === "receive" || action === "check") {
      const { sender, limit = 20, mark_read = true } = body;
      
      let query = supabase
        .from("agent_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      
      if (sender) query = query.eq("sender", sender);
      
      const { data: messages, error } = await query;
      if (error) throw error;
      
      if (mark_read && messages?.length) {
        const ids = messages.map(m => m.id);
        await supabase.from("agent_messages").update({ read: true, read_at: new Date().toISOString() }).in("id", ids);
      }
      
      return new Response(JSON.stringify({ success: true, messages: messages || [], count: messages?.length || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    if (action === "send") {
      const { sender, target, message, thread_id } = body;
      if (!sender || !target || !message) {
        return new Response(JSON.stringify({ success: false, error: "Missing required fields: sender, target, message" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
      }
      const { data, error } = await supabase.from("agent_messages").insert({
        sender, recipient: target, message, thread_id: thread_id || null, read: false, created_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message_id: data.id, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    if (action === "threads") {
      const { agent } = body;
      if (!agent) {
        return new Response(JSON.stringify({ success: false, error: "Missing required field: agent" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
      }
      const { data, error } = await supabase
        .from("agent_messages").select("thread_id, sender, recipient, message, created_at, read")
        .or("sender.eq." + agent + ",recipient.eq." + agent).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      const threads = {};
      for (const msg of data || []) {
        const tid = msg.thread_id || (msg.sender + "-" + msg.recipient);
        if (!threads[tid]) threads[tid] = { thread_id: tid, participants: [...new Set([msg.sender, msg.recipient])], last_message: msg.message, last_message_at: msg.created_at, unread: !msg.read ? 1 : 0 };
        else if (!msg.read) threads[tid].unread++;
      }
      return new Response(JSON.stringify({ success: true, threads: Object.values(threads), count: Object.keys(threads).length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action. Use: send, receive, check, threads" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
