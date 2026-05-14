-- Phase 1 & 4: Enhance webhook_logs and create event_actions table
-- Alter webhook_logs for event-driven architecture
ALTER TABLE webhook_logs 
ADD COLUMN IF NOT EXISTS event_source TEXT,
ADD COLUMN IF NOT EXISTS event_type TEXT,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS dispatcher_result JSONB,
ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_source ON webhook_logs(event_source);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processing_status ON webhook_logs(processing_status);

-- Create event_actions table for dynamic event routing
CREATE TABLE IF NOT EXISTS event_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_pattern TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  actions JSONB NOT NULL,
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default event action mappings
INSERT INTO event_actions (event_pattern, priority, actions, conditions) VALUES
('github:issues:opened', 7, '[{"type":"trigger_workflow","target":"ci.yml","params":{"reason":"new_issue"}},{"type":"assign_task","target":"security_agent","params":{"category":"SECURITY","priority":7}}]'::jsonb, '{"label_matches":["bug","security"]}'::jsonb),
('github:issues:labeled:bug', 8, '[{"type":"trigger_workflow","target":"ci.yml","params":{"reason":"bug_labeled"}},{"type":"assign_task","target":"security_agent","params":{"category":"SECURITY","priority":8}}]'::jsonb, '{}'::jsonb),
('github:pull_request:opened', 6, '[{"type":"trigger_workflow","target":"ci.yml","params":{"reason":"pr_opened"}},{"type":"call_function","target":"github-integration","params":{"action":"comment_on_issue"}}]'::jsonb, '{}'::jsonb),
('github:security_advisory:published', 10, '[{"type":"trigger_workflow","target":"security-guardian-audit.yml","params":{"reason":"security_advisory"}},{"type":"create_issue","target":"XMRT-Ecosystem","params":{"labels":["security","P1"]}},{"type":"assign_task","target":"security_agent","params":{"category":"SECURITY","priority":10}}]'::jsonb, '{}'::jsonb),
('vercel:deployment:failed', 9, '[{"type":"trigger_workflow","target":"ci.yml","params":{"reason":"deployment_failure"}},{"type":"assign_task","target":"devops_agent","params":{"category":"DEVOPS","priority":9}},{"type":"create_issue","target":"XMRT-Ecosystem","params":{"labels":["deployment","P1"]}}]'::jsonb, '{}'::jsonb),
('vercel:deployment:success', 3, '[{"type":"call_function","target":"system-status","params":{"reason":"deployment_success"}}]'::jsonb, '{}'::jsonb),
('supabase:community_ideas:created', 6, '[{"type":"call_function","target":"evaluate-community-idea","params":{}},{"type":"assign_task","target":"research_agent","params":{"category":"RESEARCH","priority":6}}]'::jsonb, '{}'::jsonb),
('supabase:agent:failure', 9, '[{"type":"trigger_workflow","target":"agent-coordination-cycle.yml","params":{"reason":"agent_failure"}},{"type":"call_function","target":"system-diagnostics","params":{}}]'::jsonb, '{}'::jsonb),
('supabase:db:trigger:database_anomaly', 8, '[{"type":"call_function","target":"system-diagnostics","params":{"reason":"database_anomaly"}},{"type":"trigger_workflow","target":"agent-coordination-cycle.yml","params":{"reason":"DATABASE_ANOMALY"}}]'::jsonb, '{}'::jsonb);

-- Create materialized view for event flow analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS event_flow_analytics AS
SELECT
  event_source,
  event_type,
  DATE_TRUNC('hour', created_at) as hour_bucket,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE processing_status = 'dispatched') as dispatched,
  COUNT(*) FILTER (WHERE processing_status = 'failed') as failed,
  AVG(EXTRACT(EPOCH FROM (dispatched_at - created_at))) as avg_dispatch_time_seconds
FROM webhook_logs
WHERE created_at >= now() - interval '7 days'
  AND event_source IS NOT NULL
GROUP BY event_source, event_type, hour_bucket
ORDER BY hour_bucket DESC;

CREATE INDEX IF NOT EXISTS idx_event_flow_analytics ON event_flow_analytics(event_source, event_type);

-- Function to refresh event flow analytics
CREATE OR REPLACE FUNCTION refresh_event_flow_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY event_flow_analytics;
END;
$$ LANGUAGE plpgsql;

-- Database triggers for event-driven notifications
CREATE OR REPLACE FUNCTION notify_new_community_idea()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO webhook_logs (webhook_name, trigger_table, trigger_operation, payload, status, event_source, event_type)
  VALUES (
    'community_idea_created',
    'community_ideas',
    'INSERT',
    jsonb_build_object(
      'idea_id', NEW.id,
      'title', NEW.title,
      'category', NEW.category,
      'description', NEW.description
    ),
    'pending',
    'supabase',
    'community_ideas:created'
  );
  
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/event-router',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'event_source', 'supabase',
      'event_type', 'community_ideas:created',
      'payload', jsonb_build_object('idea_id', NEW.id, 'title', NEW.title, 'category', NEW.category)
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_community_idea_webhook ON community_ideas;
CREATE TRIGGER trigger_community_idea_webhook
AFTER INSERT ON community_ideas
FOR EACH ROW
EXECUTE FUNCTION notify_new_community_idea();

-- Trigger for agent failures
CREATE OR REPLACE FUNCTION notify_agent_failure()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'failed' AND NEW.activity_type = 'agent_execution' THEN
    INSERT INTO webhook_logs (webhook_name, trigger_table, trigger_operation, payload, status, event_source, event_type)
    VALUES (
      'agent_failure',
      'eliza_activity_log',
      TG_OP,
      jsonb_build_object(
        'agent_name', NEW.metadata->>'agent_name',
        'error', NEW.metadata->>'error',
        'activity_id', NEW.id
      ),
      'pending',
      'supabase',
      'agent:failure'
    );
    
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/event-router',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'event_source', 'supabase',
        'event_type', 'agent:failure',
        'priority', 9,
        'payload', jsonb_build_object(
          'agent_name', NEW.metadata->>'agent_name',
          'error', NEW.metadata->>'error'
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_agent_failure_webhook ON eliza_activity_log;
CREATE TRIGGER trigger_agent_failure_webhook
AFTER INSERT OR UPDATE ON eliza_activity_log
FOR EACH ROW
EXECUTE FUNCTION notify_agent_failure();