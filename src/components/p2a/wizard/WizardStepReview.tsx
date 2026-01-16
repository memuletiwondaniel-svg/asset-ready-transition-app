import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useProjects } from '@/hooks/useProjects';
import { useP2ADeliverableCategories } from '@/hooks/useP2AHandovers';
import { format } from 'date-fns';
import { 
  Building2, 
  Calendar, 
  ClipboardList, 
  Award, 
  FileText, 
  Users, 
  CheckCircle2,
  Package
} from 'lucide-react';
import { HandoverContact } from './WizardStepContacts';

interface WizardStepReviewProps {
  projectId: string;
  phase: 'PAC' | 'FAC';
  pssrSignedDate: Date | undefined;
  prerequisites: string[];
  handoverScope: string;
  selectedCategories: string[];
  deliveringParty: HandoverContact;
  receivingParty: HandoverContact;
  maintenanceParty: HandoverContact;
}

export const WizardStepReview: React.FC<WizardStepReviewProps> = ({
  projectId,
  phase,
  pssrSignedDate,
  prerequisites,
  handoverScope,
  selectedCategories,
  deliveringParty,
  receivingParty,
  maintenanceParty,
}) => {
  const { projects } = useProjects();
  const { categories } = useP2ADeliverableCategories();

  const selectedProject = projects?.find(p => p.id === projectId);
  const selectedCategoryNames = categories
    ?.filter(c => selectedCategories.includes(c.id))
    .map(c => c.name) || [];

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            <div>
              <p className="font-medium">Ready to Create Handover</p>
              <p className="text-sm text-muted-foreground">
                Review the details below and click "Create Handover" to proceed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Project & Phase */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Project & Phase
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Project</p>
              <p className="font-medium">
                {selectedProject 
                  ? `${selectedProject.project_id_prefix}-${selectedProject.project_id_number} - ${selectedProject.project_title}`
                  : 'Not selected'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Handover Phase</p>
              <Badge variant={phase === 'PAC' ? 'default' : 'secondary'} className="mt-1">
                {phase === 'PAC' ? (
                  <><ClipboardList className="h-3 w-3 mr-1" /> Provisional Acceptance (PAC)</>
                ) : (
                  <><Award className="h-3 w-3 mr-1" /> Final Acceptance (FAC)</>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Prerequisites */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Prerequisites & Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {phase === 'PAC' ? 'PSSR Signed Date' : 'PAC Effective Date'}
              </p>
              <p className="font-medium">
                {pssrSignedDate ? format(pssrSignedDate, 'PPP') : 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prerequisites Confirmed</p>
              <p className="font-medium">{prerequisites.length} items verified</p>
            </div>
          </CardContent>
        </Card>

        {/* Scope */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Handover Scope
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {handoverScope || <span className="text-muted-foreground italic">No scope defined</span>}
            </p>
          </CardContent>
        </Card>

        {/* Deliverable Categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Deliverable Categories ({selectedCategoryNames.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCategoryNames.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedCategoryNames.map((name) => (
                  <Badge key={name} variant="outline" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No categories selected</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Contacts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Key Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Delivering Party</p>
              <p className="font-medium text-sm">{deliveringParty.name || '-'}</p>
              <p className="text-xs text-muted-foreground">{deliveringParty.role || '-'}</p>
              <p className="text-xs text-primary">{deliveringParty.email || '-'}</p>
            </div>
            <div className="p-3 bg-green-50/50 dark:bg-green-950/20 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Receiving Party</p>
              <p className="font-medium text-sm">{receivingParty.name || '-'}</p>
              <p className="text-xs text-muted-foreground">{receivingParty.role || '-'}</p>
              <p className="text-xs text-primary">{receivingParty.email || '-'}</p>
            </div>
            <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Maintenance Party</p>
              <p className="font-medium text-sm">{maintenanceParty.name || '-'}</p>
              <p className="text-xs text-muted-foreground">{maintenanceParty.role || '-'}</p>
              <p className="text-xs text-primary">{maintenanceParty.email || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
