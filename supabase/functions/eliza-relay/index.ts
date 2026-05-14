import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

/**
 * eliza-relay
 * Provides an HTTP endpoint for OpenClaw (or any agent) to send a message to
 * cloud Eliza and optionally wait for a reply.
 *
 * POST /functions/v1/eliza-relay
 * Body:
 *   { "action": "send", "message": "...", "relay_tag": "optional-custom-tag" }
 *     → Posts message to inbox_messages for Eliza to see,
 *       then immediately routes the message through ai-chat and inserts the reply.
 *       Returns { relay_tag, message_id, reply, reply_id }
 *
 *   { "action": "check_reply", "relay_tag": "openclaw-relay-xxxx" }
 *     → Polls for an existing reply matching this relay_tag
 *       Returns { found: true, reply } or { found: false }
 *
 * The local eliza-relay.mjs script writes to inbox_messages directly,
 * then polls Supabase. This edge function gives OpenClaw a single HTTP call
 * that does BOTH steps atomically (send + ai-chat reply) in one round-trip.
 */

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

const OWNER_USER_ID = "1b865599-e9ae-45df-8e50-a2abec6811b4"; // joeyleepcs@gmail.com

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const body = await req.json().catch(() => ({}));
        const action = body.action ?? "send";

        console.log(`📡 eliza-relay action: ${action}`);

        // ── ACTION: send ───────────────────────────────────────────────────────────
        // OpenClaw sends a message, Eliza (via ai-chat) replies immediately.
        if (action === "send") {
            const { message, relay_tag: customTag, agent_name, metadata: extraMeta } =
                body;
            if (!message) {
                return jsonError("'message' field is required", 400);
            }

            const relayTag =
                customTag ??
                `openclaw-relay-${crypto.randomUUID().slice(0, 8)}`;
            const senderName = agent_name ?? "OpenClaw";

            console.log(
                `📨 Relay from ${senderName} [${relayTag}]: ${message.slice(0, 80)}`,
            );

            // 1. Insert the incoming request into inbox_messages (so Eliza's inbox shows it)
            const { data: msgRow, error: insertErr } = await supabase
                .from("inbox_messages")
                .insert({
                    user_id: OWNER_USER_ID,
                    title: `${senderName} Request`,
                    content: message,
                    type: "agent_message",
                    channel: "openclaw",
                    agent_name: senderName,
                    priority: 2,
                    is_read: false,
                    metadata: {
                        relay_tag: relayTag,
                        awaiting_reply: true,
                        source: "eliza-relay-edge-function",
                        ...(extraMeta ?? {}),
                    },
                })
                .select("id")
                .single();

            if (insertErr) {
                console.error("Failed to insert request message:", insertErr);
                return jsonError(insertErr.message, 500);
            }

            const messageId = msgRow.id;
            console.log(`  Stored request as inbox_message ${messageId}`);

            // 2. Route through ai-chat to generate Eliza's reply
            let reply: string;
            try {
                reply = await callAiChat(supabase, message, relayTag, senderName);
            } catch (e: any) {
                console.error("  ai-chat error:", e.message);
                reply = `⚠️ Eliza encountered an error: ${e.message}`;
            }

            // 3. Insert the reply into inbox_messages (eliza-relay.mjs polls for this)
            const { data: replyRow, error: replyInsertErr } = await supabase
                .from("inbox_messages")
                .insert({
                    user_id: OWNER_USER_ID,
                    title: `Eliza Reply: ${senderName} Request`,
                    content: reply,
                    type: "agent_message",
                    channel: "openclaw",
                    agent_name: "Eliza (SuiteAI)",
                    priority: 2,
                    is_read: false,
                    metadata: {
                        relay_tag: relayTag,
                        is_reply: true,
                        source: "eliza-relay-edge-function",
                        original_message_id: messageId,
                    },
                })
                .select("id")
                .single();

            if (replyInsertErr) {
                console.error("  Failed to insert reply:", replyInsertErr);
                // Still return the reply text even if DB insert failed
                return jsonOk({ relay_tag: relayTag, message_id: messageId, reply, reply_id: null });
            }

            // 4. Mark the original request as replied
            await supabase
                .from("inbox_messages")
                .update({
                    is_read: true,
                    metadata: {
                        relay_tag: relayTag,
                        awaiting_reply: false,
                        replied: "true",
                        reply_id: replyRow.id,
                    },
                })
                .eq("id", messageId);

            console.log(`  ✅ Reply stored as ${replyRow.id}`);

            return jsonOk({
                relay_tag: relayTag,
                message_id: messageId,
                reply,
                reply_id: replyRow.id,
            });
        }

        // ── ACTION: check_reply ────────────────────────────────────────────────────
        // Let the local eliza-relay.mjs script poll for a reply without re-calling ai-chat.
        if (action === "check_reply") {
            const { relay_tag } = body;
            if (!relay_tag) {
                return jsonError("'relay_tag' is required for check_reply", 400);
            }

            const { data: rows, error } = await supabase
                .from("inbox_messages")
                .select("id, content, metadata, created_at")
                .eq("channel", "openclaw")
                .filter("metadata->>relay_tag", "eq", relay_tag)
                .filter("metadata->>is_reply", "eq", "true")
                .order("created_at", { ascending: false })
                .limit(1);

            if (error) return jsonError(error.message, 500);

            if (!rows || rows.length === 0) {
                return jsonOk({ found: false, relay_tag });
            }

            const replyRow = rows[0];
            // Mark as read
            await supabase
                .from("inbox_messages")
                .update({ is_read: true })
                .eq("id", replyRow.id);

            return jsonOk({ found: true, relay_tag, reply: replyRow.content, reply_id: replyRow.id });
        }

        // ── ACTION: status ────────────────────────────────────────────────────────
        if (action === "status") {
            return jsonOk({
                status: "ok",
                function: "eliza-relay",
                version: "1.1.0",
                description: "Relay messages from OpenClaw to Eliza (SuiteAI) via ai-chat",
                actions: ["send", "check_reply", "status"],
            });
        }

        return jsonError("Unknown action. Use: send | check_reply | status", 400);
    } catch (err: any) {
        console.error("❌ eliza-relay unhandled error:", err);
        return jsonError(err.message, 500);
    }
});

// ── ai-chat helper ────────────────────────────────────────────────────────────

async function callAiChat(
    supabase: ReturnType<typeof createClient>,
    userMessage: string,
    relayTag: string,
    senderName: string,
): Promise<string> {
    const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
            messages: [{ role: "user", content: userMessage }],
            use_tools: true,
            userContext: {
                source: "eliza-relay-edge-function",
                channel: "openclaw",
                relay_tag: relayTag,
                agent_name: senderName,
            },
        },
    });

    if (error) {
        throw new Error(error.message || "ai-chat invocation failed");
    }

    const reply =
        data?.response ??
        data?.content ??
        data?.choices?.[0]?.message?.content ??
        data?.message ??
        data?.text ??
        null;

    if (!reply || typeof reply !== "string") {
        throw new Error("ai-chat returned no textual response");
    }

    return reply;
}

// ── Response helpers ──────────────────────────────────────────────────────────

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
