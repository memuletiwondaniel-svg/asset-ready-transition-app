import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarIcon, FileCheck, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';

interface WizardStepPrerequisitesProps {
  phase: 'PAC' | 'FAC';
  pssrSignedDate: Date | undefined;
  prerequisites: string[];
  onPssrDateChange: (date: Date | undefined) => void;
  onPrerequisitesChange: (prerequisites: string[]) => void;
}

const PAC_PREREQUISITES = [
  { id: 'pssr_complete', label: 'PSSR/SoF Completed', description: 'Pre-Startup Safety Review and Statement of Fitness signed off' },
  { id: 'training_complete', label: 'Operator Training Complete', description: 'All required operator training has been delivered and documented' },
  { id: 'documentation_ready', label: 'Documentation Package Ready', description: 'Operating procedures, P&IDs, and manuals are available' },
  { id: 'maintenance_setup', label: 'Maintenance Systems Ready', description: 'Assets registered in CMMS with PMs and spare parts identified' },
  { id: 'suop_verified', label: 'SUOP Verified', description: 'Safe Upper Operating Procedures reviewed and approved' },
];

const FAC_PREREQUISITES = [
  { id: 'pac_issued', label: 'PAC Issued', description: 'Provisional Acceptance Certificate has been issued' },
  { id: 'warranty_period_complete', label: 'Warranty Period Complete', description: 'The defects liability/warranty period has elapsed' },
  { id: 'owl_cleared', label: 'OWL Items Cleared', description: 'All Outstanding Work List items have been completed' },
  { id: 'performance_test_passed', label: 'Performance Test Passed', description: 'All performance guarantees have been met' },
  { id: 'final_docs_submitted', label: 'Final Documentation Submitted', description: 'As-built drawings and final documentation package submitted' },
];

export const WizardStepPrerequisites: React.FC<WizardStepPrerequisitesProps> = ({
  phase,
  pssrSignedDate,
  prerequisites,
  onPssrDateChange,
  onPrerequisitesChange,
}) => {
  const prerequisiteList = phase === 'PAC' ? PAC_PREREQUISITES : FAC_PREREQUISITES;

  const togglePrerequisite = (id: string) => {
    if (prerequisites.includes(id)) {
      onPrerequisitesChange(prerequisites.filter(p => p !== id));
    } else {
      onPrerequisitesChange([...prerequisites, id]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {phase === 'PAC' 
                ? 'Provisional Acceptance requires completion of key safety and readiness milestones before handover to Operations.'
                : 'Final Acceptance requires all warranty obligations fulfilled and outstanding items resolved.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* PSSR/PAC Signed Date */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          {phase === 'PAC' ? 'PSSR Signed Date' : 'PAC Effective Date'}
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal h-12"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {pssrSignedDate ? format(pssrSignedDate, 'PPP') : 'Select date...'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={pssrSignedDate}
              onSelect={onPssrDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Prerequisites Checklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Prerequisites Checklist</Label>
          <span className="text-sm text-muted-foreground">
            {prerequisites.length} / {prerequisiteList.length} completed
          </span>
        </div>
        <div className="space-y-3">
          {prerequisiteList.map((prereq) => {
            const isChecked = prerequisites.includes(prereq.id);
            return (
              <Card 
                key={prereq.id}
                className={`cursor-pointer transition-all ${
                  isChecked 
                    ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/20' 
                    : 'hover:border-muted-foreground/30'
                }`}
                onClick={() => togglePrerequisite(prereq.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={isChecked}
                      onCheckedChange={() => togglePrerequisite(prereq.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {isChecked ? (
                          <FileCheck className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className={`font-medium ${isChecked ? 'text-green-700 dark:text-green-300' : ''}`}>
                          {prereq.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {prereq.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
