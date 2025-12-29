-- Move pg_cron extension from public to extensions schema
DROP EXTENSION IF EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Move pg_net extension from public to extensions schema  
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;