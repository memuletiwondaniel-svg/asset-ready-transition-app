import bobAvatar from '@/assets/agents/bob.jpg';
import selmaAvatar from '@/assets/agents/selma.jpg';
import fredAvatar from '@/assets/agents/fred.jpg';
import ivanAvatar from '@/assets/agents/ivan.jpg';
import hannahAvatar from '@/assets/agents/hannah.jpg';
import alexAvatar from '@/assets/agents/alex.jpg';

export type AgentStatus = 'active' | 'planned' | 'in-training';

export interface AgentProfile {
  code: string;
  name: string;
  role: string;
  avatar: string;
  status: AgentStatus;
  gradient: string;
  accentColor: string;
  introduction: string;
  specializations: string[];
  limitations: string[];
  worksWith: string[];
  deepDiveTabs: string[];
  statsLabel?: string;
  statsValue?: string;
}

export const agentProfiles: AgentProfile[] = [
  {
    code: 'bob',
    name: 'Bob',
    role: 'CoPilot & Router',
    avatar: bobAvatar,
    status: 'active',
    gradient: 'from-amber-500 to-orange-600',
    accentColor: 'hsl(30, 90%, 55%)',
    introduction: "Hi, I'm Bob — your ORSH CoPilot. I'm the first point of contact for everything you need. I understand your intent and silently route complex requests to the right specialist agent. Think of me as the friendly concierge who knows exactly who to call.",
    specializations: [
      'Natural language understanding',
      'Intent classification & routing',
      'General Q&A and platform navigation',
      'Multi-turn conversation management',
      'Context-aware specialist handoffs',
    ],
    limitations: [
      'Does not perform document searches directly',
      'Does not execute safety reviews',
      'Does not modify system configurations',
    ],
    worksWith: ['selma', 'fred', 'ivan'],
    deepDiveTabs: ['Configuration', 'Feedback'],
  },
  {
    code: 'selma',
    name: 'Selma',
    role: 'Documentation & Information Readiness',
    avatar: selmaAvatar,
    status: 'active',
    gradient: 'from-cyan-500 to-blue-600',
    accentColor: 'hsl(200, 85%, 50%)',
    introduction: "Hello, I'm Selma — your Document Intelligence specialist. I search, retrieve, and analyze engineering documents across your DMS platforms. I handle everything from simple lookups to deep multi-page analysis with a 6-step search cascade.",
    specializations: [
      'Document search across Assai & SharePoint',
      'Multi-page document analysis with Claude Vision',
      'MDR completeness tracking',
      'Vendor document package management',
      'Document numbering & status validation',
      'Progressive disclosure workflows',
    ],
    limitations: [
      'Does not extract data for CMMS asset registers',
      'Does not perform safety assessments',
      'Does not handle P2A handover workflows',
    ],
    worksWith: ['bob', 'fred', 'alex'],
    deepDiveTabs: ['Analytics', 'Validation', 'Configuration', 'Feedback'],
    statsLabel: 'Tests',
    statsValue: '31',
  },
  {
    code: 'fred',
    name: 'Fred',
    role: 'System & Hardware Readiness',
    avatar: fredAvatar,
    status: 'active',
    gradient: 'from-red-500 to-rose-600',
    accentColor: 'hsl(0, 75%, 55%)',
    introduction: "I'm Fred — your Commissioning & Hardware Readiness specialist. I interface directly with Completions Management Systems like GoCompletions to make sense of the large volumes of completions data. I track what has and hasn't been done — open ITRs, punch lists, commissioning test procedures, inspection test plans — and provide a clear picture of hardware readiness. Think of me as the guy who knows exactly where every system stands before you can even think about startup.",
    specializations: [
      'Completions Management System integration (GoCompletions)',
      'ITR tracking & status analysis',
      'Commissioning test procedure management',
      'Punch list analysis & resolution tracking',
      'Inspection test plan coordination',
      'Technical integrity verification',
      'Hardware readiness assessments',
      'System & subsystem completion status',
    ],
    limitations: [
      "Does not perform document content analysis (Selma's domain)",
      "Does not make Technical Authority decisions (Ivan's domain)",
      "Does not manage training records (Hannah's domain)",
    ],
    worksWith: ['bob', 'ivan', 'selma'],
    deepDiveTabs: ['Analytics', 'Validation', 'Configuration', 'Feedback'],
    statsLabel: 'Tests',
    statsValue: '27',
  },
  {
    code: 'ivan',
    name: 'Ivan',
    role: 'Technical Authority, Process, Ops & Safety',
    avatar: ivanAvatar,
    status: 'active',
    gradient: 'from-slate-600 to-blue-800',
    accentColor: 'hsl(220, 60%, 40%)',
    introduction: "I'm Ivan — the Technical Authority. I've been in this industry longer than most systems have been running. My expertise spans process engineering, technical safety, instrumentation, control & automation, and decades of deep operational experience. I read and interpret P&IDs, Cause & Effects, and Safeguarding Memoranda. I review HAZOPs, run what-if scenario analyses, and understand human factors engineering, process and flow assurance. I review all PSSR and VCR items and advise based on my experience and assessment of where the project stands. I conduct Design Safety Reviews. I set up operations teams — Start-of-Shift Orientation meetings, operator rounds, asset management systems, Operating Mode Assurance Reviews, and all the registers and templates that need to be in place. Ultimately, I take everything Fred and Hannah tell me, assess cumulative risk, and determine whether it is technically safe to start up.",
    specializations: [
      'Process engineering & technical safety',
      'HAZOP review & what-if scenario analysis',
      'P&ID and Cause & Effect interpretation',
      'Cumulative risk assessment & Safe-to-Start verdict',
      'PSSR & VCR item review and advisory',
      'Design Safety Reviews',
      'Instrumentation, Control & Automation expertise',
      'Human Factors Engineering',
      'Process & Flow Assurance',
      'Lessons Learnt & Learning from Experience',
      'Start-of-Shift Orientation meetings',
      'Operator rounds & operational readiness setup',
      'Operating Mode Assurance Reviews',
      'Variable tables & operational register management',
      'Asset Management system establishment',
    ],
    limitations: [
      "Does not manage completions data directly (Fred's domain)",
      "Does not search document management systems (Selma's domain)",
      "Does not manage training programs (Hannah's domain)",
    ],
    worksWith: ['bob', 'fred', 'alex', 'hannah'],
    deepDiveTabs: ['Configuration', 'Feedback'],
  },
  {
    code: 'hannah',
    name: 'Hannah',
    role: 'Training & People Readiness',
    avatar: hannahAvatar,
    status: 'planned',
    gradient: 'from-violet-500 to-purple-600',
    accentColor: 'hsl(270, 70%, 55%)',
    introduction: "I'm Hannah — your People Readiness specialist. I manage the internal Competence Management System, referencing programs like OperatorSuite by Woods. I track and manage the competencies of all operators, working closely with Selma for training documentation, Fred for commissioning-related competency requirements, and Ivan for technical authority sign-off. Together we understand what training needs to be done, how much has been completed, what remains, and critically — what the gap means for startup readiness.",
    specializations: [
      'Competence Management System administration (OperatorSuite)',
      'Operator competency tracking & assessment',
      'Training needs analysis & gap identification',
      'Training completion tracking & reporting',
      'Startup readiness impact analysis (training gaps)',
      'Certification & qualification management',
      'Training program scheduling & coordination',
    ],
    limitations: [
      'Currently in development — not yet active',
      'Does not replace formal training providers',
      'Does not issue certifications directly',
    ],
    worksWith: ['bob', 'selma', 'fred', 'ivan'],
    deepDiveTabs: ['Configuration'],
  },
  {
    code: 'alex',
    name: 'Alex',
    role: 'Maintenance System Readiness',
    avatar: alexAvatar,
    status: 'planned',
    gradient: 'from-cyan-600 to-slate-600',
    accentColor: 'hsl(190, 50%, 45%)',
    introduction: "I'm Alex — the Maintenance & Inspection System Build specialist. My focus is extracting technical data from engineering drawings and documents to build comprehensive asset registers, CMMS datasets, and inspection management frameworks. I automate one of the most tedious parts of asset management — turning drawings into structured, actionable maintenance data.",
    specializations: [
      'Technical data extraction from drawings',
      'Asset register construction',
      'CMMS data population',
      'Equipment tag identification',
      'Maintenance strategy recommendations',
    ],
    limitations: [
      'Currently in development — not yet active',
      'Does not perform general document searches',
      'Does not handle safety or handover workflows',
    ],
    worksWith: ['bob', 'selma', 'ivan'],
    deepDiveTabs: ['Configuration'],
  },
];

export const getAgentByCode = (code: string) => agentProfiles.find(a => a.code === code);
export const getActiveAgents = () => agentProfiles.filter(a => a.status === 'active');
export const getPlannedAgents = () => agentProfiles.filter(a => a.status === 'planned');
