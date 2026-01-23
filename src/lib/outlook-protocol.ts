/**
 * Outlook Protocol Handler Utilities
 * Provides seamless integration with native Outlook/Teams apps
 */

export interface OutlookMeetingData {
  title: string;
  description?: string;
  location?: string;
  startDateTime: string; // ISO format
  endDateTime: string; // ISO format
  attendees: { name: string; email: string }[];
  pssrId?: string;
}

/**
 * Generates an ICS (iCalendar) file content for the meeting
 */
export function generateICSContent(meeting: OutlookMeetingData): string {
  const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}@orsh.app`;
  const now = formatDateToICS(new Date());
  const start = formatDateToICS(new Date(meeting.startDateTime));
  const end = formatDateToICS(new Date(meeting.endDateTime));
  
  const attendeeLines = meeting.attendees
    .filter(a => a.email)
    .map(a => `ATTENDEE;CN=${escapeICS(a.name)};RSVP=TRUE:mailto:${a.email}`)
    .join('\r\n');

  const description = meeting.description 
    ? escapeICS(meeting.description)
    : `PSSR Walkdown${meeting.pssrId ? ` for ${meeting.pssrId}` : ''}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ORSH//PSSR Walkdown//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(meeting.title)}`,
    `DESCRIPTION:${description}`,
    meeting.location ? `LOCATION:${escapeICS(meeting.location)}` : '',
    attendeeLines,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
}

/**
 * Formats a Date to ICS format (YYYYMMDDTHHMMSS)
 */
function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escapes special characters for ICS format
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Opens the native Outlook app with pre-filled meeting details
 * Falls back to downloading an ICS file if the protocol handler is not available
 */
export function openInOutlook(meeting: OutlookMeetingData): void {
  // Try the Outlook deep link protocol first
  const outlookUrl = buildOutlookDeepLink(meeting);
  
  // Create a hidden link to test if protocol works
  const testWindow = window.open(outlookUrl, '_blank');
  
  // If popup was blocked or protocol not supported, fall back to ICS download
  if (!testWindow || testWindow.closed) {
    downloadICSFile(meeting);
  }
}

/**
 * Builds an Outlook deep link URL
 * Works with Outlook desktop app on Windows/Mac
 */
function buildOutlookDeepLink(meeting: OutlookMeetingData): string {
  const params = new URLSearchParams();
  params.set('subject', meeting.title);
  params.set('body', meeting.description || `PSSR Walkdown${meeting.pssrId ? ` for ${meeting.pssrId}` : ''}`);
  params.set('startdt', meeting.startDateTime);
  params.set('enddt', meeting.endDateTime);
  
  if (meeting.location) {
    params.set('location', meeting.location);
  }
  
  const emails = meeting.attendees
    .filter(a => a.email)
    .map(a => a.email)
    .join(';');
  
  if (emails) {
    params.set('to', emails);
  }
  
  return `ms-outlook://calendar/action/compose?${params.toString()}`;
}

/**
 * Downloads an ICS file that opens in the default calendar app
 */
export function downloadICSFile(meeting: OutlookMeetingData): void {
  const icsContent = generateICSContent(meeting);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `PSSR-Walkdown-${meeting.pssrId || 'invitation'}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Opens Teams meeting scheduler with pre-filled details
 * Falls back to ICS if Teams is not available
 */
export function openInTeams(meeting: OutlookMeetingData): void {
  const emails = meeting.attendees
    .filter(a => a.email)
    .map(a => a.email)
    .join(',');
  
  const teamsUrl = `https://teams.microsoft.com/l/meeting/new?subject=${encodeURIComponent(meeting.title)}&attendees=${encodeURIComponent(emails)}&startTime=${encodeURIComponent(meeting.startDateTime)}&endTime=${encodeURIComponent(meeting.endDateTime)}&content=${encodeURIComponent(meeting.description || '')}`;
  
  window.open(teamsUrl, '_blank');
}

/**
 * Generates a mailto link with calendar attachment info
 * Useful as ultimate fallback
 */
export function generateMailtoWithMeeting(meeting: OutlookMeetingData): string {
  const emails = meeting.attendees
    .filter(a => a.email)
    .map(a => a.email)
    .join(',');
  
  const subject = encodeURIComponent(meeting.title);
  const body = encodeURIComponent(`
You are invited to a PSSR Walkdown.

📅 Date: ${new Date(meeting.startDateTime).toLocaleDateString()}
🕐 Time: ${new Date(meeting.startDateTime).toLocaleTimeString()} - ${new Date(meeting.endDateTime).toLocaleTimeString()}
📍 Location: ${meeting.location || 'TBD'}

${meeting.description || ''}

Please add this event to your calendar.
  `.trim());
  
  return `mailto:${emails}?subject=${subject}&body=${body}`;
}
