import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { X, PartyPopper, Rocket, ChevronRight } from 'lucide-react';
import { useOnboardingChecklist } from '@/hooks/useOnboardingChecklist';

export const OnboardingChecklist: React.FC = () => {
  const navigate = useNavigate();
  const {
    checklistItems,
    completedKeys,
    completedCount,
    totalCount,
    allDone,
    isOnboardingDismissed,
    isLoading,
    toggleItem,
    dismissOnboarding,
  } = useOnboardingChecklist();

  if (isLoading || isOnboardingDismissed) return null;

  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card className="w-full border-primary/20 bg-card/90 backdrop-blur-sm shadow-lg animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold text-foreground">
              {allDone ? 'You\'re all set!' : 'Welcome to ORSH!'}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => dismissOnboarding()}
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {!allDone && (
          <p className="text-xs text-muted-foreground mt-1">
            Complete these steps to get started — {completedCount}/{totalCount} done
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {allDone ? (
          <div className="text-center py-4 space-y-3">
            <PartyPopper className="h-10 w-10 text-primary mx-auto" />
            <p className="text-sm text-foreground font-medium">
              Congratulations! You've completed all onboarding steps.
            </p>
            <Button
              size="sm"
              onClick={() => dismissOnboarding()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Got it, dismiss
            </Button>
          </div>
        ) : (
          <>
            <Progress
              value={progressPercent}
              className="h-2 bg-muted"
              indicatorClassName="bg-primary transition-all duration-500"
            />
            <ul className="space-y-1">
              {checklistItems.map((item) => {
                const done = completedKeys.has(item.key);
                return (
                  <li
                    key={item.key}
                    className="flex items-center gap-3 group rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={done}
                      onCheckedChange={() => toggleItem(item.key)}
                      className="shrink-0"
                    />
                    <button
                      onClick={() => navigate(item.route)}
                      className={`flex-1 text-left text-sm transition-colors ${
                        done
                          ? 'line-through text-muted-foreground'
                          : 'text-foreground hover:text-primary'
                      }`}
                    >
                      {item.label}
                    </button>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
};
