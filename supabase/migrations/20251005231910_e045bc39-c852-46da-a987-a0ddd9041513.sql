-- Disable the problematic webhook triggers that require http extension
-- These triggers try to call external webhooks but the http extension is not enabled

-- Drop the auto-vectorize trigger
DROP TRIGGER IF EXISTS on_memory_context_created ON public.memory_contexts;

-- Drop the auto-extract knowledge trigger  
DROP TRIGGER IF EXISTS on_conversation_message_created ON public.conversation_messages;

-- We'll rely on edge functions being called directly instead of database triggers
-- This is more reliable and doesn't require the http extension

-- Note: The auto_schedule_task_execution trigger doesn't use http_post so it's safe to keep