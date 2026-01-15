-- Populate the junction tables with the correct role mappings from the Excel sheet
-- Using the role IDs from the roles table

-- OPERATIONAL CONTROL Prerequisites (display_order 1-13)

-- Prereq 1: All construction & commissioning scope completed
-- Delivering: TA2 Process - P&E, TA2 Elect - P&E, TA2 Rotating - P&E, TA2 Static - P&E, TA2 Civil - P&E, TA2 TSE - P&E
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('feb02189-3bf8-4bec-846d-5a43ff6b6fbc', '1ced17db-83bb-4dca-a52d-4cf80775336d', 1), -- TA2 Process - P&E
('feb02189-3bf8-4bec-846d-5a43ff6b6fbc', 'b11de257-f5e3-4411-993f-82f562764e67', 2), -- TA2 Elect - P&E
('feb02189-3bf8-4bec-846d-5a43ff6b6fbc', '73ccc6bd-243c-4c3a-b331-0bd0343d4bc3', 3), -- TA2 Rotating - P&E
('feb02189-3bf8-4bec-846d-5a43ff6b6fbc', 'd4eaf9c0-ed48-4632-a5b4-861219fee2dd', 4), -- TA2 Static - P&E
('feb02189-3bf8-4bec-846d-5a43ff6b6fbc', 'd80d8585-b843-4ed1-83fa-72ca1097bef8', 5), -- TA2 Civil - P&E
('feb02189-3bf8-4bec-846d-5a43ff6b6fbc', 'a03b8e9e-9d6c-434e-b0b6-e80ed3c8f155', 6); -- TA2 TSE - P&E

-- Receiving: TA2 Process - Asset, TA2 Elect - Asset, TA2 Rotating - Asset, TA2 Static - Asset, TA2 Civil - Asset, TA2 TSE - Asset, Deputy Plant Director
INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('feb02189-3bf8-4bec-846d-5a43ff6b6fbc', 'fc3d099b-8ac5-4b8a-885b-437366801241', 1), -- TA2 Process - Asset
('feb02189-3bf8-4bec-846d-5a43ff6b6fbc', '2ab553a8-953e-4d35-983e-73a1763337c0', 2), -- TA2 Elect - Asset
('feb02189-3bf8-4bec-846d-5a43ff6b6fbc', '4b2c2936-35ab-40a4-97bc-3ccb0ec5e11e', 3), -- TA2 Rotating - Asset
('feb02189-3bf8-4bec-846d-5a43ff6b6fbc', '5559dc07-2bc3-4238-80d0-ba966610c92c', 4), -- TA2 Static - Asset
('feb02189-3bf8-4bec-846d-5a43ff6b6fbc', '41cb8b07-4860-4528-ba85-6952e1e29b67', 5), -- TA2 Civil - Asset
('feb02189-3bf8-4bec-846d-5a43ff6b6fbc', '00b666c3-b900-41b0-8a92-a2b37f6e479e', 6), -- TA2 TSE - Asset
('feb02189-3bf8-4bec-846d-5a43ff6b6fbc', '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', 7); -- Deputy Plant Director

-- Prereq 2: All STQs and MOCs implemented
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('561a96b7-5f19-4254-8dc8-fd8789561194', '1ced17db-83bb-4dca-a52d-4cf80775336d', 1),
('561a96b7-5f19-4254-8dc8-fd8789561194', 'b11de257-f5e3-4411-993f-82f562764e67', 2),
('561a96b7-5f19-4254-8dc8-fd8789561194', '73ccc6bd-243c-4c3a-b331-0bd0343d4bc3', 3),
('561a96b7-5f19-4254-8dc8-fd8789561194', 'd4eaf9c0-ed48-4632-a5b4-861219fee2dd', 4),
('561a96b7-5f19-4254-8dc8-fd8789561194', 'd80d8585-b843-4ed1-83fa-72ca1097bef8', 5),
('561a96b7-5f19-4254-8dc8-fd8789561194', 'a03b8e9e-9d6c-434e-b0b6-e80ed3c8f155', 6);

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('561a96b7-5f19-4254-8dc8-fd8789561194', 'fc3d099b-8ac5-4b8a-885b-437366801241', 1),
('561a96b7-5f19-4254-8dc8-fd8789561194', '2ab553a8-953e-4d35-983e-73a1763337c0', 2),
('561a96b7-5f19-4254-8dc8-fd8789561194', '4b2c2936-35ab-40a4-97bc-3ccb0ec5e11e', 3),
('561a96b7-5f19-4254-8dc8-fd8789561194', '5559dc07-2bc3-4238-80d0-ba966610c92c', 4),
('561a96b7-5f19-4254-8dc8-fd8789561194', '41cb8b07-4860-4528-ba85-6952e1e29b67', 5),
('561a96b7-5f19-4254-8dc8-fd8789561194', '00b666c3-b900-41b0-8a92-a2b37f6e479e', 6),
('561a96b7-5f19-4254-8dc8-fd8789561194', '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', 7);

-- Prereq 3: 72-Hour performance test
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('cbb11853-a7eb-4488-9409-bd01b95d5b37', '88c54747-e81f-47ff-9574-7f982f8520cc', 1); -- Project Engr

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('cbb11853-a7eb-4488-9409-bd01b95d5b37', '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', 1), -- Deputy Plant Director
('cbb11853-a7eb-4488-9409-bd01b95d5b37', 'fc3d099b-8ac5-4b8a-885b-437366801241', 2), -- TA2 Process - Asset
('cbb11853-a7eb-4488-9409-bd01b95d5b37', '4b2c2936-35ab-40a4-97bc-3ccb0ec5e11e', 3); -- TA2 Rotating - Asset

-- Prereq 4: Operations Team trained
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('307f8cdb-5d70-437a-a6ca-54a3e6225b4c', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', 1); -- ORA Engr

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('307f8cdb-5d70-437a-a6ca-54a3e6225b4c', '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', 1); -- Deputy Plant Director

-- Prereq 5: SOPs approved
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('091673d1-2a51-4851-8c38-2a5418967be3', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', 1);

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('091673d1-2a51-4851-8c38-2a5418967be3', '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', 1);

-- Prereq 6: RLMU Documents uploaded
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('b10b48fa-4068-494a-8a86-9724546d47ed', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', 1);

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('b10b48fa-4068-494a-8a86-9724546d47ed', '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', 1);

-- Prereq 7: Operational Registers handed over
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('5df0f51b-1361-4f08-a65f-b3c0d0a33aa2', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', 1);

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('5df0f51b-1361-4f08-a65f-b3c0d0a33aa2', '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', 1);

-- Prereq 8: Alarm prioritization (TA2 PACO)
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('60a65bf8-11ee-4949-877a-20abfffd4885', 'dca11c8f-76ea-4b2a-a440-dcc610bcf8cf', 1); -- TA2 PACO - P&E

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('60a65bf8-11ee-4949-877a-20abfffd4885', 'ca604123-686a-4599-aafb-d92675475845', 1), -- TA2 PACO - Asset
('60a65bf8-11ee-4949-877a-20abfffd4885', '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', 2); -- Deputy Plant Director

-- Prereq 9: Temporary overrides removed
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('030c6cfb-e2ab-4ee2-afe2-93865a6c22ea', 'dca11c8f-76ea-4b2a-a440-dcc610bcf8cf', 1);

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('030c6cfb-e2ab-4ee2-afe2-93865a6c22ea', 'ca604123-686a-4599-aafb-d92675475845', 1);

-- Prereq 10: Software backups transferred
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('033b5c21-6943-4178-abca-ae78a1e2ad3a', 'dca11c8f-76ea-4b2a-a440-dcc610bcf8cf', 1);

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('033b5c21-6943-4178-abca-ae78a1e2ad3a', 'ca604123-686a-4599-aafb-d92675475845', 1);

-- Prereq 11: HAZOP actions closed
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('a092cc26-8e39-458d-9683-699dc6f555a7', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', 1);

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('a092cc26-8e39-458d-9683-699dc6f555a7', '00b666c3-b900-41b0-8a92-a2b37f6e479e', 1); -- TA2 TSE - Asset

-- Prereq 12: Consumables handed over
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('ae7285c1-a522-43c0-99c4-975318ff7483', '88c54747-e81f-47ff-9574-7f982f8520cc', 1);

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('ae7285c1-a522-43c0-99c4-975318ff7483', '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', 1);

-- Prereq 13: Service contracts in place
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('78ca3e50-2570-46f4-9de6-3c079534b1f2', 'cd0c475f-b0e2-44dd-95f8-c3780faa1ecc', 1); -- MTCE Lead

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('78ca3e50-2570-46f4-9de6-3c079534b1f2', 'cd0c475f-b0e2-44dd-95f8-c3780faa1ecc', 1); -- MTCE Lead (same as delivering)

-- CARE Prerequisites (display_order 1-6)

-- Prereq CARE-1: CMMS developed
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('b71ab716-30c4-4279-83e9-ac2b136c497a', 'cf134725-32a2-4b55-bfd4-dd4e45682d9d', 1); -- CMMS Lead

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('b71ab716-30c4-4279-83e9-ac2b136c497a', '2553f868-1d8b-4b6e-89be-6167285e7f4e', 1); -- MMS Lead

-- Prereq CARE-2: PM Routines activated
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('b63104ce-4dbf-48d3-b3ac-8cd039510e6f', 'cf134725-32a2-4b55-bfd4-dd4e45682d9d', 1);

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('b63104ce-4dbf-48d3-b3ac-8cd039510e6f', '2553f868-1d8b-4b6e-89be-6167285e7f4e', 1);

-- Prereq CARE-3: IMS setup
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('aac8a99b-e9d3-451a-8132-702f03785780', 'cf134725-32a2-4b55-bfd4-dd4e45682d9d', 1);

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('aac8a99b-e9d3-451a-8132-702f03785780', '5559dc07-2bc3-4238-80d0-ba966610c92c', 1), -- TA2 Static - Asset
('aac8a99b-e9d3-451a-8132-702f03785780', '3b16e158-b055-4733-8390-30584bc22927', 2); -- TA2 MCI - Asset

-- Prereq CARE-4: 2Y Operating Spares
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('a943bd53-4e95-48d6-a704-692ca235deda', '30cdf515-9180-419a-8ed5-85e964b25364', 1); -- Inventory Manager

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('a943bd53-4e95-48d6-a704-692ca235deda', '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', 1);

-- Prereq CARE-5: Special Tools handed over
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('d37c1bd4-9215-42ad-a5d1-d39ff07348a9', 'cf134725-32a2-4b55-bfd4-dd4e45682d9d', 1);

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('d37c1bd4-9215-42ad-a5d1-d39ff07348a9', '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', 1);

-- Prereq CARE-6: IAP/Production Management updated
INSERT INTO public.pac_prerequisite_delivering_parties (prerequisite_id, role_id, display_order) VALUES
('7775ed16-d0bf-4269-90d9-2a8d58946ed8', '5cb2b79d-b60c-40a1-ab79-50410da2c8c7', 1);

INSERT INTO public.pac_prerequisite_receiving_parties (prerequisite_id, role_id, display_order) VALUES
('7775ed16-d0bf-4269-90d9-2a8d58946ed8', '0e8c8c81-578a-4f7b-9d3f-929737dd8b29', 1);