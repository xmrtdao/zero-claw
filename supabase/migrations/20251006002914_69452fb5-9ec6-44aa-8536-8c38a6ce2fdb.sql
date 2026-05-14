-- Fix http_post errors by removing/updating broken triggers and functions

-- Drop the broken auto_vectorize_memory trigger and function that use extensions.http_post
DROP TRIGGER IF EXISTS auto_vectorize_memory_trigger ON public.memory_contexts;
DROP FUNCTION IF EXISTS public.auto_vectorize_memory() CASCADE;

-- Drop the broken auto_extract_knowledge_entities trigger and function
DROP TRIGGER IF EXISTS auto_extract_knowledge_trigger ON public.conversation_messages;
DROP FUNCTION IF EXISTS public.auto_extract_knowledge_entities() CASCADE;

-- Drop the broken batch_vectorize_memories function
DROP FUNCTION IF EXISTS public.batch_vectorize_memories() CASCADE;

-- Recreate auto_vectorize_memory without the http_post call (it should be handled by edge functions instead)
CREATE OR REPLACE FUNCTION public.auto_vectorize_memory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Just log that this memory needs vectorization
  -- The actual vectorization will be handled by the vectorize-memory edge function
  INSERT INTO public.webhook_logs (webhook_name, trigger_table, trigger_operation, payload, status)
  VALUES ('auto_vectorize_memory', 'memory_contexts', TG_OP, jsonb_build_object('memory_id', NEW.id), 'pending');
  
  RETURN NEW;
END;
$$;

-- Recreate auto_extract_knowledge_entities without the http_post call
CREATE OR REPLACE FUNCTION public.auto_extract_knowledge_entities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.message_type = 'assistant' THEN
    -- Just log that this message needs knowledge extraction
    -- The actual extraction will be handled by the extract-knowledge edge function
    INSERT INTO public.webhook_logs (webhook_name, trigger_table, trigger_operation, payload, status)
    VALUES ('auto_extract_knowledge', 'conversation_messages', TG_OP, jsonb_build_object('message_id', NEW.id), 'pending');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix the check_session_ownership function to handle non-UUID session IDs properly
CREATE OR REPLACE FUNCTION public.check_session_ownership(session_uuid uuid, request_metadata jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  session_key_val text;
  user_ip text;
BEGIN
  -- Extract IP from request metadata (if provided)
  user_ip := request_metadata->>'userIp';
  
  -- Try to get the session_key from conversation_sessions using UUID
  -- This will fail silently if session_uuid is not valid
  BEGIN
    SELECT session_key INTO session_key_val
    FROM conversation_sessions
    WHERE id = session_uuid;
  EXCEPTION WHEN OTHERS THEN
    -- If UUID lookup fails, return false
    RETURN false;
  END;
  
  -- If no session found, deny access
  IF session_key_val IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if the session_key matches the user's IP pattern
  -- Session keys are in format: ip-XXX.XXX.XXX.XXX
  IF user_ip IS NOT NULL AND session_key_val = 'ip-' || user_ip THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;