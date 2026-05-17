
-- Re-point FO profile links from the FO-specific duplicates to the shared ones
UPDATE competence_profile_competencies
  SET competency_id='22222222-2222-2222-2222-222222222212'
  WHERE competency_id='22222222-2222-2222-2222-222222222221';

UPDATE competence_profile_competencies
  SET competency_id='22222222-2222-2222-2222-222222222213'
  WHERE competency_id='22222222-2222-2222-2222-222222222225';

-- Remove duplicates
DELETE FROM competencies WHERE id IN (
  '22222222-2222-2222-2222-222222222221',
  '22222222-2222-2222-2222-222222222225'
);

-- Rewrite descriptions (generic, no "CRO" references)
UPDATE competencies SET description='Operators must demonstrate a solid understanding of the site HSE Case, including Major Accident Hazards and Bowties, MOPO and SIMOPS requirements, Emergency Response Procedures, and communication protocols. Operators must apply this knowledge to maintain safe operations, recognise and manage risk, ensure compliance with operating limits, and respond effectively to abnormal and emergency situations.'
WHERE id='22222222-2222-2222-2222-222222222201';

UPDATE competencies SET description='Operators must demonstrate a comprehensive and detailed understanding of the plant and process, including the ability to interpret and apply key technical documents such as P&IDs, Process Control Narratives and control loops, Cause & Effects, Process Safeguarding Memorandum, and HAZOP studies. This knowledge must be used to ensure safe, stable, and efficient operation, effective troubleshooting, and informed decision-making under both normal and abnormal conditions.'
WHERE id='22222222-2222-2222-2222-222222222202';

UPDATE competencies SET description='Operators must demonstrate a sound operational understanding of key plant equipment, such as compressors and packaged units. This includes knowledge of basic operating principles, performance characteristics, normal operating ranges, and common failure modes. Operators must use this understanding to support safe operation, effective monitoring, early fault detection, and appropriate response to equipment-related issues.'
WHERE id='22222222-2222-2222-2222-222222222203';

UPDATE competencies SET description='Operators must demonstrate a thorough understanding and correct application of all applicable Standard Operating Procedures (SOPs), including Initial Start-Up Procedures (ISUP), Normal Operating Procedures, and other relevant operational guidelines. Operators must be able to execute procedures accurately to ensure safe, efficient, and compliant plant operation under both normal and abnormal conditions.'
WHERE id='22222222-2222-2222-2222-222222222204';

UPDATE competencies SET description='Operators must possess the fundamental competencies required to manage the significant operational risks associated with production activities. This includes mastering Management of Change (MOC), safe shift handovers, process safety hazard control, and fire and explosion protection. Operators are mandated and expected to Stabilise, Slowdown, or Shutdown an installation to ensure the safety of staff and the facility when a deviation occurs.'
WHERE id='22222222-2222-2222-2222-222222222205';

UPDATE competencies SET description='Operators must demonstrate proficiency in understanding and using Human-Machine Interface (HMI) tools and technical functionalities within the Distributed Control System (DCS) / Integrated Control and Safeguarding System. This includes effective navigation, monitoring, alarm management, trend analysis, and utilisation of control and safeguarding features to ensure safe, reliable, and efficient plant operation.'
WHERE id='22222222-2222-2222-2222-222222222210';

UPDATE competencies SET description='Operators must understand the significance of process variable limits and effectively use the Master Alarm Database to anticipate, monitor, and prevent potential operational issues.'
WHERE id='22222222-2222-2222-2222-222222222211';

-- Merge Proactive Monitoring (CRO + FO into one)
UPDATE competencies
  SET title='Proactive Monitoring',
      description='Operators must be able to proactively identify potential threats and opportunities by effectively applying approved Monitoring Plans, enabling early intervention to address process or equipment performance issues and optimise operations. Field Operators carry out proactive monitoring rounds in their assigned area, monitor and record key process parameters at the agreed frequency, report operational exceedances, and identify and assess abnormal conditions (e.g., minor leaks, unusual noise, vibration) early — taking timely corrective action or escalation.'
WHERE id='22222222-2222-2222-2222-222222222212';

-- Merge Situational Awareness (CRO + FO into one)
UPDATE competencies
  SET title='Situational Awareness',
      description='Operators must demonstrate the ability to conduct effective shift handovers through clear, structured communication that ensures full situational awareness of process conditions, risks, mitigation measures, equipment status, and ongoing operational or maintenance activities. This includes the four key elements: Shift Handover (SH) / Crew Change, Start of Shift Orientation (SoSO), Shift Team Meeting (STM), and End of Shift Report (EoSR). Situational awareness during handover ensures the incoming shift understands threats to the production plan, mitigations, and equipment availability — minimising the risk of incidents, aligning the crew on HSSE status and process safety threats, and clarifying the priorities required to meet the production plan safely.'
WHERE id='22222222-2222-2222-2222-222222222213';

UPDATE competencies SET title='Managing Abnormal Situations',
  description='Operators must be able to recognise and respond to abnormal situations using a structured approach to safely restore normal operations. This includes applying Stabilise, Slowdown, or Shutdown (SSS) principles to protect personnel and assets. Operators must effectively use available references (e.g., alarm databases, procedures, manuals) and promptly seek support from their team and Operations staff when required.'
WHERE id='22222222-2222-2222-2222-222222222214';

UPDATE competencies SET description='Operators must strictly adhere to the requirements for bypassing safety controls, which mandate obtaining formal authorisation before overriding or disabling safety-critical equipment by applying MOS. Operators must fully understand the consequences and process safety risks of applying MOS, and must ensure that all MOS applications are properly recorded and maintained after implementation. Operators must record and refer to the operational register whenever managing abnormal situations. Every abnormal situation — including triggers, actions taken, and mitigations implemented — must be recorded in the End of Shift Report (EoSR) to provide a historical record for investigation and to prevent the recurrence of incidents.'
WHERE id='22222222-2222-2222-2222-222222222215';

UPDATE competencies SET description='Operators must approve and verify isolations (LOTO / energy isolation), ensure systems are safely handed over for maintenance, and confirm reinstatement after work completion.'
WHERE id='22222222-2222-2222-2222-222222222220';

UPDATE competencies SET description='Operators must perform CLAIR (Cleaning, Lubrication, Adjustment, Inspect and Repair) on assigned critical equipment in their assigned area as described in Maintenance Assist, perform first-line troubleshooting effectively within defined limits, and support maintenance activities while safeguarding equipment integrity and process safety.'
WHERE id='22222222-2222-2222-2222-222222222222';

UPDATE competencies SET description='Operators must verify PTW and ensure all activities within their area of custody comply with HSE and Permit requirements; confirm that work is safe to proceed within the area, including gas testing; support Maintenance, Contractors, and vendors performing concurrent operations on site as Area Authority; ensure SIMOPS (simultaneous operations) are properly managed; verify isolations, barriers, and safeguards are in place; ensure hazards are identified, assessed, and controlled; and maintain and verify Operational Registers within the Area of Custody.'
WHERE id='22222222-2222-2222-2222-222222222223';

UPDATE competencies SET title='Managing Abnormal Situations / ER',
  description='Operators must check, report, and take immediate action during unsafe situations, participate in incident investigations, and support emergency response within their area.'
WHERE id='22222222-2222-2222-2222-222222222224';

UPDATE competencies SET description='Operators must demonstrate: (1) Safety Leadership — visible commitment to safety, LSR compliance, identifying and mitigating hazards; (2) Team Leadership & People Management — developing and coaching subordinates; (3) Decision Making & Problem Solving — making timely decisions under pressure, with appropriate escalation; and (4) Planning, Work Coordination, and interface management.'
WHERE id='22222222-2222-2222-2222-222222222230';

UPDATE competencies SET description='Operators must: (1) understand Major Accident Hazards (MAH); (2) understand ER Protocols (Tiers, Organisation, Roles & Responsibilities, Procedures); (3) demonstrate ER Leadership — take command at site level, lead and delegate tasks effectively, and respond to emergencies; (4) communicate and coordinate with ER teams and other interfaces; and (5) initiate ER actions (e.g., activate FW system, PAGA, ESD hierarchy).'
WHERE id='22222222-2222-2222-2222-222222222231';

UPDATE competencies SET description='Operators must demonstrate: (1) deep understanding of production system limitations, threats, and opportunities; (2) ability to measure and evaluate production and equipment performance and understand performance data and expectations; (3) proactive identification of threats and opportunities; (4) ability to conduct simple RCAs (e.g., 5-Whys) to identify and resolve root causes; and (5) effective use of MTO tools (e.g., dashboards).'
WHERE id='22222222-2222-2222-2222-222222222232';

UPDATE competencies SET description='Operators must: (1) understand the PTW process, procedures, and roles & responsibilities; (2) review and authorise permits; and (3) review and authorise process and equipment isolation.'
WHERE id='22222222-2222-2222-2222-222222222233';

UPDATE competencies SET description='Operators must understand the principles of Management of Change, identify when and where an MoC is required, and initiate and implement an MoC where applicable.'
WHERE id='22222222-2222-2222-2222-222222222234';

UPDATE competencies SET description='Operators must: (1) prepare Daily Production and Critical Equipment Status Reports; (2) prepare Shift Handover Reports; and (3) prepare and implement Shift Monitoring Plans.'
WHERE id='22222222-2222-2222-2222-222222222235';

UPDATE competencies SET description='Operators must: (1) understand Technical Integrity and the maintenance of Safety Critical Elements (SCE); and (2) understand Maintenance Work Processes and Tools (Work Preparation, Planning, and Execution).'
WHERE id='22222222-2222-2222-2222-222222222236';
