-- Fix search_path security issue for the match_knowledge_entities function
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
SECURITY DEFINER
SET search_path = public
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