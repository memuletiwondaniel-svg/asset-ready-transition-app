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
import {
  GraduationCap, Users, BookOpen, Layers, Sparkles, Plus, Search,
  TrendingUp, Award, Target, ChevronRight, Filter, MoreHorizontal,
  CheckCircle2, Clock, AlertCircle, Activity,
} from 'lucide-react';
import {
  useCompetenceProfiles, useCompetencies, useProfileLinks, useActivities, usePeople,
  useOverallProgress, usePersonProgress, useCMSMutations, ACTIVITY_TYPE_LABELS, statusFromProgress,
  type CMSPerson, type ActivityType,
} from '@/hooks/useCMS';
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

      <div className="p-6 md:p-8">
        <Tabs defaultValue="people" className="w-full">
          <TabsList className="bg-muted/50 backdrop-blur p-1 h-auto rounded-xl border border-border/40 shadow-sm">
            <TabsTrigger value="people" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md gap-2 px-4 py-2">
              <Users className="h-3.5 w-3.5" /> People
            </TabsTrigger>
            <TabsTrigger value="profiles" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md gap-2 px-4 py-2">
              <Layers className="h-3.5 w-3.5" /> Profiles
            </TabsTrigger>
            <TabsTrigger value="competencies" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md gap-2 px-4 py-2">
              <BookOpen className="h-3.5 w-3.5" /> Competencies
            </TabsTrigger>
            <TabsTrigger value="activities" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md gap-2 px-4 py-2">
              <Target className="h-3.5 w-3.5" /> Activities
            </TabsTrigger>
          </TabsList>

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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CMSPerson | null>(null);
  const [profileFilter, setProfileFilter] = useState<string>('all');
  const [form, setForm] = useState({ first_name: '', last_name: '', staff_id: '', job_title: '', profile_id: '' });

  const filtered = people.filter((p: CMSPerson) => {
    if (profileFilter !== 'all' && p.profile_id !== profileFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return p.first_name.toLowerCase().includes(s) || p.last_name.toLowerCase().includes(s) || p.staff_id.toLowerCase().includes(s) || (p.job_title || '').toLowerCase().includes(s);
  });

  const submit = async () => {
    if (!form.first_name || !form.last_name || !form.staff_id) return;
    try {
      await addPerson.mutateAsync({ ...form, profile_id: form.profile_id || undefined } as any);
      toast({ title: 'Person added' });
      setOpen(false);
      setForm({ first_name: '', last_name: '', staff_id: '', job_title: '', profile_id: '' });
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
            <SelectTrigger className="w-[170px] bg-background/60 border-border/60"><Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" /><SelectValue /></SelectTrigger>
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

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/40">
            <TableHead className="text-[11px] uppercase tracking-wider">Person</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider">Staff ID</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider">Profile</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider w-[320px]">Readiness</TableHead>
            <TableHead className="w-12"></TableHead>
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
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={cn('h-9 w-9 rounded-full bg-gradient-to-br text-white flex items-center justify-center text-xs font-semibold shadow-sm ring-2 ring-background', avatarGradient(p.staff_id))}>
                      {initials(p.first_name, p.last_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-tight">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.job_title || '—'}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{p.staff_id}</TableCell>
                <TableCell>
                  {prof ? (
                    <Badge variant="secondary" className="font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15">
                      {prof.code || prof.name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700 group-hover:brightness-110', tone.bar)}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    <span className={cn('text-sm font-bold tabular-nums w-10 text-right', tone.text)}>{val}%</span>
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

// ============ PERSON PROGRESS SHEET ============
const PersonProgressSheet: React.FC<any> = ({ person, onClose, links, competencyMap, activities, profileMap }) => {
  const { data: progress = [] } = usePersonProgress(person?.id ?? null);
  const { upsertProgress } = useCMSMutations();

  if (!person) return null;
  const profile = person.profile_id ? profileMap[person.profile_id] : null;
  const profileLinks = links.filter((l: any) => l.profile_id === person.profile_id);
  const progressMap: Record<string, any> = Object.fromEntries(progress.map((p: any) => [p.competency_id, p]));

  const totalWeight = profileLinks.reduce((s: number, l: any) => s + l.weight, 0) || 1;
  const overall = profileLinks.length
    ? Math.round(profileLinks.reduce((s: number, l: any) => s + ((progressMap[l.competency_id]?.progress || 0) * l.weight), 0) / totalWeight)
    : 0;
  const tone = readinessTone(overall);

  const competentCount = profileLinks.filter((l: any) => (progressMap[l.competency_id]?.progress || 0) >= 85).length;

  const updateProgress = (competency_id: string, value: number) => {
    upsertProgress.mutate({ person_id: person.id, competency_id, progress: value, status: statusFromProgress(value) });
  };

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
                <MiniStat label="Competent" value={competentCount} tone="emerald" />
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
              const pr = progressMap[l.competency_id];
              const val = pr?.progress || 0;
              const t = readinessTone(val);
              const meta = STATUS_META[pr?.status || 'not_started'];
              const acts = activities.filter((a: any) => a.competency_id === l.competency_id);
              return (
                <Card key={l.id} className="p-3 border-border/50 transition-all hover:shadow-md hover:border-primary/30 group">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{comp?.title}</p>
                      {comp?.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{comp.description}</p>}
                    </div>
                    <Badge variant="outline" className={cn('gap-1 text-[10px] font-medium border', meta.badge)}>
                      {meta.icon}
                      {meta.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                      <div className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', t.bar)} style={{ width: `${val}%` }} />
                    </div>
                    <Input
                      type="number" min={0} max={100} value={val}
                      onChange={(e) => updateProgress(l.competency_id, Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-16 h-7 text-xs text-center font-mono"
                    />
                  </div>
                  {acts.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-border/40">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Gap Closure</p>
                      <div className="flex flex-wrap gap-1">
                        {acts.map((a: any) => (
                          <Badge key={a.id} variant="outline" className="text-[10px] font-normal bg-muted/40">
                            {ACTIVITY_TYPE_LABELS[a.activity_type as ActivityType]} · {a.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
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
  const { addProfile, linkCompetency, unlinkCompetency } = useCMSMutations();
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
        onLink={(competency_id: string) => linkCompetency.mutate({ profile_id: selectedProfile.id, competency_id })}
        onUnlink={(id: string) => unlinkCompetency.mutate(id)}
      />
    </div>
  );
};

const ProfileDetailSheet: React.FC<any> = ({ profile, onClose, competencies, links, onLink, onUnlink }) => {
  if (!profile) return null;
  const linked = links.filter((l: any) => l.profile_id === profile.id);
  const linkedIds = new Set(linked.map((l: any) => l.competency_id));
  const available = competencies.filter((c: any) => !linkedIds.has(c.id));

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
          <SheetDescription>{profile.description || 'Manage competencies for this profile.'}</SheetDescription>
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
                return (
                  <Card key={l.id} className="p-3 flex items-center justify-between border-border/50 hover:border-primary/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{c?.title}</p>
                      {c?.description && <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => onUnlink(l.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">Remove</Button>
                  </Card>
                );
              })}
              {!linked.length && <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">No competencies linked yet.</p>}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Add Competency</h3>
            <Select onValueChange={(v) => onLink(v)}>
              <SelectTrigger><SelectValue placeholder="Pick a competency to add" /></SelectTrigger>
              <SelectContent>
                {available.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
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
  const [form, setForm] = useState({ title: '', description: '' });

  const submit = async () => {
    if (!form.title) return;
    try {
      await addCompetency.mutateAsync(form);
      toast({ title: 'Competency added' });
      setOpen(false);
      setForm({ title: '', description: '' });
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
  const [form, setForm] = useState<{ title: string; competency_id: string; activity_type: ActivityType; provider: string; duration_hours: string; description: string }>({
    title: '', competency_id: '', activity_type: 'vendor_training', provider: '', duration_hours: '', description: '',
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
      });
      toast({ title: 'Activity added' });
      setOpen(false);
      setForm({ title: '', competency_id: '', activity_type: 'vendor_training', provider: '', duration_hours: '', description: '' });
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
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={addActivity.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/40">
            <TableHead className="text-[11px] uppercase tracking-wider">Title</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider">Competency</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider">Type</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider">Provider</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-right">Hours</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((a: any) => (
            <TableRow key={a.id} className="border-border/40 hover:bg-muted/40 transition-colors">
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent-foreground flex items-center justify-center shrink-0">
                    <Target className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-sm">{a.title}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">{competencyMap[a.competency_id]?.title || '—'}</TableCell>
              <TableCell>
                <Badge variant="outline" className={cn('text-[10px] font-medium', ACTIVITY_TONE[a.activity_type] || '')}>
                  {ACTIVITY_TYPE_LABELS[a.activity_type as ActivityType]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">{a.provider || '—'}</TableCell>
              <TableCell className="text-right text-xs font-mono">{a.duration_hours ? `${a.duration_hours}h` : '—'}</TableCell>
            </TableRow>
          ))}
          {!filtered.length && (
            <TableRow><TableCell colSpan={5} className="text-center py-16">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Target className="h-8 w-8 opacity-30" />
                <p className="text-sm">No activities</p>
              </div>
            </TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
};

export default CMSLandingPage;
