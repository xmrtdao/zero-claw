-- Add vector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector similarity search function for memories
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id_filter text
)
RETURNS TABLE (
  id uuid,
  user_id text,
  session_id text,
  content text,
  context_type text,
  importance_score real,
  ts timestamptz,
  embedding vector(1536),
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.id,
    mc.user_id,
    mc.session_id,
    mc.content,
    mc.context_type,
    mc.importance_score,
    mc.timestamp as ts,
    mc.embedding::vector(1536),
    mc.metadata,
    1 - (mc.embedding::vector(1536) <=> query_embedding) as similarity
  FROM memory_contexts mc
  WHERE 
    mc.user_id = user_id_filter
    AND mc.embedding IS NOT NULL
    AND 1 - (mc.embedding::vector(1536) <=> query_embedding) > match_threshold
  ORDER BY mc.embedding::vector(1536) <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create index for user_id and context_type for faster queries
CREATE INDEX IF NOT EXISTS memory_contexts_user_context_idx 
  ON memory_contexts(user_id, context_type);

-- Create a trigger to auto-call vectorization on new memories
CREATE OR REPLACE FUNCTION trigger_vectorize_memory()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if embedding is NULL and content is not empty
  IF NEW.embedding IS NULL AND LENGTH(NEW.content) > 0 THEN
    INSERT INTO webhook_logs (webhook_name, trigger_table, trigger_operation, payload, status)
    VALUES (
      'vectorize_memory',
      'memory_contexts',
      TG_OP,
      jsonb_build_object(
        'memory_id', NEW.id,
        'content', NEW.content,
        'context_type', NEW.context_type
      ),
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on memory_contexts
DROP TRIGGER IF EXISTS auto_vectorize_memory ON memory_contexts;
CREATE TRIGGER auto_vectorize_memory
  AFTER INSERT ON memory_contexts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_vectorize_memory();