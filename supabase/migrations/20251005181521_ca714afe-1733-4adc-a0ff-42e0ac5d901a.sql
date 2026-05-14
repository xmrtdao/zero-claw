-- Enable pg_cron extension for scheduled jobs
create extension if not exists pg_cron with schema extensions;

-- Set up scheduled jobs using pg_cron
-- Daily token reset at midnight UTC
select cron.schedule(
  'daily-token-reset',
  '0 0 * * *',
  $$select public.reset_manus_tokens();$$
);

-- Hourly system maintenance
select cron.schedule(
  'hourly-maintenance',
  '0 * * * *',
  $$
  delete from public.webhook_logs where created_at < now() - interval '30 days';
  delete from public.conversation_sessions where is_active = false and updated_at < now() - interval '90 days';
  $$
);

-- Every 5 minutes: Process scheduled actions
select cron.schedule(
  'process-scheduled-actions',
  '*/5 * * * *',
  $$
  update public.scheduled_actions
  set next_execution = now()
  where is_active = true 
    and next_execution <= now()
    and next_execution < now() - interval '1 minute';
  $$
);

-- Every 15 minutes: Clean up stale task executions
select cron.schedule(
  'cleanup-stale-tasks',
  '*/15 * * * *',
  $$
  update public.task_executions
  set status = 'timeout',
      error_message = 'Task execution timeout',
      execution_end = now()
  where status = 'running'
    and execution_start < now() - interval '1 hour';
  $$
);

-- Populate webhook configurations with edge function endpoints
insert into public.webhook_configs (name, endpoint_url, is_active, metadata)
values 
  ('openai_embeddings', 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/vectorize-memory', true, 
   '{"description": "Automatically vectorize memory contexts using OpenAI embeddings"}'::jsonb),
  ('knowledge_extractor', 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/extract-knowledge', true,
   '{"description": "Extract knowledge entities from conversation messages"}'::jsonb),
  ('conversation_summarizer', 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/summarize-conversation', true,
   '{"description": "Generate conversation summaries automatically"}'::jsonb)
on conflict (name) do update
  set endpoint_url = excluded.endpoint_url,
      is_active = excluded.is_active,
      metadata = excluded.metadata,
      updated_at = now();

-- Function to batch process memory contexts for vectorization
create or replace function public.batch_vectorize_memories()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  memory_record record;
  webhook_url text;
  request_id bigint;
begin
  select endpoint_url into webhook_url
  from public.webhook_configs
  where name = 'openai_embeddings' and is_active = true;

  if webhook_url is not null then
    for memory_record in 
      select * from public.memory_contexts 
      where embedding is null 
      limit 100
    loop
      perform extensions.http_post(
        url := webhook_url,
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object(
          'memory_id', memory_record.id,
          'content', memory_record.content,
          'context_type', memory_record.context_type
        )
      );
    end loop;
  end if;
end;
$$;

-- Schedule batch vectorization every hour
select cron.schedule(
  'batch-vectorize-memories',
  '30 * * * *',
  $$select public.batch_vectorize_memories();$$
);

-- Function to analyze conversation patterns and generate insights
create or replace function public.generate_conversation_insights()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  session_record record;
  message_count int;
begin
  for session_record in 
    select * from public.conversation_sessions 
    where is_active = true
      and updated_at > now() - interval '24 hours'
  loop
    select count(*) into message_count
    from public.conversation_messages
    where session_id = session_record.id;

    if message_count > 10 then
      insert into public.interaction_patterns (
        session_key,
        pattern_name,
        pattern_data,
        frequency,
        confidence_score
      ) values (
        session_record.session_key,
        'high_engagement',
        jsonb_build_object(
          'message_count', message_count,
          'analyzed_at', now()
        ),
        message_count,
        0.8
      )
      on conflict (session_key, pattern_name) 
      do update set
        frequency = excluded.frequency,
        pattern_data = excluded.pattern_data,
        last_occurrence = now();
    end if;
  end loop;
end;
$$;

-- Schedule conversation insights generation daily
select cron.schedule(
  'generate-insights',
  '0 2 * * *',
  $$select public.generate_conversation_insights();$$
);