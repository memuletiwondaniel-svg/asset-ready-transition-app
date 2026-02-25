import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, CheckCircle2, HelpCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePSSRReasons } from '@/hooks/usePSSRReasons';
import { getReasonCardConfig, getDisplayName } from './reasonCardConfig';

interface WizardStepReasonDetailsProps {
  reasonName: string;
  description: string;
  onReasonNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
}

const WizardStepReasonDetails: React.FC<WizardStepReasonDetailsProps> = ({
  reasonName,
  description,
  onReasonNameChange,
  onDescriptionChange,
}) => {
  const { data: reasons, isLoading: loadingReasons } = usePSSRReasons();

  const knownNames = reasons?.map(r => r.name) ?? [];
  const isOther = reasonName !== '' && !knownNames.includes(reasonName);
  const [customReason, setCustomReason] = useState(isOther ? reasonName : '');

  // Sync customReason when reasons load
  useEffect(() => {
    if (reasons && reasons.length > 0 && reasonName) {
      const match = reasons.find(r => r.name === reasonName);
      if (!match && reasonName) {
        setCustomReason(reasonName);
      }
    }
  }, [reasons, reasonName]);

  const OTHER_VALUE = '__other__';
  const isOtherSelected = isOther || reasonName === OTHER_VALUE;

  const handleCardSelect = (name: string) => {
    if (name === OTHER_VALUE) {
      setCustomReason('');
      onReasonNameChange(OTHER_VALUE);
    } else {
      setCustomReason('');
      onReasonNameChange(name);
    }
  };

  const handleCustomReasonChange = (value: string) => {
    setCustomReason(value);
    onReasonNameChange(value);
  };


  return (
    <div className="space-y-6">
      {/* Reason Card Selector */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <Label className="text-base font-medium">PSSR Reason *</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Select the reason that best describes the purpose of this PSSR
        </p>

        {loadingReasons ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {reasons?.map((reason) => {
              const config = getReasonCardConfig(reason.name);
              const IconComponent = config.icon;
              const isSelected = reasonName === reason.name;
              const displayName = getDisplayName(reason.name);

              return (
                <button
                  key={reason.id}
                  type="button"
                  onClick={() => handleCardSelect(reason.name)}
                  className={cn(
                    'group relative flex items-center gap-3.5 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 overflow-hidden',
                    isSelected
                      ? 'border-primary shadow-md'
                      : 'border-border/50 hover:border-border hover:shadow-sm'
                  )}
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, hsl(${config.hue} 75% 96%), hsl(${config.hue} 65% 93%))`
                      : undefined,
                  }}
                >
                  <div
                    className={cn(
                      'absolute inset-0 opacity-0 transition-opacity duration-200 pointer-events-none',
                      !isSelected && 'group-hover:opacity-100'
                    )}
                    style={{
                      background: `linear-gradient(135deg, hsl(${config.hue} 60% 95% / 0.9), hsl(${config.hue} 50% 92% / 0.6))`,
                    }}
                  />
                  <div
                    className="relative z-10 p-2 rounded-lg shrink-0 transition-colors duration-200"
                    style={{
                      backgroundColor: isSelected
                        ? `hsl(${config.hue} 65% 88%)`
                        : `hsl(${config.hue} 40% 92%)`,
                    }}
                  >
                    <IconComponent
                      className="h-5 w-5 transition-colors duration-200"
                      strokeWidth={2.25}
                      style={{
                        color: isSelected
                          ? `hsl(${config.hue} 80% 35%)`
                          : `hsl(${config.hue} 50% 42%)`,
                      }}
                    />
                  </div>
                  <div className="relative z-10 flex-1 min-w-0">
                    <h4 className={cn(
                      'font-semibold text-sm leading-snug transition-colors',
                      isSelected ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'
                    )}>
                      {displayName}
                    </h4>
                    {reason.description && (
                      <p className={cn(
                        'text-xs leading-snug mt-0.5 line-clamp-1 transition-colors',
                        isSelected ? 'text-muted-foreground' : 'text-muted-foreground/60 group-hover:text-muted-foreground'
                      )}>
                        {reason.description}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="relative z-10 h-5 w-5 shrink-0 text-primary animate-in fade-in zoom-in duration-200" />
                  )}
                </button>
              );
            })}

            {/* Other card */}
            <div>
              <button
                type="button"
                onClick={() => handleCardSelect(OTHER_VALUE)}
                className={cn(
                  'group relative flex items-center gap-3.5 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 overflow-hidden w-full',
                  isOtherSelected
                    ? customReason.trim()
                      ? 'border-primary shadow-md'
                      : 'border-amber-500 shadow-md'
                    : 'border-border/50 hover:border-border hover:shadow-sm',
                  isOtherSelected && 'rounded-b-none border-b-0'
                )}
                style={{
                  background: isOtherSelected
                    ? `linear-gradient(135deg, hsl(0 0% 94%), hsl(0 0% 91%))`
                    : undefined,
                }}
              >
                <div
                  className={cn(
                    'absolute inset-0 opacity-0 transition-opacity duration-200 pointer-events-none',
                    !isOtherSelected && 'group-hover:opacity-100'
                  )}
                  style={{
                    background: `linear-gradient(135deg, hsl(0 0% 95% / 0.9), hsl(0 0% 93% / 0.6))`,
                  }}
                />
                <div
                  className="relative z-10 p-2 rounded-lg shrink-0 transition-colors duration-200"
                  style={{
                    backgroundColor: isOtherSelected ? 'hsl(0 0% 86%)' : 'hsl(0 0% 92%)',
                  }}
                >
                  <HelpCircle
                    className="h-5 w-5 transition-colors duration-200"
                    strokeWidth={2.25}
                    style={{ color: isOtherSelected ? 'hsl(0 0% 30%)' : 'hsl(0 0% 45%)' }}
                  />
                </div>
                <div className="relative z-10 flex-1 min-w-0">
                  <h4 className={cn(
                    'font-semibold text-sm leading-snug transition-colors',
                    isOtherSelected ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'
                  )}>
                    Other
                  </h4>
                  <p className={cn(
                    'text-xs leading-snug mt-0.5 transition-colors',
                    isOtherSelected ? 'text-muted-foreground' : 'text-muted-foreground/60 group-hover:text-muted-foreground'
                  )}>
                    {isOtherSelected ? 'Please specify your reason' : 'Other reason not listed above'}
                  </p>
                </div>
                {isOtherSelected && (
                  <CheckCircle2 className="relative z-10 h-5 w-5 shrink-0 text-primary animate-in fade-in zoom-in duration-200" />
                )}
              </button>
              {isOtherSelected && (
                <div
                  className={cn(
                    'px-4 pb-3 pt-2 rounded-b-xl border-2 border-t-0 animate-in slide-in-from-top-2 fade-in duration-200',
                    customReason.trim() ? 'border-primary' : 'border-amber-500'
                  )}
                  style={{ background: `linear-gradient(135deg, hsl(0 0% 94%), hsl(0 0% 91%))` }}
                >
                  <Input
                    autoFocus
                    id="custom-reason"
                    value={customReason}
                    onChange={(e) => handleCustomReasonChange(e.target.value)}
                    placeholder="Enter custom PSSR reason..."
                    maxLength={200}
                    className="bg-background/80"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Additional Description */}
      <div className="space-y-3">
        <Label htmlFor="description" className="text-base font-medium">Additional Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Provide additional context or details about this PSSR reason..."
          maxLength={500}
          rows={4}
        />
        <p className="text-sm text-muted-foreground">
          {description.length}/500 characters
        </p>
      </div>
    </div>
  );
};

export default WizardStepReasonDetails;
