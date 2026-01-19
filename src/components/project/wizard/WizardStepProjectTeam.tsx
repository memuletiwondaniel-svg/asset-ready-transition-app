import React, { useEffect, useState } from 'react';
import { ProjectTeamSection } from '../ProjectTeamSection';
import { useAutoPopulateTeam } from '@/hooks/useAutoPopulateTeam';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info, RefreshCw, Sparkles } from 'lucide-react';

interface TeamMember {
  user_id: string;
  role: string;
  is_lead: boolean;
  user_name?: string;
  user_email?: string;
  is_auto_populated?: boolean;
}

interface WizardStepProjectTeamProps {
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  regionName?: string | null;
  hubName?: string | null;
  hubId?: string | null;
}

const WizardStepProjectTeam: React.FC<WizardStepProjectTeamProps> = ({
  teamMembers,
  setTeamMembers,
  regionName = null,
  hubName = null,
  hubId = null,
}) => {
  const [hasAutoPopulated, setHasAutoPopulated] = useState(false);
  const { suggestedTeam, isLoading } = useAutoPopulateTeam(regionName, hubName, hubId);

  // Auto-populate on mount if team is empty and we have suggestions
  useEffect(() => {
    if (!hasAutoPopulated && teamMembers.length === 0 && suggestedTeam.length > 0 && !isLoading) {
      setTeamMembers(suggestedTeam);
      setHasAutoPopulated(true);
    }
  }, [suggestedTeam, hasAutoPopulated, teamMembers.length, isLoading, setTeamMembers]);

  const handleAutoPopulate = () => {
    if (suggestedTeam.length > 0) {
      // Merge: keep manually assigned roles, add/replace with suggested ones
      const manualMembers = teamMembers.filter(m => !m.is_auto_populated);
      const suggestedRoles = suggestedTeam.map(s => s.role);
      const filteredManual = manualMembers.filter(m => !suggestedRoles.includes(m.role));
      
      setTeamMembers([...filteredManual, ...suggestedTeam]);
      setHasAutoPopulated(true);
    }
  };

  const autoPopulatedCount = teamMembers.filter(m => m.is_auto_populated).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-1">Project Team</h3>
        <p className="text-sm text-muted-foreground">
          Assign team members to required roles and add any additional team members.
        </p>
      </div>

      {/* Auto-population info banner */}
      {(regionName || hubName) && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <div className="text-blue-800">
              {autoPopulatedCount > 0 ? (
                <>
                  <span className="font-medium">{autoPopulatedCount} team member(s)</span> auto-populated based on{' '}
                  {regionName && <span className="font-medium">{regionName}</span>}
                  {regionName && hubName && ' and '}
                  {hubName && <span className="font-medium">{hubName}</span>} selection.
                  You can modify or add more members below.
                </>
              ) : suggestedTeam.length > 0 ? (
                <>Team members can be auto-populated based on your Portfolio and Hub selection.</>
              ) : (
                <>No matching team members found for the selected Portfolio/Hub. Please assign manually.</>
              )}
            </div>
            {suggestedTeam.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoPopulate}
                className="ml-4 shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Re-populate
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Show sparkle indicator when auto-population happened */}
      {autoPopulatedCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>Members marked with a sparkle were auto-assigned and can be changed</span>
        </div>
      )}

      <ProjectTeamSection
        teamMembers={teamMembers}
        setTeamMembers={setTeamMembers}
        regionName={regionName}
        hubName={hubName}
        hubId={hubId}
      />
    </div>
  );
};

export default WizardStepProjectTeam;
