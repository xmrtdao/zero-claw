-- Fix task_executions status constraint to accept both uppercase and lowercase
ALTER TABLE task_executions 
DROP CONSTRAINT IF EXISTS task_executions_status_check;

ALTER TABLE task_executions
ADD CONSTRAINT task_executions_status_check 
CHECK (status IN (
  'pending', 'running', 'success', 'error', 'timeout', 'completed', 'failed',
  'PENDING', 'IN_PROGRESS', 'RUNNING', 'COMPLETED', 'FAILED', 'BLOCKED', 'SUCCESS', 'ERROR'
));

-- Fix eliza_python_executions status constraint to accept both uppercase and lowercase
ALTER TABLE eliza_python_executions 
DROP CONSTRAINT IF EXISTS eliza_python_executions_status_check;

ALTER TABLE eliza_python_executions
ADD CONSTRAINT eliza_python_executions_status_check 
CHECK (status IN (
  'pending', 'running', 'success', 'error', 'completed', 'failed',
  'PENDING', 'RUNNING', 'SUCCESS', 'ERROR', 'COMPLETED', 'FAILED', 'IN_PROGRESS'
));