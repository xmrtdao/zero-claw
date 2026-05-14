-- Add event_actions entries for governance workflow
INSERT INTO public.event_actions (event_pattern, priority, actions, is_active)
VALUES 
  (
    'proposal:status:approved',
    9,
    '[{"type": "call_function", "target": "execute-approved-proposal", "params": {}}]'::jsonb,
    true
  ),
  (
    'proposal:status:rejected',
    8,
    '[{"type": "call_function", "target": "handle-rejected-proposal", "params": {}}]'::jsonb,
    true
  ),
  (
    'activity_feed:function_approved',
    7,
    '[{"type": "call_function", "target": "execute-approved-proposal", "params": {}}]'::jsonb,
    true
  )
ON CONFLICT DO NOTHING;

-- Create trigger for proposal status changes
CREATE OR REPLACE FUNCTION public.notify_proposal_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Insert into activity feed for tracking
    INSERT INTO public.activity_feed (type, title, description, data)
    VALUES (
      'proposal_status_change',
      'Proposal Status Changed: ' || NEW.function_name,
      'Status changed from ' || OLD.status || ' to ' || NEW.status,
      jsonb_build_object(
        'proposal_id', NEW.id,
        'function_name', NEW.function_name,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', now()
      )
    );
    
    -- Also insert into webhook_logs for event-router to process
    INSERT INTO public.webhook_logs (webhook_name, trigger_table, trigger_operation, payload, status, event_source, event_type)
    VALUES (
      'proposal_status_change',
      'edge_function_proposals',
      'UPDATE',
      jsonb_build_object(
        'proposal_id', NEW.id,
        'function_name', NEW.function_name,
        'old_status', OLD.status,
        'new_status', NEW.status
      ),
      'pending',
      'supabase',
      'proposal:status:' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS proposal_status_change_trigger ON public.edge_function_proposals;

-- Create the trigger
CREATE TRIGGER proposal_status_change_trigger
AFTER UPDATE ON public.edge_function_proposals
FOR EACH ROW
EXECUTE FUNCTION public.notify_proposal_status_change();