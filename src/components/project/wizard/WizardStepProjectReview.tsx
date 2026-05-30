import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Paperclip } from 'lucide-react';
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
  regions: { id: string; name: string }[];
  hubs: { id: string; name: string }[];
  stations: { id: string; name: string }[];
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">{label}</p>
    <div className="text-sm text-foreground truncate">{children}</div>
  </div>
);

const Section: React.FC<{ title: string; count?: number; children: React.ReactNode }> = ({ title, count, children }) => (
  <section className="py-5 border-t border-border first:border-t-0 first:pt-0">
    <div className="flex items-center gap-2 mb-3">
      <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{title}</h4>
      {typeof count === 'number' && (
        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-medium tabular-nums">
          {count}
        </Badge>
      )}
    </div>
    {children}
  </section>
);

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

  const validTeamMembers = teamMembers.filter(
    m => m.user_id && m.user_id.trim() !== '' && !/additional/i.test(m.role || '')
  );
  const validMilestones = milestones.filter(m => m.milestone_name && m.milestone_date);
  const validDocuments = documents.filter(d => d.document_name && (d.file_path || d.link_url));

  const projectId = `${formData.project_id_prefix}-${formData.project_id_number || '---'}`;

  return (
    <div className="space-y-1">
      <div className="pb-2">
        <h3 className="text-lg font-semibold tracking-tight">Review & Create</h3>
        <p className="text-sm text-muted-foreground">
          Review all details before creating. Go back to any step to make changes.
        </p>
      </div>

      {/* Hero summary */}
      <div className="pt-4 pb-5 border-t border-border">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
              {projectId}
            </p>
            <h2 className="text-xl font-semibold tracking-tight truncate">
              {formData.project_title || 'Untitled project'}
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Field label="Portfolio">{selectedRegion?.name || '—'}</Field>
          <Field label="Hub">{selectedHub?.name || '—'}</Field>
          <Field label="Locations">
            {selectedStations.length > 0 ? selectedStations.map(s => s.name).join(', ') : '—'}
          </Field>
        </div>
      </div>

      {/* Scope */}
      <Section title="Project Scope">
        {scopeDescription ? (
          <div
            className="prose prose-sm max-w-none text-sm text-foreground"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(scopeDescription) }}
          />
        ) : (
          <p className="text-sm text-muted-foreground italic">No scope description provided</p>
        )}
        {scopeAttachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {scopeAttachments.map(att => (
              <Badge key={att.id} variant="secondary" className="text-xs font-normal">
                <Paperclip className="h-3 w-3 mr-1" />
                {att.name}
              </Badge>
            ))}
          </div>
        )}
      </Section>

      {/* Team */}
      <Section title="Team Members" count={validTeamMembers.length}>
        {validTeamMembers.length > 0 ? (
          <ul className="divide-y divide-border/60">
            {validTeamMembers.map((m, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium truncate">{m.user_name || 'Assigned user'}</span>
                <span className="text-muted-foreground text-xs">{m.role}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No team members assigned</p>
        )}
      </Section>

      {/* Milestones */}
      <Section title="Milestones" count={validMilestones.length}>
        {validMilestones.length > 0 ? (
          <ul className="divide-y divide-border/60">
            {validMilestones.map((m, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="truncate">{m.milestone_name}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {new Date(m.milestone_date).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No milestones added</p>
        )}
      </Section>

      {/* Documents */}
      <Section title="Documents" count={validDocuments.length}>
        {validDocuments.length > 0 ? (
          <ul className="divide-y divide-border/60">
            {validDocuments.map((d, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="truncate">{d.document_name}</span>
                <span className="text-muted-foreground text-xs">{d.document_type}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No documents attached</p>
        )}
      </Section>
    </div>
  );
};

export default WizardStepProjectReview;
