import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Helper function to check if a string is a valid UUID
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function formatHashAsUuid(bytes: Uint8Array): string {
  const uuidBytes = bytes.slice(0, 16);
  uuidBytes[6] = (uuidBytes[6] & 0x0f) | 0x40; // version 4
  uuidBytes[8] = (uuidBytes[8] & 0x3f) | 0x80; // RFC 4122 variant

  const hex = Array.from(uuidBytes, (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function sessionIdToUUID(sessionId: string): Promise<string> {
  const normalized = sessionId.trim().toLowerCase();
  const data = new TextEncoder().encode(`conversation-access:${normalized}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return formatHashAsUuid(new Uint8Array(digest));
}

async function resolveSession(
  supabase: ReturnType<typeof createClient>,
  sessionIdentifier: string
): Promise<{ id: string; session_key: string } | null> {
  const normalizedIdentifier = sessionIdentifier.trim();

  // Check UUID first
  if (isValidUUID(normalizedIdentifier)) {
    const { data, error } = await supabase
      .from('conversation_sessions')
      .select('id, session_key')
      .eq('id', normalizedIdentifier)
      .maybeSingle();

    if (error) {
      console.error('Error fetching session by UUID:', error);
    }

    if (data) return data;
  } else {
    // Deterministically hash non-UUID session IDs into valid UUIDs.
    const hashedSessionId = await sessionIdToUUID(normalizedIdentifier);
    const { data, error } = await supabase
      .from('conversation_sessions')
      .select('id, session_key')
      .eq('id', hashedSessionId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching session by hashed UUID:', error);
    }

    if (data) return data;
  }

  // Fallback: treat as session_key
  const { data, error } = await supabase
    .from('conversation_sessions')
    .select('id, session_key')
    .eq('session_key', sessionIdentifier)
    .maybeSingle();

  if (error) {
    console.error('Error fetching session by session_key:', error);
  }

  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const {
      action,
      sessionKey,
      sessionId: rawSessionId,
      messageData,
      limit,
      offset,
      sessionData,
    } = requestBody;
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error:
            'Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create admin client with service role (full read/write access)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Conversation access request:', {
      action,
      sessionKey,
      sessionId: rawSessionId,
      isValidUUID: rawSessionId ? isValidUUID(rawSessionId) : null,
    });

    if (!rawSessionId && !sessionKey) {
      return new Response(
        JSON.stringify({
          error: 'Either sessionId or sessionKey is required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Backward-compatible fallback: if frontend forgot sessionId, use sessionKey.
    const sessionId = rawSessionId || sessionKey;

    switch (action) {
      case 'get_session': {
        let sessionQuery = supabase
          .from('conversation_sessions')
          .select('*')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (sessionKey) {
          sessionQuery = sessionQuery.eq('session_key', sessionKey);
        }

        const { data: sessions, error } = await sessionQuery;

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, session: sessions?.[0] || null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_session': {
        const sessionPayload = {
          ...sessionData,
          session_key:
            sessionData?.session_key || sessionKey || `anon-${crypto.randomUUID()}`,
          user_profile_id: sessionData?.user_profile_id || null,
          metadata: {
            ...(sessionData?.metadata || {}),
            auth_context: 'service_role',
          },
        };

        // Create new session
        const { data, error } = await supabase
          .from('conversation_sessions')
          .insert(sessionPayload)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, session: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_messages': {
        if (!sessionId) {
          return new Response(
            JSON.stringify({ error: 'Session ID required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Verify session ownership - handle both UUID and session_key formats
        const session = await resolveSession(supabase, sessionId);

        if (!session) {
          return new Response(
            JSON.stringify({ success: true, messages: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get messages for this session - use the actual UUID
        const actualSessionId = session.id;
        const { data: messages, error } = await supabase
          .from('conversation_messages')
          .select('*')
          .eq('session_id', actualSessionId)
          .order('timestamp', { ascending: false })
          .range(offset || 0, (offset || 0) + (limit || 49));

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, messages: messages || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_summaries': {
        if (!sessionId) {
          return new Response(
            JSON.stringify({ error: 'Session ID required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Verify session ownership - handle both UUID and session_key formats
        const session = await resolveSession(supabase, sessionId);

        if (!session) {
          return new Response(
            JSON.stringify({ success: true, summaries: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get summaries for this session - use the actual UUID
        const actualSessionId = session.id;
        const { data: summaries, error } = await supabase
          .from('conversation_summaries')
          .select('summary_text, message_count, created_at')
          .eq('session_id', actualSessionId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, summaries: summaries || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'add_message': {
        const hasMessageType = Boolean(messageData?.message_type);
        const hasContent =
          typeof messageData?.content === 'string' &&
          messageData.content.trim().length > 0;

        if (!sessionId || !messageData || !hasMessageType || !hasContent) {
          return new Response(
            JSON.stringify({
              error:
                'Session ID, message_type, and non-empty content are required',
              details: {
                sessionIdProvided: Boolean(sessionId),
                messageTypeProvided: hasMessageType,
                contentProvided: hasContent,
              },
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Verify session ownership - handle both UUID and session_key formats
        const session = await resolveSession(supabase, sessionId);

        let targetSession = session;

        if (!targetSession) {
          const newSessionKey = sessionKey || sessionId;
          const { data: createdSession, error: createError } = await supabase
            .from('conversation_sessions')
            .insert({
              session_key: newSessionKey,
              is_active: true,
              metadata: { auth_context: 'service_role_auto_create' },
            })
            .select('id, session_key')
            .single();

          if (createError) throw createError;
          targetSession = createdSession;
        }

        // Insert message - use the actual UUID
        const actualSessionId = targetSession.id;
        const { data, error } = await supabase
          .from('conversation_messages')
          .insert({
            session_id: actualSessionId,
            ...messageData,
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, message: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_session': {
        if (!sessionId) {
          return new Response(
            JSON.stringify({ error: 'Session ID required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Verify session ownership - handle both UUID and session_key formats
        const session = await resolveSession(supabase, sessionId);

        let targetSession = session;
        if (!targetSession) {
          const newSessionKey = sessionKey || sessionId;
          const { data: createdSession, error: createError } = await supabase
            .from('conversation_sessions')
            .insert({
              session_key: newSessionKey,
              is_active: true,
              metadata: { auth_context: 'service_role_auto_create' },
            })
            .select('id, session_key')
            .single();

          if (createError) throw createError;
          targetSession = createdSession;
        }

        // Update session - use the actual UUID
        const actualSessionId = targetSession.id;
        const { data, error } = await supabase
          .from('conversation_sessions')
          .update(messageData)
          .eq('id', actualSessionId)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, session: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Conversation access error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
