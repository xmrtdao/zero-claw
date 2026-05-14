-- Create batch_vectorize_memories function
-- This function processes pending memory vectorization in batches

CREATE OR REPLACE FUNCTION public.batch_vectorize_memories()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_count integer;
  batch_size integer := 10;
  processed_ids uuid[];
  result jsonb;
BEGIN
  -- Count pending vectorizations
  SELECT COUNT(*) INTO pending_count
  FROM webhook_logs
  WHERE webhook_name = 'auto_vectorize_memory'
    AND status = 'pending';

  -- If no pending items, return early
  IF pending_count = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No pending memories to vectorize',
      'processed', 0
    );
  END IF;

  -- Get batch of pending memory IDs
  SELECT array_agg((payload->>'memory_id')::uuid)
  INTO processed_ids
  FROM (
    SELECT payload
    FROM webhook_logs
    WHERE webhook_name = 'auto_vectorize_memory'
      AND status = 'pending'
    ORDER BY created_at ASC
    LIMIT batch_size
  ) AS pending_batch;

  -- Mark these as processing (will be handled by vectorize-memory edge function)
  UPDATE webhook_logs
  SET status = 'processing'
  WHERE webhook_name = 'auto_vectorize_memory'
    AND (payload->>'memory_id')::uuid = ANY(processed_ids);

  -- Return result
  result := jsonb_build_object(
    'success', true,
    'message', format('Marked %s memories for vectorization', array_length(processed_ids, 1)),
    'processed', array_length(processed_ids, 1),
    'total_pending', pending_count,
    'memory_ids', to_jsonb(processed_ids)
  );

  -- Log activity
  INSERT INTO eliza_activity_log (
    activity_type,
    title,
    description,
    status,
    metadata
  ) VALUES (
    'batch_vectorization',
    'Batch Memory Vectorization',
    format('Processed %s memories, %s remaining', array_length(processed_ids, 1), pending_count - array_length(processed_ids, 1)),
    'completed',
    result
  );

  RETURN result;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.batch_vectorize_memories() TO service_role;

-- Comment
COMMENT ON FUNCTION public.batch_vectorize_memories() IS 'Batches pending memory vectorization requests for processing by vectorize-memory edge function';
