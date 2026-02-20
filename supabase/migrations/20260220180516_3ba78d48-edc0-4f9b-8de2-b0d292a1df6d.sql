-- Swap MTCE Lead for Central Mtce Lead in pssr_allowed_approver_roles
DELETE FROM pssr_allowed_approver_roles WHERE role_id = 'cd0c475f-b0e2-44dd-95f8-c3780faa1ecc';
INSERT INTO pssr_allowed_approver_roles (role_id) VALUES ('60ba58d0-b295-4a24-88e9-139b15d3d101')
ON CONFLICT DO NOTHING;