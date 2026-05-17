
-- New competencies
INSERT INTO competencies (id, title, description) VALUES
-- CRO Knowledge (set 2)
('22222222-2222-2222-2222-222222222210','DCS Panel Operations','CROs must demonstrate proficiency in understanding and using Human-Machine Interface (HMI) tools and technical functionalities within the Distributed Control System (DCS) / Integrated Control and Safeguarding System. This includes effective navigation, monitoring, alarm management, trend analysis, and utilisation of control and safeguarding features to ensure safe, reliable, and efficient plant operation.'),
('22222222-2222-2222-2222-222222222211','Alarm Management','CROs must understand the significance of process variable limits and effectively use the Master Alarm Database to anticipate, monitor, and prevent potential operational issues.'),
('22222222-2222-2222-2222-222222222212','Proactive Monitoring (CRO)','CROs must be able to proactively identify potential threats and opportunities by effectively applying approved Monitoring Plans, enabling early intervention to address process or equipment performance issues and optimise operations.'),
('22222222-2222-2222-2222-222222222213','Situational Awareness (CRO)','CROs must demonstrate the ability to conduct effective shift handovers through clear, structured communication that ensures full situational awareness of process conditions, risks, mitigation measures, equipment status, and ongoing operational or maintenance activities. This includes the 4 key elements: Shift Handover (SH) / Crew Change, Start of Shift Orientation (SoSO), Shift Team Meeting (STM), and End of Shift Report (EoSR).'),
('22222222-2222-2222-2222-222222222214','Managing Abnormal Situations (CRO)','CROs must be able to recognise and respond to abnormal situations using a structured approach to safely restore normal operations. This includes applying Stabilise, Slowdown, or Shutdown (SSS) principles to protect personnel and assets. CROs must effectively use available references (e.g., alarm databases, procedures, manuals) and promptly seek support from their team and Operations staff when required.'),
('22222222-2222-2222-2222-222222222215','Operational Registers & Logsheets — MOS/Alarm Overrides','CROs must strictly adhere to the requirements for bypassing safety controls, which mandate obtaining formal authorisation before overriding or disabling safety-critical equipment by applying MOS. CROs must fully understand the consequences and process safety risks of applying MOS, and must ensure that all MOS applications are properly recorded and maintained after implementation. CROs must record and refer to the operational register whenever managing abnormal situations. Every abnormal situation — including triggers, actions taken, and mitigations implemented — must be recorded in the End of Shift Report (EoSR) to provide a historical record for investigation and to prevent the recurrence of incidents.'),

-- Field Operator Skills
('22222222-2222-2222-2222-222222222220','Isolation and Reinstatement','Field Operators must approve and verify isolations (LOTO / energy isolation), ensure systems are safely handed over for maintenance, and confirm reinstatement after work completion.'),
('22222222-2222-2222-2222-222222222221','Proactive Monitoring (FO)','Field Operators must carry out proactive monitoring rounds in their own area, monitor and record key process parameters at the agreed frequency and report operational exceedances, and identify and assess abnormal conditions (e.g., minor leaks, unusual noise, vibration) early — taking timely corrective action or escalation.'),
('22222222-2222-2222-2222-222222222222','First Line Maintenance','Field Operators must perform CLAIR (Cleaning, Lubrication, Adjustment, Inspect and Repair) on assigned critical equipment in their assigned area as described in Maintenance Assist, perform first-line troubleshooting effectively within defined limits, and support maintenance activities while safeguarding equipment integrity and process safety.'),
('22222222-2222-2222-2222-222222222223','Worksite Management','Field Operators must verify PTW and ensure all activities within their area of custody comply with HSE and Permit requirements; confirm that work is safe to proceed within the area, including gas testing; support Maintenance, Contractors, and vendors performing concurrent operations on site as Area Authority; ensure SIMOPS (simultaneous operations) are properly managed; verify isolations, barriers, and safeguards are in place; ensure hazards are identified, assessed, and controlled; and maintain and verify Operational Registers within the Area of Custody.'),
('22222222-2222-2222-2222-222222222224','Managing Abnormal Situations / ER (FO)','Field Operators must check, report, and take immediate action during unsafe situations, participate in incident investigations, and support emergency response within their area.'),
('22222222-2222-2222-2222-222222222225','Situational Awareness (FO)','Field Operator situational awareness is critical during handover of responsibilities to ensure the incoming shift understands threats to the production plan, mitigations, and equipment availability — thereby minimising the risk of incidents, aligning the entire crew on HSSE status and threats to process safety, and clarifying the specific priorities required to meet the production plan safely.'),

-- Shared CRO + FO Skills
('22222222-2222-2222-2222-222222222230','Front Line Leadership','CROs and Field Operators must demonstrate: (1) Safety Leadership — visible commitment to safety, LSR compliance, identifying and mitigating hazards; (2) Team Leadership & People Management — developing and coaching subordinates; (3) Decision Making & Problem Solving — making timely decisions under pressure, with appropriate escalation; and (4) Planning, Work Coordination, and interface management.'),
('22222222-2222-2222-2222-222222222231','Emergency Response','CROs and Field Operators must: (1) understand Major Accident Hazards (MAH); (2) understand ER Protocols (Tiers, Organisation, Roles & Responsibilities, Procedures); (3) demonstrate ER Leadership — take command at site level, lead and delegate tasks effectively, and respond to emergencies; (4) communicate and coordinate with ER teams and other interfaces; and (5) initiate ER actions (e.g., activate FW system, PAGA, ESD hierarchy).'),
('22222222-2222-2222-2222-222222222232','MTO (Manage The Operation)','CROs and Field Operators must demonstrate: (1) deep understanding of production system limitations, threats, and opportunities; (2) ability to measure and evaluate production and equipment performance and understand performance data and expectations; (3) proactive identification of threats and opportunities; (4) ability to conduct simple RCAs (e.g., 5-Whys) to identify and resolve root causes; and (5) effective use of MTO tools (e.g., dashboards).'),
('22222222-2222-2222-2222-222222222233','Permit to Work (PTW)','CROs and Field Operators must: (1) understand the PTW process, procedures, and roles & responsibilities; (2) review and authorise permits; and (3) review and authorise process and equipment isolation.'),
('22222222-2222-2222-2222-222222222234','Management of Change (MoC)','CROs and Field Operators must understand the principles of Management of Change, identify when and where an MoC is required, and initiate and implement an MoC where applicable.'),
('22222222-2222-2222-2222-222222222235','Communication & Reporting','CROs and Field Operators must: (1) prepare Daily Production and Critical Equipment Status Reports; (2) prepare Shift Handover Reports; and (3) prepare and implement Shift Monitoring Plans.'),
('22222222-2222-2222-2222-222222222236','Maintenance Planning & Execution','CROs and Field Operators must: (1) understand Technical Integrity and the maintenance of Safety Critical Elements (SCE); and (2) understand Maintenance Work Processes and Tools (Work Preparation, Planning, and Execution).');

-- Profile links
INSERT INTO competence_profile_competencies (profile_id, competency_id, weight, required_milestone) VALUES
-- CRO knowledge set 2
('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222210',2,'mastery'),
('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222211',1,'knowledge'),
('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222212',1,'skill'),
('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222213',2,'mastery'),
('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222214',2,'mastery'),
('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222215',1,'mastery'),
-- FO skills
('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222220',2,'mastery'),
('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222221',2,'mastery'),
('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222222',1,'skill'),
('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222223',2,'mastery'),
('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222224',2,'mastery'),
('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222225',1,'skill'),
-- Shared CRO
('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222230',2,'mastery'),
('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222231',2,'mastery'),
('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222232',1,'skill'),
('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222233',2,'mastery'),
('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222234',1,'skill'),
('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222235',1,'skill'),
('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222236',1,'knowledge'),
-- Shared FO
('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222230',2,'mastery'),
('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222231',2,'mastery'),
('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222232',1,'skill'),
('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222233',2,'mastery'),
('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222234',1,'skill'),
('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222235',1,'skill'),
('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222236',1,'knowledge');
