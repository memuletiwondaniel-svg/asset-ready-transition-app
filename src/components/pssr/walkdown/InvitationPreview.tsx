import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, ExternalLink, Pencil, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface InvitationPreviewProps {
  subject: string;
  scope: string;
  date: Date | undefined;
  time: string;
  location: string;
  pssrLink: string;
  customMessage?: string;
  onCustomMessageChange?: (message: string) => void;
}

export const InvitationPreview: React.FC<InvitationPreviewProps> = ({
  subject,
  scope,
  date,
  time,
  location,
  pssrLink,
  customMessage,
  onCustomMessageChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const formattedDate = date ? format(date, 'EEEE, MMMM d, yyyy') : '[Select date]';
  const formattedTime = time || '[Select time]';
  const displayLocation = location || '[Enter location]';

  // Generate default message
  const defaultMessage = `Dear Colleagues,

You are invited to participate in the Pre-Startup Safety Review (PSSR) Walkdown for the following scope:

${scope ? `SCOPE OF WORK:\n${scope}\n\n` : ''}Please confirm your attendance or assign a suitable delegate if you are unable to attend.

Best regards,
ORSH PSSR Team`;

  const displayMessage = customMessage !== undefined ? customMessage : defaultMessage;

  if (isEditing) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Edit Invitation Message</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(false)}
            className="h-7 gap-1"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
        </div>
        <Textarea
          value={displayMessage}
          onChange={(e) => onCustomMessageChange?.(e.target.value)}
          placeholder="Enter custom invitation message..."
          rows={10}
          className="resize-none text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Note: Date, time, location, and PSSR link will be automatically appended.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4 text-sm">
      {/* Header with Edit Button */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Subject</div>
          <div className="font-semibold text-foreground">{subject || 'PSSR Walkdown Invitation'}</div>
        </div>
        {onCustomMessageChange && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-7 gap-1"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </div>

      {/* Email Body */}
      <div className="space-y-4 text-muted-foreground">
        {/* Custom or Default Message */}
        <div className="whitespace-pre-wrap">{displayMessage.split('\n').slice(0, 2).join('\n')}</div>
        
        {/* Scope Section - only show if in default message and scope exists */}
        {!customMessage && scope && (
          <div className="bg-background rounded-md p-3 border border-border">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Scope of Work</div>
            <div className="text-foreground whitespace-pre-wrap">{scope}</div>
          </div>
        )}

        {/* Meeting Details */}
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-foreground">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-foreground">{formattedTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-foreground">{displayLocation}</span>
          </div>
        </div>

        {/* PSSR Link */}
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-primary" />
          <a 
            href={pssrLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            View PSSR Details
          </a>
        </div>

        {/* Closing - show from default or custom message */}
        {!customMessage && (
          <>
            <p>
              Please confirm your attendance or assign a suitable delegate if you are unable to attend.
            </p>
            <div className="pt-2">
              <p>Best regards,</p>
              <p className="font-medium text-foreground">ORSH PSSR Team</p>
            </div>
          </>
        )}
        
        {customMessage && (
          <div className="whitespace-pre-wrap">
            {displayMessage.split('\n').slice(2).join('\n')}
          </div>
        )}
      </div>
    </div>
  );
};
