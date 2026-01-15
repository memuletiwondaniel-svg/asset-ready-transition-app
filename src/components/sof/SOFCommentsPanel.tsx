import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Shield, 
  Flame, 
  Wrench, 
  Gauge, 
  Zap, 
  Users,
  ChevronDown,
  MessageSquare,
  HardHat,
  Heart,
  Cog
} from 'lucide-react';

interface SOFCommentsPanelProps {
  pssrId: string;
}

// Demo data for discipline comments
const DEMO_COMMENTS = {
  interdisciplinary: {
    title: "Interdisciplinary Summary",
    icon: Users,
    status: "complete" as const,
    summary: "All disciplines have completed their reviews and confirmed readiness for startup. Cross-functional verification meetings held on Dec 5th with all discipline leads present. No outstanding interdisciplinary conflicts or dependencies remain. Safety systems integration verified across all disciplines. P&IDs, electrical diagrams, and process flows are aligned and approved.",
    reviewer: "John Smith - Project Lead",
    date: "Dec 6, 2024"
  },
  techSafety: {
    title: "Tech Safety",
    icon: Shield,
    status: "complete" as const,
    summary: "All safety instrumented systems (SIS) have been tested and verified. Emergency shutdown sequences confirmed operational. Fire & gas detection systems commissioned and integrated with DCS. HAZOP recommendations fully implemented. Safety relief valves tested and certified.",
    reviewer: "Sarah Johnson - Safety Engineer",
    date: "Dec 5, 2024"
  },
  process: {
    title: "Process",
    icon: Flame,
    status: "complete" as const,
    summary: "Process control loops tuned and verified. Operating procedures reviewed and approved. Start-up sequence documented and validated with operations team. Material balance confirmed. Heat exchanger performance verified against design specifications.",
    reviewer: "Mike Chen - Process Engineer",
    date: "Dec 4, 2024"
  },
  paco: {
    title: "PACO",
    icon: Wrench,
    status: "complete" as const,
    summary: "All piping systems pressure tested and certified. Instrument calibrations complete with certificates filed. Control valve stroking verified. P&ID walk-downs completed with no discrepancies. Flange management program implemented for all critical connections.",
    reviewer: "David Wilson - PACO Lead",
    date: "Dec 4, 2024"
  },
  mechanical: {
    title: "Mechanical",
    icon: Gauge,
    status: "complete" as const,
    summary: "Rotating equipment alignment verified. Vibration baselines established for all critical pumps and compressors. Lubrication systems charged and verified. Mechanical seals installed per specifications. Coupling guards and safety shields in place.",
    reviewer: "Lisa Brown - Mechanical Engineer",
    date: "Dec 3, 2024"
  },
  electrical: {
    title: "Electrical",
    icon: Zap,
    status: "complete" as const,
    summary: "Motor rotation checks completed. Electrical isolation procedures verified. Ground fault protection tested. UPS systems commissioned. Emergency lighting operational. Cable terminations torqued and verified. Arc flash labels installed.",
    reviewer: "Tom Davis - Electrical Engineer",
    date: "Dec 3, 2024"
  },
  civil: {
    title: "Civil",
    icon: HardHat,
    status: "complete" as const,
    summary: "Structural integrity assessments completed for all new installations. Foundation bolt torque verification documented. Drainage systems tested and operational. Fire escape routes verified clear and properly marked. Secondary containment areas inspected and certified. All civil punch list items closed out.",
    reviewer: "Ahmed Hassan - Civil Engineer",
    date: "Dec 5, 2024"
  },
  operations: {
    title: "Operations",
    icon: Cog,
    status: "complete" as const,
    summary: "Operating procedures reviewed and approved by shift supervisors. Control room displays configured and verified. Alarm rationalization completed. Operator training for DP300 completed with 100% attendance. Shift handover protocols established. Emergency response drills conducted successfully.",
    reviewer: "Maria Garcia - Operations Superintendent",
    date: "Dec 6, 2024"
  },
  hse: {
    title: "HSE",
    icon: Heart,
    status: "complete" as const,
    summary: "Job Safety Analysis (JSA) completed for all startup activities. PPE requirements verified and communicated. Environmental permits confirmed active. Spill response equipment staged at designated locations. First aid stations stocked and accessible. Toolbox talks scheduled for startup crew.",
    reviewer: "James Miller - HSE Lead",
    date: "Dec 5, 2024"
  }
};

const getStatusBadge = (status: 'complete' | 'in-progress' | 'pending') => {
  switch (status) {
    case 'complete':
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Complete</Badge>;
    case 'in-progress':
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">In Progress</Badge>;
    case 'pending':
      return <Badge className="bg-muted text-muted-foreground">Pending</Badge>;
  }
};

const DisciplineCard = ({ 
  discipline 
}: { 
  discipline: typeof DEMO_COMMENTS.techSafety 
}) => {
  const Icon = discipline.icon;
  
  return (
    <Card className="bg-card/50 border-border/50 hover:bg-card/70 transition-colors">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-medium">{discipline.title}</CardTitle>
          </div>
          {getStatusBadge(discipline.status)}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-2">
          {discipline.summary}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground/70">
          <span>{discipline.reviewer}</span>
          <span>{discipline.date}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export const SOFCommentsPanel: React.FC<SOFCommentsPanelProps> = ({ pssrId }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const InterIcon = DEMO_COMMENTS.interdisciplinary.icon;

  const disciplines = [
    DEMO_COMMENTS.techSafety,
    DEMO_COMMENTS.process,
    DEMO_COMMENTS.paco,
    DEMO_COMMENTS.mechanical,
    DEMO_COMMENTS.electrical,
    DEMO_COMMENTS.civil,
    DEMO_COMMENTS.operations,
    DEMO_COMMENTS.hse
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Discipline Comments Summary</h2>
        </div>

        {/* Interdisciplinary Summary - Prominent Card */}
        <Card className="bg-primary/5 border-primary/30 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <InterIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    {DEMO_COMMENTS.interdisciplinary.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cross-functional review summary
                  </p>
                </div>
              </div>
              {getStatusBadge(DEMO_COMMENTS.interdisciplinary.status)}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-foreground/90 leading-relaxed mb-3">
              {DEMO_COMMENTS.interdisciplinary.summary}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3">
              <span className="font-medium">{DEMO_COMMENTS.interdisciplinary.reviewer}</span>
              <span>{DEMO_COMMENTS.interdisciplinary.date}</span>
            </div>
          </CardContent>
        </Card>

        {/* Collapsible Discipline Comments */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Discipline Comments</span>
              <Badge variant="secondary" className="text-xs">
                {disciplines.length}
              </Badge>
            </div>
            <ChevronDown 
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`} 
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {disciplines.map((discipline, index) => (
                <DisciplineCard key={index} discipline={discipline} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </ScrollArea>
  );
};

export default SOFCommentsPanel;
