import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type GoogleInvokeResult<T> = {
    success?: boolean;
    result?: T;
    error?: string;
    [key: string]: unknown;
};

async function invokeGoogleGmail<T>(
    supabase: ReturnType<typeof createClient>,
    body: Record<string, unknown>
): Promise<T> {
    const { data, error } = await supabase.functions.invoke('google-gmail', { body });

    if (error) {
        throw error;
    }

    const payload = (data ?? {}) as GoogleInvokeResult<T>;
    if (payload.success === false) {
        throw new Error(payload.error || 'google-gmail returned success=false');
    }

    return (payload.result ?? (payload as unknown)) as T;
}

/**
 * sync-gmail-v2 — Edge function to sync email replies back to the Suite inbox.
 */
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const EXECUTIVE_USER_ID = Deno.env.get('EXECUTIVE_USER_ID');
        if (!EXECUTIVE_USER_ID) {
            throw new Error('EXECUTIVE_USER_ID environment variable is not set');
        }

        console.log('[sync-gmail-v2] 🔄 Starting Gmail sync...');

        // Step 1: List unread messages
        const listData = await invokeGoogleGmail<{ messages?: Array<{ id: string }> }>(supabase, {
            action: 'list_emails',
            query: 'is:unread'
        });

        const messages = listData?.messages || [];
        console.log(`[sync-gmail-v2] Found ${messages.length} unread messages.`);

        const processed: string[] = [];

        for (const msg of messages) {
            try {
                // Step 2: Get message details
                const detailData = await invokeGoogleGmail<any>(supabase, {
                    action: 'get_email',
                    message_id: msg.id
                });

                const headers = detailData.payload?.headers || [];
                const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
                const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '';

                const emailMatch = fromHeader.match(/<(.+)>|(\S+@\S+)/);
                const senderEmail = emailMatch ? (emailMatch[1] || emailMatch[2]) : fromHeader;

                if (!senderEmail) continue;

                console.log(`[sync-gmail-v2] Processing message from: ${senderEmail}`);

                const { error: insertError } = await supabase
                    .from('inbox_messages')
                    .insert({
                        user_id: EXECUTIVE_USER_ID,
                        title: `Reply from ${senderEmail}: ${subjectHeader}`,
                        content: detailData.snippet || '',
                        type: 'reply',
                        channel: 'email',
                        priority: 1,
                        metadata: {
                            gmail_id: msg.id,
                            sender_email: senderEmail,
                            original_subject: subjectHeader
                        }
                    });

                if (insertError) throw insertError;

                // Step 5: Mark as read
                await invokeGoogleGmail(supabase, {
                    action: 'modify_message',
                    message_id: msg.id,
                    remove_labels: ['UNREAD']
                });

                processed.push(msg.id);
            } catch (msgErr: any) {
                console.error(`[sync-gmail-v2] ❌ Error processing message ${msg.id}:`, msgErr.message || msgErr);
            }
        }

        return new Response(
            JSON.stringify({ success: true, processed }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err: any) {
        console.error('[sync-gmail-v2] Fatal Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
