import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';

interface PSSR {
  id: string;
  projectId: string;
  projectName: string;
  asset: string;
  status: string;
  priority: string;
  progress: number;
  created: string;
  pssrLead: string;
  pssrLeadAvatar: string;
  teamStatus: string;
  pendingApprovals: number;
  completedDate: string | null;
  riskLevel: string;
  nextReview: string | null;
  teamMembers: number;
  lastActivity: string;
  location: string;
}

interface PSSRTimelineViewProps {
  pssrs: PSSR[];
  onViewDetails: (pssrId: string) => void;
}

interface TimelineEvent {
  date: Date;
  pssrs: {
    pssr: PSSR;
    eventType: 'created' | 'review' | 'completed';
  }[];
}

const PSSRTimelineView: React.FC<PSSRTimelineViewProps> = ({ pssrs, onViewDetails }) => {
  // Group PSSRs by dates
  const timelineEvents = React.useMemo(() => {
    const eventsMap = new Map<string, TimelineEvent>();

    pssrs.forEach(pssr => {
      // Created date
      const createdKey = pssr.created;
      if (!eventsMap.has(createdKey)) {
        eventsMap.set(createdKey, {
          date: parseISO(pssr.created),
          pssrs: []
        });
      }
      eventsMap.get(createdKey)!.pssrs.push({ pssr, eventType: 'created' });

      // Next review date
      if (pssr.nextReview) {
        const reviewKey = pssr.nextReview;
        if (!eventsMap.has(reviewKey)) {
          eventsMap.set(reviewKey, {
            date: parseISO(pssr.nextReview),
            pssrs: []
          });
        }
        eventsMap.get(reviewKey)!.pssrs.push({ pssr, eventType: 'review' });
      }

      // Completed date
      if (pssr.completedDate) {
        const completedKey = pssr.completedDate;
        if (!eventsMap.has(completedKey)) {
          eventsMap.set(completedKey, {
            date: parseISO(pssr.completedDate),
            pssrs: []
          });
        }
        eventsMap.get(completedKey)!.pssrs.push({ pssr, eventType: 'completed' });
      }
    });

    return Array.from(eventsMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [pssrs]);

  const getEventIcon = (eventType: 'created' | 'review' | 'completed') => {
    switch (eventType) {
      case 'created':
        return <Calendar className="h-4 w-4" />;
      case 'review':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: 'created' | 'review' | 'completed') => {
    switch (eventType) {
      case 'created':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/40';
      case 'review':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40';
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40';
    }
  };

  const getEventLabel = (eventType: 'created' | 'review' | 'completed') => {
    switch (eventType) {
      case 'created':
        return 'Created';
      case 'review':
        return 'Review Due';
      case 'completed':
        return 'Completed';
    }
  };

  const isPastDate = (date: Date) => {
    return isBefore(startOfDay(date), startOfDay(new Date()));
  };

  const isFutureDate = (date: Date) => {
    return isAfter(startOfDay(date), startOfDay(new Date()));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500/20 border-2 border-blue-500"></div>
          <span>Created</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500/20 border-2 border-amber-500"></div>
          <span>Review Due</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500/20 border-2 border-emerald-500"></div>
          <span>Completed</span>
        </div>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-border via-primary/20 to-border"></div>

        <div className="space-y-8">
          {timelineEvents.map((event, index) => {
            const isPast = isPastDate(event.date);
            const isFuture = isFutureDate(event.date);

            return (
              <div key={index} className="relative pl-20">
                {/* Date marker */}
                <div className="absolute left-0 flex items-center gap-3">
                  <div className={`relative z-10 w-4 h-4 rounded-full border-4 ${
                    isPast 
                      ? 'bg-muted border-border' 
                      : isFuture 
                        ? 'bg-primary/20 border-primary animate-pulse' 
                        : 'bg-primary border-primary'
                  }`}>
                    {!isPast && !isFuture && (
                      <div className="absolute inset-0 rounded-full bg-primary animate-ping"></div>
                    )}
                  </div>
                  <div className="min-w-[80px]">
                    <p className={`text-sm font-semibold ${isPast ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {format(event.date, 'MMM dd')}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(event.date, 'yyyy')}</p>
                  </div>
                </div>

                {/* Events for this date */}
                <div className="space-y-3">
                  {event.pssrs.map((item, itemIndex) => (
                    <Card
                      key={`${item.pssr.id}-${item.eventType}-${itemIndex}`}
                      className={`group cursor-pointer hover:shadow-md transition-all duration-200 border-border/50 ${
                        isPast ? 'opacity-70' : ''
                      }`}
                      onClick={() => onViewDetails(item.pssr.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`text-xs ${getEventColor(item.eventType)}`}>
                                <span className="mr-1">{getEventIcon(item.eventType)}</span>
                                {getEventLabel(item.eventType)}
                              </Badge>
                              <Badge variant="default" className="text-xs">
                                {item.pssr.projectId}
                              </Badge>
                            </div>
                            <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                              {item.pssr.projectName}
                            </h4>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <img 
                                  src={item.pssr.pssrLeadAvatar} 
                                  alt={item.pssr.pssrLead}
                                  className="w-4 h-4 rounded-full"
                                />
                                {item.pssr.pssrLead}
                              </span>
                              <span>•</span>
                              <span>{item.pssr.asset}</span>
                              <span>•</span>
                              <span>{item.pssr.progress}% complete</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Badge 
                              variant="outline"
                              className={`text-xs ${
                                item.pssr.status === 'Approved' ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' :
                                item.pssr.status === 'Under Review' ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20' :
                                item.pssr.status === 'In Progress' ? 'border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20' :
                                'border-slate-500/40 text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20'
                              }`}
                            >
                              {item.pssr.status}
                            </Badge>
                            {item.pssr.priority && (
                              <Badge 
                                variant="outline"
                                className={`text-xs ${
                                  item.pssr.priority === 'Critical' ? 'border-red-500/40 text-red-600 dark:text-red-400' :
                                  item.pssr.priority === 'High' ? 'border-orange-500/40 text-orange-600 dark:text-orange-400' :
                                  'border-slate-500/40 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {item.pssr.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {timelineEvents.length === 0 && (
        <Card className="border-border/50 bg-card/30">
          <CardContent className="py-16">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No timeline events to display</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PSSRTimelineView;
