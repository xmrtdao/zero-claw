-- Create database function for XMRT Charger Leaderboard
CREATE OR REPLACE FUNCTION public.get_xmrt_charger_leaderboard(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  device_fingerprint TEXT,
  device_type TEXT,
  total_pop_points NUMERIC,
  total_charging_sessions BIGINT,
  avg_efficiency NUMERIC,
  battery_health INTEGER,
  last_active TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.device_fingerprint,
    d.device_type,
    COALESCE(SUM(pe.pop_points), 0) as total_pop_points,
    COUNT(DISTINCT cs.id) as total_charging_sessions,
    COALESCE(AVG(cs.efficiency_score), 0) as avg_efficiency,
    (
      SELECT bhs.health_score 
      FROM battery_health_snapshots bhs
      WHERE bhs.device_id = d.id 
      ORDER BY bhs.assessed_at DESC 
      LIMIT 1
    ) as battery_health,
    d.last_seen_at as last_active
  FROM devices d
  LEFT JOIN charging_sessions cs ON cs.device_id = d.id
  LEFT JOIN pop_events pe ON pe.device_id = d.id AND pe.event_type = 'charging_session'
  WHERE d.is_active = true
  GROUP BY d.id, d.device_fingerprint, d.device_type, d.last_seen_at
  ORDER BY total_pop_points DESC
  LIMIT limit_count;
END;
$$;