import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { 
  Shield, 
  Workflow, 
  SlidersHorizontal, 
  Zap, 
  Users,
  ChevronDown,
  MessageSquare,
  Heart,
  Cog,
  Fan,
  Wrench,
  Building2
} from 'lucide-react';

interface SOFCommentsPanelProps {
  pssrId: string;
}

// Demo data for discipline comments - DP-300
const DEMO_COMMENTS_DP300 = {
  interdisciplinary: {
    title: "Interdisciplinary Summary",
    icon: Users,
    color: "text-primary",
    bgColor: "bg-primary/10",
    status: "complete" as const,
    summary: "All disciplines have completed their reviews and confirmed readiness for startup. Cross-functional verification meetings held on Dec 5th with all discipline leads present. No outstanding interdisciplinary conflicts or dependencies remain. Safety systems integration verified across all disciplines. P&IDs, electrical diagrams, and process flows are aligned and approved.",
    reviewer: "Daniel Memuletiwon - PSSR Lead",
    date: "Dec 6, 2024"
  },
  techSafety: {
    title: "Tech Safety",
    icon: Shield,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    status: "complete" as const,
    summary: "All safety instrumented systems (SIS) have been tested and verified. Emergency shutdown sequences confirmed operational. Fire & gas detection systems commissioned and integrated with DCS. HAZOP recommendations fully implemented. Safety relief valves tested and certified.",
    reviewer: "Andrew Banford - Tech Safety TA2",
    date: "Dec 5, 2024"
  },
  process: {
    title: "Process",
    icon: Workflow,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    status: "complete" as const,
    summary: "Process control loops tuned and verified. Operating procedures reviewed and approved. Start-up sequence documented and validated with operations team. Material balance confirmed. Heat exchanger performance verified against design specifications.",
    reviewer: "Chris Johnsen - Process TA2 (P&E)",
    date: "Dec 4, 2024"
  },
  paco: {
    title: "PACO",
    icon: SlidersHorizontal,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    status: "complete" as const,
    summary: "All piping systems pressure tested and certified. Instrument calibrations complete with certificates filed. Control valve stroking verified. P&ID walk-downs completed with no discrepancies. Flange management program implemented for all critical connections.",
    reviewer: "David Brown - PACO TA2 (P&E)",
    date: "Dec 4, 2024"
  },
  rotating: {
    title: "Rotating",
    icon: Fan,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    status: "complete" as const,
    summary: "Rotating equipment alignment verified. Vibration baselines established for all critical pumps and compressors. Lubrication systems charged and verified. Mechanical seals installed per specifications. Coupling guards and safety shields in place.",
    reviewer: "Nathan Roberts - Rotating TA2 (P&E)",
    date: "Dec 3, 2024"
  },
  static: {
    title: "Static",
    icon: Wrench,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    status: "complete" as const,
    summary: "All static equipment inspections completed including pressure vessels, heat exchangers, and storage tanks. Thickness measurements verified against minimum requirements. Relief device certifications current. Vessel internals inspected and reinstalled per specifications. Piping flexibility analysis confirmed.",
    reviewer: "Stuart Lugo - Static TA2 (P&E)",
    date: "Dec 4, 2024"
  },
  electrical: {
    title: "Electrical",
    icon: Zap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    status: "complete" as const,
    summary: "Motor rotation checks completed. Electrical isolation procedures verified. Ground fault protection tested. UPS systems commissioned. Emergency lighting operational. Cable terminations torqued and verified. Arc flash labels installed.",
    reviewer: "Mohammed Yassar - Elect TA2 (P&E)",
    date: "Dec 3, 2024"
  },
  civil: {
    title: "Civil",
    icon: Building2,
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
    status: "complete" as const,
    summary: "Structural integrity assessments completed for all new installations. Foundation bolt torque verification documented. Drainage systems tested and operational. Fire escape routes verified clear and properly marked. Secondary containment areas inspected and certified. All civil punch list items closed out.",
    reviewer: "Satya Borra - Civil TA2",
    date: "Dec 5, 2024"
  },
  operations: {
    title: "Operations",
    icon: Cog,
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
    status: "complete" as const,
    summary: "Operating procedures reviewed and approved by shift supervisors. Control room displays configured and verified. Alarm rationalization completed. Operator training for DP300 completed with 100% attendance. Shift handover protocols established. Emergency response drills conducted successfully.",
    reviewer: "Lyle Koch - CS Deputy Director",
    date: "Dec 6, 2024"
  },
  hse: {
    title: "HSE",
    icon: Heart,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    status: "complete" as const,
    summary: "Job Safety Analysis (JSA) completed for all startup activities. PPE requirements verified and communicated. Environmental permits confirmed active. Spill response equipment staged at designated locations. First aid stations stocked and accessible. Toolbox talks scheduled for startup crew.",
    reviewer: "Ahmed Kadhum - Ops HSE Manager",
    date: "Dec 5, 2024"
  }
};

// Demo data for DP-385 - OT2/3 Gas Feed to CS6/7
const DEMO_COMMENTS_DP385 = {
  interdisciplinary: {
    title: "Interdisciplinary Summary",
    icon: Users,
    color: "text-primary",
    bgColor: "bg-primary/10",
    status: "complete" as const,
    summary: "All disciplines have confirmed readiness for gas feed operations to CS6 and CS7. Integration testing completed between OT2/3 systems and receiving facilities. Cross-discipline walkdowns verified tie-in points and isolation boundaries. No outstanding interdisciplinary issues. Final coordination meeting held with all TAs present.",
    reviewer: "Roaa Abdullah - PSSR Lead",
    date: "Jan 28, 2026"
  },
  techSafety: {
    title: "Tech Safety",
    icon: Shield,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    status: "complete" as const,
    summary: "Gas detection systems at tie-in locations commissioned and integrated. ESD logic verified for new gas feed isolation. HAZOP action items from gas routing study closed. Pressure relief sizing confirmed for upstream conditions. Flare capacity validated for emergency scenarios.",
    reviewer: "Antoine Segret - Tech Safety TA2",
    date: "Jan 27, 2026"
  },
  process: {
    title: "Process",
    icon: Workflow,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    status: "complete" as const,
    summary: "Gas composition analysis verified compatible with CS6/7 processing requirements. Flow control valves sized and tuned for design throughput. Pressure drop calculations validated during commissioning. Slug catcher performance confirmed. Operating envelope documented and communicated to operations.",
    reviewer: "Ghassan Majdalani - Process TA2 (P&E)",
    date: "Jan 26, 2026"
  },
  paco: {
    title: "PACO",
    icon: SlidersHorizontal,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    status: "complete" as const,
    summary: "All gas feed instrumentation calibrated and loop-checked. Flow metering accuracy verified to custody transfer standards. Control system graphics updated for new tie-ins. Pressure transmitters tested at operating conditions. Analyzer shelters commissioned with sample systems operational.",
    reviewer: "Collin Hand - PACO TA2 (P&E)",
    date: "Jan 26, 2026"
  },
  rotating: {
    title: "Rotating",
    icon: Fan,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    status: "complete" as const,
    summary: "Booster compressor alignment verified and baseline vibration recorded. Seal gas system operational with correct differential pressures. Lube oil analysis within specifications. Performance test completed at design conditions. Auxiliary systems including cooling water verified operational.",
    reviewer: "Tim Brown - Rotating TA2 (P&E)",
    date: "Jan 25, 2026"
  },
  static: {
    title: "Static",
    icon: Wrench,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    status: "complete" as const,
    summary: "New piping tie-ins hydrotested and certified. Pig launcher/receiver installations inspected. Flange integrity verification completed for all new connections. Corrosion allowance confirmed adequate for gas service. Support and hanger adjustments completed per stress analysis.",
    reviewer: "Prakash Princeton - Static TA2 (P&E)",
    date: "Jan 26, 2026"
  },
  civil: {
    title: "Civil",
    icon: Building2,
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
    status: "complete" as const,
    summary: "Pipe rack modifications structurally certified. New foundations for metering skid inspected and approved. Access platforms installed with proper egress. Drainage provisions verified for new equipment areas. Wind load calculations confirmed for elevated piping sections.",
    reviewer: "Satya Borra - Civil TA2",
    date: "Jan 27, 2026"
  },
  operations: {
    title: "Operations",
    icon: Cog,
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
    status: "complete" as const,
    summary: "Gas feed operating procedures developed and approved. Control room operators trained on new system configuration. Alarm setpoints rationalized and documented. Emergency isolation procedures tested during tabletop exercise. Coordination established with OT2/3 operations team for startup.",
    reviewer: "Ewan McConnachie - CS Deputy Director",
    date: "Jan 28, 2026"
  },
  hse: {
    title: "HSE",
    icon: Heart,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    status: "complete" as const,
    summary: "Gas release scenarios reviewed and emergency response updated. Portable gas monitors positioned at work locations. Environmental permit modifications approved. Simultaneous operations assessment completed. Toolbox talks conducted for all startup personnel.",
    reviewer: "Ahmed Kadhum - Ops HSE Manager",
    date: "Jan 27, 2026"
  }
};

const getStatusBadge = (status: 'complete' | 'in-progress' | 'pending') => {
  switch (status) {
    case 'complete':
      return <Badge className="bg-green-500/10 text-green-600/70 border-green-500/20 font-normal">Complete</Badge>;
    case 'in-progress':
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">In Progress</Badge>;
    case 'pending':
      return <Badge className="bg-muted text-muted-foreground">Pending</Badge>;
  }
};

const DisciplineCard = ({ 
  discipline 
}: { 
  discipline: typeof DEMO_COMMENTS_DP300.techSafety 
}) => {
  const Icon = discipline.icon;
  
  return (
    <Card className="bg-card/50 border-border/50 hover:bg-card/70 transition-colors">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-md", discipline.bgColor)}>
              <Icon className={cn("h-4 w-4", discipline.color)} />
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
  
  // Select data based on pssrId
  const isDP385 = pssrId === 'mock-pssr-dp385';
  const DEMO_COMMENTS = isDP385 ? DEMO_COMMENTS_DP385 : DEMO_COMMENTS_DP300;
  
  const InterIcon = DEMO_COMMENTS.interdisciplinary.icon;

  // DP-385 doesn't have electrical, so filter it out
  const disciplines = isDP385 
    ? [
        DEMO_COMMENTS.techSafety,
        DEMO_COMMENTS.process,
        DEMO_COMMENTS.paco,
        DEMO_COMMENTS.static,
        DEMO_COMMENTS.civil,
        DEMO_COMMENTS.operations,
        DEMO_COMMENTS.hse
      ]
    : [
        DEMO_COMMENTS_DP300.techSafety,
        DEMO_COMMENTS_DP300.process,
        DEMO_COMMENTS_DP300.paco,
        DEMO_COMMENTS_DP300.rotating,
        DEMO_COMMENTS_DP300.static,
        DEMO_COMMENTS_DP300.electrical,
        DEMO_COMMENTS_DP300.civil,
        DEMO_COMMENTS_DP300.operations,
        DEMO_COMMENTS_DP300.hse
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
