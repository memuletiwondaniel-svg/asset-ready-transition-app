SELECT cron.schedule(
  'daily-ai-training-review',
  '0 3 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://kgnrjqjbonuvpxxfvfjq.supabase.co/functions/v1/ai-training-review',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbnJqcWpib251dnB4eGZ2ZmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODgwMjgsImV4cCI6MjA2ODY2NDAyOH0.tj1l_8eFDnHvAJKxEEHjQMid8l9vGG0mNIFlK6b6HKM"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);