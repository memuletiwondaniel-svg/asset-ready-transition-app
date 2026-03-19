INSERT INTO dms_document_types (code, document_name, document_description, tier, rlmu, discipline_code, discipline_name, acceptable_status, is_active, display_order) VALUES
('0480', 'Other Agreement', 'Other Agreement', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI., AFU, AFP, AFT', true, 1),
('0706', 'Independent Assessment Report', 'External review and assessment of project health that usually includes benchmarking and recommendations from other companies implementing similar work or projects.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 2),
('0709', 'Risk Assessment Report', 'Overall assessment of overall compound technical risk foreseen for the project.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 3),
('0712', 'Community Engagement', 'Community Affairs, local content issues, societal effects of project, local business development, etc.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 4),
('0780', 'Other Assessment Report', 'Health check, GAP analysis etc.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 5),
('1905', 'Benchmarking Data', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 6),
('3004', 'Equipment Criticality Rating Report', 'Shows criticality rating of equipment, sparing, maintenance testing and inspection requirements, spare parts requirements etc.  Will feed into maintenance reference plan.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 7),
('3180', 'Other Estimate', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 8),
('3311', 'Change Notification', 'An advance notice to another party, e.g. another design department or fabrication facility, that there is going to be a change to a document that has been issued for construction. Synonyms include DCN Design Change Notice, ACN Advanced Change Notice.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 9),
('3322', 'Demonstration Note On Compliance', 'A document that demonstrates that the design meets the Process Safety Basic Requirements (PSBR) of DEM 2 with evidences and references to documents.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 10),
('3341', 'Manpower Histogram', 'Histograms to show current and predicted manpower through project broken down by trade/profession', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 11),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 12),
('3352', 'Organogram', 'Represents an organisation of people, indicating roles and reporting lines in a tree-like structure. May include the names of individuals. Associated with AA only.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 13),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 14),
('4018', 'General Arrangement Diagram', 'A diagram showing the main features and locations of major items. Usually has some dimensions to convey spatial relationships but is generally inadequate for construction. 

Architectural: Sometimes includes layouts of all rooms including equipment and accommodation, external layouts and elevations.', 'Tier 1', 'RLMU', 'HX', 'HSE&S General', 'ASB, AFC, AFU, AFD', true, 15),
('4018', 'General Arrangement Diagram', 'A diagram showing the main features and locations of major items. Usually has some dimensions to convey spatial relationships but is generally inadequate for construction. 

Architectural: Sometimes includes layouts of all rooms including equipment and accommodation, external layouts and elevations.', 'Tier 1', 'RLMU', 'MX', 'Mechanical Other', 'ASB, AFC, AFU, AFD', true, 16),
('4018', 'General Arrangement Diagram', 'A diagram showing the main features and locations of major items. Usually has some dimensions to convey spatial relationships but is generally inadequate for construction. 

Architectural: Sometimes includes layouts of all rooms including equipment and accommodation, external layouts and elevations.', 'Tier 1', 'RLMU', 'IN', 'Instrumentation', 'ASB, AFC, AFU, AFD', true, 17),
('4018', 'General Arrangement Diagram', 'A diagram showing the main features and locations of major items. Usually has some dimensions to convey spatial relationships but is generally inadequate for construction. _x000D_
Architectural: Sometimes includes layouts of all rooms including equipment and accommodation, external layouts and elevations.', 'Tier 1', 'RLMU', 'AA', 'Management & Project Eng', 'ASB, AFC, AFU, AFD', true, 18),
('4301', 'Action List', 'Includes Punch List.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 19),
('4303', 'Applicable Standards List', 'Provides the lists of Company Standards identified for use as baseline_x000D_
standards for a project. _x000D_
It also provides:_x000D_
  - The list of International, National and Industry Codes & Standards that are referenced in the Company Standards and project specific Specifications._x000D_
  - The list of Codes (e.g. process unit codes) to be used by the project._x000D_', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 20),
('4322', 'Equipment Summary List', 'An extract from a Register (see 6612 Equipment Register) that is used as a secondary reference (ie. not the master).', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 21),
('4880', 'Other Manual', 'A document that describes methods of working to be used to accomplish an activity._x000D_
Synonym: Guide, Guideline._x000D_
Warning: Not to replace "Books", as defined in the EIS Section 3.4 which requires an Index to be created. See Index of Documents.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 22),
('5206', 'Other Picture', 'Photo or Illustration', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 23),
('5529', 'Project Philosophy', 'Including buildings, access, drainage, corrosion/materials, electrical design, fire and gas, commissioning, isolation, maintenance, operations (inc. start-up/shutdown), earthing, HVAC, metering, process control, well control,  utility requirements and design.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 24),
('5706', 'Assurance Plan', 'Quality, compliance, technical, value, cost and schedule assurance.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 25),
('5726', 'Field Development Plan', 'Synonyms: Master Development Plan, Area Development Plan, Base Development Plan._x000D_
_x000D_
Sub-surface, surface, reservoir management , joint venture partners, high level operations philosophy, high level facilities description, environmental impact, HSE and QA/QC principles, Venture setup aspects, well engineering, production technology._x000D_
_x000D_
From OPMG: The plan provides an evaluation of field development alternatives together with the selection of an optimal development concept based on subsurface scenarios (uncertainty) and field engineering options.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 26),
('5753', 'Permit Plan', 'Permits and licenses required to allow project work and construction to take place', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 27),
('5759', 'Project Control Plan', 'Throughout the project phases, but in particular during the implementation phase, the project control systems and procedures should be documented in the Project Control Plan PCP, which will become part of the overall Project Procedures Manual. The PCP may be published as part of the Project Execution Plan (AA5798).', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 28),
('5760', 'Project Execution Plan', 'One of the most important documents on a project, established prior to FEED. The will largely decide the project organisational requirements and lay the groundwork for detailed project planning and cost estimating. The PEP may be as short or as long as warranted by the size and complexity of the project but it is a required deliverable. Its main value is in inspiring and recording the strategic thinking process and acting as a blueprint for project staff as the project moves forward. Project Execution Strategy documents (PES) are also classified here.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 29),
('5768', 'Risk and Opportunity Management Plan', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 30),
('5775', 'Stakeholder Engagement Plan', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 31),
('5778', 'Sustainable Development Plan', 'Community Affairs, local content issues, societal effects of project, local business development, etc.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 32),
('5787', 'Verification Scheme', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 33),
('5798', 'Project Plan', 'Reserved for project wide Discipline Management Plans such as Project QA Plan, Project HSES Plan, Project IM Plan, etc..._x000D_
For Discipline AA only, this doc type is used to classify Project Implementation Plan (PIP) and Project Execution Plan (PEP).', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 34),
('5800', 'Interface Plan', 'Interface between internal and external parties (esp. between contract scopes). May be treated as a BOOK (see Index of Documents) and contain Interface Procedures and an Interface Register.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 35),
('5806', 'Discipline Delivery Plan', 'A document showing how a particular discipline participates to DCAF controls in term of review or responsibility. This document shall contain all the controls that a particular discipline is accountable for, and also the controls that it contributes to._x000D_
This is a DCAF deliverable.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 36),
('5878', 'Gas and Energy Management Plan', 'The Greenhouse Gas and Energy Management Plan (GHGEMP) is the main vehicle for integrating the different aspects of the management process, ensuring that timely and quality decisions are taken during the different ORP phases. As such, it should provide a structured and quantitative demonstration that the full range of TECOP issues related to GHG and Energy Efficiency has been considered during project development and an ALARP position has been fully evaluated. The GHGEMP is also a key deliverable required for CO2 functional support and the Decision Gate reviews.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 37),
('5880', 'Other Plan', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 38),
('5980', 'Other Strategy', 'Includes Project Execution Strategy (PES).', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 39),
('6003', 'Assurance Procedure', 'Quality, compliance, technical, value, cost and schedule assurance.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 40),
('6006', 'Change Control Procedure', 'Describing how changes through Design, Construction and Commissioning will be managed.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 41),
('6048', 'Communication Procedure', 'Cross discipline, internal and external communication procedure, responsibilities, and governance.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 42),
('6069', 'Interface Procedure', 'Procedures around Interface management activities between internal and external parties (esp. between contract scopes).', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 43),
('6179', 'Country Regulation Procedures', 'Procedures to develop country regulation specific documents or to submit this documents to regulatory authotities._x000D_
See also AA7878 (TPD) and AA7877 (PSTS).', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 44),
('6180', 'Other Procedure', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 45),
('6402', 'Change Proposal', 'A formal document, whose structure and content is defined in the AA6006 Change Control Procedure. When approved, provides authorisation to proceed with the requested change and issue a VA3369 Variation Order, if necessary. Usually based on an approved 7205 Technical Deviation Request or 7206 Variation Request. An approved Change Proposal could be deemed to be a synonym of a Concession.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 46),
('6480', 'Other Proposal', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 47),
('6603', 'Authority Matrix', 'A list or register of people or organisations authorised to perform a range of tasks which may be technical, financial, contractual, organisational, or other. Includes Technical Authorities Matrix.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 48),
('6605', 'Change Control Register', 'Audit trail summarising status and outstanding actions associated with all change to originally agreed design/statement of requirements, including basis for design.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 49),
('6612', 'Equipment Register', 'Master Tag and Equipment list including all items displayed on the Process Engineering Flow Schemes. May include sizes, basic specifications, and selection of characteristics / properties / attributes.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 50),
('6614', 'Laws, Regulations Register', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 51),
('6619', 'Risk, Opportunity Register', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 52),
('6627', 'Interface Register', 'Interface between internal and external parties (esp. between contract scopes).', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 53),
('6680', 'Other Register', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 54),
('6844', 'Economics Study', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 55),
('6926', 'Opportunity Framing Report', 'Workshop, MOM, whitepapers, studies, brainstorm session etc.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 56),
('6944', 'Progress Report', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 57),
('6945', 'Project Closeout Report', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 58),
('7180', 'Other Report', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 59),
('7202', 'Waiver Request', 'Request, approval or rejection for the relaxation of an element of the particular regulatory Code, Standard, Rule or Regulation where such element conflicts with the International Code or Standard proposed for the facilities.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 60),
('7205', 'Technical Deviation Request', 'Request, approval or rejection of changes to a technical specification. Would typically include justification and reasons for the request, and acceptance or rejection from a purely technical perspective._x000D_
Synonym: Concession_x000D_
For similar documents pertaining specifically to contract variations, refer to Variation Request 7206._x000D_', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 61),
('7403', 'Design Review Report', 'Verification of a design, based on comparison with standards, constructability, operability, safety, etc. May be performed by internal or external resources.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 62),
('7415', 'Value Assurance Review Report', 'OPMG: Provides confidence that the opportunity team has done everything necessary to take the decision that all the significant risks, opportunities and uncertainties have been identified and can be managed, and that work has been completed to the necessary quality so that the project is not unnecessarily exposed. Synonym VAR, AGR Assurance Gate Review.

Post Implementation Review PIR, and Post Investment Review are defined as Value Assurance Review VAR5.  Also see FA Other Assurance Review Report for Estimate and Schedule Assurance Review ESAR.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 63),
('7417', 'Lessons Learned Review Report', 'OPMG: The Lessons Learnt should be captured at the end of each phase while people are still around and the lessons are fresh in everyones mind. The major lessons should be captured with the eventual requirements of the VAR 5 (Post Investment Review) in mind. This will save much unnecessary work at a later stage.

The ORP requires that teams show that they have learned the appropriate lessons from previous similar situations.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 64),
('7480', 'Other Review Report', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 65),
('7704', 'Basis Of Design', 'Document outlining the basis for the design of the facility and comprising all process design philosophies i.e. environmental, drainage, ventilation, spading/isolation, plant availability/down time assessment and relief/blowdown philosophy etc._x000D_
From OPMG:The purpose of a Basis for/of Design is to specify the design intent and preliminary functional requirements for the selected facilities concept, modification or decommissioning project. It is a baseline document that stipulates the basis for Front End Engineering leading to the development of the Project Specification.', 'Tier 2', NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 66),
('7739', 'Project Specification', 'A technical description of the information on a Project necessary to prepare a +/-10% estimate, including references to:_x000D_
 - technical specifications required to prepare detailed design and engineering work_x000D_
 - procedures and requirements for the execution of the work and services for the realisation of a project_x000D_
Note: This doc type is not a BOOK as defined in the EIS. It is a document referencing other specifications, procedures, etc.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 67),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 68),
('7772', 'Drafting Specification', 'Rules and Conventions for preparing drawings, including symbol lists, etc.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 69),
('7875', 'Interface Document', 'The information in  the interface register (see AA6627), interface diagram (see **2341) and tie-in list (see **4363) are combined in an Interface Document. This document establishes a comprehensive coherent and transparent overview for all interfaces between two execution contract. This document is included within the corresponding ITTs.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 70),
('7877', 'Country Regulation Specific Technical Standard', 'A Specific Technical Standard is a specific standard developed for design and construction of facilities, for which no local (regulatory) standards are available, that establishes technical and safety requirements for the design and construction of a specific facility or system._x000D_
This document type shall not be used to classify the engineering technical standards (e.g. API, ISO and DEP).', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 71),
('7878', 'Country Regulation Technical Project Documentation', 'Technical Project Documentation (TPD) is a technical document describing the facilities that are proposed to be built in a country. The document is submitted to the regulatory authorities for review and approval. 
The Environmental Chapter is an integral part of the TPD and may be included in full or as a reference to the approved EIA.
An approved TPD forms part of the submission to gain a Permit to Construct.
The content of this document document is driven by regulatory requirements.
This document type shall not be used to classify the engineering technical standards (e.g. API, ISO and DEP).', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 72),
('7880', 'Other Specification', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 73),
('8203', 'Basis Of Feasibility Study', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 74),
('8211', 'Conceptual Design Feasibility Study', 'Initial screening, feasibility studies, initial estimates, preliminary economics etc.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 75),
('8212', 'Conceptual Engineering Study', 'Workshop, MOM, whitepapers, surface and sub-surface studies, brainstorm session, economics, initial cost estimates, development options', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 76),
('8380', 'Other Study', NULL, NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 77),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'AA', 'Management & Project Eng', 'IFI, AFU, AFP, AFT', true, 78),
('709', 'Risk Assessment Report', 'Overall assessment of overall compound technical risk foreseen for the project.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 79),
('780', 'Other Assessment Report', 'Health check, GAP analysis etc.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 80),
('1580', 'Other Certificate', NULL, NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 81),
('2322', 'Equipment Installation Diagram', 'Installation refers to the mounting, setting, erection, etc. of equipment and accessories. Also see Fabrication (off-site building) and Construction (on-site building) for differences._x000D_
These diagrams are for transient activity during installation (eg. sequence of activity) and not finished work.', NULL, NULL, 'BA', 'Construction', 'AFC, AFU, AFD', true, 82),
('2341', 'Interface Diagram', 'Diagrams showing Interface terminations and hook ups between Contractors', NULL, NULL, 'BA', 'Construction', 'AFC, AFU, AFD', true, 83),
('2404', 'Construction Diagram', 'Construct is to Erect, Build, or Make (usually) on-site as a responsibility of the project team. Also see Fabricate (off-site by others). eg. Vertical storage tanks are "Constructed" on-site, while some accessories are "Fabricated" off-site and delivered for construction. Includes welds and associated on-site assembly details._x000D_
Generally, Construction Diagrams represent temporary activity._x000D_
The word Construction in title is valid. It differentiates between this diagram and Installation diagrams.', NULL, NULL, 'BA', 'Construction', 'AFC, AFU, AFD', true, 84),
('2406', 'Constructability Diagram', 'Construct is to Erect, Build, or Make (usually) on-site as a responsibility of the project team. Also see Fabricate (off-site by others). eg. Vertical storage tanks are "Constructed" on-site, while some accessories are "Fabricated" off-site and delivered for construction. _x000D_
_x000D_
Decomposition of a complex objects/concepts into simpler pieces that make construction feasible. A macro view of construction concepts and strategies represented by a diagram._x000D_
e.g.  Module diagrams (showing breakdown into PAUs, subassemblies, skids, etc.), Installation sequence diagrams, Module off loading diagram._x000D_
For detailed ¿construction Diagram" see document type BA2404._x000D_', NULL, NULL, 'BA', 'Construction', 'AFC, AFU, AFD', true, 85),
('3314', 'Conceptual Design Assumptions For Asset Decommissioning', 'Self Explanatory', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 86),
('3323', 'Technical Note', 'Agreement which describes how an engineering or maintenance issue will be resolved and what the implication of the solution is.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 87),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 88),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 89),
('4354', 'Spare Part List', 'Recommended listing of spares to support construction, installation, commissioning, operation or maintenance.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 90),
('4802', 'Commissioning Manual', NULL, NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 91),
('4816', 'Method Statement', NULL, NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 92),
('5503', 'Commissioning Philosophy', 'Commissioning', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 93),
('5537', 'Construction Philosophy / Constructability Review Report', 'Construct is to Erect, Build, or Make (usually) on-site as a responsibility of the project team. Also see Fabricate (off-site by others). eg. Vertical storage tanks are "Constructed" on-site, while some accessories are "Fabricated" off-site and delivered for construction.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 94),
('5711', 'Commissioning and Start-up Plan', 'A plan explaining how commissioning and startup will be accomplished._x000D_
synonym: CSU plan.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 95),
('5736', 'Lifting, Hoisting, Constructability Plan', NULL, NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 96),
('5789', 'Weld Map', 'Outline drawing that usually identifies all welds and relates them to the relevant welding procedure number and non destructive testing requirements.', NULL, NULL, 'BA', 'Construction', 'AFC, AFU, AFD', true, 97),
('5794', 'Workpack', NULL, NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 98),
('5799', 'Commissioning and Start-up Strategy', 'The strategy explaining how commissioning and startup will be accomplished._x000D_
synonym: CSU strategy.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 99),
('5801', 'Decommissioning Plan', NULL, NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 100),
('6008', 'Commissioning Procedure', 'Procedure shall include list of spare parts, special tools and utilities required, pre-commissioning checks to be performed, sequenced procedure for start-up and fault guidelines.  All relevant drawings shall also be referenced._x000D_
Synonym: Pre-commissioning protocol', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 101),
('6064', 'Welding Repair Procedure', NULL, NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 102),
('6065', 'Welding Procedure Specification', 'A specified course of action followed in welding including the list of materials and, where necessary, tools to be used. Includes Welding Procedure Specification WPS.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 103),
('6066', 'Welding Procedure Qualification', 'Describes the parameters used in qualification of Welding Procedures together with mechanical testing results. Synonyms include WPQ and Procedure Qualification Record PQR.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 104),
('6070', 'Construction Procedure', 'Construct is to Erect, Build, or Make (usually) on-site as a responsibility of the project team. Also see Fabricate (off-site by others). eg. Vertical storage tanks are "Constructed" on-site, while some accessories are "Fabricated" off-site and delivered for construction.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 105),
('6180', 'Other Procedure', NULL, NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 106),
('7180', 'Other Report', NULL, NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 107),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 108),
('7739', 'Project Specification', 'A technical description of the information on a Project necessary to prepare a +/-10% estimate, including references to:_x000D_
 - technical specifications required to prepare detailed design and engineering work_x000D_
 - procedures and requirements for the execution of the work and services for the realisation of a project_x000D_
Note: This doc type is not a BOOK as defined in the EIS. It is a document referencing other specifications, procedures, etc.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 109),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 110),
('7756', 'Construction Specification', 'Construct is to Erect, Build, or Make (usually) on-site as a responsibility of the project team. Also see Fabricate (off-site by others). eg. Vertical storage tanks are "Constructed" on-site, while some accessories are "Fabricated" off-site and delivered for construction.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 111),
('7879', 'Welding And Weld Inspection Specification', 'Define the material types and welding/inspection minimum  requirements for the welding activities dealing with:_x000D_
  - process and utility pipework._x000D_
  - structural steel._x000D_
  - vessels and exchangers._x000D_
  - storage tanks._x000D_
  - pipelines.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 112),
('7880', 'Other Specification', NULL, NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 113),
('8236', 'Lifting Study', 'Will determine needs for cranes and handling equipment access at design stage. Access and cost related considerations to be made.  Including project related materials handling and bulk handling', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 114),
('8382', 'Construction Study', 'Construct is to Erect, Build, or Make (usually) on-site as a responsibility of the project team. Also see Fabricate (off-site by others). eg. Vertical storage tanks are "Constructed" on-site, while some accessories are "Fabricated" off-site and delivered for construction.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 115),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'BA', 'Construction', 'IFI, AFU, AFP, AFT', true, 116),
('1457', 'Completion Certificate', 'A document certifying a commissioning unit has been successfully tested for functionality._x000D_', NULL, NULL, 'BC', 'Commissioning', 'IFI, AFU, AFP, AFT', true, 117),
('4354', 'Spare Part List', 'A list of recommended listing of spares received from vendor/manufacturer to support installation, commissioning, operation or maintenance.', NULL, NULL, 'BC', 'Commissioning', 'IFI, AFU, AFP, AFT', true, 118),
('4880', 'Other Manual', 'A document that describes methods of working to be used to accomplish an activity. Synonym: Guide, Guideline. Warning: this should not be a compilation of other deliverables. Not to be used if a more specific document type can be used. Can be used for singular/specialty deliverables which do not have a unique document type._x000D_', NULL, NULL, 'BC', 'Commissioning', 'IFI, AFU, AFP, AFT', true, 119),
('5680', 'Other Philosophy', 'A document outlining the premise and intent for decisions that are to be followed regarding a specific subject. Typically provided as instruction from Owner Operator._x000D_', NULL, NULL, 'BC', 'Commissioning', 'IFI, AFU, AFP, AFT', true, 120),
('5798', 'Project Plan', 'A document capturing key discipline execution plans applicable across the project scope (e.g. IM Plan, Execution Plan, Quality Plan, CSU plan).', NULL, NULL, 'BC', 'Commissioning', 'IFI, AFU, AFP, AFT', true, 121),
('5799', 'Commissioning And Startup Strategy', 'A document outlining purpose and approach for commissioning and start-up._x000D_
Synonym: CSU strategy.', NULL, NULL, 'BC', 'Commissioning', 'IFI, AFU, AFP, AFT', true, 122),
('5980', 'Other Strategy', 'A document outlining the application of a philosophical stance for decisions and the resulting principles that are to be followed to achieve the intent. Typically developed based on a philosophy.', NULL, NULL, 'BC', 'Commissioning', 'IFI, AFU, AFP, AFT', true, 123),
('6180', 'Other Procedure', 'A document which describes a set of logically sequenced instructions to execute an activity. Not to be used if a more specific document type can be used. Can be used for singular/speciality deliverables which do not have a unique document type._x000D_
Synonym: Pre-commissioning protocol', NULL, NULL, 'BC', 'Commissioning', 'IFI, AFU, AFP, AFT', true, 124),
('7770', 'Functional Design Specification', 'A specification that describes the deliverable in terms of form, fit, function, and performance characteristics to satisfy the intended use where interpretation is required. Includes most discipline specifications describing the functionality (e.g., relief and blowdown specification, surface coating, inspection specifications, operating envelopes, etc.)._x000D_', NULL, NULL, 'BC', 'Commissioning', 'IFI, AFU, AFP, AFT', true, 125),
('2307', 'Building Diagram', 'to include external and internal layouts and elevations', NULL, NULL, 'CB', 'Architectural', 'AFC, AFU, AFD', true, 126),
('3309', 'Bill Of Quantities', 'A list of whole assemblies or bulk material showing the quantity of each required to suit a purpose. Compare Bill of Materials for sub assemblies and parts. Synonym: Material Takeoff MTO', NULL, NULL, 'CB', 'Architectural', 'IFI, AFU, AFP, AFT', true, 127),
('3328', 'Installation Manual', 'Installation refers to the mounting, setting, erection, etc. of equipment and accessories. Also see Fabrication (off-site building) and Construction (on-site building) for differences.', NULL, NULL, 'CB', 'Architectural', 'IFI, AFU, AFP, AFT', true, 128),
('3328', 'Installation Manual', 'Installation refers to the mounting, setting, erection, etc. of equipment and accessories. Also see Fabrication (off-site building) and Construction (on-site building) for differences.', NULL, NULL, 'CB', 'Architectural', 'IFI, AFU, AFP, AFT', true, 129),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'CB', 'Architectural', 'IFI, AFU, AFP, AFT', true, 130),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'CB', 'Architectural', 'IFI, AFU, AFP, AFT', true, 131),
('4018', 'General Arrangement Diagram', 'A diagram showing the main features and locations of major items. Usually has some dimensions to convey spatial relationships but is generally inadequate for constrution. _x000D_
Architectural: Sometimes includes layouts of all rooms including equipment and accommodation, external layouts and elevations._x000D_', 'Tier 1', 'RLMU', 'CB', 'Architectural', 'ASB, AFC, AFU, AFD', true, 132),
('4018', 'General Arrangement Diagram', 'A diagram showing the main features and locations of major items. Usually has some dimensions to convey spatial relationships but is generally inadequate for construction. _x000D_
Architectural: Sometimes includes layouts of all rooms including equipment and accommodation, external layouts and elevations.', 'Tier 1', 'RLMU', 'CI', 'Infrastructure', 'ASB, AFC, AFU, AFD', true, 133),
('4018', 'General Arrangement Diagram', 'Shows an assembly of equipment components that may be an exploded view.', 'Tier 1', 'RLMU', 'CS', 'Structures', 'AFC, AFU, AFD', true, 134),
('5501', 'Accommodation Philosophy', 'Design considerations for accommodating personnel, including temporary refuges and associated facilities.', NULL, NULL, 'CB', 'Architectural', 'IFI, AFU, AFP, AFT', true, 135),
('5679', 'Material and Equipment Performance Philosophy', 'Performance requirment for architectural elements to be used for the selection criteria of generic type of materials, systems and equipment.', NULL, NULL, 'CB', 'Architectural', 'IFI, AFU, AFP, AFT', true, 136),
('5680', 'Other Philosophy', NULL, NULL, NULL, 'CB', 'Architectural', 'IFI, AFU, AFP, AFT', true, 137),
('7205', 'Technical Deviation Request', 'Request, approval or rejection of changes to a technical specification. Would typically include justification and reasons for the request, and acceptance or rejection from a purely technical perspective.

Synonym: Concession

For similar documents pertaining specifically to contract variations, refer to Variation Request 7206.', NULL, NULL, 'CB', 'Architectural', 'IFI, AFU, AFP, AFT', true, 138),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'CB', 'Architectural', 'IFI, AFU, AFP, AFT', true, 139),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'CB', 'Architectural', 'IFI, AFU, AFP, AFT', true, 140),
('7880', 'Other Specification', 'Specifications for cladding, door, windows, fire & blast wall, ceiling, internal partitions, raised access floors, loose furniture fixtures, fittings, signage, floor and wall finishes, etc.,', NULL, NULL, 'CB', 'Architectural', 'IFI, AFU, AFP, AFT', true, 141),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'CB', 'Architectural', 'IFI, AFU, AFP, AFT', true, 142),
('604', 'Piling Plan', 'An arrangement diagram in plan view depicting the location of piles. A column of steel or concrete driven into the ground to provide support for a structure or excavation.', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'IFI, AFU, AFP, AFT', true, 143),
('2331', 'Foundation Design Diagram', 'Details of foundation design for construction. Also see Foundation Loading Diagram, specifically for loads and Foundation Layout Diagram, specifically for spatial location. Also see 2358 Support Diagram.', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'AFC, AFU, AFD', true, 144),
('2401', 'Pile Make-up Details', 'A diagram that is not a layout plan (see Piling Plan). A column of steel or concrete driven into the ground to provide support for a structure or excavation.', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'AFC, AFU, AFD', true, 145),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'IFI, AFU, AFP, AFT', true, 146),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'IFI, AFU, AFP, AFT', true, 147),
('4017', 'Foundation Layout Diagram', 'An arrangement diagram in plan view depicting the location of foundation/pile supports._x000D_
Also see Foundation Design Diagram, specifically for construction details and Foundation Loading Diagram, specifically for imposed loads. Also see 2358 Support Diagram._x000D_
Synonym: foundation plan, piling plan.', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'AFC, AFU, AFD', true, 148),
('4018', 'General Arrangement Diagram', 'A diagram showing the main features and locations of major items. Usually has some dimensions to convey spatial relationships but is generally inadequate for construction. _x000D_
Architectural: Sometimes includes layouts of all rooms including equipment and accommodation, external layouts and elevations.', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'AFC, AFU, AFD', true, 149),
('4024', 'Layout Diagram, Plot Plan', 'Plan view of a area showing exact location of main items of equipment.', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'IFI, AFU, AFP, AFT', true, 150),
('6968', 'Soil Investigation and Survey Data Report', 'Usually for foundation design or environmental purposes. Includes rock, minerals and organic matter._x000D_', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'IFI, AFU, AFP, AFT', true, 151),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'IFI, AFU, AFP, AFT', true, 152),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'IFI, AFU, AFP, AFT', true, 153),
('7880', 'Other Specification', 'Specification that describes the deliverable in terms of form, fit, function, and performance characteristics to satisfy the intended use. May also include other design and delivery specifications such as those required for purchasing', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'IFI, AFU, AFP, AFT', true, 154),
('8371', 'Pile Driveability Study', 'Selection of suitable piling hammers for pile installation.', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'IFI, AFU, AFP, AFT', true, 155),
('8372', 'Design Parameter Study', 'Usually concerns data interpretation and determining design parameters for foundation design or environmental purposes. Includes soil, rock, minerals and organic matter.', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'IFI, AFU, AFP, AFT', true, 156),
('8376', 'Integration Study', 'Usually concerns integration of data from various sources into a comprehensive geotechnical subsurface model. May include geotechnical, geophysical and geomatics data.', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'IFI, AFU, AFP, AFT', true, 157),
('8377', 'Foundation Design Study', 'Foundation selection and Design, including priorities and criteria, practical restrictions, options considered and design of selected foundations. This document also evaluate the most cost effective foundation._x000D_', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'IFI, AFU, AFP, AFT', true, 158),
('8380', 'Other Study', NULL, NULL, NULL, 'CG', 'Geotechnical/Foundation', 'IFI, AFU, AFP, AFT', true, 159),
('8417', 'Survey Report', 'Investigation and survey reports, pipeline routings and topographic.', NULL, NULL, 'CG', 'Geotechnical/Foundation', 'IFI, AFU, AFP, AFT', true, 160),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'CI', 'Infrastructure', 'IFI, AFU, AFP, AFT', true, 161),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'CI', 'Infrastructure', 'IFI, AFU, AFP, AFT', true, 162),
('4816', 'Method Statement', NULL, NULL, NULL, 'CI', 'Infrastructure', 'IFI, AFU, AFP, AFT', true, 163),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'CI', 'Infrastructure', 'IFI, AFU, AFP, AFT', true, 164),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'CI', 'Infrastructure', 'IFI, AFU, AFP, AFT', true, 165),
('514', 'In Place Analysis Report', 'Computer structural analysis for topsides modules including piperack, flare tower, bridge for in-place loading condition.', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 166),
('519', 'Vibration Analysis Report', 'Computer analysis of module and foundation for cyclic loads due to vibratory equipment.', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 167),
('520', 'Loadout and Loading Analysis Report', 'Computer analysis to verify the module design for loadout/in condition.', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 168),
('521', 'Transportation Analysis Report', 'Computer analysis to verifify the module design for transporation condition.', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 169),
('522', 'Set Down Analysis Report', 'Computer analysis to verify the module design for setdown condition.', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 170),
('1206', 'Design Calculation', NULL, NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 171),
('1448', 'Weight Report', 'Shows weight and centre of gravity of equipment. If large items are to be handled for equipment installation or maintenance, then the weight and centre of gravity of these individual parts should be shown.  Final weighing certificate shall accompany goods during shipment & delivery.', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 172),
('1903', 'Alignment Data', NULL, NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 173),
('2180', 'Other Datasheet', NULL, NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 174),
('2305', 'Assembly Diagram', 'Shows an assembly of equipment components that may be an exploded view.', NULL, NULL, 'CS', 'Structures', 'AFC, AFU, AFD', true, 175),
('2332', 'Foundation Loading Diagram', 'Static and dynamic forces or movements acting on foundations or other load bearing supports, anchor bolt details,lengths and pre-tensioning. May include Civil Structural for loads imposed, and Civil Foundations for foundation design.Also see Foundation Design Diagram, specifically for construction details and Foundation Layout Diagram, specifically for spatial location. Also see 2358 Support Diagram.', NULL, NULL, 'CS', 'Structures', 'AFC, AFU, AFD', true, 176),
('2358', 'Support Diagram', 'Includes pipe, cable, instrument, foundation and other supports.', NULL, NULL, 'CS', 'Structures', 'AFC, AFU, AFD', true, 177),
('2386', 'Steel Diagram', 'For steel, concrete or wooden structure diagrams. For example Topsides, modules etc.', NULL, NULL, 'CS', 'Structures', 'AFC, AFU, AFD', true, 178),
('2402', 'Tendon Diagram', 'Anchoring of deep water structures using tendons.', NULL, NULL, 'CS', 'Structures', 'AFC, AFU, AFD', true, 179),
('2408', 'Structural Diagram', 'For steel, concrete or wooden structure diagrams. _x000D_
E.g. Topsides, modules etc.', NULL, NULL, 'CS', 'Structures', 'AFC, AFU, AFD', true, 180),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 181),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 182),
('4816', 'Method Statement', NULL, NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 183),
('5721', 'Engineering Design Strategy', NULL, NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 184),
('6063', 'Weighing Procedure', 'To detail method recording weight during design and manufacture and method of weighing equipment prior to shipment.  _x000D_
The weighing procedure shall include:_x000D_
- A description of the weight measuring and recording devices giving capacity and accuracy.  Accuracy to be within ±1%_x000D_
- Description of calibration certificate (calibrated within the last six months) for each of the measuring/recording devices to be used for the weighing_x000D_
- Methods to be used for weighing and measuring/calculating centre of gravity including temporary lifting/supporting equipment used.', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 185),
('6180', 'Other Procedure', 'e.g. Module Loadout/in, Transportation, Setdown procedures.', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 186),
('7180', 'Other Report', NULL, NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 187),
('7205', 'Technical Deviation Request', 'Request, approval or rejection of changes to a technical specification. Would typically include justification and reasons for the request, and acceptance or rejection from a purely technical perspective.

Synonym: Concession

For similar documents pertaining specifically to contract variations, refer to Variation Request 7206.', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 188),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 189),
('7403', 'Design Review Report', 'Verification of a design, based on comparison with standards, constructability, operability, safety, etc. May be performed by internal or external resources.', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 190),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 191),
('7770', 'Other Functional Design Specification', 'Specification that describes the deliverable in terms of form, fit, function, and performance characteristics to satisfy the intended use. May also include other design and delivery specifications such as those required for purchasing', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 192),
('7771', 'Equipment Specification', 'Gives precise information about a Tag, Equipment or a Model. May include size, capacity, materials, functional requirements, failure requirements, etc. and compliments Equipment Data Sheet 2105._x000D_', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 193),
('7880', 'Other Specification', NULL, NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 194),
('8180', 'Other Structural Calculation', 'Design calculation of structural components, e.g. bearing supports, joint connections.', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 195),
('8225', 'Engineering Study', NULL, NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 196),
('8241', 'Material Selection Study', 'Describes materials and reasons for selecting those materials (eg. environmental conditions).For civil material selection, use CX8241 Material Selection Study._x000D_
e.g. Steel Selection and Sections Specification.', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 197),
('8380', 'Other Study', NULL, NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 198),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'CS', 'Structures', 'IFI, AFU, AFP, AFT', true, 199),
('0502', 'Fatigue Analysis', 'Verification of module/substructure design for cyclic loads.', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 200),
('0503', 'Finite Element Analysis Report', 'Includes records of finite element analysis of all stressed components, including details of the software program used to perform the calculations.', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 201),
('0512', 'Substructure In Place Analysis Report', 'Computer structural analysis for substructures for in-place loading condition.', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 202),
('0078', 'Other Assessment Report', 'Health check, GAP analysis etc.', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 203),
('1380', 'Other Calculation', 'Calculations for foundation, sheetpiling, ice protection bearier, drainage, etc..._x000D_
Includes stress, displacement, static behaviour, dynamic behaviour (vibration) calculations.', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 204),
('2341', 'Interface Diagram', 'Diagrams showing Interface between Contractors (e.g. terminations, hook ups).', NULL, NULL, 'CX', 'Civil & Structural Other', 'AFC, AFU, AFD', true, 205),
('2386', 'Steel Diagram', 'For steel, concrete or wooden structure diagrams. For example Topsides, modules etc.', NULL, NULL, 'CX', 'Civil & Structural Other', 'AFC, AFU, AFD', true, 206),
('2397', 'Reinforcement Diagram', 'Includes steel reinforcement in concrete structures.', NULL, NULL, 'CX', 'Civil & Structural Other', 'AFC, AFU, AFD', true, 207),
('2405', 'Anchoring Diagram', 'Includes anchoring and mooring of offshore vessels and the interaction of anchor lines with sub-sea pipelines and structures.', NULL, NULL, 'CX', 'Civil & Structural Other', 'AFC, AFU, AFD', true, 208),
('3309', 'Bill Of Quantities', 'A list of whole assemblies or bulk material showing the quantity of each required to suit a purpose. Compare Bill of Materials for sub assemblies and parts. Synonym: Material Takeoff MTO', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 209),
('3323', 'Technical Note', 'Agreement which describes how an engineering or maintenance issue will be resolved and what the implication of the solution is.', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 210),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 211),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 212),
('4018', 'General Arrangement Diagram', 'A diagram showing the main features and locations of major items. Usually has some dimensions to convey spatial relationships but is generally inadequate for constrution. _x000D_
Architectural: Sometimes includes layouts of all rooms including equipment and accommodation, external layouts and elevations._x000D_', 'Tier 1', 'RLMU', 'CX', 'Civil & Structural Other', 'ASB, AFC, AFU, AFD', true, 213),
('4018', 'General Arrangement Diagram', 'A diagram showing the main features and locations of major items. Usually has some dimensions to convey spatial relationships but is generally inadequate for construction. 

Architectural: Sometimes includes layouts of all rooms including equipment and accommodation, external layouts and elevations.', 'Tier 1', 'RLMU', 'EA', 'Electrical', 'AFC, AFU, AFD', true, 214),
('4018', 'General Arrangement Diagram', 'A diagram showing the main features and locations of major items. Usually has some dimensions to convey spatial relationships but is generally inadequate for construction. 

Architectural: Sometimes includes layouts of all rooms including equipment and accommodation, external layouts and elevations.', 'Tier 1', 'RLMU', 'MS', 'Mechanical - Static', 'ASB, AFC, AFU, AFD', true, 215),
('4018', 'General Arrangement Diagram', 'A diagram showing the main features and locations of major items. Usually has some dimensions to convey spatial relationships but is generally inadequate for construction. 

Architectural: Sometimes includes layouts of all rooms including equipment and accommodation, external layouts and elevations.', 'Tier 1', 'RLMU', 'MR', 'Rotating Equipment', 'ASB, AFC, AFU, AFD', true, 216),
('4018', 'General Arrangement Diagram', 'A diagram showing the main features and locations of major items. Usually has some dimensions to convey spatial relationships but is generally inadequate for construction. 

Architectural: Sometimes includes layouts of all rooms including equipment and accommodation, external layouts and elevations.', 'Tier 1', 'RLMU', 'LA', 'Pipelines', 'ASB, AFC, AFU, AFD', true, 217),
('4018', 'General Arrangement Diagram', 'A diagram showing the main features and locations of major items. Usually has some dimensions to convey spatial relationships but is generally inadequate for construction. 

Architectural: Sometimes includes layouts of all rooms including equipment and accommodation, external layouts and elevations.', 'Tier 1', 'RLMU', 'MH', 'HVAC', 'AFC, AFU, AFD', true, 218),
('4018', 'General Arrangement Diagram', 'A diagram showing the main features and locations of major items. Usually has some dimensions to convey spatial relationships but is generally inadequate for construction. 

Architectural: Sometimes includes layouts of all rooms including equipment and accommodation, external layouts and elevations.', 'Tier 1', 'RLMU', 'MP', 'Piping', 'ASB, AFC, AFU, AFD', true, 219),
('4018', 'General Arrangement Diagram', 'A diagram showing the main features and locations of major items. Usually has some dimensions to convey spatial relationships but is generally inadequate for construction. 

Architectural: Sometimes includes layouts of all rooms including equipment and accommodation, external layouts and elevations.', 'Tier 1', 'RLMU', 'TA', 'Telecommunication', 'ASB, AFC, AFU, AFD', true, 220),
('B01', 'General Arrangements', NULL, 'Tier 1', 'RLMU', 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 221),
('4024', 'Layout Diagram, Plot Plan', 'Plan view of a area showing exact location of main items of equipment.', 'Tier 1', 'RLMU', 'CX', 'Civil & Structural Other', 'ASB, AFC, AFU, AFD', true, 222),
('4038', 'Underground Service Layout Diagram', 'Trenches (piping, cables, wires), drains, subsurface structures etc.', 'Tier 1', 'RLMU', 'CX', 'Civil & Structural Other', 'ASB, AFC, AFU, AFD', true, 223),
('4180', 'Other Layout Diagram', NULL, NULL, NULL, 'CX', 'Civil & Structural Other', 'AFC, AFU, AFD', true, 224),
('4306', 'Bill of Materials', 'A list of all parts, sub assemblies and raw materials that constitute a particular assembly, showing the quantity of each required item._x000D_
Excludes Material Register._x000D_', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 225),
('4816', 'Method Statement', NULL, NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 226),
('4904', 'Topographic Map', 'Also for seafloor at offshore site and access route', NULL, NULL, 'CX', 'Civil & Structural Other', 'AFC, AFU, AFD', true, 227),
('5501', 'Accommodation Philosophy', 'Design considerations for accommodating personnel, including temporary refuges and associated facilities.', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 228),
('5880', 'Other Plan', NULL, NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 229),
('6944', 'Progress Report', NULL, NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 230),
('7205', 'Technical Deviation Request', 'Request, approval or rejection of changes to a technical specification. Would typically include justification and reasons for the request, and acceptance or rejection from a purely technical perspective.

Synonym: Concession

For similar documents pertaining specifically to contract variations, refer to Variation Request 7206.', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 231),
('7739', 'Project Specification', 'A technical description of the information on a Project necessary to prepare a +/-10% estimate, including references to:_x000D_
 - technical specifications required to prepare detailed design and engineering work_x000D_
 - procedures and requirements for the execution of the work and services for the realisation of a project_x000D_
Note: This doc type is not a BOOK as defined in the EIS. It is a document referencing other specifications, procedures, etc.', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 232),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 233),
('7770', 'Other Functional Design Specification', 'Specification that describes the deliverable in terms of form, fit, function, and performance characteristics to satisfy the intended use. May also include other design and delivery specifications such as those required for purchasing', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 234),
('7880', 'Other Specification', 'Includes civil specifications.', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 235),
('8005', 'Stress calculation', NULL, NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 236),
('8218', 'Design Layout Study', 'A work, such as a thesis, that results from studious endeavour. A literary work on a particular subject.', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 237),
('8241', 'Material Selection Study', 'Describes materials and reasons for selecting those materials (eg. environmental conditions). For structural material selection refer to CS8241 Material Selection Study._x000D_
e.g. Civil Material Section, Sheetpile, rock, pile steel.', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 238),
('8268', 'Anchoring Study', 'Includes anchoring of offshore vessels and the interaction of anchor lines with sub-sea pipelines and structures.', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 239),
('8380', 'Other Study', NULL, NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 240),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'CX', 'Civil & Structural Other', 'IFI, AFU, AFP, AFT', true, 241),
('1380', 'Other Calculation', NULL, NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 242),
('1401', 'Approval Certificate', 'Certificate issued by a recognised independent authority indicating the equipment has been manufactured in accordance with code/standard.  For fire test certification the certificates are to be complete and as issued by the testing authority.  Certificates are to state Principal''s purchase order number, item number and identification to permit traceability to the fire tested item or material.Type approval certificates are normally acceptable for proprietary items.CE Mark certification or similar equivalent shall be included under this VDR code.', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 243),
('1580', 'Other Certificate', NULL, NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 244),
('1915', 'Lighting Performance Data', 'Polar diagrams plus general performance data for specified luminaries types.', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 245),
('1919', 'Power System Analysis Data', '- Generator reactance''s, resistance and time constants - calculated and tested.
- Transformer impedances - calculated and tested.
- Large motor reactance''s, resistance and time contents - typical.
Other data as required by Principal''s specifications.', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 246),
('1979', 'Database and Data set', 'Data stored in a proprietary (e.g. SPI Watcom) or neutral (e.g. CSV)  format from which multiple information contents can be generated by computer software (e.g. SPEL).', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 247),
('6604', 'Cause, Effect Matrix (F&G)', 'The logic of alarm and trip systems shown in matrix form detailing the relationships between input variations on the output.  Required for understanding the alarm and protection systems and for fault finding and modifications.', 'Tier 1', 'RLMU', 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 248),
('2310', 'Cause, Effect Diagram (Process)', '- Drawn in accordance with API RP14C to indicate clearly and precisely the shutdown requirements on the standard format sheet with defined convention._x000D_
- Individual C&D charts to be produced for each process unit. _x000D_
- All autostart/changeover etc. of pump', 'Tier 1', 'RLMU', 'PX', 'Process Other', 'ASB, AFC, AFU, AFD', true, 249),
('2310', 'Cause, Effect Diagram', 'Used for ENMC, IMCS and protection systems.', 'Tier 1', 'RLMU', 'EA', 'Electrical', 'ASB, AFC, AFU, AFD', true, 250),
('C14', 'Cause & Effect Charts', 'These shall be in accordance with API RP14C to indicate clearly and precisely the shutdown requirements on the standard format sheet with defined convention.  Individual C&E charts to be produced for each process unit.  All auto start/changeover, etc, of pumps etc, to be clearly defined with location of field devices.', 'Tier 1', 'RLMU', 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 251),
('2365', 'Process Engineering Flow Scheme', 'Includes P&IDs and Utility Engineering Flow Schemes UEFS.', 'Tier 1', 'RLMU', 'PX', 'Process Other', 'ASB, AFC, AFU, AFD', true, 252),
('2368', 'Process Safeguarding Flow Scheme', 'PROCESS SAFEGUARDING FLOW SCHEMES - PSFS', 'Tier 1', NULL, 'PX', 'Process Other', 'ASB, AFC, AFU, AFD', true, 253),
('4302', 'Alarm, Trip setting List & Catalogue', 'Each instrument having an alarm or trip function is listed. Alarms and settings are given as percentages of transmitter range and in engineering units, together with transmitter range, location of the annunciation point, cabinet, identification and relevant PEFS or logic drawing.', 'Tier 1', 'RLMU', 'IN', 'Instrumentation', 'ASB, IFI, AFU, AFP, AFT', true, 254),
('C40', 'Alarm/Trip Schedule', NULL, 'Tier 1', 'RLMU', 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 255),
('2334', 'Hazardous Area Classification Diagram', 'Provides information on the level of explosion proofing etc. required in each area', 'Tier 1', 'RLMU', 'EA', 'Electrical', 'ASB, AFC, AFU, AFD', true, 256),
('4012', 'Equipment Layout Diagram', 'General Arrangements main equipment.', 'Tier 2', 'RLMU', 'EA', 'Electrical', 'AFC, AFU, AFD', true, 257),
('0901', 'Control System Block Diagram', 'Pictorial representation of the processes performed by a control system.', 'Tier 2', 'RLMU', 'EA', 'Electrical', 'ASB, AFC, AFU, AFD', true, 258),
('980', 'Other Block Diagram', 'A pictorial representation of a process. It illustrates the relationships between the various  components that allows to perform a complex process.', 'Tier 2', 'RLMU', 'EA', 'Electrical', 'ASB, AFC, AFU, AFD', true, 259),
('1907', 'Equipment Brochure', 'Extracts from a vendor''s published catalogue. Synonyms include Booklet, Circular, Flyer, Leaflet, Pamphlet, Glossy, Catalogue, Brochure, Magazine. Usually informal and held within a reference library, but may also be used to confirm equipment details during procurement.', 'Tier 2', 'RLMU', 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 260),
('2105', 'Equipment Datasheet', 'Gives precise information about a Tag, Equipment or a Model (eg.Equipment Record Card - ERC) and compliments Equipment Specification 7771.', 'Tier 2', 'RLMU', 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 261),
('2180', 'Other Datasheet', 'Gives precise information about a Tag, Equipment or a Model (eg.Equipment Record Card - ERC) and compliments Equipment Specification 7771.', 'Tier 2', 'RLMU', 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 262),
('2305', 'Assembly Diagram', 'Shows an assembly of equipment components that may be an exploded view.', 'Tier 2', 'RLMU', 'EA', 'Electrical', 'AFC, AFU, AFD', true, 263),
('2335', 'Hook Up Diagram', 'Synonym: Installation details. May show the instrument impulse, pneumatic and electronic connections, pipe work, valves, fittings, flanges and support details with associated material take-off list. Used for removal/hook up purposes and modifications.', NULL, NULL, 'EA', 'Electrical', 'AFC, AFU, AFD', true, 264),
('2341', 'Interface Diagram', 'Diagrams showing Interface between Contractors (e.g. terminations, hook ups).', 'Tier 2', 'RLMU', 'EA', 'Electrical', 'ASB, AFC, AFU, AFD', true, 265),
('2373', 'Routing Diagram', 'Alignment of cables and pipelines between facilities. See 4033 Piping Layout Diagram for location of piping and ducting within a facility and 2343 Isometric Diagram for construction details. Synonym is Alignment Sheet for pipelines.', 'Tier 2', 'RLMU', 'EA', 'Electrical', 'ASB, AFC, AFU, AFD', true, 266),
('2384', 'Single Line Diagram', 'Detail the main equipment items (switchboards, transformers etc.) and their relationships within the facility electrical distribution system including details of fault levels and current and voltage ratings._x000D_
Synonym of "One Line Diagram". Also see Three Line Diagram.', 'Tier 1', 'RLMU', 'EA', 'Electrical', 'ASB, AFC, AFU, AFD', true, 267),
('2398', 'Insulation, Heat Tracing Diagram', 'Includes refractory insulation.
Includes electrical tracing.
Includes anchoring and expansion joint details where applicable.
Drawings to indicate thicknesses, specification and limit of application.', 'Tier 2', 'RLMU', 'EA', 'Electrical', 'AFC, AFU, AFD', true, 268),
('4024', 'Layout Diagram, Plot Plan', 'Plan view of a area showing exact location of main items of equipment.', 'Tier 2', 'RLMU', 'EA', 'Electrical', 'ASB, AFC, AFU, AFD', true, 269),
('4025', 'Lighting Layout Diagram', 'Layout of lighting and grounding on facility', 'Tier 2', 'RLMU', 'EA', 'Electrical', 'AFC, AFU, AFD', true, 270),
('4180', 'Other Layout Diagram', NULL, 'Tier 2', NULL, 'EA', 'Electrical', 'AFC, AFU, AFD', true, 271),
('4306', 'Bill of Materials', 'A list of all parts, sub assemblies and raw materials that constitute a particular assembly, showing the quantity of each required item._x000D_
Excludes Material Register._x000D_', 'Tier 2', NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 272),
('4308', 'Cable List', 'List of all cables, their specifications and end points. Indicates salient features of all cables in Vendor''s supply and connecting cables supplied by Principal.
Synonym: Cable List', 'Tier 2', NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 273),
('4319', 'Distribution Board List', 'Shall list the lighting and small power loads connected to a distribution board.  Description shall include fuse sizes, terminal sizes and switching arrangements.', 'Tier 2', NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 274),
('4327', 'Input, Output List', 'List to show input and output of an equipment (e.g. instrument, telecom equipment, electrical equipment) connected to other equipments (e.g. distributed control system, programmable logic controller). Typically includes: Tag Number/s, Instrument Class, Service description, I/O type, Process function, etc.', 'Tier 2', NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 275),
('4329', 'Load List', 'Tabulation of electrical loads which the electrical system must accommodate including detail of individual distribution board loads._x000D_
Shall list each load (static & motor) with description, nameplate rating and absorbed rating._x000D_
Synonym for Load Schedule', 'Tier 2', 'RLMU', 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 276),
('5507', 'Design Philosophy', 'A set of ideas, beliefs, or underlying theory. _x000D_
eg. to use 2D CAD Vs 3D CAD Vs Physical Block Model.', 'Tier 2', NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 277),
('5525', 'Power System Philosophy', 'Power system distribution, operation and load transfer philosophy', 'Tier 2', NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 278),
('5680', 'Other Philosophy', 'Power system distribution, operation and load transfer philosophy', 'Tier 2', NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 279),
('8251', 'Safe Operation Study', 'Assessment of the safe operability of the electrical system.', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 280),
('8804', 'Connection Diagram', 'Details of cable numbers and terminations between vendor packages, equipment and particularly at Contractor interfaces_x000D_
Shall display in block form the items of electrical equipment and the cables connecting them.  The terminal block reference for each item shall be stated, along with the number and size of the conductors in the cables.  Cable(s) not supplied by the vendor shall be clearly identified.', 'Tier 2', 'RLMU', 'EA', 'Electrical', 'AFC, AFU, AFD', true, 281),
('8809', 'Earthing General Arrangement Diagram', 'Earthing (grounding) for plant and equipment and between modules and dissimilar structural elements.', 'Tier 2', 'RLMU', 'EA', 'Electrical', 'AFC, AFU, AFD', true, 282),
('2403', 'Three Line Diagram', 'Detail of main switchboards including protection relays and metering. More detailed than a One Line Diagram. This the electrical equivalent of a P&ID. Also see Single Line Diagram.', NULL, NULL, 'EA', 'Electrical', 'AFC, AFU, AFD', true, 283),
('2580', 'Other Schematic Diagram', 'Details the elements and functions of a system with the components represented by symbols, such as the elements of an electrical or electronic circuit or the elements of a logic diagram for a computer or communications system. May also detail the logic functions.', NULL, NULL, 'EA', 'Electrical', 'ASB, AFC, AFU, AFD', true, 284),
('2901', 'Cable Size Calculation', 'Calculations required for sizing of cables', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 285),
('3323', 'Technical Note', 'Agreement which describes how an engineering or maintenance issue will be resolved and what the implication of the solution is.', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 286),
('3328', 'Installation Manual', 'Installation refers to the mounting, setting, erection, etc. of equipment and accessories. Also see Fabrication (off-site building) and Construction (on-site building) for differences.', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 287),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 288),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 289),
('4005', 'Cable Tray Layout Diagram', 'Drawing showing the routing of cable trays for electrical and instrumentation cables.', NULL, NULL, 'EA', 'Electrical', 'AFC, AFU, AFD', true, 290),
('4006', 'Trench Diagram', 'e.g. Used by electrical for electrical cable trenches.', NULL, NULL, 'EA', 'Electrical', 'AFC, AFU, AFD', true, 291),
('4380', 'Other List', NULL, NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 292),
('4606', 'Short Circuit Calculation', 'Calculations necessary to determina the capacity of electrical equipment under fault conditions.', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 293),
('4816', 'Method Statement', NULL, NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 294),
('6067', 'Acceptance Test Procedure', 'Includes FAT and non-FAT (Factory Acceptance Test) procedures._x000D_
Also see Acceptance Test Report for definitions.', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 295),
('6180', 'Other Procedure', 'e.g. Procedures documenting how to use an application (e.g. SPEL) for a particular discipline.', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 296),
('6612', 'Equipment Register', 'Master Tag and Equipment list including all items displayed on the Process Engineering Flow Schemes. May include sizes, basic specifications, and selection of characteristics / properties / attributes.', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 297),
('7180', 'Other Report', NULL, NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 298),
('7205', 'Technical Deviation Request', 'Request, approval or rejection of changes to a technical specification. Would typically include justification and reasons for the request, and acceptance or rejection from a purely technical perspective.

Synonym: Concession

For similar documents pertaining specifically to contract variations, refer to Variation Request 7206.', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 299),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 300),
('7739', 'Project Specification', 'A technical description of the information on a Project necessary to prepare a +/-10% estimate, including references to:_x000D_
 - technical specifications required to prepare detailed design and engineering work_x000D_
 - procedures and requirements for the execution of the work and services for the realisation of a project_x000D_
Note: This doc type is not a BOOK as defined in the EIS. It is a document referencing other specifications, procedures, etc.', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 301),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 302),
('7770', 'Other Functional Design Specification', 'Specification that describes the deliverable in terms of form, fit, function, and performance characteristics to satisfy the intended use. May also include other design and delivery specifications such as those required for purchasing', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 303),
('7771', 'Equipment Specification', 'Gives precise information about a Tag, Equipment or a Model. May include size, capacity, materials, functional requirements, failure requirements, etc. and compliments Equipment Data Sheet 2105._x000D_', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 304),
('7880', 'Other Specification', NULL, NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 305),
('8226', 'Equipment Study', NULL, NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 306),
('8260', 'System Study', 'Includes load flows, transient and dynamic stability, short circuit, protection study, co-ordination and setting.', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 307),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'EA', 'Electrical', 'IFI, AFU, AFP, AFT', true, 308),
('8880', 'Other Wiring Diagram', NULL, NULL, NULL, 'EA', 'Electrical', 'AFC, AFU, AFD', true, 309),
('702', 'Environmental Impact Assessment Report', 'Impact of facility on the surrounding environment.  For further detail see EP2005-0300-PR20._x000D_
Abreviation: EIA', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 310),
('709', 'Risk Assessment Report', 'Overall assessment of overall compound technical risk foreseen for the project.', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 311),
('780', 'Other Assessment Report', 'Health check, GAP analysis etc.', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 312),
('1904', 'Aspect Data', 'Terminology used by environment to report data related to Air, Liquid and Waste.', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 313),
('1909', 'Emissions to Atmosphere Data', 'Air & Liquids emissions data (where applicable) to be provided: Engine capacity, Fuel consumption rate, Type of fuel (specify diesel, gas, electric), Operating time Inside and outside diameter of fuel, Fuel outlet tube or stack height, Exit velocity temperature, Composition content of gases (e.g. CO, CO2, NOx, SOx, etc.), Description of emission control systems.', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 314),
('2701', 'Environmental Law Compliance Report', 'Report demonstrating compliance with relevant environmental law.', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 315),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 316),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 317),
('3373', 'Waste Manifest', 'Inventory of waste produced at facility.', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 318),
('3375', 'Work Instruction', 'Self Explanatory', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 319),
('4816', 'Method Statement', NULL, NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 320),
('5798', 'Project Plan', 'Reserved for project wide Discipline Management Plans such as Project QA Plan, Project HSES Plan, Project IM Plan, etc...', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 321),
('6602', 'Aspect Register', 'Register of environmental issues related to the project', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 322),
('6852', 'Environmental Management System Description', 'Shall include a brief description of Vendor''s documented Environmental Management System showing how the system is structured and reference to the standard on which it is based (e.g. ISO 14001 or similar).', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 323),
('6873', 'Hazard Identification Report', 'Hazards Identification report following the Project Safety Review (HAZID) exercises. Usually includes action lists, follow up, and close out action descriptions and acceptance.', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 324),
('7180', 'Other Report', NULL, NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 325),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 326),
('8202', 'Atmospheric Dispersion Study', 'Study related to the dispersion of atmospheric releases from flaring and venting._x000D_', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 327),
('8223', 'Emissions and exhaust Study', 'Study related to the dispersion of emissions and exhaust from compressors and other machinery.', NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 328),
('HE66', '0 Other Register', NULL, NULL, NULL, 'HE', 'Environmental', 'IFI, AFU, AFP, AFT', true, 329),
('705', 'Health Impact Assessment Report', 'Impact of facility on the health of the surrounding populace.  For further detail see EP2005-0300-PR20.', NULL, NULL, 'HH', 'Health', 'IFI, AFU, AFP, AFT', true, 330),
('709', 'Risk Assessment Report', 'Overall assessment of overall compound technical risk foreseen for the project.', NULL, NULL, 'HH', 'Health', 'IFI, AFU, AFP, AFT', true, 331),
('780', 'Other Assessment Report', 'Health check, GAP analysis etc.', NULL, NULL, 'HH', 'Health', 'IFI, AFU, AFP, AFT', true, 332),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'HH', 'Health', 'IFI, AFU, AFP, AFT', true, 333),
('5798', 'Project Plan', 'Reserved for project wide Discipline Management Plans such as Project QA Plan, Project HSES Plan, Project IM Plan, etc...', NULL, NULL, 'HH', 'Health', 'IFI, AFU, AFP, AFT', true, 334),
('7180', 'Other Report', NULL, NULL, NULL, 'HH', 'Health', 'IFI, AFU, AFP, AFT', true, 335),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'HH', 'Health', 'IFI, AFU, AFP, AFT', true, 336),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'HP', 'Security', 'IFI, AFU, AFP, AFT', true, 337),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'HP', 'Security', 'IFI, AFU, AFP, AFT', true, 338),
('5798', 'Project Plan', 'Reserved for project wide Discipline Management Plans such as Project QA Plan, Project HSES Plan, Project IM Plan, etc...', NULL, NULL, 'HP', 'Security', 'IFI, AFU, AFP, AFT', true, 339),
('5880', 'Other Plan', 'Plan for the security of the site, including personnel, materials and equipment.', NULL, NULL, 'HP', 'Security', 'IFI, AFU, AFP, AFT', true, 340),
('7180', 'Other Report', NULL, NULL, NULL, 'HP', 'Security', 'IFI, AFU, AFP, AFT', true, 341),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'HP', 'Security', 'IFI, AFU, AFP, AFT', true, 342),
('1439', 'Safety Declaration', 'Certificate issued by asset owner to Regulatory Authority demonstrating compliance with Regulatory Authority safety  requirements._x000D_
A Safety Declaration is a document that describes the nature and scale of hazards of an industrial facility, lays out measures developed to ensure its industrial safety and readiness for emergency response in  man-induced emergency situations._x000D_
_x000D_', NULL, NULL, 'HS', 'Safety', 'IFI, AFU, AFP, AFT', true, 343),
('2107', 'Material Safety Datasheet', 'Typically includes:_x000D_
- summary of physical and chemical properties of the substance_x000D_
- description of its harmful nature including potential impact on the health and safety of personnel and of the environment_x000D_
- precautions necessary to ensure its safe use and eventual disposal', NULL, NULL, 'HS', 'Safety', 'IFI, AFU, AFP, AFT', true, 344),
('2180', 'Other Datasheet', NULL, NULL, NULL, 'HS', 'Safety', 'IFI, AFU, AFP, AFT', true, 345),
('2374', 'Safety Zone Diagram', 'A diagram showing the main safety features (e.g. containment) of the facility.  Typically related to toxic zones._x000D_
e.g. H2S Zone diagram', NULL, NULL, 'HS', 'Safety', 'ASB, AFC, AFU, AFD', true, 346),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'HS', 'Safety', 'IFI, AFU, AFP, AFT', true, 347),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'HS', 'Safety', 'IFI, AFU, AFP, AFT', true, 348),
('5798', 'Project Plan', 'Reserved for project wide Discipline Management Plans such as Project QA Plan, Project HSES Plan, Project IM Plan, etc…', NULL, NULL, 'HS', 'Safety', 'IFI, AFU, AFP, AFT', true, 349),
('6180', 'Other Procedure', NULL, NULL, NULL, 'HS', 'Safety', 'IFI, AFU, AFP, AFT', true, 350),
('7180', 'Other Report', NULL, NULL, NULL, 'HS', 'Safety', 'IFI, AFU, AFP, AFT', true, 351),
('7411', 'Safety Management Review Report', NULL, NULL, NULL, 'HS', 'Safety', 'IFI, AFU, AFP, AFT', true, 352),
('7480', 'Other Review Report', NULL, NULL, NULL, 'HS', 'Safety', 'IFI, AFU, AFP, AFT', true, 353),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'HS', 'Safety', 'IFI, AFU, AFP, AFT', true, 354),
('2334', 'Hazardous Area Classification Diagram', 'Provides information on the level of explosion proofing etc. required in each', 'Tier 1', NULL, 'HX', 'HSE&S General', 'ASB, AFC, AFU, AFD', true, 355),
('1601', 'Hazardous Area Classification', 'As stipulated in EP 95-000', 'Tier 1', NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 356),
('6019', 'Emergency Response Procedure', 'As defined  for Facilities Operations and for Pipeline Operations.', 'Tier 1', 'RLMU', 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 357),
('6875', 'Hazard Operability Report', 'Reviews and reports for all project HAZOP studies.  See EP95-000 for details.  To include action lists, follow up and close out action descriptions and acceptance.', 'Tier 1', 'RLMU', 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 358),
('6613', 'Hazard, Effect Register', 'Master for all individual point sources for emissions, discharge inventories and corresponding zone classifications.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 359),
('6881', 'Identification Of Safety Critical Elements Report', 'List of all safety critical elements (SCE).', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 360),
('2318', 'Emergency Equipment, Exits Diagram', 'Drawing detailing escape routes, means of emergency escape and the location of all lifesaving equipment (escape sets, first aid boxes, showers etc.)', NULL, NULL, 'HX', 'HSE&S General', 'ASB, AFC, AFU, AFD', true, 361),
('4016', 'Firefighting Equipment Layout Diagram', 'Drawing detailing the location of all portable/semi portable fire fighting equipment (fire extinguishers, crash kits, hydrants and equipment, hose reels, breathing apparatus).', 'Tier 2', 'RLMU', 'HX', 'HSE&S General', 'ASB, AFC, AFU, AFD', true, 362),
('8249', 'Relief, Flare and Vent Study', 'Safety study related to the impact on personnel or equipment of lit or unlit relief, flaring and venting events', 'Tier 2', NULL, 'HS', 'Safety', 'IFI, AFU, AFP, AFT', true, 363),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'HS', 'Safety', 'IFI, AFU, AFP, AFT', true, 364),
('505', 'Hazard Analysis Report', 'Hazards identification report following the Project Safety Review exercises.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 365),
('580', 'Other Analysis Report', 'BowTie Analysis/Report included here.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 366),
('703', 'Escape, Evacuation, Rescue Assessment Report', 'Report on the emergency evacuation and rescue means.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 367),
('704', 'Fire, Explosion Assessment Report', 'Report on fire and explosion events and assesment on what caused them.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 368),
('709', 'Risk Assessment Report', 'Overall assessment of overall compound technical risk foreseen for the project.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 369),
('713', 'Social Impact Assessment Report', 'Impact of facility on the surrounding community and infrastructure.  For further detail see EP2005-0300-PR20.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 370),
('780', 'Other Assessment Report', 'Health check, GAP analysis etc.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 371),
('1212', 'Fire Extinguishant Calculation / Other calculation', 'Calculations to prove that a given quantity of agent will be delivered at a set rate & time. Note: Applicable to fixed fire suppression systems designed specifically for room protection.  Water mist will also be used for turbine enclosure protection.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 372),
('1222', 'Reliability, Availability, Safety Integrity Level Calculation', 'Demonstrates starting and operating reliability / availability of purchased equipment  (e.g. mean time between failure data) & Safety Integrity Level (SIL) calculations.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 373),
('1415', 'Hazardous Area Certificate', 'Certificate issued by a recognised independent authority indicating that a type test has satisfied the specified standards; e.g.  ATEX, BASEEFA, PTB, UL, CSA, etc._x000D_
Examples of ratings include Intrinsically Safe & Explosion Proof.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 374),
('2110', 'Noise/Passive Fire protection Datasheet', 'Information like Noise Level Datasheets etc.
Principal shall define sound power and sound pressure level limitation.  Vendor will complete and return these sheets with anticipated and, if requested, guaranteed data, for the octave mid-band frequencies corresponding to these limitations. it includes fire fighting equipments', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 375),
('2356', 'Passive Fire Protection Diagram', 'Structural and module layout drawings detailing the passive fire protection i.e. firewall/boundary fire protection ratings.', NULL, NULL, 'HX', 'HSE&S General', 'AFC, AFU, AFD', true, 376),
('2410', 'Fire Fighting Flow Scheme', 'Details in schematic form the active fire fighting systems, equipment (fire pumps, deluge, monitor and Halon skids) piping, valves, tagged instruments and their relationships.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 377),
('3004', 'Equipment Criticality Rating Report', 'Shows criticality rating of equipment, sparing, maintenance testing and inspection requirements, spare parts requirements etc.  Will feed into maintenance reference plan.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 378),
('3323', 'Technical Note', 'Agreement which describes how an engineering or maintenance issue will be resolved and what the implication of the solution is.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 379),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 380),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 381),
('3705', 'Incident Report', 'Registration of  Health, Safety, Environment incident', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 382),
('4180', 'Other Layout Diagram', NULL, NULL, NULL, 'HX', 'HSE&S General', 'AFC, AFU, AFD', true, 383),
('4301', 'Action List', 'Includes Punch List.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 384),
('5160', 'Forms & Templates', NULL, NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 385),
('5480', 'Other Performance Report', NULL, NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 386),
('5511', 'Fire Protection Philosophy', 'Philosophy summarising the means of fire protection both passive (firewalls) and active (manual, foam, monitor, deluge/sprinkler systems etc.)', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 387),
('5680', 'Other Philosophy', NULL, NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 388),
('5701', 'Activity Plan', NULL, NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 389),
('5788', 'Waste Management Plan', 'Plan for management and safe disposal of all waste.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 390),
('5798', 'Project Plan', 'Reserved for project wide Discipline Management Plans such as Project QA Plan, Project HSES Plan, Project IM Plan, etc...', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 391),
('5880', 'Other Plan', NULL, NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 392),
('5980', 'Other Strategy', NULL, NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 393),
('6180', 'Other Procedure', NULL, NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 394),
('6680', 'Other Register', 'Used for MTO as 4306 is mapped with CX and can not use other discipline,', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 395),
('tud', 'nan', 'Reports of all accidents occurring during the projects, including on-site, in contractors offices, etc.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 396),
('6802', 'Active Fire Protection System Data Report', 'Design data and information that forms the basis of the performance specification for the active fire fighting systems (manual, foam, monitor, deluge/sprinkler systems etc.).', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 397),
('6820', 'Closeout Report', 'Provides an overview what has been done, what has been delivered and an overview of actions left or still in progress. For projects use the specific document type Project Closeout Report (DT 6945).', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 398),
('6854', 'Ergonomic Report', NULL, NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 399),
('6873', 'Hazard Identification Report', 'Hazards Identification report following the Project Safety Review (HAZID) exercises. Usually includes action lists, follow up, and close out action descriptions and acceptance.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 400),
('6874', 'Hazard Management Physical Effects Modelling Report', NULL, NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 401),
('7180', 'Other Report', NULL, NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 402),
('7205', 'Technical Deviation Request', 'Request, approval or rejection of changes to a technical specification. Would typically include justification and reasons for the request, and acceptance or rejection from a purely technical perspective.

Synonym: Concession

For similar documents pertaining specifically to contract variations, refer to Variation Request 7206.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 403),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 404),
('7506', 'Design HSE Case', 'Demonstrates ALARP - Design & Operate Cases', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 405),
('7739', 'Project Specification', 'A technical description of the information on a Project necessary to prepare a +/-10% estimate, including references to:_x000D_
 - technical specifications required to prepare detailed design and engineering work_x000D_
 - procedures and requirements for the execution of the work and services for the realisation of a project_x000D_
Note: This doc type is not a BOOK as defined in the EIS. It is a document referencing other specifications, procedures, etc.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 406),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 407),
('7876', 'Performance Standard For Safety Critical Element', 'A statement, expressed in qualitative or quantitative terms, of the performance required of a system or item of equipment,which is used as the basis for managing risk of the Severity 5 or high risk Hazards and Events (SCE).', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 408),
('7880', 'Other Specification', NULL, NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 409),
('8218', 'Design Layout Study', 'A work, such as a thesis, that results from studious endeavour. A literary work on a particular subject.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 410),
('8380', 'Other Study', NULL, NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 411),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'HX', 'HSE&S General', 'IFI, AFU, AFP, AFT', true, 412),
('602', 'Equipment Location Diagram', 'Shows the physical location of all equipment. Shows the exact position of detectors/alarms and for detectors, shows their orientation and fire area covered._x000D_
Synonym: Equipment Location Plan', NULL, NULL, 'IN', 'Instrumentation', 'ASB, AFC, AFU, AFD', true, 413),
('780', 'Other Assessment Report', 'Health check, GAP analysis etc.', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 414),
('0901', 'Control System Block Diagram', 'Pictorial representation of the processes performed by a control system.', 'Tier 2', 'RLMU', 'IN', 'Instrumentation', 'AFC, AFU, AFD', true, 415),
('2305', 'Assembly Diagram', 'Shows an assembly of equipment components that may be an exploded view.', NULL, NULL, 'IN', 'Instrumentation', 'AFC, AFU, AFD', true, 416),
('2312', 'Control System Diagram', 'Gives a pictorial representation of the main elements and functions of a control circuit/system with input/output sources (switches, relays etc.) and their relationships. Details logic functions of the circuit/system. I/O loading and cabinet layouts.
A Control System Diagram, sometimes also referred as Schematic Diagram, provides more details than a Control system Block Diagram.', 'Tier 2', 'RLMU', 'IN', 'Instrumentation', 'AFC, AFU, AFD', true, 417),
('2347', 'Loop Diagram', 'Details all elements of a control loop, from sensing element through to controlling element, and cabling and wiring details for the associated instruments. Includes junction box, marshalling cabinet and control panel terminations and power supply details.', 'Tier 2', 'RLMU', 'IN', 'Instrumentation', 'ASB, AFC, AFU, AFD', true, 418),
('4013', 'Field Auxiliary Room Layout Diagram', 'UPS battery room only', 'Tier 2', 'RLMU', 'IN', 'Instrumentation', 'AFC, AFU, AFD', true, 419),
('2105', 'Equipment Datasheet', 'Gives precise information about a Tag, Equipment or a Model (eg.Equipment Record Card - ERC) and compliments Equipment Specification 7771.', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 420),
('980', 'Other Block Diagram', 'A pictorial representation of a process. It illustrates the relationships between the various  components that allows to perform a complex process.', NULL, NULL, 'IN', 'Instrumentation', 'AFC, AFU, AFD', true, 421),
('1380', 'Other Calculation', NULL, NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 422),
('1580', 'Other Certificate', NULL, NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 423),
('1979', 'Database and Data set', 'Data stored in a proprietary (e.g. SPI Watcom) or neutral (e.g. CSV)  format from which multiple information contents can be generated by computer software (e.g. SPI).', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 424),
('2320', 'Equipment Cross Section Diagram', NULL, NULL, NULL, 'IN', 'Instrumentation', 'AFC, AFU, AFD', true, 425),
('2335', 'Hook Up Diagram', 'Synonym: Installation details. May show the instrument impulse, pneumatic and electronic connections, pipe work, valves, fittings, flanges and support details with associated material take-off list. Used for removal/hook up purposes and modifications.', NULL, NULL, 'IN', 'Instrumentation', 'AFC, AFU, AFD', true, 426),
('2341', 'Interface Diagram', 'Diagrams showing Interface terminations and hook ups between Contractors', NULL, NULL, 'IN', 'Instrumentation', 'AFC, AFU, AFD', true, 427),
('2373', 'Routing Diagram', 'Alignment of cables and pipelines between facilities. See 4033 Piping Layout Diagram for location of piping and ducting within a facility and 2343 Isometric Diagram for construction details. Synonym is Alignment Sheet for pipelines.', NULL, NULL, 'IN', 'Instrumentation', 'ASB, AFC, AFU, AFD', true, 428),
('2389', 'Terminal Connection Diagram', NULL, NULL, NULL, 'IN', 'Instrumentation', 'AFC, AFU, AFD', true, 429),
('3309', 'Bill Of Quantities', 'A list of whole assemblies or bulk material showing the quantity of each required to suit a purpose. Compare Bill of Materials for sub assemblies and parts. Synonym: Material Takeoff MTO', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 430),
('3323', 'Technical Note', 'Agreement which describes how an engineering or maintenance issue will be resolved and what the implication of the solution is.', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 431),
('3328', 'Installation Manual', 'Installation refers to the mounting, setting, erection, etc. of equipment and accessories. Also see Fabrication (off-site building) and Construction (on-site building) for differences.', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 432),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 433),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 434),
('3375', 'Work Instruction', 'Self Explanatory', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 435),
('4005', 'Cable Tray Layout Diagram', NULL, NULL, NULL, 'IN', 'Instrumentation', 'AFC, AFU, AFD', true, 436),
('4024', 'Layout Diagram, Plot Plan', 'Plan view of a area showing exact location of main items of equipment.', NULL, NULL, 'IN', 'Instrumentation', 'ASB, AFC, AFU, AFD', true, 437),
('4180', 'Other Layout Diagram', NULL, NULL, NULL, 'IN', 'Instrumentation', 'AFC, AFU, AFD', true, 438),
('4306', 'Bill of Materials', 'A list of all parts, sub assemblies and raw materials that constitute a particular assembly, showing the quantity of each required item._x000D_
Excludes Material Register._x000D_', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 439),
('4308', 'Cable List', 'List of all cables, their specifications and end points. Indicates salient features of all cables in Vendor''s supply and connecting cables supplied by Principal.
Synonym: Cable List', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 440),
('8804', 'Connection Diagram', 'Details of cable numbers and terminations between vendor packages, equipment and particularly at Contractor interfaces_x000D_
Shall display in block form the items of electrical equipment and the cables connecting them.  The terminal block reference for each item shall be stated, along with the number and size of the conductors in the cables.  Cable(s) not supplied by the vendor shall be clearly identified.', NULL, NULL, 'IN', 'Instrumentation', 'AFC, AFU, AFD', true, 441),
('8880', 'Other Wiring Diagram', NULL, NULL, NULL, 'IN', 'Instrumentation', 'AFC, AFU, AFD', true, 442),
('4327', 'Input, Output List', 'List to show input and output of an equipment (e.g. instrument, telecom equipment, electrical equipment) connected to other equipments (e.g. distributed control system, programmable logic controller). Typically includes: Tag Number/s, Instrument Class, Service description, I/O type, Process function, etc.', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 443),
('5306', 'Process Control Narrative', 'Description of the process control functionality (e.g. level control)._x000D_
_x000D_
The process control narrative (PCN) is a key deliverable on new projects from the Select phase through the Execute phase. Early in the project the process control narrative is a higher level document. As the project progresses the design is refined and more detail is added. _x000D_
_x000D_
In Select phase the PCN defines the overall process control strategy for the system. . _x000D_
_x000D_
In Define phase the PCN is updated to contain solutions for previously unresolved issues, and in addition detailed process control solutions will be defined in sufficient detail that the design can be clearly understood and implemented._x000D_
_x000D_
In Execute phase the detailed PCN and other content from Define phase will be updated with relevant implementation detail and then completed, ultimately as as-built deliverables for turnover to the Asset.', 'Tier 2', 'RLMU', 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 444),
('5505', 'Control Philosophy', 'Describes start-up and shutdown requirements of the process. May also list instrument and control equipment, pre-alarm and shutdown alarm/trip requirements, failure modes of valves and equipment and type of signals to and from the control logic.', 'Tier 2', 'RLMU', 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 445),
('4382', 'I/O list-Process, ESD, F&G', NULL, NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 446),
('4780', 'Other Logic diagram', 'A graphical representation of a system using formal logic. It displays the existence of functional elements and the paths by which they interact with each other.', 'Tier 2', 'RLMU', 'IN', 'Instrumentation', 'ASB, AFC, AFU, AFD', true, 447),
('5531', 'Safeguarding Philosophy', NULL, NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 448),
('7709', 'Control System Functional Specification', 'Functional Description of Integrated Control and Safeguarding System', 'Tier 2', 'RLMU', 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 449),
('7710', 'Control, Safeguarding Specification', NULL, 'Tier 2', 'RLMU', 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 450),
('4380', 'Other List', 'e.g. Firmware list for intelligent instrument', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 451),
('4816', 'Method Statement', NULL, NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 452),
('5280', 'Other Multimedia', NULL, NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 453),
('5507', 'Design Philosophy', 'A set of ideas, beliefs, or underlying theory. 

eg. to use 2D CAD Vs 3D CAD Vs Physical Block Model.', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 454),
('5520', 'Metering Philosophy', NULL, NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 455),
('5680', 'Other Philosophy', NULL, NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 456),
('5880', 'Other Plan', NULL, NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 457),
('6067', 'Acceptance Test Procedure', 'Includes FAT and non-FAT (Factory Acceptance Test) procedures._x000D_
Also see Acceptance Test Report for definitions.', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 458),
('6180', 'Other Procedure', 'e.g. Procedures documenting how to use an application (e.g. SPI) for a particular discipline.', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 459),
('6612', 'Equipment Register', 'Master Tag and Equipment list including all items displayed on the Process Engineering Flow Schemes. May include sizes, basic specifications, and selection of characteristics / properties / attributes.', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 460),
('7180', 'Other Report', NULL, NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 461),
('7205', 'Technical Deviation Request', 'Request, approval or rejection of changes to a technical specification. Would typically include justification and reasons for the request, and acceptance or rejection from a purely technical perspective.

Synonym: Concession

For similar documents pertaining specifically to contract variations, refer to Variation Request 7206.', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 462),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 463),
('7731', 'Network Architecture Specification', NULL, NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 464),
('7739', 'Project Specification', 'A technical description of the information on a Project necessary to prepare a +/-10% estimate, including references to:_x000D_
 - technical specifications required to prepare detailed design and engineering work_x000D_
 - procedures and requirements for the execution of the work and services for the realisation of a project_x000D_
Note: This doc type is not a BOOK as defined in the EIS. It is a document referencing other specifications, procedures, etc.', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 465),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 466),
('7770', 'Other Functional Design Specification', 'Specification that describes the deliverable in terms of form, fit, function, and performance characteristics to satisfy the intended use. May also include other design and delivery specifications such as those required for purchasing', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 467),
('7771', 'Equipment Specification', 'Gives precise information about a Tag, Equipment or a Model. May include size, capacity, materials, functional requirements, failure requirements, etc. and compliments Equipment Data Sheet 2105._x000D_', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 468),
('7880', 'Other Specification', NULL, NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 469),
('8380', 'Other Study', NULL, NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 470),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'IN', 'Instrumentation', 'IFI, AFU, AFP, AFT', true, 471),
('510', 'Stability Analysis Report', NULL, NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 472),
('515', 'Upheaval Buckling Analysis Report', NULL, NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 473),
('580', 'Other Analysis Report', NULL, NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 474),
('1206', 'Design Calculation', 'Prepared in order to prove that the item of equipment or system selected meets the design criteria.', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 475),
('1231', 'Weight Calculation', 'Includes Mass, Buoyancy, and calculations used in the design of weight coating (eg. on submerged pipelines).', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 476),
('1380', 'Other Calculation', NULL, NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 477),
('2105', 'Equipment Datasheet', 'Gives precise information about a Tag, Equipment or a Model (eg.Equipment Record Card - ERC) and compliments Equipment Specification 7771.', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 478),
('2373', 'Routing Diagram', 'Alignment of cables and pipelines between facilities. See 4033 Piping Layout Diagram for location of piping and ducting within a facility and 2343 Isometric Diagram for construction details. Synonym is Alignment Sheet for pipelines.', 'Tier 2', 'RLMU', 'LA', 'Pipelines', 'ASB, AFC, AFU, AFD', true, 479),
('3323', 'Technical Note', 'Agreement which describes how an engineering or maintenance issue will be resolved and what the implication of the solution is.', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 480),
('3328', 'Installation Manual', 'Installation refers to the mounting, setting, erection, etc. of equipment and accessories. Also see Fabrication (off-site building) and Construction (on-site building) for differences.', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 481),
('3331', 'Design Summary', 'A document explaining how the design of a major part of a facility has been conducted in accordance with the design philosophy. _x000D_
It presents the essential characteristics (e.g. design properties, operating conditions) of the facility designed, and makes references to other documents giving more detailed information about the design._x000D_
This document type can be used to classify documents like "pipeline design report", "riser design report".', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 482),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 483),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 484),
('3880', 'Other Inspection Report', NULL, NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 485),
('4024', 'Layout Diagram, Plot Plan', 'Plan view of a area showing exact location of main items of equipment.', NULL, NULL, 'LA', 'Pipelines', 'AFC, AFU, AFD', true, 486),
('4033', 'Piping Layout Diagram', 'Shows the precise location of piping and ducting within a facility, relative to surrounding structures and equipment. See 2373 Routing Diagram for pipelines between facilities and 2343 Isometric Diagram for construction details.', NULL, NULL, 'LA', 'Pipelines', 'ASB, AFC, AFU, AFD', true, 487),
('4306', 'Bill of Materials', 'A list of all parts, sub assemblies and raw materials that constitute a particular assembly, showing the quantity of each required item._x000D_
Excludes Material Register._x000D_', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 488),
('4322', 'Equipment Summary List', 'An extract from a Register (see 6612 Equipment Register) that is used as a secondary reference (ie. not the master).', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 489),
('4363', 'Tie-In List', 'Tie-In includes interfaces between project stages, contractors and systems (eg. new to existing plant connections).', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 490),
('4816', 'Method Statement', NULL, NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 491),
('5009', 'Material Selection Report', 'To include main threats, materials requirements, pre-selection, detailed selection with cost-benefit analysis and the operating envelope of the final material choice.', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 492),
('5280', 'Multimedia', 'Multimedia being Picture, Sound or Video.  Includes laser scans, x-rays, sonograms, installation videos, photogrammetry, illustrations, fly-throughs, etc.', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 493),
('5507', 'Design Philosophy', 'A set of ideas, beliefs, or underlying theory. _x000D_
eg. to use 2D CAD Vs 3D CAD Vs Physical Block Model.', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 494),
('5787', 'Verification Scheme', NULL, NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 495),
('5880', 'Other Plan', NULL, NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 496),
('6046', 'Pressure Test Procedure', 'Includes hydrostatic, pneumatic, and leak tests/examinations.', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 497),
('6180', 'Other Procedure', NULL, NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 498),
('6612', 'Equipment Register', 'Master Tag and Equipment list including all items displayed on the Process Engineering Flow Schemes. May include sizes, basic specifications, and selection of characteristics / properties / attributes.', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 499),
('6958', 'Route Selection Report', 'Route selection, including priorities and criteria, practical restrictions, options considered.  Route layout drawing, including platform approach where applicable.', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 500),
('7180', 'Other Report', NULL, NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 501),
('7205', 'Technical Deviation Request', 'Request, approval or rejection of changes to a technical specification. Would typically include justification and reasons for the request, and acceptance or rejection from a purely technical perspective.

Synonym: Concession

For similar documents pertaining specifically to contract variations, refer to Variation Request 7206.', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 502),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 503),
('7733', 'Pressure Test Specification', 'Includes hydrostatic, pneumatic, and leak tests/examinations.', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 504),
('7739', 'Project Specification', 'A technical description of the information on a Project necessary to prepare a +/-10% estimate, including references to:_x000D_
 - technical specifications required to prepare detailed design and engineering work_x000D_
 - procedures and requirements for the execution of the work and services for the realisation of a project_x000D_
Note: This doc type is not a BOOK as defined in the EIS. It is a document referencing other specifications, procedures, etc.', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 505),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 506),
('7770', 'Other Functional Design Specification', 'Specification that describes the deliverable in terms of form, fit, function, and performance characteristics to satisfy the intended use. May also include other design and delivery specifications such as those required for purchasing', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 507),
('7880', 'Other Specification', NULL, NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 508),
('8005', 'Stress calculation', NULL, NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 509),
('8225', 'Engineering Study', NULL, NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 510),
('8247', 'Pigging Requirements Study', 'Cleaning and intelligent (integrity test) pigging', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 511),
('8263', 'Thermal Expansion Study', NULL, NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 512),
('8380', 'Other Study', NULL, NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 513),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'LA', 'Pipelines', 'IFI, AFU, AFP, AFT', true, 514),
('709', 'Risk Assessment Report', 'Overall assessment of overall compound technical risk foreseen for the project.', NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 515),
('1206', 'Design Calculation', 'Prepared in order to prove that the item of equipment or system selected meets the design criteria.', NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 516),
('1580', 'Other Certificate', NULL, NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 517),
('2105', 'Equipment Datasheet', 'Gives precise information about a Tag, Equipment or a Model (eg.Equipment Record Card - ERC) and compliments Equipment Specification 7771.', NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 518),
('2343', 'Isometric Diagram', 'Construction detail diagram for Piping and Ducting, providing an accurate Bill of Materials (BOM) / Material Take Off (MTO) and represented in a 3 dimensional isometric view. See 2373 Routing Diagram for alignment of pipelines between facilities, and 4033 Piping layout Diagram for location of piping and ducting within a facility.', NULL, NULL, 'MH', 'HVAC', 'AFC, AFU, AFD', true, 519),
('2407', 'HVAC Flow Diagram', 'A schematic diagram depicting an HVAC ducting system, including all items of duct mounted equipment complete with tag numbers, flow rate and duct sizing information.', NULL, NULL, 'MH', 'HVAC', 'AFC, AFU, AFD', true, 520),
('2409', 'Ducting and Instrument Diagram', 'A schematic representation of an HVAC system indicating all HVAC equipment items and their control interfaces. _x000D_
Abreviation is D&ID.', NULL, NULL, 'MH', 'HVAC', 'AFC, AFU, AFD', true, 521),
('3309', 'Bill Of Quantities', 'A list of whole assemblies or bulk material showing the quantity of each required to suit a purpose. Compare Bill of Materials for sub assemblies and parts. Synonym: Material Takeoff MTO', NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 522),
('3328', 'Installation Manual', 'Installation refers to the mounting, setting, erection, etc. of equipment and accessories. Also see Fabrication (off-site building) and Construction (on-site building) for differences.', NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 523),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 524),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 525),
('4033', 'Piping Layout Diagram', 'Shows the precise location of piping and ducting within a facility, relative to surrounding structures and equipment. See 2373 Routing Diagram for pipelines between facilities and 2343 Isometric Diagram for construction details.', NULL, NULL, 'MH', 'HVAC', 'ASB, AFC, AFU, AFD', true, 526),
('4311', 'Certified Equipment List', 'Overview of all Certified Equipment.', NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 527),
('4380', 'Other List', NULL, NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 528),
('4816', 'Method Statement', NULL, NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 529),
('5507', 'Design Philosophy', 'A set of ideas, beliefs, or underlying theory. _x000D_
eg. to use 2D CAD Vs 3D CAD Vs Physical Block Model.', NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 530),
('5680', 'Other Philosophy', NULL, NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 531),
('6180', 'Other Procedure', NULL, NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 532),
('7180', 'Other Report', NULL, NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 533),
('7205', 'Technical Deviation Request', 'Request, approval or rejection of changes to a technical specification. Would typically include justification and reasons for the request, and acceptance or rejection from a purely technical perspective.

Synonym: Concession

For similar documents pertaining specifically to contract variations, refer to Variation Request 7206.', NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 534),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 535),
('7739', 'Project Specification', 'Reserved for project wide Discipline Technical Specifications such as Project Civil Specification, Project Electrical Specification, etc._x000D_
Is also used to classify the component documents that comprise the Basic Design Package (BDP) and Basic Design Engineering Package (BDEP). Index of Documents JA4372 may be created to define these Packages (Books)._x000D_
A Project Specification (as defined in PG08) is a BDEP plus various procedures (ie. also a Book) and is not to be confused with this Document Type that shares the same name.', NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 536),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 537),
('7770', 'Other Functional Design Specification', 'Specification that describes the deliverable in terms of form, fit, function, and performance characteristics to satisfy the intended use. May also include other design and delivery specifications such as those required for purchasing', NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 538),
('7771', 'Equipment Specification', 'Gives precise information about a Tag, Equipment or a Model. May include size, capacity, materials, functional requirements, failure requirements, etc. and compliments Equipment Data Sheet 2105._x000D_', NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 539),
('7880', 'Other Specification', NULL, NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 540),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'MH', 'HVAC', 'IFI, AFU, AFP, AFT', true, 541),
('1206', 'Design Calculation', 'Prepared in order to prove that the item of equipment or system selected meets the design criteria.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 542),
('1380', 'Other Calculation', NULL, NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 543),
('1580', 'Other Certificate', NULL, NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 544),
('2105', 'Equipment Datasheet', 'Gives precise information about a Tag, Equipment or a Model (eg.Equipment Record Card - ERC) and compliments Equipment Specification 7771.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 545),
('2305', 'Assembly Diagram', 'Shows an assembly of equipment components that may be an exploded view.', NULL, NULL, 'MP', 'Piping', 'AFC, AFU, AFD', true, 546),
('2321', 'Equipment Diagram', NULL, NULL, NULL, 'MP', 'Piping', 'AFC, AFU, AFD', true, 547),
('2343', 'Isometric Diagram', 'Construction detail diagram for Piping and Ducting, providing an accurate Bill of Materials (BOM) / Material Take Off (MTO) and represented in a 3 dimensional isometric view for Piping inspection isometrics with Thickness Measurement Locations (TMLs) .', NULL, NULL, 'MP', 'Piping', 'ASB, AFC, AFU, AFD', true, 548),
('2358', 'Support Diagram', 'Includes pipe, cable, instrument, foundation and other supports.', NULL, NULL, 'MP', 'Piping', 'AFC, AFU, AFD', true, 549),
('3323', 'Technical Note', 'Agreement which describes how an engineering or maintenance issue will be resolved and what the implication of the solution is.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 550),
('3328', 'Installation Manual', 'Installation refers to the mounting, setting, erection, etc. of equipment and accessories. Also see Fabrication (off-site building) and Construction (on-site building) for differences.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 551),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 552),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 553),
('4024', 'Layout Diagram, Plot Plan', 'Plan view of a area showing exact location of main items of equipment.', NULL, NULL, 'MP', 'Piping', 'ASB, AFC, AFU, AFD', true, 554),
('4033', 'Piping Layout Diagram', 'Shows the precise location of piping and ducting within a facility, relative to surrounding structures and equipment. See 2373 Routing Diagram for pipelines between facilities and 2343 Isometric Diagram for construction details.', NULL, NULL, 'MP', 'Piping', 'ASB, AFC, AFU, AFD', true, 555),
('4306', 'Bill of Materials', 'A list of all parts, sub assemblies and raw materials that constitute a particular assembly, showing the quantity of each required item._x000D_
Excludes Material Register.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 556),
('4337', 'Support List', 'Includes pipe, cable, instrument, foundation and other supports.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 557),
('4338', 'Piping Line List', 'Each piping line shall have a unique number allocated and shall be shown on all PEFS/UEFS & Isometrics. As a minimum, the list shall include the following data:
Line No. (size, service, sequential No., spec., insulation ref.), Origin of line, PEFS/UEFS ref.,
Design & Operating Pressure, Design & Operating Temperature, Flow Rates, Insulation thickness,
Hydro/Pneumatic test Pressure, NDT % requirement, Post Weld Heat Treatment requirement,
Note:  This list may be included on the PEFS/UEFS (VDR Code D02) where space permits.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 558),
('4363', 'Tie-In List', 'Tie-In includes interfaces between project stages, contractors and systems (eg. new to existing plant connections).', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 559),
('4368', 'Valve List', NULL, NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 560),
('4816', 'Method Statement', NULL, NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 561),
('5011', 'Material Traceability Report', 'Location plans/records with an identification system cross referring to the individual material certificates. Where applicable, material placement drawings shall be verified by the Principal and/or third party inspection authority.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 562),
('5280', 'Other Multimedia', NULL, NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 563),
('6025', 'Flushing Procedure', NULL, NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 564),
('6067', 'Acceptance Test Procedure', 'Includes FAT and non-FAT (Factory Acceptance Test) procedures._x000D_
Also see Acceptance Test Report for definitions.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 565),
('6180', 'Other Procedure', NULL, NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 566),
('7180', 'Other Report', NULL, NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 567),
('7205', 'Technical Deviation Request', 'Request, approval or rejection of changes to a technical specification. Would typically include justification and reasons for the request, and acceptance or rejection from a purely technical perspective.

Synonym: Concession

For similar documents pertaining specifically to contract variations, refer to Variation Request 7206.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 568),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 569),
('7402', 'Block Model Review Report', 'Incorporating preliminary steelwork structure, equipment envelopes, escape routes, building envelopes, envelopes for main piping, HVAC and cable rack runs, preliminary road layouts, etc.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 570),
('7737', 'Piping Specification', 'Provides piping materials definition, design pressures and temperatures, pipe nominal bores and wall thicknesses, fitting types and applications and material test criteria.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 571),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 572),
('7771', 'Equipment Specification', 'Gives precise information about a Tag, Equipment or a Model. May include size, capacity, materials, functional requirements, failure requirements, etc. and compliments Equipment Data Sheet 2105.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 573),
('7880', 'Other Specification', 'Rules and Conventions for preparing drawings, including symbol lists, etc.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 574),
('8005', 'Stress calculation', NULL, NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 575),
('8380', 'Other Study', NULL, NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 576),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'MP', 'Piping', 'IFI, AFU, AFP, AFT', true, 577),
('1379', 'Equipment Sizing Calculation', 'Calculations of the sizes of major static and rotating equipment.', NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 578),
('1580', 'Other Certificate', NULL, NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 579),
('2105', 'Equipment Datasheet', 'Gives precise information about a Tag, Equipment or a Model (eg.Equipment Record Card - ERC) and compliments Equipment Specification 7771.', NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 580),
('3323', 'Technical Note', 'Agreement which describes how an engineering or maintenance issue will be resolved and what the implication of the solution is.', NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 581),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 582),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 583),
('4322', 'Equipment Summary List', 'An extract from a Register (see 6612 Equipment Register) that is used as a secondary reference (ie. not the master).', NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 584),
('4816', 'Method Statement', NULL, NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 585),
('4880', 'Other Manual', 'A document that describes methods of working to be used to accomplish an activity._x000D_
Synonym: Guide, Guideline._x000D_
Warning: Not to replace "Books", as defined in the EIS Section 3.4 which requires an Index to be created. See Index of Documents.', NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 586),
('5280', 'Multimedia', 'Multimedia being Picture, Sound or Video.  Includes laser scans, x-rays, sonograms, installation videos, photogrammetry, illustrations, fly-throughs, etc.', NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 587),
('5509', 'Equipment Spiring Philosophy', NULL, NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 588),
('5510', 'Equipment Type Selection Philosophy', NULL, NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 589),
('5680', 'Other Philosophy', NULL, NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 590),
('6067', 'Acceptance Test Procedure', 'Includes FAT and non-FAT (Factory Acceptance Test) procedures._x000D_
Also see Acceptance Test Report for definitions.', NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 591),
('6180', 'Other Procedure', NULL, NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 592),
('6988', 'Vibration Report', 'Vibration performance including mechanical and electrical run out for displacement measuring systems during mechanical and performance testing of machinery.', NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 593),
('7180', 'Other Report', NULL, NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 594),
('7205', 'Technical Deviation Request', 'Request, approval or rejection of changes to a technical specification. Would typically include justification and reasons for the request, and acceptance or rejection from a purely technical perspective.

Synonym: Concession

For similar documents pertaining specifically to contract variations, refer to Variation Request 7206.', NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 595),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 596),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 597),
('7770', 'Other Functional Design Specification', 'Specification that describes the deliverable in terms of form, fit, function, and performance characteristics to satisfy the intended use. May also include other design and delivery specifications such as those required for purchasing', NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 598),
('7771', 'Equipment Specification', 'Gives precise information about a Tag, Equipment or a Model. May include size, capacity, materials, functional requirements, failure requirements, etc. and compliments Equipment Data Sheet 2105._x000D_', NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 599),
('7880', 'Other Specification', NULL, NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 600),
('8226', 'Equipment Study', NULL, NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 601),
('8380', 'Other Study', NULL, NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 602),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'MR', 'Rotating Equipment', 'IFI, AFU, AFP, AFT', true, 603),
('1208', 'Thermal Rating Calculation', 'Calculations to demonstrate thermal ratings of heat exchangers.', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 604),
('1379', 'Equipment Sizing Calculation', 'Calculations of the sizes of major static and rotating equipment.', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 605),
('1580', 'Other Certificate', NULL, NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 606),
('2105', 'Equipment Datasheet', 'Gives precise information about a Tag, Equipment or a Model (eg.Equipment Record Card - ERC) and compliments Equipment Specification 7771.', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 607),
('2180', 'Other Datasheet', NULL, NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 608),
('3323', 'Technical Note', 'Agreement which describes how an engineering or maintenance issue will be resolved and what the implication of the solution is.', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 609),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 610),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 611),
('4322', 'Equipment Summary List', 'An extract from a Register (see 6612 Equipment Register) that is used as a secondary reference (ie. not the master).', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 612),
('4816', 'Method Statement', NULL, NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 613),
('4880', 'Other Manual', 'Not to replace "Books", as defined in the EIS Section 3.4 which requires an Index to be created. See Index of Documents.', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 614),
('5507', 'Design Philosophy', 'A set of ideas, beliefs, or underlying theory. _x000D_
eg. to use 2D CAD Vs 3D CAD Vs Physical Block Model.', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 615),
('5680', 'Other Philosophy', NULL, NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 616),
('6067', 'Acceptance Test Procedure', 'Includes FAT and non-FAT (Factory Acceptance Test) procedures._x000D_
Also see Acceptance Test Report for definitions.', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 617),
('6180', 'Other Procedure', NULL, NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 618),
('7205', 'Technical Deviation Request', 'Request, approval or rejection of changes to a technical specification. Would typically include justification and reasons for the request, and acceptance or rejection from a purely technical perspective.

Synonym: Concession

For similar documents pertaining specifically to contract variations, refer to Variation Request 7206.', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 619),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 620),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 621),
('7771', 'Equipment Specification', 'Gives precise information about a Tag, Equipment or a Model. May include size, capacity, materials, functional requirements, failure requirements, etc. and compliments Equipment Data Sheet 2105._x000D_', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 622),
('7880', 'Other Specification', NULL, NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 623),
('8370', 'Mechanical Handling Equipment Study', 'Study will identify the most appropriate mechanical handling equipments (cranes, hoists, forklift trucks, etc.) for facilities.', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 624),
('8380', 'Other Study', 'To cover various mechanical static studies._x000D_
E.g. heat exchanger type selection, internals layout/arrangement study.', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 625),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'MS', 'Mechanical - Static', 'IFI, AFU, AFP, AFT', true, 626),
('1580', 'Other Certificate', NULL, NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 627),
('2105', 'Equipment Datasheet', 'Gives precise information about a Tag, Equipment or a Model (eg.Equipment Record Card - ERC) and compliments Equipment Specification 7771.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 628),
('2310', 'Cause, Effect Diagram', '- Drawn in accordance with API RP14C to indicate clearly and precisely the shutdown requirements on the standard format sheet with defined convention._x000D_
- Individual C&D charts to be produced for each process unit. _x000D_
- All autostart/changeover etc. of pumps, etc. to be clearly defined with location of field devices.', NULL, NULL, 'MX', 'Mechanical Other', 'ASB, AFC, AFU, AFD', true, 629),
('2321', 'Equipment Diagram', NULL, NULL, NULL, 'MX', 'Mechanical Other', 'AFC, AFU, AFD', true, 630),
('2580', 'Other Schematic Diagram', 'Details the elements and functions of a system with the components represented by symbols, such as the elements of an electrical or electronic circuit or the elements of a logic diagram for a computer or communications system. May also detail the logic functions.', NULL, NULL, 'MX', 'Mechanical Other', 'AFC, AFU, AFD', true, 631),
('3328', 'Installation Manual', 'Installation refers to the mounting, setting, erection, etc. of equipment and accessories. Also see Fabrication (off-site building) and Construction (on-site building) for differences.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 632),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 633),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 634),
('4024', 'Layout Diagram, Plot Plan', 'Plan view of a area showing exact location of main items of equipment.', NULL, NULL, 'MX', 'Mechanical Other', 'ASB, AFC, AFU, AFD', true, 635),
('4306', 'Bill of Materials', 'A list of all parts and sub assemblies that constitute a particular assembly, showing the quantity of each required item. Excludes Material Register. Compare Bill of Quantities for whole assemblies and bulk materials.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 636),
('4307', 'Bolt List', 'Indicates number, type, size and material of all fixing bolts required.  Where temporary bolts are required to withstand transportation forces these shall also be indicated with suitable note of explanation.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 637),
('4380', 'Other List', NULL, NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 638),
('4816', 'Method Statement', NULL, NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 639),
('5011', 'Material Traceability Report', 'Location plans/records with an identification system cross referring to the individual material certificates. Where applicable, material placement drawings shall be verified by the Principal and/or third party inspection authority.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 640),
('5106', 'Three Dimensional Model', NULL, NULL, NULL, 'MX', 'Mechanical Other', 'ASB, AFC, AFU, AFD', true, 641),
('5280', 'Multimedia', 'Multimedia being Picture, Sound or Video.  Includes laser scans, x-rays, sonograms, installation videos, photogrammetry, illustrations, fly-throughs, etc.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 642),
('5507', 'Design Philosophy', 'A set of ideas, beliefs, or underlying theory. _x000D_
eg. to use 2D CAD Vs 3D CAD Vs Physical Block Model.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 643),
('5980', 'Other Strategy', NULL, NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 644),
('6026', 'Forming, Heat Treatment Procedure', 'Includes heating, soak, cooling parameters, limits of strain during forming, temperature ranges, method of attachment of thermocouples, temperature control, equipment calibration, production testing, etc.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 645),
('6046', 'Pressure Test Procedure', 'Includes hydrostatic, pneumatic, and leak tests/examinations.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 646),
('6067', 'Acceptance Test Procedure', 'Includes FAT and non-FAT (Factory Acceptance Test) procedures._x000D_
Also see Acceptance Test Report for definitions.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 647),
('6180', 'Other Procedure', NULL, NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 648),
('6612', 'Equipment Register', 'Master Tag and Equipment list including all items displayed on the Process Engineering Flow Schemes. May include sizes, basic specifications, and selection of characteristics / properties / attributes.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 649),
('6988', 'Vibration Report', 'Vibration performance including mechanical and electrical run out for displacement measuring systems during mechanical and performance testing of machinery.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 650),
('7180', 'Other Report', NULL, NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 651),
('7205', 'Technical Deviation Request', 'Request, approval or rejection of changes to a technical specification. Would typically include justification and reasons for the request, and acceptance or rejection from a purely technical perspective.

Synonym: Concession

For similar documents pertaining specifically to contract variations, refer to Variation Request 7206.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 652),
('7739', 'Project Specification', 'A technical description of the information on a Project necessary to prepare a +/-10% estimate, including references to:_x000D_
 - technical specifications required to prepare detailed design and engineering work_x000D_
 - procedures and requirements for the execution of the work and services for the realisation of a project_x000D_
Note: This doc type is not a BOOK as defined in the EIS. It is a document referencing other specifications, procedures, etc.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 653),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 654),
('7755', 'Insulation, Heat Tracing Specification', 'Provides equipment application information (pipe, vessel etc.) material type, thickness requirements, services conditions, personnel protection and fireproofing._x000D_
Includes refractory insulation._x000D_
Includes electrical tracing._x000D_', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 655),
('7770', 'Other Functional Design Specification', 'Specification that describes the deliverable in terms of form, fit, function, and performance characteristics to satisfy the intended use. May also include other design and delivery specifications such as those required for purchasing', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 656),
('7771', 'Equipment Specification', 'Gives precise information about a Tag, Equipment or a Model. May include size, capacity, materials, functional requirements, failure requirements, etc. and compliments Equipment Data Sheet 2105.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 657),
('7880', 'Other Specification', NULL, NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 658),
('8218', 'Design Layout Study', 'A work, such as a thesis, that results from studious endeavour. A literary work on a particular subject.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 659),
('8226', 'Equipment Study', NULL, NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 660),
('8241', 'Material Selection Study', 'Describes materials and reasons for selecting those materials (eg. environmental conditions).', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 661),
('8380', 'Other Study', NULL, NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 662),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 663),
('8611', 'Pressure Test Report', 'Includes hydrostatic, pneumatic, and leak tests/examinations.', NULL, NULL, 'MX', 'Mechanical Other', 'IFI, AFU, AFP, AFT', true, 664),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, NULL, 'Engineering Maintenance', 'IFI, AFU, AFP, AFT', true, 665),
('3375', 'Work Instruction', 'Self Explanatory', NULL, NULL, NULL, 'Engineering Maintenance', 'IFI, AFU, AFP, AFT', true, 666),
('4354', 'Spare Part List', 'Recommended listing of spares to support operation and maintenance for a period of two years. To be provided with relevant documentation (equipment details, drawings, parts list etc.) to permit evaluation of the recommendation. Must include cross reference', NULL, NULL, NULL, 'Engineering Maintenance', 'IFI, AFU, AFP, AFT', true, 667),
('4810', 'Maintenance Manual', 'Originates from the equipment or package supplier.', NULL, NULL, NULL, 'Engineering Maintenance', 'IFI, AFU, AFP, AFT', true, 668),
('5105', 'Reliability Model', NULL, NULL, NULL, NULL, 'Engineering Maintenance', 'AFC, AFU, AFD', true, 669),
('5796', 'Maintenance Strategy', NULL, NULL, NULL, NULL, 'Engineering Maintenance', 'IFI, AFU, AFP, AFT', true, 670),
('5880', 'Other Plan', NULL, NULL, NULL, NULL, 'Engineering Maintenance', 'IFI, AFU, AFP, AFT', true, 671),
('6034', 'Maintenance Procedure', 'Synonym of Maintenance Job Routine MJR and Maintenance Jobcard. _x000D_
Often created at the system level to consolidate the relevant sections of the Maintenance Manuals (see 4810) provided by the suppliers.', NULL, NULL, NULL, 'Engineering Maintenance', 'IFI, AFU, AFP, AFT', true, 672),
('6061', 'Test Procedure', NULL, NULL, NULL, NULL, 'Engineering Maintenance', 'IFI, AFU, AFP, AFT', true, 673),
('7739', 'Project Specification', 'Reserved for project wide Discipline Technical Specifications such as Project Civil Specification, Project Electrical Specification, etc._x000D_
Is also used to classify the component documents that comprise the Basic Design Package (BDP) and Basic Design Engineering Package (BDEP). Index of Documents JA4372 may be created to define these Packages (Books)._x000D_
A Project Specification (as defined in PG08) is a BDEP plus various procedures (ie. also a Book) and is not to be confused with this Document Type that shares the same name.', NULL, NULL, NULL, 'Engineering Maintenance', 'IFI, AFU, AFP, AFT', true, 674),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, NULL, 'Engineering Maintenance', 'IFI, AFU, AFP, AFT', true, 675),
('7880', 'Other Specification', NULL, NULL, NULL, NULL, 'Engineering Maintenance', 'IFI, AFU, AFP, AFT', true, 676),
('8239', 'Maintenance Study', NULL, NULL, NULL, NULL, 'Engineering Maintenance', 'IFI, AFU, AFP, AFT', true, 677),
('8270', 'Capital Insurance Spare Study Report', 'A study justifying the buying of Capital spares.', NULL, NULL, NULL, 'Engineering Maintenance', 'IFI, AFU, AFP, AFT', true, 678),
('1927', 'Training Data', 'Vendor shall provide:_x000D_
- 	Operational & Maintenance Training Plan providing durations and locations of sessions_x000D_
- 	All materials used for Training plan for retention by Principal', NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 679),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 680),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 681),
('4316', 'Consumables, utilities consumption List', 'Details consumables, lubrication requirements (oil, grease, filters, batteries, additives etc.) or utilities consumption (e.g. seal gas, instrument air, nitrogen, lubrication oil )  for all plant and machinery including quantities used and recommended change frequency. For rationalisation and minimising of stockholdings, and management.', NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 682),
('4380', 'Other List', NULL, NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 683),
('4811', 'Operating Manual', 'Instructions, procedures, drawings, tables, etc. for the operation -stop, start, and emergency shutdown. Including operational limits, function testing, possible interruptions, corrective actions, hazards and corrective measures to be taken.', NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 684),
('4880', 'Other Manual', 'Not to replace "Books", as defined in the EIS Section 3.4 which requires an Index to be created. See Index of Documents.', NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 685),
('5160', 'Forms & Templates', NULL, NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 686),
('5522', 'Operation Philosophy', 'Operations (inc. start-up / shutdown)', 'Tier 2', NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 687),
('5680', 'Other Philosophy', NULL, NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 688),
('5705', 'Asset Reference Plan', 'Integrated lifecycle management and development plan for surface and sub-surface facilities, including development scenarios, and phased development plans. Synonym ARP. The ARP Process includes activities such as developing the Asset Strategy, long term plans and Activity Based Cost Models, documenting assumptions and uncertainties, and identifying growth opportunities and how they will be pursued.  By applying and evolving the ARP Process, Asset Managers will ensure the effective management of their assets, and control of associated costs, throughout the Asset Life Cycle.', NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 689),
('5773', 'Simultaneous Operations Plan, SIMOPS', NULL, 'Tier 1', 'RLMU', 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 690),
('5795', 'Recruitment Plan', 'Specifies how recruitment will be done.', NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 691),
('5798', 'Project Plan', 'Reserved for project wide Discipline Management Plans such as Project QA Plan, Project HSES Plan, Project IM Plan, etc...', NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 692),
('5876', 'Flawless Project Delivery Quality Plan', 'A plan explaining how the FPD is implemented by Q area.', NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 693),
('5877', 'Flawless Project Delivery Plan', 'An overall plan explaining how Flawless Project Delivery is implemented.', NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 694),
('5880', 'Other Plan', 'Reserved for project wide Discipline Management Plans such as Project QA Plan, Project HSES Plan, Project IM Plan, etc...', NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 695),
('5980', 'Other Strategy', NULL, NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 696),
('6039', 'Operating Procedure', 'Supervisory Level Operating Procedures for all Process/Utility Systems. Information needed for the safe and efficient operation of the process plant and utilities (Shall include Steady State, start-up, Shutdown and transient Operations).', 'Tier 1', 'RLMU', 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 697),
('6180', 'Other Procedure', NULL, NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 698),
('6680', 'Other Register', NULL, NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 699),
('7180', 'Other Report', NULL, NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 700),
('7739', 'Project Specification', 'Reserved for project wide Discipline Technical Specifications such as Project Civil Specification, Project Electrical Specification, etc._x000D_
Is also used to classify the component documents that comprise the Basic Design Package (BDP) and Basic Design Engineering Package (BDEP). Index of Documents JA4372 may be created to define these Packages (Books)._x000D_
A Project Specification (as defined in PG08) is a BDEP plus various procedures (ie. also a Book) and is not to be confused with this Document Type that shares the same name.', NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 701),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 702),
('7880', 'Other Specification', NULL, NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 703),
('8380', 'Other Study', NULL, NULL, NULL, 'OA', 'Operations', 'IFI, AFU, AFP, AFT', true, 704),
('504', 'Fluid Analysis Report', 'Details the composition/makeup of process and produced fluids.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 705),
('580', 'Other Analysis Report', 'Compositional analysis of non direct process simulation related fluids. This includes reports for flow assurance and product specification requirements.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 706),
('902', 'Facility Block Diagram', 'For Process, High Level Process Flow Diagram.', NULL, NULL, 'PX', 'Process Other', 'ASB, AFC, AFU, AFD', true, 707),
('1206', 'Design Calculation', 'Design calculations prepared in order to prove that the item of equipment or system selected meets the design criteria. Utilises input from the PX1216 Mass, Heat Balance Calculation.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 708),
('1216', 'Heat and Mass Balance Calculation', 'Process simulation and process calculations required for generation of heat and mass balance cases. This will include specific heating and cooling medium simulations.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 709),
('1380', 'Other Calculation', NULL, NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 710),
('1979', 'Database and Data set', 'Data stored in a proprietary (e.g. SPI Watcom) or neutral (e.g. CSV)  format from which multiple information contents can be generated by computer software (e.g. SPPID).', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 711),
('2105', 'Equipment Datasheet', 'Gives precise information about a Tag, Equipment or a Model (eg.Equipment Record Card - ERC) and compliments Equipment Specification 7771.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 712),
('2336', 'Hydraulic, Pneumatic Diagram', 'Schematics for any system not covered by PEFS/UEFS (VDR Code D02) e.g. hydraulic pneumatic cooling.', NULL, NULL, 'PX', 'Process Other', 'AFC, AFU, AFD', true, 713),
('2341', 'Interface Diagram', 'Diagrams showing Interface between Contractors (e.g. terminations, hook ups).', NULL, NULL, 'PX', 'Process Other', 'AFC, AFU, AFD', true, 714),
('2366', 'Process Flow Scheme', 'Details major items of equipment, primary lines and valves, operating temperatures, pressures and mass flows._x000D_
Diagrams shall be provided for all hydrocarbon and utilities systems._x000D_
Includes PFDs and Utility Flow Schemes UFS.', NULL, NULL, 'PX', 'Process Other', 'ASB, AFC, AFU, AFD', true, 715),
('2908', 'Relief Valve Calculation', 'Process Relief Valve calculation. The output is documented in the Process Safeguarding Memorandum.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 716),
('3323', 'Technical Note', 'Agreement which describes how an engineering or maintenance issue will be resolved and what the implication of the solution is.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 717),
('3329', 'Integrity Operating Envelope', 'Specifies the lower and upper safe working operating parameters (temperature, pressure, composition, flow) that shall be used for sizing unit operations.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 718),
('3342', 'Heat and Mass Balance Summary', 'Chart summarising mass flow rates at key points within the process and utility systems', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 719),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 720),
('3363', 'Safeguarding Memorandum', 'The memorandum describes required process relief cases, the ultimate safeguards (relief devices) and penultimate safeguards (safeguards by instrumentation) for process integrity of a particular process unit._x000D_
It complements the "Process Safeguarding Flow Scheme" (See PX2368)_x000D_', 'Tier 1', NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 721),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 722),
('4322', 'Equipment Summary List', 'An extract from a Register (see 6612 Equipment Register) that is used as a secondary reference (ie. not the master).', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 723),
('4363', 'Tie-In List', 'Tie-In includes interfaces between project stages, contractors and systems (eg. new to existing plant connections).', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 724),
('4603', 'Hydraulic Calculation', 'Calculations to indicate basis on which equipment is sized, including pipe friction losses, equipment elevations and terminal point static pressures. Includes Net Positive Suction Head calculations and other steady state conditions. Also includes calculation of hydraulic surge (synonym Water Hammer) for the purpose of determining valve sizing, closing speed, etc.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 725),
('4814', 'Process Manual', 'Defines the process design and operations requirement for a specific process unit operation. This will ultimately feed itno the Plant Operations Manual.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 726),
('5280', 'Other Multimedia', NULL, NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 727),
('5507', 'Design Philosophy', 'A set of ideas, beliefs, or underlying theory. _x000D_
eg. to use 2D CAD Vs 3D CAD Vs Physical Block Model.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 728),
('5517', 'Isolation Philosophy', 'Isolation', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 729),
('5520', 'Metering Philosophy', 'Documentation of the metering and allocation philosophy for hydrocarbon fiscal measurement.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 730),
('5527', 'Process Description Philosophy', 'process description', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 731),
('5680', 'Other Philosophy', NULL, NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 732),
('5721', 'Engineering Design Strategy', NULL, NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 733),
('5743', 'Material Selection Plan', NULL, NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 734),
('5880', 'Other Plan', NULL, NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 735),
('6067', 'Acceptance Test Procedure', 'Includes FAT and non-FAT (Factory Acceptance Test) procedures._x000D_
Also see Acceptance Test Report for definitions.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 736),
('6180', 'Other Procedure', 'e.g. Procedures documenting how to use an application (e.g. SPPID) for a particular discipline.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 737),
('6204', 'Process, Utility Calculation', 'Process related calculations to prove that the item of equipment or system selected meets the design criteria._x000D_
Utilises input from the PX1216 Heat and Mass Balance Calculation. _x000D_', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 738),
('6612', 'Equipment Register', 'Master Tag and Equipment list including all items displayed on the Process Engineering Flow Schemes. May include sizes, basic specifications, and selection of characteristics / properties / attributes.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 739),
('7180', 'Other Report', NULL, NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 740),
('7205', 'Technical Deviation Request', 'Request, approval or rejection of changes to a technical specification. Would typically include justification and reasons for the request, and acceptance or rejection from a purely technical perspective.

Synonym: Concession

For similar documents pertaining specifically to contract variations, refer to Variation Request 7206.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 741),
('7403', 'Design Review Report', 'Verification of a design, based on comparison with standards, constructability, operability, safety, etc. May be performed by internal or external resources.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 742),
('7739', 'Project Specification', 'A technical description of the information on a Project necessary to prepare a +/-10% estimate, including references to:_x000D_
 - technical specifications required to prepare detailed design and engineering work_x000D_
 - procedures and requirements for the execution of the work and services for the realisation of a project_x000D_
Note: This doc type is not a BOOK as defined in the EIS. It is a document referencing other specifications, procedures, etc.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 743),
('7741', 'Relief, Blowdown Specification', 'Sizing data for the relief and blowdown systems.  Preliminary version to be developed for project specification', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 744),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 745),
('7770', 'Other Functional Design Specification', 'Specification that describes the deliverable in terms of form, fit, function, and performance characteristics to satisfy the intended use. May also include other design and delivery specifications such as those required for purchasing', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 746),
('7880', 'Other Specification', NULL, NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 747),
('8240', 'Design Cases Study', 'Defines the process design cases and sensitivity cases for process modelling.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 748),
('8248', 'Process Control, Optimisation Study', 'Specific process control and control optimisation studies. This includes dynamic simulations to assess control performance.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 749),
('8380', 'Other Study', NULL, NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 750),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'PX', 'Process Other', 'IFI, AFU, AFP, AFT', true, 751),
('880', 'Other Audit Report', 'Independnent assurances of compliance with specified requirements, based on comparison with system, processes, standards, constructability, operability, safety, etc. _x000D_
May be performed by internal or external resources.', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 752),
('1426', 'Material Test Certificate', NULL, NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 753),
('1580', 'Other Certificate', NULL, NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 754),
('3323', 'Technical Note', 'Agreement which describes how an engineering or maintenance issue will be resolved and what the implication of the solution is.', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 755),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 756),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 757),
('3375', 'Work Instruction', 'Self Explanatory', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 758),
('3880', 'Other Inspection Report', 'Summary of physical verification of conformance to requirements identifying remedial action, impovement, and learning.', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 759),
('4815', 'Quality Manual', 'Quality Management System in accordance with selected ISO and Company standards.', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 760),
('4816', 'Method Statement', NULL, NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 761),
('5160', 'Forms & Templates', NULL, NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 762),
('5707', 'Audit Plan', 'Schedule or plan for carrying out project quality audits', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 763),
('5733', 'Inspection Plan', 'Inspection and test plan for all construction work', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 764),
('5798', 'Project Plan', 'Reserved for project wide Discipline Management Plans such as Project QA Plan, Project HSES Plan, Project IM Plan, etc...', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 765),
('5880', 'Other Plan', NULL, NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 766),
('6050', 'Quality Procedure', 'Quality management procedure. Inspection and Test Procedure for controlling the work.', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 767),
('6180', 'Other Procedure', NULL, NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 768),
('6830', 'Corrective Action Report', 'Details of actions to be taken to remedy a finding from an audit or Quality Assessment.', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 769),
('6876', 'Health Check Report', 'This is about business process health, not about personal health.', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 770),
('6918', 'Non Conformance Report', 'A condition of any product or component in which one or more characteristics do not conform to requirements. Includes failures, deficiencies, defects and malfunctions. Is often identified during an audit.', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 771),
('6950', 'Quality Report', 'Summary of any investigation, or review identifying quality impovement and learning opportunities.', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 772),
('7180', 'Other Report', NULL, NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 773),
('7403', 'Design Review Report', 'Verification of a design, based on comparison with standards, constructability, operability, safety, etc. May be performed by internal or external resources.', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 774),
('7480', 'Other Review Report', NULL, NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 775),
('7739', 'Project Specification', 'Reserved for project wide Discipline Technical Specifications such as Project Civil Specification, Project Electrical Specification, etc._x000D_
Is also used to classify the component documents that comprise the Basic Design Package (BDP) and Basic Design Engineering Package (BDEP). Index of Documents JA4372 may be created to define these Packages (Books)._x000D_
A Project Specification (as defined in PG08) is a BDEP plus various procedures (ie. also a Book) and is not to be confused with this Document Type that shares the same name.', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 776),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'QA', 'Quality Assurance', 'IFI, AFU, AFP, AFT', true, 777),
('709', 'Risk Assessment Report', 'Overall assessment of overall compound technical risk foreseen for the project.', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 778),
('1206', 'Design Calculation', 'Prepared in order to prove that the item of equipment or system selected meets the design criteria.', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 779),
('1580', 'Other Certificate', NULL, NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 780),
('2105', 'Equipment Datasheet', 'Gives precise information about a Tag, Equipment or a Model (eg.Equipment Record Card - ERC) and compliments Equipment Specification 7771.', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 781),
('2309', 'Cathodic Protection Diagram', 'Showing locations of cathodic protection and schematic diagrams', NULL, NULL, 'RA', 'Materials and Corrosion', 'AFC, AFU, AFD', true, 782),
('2349', 'Material Selection Diagram', 'Describes materials and reasons for selecting those materials (eg. environmental conditions).', NULL, NULL, 'RA', 'Materials and Corrosion', 'AFC, AFU, AFD', true, 783),
('3323', 'Technical Note', 'Agreement which describes how an engineering or maintenance issue will be resolved and what the implication of the solution is.', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 784),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 785),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 786),
('3375', 'Work Instruction', 'Step by Step instruction for the accomplishment of a task. More detailed than a Procedure.', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 787),
('4816', 'Method Statement', NULL, NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 788),
('4880', 'Other Manual', 'Quality Management System in accordance with selected ISO and Company standards.', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 789),
('5519', 'Corrosion Philosophy', 'Outlines the design rules and principles relating to corrosion (eg. material selection, allowances, mitigation techniques).', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 790),
('5680', 'Other Philosophy', NULL, NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 791),
('5770', 'Corrosion Inhibition Testing Plan', 'Corrosion inhibitor testing requirements based on project process and design criteria (could be SOR or BOD).', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 792),
('5779', 'Material Testing Plan', 'Material testing covering mechanical or corrosion testing requirements on non shell approved materials.', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 793),
('6038', 'Non Destructive Test Procedure', 'Includes all non-destructive tests/examinations. Excludes pressure tests.', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 794),
('6067', 'Acceptance Test Procedure', 'Includes FAT and non-FAT (Factory Acceptance Test) procedures.

Also see Acceptance Test Report for definitions.', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 795),
('6068', 'Surface Protection Procedure', 'Painting, Coating and Cathodic Protection.', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 796),
('6919', 'Corrosion Inhibition Selection Report', 'Detailed report from results of corrosion inhibition testing plan (see RA5770).', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 797),
('7005', 'Cathodic Protection Design Report', 'May include design assumptions, constraints, calculations and tables to describe the design.', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 798),
('7180', 'Other Report', NULL, NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 799),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 800),
('7739', 'Project Specification', 'A technical description of the information on a Project necessary to prepare a +/-10% estimate, including references to:_x000D_
 - technical specifications required to prepare detailed design and engineering work_x000D_
 - procedures and requirements for the execution of the work and services for the realisation of a project_x000D_
Note: This doc type is not a BOOK as defined in the EIS. It is a document referencing other specifications, procedures, etc.', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 801),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 802),
('7754', 'Surface Protection Specification', 'Painting, Coating and Cathodic Protection.', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 803),
('7769', 'Corrosion Inhibition System Design', 'Design requirements for corrosion inhibition based on Corrosion inhibition report (See RA6919).', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 804),
('7771', 'Equipment Specification', 'Gives precise information about a Tag, Equipment or a Model. May include size, capacity, materials, functional requirements, failure requirements, etc. and compliments Equipment Data Sheet 2105._x000D_', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 805),
('7880', 'Other Specification', NULL, NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 806),
('8241', 'Material Selection Study', 'Describes materials and reasons for selecting those materials (eg. environmental conditions).', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 807),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 808),
('8602', 'Cathodic Protection Test Report', 'Cathodic Protection test results to include test methodology and results', NULL, NULL, 'RA', 'Materials and Corrosion', 'IFI, AFU, AFP, AFT', true, 809),
('1447', 'Weight Certificate', NULL, NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 810),
('1448', 'Weight Report', 'Shows weight and centre of gravity of equipment. If large items are to be handled for equipment installation or maintenance, then the weight and centre of gravity of these individual parts should be shown.  Final weighing certificate shall accompany goods during shipment & delivery.', NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 811),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 812),
('4322', 'Equipment Summary List', 'An extract from a Register (see 6612 Equipment Register) that is used as a secondary reference (ie. not the master).', NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 813),
('5773', 'Simultaneous Operations Plan, SIMOPS', NULL, 'Tier 1', 'RLMU', 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 814),
('5798', 'Project Plan', 'Reserved for project wide Discipline Management Plans such as Project QA Plan, Project HSES Plan, Project IM Plan, etc..._x000D_
eg. For Logistics: Transportation Program showing Route survey and plan, transport of major equipment to site (including Video and Pictures), Road Conditions before and after.', NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 815),
('5880', 'Other Plan', NULL, NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 816),
('5980', 'Other Strategy', 'e.g. export, import compliance strategy, customs clearance and permitting strategy.', NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 817),
('6028', 'Handling, Shipping, Storage Procedure', 'Proposes techniques to be used.  Indicate size of container, number off, weight, identification and contents, include detail preservation procedure detailing inspection periods, materials required etc., both prior to installation and post installation, but prior to commissioning.  Any special unpacking/handling requirements shall be stated.', NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 818),
('6033', 'Lifting Procedure', 'Any additional information not covered by Erection & Installation Procedures (VDR Code P08).', NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 819),
('6180', 'Other Procedure', NULL, NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 820),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 821),
('7739', 'Project Specification', 'Reserved for project wide Discipline Technical Specifications such as Project Civil Specification, Project Electrical Specification, etc._x000D_
Is also used to classify the component documents that comprise the Basic Design Package (BDP) and Basic Design Engineering Package (BDEP). Index of Documents JA4372 may be created to define these Packages (Books)._x000D_
A Project Specification (as defined in PG08) is a BDEP plus various procedures (ie. also a Book) and is not to be confused with this Document Type that shares the same name.', NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 822),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 823),
('8236', 'Lifting Study', 'Will determine needs for cranes and handling equipment access at design stage. Access and cost related considerations to be made.  Including project related materials handling and bulk handling', NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 824),
('8266', 'Transportation Study', NULL, NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 825),
('8268', 'Anchoring Study', 'Includes anchoring of offshore vessels and the interaction of anchor lines with sub-sea pipelines and structures.', NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 826),
('8380', 'Other Study', NULL, NULL, NULL, 'SA', 'Logistics', 'IFI, AFU, AFP, AFT', true, 827),
('902', 'Facility Block Diagram', NULL, NULL, NULL, 'TA', 'Telecommunication', 'AFC, AFU, AFD', true, 828),
('980', 'Other Block Diagram', 'A pictorial representation of a process. It illustrates the relationships between the various  components that allows to perform a complex process.', NULL, NULL, 'TA', 'Telecommunication', 'AFC, AFU, AFD', true, 829),
('1203', 'Capacity Calculation', NULL, NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 830),
('1401', 'Approval Certificate', 'Certificate issued by a recognised independent authority indicating the equipment has been manufactured in accordance with code/standard.  For fire test certification the certificates are to be complete and as issued by the testing authority.  Certificates are to state Principal''s purchase order number, item number and identification to permit traceability to the fire tested item or material.Type approval certificates are normally acceptable for proprietary items.CE Mark certification or similar equivalent shall be included under this VDR code.', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 831),
('1580', 'Other Certificate', NULL, NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 832),
('2105', 'Equipment Datasheet', 'Gives precise information about a Tag, Equipment or a Model (eg.Equipment Record Card - ERC) and compliments Equipment Specification 7771.', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 833),
('2180', 'Other Datasheet', NULL, NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 834),
('2341', 'Interface Diagram', 'Diagrams showing Interface terminations and hook ups between Contractors', NULL, NULL, 'TA', 'Telecommunication', 'AFC, AFU, AFD', true, 835),
('2389', 'Terminal Connection Diagram', NULL, NULL, NULL, 'TA', 'Telecommunication', 'AFC, AFU, AFD', true, 836),
('3309', 'Bill Of Quantities', 'A list of whole assemblies or bulk material showing the quantity of each required to suit a purpose. Compare Bill of Materials for sub assemblies and parts. Synonym: Material Takeoff MTO', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 837),
('3323', 'Technical Note', 'Agreement which describes how an engineering or maintenance issue will be resolved and what the implication of the solution is.', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 838),
('3328', 'Installation Manual', 'Installation refers to the mounting, setting, erection, etc. of equipment and accessories. Also see Fabrication (off-site building) and Construction (on-site building) for differences.', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 839),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 840),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 841),
('4180', 'Other Layout Diagram', NULL, NULL, NULL, 'TA', 'Telecommunication', 'AFC, AFU, AFD', true, 842),
('4308', 'Cable List', 'List of all cables, their specifications and end points. Indicates salient features of all cables in Vendor''s supply and connecting cables supplied by Principal.
Synonym: Cable List', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 843),
('4361', 'Telemetry Input, Output List', 'Data map or Database model listing input and output points of plant instrumentation interconnections to telemetry systems.', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 844),
('4380', 'Other List', 'e.g. Firmware list for intelligent instrument', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 845),
('4816', 'Method Statement', NULL, NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 846),
('4880', 'Other Manual', 'Not to replace "Books", as defined in the EIS Section 3.4 which requires an Index to be created. See Index of Documents.', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 847),
('5280', 'Multimedia', 'Multimedia being Picture, Sound or Video.  Includes laser scans, x-rays, sonograms, installation videos, photogrammetry, illustrations, fly-throughs, etc.', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 848),
('5507', 'Design Philosophy', 'A set of ideas, beliefs, or underlying theory. _x000D_
eg. to use 2D CAD Vs 3D CAD Vs Physical Block Model.', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 849),
('5680', 'Other Philosophy', NULL, NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 850),
('6180', 'Other Procedure', NULL, NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 851),
('6612', 'Tag/Equipment Register', 'an authoritative collection of values with a relationship to a specific equipment or tag. The columns of this collection is specified and controlled.', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 852),
('7180', 'Other Report', NULL, NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 853),
('7205', 'Technical Deviation Request', 'Request, approval or rejection of changes to a technical specification. Would typically include justification and reasons for the request, and acceptance or rejection from a purely technical perspective.

Synonym: Concession

For similar documents pertaining specifically to contract variations, refer to Variation Request 7206.', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 854),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 855),
('7739', 'Project Specification', 'Reserved for project wide Discipline Technical Specifications such as Project Civil Specification, Project Electrical Specification, etc._x000D_
Is also used to classify the component documents that comprise the Basic Design Package (BDP) and Basic Design Engineering Package (BDEP). Index of Documents JA4372 may be created to define these Packages (Books)._x000D_
A Project Specification (as defined in PG08) is a BDEP plus various procedures (ie. also a Book) and is not to be confused with this Document Type that shares the same name.', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 856),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 857),
('7770', 'Other Functional Design Specification', 'Specification that describes the deliverable in terms of form, fit, function, and performance characteristics to satisfy the intended use. May also include other design and delivery specifications such as those required for purchasing', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 858),
('7880', 'Other Specification', NULL, NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 859),
('8226', 'Equipment Study', NULL, NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 860),
('8380', 'Other Study', NULL, NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 861),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'TA', 'Telecommunication', 'IFI, AFU, AFP, AFT', true, 862),
('8804', 'Connection Diagram', 'Details of cable numbers and terminations between vendor packages, equipment and particularly at Contractor interfaces_x000D_
Shall display in block form the items of electrical equipment and the cables connecting them.  The terminal block reference for each item shall be stated, along with the number and size of the conductors in the cables.  Cable(s) not supplied by the vendor shall be clearly identified.', NULL, NULL, 'TA', 'Telecommunication', 'AFC, AFU, AFD', true, 863),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'WA', 'Metocean and Ice', 'IFI, AFU, AFP, AFT', true, 864),
('5280', 'Multimedia', 'Multimedia being Picture, Sound or Video.  Includes laser scans, x-rays, sonograms, installation videos, photogrammetry, illustrations, fly-throughs, etc.', NULL, NULL, 'WA', 'Metocean and Ice', 'IFI, AFU, AFP, AFT', true, 865),
('5798', 'Project Plan', 'Reserved for project wide Discipline Management Plans such as Project QA Plan, Project HSES Plan, Project IM Plan, etc..._x000D_
eg. For Logistics: Transportation Program showing Route survey and plan, transport of major equipment to site (including Video and Pictures), Road Conditions before and after.', NULL, NULL, 'WA', 'Metocean and Ice', 'IFI, AFU, AFP, AFT', true, 866),
('5880', 'Other Plan', NULL, NULL, NULL, 'WA', 'Metocean and Ice', 'IFI, AFU, AFP, AFT', true, 867),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'WA', 'Metocean and Ice', 'IFI, AFU, AFP, AFT', true, 868),
('7739', 'Project Specification', 'Reserved for project wide Discipline Technical Specifications such as Project Civil Specification, Project Electrical Specification, etc._x000D_
Is also used to classify the component documents that comprise the Basic Design Package (BDP) and Basic Design Engineering Package (BDEP). Index of Documents JA4372 may be created to define these Packages (Books)._x000D_
A Project Specification (as defined in PG08) is a BDEP plus various procedures (ie. also a Book) and is not to be confused with this Document Type that shares the same name.', NULL, NULL, 'WA', 'Metocean and Ice', 'IFI, AFU, AFP, AFT', true, 869),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'WA', 'Metocean and Ice', 'IFI, AFU, AFP, AFT', true, 870),
('8373', 'Ice Analysis Study', 'A study providing an analysis of ice data.', NULL, NULL, 'WA', 'Metocean and Ice', 'IFI, AFU, AFP, AFT', true, 871),
('8374', 'Ice Environment Reference Document Study', 'A study providing a description of the ice environment.', NULL, NULL, 'WA', 'Metocean and Ice', 'IFI, AFU, AFP, AFT', true, 872),
('8375', 'Metocean Analysis Study', 'A study providing an analysis of metocean data.', NULL, NULL, 'WA', 'Metocean and Ice', 'IFI, AFU, AFP, AFT', true, 873),
('8379', 'Metocean Reference Document Study', 'A study providing the metocean design and operating conditions for the proposed offshore facilities._x000D_
This document should give a complete overview of all existing metocean data (wind, waves, currents, water level and weather data) and mention all existing metocean study reports._x000D_
_x000D_', NULL, NULL, 'WA', 'Metocean and Ice', 'IFI, AFU, AFP, AFT', true, 874),
('8380', 'Other Study', NULL, NULL, NULL, 'WA', 'Metocean and Ice', 'IFI, AFU, AFP, AFT', true, 875),
('8421', 'Metocean Survey Report', 'A report describing how, when and where metocean data has been collected.', NULL, NULL, 'WA', 'Metocean and Ice', 'IFI, AFU, AFP, AFT', true, 876),
('8422', 'Ice Survey Report', 'A report describing how, when and where ice data has been collected.', NULL, NULL, 'WA', 'Metocean and Ice', 'IFI, AFU, AFP, AFT', true, 877),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'WB', 'Marine', 'IFI, AFU, AFP, AFT', true, 878),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'WB', 'Marine', 'IFI, AFU, AFP, AFT', true, 879),
('7180', 'Other Report', NULL, NULL, NULL, 'ZE', 'Geology', 'IFI, AFU, AFP, AFT', true, 880),
('8380', 'Other Study', NULL, NULL, NULL, 'ZE', 'Geology', 'IFI, AFU, AFP, AFT', true, 881),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'ZG', 'Geomatics', 'IFI, AFU, AFP, AFT', true, 882),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'ZG', 'Geomatics', 'IFI, AFU, AFP, AFT', true, 883),
('4904', 'Topographic Map', 'Also for seafloor at offshore site and access route', NULL, NULL, 'ZG', 'Geomatics', 'AFC, AFU, AFD', true, 884),
('4980', 'Other Map', NULL, NULL, NULL, 'ZG', 'Geomatics', 'AFC, AFU, AFD', true, 885),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'ZG', 'Geomatics', 'IFI, AFU, AFP, AFT', true, 886),
('A01', 'Suppliers Document Schedule (SDS)', 'Listing by category and title of all Supplier''s documents to be issued per SDRL
Date of first submission of each document to Purchaser.
Listing to contain both Purchaser''s and Supplier''s document numbers. 
Refer to Purchaser''s procedure ''Drawing and Data Requirements Instructions to Suppliers'' included in the purchase order documentation.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 887),
('A02', 'Fabrication/Production Schedule', 'Schedule to barchart form, showing design, manufacture, inspection, testing and delivery of all equipment, materials and components to be delivered by Supplier and his sub suppliers. 
Earliest and latest completion dates shall be entered alongside each activity with float indicated. 
Once agreed with Purchaser, the ''planned'' dates shall not change without prior approval by purchaser. 
Progress to date shall be clearly shown against each activity. 
Procurement and delivery of sub supplier items with names and references to be included. 
Summary schedule of issue dates required for all documents in Data Code A01 above grouped by prime category, in bar chart format to show relationship with the Fabrication/Production Schedule. 
Schedule to show calendar dates.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 888),
('A03', 'Progress Reports   (Weekly / Monthly)', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 889),
('A04', 'Sub-order Schedule', 'Schedule shall show all sub orders to be placed by Supplier.  Against each entry Supplier shall indicate anticipated award date and the latest data by which sub order must be placed to meet the overall schedule. Supplier shall submit unpriced copies of sub orders at the time of order placement.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 890),
('A05', 'Design Deviation Request (DDR)', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 891),
('A06', 'Sub Orders (Copies)', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 892),
('A07', 'Exceptions / Deviation Listing', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 893),
('A99', 'Special', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 894),
('B02', 'Acceptable Nozzle Loads', 'Drawing to indicate acceptable loads, forces and moments on flanges to which Purchaser connects, together with loads during normal and maximum operating conditions, if not covered by applicable procedures.  Calculations to be included.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 895),
('B03', 'Interface and Connection Schedule', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 896),
('B04', 'Foundation Loading Diag. & Support Details', 'Floor fixing details.
Including all static and dynamic forces or movements acting on foundations or other load bearing supports during startup, shutdown, normal and maximum operation conditions and test conditions (e.g. motor/generator short circuit).
Also including Supplier''s recommended anchor bolt details with sizes and grades and locations (including tolerances) relative to equipment centre lines in all three planes, also recommended lengths and pretensioning.
Anchor bolt details show chock block and shimming arrangements.
Temporary fixing details for barge transportation to be shown.
For equipment, which is welded, skirt weld preparation is to be detailed.
Operating frequencies for vibrating equipment.
Drawing may be combined with Data Code B01, General Arrangement Drawings.', NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 897),
('B05', 'Construction Procedure', 'All Procedures including Method Statements', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 898),
('B06', 'Interface Definitions', 'This document shall detail the Main Machine Interface of the system.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 899),
('B99', 'Special', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 900),
('C01', 'Process Engineering Flow Sheets', 'Using Purchaser''s standard symbols for all hydrocarbon and utility systems PEFSs are to show the following, as applicable: _x000D_
a)Rev, Title, Notes _x000D_
b)Equipment names and numbers _x000D_
c)Equipment internals and externals _x000D_
d)Insulation and trace heating _x000D_
e)Vents and Drains _x000D_
f)PSV tags and sizes _x000D_
g)PSV interlock valves sequence _x000D_
h)Positive Isolation requirements, incl valve type _x000D_
i)Valve actuators and solenoids incl failure mode _x000D_
j)Vessel, sizes, manways and slope _x000D_
k)Vessel levels _x000D_
l)Equipment elevations _x000D_
m)Flowlines with directional arrows _x000D_
n)Continuation boxes and references _x000D_
o)Line sizes, numbers, pipe specs, spec breaks and product designation _x000D_
p)Piping notes _x000D_
q)Switches and instruments with tag nos and set points. _x000D_
r)Sample and corrosion monitoring points _x000D_
s)ESDVs_x000D_
t)Interfaces with other PEFSs including Purchaser''s _x000D_
u)All interface equipment shall be tagged with Purchaser''s tag numbering spec. Others to ISA S5.1 or Purchasers specs_x000D_
v)Major items to state duties and design conditions', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 901),
('C02', 'HVAC Schematic & Flow Diagrams', 'Unless agreed otherwise, Supplier using standard symbols provided on purchaser''s legend sheet shall draw schematics and flow diagrams.
Schematic and flow diagrams shall show at least the following as applicable:
Equipment
Ductwork
Instrumentation
Controls
Switches
Equipment Identification etc.', NULL, NULL, 'ZV', 'Vendor Documentation', 'ASB, AFC, AFU, AFD', true, 902),
('C03', 'Electrical Single Line Diagrams', 'Representation of electrical power, and/or control circuits, electrical major components and their function or instrument control circuits, defining the relationships, to include (as appropriate):
Control systems.
Consumer rating.
Switchgear/control gear ratings.
Busbar ratings.
Equipment descriptions and tag numbers.
Protection devices.', NULL, NULL, 'ZV', 'Vendor Documentation', 'ASB, AFC, AFU, AFD', true, 903),
('C04', 'Bill of Materials', 'Each tagged item on the PEFS (SDRL Code C01) shall be identified and the following information shall be given (as appropriate):
Purchaser''s tag number of Supplier''s tag number (as applicable).
Service description.
Rating or range of operation.
Materials of construction.
Signal output.
Manufacturer and model number.
Contacts for switches.
Shipped loose items required for offshore installation and assembly shall be clearly highlighted.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 904),
('C05', 'Inst / Telecoms System Schematic Diagrams', 'All main components and their functional relationship for major control systems (including computer, supervisory, telemetry and communications system) shall be identified on schematic diagrams.', 'Tier 2', 'RLMU', 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 905),
('C06', 'Utilities Schedule', 'Schedule to indicate types, quantities, pressure, temperature, voltage, KW, KVA, of all utilities required to start and operate the equipment under startup normal operation and shutdown conditions.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 906),
('C07', 'Weight Data Sheet', 'Supplier shall complete weight data sheets for each separately installed item of equipment or skid in accordance with weight data and instructions.  Information shall be submitted for each design change affecting weight data and at the following stages during the contract.
with enquiry
6 weeks after order
where there is any change to the weight identified by Supplier
as weighed, endorsed as such by Purchaser
The following information shall be updated: empty (dry), operating, test (full), shipping weight, C of G.
Heaviest lift during maintenance to be defined.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 907),
('C08', 'Equipment Data Sheet', 'Where Equipment Data Sheets are issued by Purchaser as part of purchase order, Supplier to fully complete.  Data sheets are to be completed for each and every instrument.', 'Tier 2', NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 908),
('C09', 'Noise Level Data Sheet', 'Purchaser will define sound power and sound pressure level limitation.  Supplier will complete and return these sheets with anticipated, and if requested, guaranteed data, for the Octave mid band frequencies corresponding to these limitations.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 909),
('C10', 'Schedule of Elec. Equipment in Haz. Area', 'All equipment and electrically operated instrumentation equipment to be listed in a tabular form with information presented under the following column headings:

- Equipment type
i.e. “Junction Box”, “Motor”, “Pressure Transmitter”. Etc
- Tag Number(s)
Quantity fitted (only for identical items fitted in same Zone.  All other equipment must be listed individually)
- Manufacturer
- Manufacturer’s Type Number
- Zone in which fitted
i.e. Zone 0, Zone 1, Zone 2 or Safe area
- Approval Body
e.g. BASEEFA, PTA, INTEX etc.
- Type of protection
e.g. Flameproof, Increased Safety, Intrinsically Safe etc.
- Type of protection code
e.g. eeXD: eXD: eeXE, eeXIA: etc.
- Apparatus Group (sometimes call “Gas Group”)
e.g. IIA: IIB: IIC.
 - Temperature Classifications
  e.g. T3, T6 etc.
- Hazardous Area Certificate Number
Date of expiry of current BASEEFA LICENCE (not certificate)
- Standard to which the equipment is certified
e.g. BS5501Parts 1 & 6
- Entry Protection ie the IP rating
e.g. IP56, IP67 etc 
e.g. ATEX', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 910),
('C11', 'Electric / Electronic / Pneumatic / Hydraulic Schematics', 'Diagrams shall indicate the schematic arrangement of all component parts.  The format shall be such that an understanding of the function shall be readily gained with accompanying notes, if needed.  Relays shall be shown in a deenergised state, with their contacts open or closed accordingly.
Interface terminals shall be uniquely identified by both symbol, type and number and their physical location identified.', NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 911),
('C12', 'Detailed Description of Operation', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 912),
('C13', 'PFD''s and Heat Mass Balance', 'Diagrams shall be provided for all hydrocarbon and utilities systems.  Diagrams shall be drawn using Purchaser symbology, and shall indicate major control functions.
Each stream shall be clearly labelled with a tag number.  PFD will indicate the duty performed by all items of equipment for example, power requirements and ate of heat transfer, etc.  Accompanying the PFD shall be a Heat and Mass Balance Sheet relating to the stream tag numbers on the PFD.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 913),
('C15', 'Control Philos. and Block Logic Diagrams', NULL, 'Tier 2', 'RLMU', 'ZV', 'Vendor Documentation', 'ASB, AFC, AFU, AFD', true, 914),
('C16', 'Oil Systems Operating Philosophy', 'To show pump sizing criteria, stop/start pump, quenching, pressure and capabilities - unit starting and stopping pump changeovers, etc.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 915),
('C17', 'Supplier''s Technical Procedure', 'Supplier shall prepare a detailed technical procedure, which in combination with data sheets shall fully define the design, manufacture and testing of the equipment supplied.  It shall also reference all National/International Codes and Standards that are applicable.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 916),
('C18', 'Detailed Parts List', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 917),
('C19', 'Vibration Data Sheet', 'This data-sheet shall contain all information regarding vibrations transmitted by package vendor to the supporting structure.

Characteristics and calculation note of Anti-Vibration Devices shall be provided.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 918),
('C20', 'Load Reverse Diagram and Report', 'Report including description of method used, input data, graphic display and VENDOR’s conclusion.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 919),
('C21', 'Analysis Reports', 'This report shall contain a CFD study of liquid seal behaviour for the given operation cases.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 920),
('C22', 'Tightening Specification', 'This specification shall contains tightening procedure (torque, sequence of tightening..) to be applied during assembly.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 921),
('C23', 'Radiation Isopleths', 'This graph shall show radiation isopleths for critical operating and environmental conditions including wind, solar radiations. Elevation view shall be also provided.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 922),
('C24', 'Noise Maps', 'This graph shall provide the sound levels for given operation and environmental conditions.', NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 923),
('C25', 'CE Marking Directives', 'a. Technical documentation and Hazard Analysis according ot applicable CE Marking Directives.

b. Essential Safety Requirements (ESR) checklist according to applicable CE Marking Directives.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 924),
('C26', 'Line List', 'This document includes all information necessary to identify the main characteristics of the lines. Pertaining to the unit such as:

a. Reference (from, to)
b. Service fluid.
c. Piping class.
d. Operating and design conditions.
e. Corrosion allowance
f. Material
g. Size
h. Thickness
i. Facing
j. Insulation type
k. Test pressure
l. Painting', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 925),
('C27', 'Piping Classes', 'Collection of all the information pertaining to the selection criteria for the piping components (pipes, flanges, valves and fittings), used for construction of lines.

Each piping class may be related to one or more services, according to the type of fluids and the operating and design conditions. 

Each piping component is briefly described and a corresponding identification code specified

The following data shall be qualified for each class:

a) Minimum and maximum services conditions,
b) Construction material
c) Pipe, valves, flanges, gaskets, stud/bolts, fittings, joints materials,
d) List of all identification codes, with detailed description (including reference to ANSI, API, ASTM, DIN std, etc.) of the piping components, etc,
e) Type of valves, joints,
f) Flanges rating/facing,
g) Usable diameters, piping schedule

According to the type of unit/package, this document can be simplified in a “Piping specification”.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 926),
('C28', 'Software Database Exchange Table', 'VENDOR shall provide a table filled as per CONTRACTOR’s form with list and details of software signals exchanged through communication links.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 927),
('C29', 'Bulletins and Catalogues', 'These documents are VENDOR documentation/leaflet of equipment in the scope of work.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 928),
('C30', 'Table of Data Exchange', 'This document shall list the various data with type of data to be exchanged between VENDOR scope and external system including communication procedure (when applicable).', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 929),
('C31', 'Functional Analysis', 'Vendor shall describe all functions covered by system with relevant inputs and actions.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 930),
('C32', 'Material Safety Data Sheet / COSHH', 'Data sheet shall contain description and details of all hazardous material.  Relevant risk: corrosion, acid, caustic…shall be listed.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 931),
('C33', 'Instrument and Control Equipment Manufacturer Documentation', 'In case of a package containing instrumentation, this cod0e is used to collect technical documentation relative to each instruments, transmitters..provided by sub-supplier.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 932),
('C34', 'Cable Pulling Procedures', 'Defines the maximum constraints that must not be exceeded when a cable is pulled.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 933),
('C35', 'Drum List', 'This is required in requisition for cables, in order to provide information to the site construction warehouse.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 934),
('C36', 'Equipment List', 'List of equipment supplied within a package or unit.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 935),
('C38', 'Material Specification', 'This specification shall contains all specifications required to main sub-orders: material of construction, mechanical requirements, standards, electrical and instrumentation, test procedures.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 936),
('C39', 'Maintenance Data Sheet', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 937),
('C41', 'Failure Report – Engineering', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 938),
('C42', 'Failure Report - Field', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 939),
('C43', 'Boiler Extrapolation Procedure and Results', 'Report demonstrating that the boiler has been properly designed with regards to the capacity upscale. It shall include:

a) The design procedure with associated schedule and key milestones.
b) Calculation notes such as stress calculations, combustion and CFD modelling.
c) Test reports (mock-up and burners).', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 940),
('C45', 'Hardware Documentation', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 941),
('C99', 'Special', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 942),
('D01', 'Cross Sectional Drawing or Exploded View Diagram with Parts List', 'Scale drawings of component parts shall be shown in cross section or, if required, by exploded view representative where the various parts of the assembly are separated, but in proper position relative to each other.  All parts to be identified by the parts list, which shall give full details of:
Material of Construction
Thickness
Manufacturer and references No

Cable Cross Section Drawings
This document shall identify all electrical cables and main data (rated voltage, insulation voltage, cable specification, number of conductors & cross-section) routing through a given cross section', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 943),
('D02', 'Mechanical Seal Details', 'Dimensions including clearances.
Parts list, defining materials,
Identification of fluid connection points.
Seal system description (if required).
Description of operation (if required).
Piping system indicating all components and materials.', NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 944),
('D03', 'Shaft Alignment Drawings', 'Scale drawings showing design/actual alignment with thermal growths and tolerances both angular and displacement together with alignment procedures.', NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 945),
('D04', 'Name Plate Format Drawings', 'Drawings for Coded Vessel and equipment nameplates, which shall include all details to satisfy Code and Purchaser''s requirements.', NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 946),
('D05', 'Sub Assembly Drawings', 'Details of sub assemblies which form part of the Suppliers package and which may be required for Purchaser''s review and approval or for information, but which are not shown to be adequate detail on the General arrangement drawing.  Information shall be shown in accordance with the requirements for the GA.', NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 947),
('D06', 'Installation & Dismantling Drawing', 'To be done', NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 948),
('D07', 'Detail Drawing', 'Detail drawings to indicate method of construction, plus all features, which are omitted from the GA drawing for clarity.
Drawings will contain the following information where appropriate:
Manufacturer
Tag Number
Process connection size(s) and ratings
Inlet and outlet configuration
Face to face dimensions
Overall height, width and depth
Electrical connection size(s)
Instrument mounting details
Instrument accessories (positioner, hand wheel, air set, etc)
Weight', NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 949),
('D08', 'Insulation / Lining Details', 'Drawings to indicate thickness, procedure and limit of application.  To include anchoring and expansion joint details.', NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 950),
('D09', 'Shop Detail Drawing', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 951),
('D10', 'Isometrics', 'This drawings are not to scale, are always one- line diagram type and the following will be shown:

a) Line routing with the position of all fittings/valve, flange, bends, etc,
b) Flow direction,
c) Line number, piping class,
d) Pipe and components diameters,
e) All dimensions required for line construction,
f) Orifice flange pressure tap orientations,
g) Orientation of flange holes if not standard,
h) Construction details, if any, concerning special components to be constructed on site with piping materials,
i) Item and number of all on-line or on-equipment instruments,
j) Symbols and references of standard and special auxiliary piping supports
k) Field welding to be executed during erection.

To be used for field assembly, the isometrics shall also specify the requirements in terms of:

a) PWHT, b) NDE, c) Test pressure and medium, d) Insulation, e) Painting

In any case, the same level information as CONTRACTOR’s isometrics shall be provided.

For each sketch a list of piping materials to be provided with the following information for the piping component and lines. The list can be provided on the same sketch drawing or in a separate document.

a) Type, material, diameter, thickness or schedule, rating,
b)  Quantity,
c) Weight of each element
d) Total weight', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 952),
('D15', 'Material Selection Diagram', 'A schematic diagram (ie. similar to a PFS/PFD or PEFS/P&ID) showing materials selected for each component of the design. May include piping class breaks (e.g. CS/SS316) and vessel internals (e.g. CS Epoxy lined). Includes corrosion loop diagrams that show boundary definitions._x000D_', NULL, NULL, 'ZV', 'Vendor Documentation', 'ASB, AFC, AFU, AFD', true, 953),
('D99', 'Special', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 954),
('E01', 'Interconnection Diagram', 'Diagrams shall display, in block form, the items of electrical equipment and the cables connecting them.  The terminal block reference for each item shall be stated, along with the number and size of the conductors and cables.  Cable NOT in the Supplier''s Scope of Supply shall be clearly identified.', 'Tier 2', 'RLMU', 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 955),
('E02', 'Panel / Cabinet Layout', '1. Front of panel layout clearly showing overall size and layout, with a table of instruments showing duty/label engraving/model number.
2. Back of panel arrangement clearly showing same data as front of panel.
3. Construction drawing showing main dimensions hinging/opening of doors, door restraints, method of locking, plinths, stiffeners, hold down details (fully dimensional) anti vibration methods, materials, panel finish procedure and colours.
4. Mimic/annunciator drawing where applicable.
5. Internal layout of panel showing:
lighting
cable entries and terminal strip locations
wiring trays
segregation of voltage level, IS and non IS equipment
hydraulic, pneumatic layouts (where applicable)', 'Tier 2', 'RLMU', 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 956),
('E03', 'Instrument / Electrical Logic Diagrams', 'To be prepared for all sequence and interlock control systems to show control systems functions.
Symbols to be in accordance with BS3939 Section 21.
Diagrams are to be arranged so that the overall logic is clearly apparent.
Subsystem logic will be grouped together to clearly identify their association with each other and with the overall logic system.', 'Tier 2', 'RLMU', 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 957),
('E04', 'Terminal Block Diagrams', 'Diagrams shall show each terminal block with the terminals numbered and the cores of the connecting cables identified.  The core identifiers given shall be those ferruled onto the conductors and shall follow any numbering system advised by Purchaser.  Terminal block diagrams may be incorporated with interconnection diagrams, if the complexity of the system permits.
Drawings must show AC/DC segregation, IS and non IS segregation (where applicable) and cable screen terminations, together with duty description/tag against input and output.  For ease of identification, destination ''to and from'' is to be shown, with cross-referenced drawing numbers and earthing requirements clearly shown.', 'Tier 2', 'RLMU', 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 958),
('E05', 'Cable Schedule', 'All electrical, instrument and telecom cables shall be listed, both internal to Supplier''s package and identification of Purchaser installed cables between components of Supplier''s package, listing:
cable size and type
cable number
gland size and type
to and from location
inter-connection diagram cross reference
cable length, in metres (inter-connecting cables only)
voltage grade', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 959),
('E06', 'Instrument Termination and Hook up Details', 'Instrument cable termination details shall show junction box gland plate drilling sizes to suit external cabling to/from the package, and all glanding information.  All cable indicated on these drawings must be terminated at both ends.  Process hook-up drawings shall be prepared for each tagged instrument that requires a process impulse line for sensing purposes.  Similarly, a pneumatic hook-up drawing shall be prepared for each tagged instrument air transmission/control signal.  Both types of drawings shall include all the necessary mounting details and a schedule of all installation materials used.', 'Tier 2', 'RLMU', 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 960),
('E07', 'Loop Diagrams', 'These drawings are prepared, to consolidate all mechanical process, electrical and configuration information, and present it in loop form to illustrate its complete function.  For most mechanical packages, these drawings will only be required for complex control loops where the configuration is not apparent from the hook-up drawing.
For each loop, the diagrams shall show all details of wiring, termination and inter-connections from primary element to final, including numbering of JB''s, cables, cable cores, terminal colour coding of wires and locations and ferruling details, etc.  Each loop on a separate sheet.', 'Tier 2', 'RLMU', 'ZV', 'Vendor Documentation', 'ASB, AFC, AFU, AFD', true, 961),
('E08', 'Instrument Index', 'The following minimum information must be presented in a format advised by the Purchaser:
Tag number (in alpha-numeric sequence).
Purchasers Works Identification Number (WI Number).
Instrument description (pressure switch, control valve, level gauge, etc.).
Service description (e.g. pump P3102 discharge, etc.)
Location of line (size/number/spec)
P&ID number.
Data sheet number.
Hook-up drawing reference.', 'Tier 2', NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 962),
('E09', 'Instrument Data Sheets', 'Each and every instrument shall have a data sheet completed to the project format provided by the Purchaser for the Supplier to complete.', 'Tier 2', 'RLMU', 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 963),
('E10', 'Instrument Layout Drawings', 'Layout drawings will show the location and elevation of all instruments, control valves, control panels etc, and Purchaser free issued equipment where applicable.  In addition, the drawing will show the routing of all instrument air distribution, pneumatic tubing, signal/power supply cables, and the location of all instrument junction boxes.  Layout drawings will also be required to show fire detection instrumentation.', NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 964),
('E11', 'Earthing/Lighting Drawing', 'Describe instrument, junction boxes and control panels earthing principles.

Show arrangement & routing of earthing/lightning networks together with typical installation details

Cover: 

a) Arrangement of lighting fixtures (including cable routing) together with their designation, typical installation details and supplying lighting circuit.

b) Lighting circuit booklets showing distribution of lighting fixtures towards lighting circuits.', NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 965),
('E12', 'Wiring Diagrams', 'a) Define the detailed connection arrangement of a Junction Box, a Terminal block.

In a cabinet…For Example one junction box shall be represented on one sheet with all incoming single cables from Instruments terminated in terminals 1 to 20 including spares, drain wires, armour earth connection, and the multicore cable connected on the other side of the terminals showing the same details.

b) Show in a condensed format all most representative power, control & measurement circuitry and components (including tagging & cross-section of inter-panel cables, tagging of exchanged I/O) giving comprehensive & functional overview of a given equipment.', 'Tier 2', 'RLMU', 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 966),
('E13', 'Location Drawing', 'General arrangement drawing showing the relative position of these items on the package

If applicable, this drawing will show the routing of all instrument air distribution, pneumatic tubing, signal and power supply cables, and the location of all instrument junction boxes and fire detection instrumentation.

On small packages these information can be shown on B01.', NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 967),
('E14', 'System Card I/O Assignment', 'This document showing on a card-by-card basis the Inputs/Outputs connected to the card terminals.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 968),
('E16', 'Cable Definitions', 'This document shall contain detail specification of cables that are non standard and specific to the signals that are required.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 969),
('E17', 'SIL Data/Certs', 'SIL certificates and when applicable, SIL calculation sheets. Contain all reliability data and certificates for safety loops.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 970),
('E18', 'Layout and Typical Detail Drawings – Cathodic Protection', 'This document shall show location of each cathodic protection equipment (including cable routings) together with its designation and typical installation details.', 'Tier 2', 'RLMU', 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 971),
('E19', 'Termination Details', 'This document shall show details of equipment terminal box and terminations including dimensions and number & type of cable entries.', 'Tier 2', 'RLMU', 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 972),
('E20', 'I/O List and I/O Card Assignation List', 'This document shall list all I/O per type of I/O and shall show on a card by card basis the Inputs/Outputs connected to the card terminals.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 973),
('E21', 'System Data Table', 'This document shall consist in an exhaustive listing of the electrical material for a given equipment.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 974),
('E22', 'List of System Hardware Component', 'This document shall be dedicated specifically to serial link I/O and shall identify their corresponding addressing & mapping.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 975),
('E23', 'Layout and Typical Detail Drawings – Electrical Tracing', 'This document shall show location of each piece of electrical tracing equipment (including cable routings) together with its designation and typical installation details.', 'Tier 2', 'RLMU', 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 976),
('E24', 'Front View and Typical Section Drawings', 'This document shall show front view and most representative typical section of outline equipment (including main materials) with corresponding tags and dimensions.', NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 977),
('E25', 'List of Junction Boxes, Cabinets and Panels', 'This document shall clearly identify the various types of Junction Boxes, Cabinets and Panels (Type of signals, Analog, digitals, RTDs, thermocouples, Intrinsic Safety, ESD, DCS, etc.)', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 978),
('E99', 'Special', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 979),
('F01', 'Pressure Vessel / Tank Mechanical Calcs.', 'Stress calculations shall be in accordance with relevant code requirements and demonstrate that design (inc. nozzles) is adequate for operation within the parameters specified for the item, in terms of pressure, temperature, nozzle loadings, etc.
Also to include calculations for lifting lugs, brackets, support brackets, support skirts, support legs and saddles, platform and pipe clip loadings.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 980),
('F02', 'Process / Utility Calculations', 'Calculations demonstrating the sizing basis and criteria of equipment e.g. deaerator sizing, fired heater sizing, etc and the associated utilities eg. fuel, coolant, instrument air, etc.
Detailed calculations to justify the figures given in Data Code D01 for all operating conditions defined by Purchaser.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 981),
('F03', 'Structural Steel Calculations', 'Calculations shall determine that structure and any lifting aids are suitable for all phases of lifting, transportation, installation and operation without over stressing any member.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 982),
('F04', 'Foundation Support Calculations', 'Calculations of foundation support loads and base plate deflections under normal, fault, transportation and installation conditions taking into account static and dynamic loads, and as defined in Purchaser''s procedures.
Effect of base plate definitions on shaft alignment.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 983),
('F05', 'System Head Loss Calculations', 'Calculations to indicate basis on which equipment is sized, including pipe friction losses, equipment elevations and terminal point static pressures.  Calculations shall also include acceleration head loss for reciprocating pumps.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 984),
('F06', 'Lateral Critical Speed Calculations', 'Calculations shall determine the natural frequency of the shaft assembly and identify forcing frequencies and harmonic components thereof, relative to operating speed range.  Results shall be presented in graphical and narrative form, and shall include:
Rotor drawings showing each shaft segment clearly numbered.
Table of masses and stiffness values for each segment.
Plot of critical speed against support stiffness with stiffness both in the vertical plane and horizontal plane to be shown for each support point.
Plot of speed against vibration amplitudes (Campbell diagrams) to demonstrate the procedures of operating modes from harmonic regions.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 985),
('F07', 'Torsional Critical Speed Calculations', 'Calculations shall determine the torsional critical speeds for driver/transmission/driven equipment trains.  Calculation shall clearly indicate number and details of finite elements that the system has been divided into for the calculation and a table of stiffness and inertias for each element shall be included.  Results shall be presented in graphical and narrative form.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 986),
('F08', 'Bearing Life Calculations', 'Calculations for Rolling Element bearings shall determine anticipated B10 life with bearing identification in accordance with ANSI B3.15 or B3.16 for radial, axial or combined loading, considering methods of lubrication, dimensions, and load variation determined from performance envelope', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 987),
('F09', 'Thrust Bearing Sizing Calculations', 'Calculations and curves taking into account static and dynamic forces over the full range of operating conditions including:
Aerodynamic or hydrodynamic thrust load and balance piston compensating load to be shown.
Variation in balance piston compensating load with increased leakage rate to be shown.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 988),
('F10', 'Heat Emission Calculations', 'Calculations shall determine heat emitted to atmosphere including radiation and convection for various loadings, versus the extremes of environmental temperatures specified by Purchaser.  Discharge temperatures of exhaust gases from both equipment and exhaust stack/pipe to be substantiated.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 989),
('F11', 'Reliability and Availability', 'Supplier to provide analogue/mechanical response studies.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 990),
('F12', 'Hydraulic Calculations', 'Calculations demonstrating pipe friction losses, nozzle sizes, and discharge rates for Halon 1301, CO2, sprinkler and deluge system.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 991),
('F13', 'Exchanger Thermal Rating Calculations', 'Calculations to demonstrate thermal ratings of heat exchangers.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 992),
('F14', 'Instrument Calculations', 'Calculations to be presented for the following items:
Hydraulic line sizing.
Orifice plates and restriction orifices (sizing).
Control Valves and Regulators (sizing and noise).
Bursting discs.
Safety Relief Valves (sizing).
Thermowells (natural and vortex shedding frequency).
Ball Valve operating torque and actuator torque.
For control valves this shall include:
CV figures for minimum, normal and maximum flow conditions.
% open figures for above.
Pressure drop for above.
Noise calculations.
Actuator sizing.
Inlet/Outlet body velocities.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 993),
('F15', 'Enclosure Ventilation System Calculations', 'Calculation of air flow requirements and power requirements to substantiate system design and sizing criteria.  Taking into account:
Air Mass Flows.
Inlet and exhaust pressure drops.
Temperature rise, heat loads and temperature gradients.
Filtration requirements.
Back pressure at worst wind conditions.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 994),
('F16', 'Exhaust Duct Calculations', 'Calculations to substantiate the design, and defining forces and moments acting on the support structure, including:
Thermal expansion 
Support location temperature gradients and heat transmitted to the structure
Static and dynamic loads including wind loads and snow and ice loads
Temperature and massflow profiles', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 995),
('F17', 'Coupling Selection Calculations', 'To show speed range, torque, power and lock-up axial stiffness, torsional stiffness, service factors, etc, to substantiate coupling selection.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 996),
('F18', 'Lube and Seal Oil System Sizing Calculations', 'Calculations to substantiate the oil system design in accordance with project requirements, including:
Oil flow rates
Reservoir and overhead tank sizing including retention capacities
Component sizing for coolers, pumps, filters, control valves, etc
Line sizing', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 997),
('F19', 'Anti Surge Valve Sizing', 'System calculations to substantiate valve sizing selection and noise data.  Information to be provided per Data Code G14 above.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 998),
('F20', 'Pulsation Damper Design Calculations', 'Sizing calculations.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 999),
('F21', 'Rotor/Shaft System Imbalance Response Analysis', 'Demonstration of the sensitivity of the rotor/shaft design to imbalance at various locations by plotting amplitude against shaft speed for both vertical and horizontal vibration.
Plot of shaft vibration mode shape, showing displacement against axial length and bearing locations with the rotor excited at its critical speeds.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1000),
('F22', 'Piping Stress Analysis', 'Piping stress isometric drawing showing the extent of calculations.
Calculations of piping stress of lines defined as critical by Purchaser.
Wall thickness calculations.
Branch reinforcement calculations.
Piping Stress calculations.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1001),
('F23', 'Crane Failure Mode Analysis', 'Graphical representation of failure mode with respect to lifting radius or all major load bearing components, including:
slewing rings
luffing ropes, rams
hoist ropes
mast
jib', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1002),
('F24', 'ESD Valve', 'Flow capacity calculations, break out, running and reseating torque figures for valve versus actuator torque figures at minimum supply pressure.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1003),
('F25', 'Relief Valve and Burst Disc Calculations', 'Office size calculation to API 520 for all relief valves including maximum relieving temperature.
Burst disc calculations to manufacturer''s formula.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1004),
('F26', 'Electrical Protection Curves', 'Curve to indicate fuse I2t characteristics and current fusing points versus time.  Operating characteristic curves and setting ranges of protective relays discrimination curves and calculations to illustrate the correct selection and discrimination of fuses, relays, MCB, etc.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1005),
('F27', 'Current, Potential and Power Transformer Curves', 'Performance and design data and saturation curves.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1006),
('F28', 'Motor Performance Curves', 'Curves to indicate torque and current against speed for 80% and 100% voltage conditions and at 80% frequency.  Driven equipment torque shall also be plotted to confirm that there is adequate net torque for acceleration.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1007),
('F29', 'Combustion Gas Turbine Performance Curves', 'Curves for turbines for specified site conditions of atmospheric temperature and pressure plus, where appropriate, inlet and exhaust pressure loss, shall indicate firing temperature exhaust temperature combustion air flow, exhaust gas mass flow, constant heat rate lines and efficiency against power developed for output shaft speeds between 70 and 105% rates speed.  Correction curves shall be provided for variations of inlet and exhaust pressure drops.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1008),
('F30', 'Centrifugal Pump Performance Curves', 'Curves to indicate differential head developed, efficiency, and absorption power, versus flow with any velocity corrections for rated impeller.  Units driven by variable speed drivers shall indicate four performance curves to indicate performance from minimum to maximum operating speeds.  Curves shall indicate performance from zero to 120% rated flow, with minimum continuous flow clearly indicated.  For fire pumps a shop test curve identified by pump serial number is required showing head to rated and 150% capacities.  NPSHR shall be plotted for the full range of flow and for each speed line as appropriate.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1009),
('F31', 'Rotary Pump Curves', 'Curves shall indicate discharge pressure, NPSHR and absorbed power, versus inlet flow including velocity corrections.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1010),
('F32', 'Centrifugal Compressor Performance Curves', 'Curves to indicate the discharge pressure, coupling shaft power, polytropic head and efficiency versus inlet capacity for specified inlet pressure temperature and molecular weight for each section (casing) and overall unit.  Curves shall indicate performance from surge through 115% rated capacity.  Units driven by variable speed drivers shall be provided with curves for the full range of speed operation.  Curves of Mu versus Q/N and quadrant curves will also be provided.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1011),
('F33', 'Fan Performance Curves', 'Curves shall indicate pressure rise, efficiency and power absorbed, versus inlet flow for specified inlet pressure, temperature and molecular weight.  Curves shall also indicate performance from surge to 115% rated capacity.  Fans with variable pitch screws shall indicate performance for five settings between maximum and minimum.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1012),
('F34', 'Engine Performance Curves', 'Curves to indicate power developed at output shaft, fuel and air mass flow over the operating range and ambient temperatures, with specified inlet and exhaust pressure loss and varying speeds.  Correction curves for variations in inlet and exhaust pressure drops shall be provided.', 'Tier 2', NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1013),
('F35', 'General Performance Curves', 'This heading to cover any Performance Data required, but not covered by previous Data Codes.', 'Tier 2', NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1014),
('F36', 'Speed / Torque Starting Curves', 'Curves shall indicate torque speed characteristics of both driver and driven equipment from zero to rated speed, and a statement as to the process condition prevailing at the driven equipment for the curve shown.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1015),
('F37', 'Reciprocating Pump Performance Curves', 'Differential, pressure, shaft input power efficiency and NPSHR over the range for variable stroke pumps of operation with stroke length.', 'Tier 2', NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1016),
('F38', 'Lighting Performance Data', 'Polar diagrams
General performance data for specified luminaire types.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1017),
('F39', 'Battery Charge / Discharge Curves', 'Curves of voltage versus time
Curves of voltage versus ambient temperature.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1018),
('F40', 'Power System Analysis Data', 'Generator reactance''s, resistance and time constants - calculated and tested.
Transformer impedance - calculated and tested.
Large motor reactance''s, resistance and time contents - typical.
Other data as required by Purchaser''s specification.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1019),
('F41', 'Reliability and Availability Data & Calcs.', 'Known reliability of equipment on a package basis, ideally expressed as MTBF (Mean Time Between Failures) or otherwise presented as required by the Purchaser''s Procedures or Data Sheets.
Known reliability of key constituent components the basis of this data to be clearly defined.
Estimate repair time (assuming immediate availability of spares).  Fully detailed calculations to demonstrate that the equipment shall meet Purchaser''s required availability as included in Purchaser''s specification.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1020),
('F42', 'Calculation Notes', 'Liquid Seal Pressure Drop Calculations Note.
This calculation note shall contain all data used for the calculation of pressure drop: geometry, fluid characteristics, operating conditions.

Casing Temperature Calculation Note.
This calculation note shall contain all data: geometry, operating conditions, and stress values relative to the construction code.

Pressure Part Calculation Note.
This calculation note shall contain all data: geometry, operating conditions, and stress values relative to the construction code.

Thickness Calculation Note.
This calculation note shall contain all geometrical information, operating conditions, and relevant construction code.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1021),
('F43', 'Power Consumption Calculations', 'Power Consumption Calculations', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1022),
('F47', 'Electrical Relay Characteristics', 'General data on electrical protection relays, including relay current vs. time operating characteristics for each separate device forming part of the supplied equipment.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1023),
('F48', 'CT & VT Transformer Characteristic Curves', 'Typical current and voltage operating/hysteresis curves for each separate design/rating/ratio of transformer forming part of the supplied equipment.  Curves developed from tests on contract items shall be provided as part of item L16 if appropriate.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1024),
('F49', 'Fuse & Circuit Characteristic Curves', 'General data including electrical protection element trip clearance time operating characteristics for each separate device forming part of the supplied equipment.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1025),
('F51', 'Fiscal Metering System Calculations', 'Calculations required for design purposes include gas systems: - uncertainty calcs. orifice plate calcs., total pressure drop calcs, thermowell vibration calcs, stress analysis.
Liquid System: - Prover sizing, total pressure drop, FCV/RV sizing, thermowell vibration calcs, stress analysis.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1026),
('F52', 'Non-actuated Valve Torque Calculations', 'Torque calculations - effort required to turn stem under full differential pressure conditions.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1027),
('F60', 'Thermal Growth Calculations', 'An analysis must be made to investigate the potential thermal growth between the mud line system casing hangers hang off point and the fixed wellhead adapter braced and locked to the 30" casing.  The information to be used with F61 and F62 to predict the requirements of tensioning the tied back casing.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1028),
('F61', 'Fatigue Calculations (Well Conversion)', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1029),
('F62', 'Fatigue Calculations (Riser System)', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1030),
('F63', 'Valve Sizing Calculations', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1031),
('F64', 'Wake Frequency Calculation', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1032),
('F65', 'Calculations for Communication Network', 'These documents shall generally be supplied by the system VENDORS. They shall be issued in as built status and shall include system screen views showing load ratio and idle time.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1033),
('F66', 'Calculations for Intrinsically Safe Loops', 'The VENDOR shall provide these calculations when he supplies field instruments and technical room equipment.

(The multipair cables characteristics shall be given to the VENDOR by the CONTRACTOR)

When the VENDOR only supplies field instruments up to local JB’s he shall provide all information (RLC) for each element he supplies, such as:

a) Relays / Barriers model / manufacturer and corresponding Eex-I certificate,
b) Cable length,
c) DC lineic resistant of conductor at 20°C Ω/km,
d) Cable characteristics
e) Self inductance mH/km
f) Capacitance between conductors nF/km', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1034),
('F75', 'ATEX Calculations', 'This report shall include at least:

a) Ignition Hazard assessment report
b) Description of the equipment
c) Design and Manufacturing drawings (All descriptions and explanations necessary for understanding the drawings).
d) Material certificates (If necessary).
e) Other information as required in EN13463-1', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1035),
('F99', 'Special', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1036),
('G01', 'Erection and Installation Procedure', 'lifting points
lifting weights
shipping break points for panels and switchboard assemblies
erection match markings
fixing points
levelling procedures
alignment procedures
erection fasteners summary list
details of any special unpacking/handling requirements shall be stated.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1037),
('G02', 'Unpacking and Preservation Procedure', 'Detail preservation procedure detailing inspection periods, materials required, for both onshore and offshore requirements and materials needing disposal.  Any special unpacking/handling requirements shall be stated.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1038),
('G03', 'Handling and Shipping Procedure', 'Supplier to propose techniques.  Indicate size of container, number off weight, identification and contents.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1039),
('G04', 'Weight Control / Weighing Procedure', 'To detail method recording weights during design and manufacture and method of weighing equipment prior to shipment.  The weighing procedure shall include:
A description of the weight measuring and recording devices giving capacity and accuracy.  Accuracy to be within +1%.
Description of calibration methods.  The Supplier shall provide a current valid calibration certificate (calibrated within the last six months) for each of the measuring/recording devices to be used for the weighing.
Methods to be used for weighing and measuring/calculating centre of gravity including temporary lifting/supporting equipment used.
Weight recording data sheets to document weighing, e.g. measuring equipment serial number, all measured data.
Verifying actual weight against estimated weight.
The Supplier shall, within ten (10) days of the weighing, submit the original of the records and related data together with a Weight and Centre of Gravity.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1040),
('G05', 'List of Operations to be Implemented  on Site', 'Description of erection works to be executed on site with reference to engineering drawings, Special activities/procedures, if any (welding / PWHT/…).

Procedure for site assembly, levelling and welding.

Details of site assembly and field welds.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1041),
('G06', 'List of Consumables for Erection, Commissioning and Start Up', 'List of consumables supplied for site welds.

List of consumables supplied for execution of PQR and welder’s qualifications. 

List of raw materials (e.g. pipes, plates) supplied for execution at site of PQR and welder’s qualifications.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1042),
('G10', 'Dimensional Control Procedure', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1043),
('H01', 'Quality Manual', 'Where the Supplier has a quality system approved in accordance with ISO 9000: 2000, only a copy of the approval certificate and the index of the Quality Manual is to be submitted to the Purchaser unless specifically requested.  Purchaser reserves the right to request a copy of the complete Quality Manual at any time during the life of the purchase order.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1044),
('H02', 'Inspection and Test Plan / Quality Plan', 'The Inspection and Test Plan shall be job specific and shall clearly identify all Quality Control activities performed by the Supplier including all hold and witness points for Purchaser to comment and indicate those activities to be witnessed by Purchaser; third party inspectorate and CA as appropriate.

A copy of the Manufacturer''s accepted quality control plan to be incorporated.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1045),
('H03', 'Detailed Fabrication Drawing', 'For all vessels, tanks and other fabricated items, the following information shall be shown and a detail drawing to scale:
all dimensions with tolerances
plate layouts
weld joint design
weld procedure references for each and every weld
nozzle locations and orientations.
Internal details
When applicable, weld location plans shall be verified by the Purchaser and/or third party inspection authority.
Code of Construction
Post weld heat treatment requirements
Hydrostatic/pneumatic test conditions
Internal coating/painting/insulation requirements of applicable weight equipment.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1046),
('H04', 'Weld Procedure (WPS) and Qualification (WPQ) Records', 'Define all shop, field and repair welding procedures in accordance with Purchaser''s requirements.  The Welding Procedure (WPS) shall be cross-referenced to the applicable weld location plan (Data Code J01) and Weld Procedure Qualification (WPQ).  All WPS documents shall be issued in a single submission, together with the WPQ and a listing register to show status of approval.  Qualification records describe parameters used in qualification of WPS''s together with mechanical testing and results in accordance with Purchaser''s requirements.  WPQ test records are to be cross-referenced to the WPS''s and when applicable stamped by the third party inspection authority.  Fabrication shall not commence before Purchaser has approved the appropriate weld procedure unless notified otherwise in writing.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1047),
('H05', 'Non-destructive Examination Procedure (NDE)', 'Define method, extent and acceptance levels of all NDE used to verify that materials and/or formed or welded fabrications comply with Purchaser''s requirements.  To include as applicable visual, radiographic, ultrasonic, magnetic particle, dye penetrant, hardness tests and other techniques.
When applicable, procedures shall comply with the requirements of the third party inspection authority.  Procedures shall also be cross-referenced to the weld location plan (SDRL Code).', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1048),
('H06', 'Forming & Heat Treatment Procedure (including PWHT)', 'Detailed procedures for compliance with Purchaser''s procedure including heating soak cooling parameters, limits of strain during forming, temperature ranges, method of attachment of thermocouples, and temperature control procedures, equipment calibration statement of production tests where appropriate.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1049),
('H07', 'Hydrostat/Flushing/Pneumatic Test Procedure', 'Detailed procedures for compliance with Purchaser''s procedures including duration of test, quality of test medium, confirmation of no leakage.  Methods of flushing pipework systems at works and site (e.g, lube, seal and hydraulic oil systems) including acceptance criteria.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1050),
('H08', 'Performance Testing & Factory Acceptance Test Proc.', 'Supplier''s procedures detailing all tests, which will be carried out to demonstrate that the equipment fulfils the Purchaser''s requirements and meets process guarantees.  A procedure is required to cover all factory acceptance test reports (ref SDRL code K05)', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1051),
('H09', 'Surface Preparation & Painting Procedure', 'This shall be supplied for equipment, especially where exception to Purchaser procedure has been agreed (in writing), and shall include:
surface cleaning
preparation
shop or field painting
linings (where applicable)
repairs to damaged finishes.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1052),
('H10', 'Software Quality System', 'Supplier''s procedures and National/International standards detailing routines and tests, which will be used to fulfill Purchaser''s requirements and specifications.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1053),
('H11', 'Corrosion Testing Procedure', 'Detailed procedures for compliance with Purchaser''s specification including control and calibration of electrochemical parameters, temperature preparation, method of data analysis, metallographic evaluation, acceptance criteria.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1054),
('H13', 'ISO 9001 Certification', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1055),
('H21', 'Test Run Procedures', 'This document shall describe the procedure to be applied to perform the test run in the field.

As a minimum, the following indications shall be given:

a) Sequence of operation for preparation to test run,
b) Conditions relevant to up-stream and downstream systems to start the test run,
c) Minimum warning-up time,
d) Duration of continuous and stable operation of the unit before starting the test run.
e) Parameters to keep under control with relevant figures and tolerances,
f) Duration of test run,
g) Type of analysis to be carried out on incoming product with criteria of acceptability and frequency of check/sampling.
h) Indication of points for checking/sampling of incoming products,
i) Figures subject to performance guarantees,
j) Frequency of measurements.
k) System for measurements (on line instruments/special instruments/laboratory tests/laboratory testing equipment/laboratory testing procedure or codes.
l) Requested accuracy of instruments,
m) Reference parameters and acceptability tolerances.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1056),
('H99', 'Special', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1057),
('J01', 'Operating and Maintenance Manual', 'Manual shall include description of equipment, operating procedures for start-up, steady state, shutdown, emergency and fault conditions, operating parameters, function of protective devices and controls, maintenance data copies of all relevant cause and effect charts and block diagrams, and fault finding guidelines.', 'Tier 2', NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1058),
('J02', 'Lube Oil/Lubrication and Operating Fluids Schedule', 'Schedule to indicate type and grade of lubricants and other consumables required for all equipment supplied in format issued by Purchaser.  For each entry, first fill capacities, rate of consumption plus frequency of change shall be indicated.', 'Tier 2', NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1059),
('J03', 'Recommended Start-up and Commissioning Spares List', 'List shall indicate spare parts and special maintenance/handling tools recommended by Supplier, and be defined by reference to cross-sectional drawings and relevant parts list.  These shall include wearing parts such as bushes, seals, and gaskets, which need replacement after start-up, test and shutdown prior to production start.  Against each entry, price and delivery shall be indicated.', 'Tier 2', NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1060),
('J04', 'Recommended Spares For 2 Years Operation', 'List shall indicate spare parts recommended by Supplier, and be defined by reference to cross-sectional drawings and relevant parts list.  Each item shall be referenced by its original manufacturers name and part number.  Against each entry, number of parts in operation, price and delivery shall be indicated.  Format shall be as supplied by Purchaser.', 'Tier 2', NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1061),
('J05', 'Erection Fasteners Schedule', 'Schedule to indicate number off, type, size and material of all fixing bolts/fastener required.  Where temporary bolts are required to withstand transportation forces, these shall also be indicated with suitable note of explanation.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1062),
('J06', 'Pre-commissioning / Commissioning Proc.', 'Procedure shall include list of spare parts, special tools and utilities required, pre-commissioning checks to be performed, sequenced procedure for start-up, and fault finding guidelines.  Copies of all relevant drawings shall also be included.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1063),
('J07', 'Special Tools List', 'List shall indicate those tools necessary for removing equipment from transport at site, plus those necessary for installation and maintenance equipment.  Against each entry, a brief description shall be given and where necessary for clarity, a drawing shall be provided.', 'Tier 2', NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1064),
('J08', 'Spare Parts Information ESPIR', 'COMPANY’s E-SPIR shall be completed by Vendor showing commonality & interchange ability of spare parts.

E-SPIR shall indicate commissioning, operating  & insurance spare parts recommended by Vendor and shall be defined by reference to cross sectional drawings and relevant parts list.  Against each entry, price and delivery shall be indicated.', 'Tier 2', NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1065),
('J09', 'TAG and Equipment Register', 'To populate various tools i.e. SAP etc, COMPANY requires the information as listed below for each of the tag:

a) Tag number
b) Equipment number
c) Tag description
d) Equipment class
e) Parent tag
f)   Asset model name
g) Number of equipment linked
h) Site
i) Plant
j) Unit
k) Manufacturers name (Not applicable to bulk items)
l) Manufacturers model number (Not applicable to bulk items)
m) Manufacturers serial number (MESC for bulk items)
n) Weight of equipment (Not applicable to bulk items)
o) Unit of weight in kilogrammes (Not applicable to bulk items)
p) Purchase order reference number (Not applicable to bulk items)
q)  Vendor name (Not applicable to bulk items)
r) Country of manufacturing (Not applicable to bulk items)', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1066),
('J12', 'Document to Asset Relations', 'As per Section 5.5  –  Specification for the Control and Submission of Vendor Data Specification for Equipment Vendor Data and Documentation requirements - A CSV (Excel also acceptable) File  detailing the relationship between submitted documentation and related equipment being supplied. With columns formatted as follows and submitted under the code J12:

a) Document number
b) Document revision number
c)Plant
d)Unit
e) Tag number
f) Equipment ID
g) Manufacturers model number
h) Manufacturers name', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1067),
('J13', 'Preparation of Equipment for Commissioning', 'Requirements for site tests, checks, examinations, inspections, and pre-commissioning operations

Pre-commissioning operations shall state in a non-ambiguous way:

a) Equipment cleaning and flushing,
b) Piping cleaning and flushing,
c) Pressure testing,
d) Leak testing,
e) Water circulation,
f) Chemical cleaning (where and procedure),
g) Requirements for sentinel hole drilling if any,
h) Steam blowing (where and procedure),
i) Air blow (where and procedure),
j) Safety valve setting,
k) Oil flushing for machinery,
l) Procedures for preparation of equipment for commissioning (including calibration of instruments),
m) Electrical and instrument equipment test,
n) Cold running test for compressors,
o) Cold running test for machinery,
p) All such other typical items that Vendor considers necessary for pre-commissioning,
q) Quality Control Forms', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1068),
('J16', 'Operation Instruction', NULL, 'Tier 2', NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1069),
('J17', 'Safety Document', 'Required for handling of hazardous material during start-up and operation.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1070),
('J18', 'Trouble Shooting Check List and Diagrams', 'Issued only In case of very complex applications to guide operation / Maintenance in problem analysis.', 'Tier 2', NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1071),
('J20', 'System Description, Installation, Operation & Maintenance', 'In addition to description of system, it’s installation, operation and maintenance, this narrative shall also describe all the main possible system fault modes i.e. Power failure, Line breakage, Communication failure, etc.', 'Tier 2', NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1072),
('J21', 'Decommissioning/Abandonment Procedure', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1073),
('J25', 'HFE Check List', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1074),
('J99', 'Special', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1075),
('K01', 'Certification Manufacturing Data Book', 'Comprehensive indexed volume of purchase order, design documentation, and manufacturing records.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1076),
('K02', 'Equip. Haz. Area Certificate and Schedule', 'Certificate issued by a recognised independents authority indicating that a type test has satisfied the specified standards, e.g., BASEEFA, INTRINSIC SAFETY, FIRESAFE.  Certification not in the English language shall be supplied with a verified translation.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1077),
('K03', 'Weldability Data', 'Information on the weldability of materials including process and heat inputs, material thickness, pre-heat, PWHT, chemical analysis of test materials, mechanical test results.  NB This is not a replacement for code H04 which is specific to the equipment and materials being fabricated.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1078),
('K04', 'Performance Test Results', 'Report shall include the following:
Description of how test was conducted, including all pertinent items of Data Code P01 below.
Method of calculating results.
Acceptance criteria.
Log of test readings, signed by Purchaser''s representative and third party inspection authority (when applicable).
Calculations of results, taking into account the accuracy of the results.
Problems encountered during the test, and corrective actions taken.', 'Tier 2', NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1079),
('K05', 'Factory Acceptance Test Report (FAT)', 'Report on performance/functional tests carried out in the factory to demonstrate the equipment suitability to fulfill the duty specified.  This report to include certificates as appropriate, tests for over speed, balancing, shaft mechanical and electrical run out, and vibration.  FAT reports on electrical and instrument control equipment shall include high voltage pressure tests and insulation resistance certificates', 'Tier 2', NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1080),
('K06', 'Vibration Report', 'Test report of vibration performance during factory acceptance testing, including mechanical and electrical run out for displacement measuring systems during mechanical and performance testing of machinery.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1081),
('K07', 'Noise Report', 'Report to compare actual noise sound pressure and sound power level output with predictions stated in noise level data sheets (SDRL Code C09).', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1082),
('K08', 'Weight Report', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1083),
('K09', 'Power & Safety of Machinery Risk Assessment', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1084),
('K10', 'Indices for Manuals J01 / K01', 'Each index shall contain sufficient information to facilitate ease of accessibility to all sections contained within the J01 / K01.  Each section shall be systematically compiled.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1085),
('K16', 'Sub-vendors Qualifications', 'ISO 9001 certificates and/or audit reports provided by Vendor to demonstrate that sub vendors are qualified to provide purchased equipment.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1086),
('K17', 'Classification certificate, Validation certificate', 'Certificate issued by Classification Society, Independent Validator or third party', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1087),
('K18', 'Extended Factory Acceptance Test Report (EFAT)', 'Report on performance/functional tests carried out in the factory to demonstrate the equipment suitability to fulfill the duty specified.  This report to include certificates as appropriate, tests for over speed, balancing, shaft mechanical and electrical run out, and vibration.  EFAT reports on electrical and instrument control equipment shall include high voltage pressure tests and insulation resistance certificates.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1088),
('K19', 'Site Acceptance Test Report (SAT)', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1089),
('K80', 'GOST-R - Certificate of Conformity', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1090),
('K81', 'GOST-R - Certificate of Conformity on Explosion Proof (Ex)', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1091),
('K82', 'Sanitary - Epidemiological Conclusion Certificate (Hygienic Certificate)', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1092),
('K83', 'Fire Safety Certification - (Fire Certificate)', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1093),
('K84', 'GOST-R - Pattern Approval Certificate (Metrological Certificate)', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1094),
('K85', 'Telecommunication Equipment Certificate', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1095),
('K99', 'Special', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1096),
('L01', 'Material Test Certificate', 'Certificates in compliance with E.N. 10204 3.1.C. 3.1.B. or otherwise as required by PO Documentation shall include as a minimum chemical analysis, procedure range analysis, mechanical test results, heat treated condition for the product supplied to the Purchaser.  Unless otherwise requested in Design Specification and Quality Requirements Specification included in the Purchase documentation.  Certificates must be fully traceable to each component by means of a unique numbering system, together with supplementary material placement drawings when necessary.  Certificates and material placement drawings (when required) shall be verified by inspection authority.  Each certificate shall state that it is to E.N. 10204 3.1.C. 3.1.B.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1097),
('L02', 'Welder Performance Qualification Certs.', 'Welders name, identification and positions to be recorded to code requirements with approval by third party inspection authority when applicable, using approved weld procedure.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1098),
('L03', 'NDE Operator Qualifications', 'Copies of Qualification Certificates for the technicians/operators signing certificates within Data Code L09.  Certificates to state Purchaser''s purchase order number.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1099),
('L04', 'Production Test Results (including Welding)', 'Results of tensile, ductility hardness and impact tests carried out on production tests.
Includes production weld test results.
Certificates to state Purchaser''s purchase order number, tag number (of other unique identification) to permit traceability of tested equipment, item or piping system.  Supplementary marked-up piping isometrics shall be included when necessary to define extent of testing, those being verified by the Purchaser, when required.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1100),
('L05', 'NDE Records', 'A) Radiography
Results of radiography tests carried out and signed by a qualified technician.  Detailed reports are to state Purchaser''s order number, and to include the procedure used, acceptance level and results obtained in accordance with Purchaser''s specified standard.  Reference shall be made to applicable operator qualification certificates, and approvals by third party inspection authority shall be gained when necessary.
B) Ultrasonic Examination
Certificate confirming that acceptable results have been obtained on examinations carried out to the specified standard and stating the equipment used, calibration standard and procedure adopted.  A qualified operator shall sign the certificate.  Reference shall be made to applicable NDT operation qualification certificates, and approvals by third party inspection authority shall be gained when necessary.
C) Crack Detection, covering Magnetic Particle Inspection (MPI) and details as in (B) above.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1101),
('L06', 'Heat Treatment Records', 'Pyrometric charts or certificates confirming the heat treatment cycles have been conducted to Purchaser''s requirements.
Certificates to state Purchaser''s purchase order number, item number, and identification to permit traceability to the heat-treated component or materials.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1102),
('L07', 'Material Traceability Records', 'Location plans/records with an identification system cross-referring to the individual material certificates.
When applicable, material placement drawings shall be verified by the Purchaser and/or third party inspection authority.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1103),
('L08', 'Name Plate Rubbing', 'Rubbing or facsimile of nameplate and/or stamping.
Required for pressure vessels, heat exchangers, and atmospheric tanks.  Submission must be legible, and state Purchaser''s purchase order number and equipment tag number.  (This information shall also be on the nameplate).', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1104),
('L09', 'Pressure Test Certificate', 'Certificate of hydrostatic and/or pneumatic tests carried out.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1105),
('L10', 'Instrument Test / Calibration Certificate', 'Calibration certificate for measuring with calibration standard compared with stated.
Test/calibration certificates required for all items of instrumentation.  Each certificate to state Purchaser''s purchase order number, and Purchaser''s tag number.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1106),
('L11', 'Dimensional Report', 'Report to verify all critical dimensions, including Purchaser inter-connection points are in accordance with Supplier''s approved drawings.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1107),
('L12', 'Proof Load Certification', 'Test certificates for all lifting equipment, i.e., hoists, cranes, wire ropes, shackles, hooks, pulleys and lifting beams.  Certification to be to Purchaser''s requirements and approved by third party inspection authority, when applicable.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1108),
('L13', 'Vessel & Exchanger Code Data Reports', 'Data reports for ASME U stamped vessels and heat exchangers, and form X for PD 5500 constructed items', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1109),
('L14', 'Certificate Of Compliance', 'Certificate issued by the manufacturer confirming that the product complies with the purchase order requirements and current EC legislation.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1110),
('L15', 'Electrical Equipment Type Tests', 'Test report to include temperature rise on full rated load, resistance of windings, no load losses, locked rotor current/torque momentary overload, high voltage tests, power factor and any tests to establish efficiency.  Alternator reports will include wave form and magnetisation curves.  Results of all Type Tests carried out in accordance with the relevant National/International Standards referenced in the approved Suppliers Technical Specification.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1111),
('L16', 'Routine Test Certificate - Electrical Equipment', 'Certificate of routine tests carried out, e.g., no load losses.  High voltage, insulation resistance etc, when type tests have been carried out.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1112),
('L17', 'High voltage Flash Test', 'Certificate as appropriate.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1113),
('L18', 'Insulation Resistance Check', 'Certificate as appropriate.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1114),
('L19', 'Measurement Of Resistance', 'Certificate as appropriate.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1115),
('L20', 'Purchaser''s Release Note / Waiver', 'Purchaser''s Release Notes/Waivers to state Purchaser''s purchase order number, item number, and other unique identification when necessary (e.g., cast numbers, serial numbers etc).', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1116),
('L21', 'Code / Standard / Compliance Certificate', 'Certificate issued by a recognised independent authority indicating the equipment has been manufactured in accordance with code/standard.  For fire test certification the certificates are to be complete and as issued by the testing authority.  Certificates are to state Purchaser''s purchase order number, item number and identification to permit traceability to the fire tested item or material.  Certificates not in the English language shall be supplied with a verified translation.  Type approval certificates are normally acceptable for proprietary items.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1117),
('L22', 'Painting / Insulation Inspection Report', 'Inspection Report issued by Inspecting Authority to confirm Paint/Insulation procedure and results.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1118),
('L23', 'Concession Records', 'The index of concessions to list those approved by Purchaser, those awaiting Purchaser approval, and those not accepted by Purchaser._x000D_
Supplier shall comply with Purchaser''s procedures for Concession Requests as included in the Purchase Order documentation.  The copy included in the Certification Data Book (SDRL Code K01) shall be complete with all attachments.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1119),
('L24', 'Fire Test Reports/ Certificates', '1) ESD Valves - tested in accordance with BS 6755 or equivalent._x000D_
2) Ball Valves - tested in accordance with BS 6755 or equivalent._x000D_
3) Hoses - tested in accordance with Lloyd''s rules_x000D_
4) Fire walls / fire doors tested as per PO requirements_x000D_
5) Other materials - tested as per PO requirements', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1120),
('L25', 'EC Declaration of Conformity', 'Supplier is required to comply with all applicable directives for their scope of supply, and issue a declaration (Declaration of Conformity) for the equipment.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1121),
('L26', 'Computer System Documentation', 'To include full documentation related to both hardware and software as required by the purchase order.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1122),
('L27', 'Special Material Certificate - Duplex Stainless Steel', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1123),
('L28', 'Site Survey Report', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1124),
('L29', 'NACE Certification', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1125),
('L30', 'Positive Material Identification (PMI)', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1126),
('L32', 'Hydrostatic Test Charts', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1127),
('L33', 'Performance Guarantee', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1128),
('L34', 'Statutory Authority Design Registration Letter', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1129),
('L35', 'Facsimile of Stamping from Statutory Authority', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1130),
('L36', 'Piping Dimensional Acceptance Certificate', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1131),
('L37', 'Valve Seat Sealing and Valve Pressure Test Records', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1132),
('L38', 'Earth Continuity Test Records', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1133),
('L39', 'Earthworks Compaction Test Records', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1134),
('L40', 'Concrete Test Records', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1135),
('L41', 'Dimensional Survey', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1136),
('L42', 'Photogrammetry 3D Survey and Modelling', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 1137),
('L43', 'Laser Scanned 3D Survey and Modelling', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'AFC, AFU, AFD', true, 1138),
('L44', 'Bolt Tensioning Records', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1139),
('L45', 'Site Acceptance Procedure', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1140),
('L46', 'FAT Test Procedures', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1141),
('L47', 'Progressive Inspection Reports', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1142),
('L48', 'Inspection Release Notes', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1143),
('L49', 'Package Release Notes', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1144),
('L50', 'Non Conformity Report', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1145),
('L51', 'PMI / Hardness / Ferrite Test Records', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1146),
('L52', 'Painting / Coating / TSA Reports', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1147),
('L99', 'Special', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1148),
('M01', 'Packing and Shipping Schedule', 'For equipment shipped in more that one piece, a schedule is to be submitted which identifies all the major components of the package for use as a Check List at the receiving point to ensure all items have been received.  Copy of document to accompany shipment.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1149),
('M02', 'Hazardous Material Shipping Certificates', 'In accordance with applicable regulations and requirements included in the Commercial Instructions to Suppliers.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1150),
('M03', 'Packing List', 'Preliminary packing list shall contain description of main delivery packages. List of equipment contained in each package shall be clearly established. 

Preliminary shipment information: weight, size, protection shall be established.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1151),
('M04', 'Transportation Protection', 'This specification shall contain all recommendations of vendor relative to transportation.', NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1152),
('X01', 'Technical Data', NULL, NULL, NULL, 'ZV', 'Vendor Documentation', 'IFI, AFU, AFP, AFT', true, 1153),
('1400', 'Handover Packages (Document and Data)', 'Register/Listing of Handover Package Contents', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1154),
('1780', 'Correspondence', 'Any form of written communication sent or received in the course of affairs including transmittals, letters, postcards, memoranda, electronic mail, facsimiles, telegrams or cables. Documents attached to Correspondence retain their own doc type classification (eg. Minutes of Meeting attached to a Transmittal).', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1155),
('1979', 'Database and Data set', 'Data stored in a proprietary (e.g. SPI Watcom) or neutral (e.g. CSV)  format from which multiple information contents can be generated by computer software (e.g. EDW).', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1156),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1157),
('3357', 'Presentation', 'General Presentation material delivered during the progress of the work covering a single topic or multiple topics.', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1158),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1159),
('3375', 'Work Instruction', 'Step by Step instruction for the accomplishment of a task. More detailed than a Procedure.', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1160),
('4372', 'Index of Documents', 'Books, as defined in the EIS Section 3.4 require this Index to be created. Since the purpose of the Index is management of a group of documents, this can only be associated with JA Information Management._x000D_
Examples:_x000D_
Health, Safety, Environment, Quality Communication Dossier_x000D_
Basic Design, Engineering Package_x000D_
Authority Approval Package_x000D_', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1161),
('5160', 'Forms & Templates', NULL, NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1162),
('5280', 'Other Multimedia', 'Multimedia not being Picture, Sound or Video', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1163),
('5680', 'Other Philosophy', NULL, NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1164),
('5762', 'Project Lifecycle Information Plan', 'Plan listing all information types (data and documents) to be created during a project, including details of timing, responsibility, format, criticality, project phase and handover.', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1165),
('5798', 'Project Plan', 'Reserved for project wide Discipline Management Plans such as Project QA Plan, Project HSES Plan, Project IM Plan, etc...', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1166),
('5880', 'Other Plan', NULL, NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1167),
('5980', 'Other Strategy', NULL, NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1168),
('6017', 'Document, Data Control Procedure', 'Procedures specifically for document and data control (IM). Includes Document Control charts and other procedure components.', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1169),
('6180', 'Other Procedure', 'e.g. Procedures documenting how to use an application (e.g. EDW) for a particular discipline.', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1170),
('6610', 'Document Distribution Matrix', 'An overview of distribution (workflow) process for documents. Often part of the DC procedure under Document/Data Control Procedure.', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1171),
('6611', 'Document, Data Register', 'Register (at Document, not Document Type level) of the documents and data delivered on the project, including:
 - Project and engineering document registers and lists. Including drawings and diagrams.
 - VDL Vendor Document List
 - VMDS Vendor Master Document Schedule, defined as a list list of all individual documents provided by Vendor to satisfy Principal''s requirements. The Vendor provides a VMDS indicating the proposed data to be submitted for the requisitioned items based on the VDT codes defined by this document.', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1172),
('6944', 'Progress Report', NULL, NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1173),
('7712', 'Document Type Requirement Specification', 'Specification of the Information types required by the owner for delivery and handover, including:_x000D_
 - VDDR''s: Vendor Document and Data Requirement overall list._x000D_
 - PO_VDDR''s: Vendor Document and Data Requirements for a particular Purchase Order.', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1174),
('7739', 'Project Specification', 'A technical description of the information on a Project necessary to prepare a +/-10% estimate, including references to:_x000D_
 - technical specifications required to prepare detailed design and engineering work_x000D_
 - procedures and requirements for the execution of the work and services for the realisation of a project_x000D_
Note: This doc type is not a BOOK as defined in the EIS. It is a document referencing other specifications, procedures, etc.', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1175),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1176),
('7880', 'Other Specification', NULL, NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1177),
('8380', 'Other Study', NULL, NULL, NULL, 'JA', 'Information Management', 'IFI, AFU, AFP, AFT', true, 1178),
('3304', 'Application software', 'A computer program designed for a specific task or use', NULL, NULL, 'KA', 'Information Technology', 'IFI, AFU, AFP, AFT', true, 1179),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'KA', 'Information Technology', 'IFI, AFU, AFP, AFT', true, 1180),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'KA', 'Information Technology', 'IFI, AFU, AFP, AFT', true, 1181),
('3375', 'Work Instruction', 'Self Explanatory', NULL, NULL, 'KA', 'Information Technology', 'IFI, AFU, AFP, AFT', true, 1182),
('4880', 'Other Manual', 'A document that describes methods of working to be used to accomplish an activity._x000D_
Synonym: Guide, Guideline._x000D_
Warning: Not to replace "Books", as defined in the EIS Section 3.4 which requires an Index to be created. See Index of Documents.', NULL, NULL, 'KA', 'Information Technology', 'IFI, AFU, AFP, AFT', true, 1183),
('5280', 'Multimedia', 'Multimedia being Picture, Sound or Video.  Includes laser scans, x-rays, sonograms, installation videos, photogrammetry, illustrations, fly-throughs, etc.', NULL, NULL, 'KA', 'Information Technology', 'IFI, AFU, AFP, AFT', true, 1184),
('5798', 'Project Plan', 'Reserved for project wide Discipline Management Plans such as Project QA Plan, Project HSES Plan, Project IM Plan, etc...', NULL, NULL, 'KA', 'Information Technology', 'IFI, AFU, AFP, AFT', true, 1185),
('5980', 'Other Strategy', NULL, NULL, NULL, 'KA', 'Information Technology', 'IFI, AFU, AFP, AFT', true, 1186),
('6180', 'Other Procedure', NULL, NULL, NULL, 'KA', 'Information Technology', 'IFI, AFU, AFP, AFT', true, 1187),
('7205', 'Technical Deviation Request', 'Request, approval or rejection of changes to a technical specification. Would typically include justification and reasons for the request, and acceptance or rejection from a purely technical perspective.

Synonym: Concession

For similar documents pertaining specifically to contract variations, refer to Variation Request 7206.', NULL, NULL, 'KA', 'Information Technology', 'IFI, AFU, AFP, AFT', true, 1188),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'KA', 'Information Technology', 'IFI, AFU, AFP, AFT', true, 1189),
('7739', 'Project Specification', 'A technical description of the information on a Project necessary to prepare a +/-10% estimate, including references to:_x000D_
 - technical specifications required to prepare detailed design and engineering work_x000D_
 - procedures and requirements for the execution of the work and services for the realisation of a project_x000D_
Note: This doc type is not a BOOK as defined in the EIS. It is a document referencing other specifications, procedures, etc.', NULL, NULL, 'KA', 'Information Technology', 'IFI, AFU, AFP, AFT', true, 1190),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'KA', 'Information Technology', 'IFI, AFU, AFP, AFT', true, 1191),
('7880', 'Other Specification', NULL, NULL, NULL, 'KA', 'Information Technology', 'IFI, AFU, AFP, AFT', true, 1192),
('8380', 'Other Study', NULL, NULL, NULL, 'KA', 'Information Technology', 'IFI, AFU, AFP, AFT', true, 1193),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'KA', 'Information Technology', 'IFI, AFU, AFP, AFT', true, 1194),
('1003', 'Corporate Authority For Expenditure', 'Investment Proposal to allocate funds to a project. Also see Budget Proposal for distribution of funds within a project.', NULL, NULL, 'ZF', 'Finance', 'IFI, AFU, AFP, AFT', true, 1195),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'ZF', 'Finance', 'IFI, AFU, AFP, AFT', true, 1196),
('3905', 'Invoice', 'Document which shows the customer charges for goods delivered or work done._x000D_', NULL, NULL, 'ZF', 'Finance', 'IFI, AFU, AFP, AFT', true, 1197),
('4880', 'Other Manual', 'A document that describes methods of working to be used to accomplish an activity._x000D_
Synonym: Guide, Guideline._x000D_
Warning: Not to replace "Books", as defined in the EIS Section 3.4 which requires an Index to be created. See Index of Documents.', NULL, NULL, 'ZF', 'Finance', 'IFI, AFU, AFP, AFT', true, 1198),
('5880', 'Other Plan', NULL, NULL, NULL, 'ZF', 'Finance', 'IFI, AFU, AFP, AFT', true, 1199),
('8980', 'Other Policy', 'An established course of action that must be followed. Usually Corporate, but may also be produced by a project to govern some aspect of the project.', NULL, NULL, 'ZF', 'Finance', 'IFI, AFU, AFP, AFT', true, 1200),
('1449', 'Welder Qualification Certificate', 'Welder''s name, identification and positions to be recorded to code requirements with approval by third party inspection authority, where applicable, using approved weld procedure.', NULL, NULL, 'ZH', 'Human Resources', 'IFI, AFU, AFP, AFT', true, 1201),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'ZH', 'Human Resources', 'IFI, AFU, AFP, AFT', true, 1202),
('3377', 'Job Description', 'Describes required skill, knowledge, experience of a particular job._x000D_
Synonym of Position Description PD.', NULL, NULL, 'ZH', 'Human Resources', 'IFI, AFU, AFP, AFT', true, 1203),
('4880', 'Other Manual', 'A document that describes methods of working to be used to accomplish an activity._x000D_
Synonym: Guide, Guideline._x000D_
Warning: Not to replace "Books", as defined in the EIS Section 3.4 which requires an Index to be created. See Index of Documents.', NULL, NULL, 'ZH', 'Human Resources', 'IFI, AFU, AFP, AFT', true, 1204),
('5880', 'Other Plan', NULL, NULL, NULL, 'ZH', 'Human Resources', 'IFI, AFU, AFP, AFT', true, 1205),
('8980', 'Other Policy', 'An established course of action that must be followed. Usually Corporate, but may also be produced by a project to govern some aspect of the project.', NULL, NULL, 'ZH', 'Human Resources', 'IFI, AFU, AFP, AFT', true, 1206),
('7180', 'Other Report', NULL, NULL, NULL, 'ZP', 'Petrophysics', 'IFI, AFU, AFP, AFT', true, 1207),
('8380', 'Other Study', NULL, NULL, NULL, 'ZP', 'Petrophysics', 'IFI, AFU, AFP, AFT', true, 1208),
('7180', 'Other Report', NULL, NULL, NULL, 'ZR', 'Reservoir Engineering', 'IFI, AFU, AFP, AFT', true, 1209),
('8380', 'Other Study', NULL, NULL, NULL, 'ZR', 'Reservoir Engineering', 'IFI, AFU, AFP, AFT', true, 1210),
('7180', 'Other Report', NULL, NULL, NULL, 'ZS', 'Geophysics', 'IFI, AFU, AFP, AFT', true, 1211),
('8380', 'Other Study', NULL, NULL, NULL, 'ZS', 'Geophysics', 'IFI, AFU, AFP, AFT', true, 1212),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'ZT', 'Production Technology', 'IFI, AFU, AFP, AFT', true, 1213),
('7180', 'Other Report', NULL, NULL, NULL, 'ZT', 'Production Technology', 'IFI, AFU, AFP, AFT', true, 1214),
('8380', 'Other Study', NULL, NULL, NULL, 'ZT', 'Production Technology', 'IFI, AFU, AFP, AFT', true, 1215),
('5720', 'Drilling Plan', 'Typically includes a list of wells and when they are planned to be drilled.', NULL, NULL, 'ZW', 'Well Engineering.', 'IFI, AFU, AFP, AFT', true, 1216),
('5980', 'Other Strategy', NULL, NULL, NULL, 'ZW', 'Well Engineering.', 'IFI, AFU, AFP, AFT', true, 1217),
('6409', 'Well Proposal', 'Advice to the company for existing/additional drilling', NULL, NULL, 'ZW', 'Well Engineering.', 'IFI, AFU, AFP, AFT', true, 1218),
('7180', 'Other Report', NULL, NULL, NULL, 'ZW', 'Well Engineering.', 'IFI, AFU, AFP, AFT', true, 1219),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'ZW', 'Well Engineering.', 'IFI, AFU, AFP, AFT', true, 1220),
('7770', 'Other Functional Design Specification', 'Specification that describes the deliverable in terms of form, fit, function, and performance characteristics to satisfy the intended use. May also include other design and delivery specifications such as those required for purchasing', NULL, NULL, 'ZW', 'Well Engineering.', 'IFI, AFU, AFP, AFT', true, 1221),
('780', 'Other Assessment Report', 'Health check, GAP analysis etc.', NULL, NULL, 'UA', 'Subsea', 'IFI, AFU, AFP, AFT', true, 1222),
('2105', 'Equipment Datasheet', 'Gives precise information about a Tag, Equipment or a Model (eg.Equipment Record Card - ERC) and compliments Equipment Specification 7771._x000D_
e.g. umbilical datasheet', NULL, NULL, 'UA', 'Subsea', 'IFI, AFU, AFP, AFT', true, 1223),
('2580', 'Other Schematic Diagram', 'Details the elements and functions of a system with the components represented by symbols, such as the elements of an electrical or electronic circuit or the elements of a logic diagram for a computer or communications system. May also detail the logic functions.', NULL, NULL, 'UA', 'Subsea', 'AFC, AFU, AFD', true, 1224),
('3323', 'Technical Note', 'Agreement which describes how an engineering or maintenance issue will be resolved and what the implication of the solution is.', NULL, NULL, 'UA', 'Subsea', 'IFI, AFU, AFP, AFT', true, 1225),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'UA', 'Subsea', 'IFI, AFU, AFP, AFT', true, 1226),
('4018', 'General Arrangement Diagram', 'A diagram showing the main features and locations of major items. Usually has some dimensions to convey spatial relationships but is generally inadequate for construction. 

Architectural: Sometimes includes layouts of all rooms including equipment and accommodation, external layouts and elevations.', 'Tier 1', 'RLMU', 'UA', 'Subsea', 'AFC, AFU, AFD', true, 1227),
('4024', 'Layout Diagram, Plot Plan', 'Plan view of a area showing exact location of main items of equipment.', NULL, NULL, 'UA', 'Subsea', 'AFC, AFU, AFD', true, 1228),
('4180', 'Other Layout Diagram', NULL, NULL, NULL, 'UA', 'Subsea', 'AFC, AFU, AFD', true, 1229),
('5280', 'Multimedia', 'Multimedia being Picture, Sound or Video.  Includes laser scans, x-rays, sonograms, installation videos, photogrammetry, illustrations, fly-throughs, etc.', NULL, NULL, 'UA', 'Subsea', 'IFI, AFU, AFP, AFT', true, 1230),
('5880', 'Other Plan', NULL, NULL, NULL, 'UA', 'Subsea', 'IFI, AFU, AFP, AFT', true, 1231),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'UA', 'Subsea', 'IFI, AFU, AFP, AFT', true, 1232),
('7739', 'Project Specification', 'Reserved for project wide Discipline Technical Specifications such as Project Civil Specification, Project Electrical Specification, etc._x000D_
Is also used to classify the component documents that comprise the Basic Design Package (BDP) and Basic Design Engineering Package (BDEP). Index of Documents JA4372 may be created to define these Packages (Books)._x000D_
A Project Specification (as defined in PG08) is a BDEP plus various procedures (ie. also a Book) and is not to be confused with this Document Type that shares the same name.', NULL, NULL, 'UA', 'Subsea', 'IFI, AFU, AFP, AFT', true, 1233),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'UA', 'Subsea', 'IFI, AFU, AFP, AFT', true, 1234),
('7771', 'Equipment Specification', 'Gives precise information about a Tag, Equipment or a Model. May include size, capacity, materials, functional requirements, failure requirements, etc. and compliments Equipment Data Sheet 2105._x000D_
e.g. umbilical specification_x000D_', NULL, NULL, 'UA', 'Subsea', 'IFI, AFU, AFP, AFT', true, 1235),
('8417', 'Survey Report', NULL, NULL, NULL, 'UA', 'Subsea', 'IFI, AFU, AFP, AFT', true, 1236),
('403', 'Contract', NULL, NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1237),
('1453', 'Country Regulation Compliance Certificate', 'Countries or groups of countries regulate minimum requirements for import and/or use of goods (eg. EEC). The certificate (of conformity) accompanies shipment of equipment._x000D_
eg.Official certificate issued by Gostandart or approved licensed agent of Gostandart.', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1238),
('1701', 'Award Letter', NULL, NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1239),
('1780', 'Correspondence', 'Any form of written communication sent or received in the course of affairs including transmittals, letters, postcards, memoranda, electronic mail, facsimiles, telegrams or cables. Documents attached to Correspondence retain their own doc type classification (eg. Minutes of Meeting attached to a Transmittal).', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1240),
('3330', 'Invitation To Tender', 'A standardised document by which the Company invites Tenderers to submit a tender for a Contract. It encloses the conditions for the submission of a tender and gives the terms of reference or the technical qualifications required.', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1241),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1242),
('3356', 'Pre-qualification Questionnaire', NULL, NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1243),
('3359', 'Purchase Order', NULL, NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1244),
('3369', 'Variation Order', 'Variation Orders and Ammendents issued against existing Contracts, Agreements and Purchase Orders.', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1245),
('4305', 'Approved Vendor List', 'List Approved for a particular contract, after selecting from a higher level Recommended Vendor List (see xx4345).This list includes Contractors (ie. materials and services).', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1246),
('4322', 'Equipment Summary List', 'An extract from a Register (see 6612 Equipment Register) that is used as a secondary reference (ie. not the master)._x000D_
e.g. long lead equipment list for C&P.', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1247),
('4336', 'Packing List', 'self-explanatory', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1248),
('4349', 'Requisition List', 'Refer to Requisition for definition.', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1249),
('4357', 'Subcontracted Work List', 'List of work to be subcontracted, including subcontractor, scope and value', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1250),
('4373', 'Tender Proposal List', 'Also called Vendor Bid Proposal List. _x000D_
"Tender" is used in preference to "Bid" in the Taxonomy.', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1251),
('5756', 'Procurement, Contracting Strategy', 'The purpose of developing contracting and procurement strategies is to identify the in-house scope and the contract packages that will eventually be placed in the market.  The development of contracting & procurement strategies is the first step towards aligning the project demands of external parties (in terms of the required goods and services), with the market supply, in terms of capable and experienced contractors and suppliers.', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1252),
('5793', 'Scope Of Work', 'Definition of work to be performed as part of a contract. Always VA for this reason (ie. purpose is contract management).', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1253),
('5879', 'Post Award Contract Management Plan', 'A document used to track all the esential activities to be performed in order to manage a contract. It categorises the actions to be taken (e.g. Team roles and responsibilities) and also the status of them (e.g. Open, Action party, due date).', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1254),
('5880', 'Other Plan', NULL, NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1255),
('6036', 'Material Management Procedure', 'Procedures for the management of materials (including Packing, Shipping, Handling and Storage)', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1256),
('6042', 'Packing, Shipping Procedure', 'contains the requirement  / rules for packing, shipping and handling of the supplies', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1257),
('6047', 'Procurement Plan', 'Plan for the purchase of bulk materials, equipment and services. Includes Requisition Plans.', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1258),
('6180', 'Other Procedure', NULL, NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1259),
('6480', 'Other Proposal', NULL, NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1260),
('6623', 'Variation Order Register', 'Register of variation orders, to be updated with current status of each order at regular (typically monthly) intervals', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1261),
('6856', 'Expediting Report', NULL, NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1262),
('6999', 'Tender Evaluation', 'Technical or Commercial evaluation of tender.', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1263),
('7003', 'Pre-Qualification Evaluation', 'Technical or Commercial evaluation of a pre-qualification to tender.', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1264),
('7180', 'Other Report', NULL, NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1265),
('7206', 'Variation Request', 'A request, approval or rejection of changes to an existing contract. Would typically include justification and reasons for the request, and acceptance or rejection from a commercial or contractual perspective, but may also contain some technical content._x000D_
For similar documents pertaining specifically to technical deviations, with no commercial/contractual content, refer to Technical Deviation Request 7205._x000D_', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1266),
('7280', 'Other Request', NULL, NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1267),
('7303', 'Requisition', 'A request for service or product initiated by the user or consumer.', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1268),
('7739', 'Project Specification', 'Reserved for project wide Discipline Technical Specifications such as Project Civil Specification, Project Electrical Specification, etc._x000D_
Is also used to classify the component documents that comprise the Basic Design Package (BDP) and Basic Design Engineering Package (BDEP). Index of Documents JA4372 may be created to define these Packages (Books)._x000D_
A Project Specification (as defined in PG08) is a BDEP plus various procedures (ie. also a Book) and is not to be confused with this Document Type that shares the same name.', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1269),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1270),
('8502', 'Clarification Request', 'Clarification RFI (Clarification Request for Additional Information) at the start of contract or work order. Excludes VA7206 Variation Request.', NULL, NULL, 'VA', 'Contracting and Procurement', 'IFI, AFU, AFP, AFT', true, 1271),
('709', 'Risk Assessment Report', 'Overall assessment of overall compound technical risk foreseen for the project.', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1272),
('780', 'Other Assessment Report', 'Health check, GAP analysis etc.', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1273),
('3101', 'Cost Estimate', 'Cost estimate for any type of activity or work or facility.', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1274),
('3347', 'Minutes Of Meeting', 'Minutes of meetings between client and contractor as requested in contract procedures', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1275),
('3366', 'Technical Query', 'Technical Query  Includes STQ (Site Technical Query)', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1276),
('5722', 'Engineering Schedule', 'Includes Engineering and Design.

A plan of work to be done, showing the order in which tasks are to be carried out and the amounts of time allocated to them. 

Part of the Timeline of schedules: Project (all), Engineering (Design), Manufacturing, Construction, Tie-In, Test/Inspect, Shutdown.', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1277),
('5765', 'Project Schedule', 'Includes Project Wide Management._x000D_
A plan of work to be done, showing the order in which tasks are to be carried out and the amounts of time allocated to them. _x000D_
Part of the Timeline of schedules: Project (all), Engineering (Design), Manufacturing, Construction, Tie-In, Test/Inspect, Shutdown._x000D_', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1278),
('5780', 'Testing, Inspection Schedule', 'Includes Maintenance, Testing & Inspection.

A plan of work to be done, showing the order in which tasks are to be carried out and the amounts of time allocated to them. 

Part of the Timeline of schedules: Project (all), Engineering (Design), Manufacturing, Construction, Tie-In, Test/Inspect, Shutdown.

Also see Pressure Test Plan to be more specific in this area.', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1279),
('5792', 'Work Breakdown Structure Plan', 'defining scope of work into smaller manageable blocks to manage cost and schedule control', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1280),
('5802', 'Construction Schedule', 'Construct is to Erect, Build, or Make (usually) on-site as a responsibility of the project team. Also see Fabricate (off-site by others). eg. Vertical storage tanks are "Constructed" on-site, while some accessories are "Fabricated" off-site and delivered for construction.', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1281),
('5803', 'Fabrication Schedule', 'Fabricate is to Manufacture, Erect, Build, or Make (usually) off-site as a responsibility of others and not the project team. Also see Construct (on-site by project team). eg. Vertical storage tanks are "Constructed" on-site, while some accessories are "Fabricated" off-site and delivered for construction.', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1282),
('5804', 'Other Schedule', NULL, NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1283),
('5805', 'Procurement Schedule', NULL, NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1284),
('6015', 'Cost Control Procedure', 'Procedures for monitoring, controlling and reporting expenditures', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1285),
('6044', 'Planning Procedure', 'Procedures for planning the project and monitoring progress', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1286),
('6180', 'Other Procedure', 'e.g. Procedures documenting how to develop a project to asset handover plan for a particular discipline.', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1287),
('6401', 'Budget Proposal', 'Distribution of funds "within" a Project. Also see "Corporate Authority for Expenditure" for distribution of funds "to" a Project.', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1288),
('6833', 'Cost Report', 'Financial progress report. Also see Progress Reports for non-financial or mixed content (eg. time, scope, money) reports.', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1289),
('6834', 'Cost Time Resource Estimate Report', 'Estimate of resources (people and money) required to produce certain deliverables. Often becomes the basis for an agreement or a contract. Synonym CTR.', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1290),
('6857', 'Expenditure Report', NULL, NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1291),
('7179', 'Basis Of Estimate', 'A Basis of Estimate shall be defined for all estimates. This document should be updated with each formal update of the project cost estimate, particularly at each stage gate. As much detail as possible should be provided in the document, relative to the scope definition available for the compilation of the estimate._x000D_
Sections should be provided on Introduction and Scope, Project Objectives and Strategies, Project Execution Plan, Contracting Strategy as well as the Estimating Methodology and Process and the Estimate Basis and Assumptions (including forex, escalation, contingency, risk, etc)._x000D_
Fro further information see PS03 and PG03._x000D_', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1292),
('7416', 'Other Assurance Review Report', 'Provides an independent assurance that project schedules, cost estimates, technical design, competence, etc. accurately represent the project scope, the risks to project delivery, and are compliant with Group project guides and standards. Usually used as input to a Value Assurance Review VAR. Includes Estimate and Schedule Assurance Review (ESAR) under FA, and Technical Assurance Reviews under AA for multidiscipline reviews, or individual disciplines for specific reviews.', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1293),
('7480', 'Other Review Report', NULL, NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1294),
('7739', 'Project Specification', 'A technical description of the information on a Project necessary to prepare a +/-10% estimate, including references to:_x000D_
 - technical specifications required to prepare detailed design and engineering work_x000D_
 - procedures and requirements for the execution of the work and services for the realisation of a project_x000D_
Note: This doc type is not a BOOK as defined in the EIS. It is a document referencing other specifications, procedures, etc.', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1295),
('7753', 'Terms Of Reference', 'Specifies the scope and details of the activity to which it refers and any conditions relating to the appointment of a person(s) to undertake the activity (usually used in relation to the supply of professional services). It recalls the background and specifies the scope of the evaluation, states the main motives for an evaluation and the questions asked. It sums up available knowledge and outlines an evaluation method and describes the distribution of work, schedule and the responsibilities among the people participating in an evaluation process.', NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1296),
('8380', 'Other Study', NULL, NULL, NULL, 'FA', 'Cost and Planning', 'IFI, AFU, AFP, AFT', true, 1297);
