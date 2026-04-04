import bobAvatar from '@/assets/agents/bob.jpg';
import selmaAvatar from '@/assets/agents/selma.jpg';
import fredAvatar from '@/assets/agents/fred.jpg';
import hannahAvatar from '@/assets/agents/hannah.jpg';
import ivanAvatar from '@/assets/agents/ivan.jpg';
import zainAvatar from '@/assets/agents/zain.jpg';
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
    worksWith: ['selma', 'fred', 'hannah', 'ivan'],
    deepDiveTabs: ['Configuration', 'Feedback'],
  },
  {
    code: 'selma',
    name: 'Selma',
    role: 'Document Intelligence',
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
    worksWith: ['bob', 'hannah', 'alex'],
    deepDiveTabs: ['Analytics', 'Validation', 'Configuration', 'Feedback'],
    statsLabel: 'Tests',
    statsValue: '31',
  },
  {
    code: 'fred',
    name: 'Fred',
    role: 'PSSR & ORA Safety',
    avatar: fredAvatar,
    status: 'active',
    gradient: 'from-red-500 to-rose-600',
    accentColor: 'hsl(0, 75%, 55%)',
    introduction: "I'm Fred — your Safety Intelligence agent. I manage Pre-Startup Safety Reviews and Operational Readiness Assessments. Safety is non-negotiable, and I ensure every checklist item, risk assessment, and approval follows proper protocol.",
    specializations: [
      'PSSR checklist management',
      'ORA activity tracking',
      'Safety risk assessment support',
      'Approval workflow coordination',
      'Compliance gap identification',
    ],
    limitations: [
      'Does not search external document systems',
      'Does not handle maintenance scheduling',
      'Does not manage user permissions',
    ],
    worksWith: ['bob', 'ivan', 'hannah'],
    deepDiveTabs: ['Configuration', 'Feedback'],
  },
  {
    code: 'hannah',
    name: 'Hannah',
    role: 'P2A Handover',
    avatar: hannahAvatar,
    status: 'active',
    gradient: 'from-emerald-500 to-green-600',
    accentColor: 'hsl(150, 70%, 45%)',
    introduction: "Hi there, I'm Hannah — your P2A Handover specialist. I manage the entire Project-to-Asset handover lifecycle, from system registration through punch list resolution to final certificate generation. I keep everything organized and on track.",
    specializations: [
      'System & subsystem registration',
      'Handover plan management',
      'Punch list tracking & resolution',
      'Certificate generation (RFSU, RFC, PAC, FAC)',
      'Handover milestone coordination',
    ],
    limitations: [
      'Does not perform document content analysis',
      'Does not manage safety reviews directly',
      'Does not handle maintenance operations',
    ],
    worksWith: ['bob', 'selma', 'fred'],
    deepDiveTabs: ['Configuration', 'Feedback'],
  },
  {
    code: 'ivan',
    name: 'Ivan',
    role: 'Process Technical Authority',
    avatar: ivanAvatar,
    status: 'active',
    gradient: 'from-slate-600 to-blue-800',
    accentColor: 'hsl(220, 60%, 40%)',
    introduction: "I'm Ivan — the Process Technical Authority agent. I provide technical guidance on process engineering matters, equipment specifications, and operational parameters. My expertise helps ensure technical decisions are well-informed and documented.",
    specializations: [
      'Process engineering consultation',
      'Equipment specification guidance',
      'Technical standards compliance',
      'Process safety information management',
      'Technical query resolution',
    ],
    limitations: [
      'Does not manage project handovers',
      'Does not search document management systems',
      'Does not handle administrative tasks',
    ],
    worksWith: ['bob', 'fred', 'alex'],
    deepDiveTabs: ['Configuration', 'Feedback'],
  },
  {
    code: 'zain',
    name: 'Zain',
    role: 'Training Intelligence',
    avatar: zainAvatar,
    status: 'planned',
    gradient: 'from-violet-500 to-purple-600',
    accentColor: 'hsl(270, 70%, 55%)',
    introduction: "Hey! I'm Zain — your Training Intelligence agent. I'll help manage competency frameworks, training records, and certification tracking. I'm currently being developed to bring smart training management to ORSH.",
    specializations: [
      'Competency framework management',
      'Training record tracking',
      'Certification expiry alerts',
      'Skills gap analysis',
      'Training program recommendations',
    ],
    limitations: [
      'Currently in development — not yet active',
      'Does not replace formal training providers',
      'Does not issue certifications directly',
    ],
    worksWith: ['bob', 'ivan'],
    deepDiveTabs: ['Configuration'],
  },
  {
    code: 'alex',
    name: 'Alex',
    role: 'CMMS & Maintenance',
    avatar: alexAvatar,
    status: 'planned',
    gradient: 'from-cyan-600 to-slate-600',
    accentColor: 'hsl(190, 50%, 45%)',
    introduction: "I'm Alex — the CMMS & Maintenance Intelligence agent. My specialty is extracting technical data from engineering drawings and documents to build comprehensive asset registers and CMMS datasets. I'm being designed to automate one of the most tedious parts of asset management.",
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
