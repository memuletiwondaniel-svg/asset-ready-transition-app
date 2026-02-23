-- Delete stale/incorrect SoF approvers for PSSR-NRNGL-001 so they get re-created correctly
DELETE FROM sof_approvers WHERE pssr_id = '0039a01b-12e5-48fc-a7ec-7bca9b4fa1bb';
-- Also delete the stale SoF certificate so it gets re-created from PSSR data
DELETE FROM sof_certificates WHERE pssr_id = '0039a01b-12e5-48fc-a7ec-7bca9b4fa1bb';