-- Enable realtime for conversation messages and other live data
ALTER TABLE conversation_messages REPLICA IDENTITY FULL;
ALTER TABLE eliza_python_executions REPLICA IDENTITY FULL;
ALTER TABLE worker_registrations REPLICA IDENTITY FULL;

-- Add tables to realtime publication (skip if already exists)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversation_messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE eliza_python_executions;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE worker_registrations;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Create knowledge search function using basic text search
CREATE OR REPLACE FUNCTION match_knowledge_entities(
  search_query text,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  entity_name text,
  entity_type text,
  description text,
  confidence_score real,
  metadata jsonb
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.entity_name,
    k.entity_type,
    k.description,
    k.confidence_score,
    k.metadata
  FROM knowledge_entities k
  WHERE 
    k.entity_name ILIKE '%' || search_query || '%'
    OR k.description ILIKE '%' || search_query || '%'
  ORDER BY k.confidence_score DESC
  LIMIT match_count;
END;
$$;