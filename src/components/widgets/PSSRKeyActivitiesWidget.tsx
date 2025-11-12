import React, { useState } from 'react';
import { WidgetCard } from './WidgetCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, Clock, AlertCircle, CalendarPlus, Users } from 'lucide-react';
import { ScheduleActivityModal } from './ScheduleActivityModal';

interface KeyActivity {
  name: string;
  status: 'Completed' | 'Scheduled' | 'Not Scheduled';
  date?: string;
  attendees?: number;
  type: string;
}

interface PSSRKeyActivitiesWidgetProps {
  activities: KeyActivity[];
  onActivityClick?: (activityType: string) => void;
}

export const PSSRKeyActivitiesWidget: React.FC<PSSRKeyActivitiesWidgetProps> = ({
  activities,
  onActivityClick
}) => {
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<KeyActivity | null>(null);

  const handleOpenScheduleModal = (activity: KeyActivity) => {
    setSelectedActivity(activity);
    setScheduleModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'Scheduled':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
      case 'Not Scheduled':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Not Scheduled
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <WidgetCard title="Key Activities" className="min-h-[400px] h-[400px]">
        <div className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent space-y-3">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="group p-4 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-accent/5 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground mb-1">{activity.name}</h4>
                  {getStatusBadge(activity.status)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleOpenScheduleModal(activity)}
                >
                  <CalendarPlus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {activity.date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(activity.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}</span>
                  </div>
                )}
                {activity.attendees !== undefined && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{activity.attendees} attendees</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </WidgetCard>

      {selectedActivity && (
        <ScheduleActivityModal
          open={scheduleModalOpen}
          onOpenChange={setScheduleModalOpen}
          activityName={selectedActivity.name}
          activityType={selectedActivity.type}
          existingDate={selectedActivity.date}
          existingAttendees={selectedActivity.attendees}
        />
      )}
    </>
  );
};
