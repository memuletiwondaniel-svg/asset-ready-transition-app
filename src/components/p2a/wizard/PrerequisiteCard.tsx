import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Check,
  X,
  MinusCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Link,
  Upload,
  Info,
  User,
  Trash2,
} from 'lucide-react';
import { PACPrerequisite } from '@/hooks/useHandoverPrerequisites';
import { 
  P2AHandoverPrerequisite, 
  PrerequisiteStatus,
  DeviationData 
} from '@/hooks/useP2AHandoverPrerequisites';
import { DeviationQualificationModal } from './DeviationQualificationModal';

interface PrerequisiteCardProps {
  pacPrerequisite: PACPrerequisite;
  handoverPrerequisite?: P2AHandoverPrerequisite;
  onStatusChange: (status: PrerequisiteStatus, deviationData?: DeviationData) => void;
  onCommentsChange: (comments: string) => void;
  onAddEvidenceLink: (link: string) => void;
  onRemoveEvidenceLink: (link: string) => void;
  onReceivingPartyChange: (userId: string | null) => void;
  onFileUpload?: (file: File) => void;
  users?: { id: string; full_name: string; position?: string }[];
  isUpdating?: boolean;
}

const STATUS_OPTIONS: { value: PrerequisiteStatus; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'NOT_COMPLETED', label: 'Not Completed', icon: MinusCircle, color: 'text-muted-foreground' },
  { value: 'COMPLETED', label: 'Completed', icon: Check, color: 'text-green-600' },
  { value: 'NOT_APPLICABLE', label: 'Not Applicable', icon: X, color: 'text-gray-500' },
  { value: 'DEVIATION', label: 'Deviation', icon: AlertTriangle, color: 'text-amber-600' },
];

export const PrerequisiteCard: React.FC<PrerequisiteCardProps> = ({
  pacPrerequisite,
  handoverPrerequisite,
  onStatusChange,
  onCommentsChange,
  onAddEvidenceLink,
  onRemoveEvidenceLink,
  onReceivingPartyChange,
  onFileUpload,
  users = [],
  isUpdating,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeviationModal, setShowDeviationModal] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [localComments, setLocalComments] = useState(handoverPrerequisite?.comments || '');

  const currentStatus = handoverPrerequisite?.status || 'NOT_COMPLETED';
  const evidenceLinks = handoverPrerequisite?.evidence_links || [];

  const handleStatusClick = (status: PrerequisiteStatus) => {
    if (status === 'DEVIATION') {
      setShowDeviationModal(true);
    } else {
      onStatusChange(status);
    }
  };

  const handleDeviationSubmit = (data: DeviationData) => {
    onStatusChange('DEVIATION', data);
  };

  const handleAddLink = () => {
    if (newLink.trim()) {
      onAddEvidenceLink(newLink.trim());
      setNewLink('');
    }
  };

  const handleCommentsBlur = () => {
    if (localComments !== (handoverPrerequisite?.comments || '')) {
      onCommentsChange(localComments);
    }
  };

  const getStatusBadge = () => {
    const option = STATUS_OPTIONS.find(o => o.value === currentStatus);
    if (!option) return null;
    
    const Icon = option.icon;
    return (
      <Badge 
        variant={currentStatus === 'COMPLETED' ? 'default' : 'secondary'}
        className={`${
          currentStatus === 'COMPLETED' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
            : currentStatus === 'DEVIATION'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
              : currentStatus === 'NOT_APPLICABLE'
                ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                : ''
        }`}
      >
        <Icon className="h-3 w-3 mr-1" />
        {option.label}
      </Badge>
    );
  };

  return (
    <>
      <Card className={`transition-all ${
        currentStatus === 'COMPLETED' 
          ? 'border-green-200 dark:border-green-800' 
          : currentStatus === 'DEVIATION'
            ? 'border-amber-200 dark:border-amber-800'
            : ''
      }`}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{pacPrerequisite.summary}</p>
                    {getStatusBadge()}
                  </div>
                  
                  {/* Roles */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {pacPrerequisite.delivering_role && (
                      <span>
                        <strong>From:</strong> {pacPrerequisite.delivering_role.name}
                      </span>
                    )}
                    {pacPrerequisite.receiving_role && (
                      <span>
                        <strong>To:</strong> {pacPrerequisite.receiving_role.name}
                      </span>
                    )}
                  </div>

                  {/* Evidence Count */}
                  {evidenceLinks.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {evidenceLinks.length} evidence link(s)
                      </span>
                    </div>
                  )}
                </div>
                
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
              </div>
            </CardContent>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 px-4 pb-4 space-y-4 border-t">
              {/* Sample Evidence / Guidance */}
              {pacPrerequisite.sample_evidence && (
                <div className="flex gap-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-100">Evidence Required</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      {pacPrerequisite.sample_evidence}
                    </p>
                  </div>
                </div>
              )}

              {/* Status Buttons */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Status</Label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(option => {
                    const Icon = option.icon;
                    const isActive = currentStatus === option.value;
                    return (
                      <Button
                        key={option.value}
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusClick(option.value)}
                        disabled={isUpdating}
                        className={isActive ? '' : option.color}
                      >
                        <Icon className="h-3.5 w-3.5 mr-1.5" />
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Deviation Details */}
              {currentStatus === 'DEVIATION' && handoverPrerequisite?.deviation_reason && (
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-100">Deviation Details</p>
                  <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                    <p><strong>Reason:</strong> {handoverPrerequisite.deviation_reason}</p>
                    <p><strong>Mitigation:</strong> {handoverPrerequisite.mitigation}</p>
                    {handoverPrerequisite.follow_up_action && (
                      <p><strong>Follow-up:</strong> {handoverPrerequisite.follow_up_action}</p>
                    )}
                    {handoverPrerequisite.target_date && (
                      <p><strong>Target Date:</strong> {handoverPrerequisite.target_date}</p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowDeviationModal(true)}
                    className="mt-2"
                  >
                    Edit Deviation
                  </Button>
                </div>
              )}

              {/* Receiving Party Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Receiving Party
                </Label>
                <Select
                  value={handoverPrerequisite?.receiving_party_user_id || ''}
                  onValueChange={(value) => onReceivingPartyChange(value || null)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select receiving party..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <span>{user.full_name}</span>
                        {user.position && (
                          <span className="text-muted-foreground ml-2">- {user.position}</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Evidence Links */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Link className="h-3.5 w-3.5" />
                  Evidence Links
                </Label>
                
                {/* Existing Links */}
                {evidenceLinks.length > 0 && (
                  <div className="space-y-1">
                    {evidenceLinks.map((link, index) => (
                      <div key={index} className="flex items-center gap-2 bg-muted/50 rounded px-2 py-1">
                        <a 
                          href={link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex-1 truncate"
                        >
                          {link}
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => onRemoveEvidenceLink(link)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Link Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste link (Assai, SharePoint, etc.)"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddLink}
                    disabled={!newLink.trim()}
                    className="h-8"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Comments</Label>
                <Textarea
                  value={localComments}
                  onChange={(e) => setLocalComments(e.target.value)}
                  onBlur={handleCommentsBlur}
                  placeholder="Add any notes or comments..."
                  className="min-h-[60px] text-sm"
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <DeviationQualificationModal
        open={showDeviationModal}
        onOpenChange={setShowDeviationModal}
        prerequisiteSummary={pacPrerequisite.summary}
        existingData={
          handoverPrerequisite?.deviation_reason
            ? {
                deviation_reason: handoverPrerequisite.deviation_reason,
                mitigation: handoverPrerequisite.mitigation || '',
                follow_up_action: handoverPrerequisite.follow_up_action || undefined,
                target_date: handoverPrerequisite.target_date || undefined,
              }
            : undefined
        }
        onSubmit={handleDeviationSubmit}
      />
    </>
  );
};
