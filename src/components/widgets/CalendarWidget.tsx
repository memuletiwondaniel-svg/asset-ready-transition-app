import React from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface CalendarWidgetProps {
  settings: Record<string, any>;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ settings }) => {
  const { translations: t } = useLanguage();

  // Mock calendar events - labels are translated
  const events = [
    {
      id: 1,
      title: t.eventPSSRReviewMeeting || 'PSSR Review Meeting',
      date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      type: 'meeting'
    },
    {
      id: 2,
      title: t.eventSafetyInspectionDeadline || 'Safety Inspection Deadline',
      date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      type: 'deadline'
    },
    {
      id: 3,
      title: t.eventTeamWorkshop || 'Team Workshop',
      date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      type: 'workshop'
    }
  ];

  return (
    <>
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          {t.widgetUpcomingEvents || 'Upcoming Events'}
        </CardTitle>
        <CardDescription className="text-xs">{t.widgetScheduleDeadlines || 'Your schedule and deadlines'}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {events.map((event, idx) => (
          <div
            key={event.id}
            className="p-3 rounded-lg border border-border/40 hover:border-primary/30 transition-all bg-gradient-to-br from-card/50 to-card/30"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <h4 className="font-medium text-sm mb-2">{event.title}</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(event.date, { addSuffix: true })}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </>
  );
};