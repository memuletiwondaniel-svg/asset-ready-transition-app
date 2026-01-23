import React from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, ExternalLink } from 'lucide-react';

interface InvitationPreviewProps {
  subject: string;
  scope: string;
  date: Date | undefined;
  time: string;
  location: string;
  pssrLink: string;
}

export const InvitationPreview: React.FC<InvitationPreviewProps> = ({
  subject,
  scope,
  date,
  time,
  location,
  pssrLink
}) => {
  const formattedDate = date ? format(date, 'EEEE, MMMM d, yyyy') : '[Select date]';
  const formattedTime = time || '[Select time]';
  const displayLocation = location || '[Enter location]';

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4 text-sm">
      {/* Subject Line */}
      <div className="border-b border-border pb-3">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Subject</div>
        <div className="font-semibold text-foreground">{subject || 'PSSR Walkdown Invitation'}</div>
      </div>

      {/* Email Body */}
      <div className="space-y-4 text-muted-foreground">
        <p>Dear Colleagues,</p>
        
        <p>
          You are invited to participate in the Pre-Startup Safety Review (PSSR) 
          Walkdown for the following scope:
        </p>

        {/* Scope Section */}
        {scope && (
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

        <p>
          Please confirm your attendance or assign a suitable delegate if you are unable to attend.
        </p>

        <div className="pt-2">
          <p>Best regards,</p>
          <p className="font-medium text-foreground">ORSH PSSR Team</p>
        </div>
      </div>
    </div>
  );
};
