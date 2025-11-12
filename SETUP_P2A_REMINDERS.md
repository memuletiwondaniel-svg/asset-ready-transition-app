# P2A Approval Reminder Setup Guide

This guide explains how to set up automated email reminders for P2A approval workflows.

## Features

- **3-Day Reminders**: Automatic email reminders sent to approvers when approvals are pending for 3+ days
- **7-Day Escalation**: Escalation emails sent to managers when approvals are pending for 7+ days
- **Automated Scheduling**: Runs daily via Supabase cron jobs

## Prerequisites

1. **RESEND_API_KEY** is already configured in your Supabase secrets
2. Verify your sending domain is validated at https://resend.com/domains
3. Ensure `pg_cron` and `pg_net` extensions are enabled

## Setup Instructions

### Step 1: Enable Required Extensions

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 2: Create the Cron Job

Run this SQL to schedule the reminder function to run daily at 9:00 AM UTC:

```sql
-- Create the cron job
SELECT cron.schedule(
  'p2a-approval-reminders',
  '0 9 * * *', -- Run daily at 9:00 AM UTC
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-p2a-reminder',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

**Important:** Replace the following in the SQL above:
- `YOUR_PROJECT_REF` with your actual Supabase project reference (found in your project URL)
- `YOUR_ANON_KEY` with your Supabase anon key (found in Settings > API)

### Step 3: Verify the Cron Job

Check that the cron job was created successfully:

```sql
SELECT * FROM cron.job WHERE jobname = 'p2a-approval-reminders';
```

### Step 4: Test the Function Manually

You can test the reminder function manually before waiting for the scheduled run:

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-p2a-reminder' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

## How It Works

1. **Daily Scan**: Every day at 9 AM UTC, the system scans for pending approvals
2. **3-Day Check**: Approvals pending for 3+ days trigger a reminder email to the approver
3. **7-Day Escalation**: Approvals pending for 7+ days:
   - Send urgent reminder to the approver
   - Send escalation email to their manager (if manager_id is set)
4. **Notifications Logged**: All reminders are logged in the `p2a_notifications` table

## Email Templates

### Reminder Email (3-7 days)
- Subject: "Reminder: P2A Approval Pending - [Project Name]"
- Includes project details, approval stage, and days pending
- Provides direct link to review the approval

### Urgent Email (7+ days)
- Subject: "URGENT: P2A Approval Pending X Days - [Project Name]"
- Red alert styling
- Emphasizes urgency

### Escalation Email (to Manager)
- Subject: "Escalation: P2A Approval Overdue - [Project Name]"
- Notifies manager of overdue approval
- Includes approver name and approval details

## Customization

### Change Schedule

To run at different times or frequencies, modify the cron expression:

```sql
-- Run twice daily (9 AM and 5 PM UTC)
'0 9,17 * * *'

-- Run every hour
'0 * * * *'

-- Run on weekdays only at 9 AM
'0 9 * * 1-5'
```

### Update Notification Thresholds

Edit `/supabase/functions/send-p2a-reminder/index.ts`:

```typescript
// Change from 3 days to 5 days
const threeDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

// Change from 7 days to 10 days
const sevenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
```

## Monitoring

### View Cron Job Logs

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'p2a-approval-reminders')
ORDER BY start_time DESC
LIMIT 10;
```

### Check Sent Notifications

```sql
SELECT * FROM p2a_notifications
WHERE notification_type IN ('approval_reminder', 'approval_escalation')
ORDER BY created_at DESC
LIMIT 20;
```

## Troubleshooting

### Cron Job Not Running

1. Verify extensions are enabled:
```sql
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
```

2. Check cron job exists:
```sql
SELECT * FROM cron.job WHERE jobname = 'p2a-approval-reminders';
```

3. View error logs:
```sql
SELECT * FROM cron.job_run_details 
WHERE status = 'failed'
ORDER BY start_time DESC;
```

### Emails Not Sending

1. Verify RESEND_API_KEY is set in Supabase secrets
2. Check your sending domain is verified at https://resend.com/domains
3. Test the edge function manually using curl
4. Check edge function logs in Supabase dashboard

### Manager Not Receiving Escalation

1. Verify `manager_id` is set in the `profiles` table:
```sql
SELECT user_id, full_name, email, manager_id 
FROM profiles 
WHERE user_id = 'APPROVER_USER_ID';
```

2. Ensure manager has a valid email address

## Disabling Reminders

To temporarily disable the cron job:

```sql
SELECT cron.unschedule('p2a-approval-reminders');
```

To re-enable, run the schedule command from Step 2 again.

## Support

For issues or questions:
1. Check Supabase edge function logs
2. Review the `p2a_notifications` table for error details
3. Test the edge function manually to isolate issues
