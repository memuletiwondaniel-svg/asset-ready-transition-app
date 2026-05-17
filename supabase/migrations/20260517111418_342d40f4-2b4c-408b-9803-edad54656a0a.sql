
DELETE FROM person_activity_records;
DELETE FROM competence_activities;

-- Helper macro values are inlined; weight defaults to 10
INSERT INTO competence_activities (competency_id, title, activity_type, sequence_order) VALUES
-- 201 Safety Case
('22222222-2222-2222-2222-222222222201','Site Induction & Safety Training','e_learning',1),
('22222222-2222-2222-2222-222222222201','Life Saving Rules','e_learning',2),
('22222222-2222-2222-2222-222222222201','Designated First Aider (DFA) — ER Training (L&D)','certification',3),
('22222222-2222-2222-2222-222222222201','Fire — First Responders Course (F-FRC)','certification',4),
('22222222-2222-2222-2222-222222222201','Man Down — First Responder Course (MD-FRC)','certification',5),
('22222222-2222-2222-2222-222222222201','Operators — Your Role in an Emergency (OYRIE)','e_learning',6),
('22222222-2222-2222-2222-222222222201','AIPSM Foundational Course','e_learning',7),
('22222222-2222-2222-2222-222222222201','Training Session on UQFR Design HSE Case — MAHs, Bowties, underlying concepts (by ORA/TSE)','e_learning',8),
('22222222-2222-2222-2222-222222222201','Training Session on PIPs etc. (by ER Team)','e_learning',9),
('22222222-2222-2222-2222-222222222201','Refresher on OMP-10','e_learning',10),

-- 202 Plant & Process Overview
('22222222-2222-2222-2222-222222222202','P&ID Course (by L&D)','e_learning',1),
('22222222-2222-2222-2222-222222222202','Training Modules per Process System — Classroom (by ORA/Line Trainer)','e_learning',2),
('22222222-2222-2222-2222-222222222202','Training Modules per Process System — Field / OJT','ojt',3),
('22222222-2222-2222-2222-222222222202','Training Modules per Process System — Assessment','assessment',4),
('22222222-2222-2222-2222-222222222202','DP83 Project-Specific Process Overview, Process Flow, Alarms/VT, Safeguarding, Basic Process Operations, Key Equipment & Graphics Overview','e_learning',5),

-- 203 Equipment-Specific Knowledge
('22222222-2222-2222-2222-222222222203','Vendor-based Training — Compressor Packages','vendor_training',1),
('22222222-2222-2222-2222-222222222203','Vendor-based Training — RO Package','vendor_training',2),
('22222222-2222-2222-2222-222222222203','Vendor-based Training — Air Compressors','vendor_training',3),
('22222222-2222-2222-2222-222222222203','Vendor-based Training — N2 Package','vendor_training',4),

-- 204 SOPs
('22222222-2222-2222-2222-222222222204','Participate in Asset Work Register (AWR) Workshop — identify and define procedures / WIs needed','other',1),
('22222222-2222-2222-2222-222222222204','Training Session on Procedure Writing','e_learning',2),
('22222222-2222-2222-2222-222222222204','Develop Procedure / Checklist + Markup applicable P&IDs or drawings','other',3),
('22222222-2222-2222-2222-222222222204','Validate and Translate final operating procedures','other',4),
('22222222-2222-2222-2222-222222222204','Participate in Procedure Desktop Review Sessions & SUOP exercise','other',5),

-- 205 PSF
('22222222-2222-2222-2222-222222222205','PSF Training by ORA','e_learning',1),

-- 210 DCS Panel Operations
('22222222-2222-2222-2222-222222222210','Yokogawa Basic Operator DCS Training — Level 0: Equipment Prep, Electrical & Electronics Essentials, Physics & Field Instruments (by L&D)','e_learning',1),
('22222222-2222-2222-2222-222222222210','Yokogawa Basic Operator DCS Training — Level 1: Process Control Principles, DCS & PLC, ESD Fundamentals, Alarm Mgmt, PID (by L&D)','e_learning',2),
('22222222-2222-2222-2222-222222222210','Yokogawa Basic Operator DCS Training — Level 2: ICSS Architecture (BGC: MT, ST, KAZ, CS, NGL), Centum VP, CAMS, ProSafe RS (by L&D)','e_learning',3),
('22222222-2222-2222-2222-222222222210','Yokogawa Basic Operator DCS Training — Level 3: TBC (by L&D)','e_learning',4),

-- 211 Alarm Management
('22222222-2222-2222-2222-222222222211','Shell ESP Module 1: ESP Overview (DC0000048397)','e_learning',1),
('22222222-2222-2222-2222-222222222211','Shell ESP Module 2: ESP Pyramid (DC0000048593)','e_learning',2),
('22222222-2222-2222-2222-222222222211','Shell ESP Module 3: ESP Master Alarm Database (DC0000048400)','e_learning',3),
('22222222-2222-2222-2222-222222222211','Refresher on OMP-08 (Alarm Management) and SEAM Manage Alarm Guidelines','e_learning',4),
('22222222-2222-2222-2222-222222222211','Variable Table Desktop Review with OPS','other',5),
('22222222-2222-2222-2222-222222222211','Two-week rotation in KAZ CCR','ojt',6),
('22222222-2222-2222-2222-222222222211','Operator Training Simulator (OTS) Onsite Training','ojt',7),

-- 212 Proactive Monitoring (shared)
('22222222-2222-2222-2222-222222222212','Shell ESP Module 1: ESP Overview (DC0000048397)','e_learning',1),
('22222222-2222-2222-2222-222222222212','Shell ESP Module 2: ESP Pyramid (DC0000048593)','e_learning',2),
('22222222-2222-2222-2222-222222222212','Shell ESP Module 4: ESP Proactive Monitoring (DC0000049662)','e_learning',3),
('22222222-2222-2222-2222-222222222212','Refresher on OMP-07 and SEAM Proactive Monitoring Standard Practice','e_learning',4),
('22222222-2222-2222-2222-222222222212','Develop Standard Work Instruction for CRO Proactive Monitoring (key parameters, intervals, screens) with Asset Process Engineer','other',5),
('22222222-2222-2222-2222-222222222212','Two-week rotation in KAZ CCR','ojt',6),
('22222222-2222-2222-2222-222222222212','Operator Training Simulator (OTS) Onsite Training','ojt',7),
('22222222-2222-2222-2222-222222222212','Roll-out & Training on OMP-07 (Proactive Monitoring)','ojt',8),
('22222222-2222-2222-2222-222222222212','Roll-out Field Operator Logsheets','ojt',9),
('22222222-2222-2222-2222-222222222212','Site Exercise and Assessment by Line Trainers / OJT','ojt',10),

-- 213 Situational Awareness (shared)
('22222222-2222-2222-2222-222222222213','Shell ESP Module 1: ESP Overview (DC0000048397)','e_learning',1),
('22222222-2222-2222-2222-222222222213','Shell ESP Module 2: ESP Pyramid (DC0000048593)','e_learning',2),
('22222222-2222-2222-2222-222222222213','Shell ESP Module 5: ESP Situational Awareness (DC0000048398)','e_learning',3),
('22222222-2222-2222-2222-222222222213','Roll-out and Training on OMP-23 (Situational Awareness)','ojt',4),
('22222222-2222-2222-2222-222222222213','Two-week rotation in KAZ CCR','ojt',5),
('22222222-2222-2222-2222-222222222213','Roll-out / Induction Training on Templates / Shift Handover / SOSO + Handholding & Coaching','mentoring',6),
('22222222-2222-2222-2222-222222222213','Shift commences 8 weeks before RFSU — phased handover of utilities per P2A/VCR Plan','ojt',7),

-- 214 Managing Abnormal Situations (CRO)
('22222222-2222-2222-2222-222222222214','Shell ESP Module 1: ESP Overview (DC0000048397)','e_learning',1),
('22222222-2222-2222-2222-222222222214','Shell ESP Module 2: ESP Pyramid (DC0000048593)','e_learning',2),
('22222222-2222-2222-2222-222222222214','Shell ESP Module 6: ESP Managing Abnormal Situation (DC0000049601)','e_learning',3),
('22222222-2222-2222-2222-222222222214','Refresher on OMP-09 (Managing Abnormal Situations) and SEAM Managing Abnormal Situations Practice Guide','e_learning',4),
('22222222-2222-2222-2222-222222222214','Refresher on OMP-10 (Respond to Emergencies)','e_learning',5),
('22222222-2222-2222-2222-222222222214','Refresher on OMP-04 (Management of Hydrocarbon Leaks)','e_learning',6),
('22222222-2222-2222-2222-222222222214','Refresher on site-specific Emergency Response Procedures','e_learning',7),
('22222222-2222-2222-2222-222222222214','Two-week rotation in KAZ CCR','ojt',8),
('22222222-2222-2222-2222-222222222214','Management of Major Emergencies Course (TBC)','e_learning',9),
('22222222-2222-2222-2222-222222222214','Operator Training Simulator (OTS) Onsite Training','ojt',10),

-- 215 Operational Registers & Logsheets - MOS / Alarm Overrides
('22222222-2222-2222-2222-222222222215','Roll-out & Training on OMP-03 (Operational Registers)','ojt',1),
('22222222-2222-2222-2222-222222222215','Roll-out & Training on OMP-16 (Safety System Isolation & Override Control)','ojt',2),
('22222222-2222-2222-2222-222222222215','Roll-out & Training on OMP-05 (SCE Deviations Management)','ojt',3),
('22222222-2222-2222-2222-222222222215','Training on SEAM Overrides of Safeguarding Systems','e_learning',4),
('22222222-2222-2222-2222-222222222215','Roll-out / Induction Training on Operational Registers & Logsheets + Handholding & Coaching','mentoring',5),

-- 220 Isolation and Reinstatement (FO)
('22222222-2222-2222-2222-222222222220','Isolation & DFPV Training (by L&D)','e_learning',1),
('22222222-2222-2222-2222-222222222220','Site Exercise and Assessment by Line Trainers (e.g. Produce & demonstrate Isolation Plan)','assessment',2),
('22222222-2222-2222-2222-222222222220','Participate in Commissioning Activities','ojt',3),
('22222222-2222-2222-2222-222222222220','Roll-out & Training on OMP-14 (Red Spade Isolation)','ojt',4),
('22222222-2222-2222-2222-222222222220','Roll-out & Training on OMP-13 (Isolation, Reinstatement of Plant & Equipment)','ojt',5),
('22222222-2222-2222-2222-222222222220','Roll-out & Training on OMP-15 (Master Boundary Isolation)','ojt',6),
('22222222-2222-2222-2222-222222222220','Roll-out & Training on OMP-16 (Safety System Isolation & Override Control)','ojt',7),
('22222222-2222-2222-2222-222222222220','Roll-out & Training on OMP-17 (Draining, Flushing, Purging & Venting)','ojt',8),

-- 222 First Line Maintenance (FO)
('22222222-2222-2222-2222-222222222222','Roll-out & Training on OMP-24 (Maintenance Assist)','ojt',1),
('22222222-2222-2222-2222-222222222222','OJT and Line Training Support','ojt',2),
('22222222-2222-2222-2222-222222222222','Basic Operator Training (by L&D)','e_learning',3),

-- 223 Worksite Management (FO)
('22222222-2222-2222-2222-222222222223','Permit to Work (PTW — OMP-22) Training (by L&D) — TBC','e_learning',1),
('22222222-2222-2222-2222-222222222223','Work Management Procedure (WMP) Training (by L&D)','e_learning',2),
('22222222-2222-2222-2222-222222222223','Authorised Gas Tester Training (by L&D)','certification',3),
('22222222-2222-2222-2222-222222222223','Working at Height Training (by L&D)','certification',4),
('22222222-2222-2222-2222-222222222223','Confined Space Entry Training (by L&D)','certification',5),
('22222222-2222-2222-2222-222222222223','Roll-out & Training on OMP-18 (Operation & Management of Open Drains)','ojt',6),
('22222222-2222-2222-2222-222222222223','Roll-out & Training on OMP-12 (Gas Testing)','ojt',7),
('22222222-2222-2222-2222-222222222223','Roll-out & Training on OMP-26 (Chemical Injection)','ojt',8),
('22222222-2222-2222-2222-222222222223','Roll-out & Training on OMP-27 (Lubricants Handling & Storage)','ojt',9),
('22222222-2222-2222-2222-222222222223','Roll-out Operational Registers (LOLC, Hose, Leaking Valve, Temp Equip Registers)','ojt',10),

-- 224 Managing Abnormal Situations / ER (FO)
('22222222-2222-2222-2222-222222222224','Roll-out & Training on OMP-09 (Managing Abnormal Situations)','ojt',1),
('22222222-2222-2222-2222-222222222224','Roll-out & Training on OMP-10 (Responding to Emergencies)','ojt',2),

-- 230 Front Line Leadership
('22222222-2222-2222-2222-222222222230','HSSE Leadership for Front Line Supervisors (by L&D)','e_learning',1),
('22222222-2222-2222-2222-222222222230','Two-week STA to BNGL or KAZ','ojt',2),
('22222222-2222-2222-2222-222222222230','AIPSM Master Class (by L&D)','e_learning',3),
('22222222-2222-2222-2222-222222222230','OJT during commissioning & startup activities','ojt',4),
('22222222-2222-2222-2222-222222222230','Participate in TBT for commissioning activities','ojt',5),

-- 231 Emergency Response
('22222222-2222-2222-2222-222222222231','ER Training (by L&D)','e_learning',1),
('22222222-2222-2222-2222-222222222231','Roll-out OMP-10 (Respond to Emergencies)','ojt',2),
('22222222-2222-2222-2222-222222222231','Training on UQ PIP, MAH and ER SOPs (HSSE Team)','e_learning',3),
('22222222-2222-2222-2222-222222222231','Training on ESD Systems & Protocols','e_learning',4),
('22222222-2222-2222-2222-222222222231','Training on ER Equipment (e.g. Fire Water Systems)','e_learning',5),
('22222222-2222-2222-2222-222222222231','Participate & Coordinate ER Exercises','ojt',6),

-- 232 MTO
('22222222-2222-2222-2222-222222222232','MTO Training (by L&D)','e_learning',1),
('22222222-2222-2222-2222-222222222232','5-WHYs Training','e_learning',2),
('22222222-2222-2222-2222-222222222232','Participate in Commissioning Activities — identify Threats and Opportunities; document in MTO dashboard at PAC','ojt',3),

-- 233 PTW
('22222222-2222-2222-2222-222222222233','PTW Training Level 1, 2, 3 (by L&D)','certification',1),

-- 234 MoC
('22222222-2222-2222-2222-222222222234','MoC Training (by L&D)','e_learning',1),
('22222222-2222-2222-2222-222222222234','ePAS Training & System Access (via MoC Coordinator)','e_learning',2),
('22222222-2222-2222-2222-222222222234','Roll-out and Training on WMP-17','ojt',3),

-- 235 Communication & Reporting
('22222222-2222-2222-2222-222222222235','Roll-out & Training on Production Reporting Templates','ojt',1),
('22222222-2222-2222-2222-222222222235','Roll-out & Training on Shift Handover Report Templates','ojt',2),

-- 236 Maintenance Planning & Execution
('22222222-2222-2222-2222-222222222236','AIPSM Training','e_learning',1),
('22222222-2222-2222-2222-222222222236','MIE Training','e_learning',2),
('22222222-2222-2222-2222-222222222236','SAP Training & Access','e_learning',3),
('22222222-2222-2222-2222-222222222236','ePAS Training & Access','e_learning',4),
('22222222-2222-2222-2222-222222222236','Participate in Planning & Scheduling meetings & YTT meetings','ojt',5);
