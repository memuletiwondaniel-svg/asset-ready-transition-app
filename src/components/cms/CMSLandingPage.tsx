import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  GraduationCap, Users, BookOpen, Layers, Sparkles, Plus, Search,
  TrendingUp, Award, Target, ChevronRight, Filter, MoreHorizontal,
  CheckCircle2, Clock, AlertCircle, Activity, Lock, Play, RotateCcw, Brain, Wrench, Trophy,
} from 'lucide-react';
import {
  useCompetenceProfiles, useCompetencies, useProfileLinks, useActivities, usePeople,
  useOverallProgress, usePersonProgress, usePersonActivityRecords, useCMSMutations,
  ACTIVITY_TYPE_LABELS, statusFromProgress,
  type CMSPerson, type ActivityType, type CompetenceActivity, type PersonActivityRecord, type ActivityRecordStatus,
} from '@/hooks/useCMS';
import { useLocations } from '@/hooks/useLocations';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const STATUS_META: Record<string, { label: string; badge: string; dot: string; icon: React.ReactNode }> = {
  not_started: { label: 'Not started', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/60', dot: 'bg-slate-400', icon: <AlertCircle className="h-3 w-3" /> },
  in_progress: { label: 'In progress', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/60', dot: 'bg-amber-500', icon: <Clock className="h-3 w-3" /> },
  assessed:    { label: 'Assessed',    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/60 dark:border-blue-900/60', dot: 'bg-blue-500', icon: <Activity className="h-3 w-3" /> },
  competent:   { label: 'Competent',   badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/60', dot: 'bg-emerald-500', icon: <CheckCircle2 className="h-3 w-3" /> },
  expired:     { label: 'Expired',     badge: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200/60 dark:border-red-900/60', dot: 'bg-red-500', icon: <AlertCircle className="h-3 w-3" /> },
};

const readinessTone = (v: number) => {
  if (v >= 85) return { bar: 'from-emerald-500 to-green-400', text: 'text-emerald-600 dark:text-emerald-400', ring: 'stroke-emerald-500' };
  if (v >= 60) return { bar: 'from-blue-500 to-cyan-400', text: 'text-blue-600 dark:text-blue-400', ring: 'stroke-blue-500' };
  if (v >= 30) return { bar: 'from-amber-500 to-orange-400', text: 'text-amber-600 dark:text-amber-400', ring: 'stroke-amber-500' };
  return { bar: 'from-slate-400 to-slate-300', text: 'text-slate-500', ring: 'stroke-slate-400' };
};

const initials = (a?: string, b?: string) => `${(a?.[0] || '').toUpperCase()}${(b?.[0] || '').toUpperCase()}`;
const avatarGradient = (seed: string) => {
  const grads = [
    'from-violet-500 to-fuchsia-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-indigo-500 to-purple-500',
  ];
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return grads[h % grads.length];
};

export const CMSLandingPage: React.FC = () => {
  const { data: profiles = [] } = useCompetenceProfiles();
  const { data: competencies = [] } = useCompetencies();
  const { data: links = [] } = useProfileLinks();
  const { data: activities = [] } = useActivities();
  const { data: people = [] } = usePeople();
  const { data: overall = [] } = useOverallProgress();

  const overallMap = useMemo(() => Object.fromEntries(overall.map(o => [o.person_id, o])), [overall]);
  const profileMap = useMemo(() => Object.fromEntries(profiles.map(p => [p.id, p])), [profiles]);
  const competencyMap = useMemo(() => Object.fromEntries(competencies.map(c => [c.id, c])), [competencies]);

  const avgReadiness = overall.length
    ? Math.round(overall.reduce((s, o) => s + (o.overall_progress || 0), 0) / overall.length)
    : 0;
  const competent = overall.filter(o => (o.overall_progress || 0) >= 85).length;
  const inProgress = overall.filter(o => { const v = o.overall_progress || 0; return v > 0 && v < 85; }).length;

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-accent/[0.06]" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative p-4 sm:p-6 md:p-8">
          <div className="flex items-start gap-3">
            <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0">
              <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  Competence Management
                </h1>
                <Badge variant="outline" className="hidden sm:inline-flex gap-1 text-[10px] bg-background/60 backdrop-blur">
                  <Sparkles className="h-2.5 w-2.5" /> Live
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
                Build profiles, map competencies, close gaps and track every individual's readiness in one place.
              </p>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-5 sm:mt-7">
            <KPI tone="violet" icon={<Users className="h-4 w-4" />} label="People" value={people.length} hint={`${profiles.length} profiles`} />
            <KPI tone="emerald" icon={<TrendingUp className="h-4 w-4" />} label="Avg Readiness" value={`${avgReadiness}%`} progress={avgReadiness} />
            <KPI tone="blue" icon={<Award className="h-4 w-4" />} label="Competent" value={competent} hint={`${inProgress} in progress`} />
            <KPI tone="amber" icon={<BookOpen className="h-4 w-4" />} label="Competencies" value={competencies.length} hint={`${activities.length} activities`} />
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-6 md:p-8">
        <Tabs defaultValue="people" className="w-full">
          <div className="-mx-3 sm:mx-0 overflow-x-auto scrollbar-thin px-3 sm:px-0">
            <TabsList className="bg-muted/50 backdrop-blur p-1 h-auto rounded-xl border border-border/40 shadow-sm inline-flex w-max">
              <TabsTrigger value="people" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm">
                <Users className="h-3.5 w-3.5" /> People
              </TabsTrigger>
              <TabsTrigger value="profiles" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm">
                <Layers className="h-3.5 w-3.5" /> Profiles
              </TabsTrigger>
              <TabsTrigger value="competencies" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm">
                <BookOpen className="h-3.5 w-3.5" /> Competencies
              </TabsTrigger>
              <TabsTrigger value="activities" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm">
                <Target className="h-3.5 w-3.5" /> Activities
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="mt-5">
            <TabsContent value="people" className="mt-0">
              <PeopleTab people={people} profiles={profiles} overallMap={overallMap} profileMap={profileMap} competencyMap={competencyMap} links={links} activities={activities} />
            </TabsContent>
            <TabsContent value="profiles" className="mt-0">
              <ProfilesTab profiles={profiles} competencies={competencies} links={links} people={people} />
            </TabsContent>
            <TabsContent value="competencies" className="mt-0">
              <CompetenciesTab competencies={competencies} links={links} activities={activities} />
            </TabsContent>
            <TabsContent value="activities" className="mt-0">
              <ActivitiesTab activities={activities} competencies={competencies} competencyMap={competencyMap} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

// ============ KPI ============
const KPI: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string; progress?: number; tone: 'violet' | 'emerald' | 'blue' | 'amber' }> = ({ icon, label, value, hint, progress, tone }) => {
  const tones = {
    violet:  { bg: 'from-violet-500/15 to-fuchsia-500/5', iconBg: 'bg-violet-500/15 text-violet-600 dark:text-violet-400', bar: 'from-violet-500 to-fuchsia-500' },
    emerald: { bg: 'from-emerald-500/15 to-teal-500/5',   iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', bar: 'from-emerald-500 to-teal-500' },
    blue:    { bg: 'from-blue-500/15 to-cyan-500/5',      iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', bar: 'from-blue-500 to-cyan-500' },
    amber:   { bg: 'from-amber-500/15 to-orange-500/5',   iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', bar: 'from-amber-500 to-orange-500' },
  }[tone];
  return (
    <Card className={cn('relative overflow-hidden p-4 border-border/40 bg-gradient-to-br backdrop-blur transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group', tones.bg)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl md:text-3xl font-bold mt-1 tracking-tight">{value}</p>
          {hint && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
        </div>
        <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110', tones.iconBg)}>
          {icon}
        </div>
      </div>
      {typeof progress === 'number' && (
        <div className="mt-3 h-1.5 rounded-full bg-muted/60 overflow-hidden">
          <div className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', tones.bar)} style={{ width: `${progress}%` }} />
        </div>
      )}
    </Card>
  );
};

// ============ PEOPLE TAB ============
const PeopleTab: React.FC<any> = ({ people, profiles, overallMap, profileMap, competencyMap, links, activities }) => {
  const { addPerson } = useCMSMutations();
  const { plants, getFieldsByPlant, getStationsByField } = useLocations();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CMSPerson | null>(null);
  const [profileFilter, setProfileFilter] = useState<string>('all');
  const [form, setForm] = useState({ first_name: '', last_name: '', staff_id: '', job_title: '', profile_id: '', plant_id: '', field_id: '', station_id: '' });

  const filtered = people.filter((p: CMSPerson) => {
    if (profileFilter !== 'all' && p.profile_id !== profileFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return p.first_name.toLowerCase().includes(s) || p.last_name.toLowerCase().includes(s) || p.staff_id.toLowerCase().includes(s) || (p.job_title || '').toLowerCase().includes(s);
  });

  const availableFields = form.plant_id ? getFieldsByPlant(form.plant_id) : [];
  const availableStations = form.field_id ? getStationsByField(form.field_id) : [];
  const selectedPlant = plants.find(p => p.id === form.plant_id);
  const requiresStation = !!selectedPlant && availableFields.length > 0;

  const submit = async () => {
    if (!form.first_name || !form.last_name || !form.staff_id) return;
    try {
      await addPerson.mutateAsync({
        first_name: form.first_name,
        last_name: form.last_name,
        staff_id: form.staff_id,
        job_title: form.job_title || undefined,
        profile_id: form.profile_id || undefined,
        plant_id: form.plant_id || null,
        field_id: form.field_id || null,
        station_id: form.station_id || null,
      });
      toast({ title: 'Person added' });
      setOpen(false);
      setForm({ first_name: '', last_name: '', staff_id: '', job_title: '', profile_id: '', plant_id: '', field_id: '', station_id: '' });
    } catch (e: any) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Card className="border-border/40 shadow-sm overflow-hidden">
      <div className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search people..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background/60 border-border/60 focus-visible:ring-primary/30" />
          </div>
          <Select value={profileFilter} onValueChange={setProfileFilter}>
            <SelectTrigger className="w-[130px] sm:w-[170px] bg-background/60 border-border/60 shrink-0"><Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground shrink-0" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All profiles</SelectItem>
              {profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-primary/90"><Plus className="h-4 w-4 mr-1" />Add Person</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Person</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First Name</Label><Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></div>
                <div><Label>Last Name</Label><Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></div>
              </div>
              <div><Label>Staff ID</Label><Input value={form.staff_id} onChange={e => setForm({ ...form, staff_id: e.target.value })} /></div>
              <div><Label>Job Title</Label><Input value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} /></div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label>Plant</Label>
                  <Select value={form.plant_id} onValueChange={v => setForm({ ...form, plant_id: v, field_id: '', station_id: '' })}>
                    <SelectTrigger><SelectValue placeholder="Select plant" /></SelectTrigger>
                    <SelectContent>
                      {plants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {requiresStation && (
                  <div>
                    <Label>{selectedPlant?.name?.toUpperCase() === 'UQ' ? 'Terminal' : 'Field / Area'}</Label>
                    <Select value={form.field_id} onValueChange={v => setForm({ ...form, field_id: v, station_id: '' })}>
                      <SelectTrigger><SelectValue placeholder={`Select ${selectedPlant?.name?.toUpperCase() === 'UQ' ? 'terminal' : 'field'}`} /></SelectTrigger>
                      <SelectContent>
                        {availableFields.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {form.field_id && availableStations.length > 0 && (
                  <div>
                    <Label>Station</Label>
                    <Select value={form.station_id} onValueChange={v => setForm({ ...form, station_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select station" /></SelectTrigger>
                      <SelectContent>
                        {availableStations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div>
                <Label>Competence Profile</Label>
                <Select value={form.profile_id} onValueChange={v => setForm({ ...form, profile_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select profile" /></SelectTrigger>
                  <SelectContent>{profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={addPerson.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/40">
            <TableHead className="text-[11px] uppercase tracking-wider">Person</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider hidden md:table-cell">Staff ID</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider hidden sm:table-cell">Profile</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider w-[140px] sm:w-[320px]">Readiness</TableHead>
            <TableHead className="w-8 sm:w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((p: CMSPerson) => {
            const o = overallMap[p.id];
            const val = o?.overall_progress || 0;
            const tone = readinessTone(val);
            const prof = p.profile_id ? profileMap[p.profile_id] : null;
            return (
              <TableRow
                key={p.id}
                onClick={() => setSelected(p)}
                className="cursor-pointer group border-border/40 transition-colors hover:bg-muted/40"
              >
                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('h-9 w-9 rounded-full bg-gradient-to-br text-white flex items-center justify-center text-xs font-semibold shadow-sm ring-2 ring-background shrink-0', avatarGradient(p.staff_id))}>
                      {initials(p.first_name, p.last_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-tight truncate">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.job_title || '—'}</p>
                      <div className="flex items-center gap-2 mt-1 sm:hidden">
                        <span className="font-mono text-[10px] text-muted-foreground">{p.staff_id}</span>
                        {prof && (
                          <Badge variant="secondary" className="text-[10px] py-0 h-4 bg-primary/10 text-primary border border-primary/20">
                            {prof.code || prof.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground hidden md:table-cell">{p.staff_id}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  {prof ? (
                    <Badge variant="secondary" className="font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15">
                      {prof.code || prof.name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <MilestoneBar value={val} className="flex-1 min-w-[60px]" />
                    <span className={cn('text-xs sm:text-sm font-bold tabular-nums w-9 sm:w-10 text-right', tone.text)}>{val}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </TableCell>
              </TableRow>
            );
          })}
          {!filtered.length && (
            <TableRow><TableCell colSpan={5} className="text-center py-16">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Users className="h-8 w-8 opacity-30" />
                <p className="text-sm">No people found</p>
              </div>
            </TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      </div>

      <PersonProgressSheet
        person={selected}
        onClose={() => setSelected(null)}
        links={links}
        competencyMap={competencyMap}
        activities={activities}
        profileMap={profileMap}
      />
    </Card>
  );
};

// ============ MILESTONES ============
const MILESTONE_META = {
  knowledge: { label: 'Knowledge', short: 'K', icon: Brain,  color: 'amber'   as const },
  skill:     { label: 'Skill',     short: 'S', icon: Wrench, color: 'blue'    as const },
  mastery:   { label: 'Mastery',   short: 'M', icon: Trophy, color: 'emerald' as const },
};
type MilestoneKey = keyof typeof MILESTONE_META;

const milestoneFor = (value: number, k: number, s: number, m: number): MilestoneKey | null => {
  if (value >= m) return 'mastery';
  if (value >= s) return 'skill';
  if (value >= k) return 'knowledge';
  return null;
};

const milestoneTone = (key: MilestoneKey | null) => {
  if (key === 'mastery')   return { bar: 'from-emerald-500 to-green-400', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' };
  if (key === 'skill')     return { bar: 'from-blue-500 to-cyan-400',    text: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' };
  if (key === 'knowledge') return { bar: 'from-amber-500 to-orange-400', text: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' };
  return { bar: 'from-slate-400 to-slate-300', text: 'text-slate-500', bg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300/40' };
};

const MilestoneBar: React.FC<{
  value: number;
  knowledge?: number;
  skill?: number;
  mastery?: number;
  target?: number;
  showLabels?: boolean;
  className?: string;
}> = ({ value, knowledge = 50, skill = 75, mastery = 100, target, showLabels, className }) => {
  const ms = milestoneFor(value, knowledge, skill, mastery);
  const tone = milestoneTone(ms);
  const reachedTarget = target != null && value >= target;
  return (
    <div className={cn('relative', className)}>
      <div className="relative h-2 rounded-full bg-muted/60 overflow-hidden">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', tone.bar)}
          style={{ width: `${Math.min(100, value)}%` }}
        />
        {[knowledge, skill, mastery].map((t, i) => (
          t < 100 && (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-background/80"
              style={{ left: `${t}%` }}
            />
          )
        ))}
        {target != null && target < 100 && (
          <div
            className={cn('absolute -top-0.5 -bottom-0.5 w-0.5 rounded-full', reachedTarget ? 'bg-emerald-500' : 'bg-primary')}
            style={{ left: `calc(${target}% - 1px)` }}
          />
        )}
      </div>
      {showLabels && (
        <div className="relative h-3 mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">
          <span className="absolute -translate-x-1/2" style={{ left: `${knowledge}%` }}>K</span>
          <span className="absolute -translate-x-1/2" style={{ left: `${skill}%` }}>S</span>
          <span className="absolute -translate-x-1/2 -translate-x-full" style={{ left: `100%` }}>M</span>
        </div>
      )}
    </div>
  );
};

const milestoneThreshold = (m: 'knowledge' | 'skill' | 'mastery', c: any) => {
  if (m === 'knowledge') return c?.knowledge_threshold ?? 50;
  if (m === 'skill') return c?.skill_threshold ?? 75;
  return c?.mastery_threshold ?? 100;
};

// ============ PERSON PROGRESS SHEET ============
const PersonProgressSheet: React.FC<any> = ({ person, onClose, links, competencyMap, activities, profileMap }) => {
  const { data: progress = [] } = usePersonProgress(person?.id ?? null);
  const { data: actRecords = [] } = usePersonActivityRecords(person?.id ?? null);
  const { setActivityStatus } = useCMSMutations();
  const [openCompetency, setOpenCompetency] = useState<string | null>(null);

  if (!person) return null;
  const profile = person.profile_id ? profileMap[person.profile_id] : null;
  const profileLinks = links.filter((l: any) => l.profile_id === person.profile_id);
  const progressMap: Record<string, any> = Object.fromEntries(progress.map((p: any) => [p.competency_id, p]));

  const totalWeight = profileLinks.reduce((s: number, l: any) => s + l.weight, 0) || 1;
  // Compute readiness per competency normalized to its required milestone target
  const perCompReadiness = (l: any) => {
    const comp = competencyMap[l.competency_id];
    const target = milestoneThreshold(l.required_milestone || 'mastery', comp);
    const v = progressMap[l.competency_id]?.progress || 0;
    return Math.min(100, target > 0 ? (v / target) * 100 : 0);
  };
  const overall = profileLinks.length
    ? Math.round(profileLinks.reduce((s: number, l: any) => s + (perCompReadiness(l) * l.weight), 0) / totalWeight)
    : 0;
  const tone = readinessTone(overall);

  const competentCount = profileLinks.filter((l: any) => {
    const c = competencyMap[l.competency_id];
    const target = milestoneThreshold(l.required_milestone || 'mastery', c);
    const pr = progressMap[l.competency_id]?.progress || 0;
    return pr >= target;
  }).length;

  // SVG ring constants
  const R = 42, C = 2 * Math.PI * R;
  const offset = C - (overall / 100) * C;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.06]">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative p-6">
            <SheetHeader className="text-left">
              <div className="flex items-start gap-4">
                <div className={cn('h-14 w-14 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center font-semibold shadow-lg ring-2 ring-background shrink-0', avatarGradient(person.staff_id))}>
                  {initials(person.first_name, person.last_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-xl">{person.first_name} {person.last_name}</SheetTitle>
                  <SheetDescription className="mt-0.5">
                    {person.job_title || '—'} · <span className="font-mono">{person.staff_id}</span>
                  </SheetDescription>
                  {profile && <Badge variant="secondary" className="mt-2 bg-primary/10 text-primary border-primary/20">{profile.name}</Badge>}
                </div>
              </div>
            </SheetHeader>

            {/* Readiness ring */}
            <div className="mt-6 flex items-center gap-5">
              <div className="relative h-28 w-28 shrink-0">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r={R} className="fill-none stroke-muted" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r={R}
                    className={cn('fill-none transition-all duration-1000', tone.ring)}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={offset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn('text-2xl font-bold tabular-nums', tone.text)}>{overall}%</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ready</span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-3">
                <MiniStat label="Competencies" value={profileLinks.length} />
                <MiniStat label="Mastered" value={competentCount} tone="emerald" />
                <MiniStat label="Gap" value={profileLinks.length - competentCount} tone="amber" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Competency Breakdown</h3>
            <span className="text-[11px] text-muted-foreground">{profileLinks.length} items</span>
          </div>
          {!profileLinks.length && (
            <div className="text-center py-10 text-muted-foreground text-sm border border-dashed rounded-lg">
              No competencies assigned. Assign a profile first.
            </div>
          )}
          <div className="space-y-2">
            {profileLinks.map((l: any) => {
              const comp = competencyMap[l.competency_id];
              if (!comp) return null;
              const pr = progressMap[l.competency_id];
              const val = pr?.progress || 0;
              const kT = comp.knowledge_threshold ?? 50;
              const sT = comp.skill_threshold ?? 75;
              const mT = comp.mastery_threshold ?? 100;
              const ms = milestoneFor(val, kT, sT, mT);
              const mtone = milestoneTone(ms);
              const acts = (activities as CompetenceActivity[])
                .filter(a => a.competency_id === l.competency_id)
                .sort((a, b) => a.sequence_order - b.sequence_order);
              const isOpen = openCompetency === l.competency_id;
              const requiredM: 'knowledge'|'skill'|'mastery' = l.required_milestone || 'mastery';
              const targetT = milestoneThreshold(requiredM, comp);
              const reached = val >= targetT;
              const reqMeta = MILESTONE_META[requiredM];
              const ReqIcon = reqMeta.icon;
              const reqTone = milestoneTone(requiredM);
              return (
                <Card key={l.id} className={cn('border-border/50 overflow-hidden transition-all', reached && 'border-emerald-500/40')}>
                  <button
                    onClick={() => setOpenCompetency(isOpen ? null : l.competency_id)}
                    className="w-full text-left p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{comp.title}</p>
                        {comp.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{comp.description}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className={cn('gap-1 text-[10px] font-medium border', mtone.bg)}>
                          {ms ? (() => { const Icon = MILESTONE_META[ms].icon; return <Icon className="h-3 w-3" />; })() : <AlertCircle className="h-3 w-3" />}
                          {ms ? MILESTONE_META[ms].label : 'Not started'}
                        </Badge>
                        <Badge variant="outline" className={cn('gap-1 text-[9px] font-medium border', reqTone.bg)}>
                          <Target className="h-2.5 w-2.5" />
                          <ReqIcon className="h-2.5 w-2.5" />
                          Required: {reqMeta.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MilestoneBar value={val} knowledge={kT} skill={sT} mastery={mT} target={targetT} className="flex-1" />
                      <span className={cn('text-xs font-bold tabular-nums w-14 text-right', reached ? 'text-emerald-600' : mtone.text)}>
                        {val}<span className="text-muted-foreground font-normal">/{targetT}</span>
                      </span>
                      <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
                    </div>
                  </button>
                  {isOpen && (
                    <ActivityChecklist
                      personId={person.id}
                      activities={acts}
                      records={actRecords as PersonActivityRecord[]}
                      onSet={(activity_id, status, existing_id) =>
                        setActivityStatus.mutate(
                          { person_id: person.id, activity_id, status, existing_id },
                          { onError: (e: any) => toast({ title: 'Action blocked', description: e.message, variant: 'destructive' }) }
                        )
                      }
                      knowledge={kT} skill={sT} mastery={mT} value={val}
                    />
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const ActivityChecklist: React.FC<{
  personId: string;
  activities: CompetenceActivity[];
  records: PersonActivityRecord[];
  onSet: (activity_id: string, status: ActivityRecordStatus, existing_id: string | null) => void;
  knowledge: number; skill: number; mastery: number; value: number;
}> = ({ activities, records, onSet, knowledge, skill, mastery, value }) => {
  const recordsByActivity = useMemo(
    () => Object.fromEntries(records.map(r => [r.activity_id, r])),
    [records]
  );
  const sumWeights = activities.reduce((s, a) => s + (a.weight || 0), 0);
  const nextThreshold = value < knowledge ? knowledge : value < skill ? skill : value < mastery ? mastery : null;
  const nextLabel = nextThreshold === knowledge ? 'Knowledge' : nextThreshold === skill ? 'Skill' : nextThreshold === mastery ? 'Mastery' : null;
  const completedCount = activities.filter(a => recordsByActivity[a.id]?.status === 'completed').length;

  return (
    <div className="border-t border-border/40 bg-muted/20 p-3 space-y-2">
      {activities.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">No activities defined for this competency.</p>
      )}
      {activities.map((a, idx) => {
        const rec = recordsByActivity[a.id];
        const isCompleted = rec?.status === 'completed';
        const isInProgress = rec?.status === 'in_progress';
        // Sequence lock: locked if strict AND any earlier (lower seq) activity not completed
        const earlier = activities.slice(0, idx);
        const locked = a.is_sequence_strict && earlier.some(e => recordsByActivity[e.id]?.status !== 'completed');
        return (
          <TooltipProvider key={a.id} delayDuration={150}>
            <div className={cn(
              'group relative flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg border bg-background/60 transition-all',
              isCompleted ? 'border-emerald-500/30' : 'border-border/40',
              locked && 'opacity-60'
            )}>
              <div className={cn(
                'h-7 w-7 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0',
                isCompleted ? 'bg-emerald-500 text-white' : isInProgress ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
              )}>
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : (a.sequence_order || idx + 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className={cn('text-xs sm:text-sm font-medium leading-tight truncate', isCompleted && 'line-through text-muted-foreground')}>{a.title}</p>
                  {a.is_sequence_strict && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>Strict order: earlier steps required</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Badge variant="outline" className={cn('text-[9px] py-0 h-4', ACTIVITY_TONE[a.activity_type])}>
                    {ACTIVITY_TYPE_LABELS[a.activity_type]}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] py-0 h-4 font-mono bg-primary/5 border-primary/20 text-primary">
                    +{a.weight}%
                  </Badge>
                </div>
              </div>
              <div className="shrink-0">
                {locked ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" disabled className="h-7 px-2 text-[11px]">
                        <Lock className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Complete previous activities first</TooltipContent>
                  </Tooltip>
                ) : isCompleted ? (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
                    onClick={() => onSet(a.id, 'in_progress', rec?.id ?? null)}>
                    <RotateCcw className="h-3 w-3 mr-1" />Reopen
                  </Button>
                ) : (
                  <Button size="sm" variant={isInProgress ? 'default' : 'outline'} className="h-7 px-2.5 text-[11px]"
                    onClick={() => onSet(a.id, 'completed', rec?.id ?? null)}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />Complete
                  </Button>
                )}
              </div>
            </div>
          </TooltipProvider>
        );
      })}
      <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/40 text-[11px] text-muted-foreground">
        <span>{completedCount}/{activities.length} done · weights {sumWeights}%</span>
        {nextLabel && nextThreshold !== null && (
          <span>Next: <span className="font-medium text-foreground">{nextLabel}</span> in {Math.max(0, nextThreshold - value)}%</span>
        )}
      </div>
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: number; tone?: 'emerald' | 'amber' }> = ({ label, value, tone }) => {
  const cls = tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground';
  return (
    <div className="rounded-xl bg-background/60 backdrop-blur border border-border/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('text-xl font-bold mt-0.5 tabular-nums', cls)}>{value}</p>
    </div>
  );
};

// ============ PROFILES TAB ============
const ProfilesTab: React.FC<any> = ({ profiles, competencies, links, people }) => {
  const { addProfile, linkCompetency, unlinkCompetency, updateProfileCompetency } = useCMSMutations();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);

  const submit = async () => {
    if (!form.name) return;
    try {
      await addProfile.mutateAsync(form);
      toast({ title: 'Profile created' });
      setOpen(false);
      setForm({ name: '', code: '', description: '' });
    } catch (e: any) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-primary/90"><Plus className="h-4 w-4 mr-1" />Add Profile</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Competence Profile</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. CRO" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={addProfile.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((p: any, idx: number) => {
          const compCount = links.filter((l: any) => l.profile_id === p.id).length;
          const peopleCount = people.filter((per: any) => per.profile_id === p.id).length;
          const grad = avatarGradient(p.id);
          return (
            <button key={p.id} onClick={() => setSelectedProfile(p)} className="text-left group">
              <Card className="relative overflow-hidden p-5 h-full border-border/40 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/40">
                <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', grad)} />
                <div className={cn('absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br opacity-10 blur-2xl transition-opacity group-hover:opacity-20', grad)} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn('h-10 w-10 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shadow-sm', grad)}>
                      <Layers className="h-5 w-5" />
                    </div>
                    {p.code && <Badge variant="outline" className="text-[10px] font-mono">{p.code}</Badge>}
                  </div>
                  <p className="font-semibold mt-3 leading-tight">{p.name}</p>
                  {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                  <div className="flex gap-4 mt-4 pt-3 border-t border-border/40">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Competencies</p>
                      <p className="text-lg font-bold tabular-nums">{compCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">People</p>
                      <p className="text-lg font-bold tabular-nums">{peopleCount}</p>
                    </div>
                    <div className="ml-auto self-end">
                      <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              </Card>
            </button>
          );
        })}
        {!profiles.length && (
          <div className="col-span-full text-center py-16 border border-dashed rounded-xl text-muted-foreground">
            <Layers className="h-8 w-8 opacity-30 mx-auto mb-2" />
            <p className="text-sm">No profiles yet. Create your first one.</p>
          </div>
        )}
      </div>

      <ProfileDetailSheet
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        competencies={competencies}
        links={links}
        onLink={(competency_id: string, required_milestone: 'knowledge'|'skill'|'mastery') =>
          linkCompetency.mutate({ profile_id: selectedProfile.id, competency_id, required_milestone })}
        onUpdate={(id: string, required_milestone: 'knowledge'|'skill'|'mastery') =>
          updateProfileCompetency.mutate({ id, required_milestone })}
        onUnlink={(id: string) => unlinkCompetency.mutate(id)}
      />
    </div>
  );
};

const ProfileDetailSheet: React.FC<any> = ({ profile, onClose, competencies, links, onLink, onUpdate, onUnlink }) => {
  const [pickedCompetency, setPickedCompetency] = useState<string>('');
  const [pickedLevel, setPickedLevel] = useState<'knowledge'|'skill'|'mastery'>('mastery');
  if (!profile) return null;
  const linked = links.filter((l: any) => l.profile_id === profile.id);
  const linkedIds = new Set(linked.map((l: any) => l.competency_id));
  const available = competencies.filter((c: any) => !linkedIds.has(c.id));

  const addNow = () => {
    if (!pickedCompetency) return;
    onLink(pickedCompetency, pickedLevel);
    setPickedCompetency('');
    setPickedLevel('mastery');
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div className={cn('h-8 w-8 rounded-lg bg-gradient-to-br text-white flex items-center justify-center', avatarGradient(profile.id))}>
              <Layers className="h-4 w-4" />
            </div>
            {profile.name}
          </SheetTitle>
          <SheetDescription>{profile.description || 'Set the required level for each competency in this profile.'}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Assigned Competencies</h3>
              <Badge variant="secondary">{linked.length}</Badge>
            </div>
            <div className="space-y-2">
              {linked.map((l: any) => {
                const c = competencies.find((x: any) => x.id === l.competency_id);
                const req: 'knowledge'|'skill'|'mastery' = l.required_milestone || 'mastery';
                const meta = MILESTONE_META[req];
                const tone = milestoneTone(req);
                const ReqIcon = meta.icon;
                return (
                  <Card key={l.id} className="p-3 border-border/50 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{c?.title}</p>
                        {c?.description && <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => onUnlink(l.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 h-7 px-2">Remove</Button>
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn('gap-1 text-[10px] font-medium border', tone.bg)}>
                        <Target className="h-2.5 w-2.5" /><ReqIcon className="h-2.5 w-2.5" /> Required: {meta.label}
                      </Badge>
                      <Select value={req} onValueChange={(v: any) => onUpdate(l.id, v)}>
                        <SelectTrigger className="h-7 w-[150px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="knowledge">Knowledge</SelectItem>
                          <SelectItem value="skill">Skill</SelectItem>
                          <SelectItem value="mastery">Mastery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </Card>
                );
              })}
              {!linked.length && <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">No competencies linked yet.</p>}
            </div>
          </div>
          <div className="border-t border-border/40 pt-4">
            <h3 className="text-sm font-semibold mb-2">Add Competency</h3>
            <div className="space-y-2">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Competency</Label>
                <Select value={pickedCompetency} onValueChange={setPickedCompetency}>
                  <SelectTrigger><SelectValue placeholder="Pick a competency" /></SelectTrigger>
                  <SelectContent>
                    {available.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Required Level</Label>
                <Select value={pickedLevel} onValueChange={(v: any) => setPickedLevel(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="knowledge">Knowledge — minimum awareness</SelectItem>
                    <SelectItem value="skill">Skill — able to perform</SelectItem>
                    <SelectItem value="mastery">Mastery — expert level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={addNow} disabled={!pickedCompetency} className="w-full mt-1">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add to profile
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ============ COMPETENCIES TAB ============
const CompetenciesTab: React.FC<any> = ({ competencies, links, activities }) => {
  const { addCompetency } = useCMSMutations();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', knowledge_threshold: 50, skill_threshold: 75, mastery_threshold: 100 });

  const submit = async () => {
    if (!form.title) return;
    try {
      await addCompetency.mutateAsync(form);
      toast({ title: 'Competency added' });
      setOpen(false);
      setForm({ title: '', description: '', knowledge_threshold: 50, skill_threshold: 75, mastery_threshold: 100 });
    } catch (e: any) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Card className="border-border/40 shadow-sm overflow-hidden">
      <div className="p-4 flex justify-end border-b border-border/40 bg-muted/20">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-primary/90"><Plus className="h-4 w-4 mr-1" />Add Competency</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Competency</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="pt-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Milestone thresholds (%)</Label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  <div>
                    <Label className="text-[10px] flex items-center gap-1"><Brain className="h-3 w-3 text-amber-500" />Knowledge</Label>
                    <Input type="number" min={0} max={100} value={form.knowledge_threshold} onChange={e => setForm({ ...form, knowledge_threshold: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-[10px] flex items-center gap-1"><Wrench className="h-3 w-3 text-blue-500" />Skill</Label>
                    <Input type="number" min={0} max={100} value={form.skill_threshold} onChange={e => setForm({ ...form, skill_threshold: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-[10px] flex items-center gap-1"><Trophy className="h-3 w-3 text-emerald-500" />Mastery</Label>
                    <Input type="number" min={0} max={100} value={form.mastery_threshold} onChange={e => setForm({ ...form, mastery_threshold: Number(e.target.value) })} />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={addCompetency.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/40">
            <TableHead className="text-[11px] uppercase tracking-wider">Title</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider">Description</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-right">Profiles</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-right">Activities</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {competencies.map((c: any) => {
            const profileCount = links.filter((l: any) => l.competency_id === c.id).length;
            const actCount = activities.filter((a: any) => a.competency_id === c.id).length;
            return (
              <TableRow key={c.id} className="border-border/40 hover:bg-muted/40 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm">{c.title}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs max-w-md truncate">{c.description || '—'}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="font-mono">{profileCount}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="font-mono">{actCount}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
          {!competencies.length && (
            <TableRow><TableCell colSpan={4} className="text-center py-16">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <BookOpen className="h-8 w-8 opacity-30" />
                <p className="text-sm">No competencies yet</p>
              </div>
            </TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
};

// ============ ACTIVITIES TAB ============
const ACTIVITY_TONE: Record<string, string> = {
  vendor_training: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  ojt: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  assessment: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  certification: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
};

const ActivitiesTab: React.FC<any> = ({ activities, competencies, competencyMap }) => {
  const { addActivity } = useCMSMutations();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; competency_id: string; activity_type: ActivityType; provider: string; duration_hours: string; description: string; weight: string; sequence_order: string; is_sequence_strict: boolean }>({
    title: '', competency_id: '', activity_type: 'vendor_training', provider: '', duration_hours: '', description: '', weight: '10', sequence_order: '1', is_sequence_strict: false,
  });
  const [filterType, setFilterType] = useState<string>('all');

  const submit = async () => {
    if (!form.title || !form.competency_id) return;
    try {
      await addActivity.mutateAsync({
        title: form.title,
        competency_id: form.competency_id,
        activity_type: form.activity_type,
        provider: form.provider || undefined,
        duration_hours: form.duration_hours ? Number(form.duration_hours) : undefined,
        description: form.description || undefined,
        weight: form.weight ? Number(form.weight) : 0,
        sequence_order: form.sequence_order ? Number(form.sequence_order) : 0,
        is_sequence_strict: form.is_sequence_strict,
      });
      toast({ title: 'Activity added' });
      setOpen(false);
      setForm({ title: '', competency_id: '', activity_type: 'vendor_training', provider: '', duration_hours: '', description: '', weight: '10', sequence_order: '1', is_sequence_strict: false });
    } catch (e: any) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); }
  };

  const filtered = activities.filter((a: any) => filterType === 'all' || a.activity_type === filterType);

  return (
    <Card className="border-border/40 shadow-sm overflow-hidden">
      <div className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border/40 bg-muted/20">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[220px] bg-background/60 border-border/60"><Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-primary/90"><Plus className="h-4 w-4 mr-1" />Add Activity</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Gap-Closure Activity</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div>
                <Label>Competency</Label>
                <Select value={form.competency_id} onValueChange={v => setForm({ ...form, competency_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select competency" /></SelectTrigger>
                  <SelectContent>{competencies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Activity Type</Label>
                <Select value={form.activity_type} onValueChange={(v: ActivityType) => setForm({ ...form, activity_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ACTIVITY_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Provider</Label><Input value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} /></div>
                <div><Label>Duration (hrs)</Label><Input type="number" value={form.duration_hours} onChange={e => setForm({ ...form, duration_hours: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-1">Weight (%)
                    <Tooltip><TooltipTrigger><AlertCircle className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>How much this activity contributes to closing the competency. All activity weights for a competency should sum to 100.</TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input type="number" min={0} max={100} value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
                </div>
                <div><Label>Sequence #</Label><Input type="number" min={1} value={form.sequence_order} onChange={e => setForm({ ...form, sequence_order: e.target.value })} /></div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3 bg-muted/30">
                <div className="space-y-0.5 pr-3">
                  <Label className="text-sm">Strict sequence</Label>
                  <p className="text-[11px] text-muted-foreground">Block this activity until earlier sequence steps are complete.</p>
                </div>
                <Switch checked={form.is_sequence_strict} onCheckedChange={(v) => setForm({ ...form, is_sequence_strict: v })} />
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={addActivity.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/40">
            <TableHead className="text-[11px] uppercase tracking-wider w-12">Seq</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider">Title</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider hidden md:table-cell">Competency</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider">Type</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-right">Weight</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-right hidden sm:table-cell">Hours</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((a: any) => (
            <TableRow key={a.id} className="border-border/40 hover:bg-muted/40 transition-colors">
              <TableCell className="font-mono text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  {a.sequence_order || '—'}
                  {a.is_sequence_strict && <Lock className="h-3 w-3 text-amber-500" />}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent-foreground flex items-center justify-center shrink-0">
                    <Target className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground md:hidden truncate">{competencyMap[a.competency_id]?.title || '—'}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs hidden md:table-cell">{competencyMap[a.competency_id]?.title || '—'}</TableCell>
              <TableCell>
                <Badge variant="outline" className={cn('text-[10px] font-medium', ACTIVITY_TONE[a.activity_type] || '')}>
                  {ACTIVITY_TYPE_LABELS[a.activity_type as ActivityType]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="outline" className="font-mono text-[10px] bg-primary/5 border-primary/20 text-primary">+{a.weight}%</Badge>
              </TableCell>
              <TableCell className="text-right text-xs font-mono hidden sm:table-cell">{a.duration_hours ? `${a.duration_hours}h` : '—'}</TableCell>
            </TableRow>
          ))}
          {!filtered.length && (
            <TableRow><TableCell colSpan={6} className="text-center py-16">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Target className="h-8 w-8 opacity-30" />
                <p className="text-sm">No activities</p>
              </div>
            </TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      </TooltipProvider>
    </Card>
  );
};

export default CMSLandingPage;
