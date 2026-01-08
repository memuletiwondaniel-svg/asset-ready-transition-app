import React from 'react';
import { ProjectTeamSection } from '../ProjectTeamSection';

interface TeamMember {
  user_id: string;
  role: string;
  is_lead: boolean;
  user_name?: string;
  user_email?: string;
}

interface WizardStepProjectTeamProps {
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
}

const WizardStepProjectTeam: React.FC<WizardStepProjectTeamProps> = ({
  teamMembers,
  setTeamMembers,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-1">Project Team</h3>
        <p className="text-sm text-muted-foreground">
          Assign team members to required roles and add any additional team members.
        </p>
      </div>

      <ProjectTeamSection
        teamMembers={teamMembers}
        setTeamMembers={setTeamMembers}
      />
    </div>
  );
};

export default WizardStepProjectTeam;
