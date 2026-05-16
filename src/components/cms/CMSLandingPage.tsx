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
import { GraduationCap, Users, BookOpen, Layers, Sparkles, Plus, Search } from 'lucide-react';
import {
  useCompetenceProfiles, useCompetencies, useProfileLinks, useActivities, usePeople,
  useOverallProgress, usePersonProgress, useCMSMutations, ACTIVITY_TYPE_LABELS, statusFromProgress,
  type CMSPerson, type ActivityType,
} from '@/hooks/useCMS';
import { toast } from '@/hooks/use-toast';

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  assessed: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  competent: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  expired: 'bg-destructive/15 text-destructive',
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

  return (
    <div className="flex-1 p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-sm">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Competence Management</h1>
          <p className="text-sm text-muted-foreground">Profiles, competencies, gap-closure activities and people readiness.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={<Users className="h-4 w-4" />} label="People" value={people.length} />
        <KPI icon={<Sparkles className="h-4 w-4" />} label="Avg Readiness" value={`${avgReadiness}%`} />
        <KPI icon={<BookOpen className="h-4 w-4" />} label="Competencies" value={competencies.length} />
        <KPI icon={<Layers className="h-4 w-4" />} label="Profiles" value={profiles.length} />
      </div>

      <Tabs defaultValue="people" className="w-full">
        <TabsList>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="competencies">Competencies</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="people">
          <PeopleTab people={people} profiles={profiles} overallMap={overallMap} profileMap={profileMap} competencyMap={competencyMap} links={links} activities={activities} />
        </TabsContent>
        <TabsContent value="profiles">
          <ProfilesTab profiles={profiles} competencies={competencies} links={links} people={people} />
        </TabsContent>
        <TabsContent value="competencies">
          <CompetenciesTab competencies={competencies} links={links} activities={activities} />
        </TabsContent>
        <TabsContent value="activities">
          <ActivitiesTab activities={activities} competencies={competencies} competencyMap={competencyMap} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const KPI: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <Card className="p-4 flex items-center gap-3">
    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  </Card>
);

// ============ PEOPLE TAB ============
const PeopleTab: React.FC<any> = ({ people, profiles, overallMap, profileMap, competencyMap, links, activities }) => {
  const { addPerson } = useCMSMutations();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CMSPerson | null>(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', staff_id: '', job_title: '', profile_id: '' });

  const filtered = people.filter((p: CMSPerson) => {
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
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, staff ID, job title..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Person</Button></DialogTrigger>
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
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Staff ID</TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead>Profile</TableHead>
            <TableHead className="w-[260px]">Overall Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((p: CMSPerson) => {
            const o = overallMap[p.id];
            const prof = p.profile_id ? profileMap[p.profile_id] : null;
            return (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                <TableCell className="font-mono text-xs">{p.staff_id}</TableCell>
                <TableCell className="text-muted-foreground">{p.job_title || '—'}</TableCell>
                <TableCell>{prof ? <Badge variant="secondary">{prof.code || prof.name}</Badge> : <span className="text-muted-foreground text-xs">Unassigned</span>}</TableCell>
                <TableCell>
                  <button
                    onClick={() => setSelected(p)}
                    className="w-full group flex items-center gap-3 hover:bg-muted/40 rounded-md p-1.5 transition-colors text-left"
                  >
                    <Progress value={o?.overall_progress || 0} className="h-2 flex-1" />
                    <span className="text-xs font-semibold w-10 text-right">{o?.overall_progress || 0}%</span>
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
          {!filtered.length && (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No people found.</TableCell></TableRow>
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

  const overall = profileLinks.length
    ? Math.round(profileLinks.reduce((s: number, l: any) => s + ((progressMap[l.competency_id]?.progress || 0) * l.weight), 0) / profileLinks.reduce((s: number, l: any) => s + l.weight, 0))
    : 0;

  const updateProgress = (competency_id: string, value: number) => {
    upsertProgress.mutate({ person_id: person.id, competency_id, progress: value, status: statusFromProgress(value) });
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{person.first_name} {person.last_name}</SheetTitle>
          <SheetDescription>{person.job_title || '—'} · {person.staff_id}{profile ? ` · ${profile.name}` : ''}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Overall Readiness</p>
            <div className="flex items-center gap-3">
              <Progress value={overall} className="h-3 flex-1" />
              <span className="text-2xl font-bold">{overall}%</span>
            </div>
          </Card>

          <div>
            <h3 className="text-sm font-semibold mb-3">Competency Breakdown</h3>
            {!profileLinks.length && <p className="text-sm text-muted-foreground">No competencies assigned. Assign a profile first.</p>}
            <div className="space-y-3">
              {profileLinks.map((l: any) => {
                const comp = competencyMap[l.competency_id];
                const pr = progressMap[l.competency_id];
                const val = pr?.progress || 0;
                const acts = activities.filter((a: any) => a.competency_id === l.competency_id);
                return (
                  <Card key={l.id} className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{comp?.title}</p>
                        {comp?.description && <p className="text-xs text-muted-foreground">{comp.description}</p>}
                      </div>
                      <Badge className={STATUS_COLORS[pr?.status || 'not_started']}>{(pr?.status || 'not_started').replace('_', ' ')}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={val} className="h-2 flex-1" />
                      <Input type="number" min={0} max={100} value={val} onChange={(e) => updateProgress(l.competency_id, Math.min(100, Math.max(0, Number(e.target.value))))} className="w-20 h-8 text-xs" />
                    </div>
                    {acts.length > 0 && (
                      <div className="pt-1 border-t">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Gap Closure Activities</p>
                        <div className="flex flex-wrap gap-1">
                          {acts.map((a: any) => (
                            <Badge key={a.id} variant="outline" className="text-[10px]">{ACTIVITY_TYPE_LABELS[a.activity_type as ActivityType]} · {a.title}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
    <Card className="p-4 space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Profile</Button></DialogTrigger>
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {profiles.map((p: any) => {
          const compCount = links.filter((l: any) => l.profile_id === p.id).length;
          const peopleCount = people.filter((per: any) => per.profile_id === p.id).length;
          return (
            <button key={p.id} onClick={() => setSelectedProfile(p)} className="text-left">
              <Card className="p-4 hover:border-primary/50 hover:shadow-sm transition-all h-full">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    {p.code && <Badge variant="secondary" className="mt-1 text-[10px]">{p.code}</Badge>}
                  </div>
                </div>
                {p.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.description}</p>}
                <div className="flex gap-3 mt-3 text-xs">
                  <span className="text-muted-foreground"><strong className="text-foreground">{compCount}</strong> competencies</span>
                  <span className="text-muted-foreground"><strong className="text-foreground">{peopleCount}</strong> people</span>
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      <ProfileDetailSheet
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        competencies={competencies}
        links={links}
        onLink={(competency_id) => linkCompetency.mutate({ profile_id: selectedProfile.id, competency_id })}
        onUnlink={(id) => unlinkCompetency.mutate(id)}
      />
    </Card>
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
          <SheetTitle>{profile.name}</SheetTitle>
          <SheetDescription>{profile.description || 'Manage competencies for this profile.'}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold mb-2">Assigned Competencies ({linked.length})</h3>
            <div className="space-y-2">
              {linked.map((l: any) => {
                const c = competencies.find((x: any) => x.id === l.competency_id);
                return (
                  <Card key={l.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{c?.title}</p>
                      {c?.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => onUnlink(l.id)}>Remove</Button>
                  </Card>
                );
              })}
              {!linked.length && <p className="text-sm text-muted-foreground">None yet.</p>}
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
    <Card className="p-4 space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Competency</Button></DialogTrigger>
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
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Profiles</TableHead>
            <TableHead className="text-right">Activities</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {competencies.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.title}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{c.description || '—'}</TableCell>
              <TableCell className="text-right">{links.filter((l: any) => l.competency_id === c.id).length}</TableCell>
              <TableCell className="text-right">{activities.filter((a: any) => a.competency_id === c.id).length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

// ============ ACTIVITIES TAB ============
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
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Activity</Button></DialogTrigger>
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
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Competency</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead className="text-right">Hours</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((a: any) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.title}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{competencyMap[a.competency_id]?.title || '—'}</TableCell>
              <TableCell><Badge variant="outline">{ACTIVITY_TYPE_LABELS[a.activity_type as ActivityType]}</Badge></TableCell>
              <TableCell className="text-muted-foreground text-xs">{a.provider || '—'}</TableCell>
              <TableCell className="text-right text-xs">{a.duration_hours || '—'}</TableCell>
            </TableRow>
          ))}
          {!filtered.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No activities.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
};

export default CMSLandingPage;
