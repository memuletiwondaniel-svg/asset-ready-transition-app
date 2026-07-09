
INSERT INTO public.vcr_item_insights (vcr_id, vcr_item_id, payload, state, severity, inputs_hash, computed_at)
VALUES
(
  '96b44257-5c3b-4ec8-be04-1ada2d792257',
  '6c1f2465-2f78-4567-ab25-c87f537b4d54',
  jsonb_build_object(
    'state','ready','severity','amber',
    'headline','Start-up notifications issued to 6 of 8 affected units; 2 units (Utilities, Marine) pending acknowledgement before start-up.',
    'facts', jsonb_build_array(
      jsonb_build_object('label','Units notified','value','6 of 8','tone','amber'),
      jsonb_build_object('label','Outstanding','value','Utilities · Marine','tone','amber')
    ),
    'sources', jsonb_build_array(
      jsonb_build_object('label','Open notification register','href','#/registers/start-up-notifications')
    ),
    'delivering_action','Chase acknowledgement from Utilities and Marine before submitting for review.',
    'approver_check','Confirm the two outstanding units have acknowledged before accepting.'
  ),
  'ready','amber','seed-oi19-v1', now()
),
(
  '96b44257-5c3b-4ec8-be04-1ada2d792257',
  '7c84d396-2927-447d-bcfe-a35eed32db8d',
  jsonb_build_object(
    'state','ready','severity','green',
    'headline','Hydrocarbon Allocation application updated to the current asset structure; last sync verified 3 days ago.',
    'facts', jsonb_build_array(
      jsonb_build_object('label','Allocation structure','value','Current','tone','neutral'),
      jsonb_build_object('label','Last verified','value','3 days ago','tone','neutral')
    ),
    'sources', jsonb_build_array(
      jsonb_build_object('label','Open HCA register','href','#/registers/hca')
    )
  ),
  'ready','green','seed-ms11-v1', now()
)
ON CONFLICT (vcr_id, vcr_item_id) DO UPDATE
  SET payload = EXCLUDED.payload, state = EXCLUDED.state, severity = EXCLUDED.severity, inputs_hash = EXCLUDED.inputs_hash, computed_at = now();

DO $$
DECLARE
  v_vcr uuid := '96b44257-5c3b-4ec8-be04-1ada2d792257';
  v_oi19 uuid := '6c1f2465-2f78-4567-ab25-c87f537b4d54';
  v_ms11 uuid := '7c84d396-2927-447d-bcfe-a35eed32db8d';
  v_anuarbek uuid := '49d052ff-e30f-4b1f-b10b-7edeb83db97e';
  v_ghassan uuid := 'b502edf2-984a-44f4-855c-ede788fa0d5e';
  v_arvind uuid := 'e2146fc7-5d51-4e46-af7c-062addb2c40b';
  v_ewan uuid := '9358a12a-0c7c-44c7-a536-bb523c2e2829';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.vcr_item_comments WHERE handover_point_id = v_vcr AND vcr_item_id = v_oi19) THEN
    INSERT INTO public.vcr_item_comments (handover_point_id, vcr_item_id, author_user_id, body, action_tag, created_at) VALUES
      (v_vcr, v_oi19, v_anuarbek, 'Start-up notifications drafted and issued to Operations, Maintenance, HSE and Logistics. Awaiting Utilities and Marine to acknowledge before I close this out.', NULL, now() - interval '3 days'),
      (v_vcr, v_oi19, v_ghassan, 'Can you confirm the notification template includes the revised start-up window (04:00 not 06:00)? The one I saw last week had the old time.', NULL, now() - interval '2 days 6 hours'),
      (v_vcr, v_oi19, v_anuarbek, 'Good catch — template re-issued with the corrected 04:00 window. Marine already re-acknowledged. Utilities still pending.', NULL, now() - interval '2 days 2 hours'),
      (v_vcr, v_oi19, v_ewan, 'Returning to delivering party — please close out Utilities acknowledgement before resubmitting. Everything else looks fine.', 'Returned', now() - interval '1 day 4 hours'),
      (v_vcr, v_oi19, v_anuarbek, 'Utilities acknowledgement received this morning. Re-submitting for approval.', 'Completed', now() - interval '4 hours');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.vcr_item_comments WHERE handover_point_id = v_vcr AND vcr_item_id = v_ms11) THEN
    INSERT INTO public.vcr_item_comments (handover_point_id, vcr_item_id, author_user_id, body, action_tag, created_at) VALUES
      (v_vcr, v_ms11, v_anuarbek, 'HCA application updated with the new allocation structure per the revised P&IDs. Sync verified against the master register.', NULL, now() - interval '5 days'),
      (v_vcr, v_ms11, v_arvind, 'Sync log looks clean. Any residual manual adjustments to flag?', NULL, now() - interval '4 days'),
      (v_vcr, v_ms11, v_anuarbek, 'None — all mappings resolved automatically. Ready when you are.', 'Completed', now() - interval '3 days');
  END IF;
END $$;
