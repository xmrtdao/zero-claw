-- Add missing execution_time_ms column to eliza_python_executions table
ALTER TABLE eliza_python_executions 
ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER;