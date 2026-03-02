import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, LogOut, RefreshCw } from 'lucide-react';

interface SessionTimeoutWarningProps {
  open: boolean;
  remainingSeconds: number;
  totalWarningSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
}

const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  open,
  remainingSeconds,
  totalWarningSeconds,
  onExtend,
  onLogout,
}) => {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const progressPercent = totalWarningSeconds > 0
    ? (remainingSeconds / totalWarningSeconds) * 100
    : 0;

  const isUrgent = remainingSeconds <= 60;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[420px] p-0 gap-0 overflow-hidden border-none shadow-2xl [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Top accent bar */}
        <div className={`h-1.5 w-full transition-colors duration-500 ${
          isUrgent ? 'bg-destructive animate-pulse' : 'bg-amber-500'
        }`} />

        <div className="px-6 pt-6 pb-2">
          {/* Icon + Timer */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className={`rounded-full p-3 mb-4 transition-colors duration-500 ${
              isUrgent
                ? 'bg-destructive/10 text-destructive'
                : 'bg-amber-500/10 text-amber-600'
            }`}>
              <Clock className={`h-8 w-8 ${isUrgent ? 'animate-pulse' : ''}`} />
            </div>

            <h2 className="text-lg font-semibold text-foreground">
              Session Expiring Soon
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your session will expire due to inactivity
            </p>

            {/* Countdown */}
            <div className={`mt-4 font-mono text-4xl font-bold tracking-wider tabular-nums transition-colors duration-500 ${
              isUrgent ? 'text-destructive' : 'text-foreground'
            }`}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
          </div>

          {/* Progress */}
          <Progress
            value={progressPercent}
            className={`h-1.5 mb-6 ${isUrgent ? '[&>div]:bg-destructive' : '[&>div]:bg-amber-500'}`}
          />
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/30"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={onExtend}
            autoFocus
          >
            <RefreshCw className="h-4 w-4" />
            Stay Signed In
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionTimeoutWarning;
