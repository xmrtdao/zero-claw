-- Create workflow_executions table to track multi-step workflows
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  current_step_index integer NOT NULL DEFAULT 0,
  total_steps integer NOT NULL,
  start_time timestamp with time zone NOT NULL DEFAULT now(),
  end_time timestamp with time zone,
  final_result jsonb,
  failed_step text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create workflow_steps table to track individual steps
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_execution_id uuid NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  step_id text NOT NULL,
  step_index integer NOT NULL,
  name text NOT NULL,
  description text,
  step_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  result jsonb,
  error text,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  duration_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workflow_execution_id, step_index)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_start_time ON public.workflow_executions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_execution_id ON public.workflow_steps(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_status ON public.workflow_steps(status);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_step_index ON public.workflow_steps(workflow_execution_id, step_index);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_workflow_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER workflow_executions_updated_at
  BEFORE UPDATE ON public.workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_workflow_updated_at();

CREATE TRIGGER workflow_steps_updated_at
  BEFORE UPDATE ON public.workflow_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_workflow_updated_at();

-- Enable RLS
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view workflow executions"
  ON public.workflow_executions
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage workflow executions"
  ON public.workflow_executions
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Anyone can view workflow steps"
  ON public.workflow_steps
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage workflow steps"
  ON public.workflow_steps
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Add helpful comments
COMMENT ON TABLE public.workflow_executions IS 'Tracks multi-step workflow executions orchestrated by Eliza';
COMMENT ON TABLE public.workflow_steps IS 'Tracks individual steps within workflow executions';
COMMENT ON COLUMN public.workflow_executions.workflow_id IS 'Unique identifier for the workflow (e.g., workflow-1234567890)';
COMMENT ON COLUMN public.workflow_executions.status IS 'Current status: running, completed, failed, or cancelled';
COMMENT ON COLUMN public.workflow_steps.step_type IS 'Type of step: ai_analysis, data_fetch, api_call, decision, code_execution, etc.';
COMMENT ON COLUMN public.workflow_steps.duration_ms IS 'Step execution duration in milliseconds';