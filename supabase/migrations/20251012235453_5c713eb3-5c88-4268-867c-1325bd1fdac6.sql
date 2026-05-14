-- Fix search_path for increment_rate_limit function
CREATE OR REPLACE FUNCTION public.increment_rate_limit(p_identifier text, p_endpoint text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rate_limits (identifier, endpoint, window_start)
  VALUES (p_identifier, p_endpoint, now())
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1;
END;
$$;