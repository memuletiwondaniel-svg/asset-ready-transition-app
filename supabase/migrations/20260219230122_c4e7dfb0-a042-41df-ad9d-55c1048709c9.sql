-- Delete all dependent records first, then PSSRs
DELETE FROM public.pssr_walkdown_observations;
DELETE FROM public.pssr_walkdown_events;
DELETE FROM public.pssr_priority_actions;
DELETE FROM public.pssr_item_approvals;
DELETE FROM public.pssr_discipline_reviews;
DELETE FROM public.pssr_selected_ati_scopes;
DELETE FROM public.pssr_links;
DELETE FROM public.pssr_checklist_responses;
DELETE FROM public.pssr_approvers;
DELETE FROM public.pssr_team_members;
DELETE FROM public.sof_approvers;
DELETE FROM public.sof_certificates;
DELETE FROM public.task_delegations WHERE pssr_id IS NOT NULL;
DELETE FROM public.notifications WHERE pssr_id IS NOT NULL;
DELETE FROM public.pssrs;
