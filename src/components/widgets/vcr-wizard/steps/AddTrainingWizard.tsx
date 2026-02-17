import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  GraduationCap,
  BookOpen,
  Building2,
  Users,
  Layers,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Search,
  Flame,
  Snowflake,
  X,
  Monitor,
  MapPin,
  Globe,
  Sparkles,
} from 'lucide-react';

const DELIVERY_METHODS = [
  { id: 'Onsite', label: 'Onsite', description: 'At the project site', icon: MapPin },
  { id: 'Offsite (Out-of-Country)', label: 'Offsite', description: 'Out-of-country facility', icon: Globe },
  { id: 'Online', label: 'Online', description: 'Virtual / remote delivery', icon: Monitor },
];

const SUGGESTED_AUDIENCES = [
  'Operations Team',
  'Maintenance – Electrical',
  'Maintenance – Mechanical',
  'Maintenance – Instrumentation',
  'Operations Supervisors',
  'Site Engineers',
  'HSE Team',
  'Process Engineering',
  'Control Room Operators',
  'Management',
  'Contractors',
];

interface WizardStep {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}

const STEPS: WizardStep[] = [
  { id: 0, title: 'Training Overview', subtitle: 'Title & objectives', icon: BookOpen },
  { id: 1, title: 'Provider & Delivery', subtitle: 'Who delivers & how', icon: Building2 },
  { id: 2, title: 'Audience & Systems', subtitle: 'Who attends & scope', icon: Users },
  { id: 3, title: 'Schedule', subtitle: 'Duration & timing', icon: CalendarDays },
];

interface AddTrainingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systems: any[];
  systemsLoading: boolean;
  onSubmit: (item: any) => void;
  isSaving: boolean;
}

export const AddTrainingWizard: React.FC<AddTrainingWizardProps> = ({
  open,
  onOpenChange,
  systems,
  systemsLoading,
  onSubmit,
  isSaving,
}) => {
  const [step, setStep] = useState(0);

  // Form state
  const [title, setTitle] = useState('');
  const [overview, setOverview] = useState('');
  const [provider, setProvider] = useState('');
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [customAudience, setCustomAudience] = useState('');
  const [selectedSystemIds, setSelectedSystemIds] = useState<string[]>([]);
  const [systemSearch, setSystemSearch] = useState('');
  const [durationDays, setDurationDays] = useState<string>('');
  const [tentativeDate, setTentativeDate] = useState('');

  useEffect(() => {
    if (open) {
      setStep(0);
      setTitle('');
      setOverview('');
      setProvider('');
      setDeliveryMethods([]);
      setTargetAudience([]);
      setCustomAudience('');
      setSelectedSystemIds([]);
      setSystemSearch('');
      setDurationDays('');
      setTentativeDate('');
    }
  }, [open]);

  const toggleDelivery = (id: string) =>
    setDeliveryMethods(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAudience = (a: string) =>
    setTargetAudience(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const addCustomAudience = () => {
    const trimmed = customAudience.trim();
    if (trimmed && !targetAudience.includes(trimmed)) {
      setTargetAudience(prev => [...prev, trimmed]);
      setCustomAudience('');
    }
  };

  const toggleSystem = (id: string) =>
    setSelectedSystemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const filteredSystems = systems.filter((s: any) =>
    s.name?.toLowerCase().includes(systemSearch.toLowerCase()) ||
    s.system_id?.toLowerCase().includes(systemSearch.toLowerCase())
  );

  const canProceed = (s: number) => {
    if (s === 0) return title.trim().length > 0;
    return true; // Other steps are optional
  };

  const handleSubmit = () => {
    onSubmit({
      title: title.trim(),
      description: overview.trim() || null,
      training_provider: provider.trim() || null,
      delivery_method: deliveryMethods.length > 0 ? deliveryMethods : null,
      target_audience: targetAudience,
      duration_hours: durationDays ? parseFloat(durationDays) * 8 : null,
      tentative_date: tentativeDate || null,
      estimated_cost: null,
      system_ids: selectedSystemIds,
    });
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-blue-500/5 via-violet-500/5 to-transparent">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">New Training Item</h2>
              <p className="text-xs text-muted-foreground">Define training requirements for this VCR</p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isComplete = i < step;
              return (
                <React.Fragment key={s.id}>
                  <button
                    onClick={() => i <= step && setStep(i)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      isActive && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                      isComplete && 'text-emerald-600 dark:text-emerald-400 cursor-pointer hover:bg-emerald-500/5',
                      !isActive && !isComplete && 'text-muted-foreground/50'
                    )}
                    disabled={i > step}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all shrink-0',
                      isActive && 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
                      isComplete && 'border-emerald-500/30 bg-emerald-500/10',
                      !isActive && !isComplete && 'border-muted-foreground/20'
                    )}>
                      {isComplete ? <Check className="w-3 h-3" /> : i + 1}
                    </div>
                    <span className="hidden sm:inline">{s.title}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={cn(
                      'flex-1 h-px max-w-[20px]',
                      i < step ? 'bg-emerald-500/30' : 'bg-border'
                    )} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-[320px]">
          {step === 0 && (
            <StepOverview
              title={title}
              setTitle={setTitle}
              overview={overview}
              setOverview={setOverview}
            />
          )}
          {step === 1 && (
            <StepProviderDelivery
              provider={provider}
              setProvider={setProvider}
              deliveryMethods={deliveryMethods}
              toggleDelivery={toggleDelivery}
            />
          )}
          {step === 2 && (
            <StepAudienceSystems
              targetAudience={targetAudience}
              toggleAudience={toggleAudience}
              customAudience={customAudience}
              setCustomAudience={setCustomAudience}
              addCustomAudience={addCustomAudience}
              systems={filteredSystems}
              allSystems={systems}
              systemsLoading={systemsLoading}
              selectedSystemIds={selectedSystemIds}
              toggleSystem={toggleSystem}
              systemSearch={systemSearch}
              setSystemSearch={setSystemSearch}
            />
          )}
          {step === 3 && (
            <StepSchedule
              durationDays={durationDays}
              setDurationDays={setDurationDays}
              tentativeDate={tentativeDate}
              setTentativeDate={setTentativeDate}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)}
            disabled={isSaving}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          <div className="flex items-center gap-2">
            {!isLastStep && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed(step)}
              >
                Skip
              </Button>
            )}
            <Button
              size="sm"
              onClick={isLastStep ? handleSubmit : () => setStep(step + 1)}
              disabled={!canProceed(step) || (isLastStep && isSaving)}
              className={cn(
                'gap-1.5',
                isLastStep && 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Creating...</>
              ) : isLastStep ? (
                <><Sparkles className="w-4 h-4" />Create Training</>
              ) : (
                <>Continue<ChevronRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ───── Step 0: Training Overview ───── */
const StepOverview: React.FC<{
  title: string; setTitle: (v: string) => void;
  overview: string; setOverview: (v: string) => void;
}> = ({ title, setTitle, overview, setOverview }) => (
  <div className="space-y-5">
    <div>
      <p className="text-sm font-medium text-foreground mb-1">What is this training about?</p>
      <p className="text-xs text-muted-foreground mb-3">Provide a clear title and describe the objectives.</p>
    </div>
    <div className="space-y-2">
      <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
        Training Title <span className="text-destructive">*</span>
      </label>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g., DCS Operations & Configuration Training"
        className="text-sm"
        autoFocus
      />
    </div>
    <div className="space-y-2">
      <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
        Objective & Justification
      </label>
      <Textarea
        value={overview}
        onChange={(e) => setOverview(e.target.value)}
        placeholder="Describe the expected outcomes, key learning objectives, and why this training is necessary..."
        rows={5}
        className="text-sm resize-none"
      />
      <p className="text-[10px] text-muted-foreground">
        Include expected competencies, business need, or regulatory requirement driving this training.
      </p>
    </div>
  </div>
);

/* ───── Step 1: Provider & Delivery ───── */
const StepProviderDelivery: React.FC<{
  provider: string; setProvider: (v: string) => void;
  deliveryMethods: string[]; toggleDelivery: (id: string) => void;
}> = ({ provider, setProvider, deliveryMethods, toggleDelivery }) => (
  <div className="space-y-5">
    <div>
      <p className="text-sm font-medium text-foreground mb-1">Who delivers and how?</p>
      <p className="text-xs text-muted-foreground mb-3">Specify the training provider and preferred delivery format.</p>
    </div>
    <div className="space-y-2">
      <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
        Training Provider
      </label>
      <Input
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
        placeholder="e.g., Siemens, Schlumberger, Honeywell, Internal SME"
        className="text-sm"
        autoFocus
      />
      <p className="text-[10px] text-muted-foreground">OEM, vendor, or internal subject matter expert responsible for delivery.</p>
    </div>
    <div className="space-y-2">
      <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
        Delivery Format
      </label>
      <div className="grid grid-cols-3 gap-3">
        {DELIVERY_METHODS.map(dm => {
          const Icon = dm.icon;
          const isSelected = deliveryMethods.includes(dm.id);
          return (
            <button
              key={dm.id}
              onClick={() => toggleDelivery(dm.id)}
              className={cn(
                'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                isSelected
                  ? 'border-blue-500/50 bg-blue-500/5 shadow-sm'
                  : 'border-border hover:border-blue-500/20 hover:bg-accent/50'
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <div className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center',
                isSelected ? 'bg-blue-500/10' : 'bg-muted'
              )}>
                <Icon className={cn('w-4.5 h-4.5', isSelected ? 'text-blue-500' : 'text-muted-foreground')} />
              </div>
              <div>
                <div className="text-xs font-medium">{dm.label}</div>
                <div className="text-[10px] text-muted-foreground">{dm.description}</div>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">Select one or more delivery formats. Multiple can be combined.</p>
    </div>
  </div>
);

/* ───── Step 2: Audience & Systems ───── */
const StepAudienceSystems: React.FC<{
  targetAudience: string[];
  toggleAudience: (a: string) => void;
  customAudience: string;
  setCustomAudience: (v: string) => void;
  addCustomAudience: () => void;
  systems: any[];
  allSystems: any[];
  systemsLoading: boolean;
  selectedSystemIds: string[];
  toggleSystem: (id: string) => void;
  systemSearch: string;
  setSystemSearch: (v: string) => void;
}> = ({
  targetAudience, toggleAudience, customAudience, setCustomAudience, addCustomAudience,
  systems, allSystems, systemsLoading, selectedSystemIds, toggleSystem, systemSearch, setSystemSearch,
}) => (
  <div className="space-y-5">
    {/* Target Audience */}
    <div className="space-y-2">
      <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
        Target Audience
      </label>
      <p className="text-[10px] text-muted-foreground -mt-1">Who should attend this training?</p>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED_AUDIENCES.map(a => (
          <Badge
            key={a}
            variant={targetAudience.includes(a) ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer text-[11px] transition-all',
              targetAudience.includes(a)
                ? 'bg-blue-500 hover:bg-blue-600 border-blue-500'
                : 'hover:bg-accent'
            )}
            onClick={() => toggleAudience(a)}
          >
            {targetAudience.includes(a) && <Check className="w-3 h-3 mr-0.5" />}
            {a}
          </Badge>
        ))}
      </div>
      {/* Custom audience entries */}
      {targetAudience.filter(a => !SUGGESTED_AUDIENCES.includes(a)).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {targetAudience.filter(a => !SUGGESTED_AUDIENCES.includes(a)).map(a => (
            <Badge key={a} className="bg-violet-500 hover:bg-violet-600 gap-1 text-[11px]">
              {a}
              <button onClick={() => toggleAudience(a)} className="ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={customAudience}
          onChange={(e) => setCustomAudience(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAudience())}
          placeholder="Add custom audience, e.g., EX Inspection candidates..."
          className="text-xs h-8"
        />
        <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={addCustomAudience} disabled={!customAudience.trim()}>
          Add
        </Button>
      </div>
    </div>

    {/* Applicable Systems */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          Applicable Systems
          <span className="text-[10px] normal-case font-normal">(optional)</span>
        </label>
        {selectedSystemIds.length > 0 && (
          <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-500">
            {selectedSystemIds.length} selected
          </Badge>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={systemSearch}
          onChange={(e) => setSystemSearch(e.target.value)}
          placeholder="Search systems..."
          className="pl-8 h-8 text-xs"
        />
      </div>
      <div className="border rounded-lg overflow-hidden">
        <ScrollArea className="h-[140px]">
          {systemsLoading ? (
            <div className="p-3 space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : allSystems.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">No systems mapped to this VCR</div>
          ) : systems.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">No systems match your search</div>
          ) : (
            <div className="divide-y">
              {systems.map((sys: any) => {
                const isSelected = selectedSystemIds.includes(sys.id);
                return (
                  <div
                    key={sys.id}
                    onClick={() => toggleSystem(sys.id)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors text-xs',
                      isSelected ? 'bg-blue-500/5' : 'hover:bg-accent/50'
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                    />
                    {sys.is_hydrocarbon ? (
                      <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    ) : (
                      <Snowflake className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{sys.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{sys.system_id}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  </div>
);

/* ───── Step 3: Schedule ───── */
const StepSchedule: React.FC<{
  durationDays: string; setDurationDays: (v: string) => void;
  tentativeDate: string; setTentativeDate: (v: string) => void;
}> = ({ durationDays, setDurationDays, tentativeDate, setTentativeDate }) => (
  <div className="space-y-5">
    <div>
      <p className="text-sm font-medium text-foreground mb-1">When and how long?</p>
      <p className="text-xs text-muted-foreground mb-3">Set the estimated duration and a tentative start date.</p>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
          Estimated Duration
        </label>
        <div className="relative">
          <Input
            type="number"
            min="0.5"
            step="0.5"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            placeholder="e.g., 5"
            className="text-sm pr-12"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">days</span>
        </div>
        <p className="text-[10px] text-muted-foreground">Total training days including assessments</p>
      </div>
      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
          Tentative Start Date
        </label>
        <Input
          type="date"
          value={tentativeDate}
          onChange={(e) => setTentativeDate(e.target.value)}
          className="text-sm"
        />
        <p className="text-[10px] text-muted-foreground">Estimated date for training to commence</p>
      </div>
    </div>

    {/* Summary Preview */}
    <div className="mt-6 p-4 rounded-xl bg-muted/40 border border-dashed space-y-2">
      <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" />
        Quick Summary
      </p>
      <div className="text-xs text-muted-foreground space-y-1">
        {durationDays && (
          <p>Duration: <span className="text-foreground font-medium">{durationDays} day{parseFloat(durationDays) !== 1 ? 's' : ''}</span></p>
        )}
        {tentativeDate && (
          <p>Start: <span className="text-foreground font-medium">{new Date(tentativeDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></p>
        )}
        {!durationDays && !tentativeDate && (
          <p className="italic">No schedule details provided yet — these can be added later.</p>
        )}
      </div>
    </div>
  </div>
);
