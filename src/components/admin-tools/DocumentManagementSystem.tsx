import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, FileText, Plus, Pencil, Trash2, Search, 
  FileStack, Compass, FolderKanban, UserCircle, Factory, MapPin, Box 
} from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DocumentManagementSystemProps {
  onBack: () => void;
}

// Generic config item used by all tabs
interface ConfigItem {
  id: string;
  code: string;
  name: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

// Tab configuration
const TAB_CONFIG = [
  { id: 'document-type', label: 'Document Type', icon: FileStack, activeColor: 'text-blue-600 dark:text-blue-400' },
  { id: 'discipline', label: 'Discipline', icon: Compass, activeColor: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'project', label: 'Project', icon: FolderKanban, activeColor: 'text-violet-600 dark:text-violet-400' },
  { id: 'originator', label: 'Originator', icon: UserCircle, activeColor: 'text-amber-600 dark:text-amber-400' },
  { id: 'plant', label: 'Plant', icon: Factory, activeColor: 'text-rose-600 dark:text-rose-400' },
  { id: 'site', label: 'Site', icon: MapPin, activeColor: 'text-cyan-600 dark:text-cyan-400' },
  { id: 'unit', label: 'Unit', icon: Box, activeColor: 'text-orange-600 dark:text-orange-400' },
] as const;

// Mock data cleared — tabs will be connected to backend tables
const EMPTY_DATA: Record<TabId, ConfigItem[]> = {
  'document-type': [],
  'discipline': [],
  'project': [],
  'originator': [],
  'plant': [],
  'site': [],
  'unit': [],
};

const DocumentManagementSystem: React.FC<DocumentManagementSystemProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabId>('document-type');
  const [searchQuery, setSearchQuery] = useState('');

  // Per-tab data
  const [tabData, setTabData] = useState<Record<TabId, ConfigItem[]>>(MOCK_DATA);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigItem | null>(null);
  const [formItem, setFormItem] = useState<Partial<ConfigItem>>({});

  const currentTabConfig = TAB_CONFIG.find(t => t.id === activeTab)!;
  const currentData = tabData[activeTab] || [];

  const filteredData = currentData.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    if (!formItem.name || !formItem.code) {
      toast.error('Code and name are required');
      return;
    }
    if (editingItem) {
      setTabData(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].map(d => d.id === editingItem.id ? { ...d, ...formItem } as ConfigItem : d),
      }));
      toast.success(`${currentTabConfig.label} updated`);
    } else {
      const newItem: ConfigItem = {
        id: crypto.randomUUID(),
        code: formItem.code,
        name: formItem.name,
        description: formItem.description || '',
        display_order: currentData.length + 1,
        is_active: formItem.is_active ?? true,
      };
      setTabData(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], newItem],
      }));
      toast.success(`${currentTabConfig.label} created`);
    }
    setDialogOpen(false);
    setEditingItem(null);
    setFormItem({});
  };

  const handleDelete = (id: string) => {
    setTabData(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].filter(d => d.id !== id),
    }));
    toast.success(`${currentTabConfig.label} deleted`);
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setFormItem({ is_active: true });
    setDialogOpen(true);
  };

  const openEditDialog = (item: ConfigItem) => {
    setEditingItem(item);
    setFormItem(item);
    setDialogOpen(true);
  };

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
            <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
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
            <div className="flex items-center justify-between mb-6">
              <TabsList className="h-auto flex flex-wrap gap-1 bg-muted/50 p-1.5 rounded-lg">
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

              <div className="relative w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* All tabs share the same table layout */}
            {TAB_CONFIG.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-0">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between py-4">
                    <div>
                      <CardTitle className="text-lg">{tab.label}</CardTitle>
                      <CardDescription>Manage {tab.label.toLowerCase()} codes used in document numbering</CardDescription>
                    </div>
                    <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
                      <Plus className="h-4 w-4" /> Add {tab.label}
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead className="w-24">Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-20 text-center">Status</TableHead>
                          <TableHead className="w-20 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.sort((a, b) => a.display_order - b.display_order).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-muted-foreground text-sm">{item.display_order}</TableCell>
                            <TableCell className="font-mono text-xs font-semibold text-primary">{item.code}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{item.description}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={item.is_active ? 'default' : 'secondary'} className="text-xs">
                                {item.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(item)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredData.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No {tab.label.toLowerCase()} entries found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* Shared Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? `Edit ${currentTabConfig.label}` : `Add ${currentTabConfig.label}`}</DialogTitle>
            <DialogDescription>
              {editingItem ? `Update this ${currentTabConfig.label.toLowerCase()} entry` : `Create a new ${currentTabConfig.label.toLowerCase()} code`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={formItem.code || ''}
                  onChange={e => setFormItem(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. DWG"
                />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formItem.display_order ?? ''}
                  onChange={e => setFormItem(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formItem.name || ''}
                onChange={e => setFormItem(p => ({ ...p, name: e.target.value }))}
                placeholder={`e.g. ${currentTabConfig.label} name`}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formItem.description || ''}
                onChange={e => setFormItem(p => ({ ...p, description: e.target.value }))}
                rows={2}
                placeholder="Brief description..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formItem.is_active ?? true}
                onCheckedChange={v => setFormItem(p => ({ ...p, is_active: v }))}
              />
              <Label className="text-sm">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingItem ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentManagementSystem;
