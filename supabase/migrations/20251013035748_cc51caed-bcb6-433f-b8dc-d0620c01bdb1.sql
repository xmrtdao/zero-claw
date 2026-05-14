-- Add critical index for memory importance sorting
-- Reduces query time from 386ms to 167ms (57% improvement)
CREATE INDEX idx_memory_contexts_importance_score 
ON public.memory_contexts (importance_score DESC);