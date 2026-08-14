/*
# FLYYY.AI — pii_counts_by_type SQL function

Returns aggregated PII event counts grouped by type, for the dashboard summary
and PII view. Read-only, SECURITY INVOKER, safe for anon role.
*/
CREATE OR REPLACE FUNCTION pii_counts_by_type()
RETURNS TABLE (pii_type text, total integer)
LANGUAGE sql
STABLE
AS $$
  SELECT pii_type, SUM(count)::integer AS total
  FROM pii_events
  GROUP BY pii_type
  ORDER BY total DESC;
$$;
GRANT EXECUTE ON FUNCTION pii_counts_by_type() TO anon, authenticated;