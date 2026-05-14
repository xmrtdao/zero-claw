-- Phase 1: Add metadata column to eliza_python_executions
ALTER TABLE eliza_python_executions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_eliza_python_executions_metadata 
ON eliza_python_executions USING gin(metadata);

-- Add helpful comment
COMMENT ON COLUMN eliza_python_executions.metadata IS 'Additional execution context including network calls, database queries, and runtime information';