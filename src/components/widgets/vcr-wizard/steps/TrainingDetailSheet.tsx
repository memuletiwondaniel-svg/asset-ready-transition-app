import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  GraduationCap,
  Building,
  Clock,
  Calendar,
  MapPin,
  Globe,
  Monitor,
  Users,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

const DELIVERY_ICONS: Record<string, React.ElementType> = {
  'Onsite': MapPin,
  'Offsite (Out-of-Country)': Globe,
  'Online': Monitor,
};

interface TrainingDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any | null;
}

const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), 'do MMM yyyy');
  } catch {
    return dateStr;
  }
};

const DetailRow: React.FC<{
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}> = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3 py-3">
    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  </div>
);

export const TrainingDetailSheet: React.FC<TrainingDetailSheetProps> = ({
  open,
  onOpenChange,
  item,
}) => {
  if (!item) return null;

  const durationDays = item.duration_hours ? Math.round(item.duration_hours / 8) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] p-0 flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-blue-500/5 via-violet-500/5 to-transparent border-b">
          <SheetHeader className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-base font-semibold truncate">{item.title}</SheetTitle>
                <p className="text-xs text-muted-foreground">Training Details</p>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          {/* Description */}
          {item.description && (
            <>
              <DetailRow icon={FileText} label="Objective & Justification">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.description}</p>
              </DetailRow>
              <Separator />
            </>
          )}

          {/* Provider */}
          {item.training_provider && (
            <DetailRow icon={Building} label="Training Provider">
              {item.training_provider}
            </DetailRow>
          )}

          {/* Duration */}
          {durationDays && (
            <DetailRow icon={Clock} label="Duration">
              {durationDays} day{durationDays !== 1 ? 's' : ''} ({item.duration_hours} hours)
            </DetailRow>
          )}

          {/* Tentative Date */}
          {item.tentative_date && (
            <DetailRow icon={Calendar} label="Tentative Start Date">
              {formatDate(item.tentative_date)}
            </DetailRow>
          )}

          {/* Delivery Methods */}
          {item.delivery_method?.length > 0 && (
            <>
              <Separator />
              <DetailRow icon={MapPin} label="Delivery Format">
                <div className="flex flex-wrap gap-2 mt-1">
                  {item.delivery_method.map((dm: string) => {
                    const Icon = DELIVERY_ICONS[dm] || MapPin;
                    return (
                      <div key={dm} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 text-xs font-medium">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        {dm}
                      </div>
                    );
                  })}
                </div>
              </DetailRow>
            </>
          )}

          {/* Target Audience */}
          {item.target_audience?.length > 0 && (
            <>
              <Separator />
              <DetailRow icon={Users} label="Target Audience">
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {item.target_audience.map((a: string) => (
                    <Badge key={a} variant="secondary" className="text-[11px]">{a}</Badge>
                  ))}
                </div>
              </DetailRow>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
