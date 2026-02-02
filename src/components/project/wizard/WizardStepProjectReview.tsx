import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Users, Calendar, Paperclip, MapPin, Building2, Target } from 'lucide-react';
import { Attachment } from '@/components/ui/RichTextEditor';
import DOMPurify from 'dompurify';

interface TeamMember {
  user_id: string;
  role: string;
  is_lead: boolean;
  user_name?: string;
  user_email?: string;
}

interface Milestone {
  id: string;
  milestone_name: string;
  milestone_date: string;
  is_scorecard_project: boolean;
  milestone_type_id?: string;
}

interface Document {
  id: string;
  document_name: string;
  document_type: string;
  file_path?: string;
  link_url?: string;
  link_type?: string;
  file_extension?: string;
  file_size?: number;
}

interface WizardStepProjectReviewProps {
  formData: {
    project_id_prefix: 'DP' | 'ST' | 'MoC' | '';
    project_id_number: string;
    project_title: string;
    region_id: string;
    hub_id: string;
  };
  selectedLocationIds: string[];
  scopeDescription: string;
  scopeAttachments: Attachment[];
  teamMembers: TeamMember[];
  milestones: Milestone[];
  documents: Document[];
  // Lookup data
  regions: { id: string; name: string }[];
  hubs: { id: string; name: string }[];
  stations: { id: string; name: string }[];
}

const WizardStepProjectReview: React.FC<WizardStepProjectReviewProps> = ({
  formData,
  selectedLocationIds,
  scopeDescription,
  scopeAttachments,
  teamMembers,
  milestones,
  documents,
  regions,
  hubs,
  stations,
}) => {
  const selectedRegion = regions.find(r => r.id === formData.region_id);
  const selectedHub = hubs.find(h => h.id === formData.hub_id);
  const selectedStations = stations.filter(s => selectedLocationIds.includes(s.id));

  const validTeamMembers = teamMembers.filter(m => m.user_id && m.user_id.trim() !== '');
  const validMilestones = milestones.filter(m => m.milestone_name && m.milestone_date);
  const validDocuments = documents.filter(d => d.document_name && (d.file_path || d.link_url));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-1">Review & Create</h3>
        <p className="text-sm text-muted-foreground">
          Review all project details before creating. You can go back to any step to make changes.
        </p>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {/* Project Information */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">
                Project Information
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Project ID</p>
                  <Badge variant="outline" className="mt-1 bg-primary/10 text-primary">
                    {formData.project_id_prefix}{formData.project_id_number || '---'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Title</p>
                  <p className="font-medium">{formData.project_title || '---'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Portfolio</p>
                    <p className="text-sm">{selectedRegion?.name || '---'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Hub</p>
                    <p className="text-sm">{selectedHub?.name || '---'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Locations</p>
                    <p className="text-sm">
                      {selectedStations.length > 0 
                        ? selectedStations.map(s => s.name).join(', ') 
                        : '---'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Scope */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Project Scope
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              {scopeDescription ? (
                <div 
                  className="prose prose-sm max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(scopeDescription) }}
                />
              ) : (
                <p className="text-sm text-muted-foreground italic">No scope description provided</p>
              )}
              {scopeAttachments.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Attachments ({scopeAttachments.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {scopeAttachments.map(att => (
                      <Badge key={att.id} variant="secondary" className="text-xs">
                        <Paperclip className="h-3 w-3 mr-1" />
                        {att.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Members
                <Badge variant="secondary" className="ml-auto">{validTeamMembers.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              {validTeamMembers.length > 0 ? (
                <div className="space-y-2">
                  {validTeamMembers.map((member, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-1">
                      <span className="font-medium">{member.user_name || 'Assigned User'}</span>
                      <Badge variant="outline">{member.role}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No team members assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Milestones
                <Badge variant="secondary" className="ml-auto">{validMilestones.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              {validMilestones.length > 0 ? (
                <div className="space-y-2">
                  {validMilestones.map((milestone, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-1">
                      <span>{milestone.milestone_name}</span>
                      <span className="text-muted-foreground">
                        {new Date(milestone.milestone_date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No milestones added</p>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Documents
                <Badge variant="secondary" className="ml-auto">{validDocuments.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              {validDocuments.length > 0 ? (
                <div className="space-y-2">
                  {validDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-1">
                      <span>{doc.document_name}</span>
                      <Badge variant="outline">{doc.document_type}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No documents attached</p>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};

export default WizardStepProjectReview;
