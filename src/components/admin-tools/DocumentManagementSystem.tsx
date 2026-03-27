import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, ArrowUp, ArrowDown, FileText, Plus, Trash2, Search, 
  FileStack, Compass, FolderKanban, UserCircle, Factory, MapPin, Box, Loader2, CheckSquare, Settings2
} from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DmsProjectsTab from './dms/DmsProjectsTab';
import DmsPlantsTab from './dms/DmsPlantsTab';
import DmsSitesTab from './dms/DmsSitesTab';
import DmsOriginatorsTab from './dms/DmsOriginatorsTab';
import DmsUnitsTab from './dms/DmsUnitsTab';
import DmsDocumentTypesTab from './dms/DmsDocumentTypesTab';
import DmsStatusCodesTab from './dms/DmsStatusCodesTab';
import DmsConfigurationTab from './dms/DmsConfigurationTab';
import DmsAcronymsTab from './dms/DmsAcronymsTab';

interface DocumentManagementSystemProps {
  onBack: () => void;
}

// Tab configuration
const TAB_CONFIG = [
  { id: 'document-type', label: 'Document', icon: FileStack, activeColor: 'text-blue-600 dark:text-blue-400' },
  { id: 'discipline', label: 'Discipline', icon: Compass, activeColor: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'project', label: 'Project', icon: FolderKanban, activeColor: 'text-violet-600 dark:text-violet-400' },
  { id: 'originator', label: 'Originator', icon: UserCircle, activeColor: 'text-amber-600 dark:text-amber-400' },
  { id: 'plant', label: 'Plant', icon: Factory, activeColor: 'text-rose-600 dark:text-rose-400' },
  { id: 'site', label: 'Site', icon: MapPin, activeColor: 'text-cyan-600 dark:text-cyan-400' },
  { id: 'unit', label: 'Unit', icon: Box, activeColor: 'text-orange-600 dark:text-orange-400' },
  { id: 'status-code', label: 'Status Code', icon: CheckSquare, activeColor: 'text-teal-600 dark:text-teal-400' },
  { id: 'configuration', label: 'Configuration', icon: Settings2, activeColor: 'text-gray-600 dark:text-gray-400' },
] as const;

type TabId = typeof TAB_CONFIG[number]['id'];

interface DisciplineRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

type SortCol = 'code' | 'name' | 'is_active' | null;

const DocumentManagementSystem: React.FC<DocumentManagementSystemProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabId>('discipline');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DisciplineRow | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Sort state
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortCol(null); setSortDir('asc'); }
    } else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />;
  };
  // ─── Discipline CRUD ───
  const { data: disciplines = [], isLoading: disciplinesLoading } = useQuery({
    queryKey: ['dms-disciplines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dms_disciplines')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as DisciplineRow[];
    },
  });

  const createDiscipline = useMutation({
    mutationFn: async (item: { code: string; name: string; is_active: boolean }) => {
      const maxOrder = disciplines.length > 0 ? Math.max(...disciplines.map(d => d.display_order)) : 0;
      const { error } = await supabase
        .from('dms_disciplines')
        .insert({ code: item.code, name: item.name, is_active: item.is_active, display_order: maxOrder + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dms-disciplines'] });
      toast.success('Discipline created');
      setSheetOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create discipline'),
  });

  const updateDiscipline = useMutation({
    mutationFn: async (item: { id: string; code: string; name: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('dms_disciplines')
        .update({ code: item.code, name: item.name, is_active: item.is_active, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dms-disciplines'] });
      toast.success('Discipline updated');
      setSheetOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update discipline'),
  });

  const deleteDiscipline = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dms_disciplines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dms-disciplines'] });
      toast.success('Discipline deleted');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete discipline'),
  });

  // ─── Sorted & filtered data ───
  const sorted = useMemo(() => {
    const filtered = disciplines.filter(d =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'is_active') cmp = (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1);
      else cmp = (a[sortCol] || '').localeCompare(b[sortCol] || '');
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [disciplines, searchQuery, sortCol, sortDir]);

  // ─── Sheet helpers ───
  const openAddSheet = () => {
    setEditingItem(null);
    setFormCode('');
    setFormName('');
    setFormIsActive(true);
    setSheetOpen(true);
  };

  const openEditSheet = (item: DisciplineRow) => {
    setEditingItem(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormIsActive(item.is_active);
    setSheetOpen(true);
  };
  const handleSave = () => {
    if (!formCode.trim() || !formName.trim()) {
      toast.error('Code and name are required');
      return;
    }
    const payload = { code: formCode.trim(), name: formName.trim(), is_active: formIsActive };
    if (editingItem) {
      updateDiscipline.mutate({ id: editingItem.id, ...payload });
    } else {
      createDiscipline.mutate(payload);
    }
  };
  const isSaving = createDiscipline.isPending || updateDiscipline.isPending;

  // Placeholder content for non-discipline tabs
  const renderPlaceholderTab = (tabLabel: string) => (
    <Card>
      <CardContent className="py-16 text-center">
        <p className="text-muted-foreground">
          {tabLabel} configuration — backend table not yet created.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl px-6 py-4 sticky top-0 z-10">
        <BreadcrumbNavigation
          currentPageLabel="Document Management"
          favoritePath="/admin-tools/document-management"
          customBreadcrumbs={[
            { label: 'Home', path: '/', onClick: () => window.location.href = '/' },
            { label: 'Administration', path: '/admin-tools', onClick: onBack }
          ]}
        />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Document Management
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configure document numbering attributes and classification codes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabId); setSearchQuery(''); }} className="w-full">
            <TabsList className="h-auto flex flex-wrap gap-1 bg-muted/50 p-1.5 rounded-lg mb-6">
              {TAB_CONFIG.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm"
                  >
                    <Icon className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? tab.activeColor : "text-muted-foreground"
                    )} />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* ─── Discipline Tab (connected to backend) ─── */}
            <TabsContent value="discipline" className="mt-0">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-lg">Discipline</CardTitle>
                    <CardDescription>Manage discipline codes used in document numbering</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-56">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
                    </div>
                    <Button size="sm" className="gap-1.5" onClick={openAddSheet}>
                      <Plus className="h-4 w-4" /> Add Discipline
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 max-h-[calc(100vh-280px)] overflow-auto">
                  {disciplinesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-12 text-xs font-medium uppercase tracking-wider text-muted-foreground">#</TableHead>
                          <TableHead className="w-24 text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('code')}>Code<SortIcon col="code" /></TableHead>
                          <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('name')}>Discipline Name<SortIcon col="name" /></TableHead>
                          <TableHead className="w-20 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('is_active')}>Status<SortIcon col="is_active" /></TableHead>
                          <TableHead className="w-16 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sorted.map((item, idx) => (
                          <TableRow key={item.id} className="group border-border/40 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openEditSheet(item)}>
                            <TableCell className="text-muted-foreground text-xs tabular-nums">{idx + 1}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center justify-center h-6 min-w-[2.5rem] px-1.5 rounded bg-muted text-xs font-mono font-medium text-foreground">
                                {item.code}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-foreground">{item.name}</TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className={`h-1.5 w-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                                {item.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); deleteDiscipline.mutate(item.id); }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {sorted.length === 0 && !disciplinesLoading && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No disciplines found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Project Tab (connected to backend) ─── */}
            <TabsContent value="project" className="mt-0">
              <DmsProjectsTab />
            </TabsContent>

            {/* ─── Plant Tab (connected to backend) ─── */}
            <TabsContent value="plant" className="mt-0">
              <DmsPlantsTab />
            </TabsContent>

            {/* ─── Site Tab (connected to backend) ─── */}
            <TabsContent value="site" className="mt-0">
              <DmsSitesTab />
            </TabsContent>

            {/* ─── Originator Tab (connected to backend) ─── */}
            <TabsContent value="originator" className="mt-0">
              <DmsOriginatorsTab />
            </TabsContent>

            {/* ─── Unit Tab (connected to backend) ─── */}
            <TabsContent value="unit" className="mt-0">
              <DmsUnitsTab />
            </TabsContent>

            {/* ─── Document Type Tab (connected to backend) ─── */}
            <TabsContent value="document-type" className="mt-0">
              <DmsDocumentTypesTab />
            </TabsContent>

            {/* ─── Status Code Tab (connected to backend) ─── */}
            <TabsContent value="status-code" className="mt-0">
              <DmsStatusCodesTab />
            </TabsContent>

            {/* ─── Configuration Tab ─── */}
            <TabsContent value="configuration" className="mt-0">
              <DmsConfigurationTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add / Edit Discipline Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md z-[150] flex flex-col">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-lg font-semibold">{editingItem ? 'Edit Discipline' : 'Add Discipline'}</SheetTitle>
            <SheetDescription>{editingItem ? 'Modify the discipline details below.' : 'Fill in the details to create a new discipline code.'}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4 flex-1 overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Code <span className="text-destructive">*</span></Label>
              <Input value={formCode} onChange={e => setFormCode(e.target.value.toUpperCase())} placeholder="e.g. EA" maxLength={10} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Discipline Name <span className="text-destructive">*</span></Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Electrical" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Active Status</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Enable or disable this discipline</p>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
          </div>
          <SheetFooter className="pt-4 border-t gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Save Changes' : 'Create Discipline'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DocumentManagementSystem;
