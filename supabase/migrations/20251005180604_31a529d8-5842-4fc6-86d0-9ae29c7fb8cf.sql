-- Enable pg_net extension for HTTP requests from database
create extension if not exists pg_net with schema extensions;

-- Create a table to store webhook configurations
create table if not exists public.webhook_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  endpoint_url text not null,
  secret_key text,
  is_active boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.webhook_configs enable row level security;

create policy "Service role manages webhook configs"
on public.webhook_configs
for all
using (auth.role() = 'service_role');

-- Create a table to log webhook executions
create table if not exists public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  webhook_name text not null,
  trigger_table text not null,
  trigger_operation text not null,
  payload jsonb,
  response jsonb,
  status text default 'pending',
  error_message text,
  created_at timestamp with time zone default now()
);

alter table public.webhook_logs enable row level security;

create policy "Service role manages webhook logs"
on public.webhook_logs
for all
using (auth.role() = 'service_role');

-- Function to vectorize memory contexts automatically
create or replace function public.auto_vectorize_memory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  webhook_url text;
  request_id bigint;
begin
  -- Get OpenAI API endpoint from webhook configs
  select endpoint_url into webhook_url
  from public.webhook_configs
  where name = 'openai_embeddings' and is_active = true
  limit 1;

  if webhook_url is not null then
    -- Make async HTTP request to generate embeddings
    select net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.openai_api_key', true)
      ),
      body := jsonb_build_object(
        'memory_id', NEW.id,
        'content', NEW.content,
        'context_type', NEW.context_type
      )
    ) into request_id;

    -- Log the webhook call
    insert into public.webhook_logs (webhook_name, trigger_table, trigger_operation, payload, status)
    values ('auto_vectorize_memory', 'memory_contexts', TG_OP, jsonb_build_object('memory_id', NEW.id), 'sent');
  end if;

  return NEW;
end;
$$;

-- Trigger for auto-vectorizing new memory contexts
drop trigger if exists trigger_auto_vectorize_memory on public.memory_contexts;
create trigger trigger_auto_vectorize_memory
  after insert on public.memory_contexts
  for each row
  execute function public.auto_vectorize_memory();

-- Function to update interaction patterns based on conversation messages
create or replace function public.auto_update_interaction_patterns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  session_key_val text;
  pattern_exists boolean;
begin
  -- Get session key from conversation_sessions
  select session_key into session_key_val
  from public.conversation_sessions
  where id = NEW.session_id;

  if session_key_val is not null then
    -- Check if pattern exists
    select exists(
      select 1 from public.interaction_patterns
      where session_key = session_key_val
        and pattern_name = 'message_frequency'
    ) into pattern_exists;

    if pattern_exists then
      -- Update existing pattern
      update public.interaction_patterns
      set frequency = frequency + 1,
          last_occurrence = now(),
          pattern_data = jsonb_set(
            pattern_data,
            '{total_messages}',
            to_jsonb((pattern_data->>'total_messages')::int + 1)
          )
      where session_key = session_key_val
        and pattern_name = 'message_frequency';
    else
      -- Create new pattern
      insert into public.interaction_patterns (
        session_key,
        pattern_name,
        pattern_data,
        frequency,
        last_occurrence
      ) values (
        session_key_val,
        'message_frequency',
        jsonb_build_object('total_messages', 1, 'last_message_type', NEW.message_type),
        1,
        now()
      );
    end if;
  end if;

  return NEW;
end;
$$;

-- Trigger for auto-updating interaction patterns
drop trigger if exists trigger_auto_update_patterns on public.conversation_messages;
create trigger trigger_auto_update_patterns
  after insert on public.conversation_messages
  for each row
  execute function public.auto_update_interaction_patterns();

-- Function to auto-update knowledge entities from conversations
create or replace function public.auto_extract_knowledge_entities()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  webhook_url text;
  request_id bigint;
begin
  -- Only process assistant messages
  if NEW.message_type = 'assistant' then
    select endpoint_url into webhook_url
    from public.webhook_configs
    where name = 'knowledge_extractor' and is_active = true
    limit 1;

    if webhook_url is not null then
      -- Make async HTTP request to extract entities
      select net.http_post(
        url := webhook_url,
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object(
          'message_id', NEW.id,
          'content', NEW.content,
          'session_id', NEW.session_id
        )
      ) into request_id;

      insert into public.webhook_logs (webhook_name, trigger_table, trigger_operation, payload, status)
      values ('auto_extract_knowledge', 'conversation_messages', TG_OP, jsonb_build_object('message_id', NEW.id), 'sent');
    end if;
  end if;

  return NEW;
end;
$$;

-- Trigger for auto-extracting knowledge entities
drop trigger if exists trigger_auto_extract_knowledge on public.conversation_messages;
create trigger trigger_auto_extract_knowledge
  after insert on public.conversation_messages
  for each row
  execute function public.auto_extract_knowledge_entities();

-- Function to auto-schedule task executions
create or replace function public.auto_schedule_task_execution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- When a scheduled action's next_execution time arrives, create task execution
  if NEW.is_active and NEW.next_execution <= now() then
    insert into public.task_executions (
      task_id, 
      status,
      metadata
    )
    select 
      gen_random_uuid(),
      'pending',
      jsonb_build_object(
        'scheduled_action_id', NEW.id,
        'action_type', NEW.action_type,
        'action_data', NEW.action_data
      )
    where not exists (
      select 1 from public.task_executions
      where metadata->>'scheduled_action_id' = NEW.id::text
        and status in ('pending', 'running')
    );

    -- Update next execution time based on schedule expression
    update public.scheduled_actions
    set last_execution = now(),
        next_execution = now() + interval '1 day'  -- Simplified, would parse schedule_expression
    where id = NEW.id;

    -- Log webhook execution
    insert into public.webhook_logs (webhook_name, trigger_table, trigger_operation, payload, status)
    values ('auto_schedule_task', 'scheduled_actions', TG_OP, jsonb_build_object('action_id', NEW.id), 'completed');
  end if;

  return NEW;
end;
$$;

-- Trigger for auto-scheduling task executions
drop trigger if exists trigger_auto_schedule_task on public.scheduled_actions;
create trigger trigger_auto_schedule_task
  after update on public.scheduled_actions
  for each row
  execute function public.auto_schedule_task_execution();

-- Function to manage system health and cleanup
create or replace function public.auto_system_maintenance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Clean up old webhook logs (keep last 30 days)
  delete from public.webhook_logs
  where created_at < now() - interval '30 days';

  -- Clean up old inactive sessions (keep last 90 days)
  delete from public.conversation_sessions
  where is_active = false
    and updated_at < now() - interval '90 days';

  -- Update system metrics
  insert into public.webhook_logs (webhook_name, trigger_table, trigger_operation, payload, status)
  values (
    'system_maintenance',
    'conversation_sessions',
    'MAINTENANCE',
    jsonb_build_object(
      'cleaned_logs', (select count(*) from public.webhook_logs where created_at < now() - interval '30 days'),
      'cleaned_sessions', (select count(*) from public.conversation_sessions where is_active = false and updated_at < now() - interval '90 days')
    ),
    'completed'
  );

  return NEW;
end;
$$;

-- Update trigger on update_updated_at_column to include cleanup
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;