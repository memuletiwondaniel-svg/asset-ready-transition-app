import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Flame, 
  Snowflake, 
  FileText, 
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  Layers,
  Pencil,
  Save
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { P2ASystem, useP2ASubsystems } from '../hooks/useP2ASystems';
import { format } from 'date-fns';

interface SystemDetailOverlayProps {
  system: P2ASystem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateSystem?: (id: string, updates: Partial<P2ASystem>) => void;
  isUpdating?: boolean;
}

const CHART_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'];

export const SystemDetailOverlay: React.FC<SystemDetailOverlayProps> = ({
  system,
  open,
  onOpenChange,
  onUpdateSystem,
  isUpdating = false,
}) => {
  const { subsystems, isLoading: subsystemsLoading } = useP2ASubsystems(system.id);
  
  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: system.name,
    system_id: system.system_id,
    is_hydrocarbon: system.is_hydrocarbon,
    completion_status: system.completion_status,
    completion_percentage: system.completion_percentage,
    target_rfo_date: system.target_rfo_date || '',
    target_rfsu_date: system.target_rfsu_date || '',
    punchlist_a_count: system.punchlist_a_count,
    punchlist_b_count: system.punchlist_b_count,
    itr_a_count: system.itr_a_count,
    itr_b_count: system.itr_b_count,
  });
  
  // Reset form when system changes
  useEffect(() => {
    setEditFormData({
      name: system.name,
      system_id: system.system_id,
      is_hydrocarbon: system.is_hydrocarbon,
      completion_status: system.completion_status,
      completion_percentage: system.completion_percentage,
      target_rfo_date: system.target_rfo_date || '',
      target_rfsu_date: system.target_rfsu_date || '',
      punchlist_a_count: system.punchlist_a_count,
      punchlist_b_count: system.punchlist_b_count,
      itr_a_count: system.itr_a_count,
      itr_b_count: system.itr_b_count,
    });
  }, [system]);
  
  const handleSaveChanges = () => {
    if (onUpdateSystem) {
      onUpdateSystem(system.id, {
        ...editFormData,
        target_rfo_date: editFormData.target_rfo_date || undefined,
        target_rfsu_date: editFormData.target_rfsu_date || undefined,
      });
    }
  };

  // Chart data
  const punchlistData = [
    { name: 'Category A', value: system.punchlist_a_count, color: '#ef4444' },
    { name: 'Category B', value: system.punchlist_b_count, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const itrData = [
    { name: 'ITR-A', value: system.itr_a_count, color: '#3b82f6' },
    { name: 'ITR-B', value: system.itr_b_count, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-emerald-500 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-amber-500 text-white"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Not Started</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                system.is_hydrocarbon 
                  ? 'bg-orange-500/10 text-orange-500' 
                  : 'bg-blue-500/10 text-blue-500'
              }`}>
                {system.is_hydrocarbon ? (
                  <Flame className="w-5 h-5" />
                ) : (
                  <Snowflake className="w-5 h-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-xl">{system.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="font-mono text-xs">
                    {system.system_id}
                  </Badge>
                  <Badge className={
                    system.completion_status === 'RFSU' ? 'bg-emerald-500' :
                    system.completion_status === 'RFO' ? 'bg-blue-500' :
                    system.completion_status === 'IN_PROGRESS' ? 'bg-amber-500' :
                    'bg-slate-500'
                  }>
                    {system.completion_status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{system.completion_percentage}%</div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="edit" className="gap-2">
              <Pencil className="w-4 h-4" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="subsystems" className="gap-2">
              <Layers className="w-4 h-4" />
              Subsystems
            </TabsTrigger>
            <TabsTrigger value="punchlist" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Punchlist
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Overview Tab */}
            <TabsContent value="overview" className="m-0 space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Punchlist A</div>
                    <div className="text-2xl font-bold text-red-500">{system.punchlist_a_count}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Punchlist B</div>
                    <div className="text-2xl font-bold text-amber-500">{system.punchlist_b_count}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">ITR-A Outstanding</div>
                    <div className="text-2xl font-bold text-blue-500">{system.itr_a_count}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">ITR-B Outstanding</div>
                    <div className="text-2xl font-bold text-purple-500">{system.itr_b_count}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Outstanding Punchlist</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {punchlistData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={punchlistData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {punchlistData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                        <CheckCircle2 className="w-8 h-8 mr-2 text-emerald-500" />
                        No outstanding punchlist
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Outstanding ITRs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {itrData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={itrData}>
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                            {itrData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                        <CheckCircle2 className="w-8 h-8 mr-2 text-emerald-500" />
                        No outstanding ITRs
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Dates */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Target Dates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-xs text-muted-foreground">Target RFO</div>
                      <div className="font-medium">
                        {system.target_rfo_date 
                          ? format(new Date(system.target_rfo_date), 'dd MMM yyyy')
                          : 'Not set'}
                      </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-xs text-muted-foreground">Target RFSU</div>
                      <div className="font-medium">
                        {system.target_rfsu_date 
                          ? format(new Date(system.target_rfsu_date), 'dd MMM yyyy')
                          : 'Not set'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Edit Tab */}
            <TabsContent value="edit" className="m-0 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">System Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">System Name</Label>
                      <Input
                        id="edit-name"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-system-id">System ID</Label>
                      <Input
                        id="edit-system-id"
                        value={editFormData.system_id}
                        onChange={(e) => setEditFormData({ ...editFormData, system_id: e.target.value })}
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-status">Completion Status</Label>
                      <Select
                        value={editFormData.completion_status}
                        onValueChange={(value) => setEditFormData({ 
                          ...editFormData, 
                          completion_status: value as P2ASystem['completion_status'] 
                        })}
                      >
                        <SelectTrigger id="edit-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="RFO">RFO</SelectItem>
                          <SelectItem value="RFSU">RFSU</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-percentage">Completion %</Label>
                      <Input
                        id="edit-percentage"
                        type="number"
                        min={0}
                        max={100}
                        value={editFormData.completion_percentage}
                        onChange={(e) => setEditFormData({ 
                          ...editFormData, 
                          completion_percentage: parseInt(e.target.value) || 0 
                        })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Switch
                      id="edit-hydrocarbon"
                      checked={editFormData.is_hydrocarbon}
                      onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_hydrocarbon: checked })}
                    />
                    <Label htmlFor="edit-hydrocarbon" className="flex items-center gap-2 cursor-pointer">
                      {editFormData.is_hydrocarbon ? (
                        <>
                          <Flame className="w-4 h-4 text-orange-500" />
                          Hydrocarbon System
                        </>
                      ) : (
                        <>
                          <Snowflake className="w-4 h-4 text-blue-500" />
                          Non-Hydrocarbon System
                        </>
                      )}
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Target Dates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-rfo-date">Target RFO Date</Label>
                      <Input
                        id="edit-rfo-date"
                        type="date"
                        value={editFormData.target_rfo_date}
                        onChange={(e) => setEditFormData({ ...editFormData, target_rfo_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-rfsu-date">Target RFSU Date</Label>
                      <Input
                        id="edit-rfsu-date"
                        type="date"
                        value={editFormData.target_rfsu_date}
                        onChange={(e) => setEditFormData({ ...editFormData, target_rfsu_date: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Counts (Manual Override)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-pl-a">Punchlist A</Label>
                      <Input
                        id="edit-pl-a"
                        type="number"
                        min={0}
                        value={editFormData.punchlist_a_count}
                        onChange={(e) => setEditFormData({ 
                          ...editFormData, 
                          punchlist_a_count: parseInt(e.target.value) || 0 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-pl-b">Punchlist B</Label>
                      <Input
                        id="edit-pl-b"
                        type="number"
                        min={0}
                        value={editFormData.punchlist_b_count}
                        onChange={(e) => setEditFormData({ 
                          ...editFormData, 
                          punchlist_b_count: parseInt(e.target.value) || 0 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-itr-a">ITR-A</Label>
                      <Input
                        id="edit-itr-a"
                        type="number"
                        min={0}
                        value={editFormData.itr_a_count}
                        onChange={(e) => setEditFormData({ 
                          ...editFormData, 
                          itr_a_count: parseInt(e.target.value) || 0 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-itr-b">ITR-B</Label>
                      <Input
                        id="edit-itr-b"
                        type="number"
                        min={0}
                        value={editFormData.itr_b_count}
                        onChange={(e) => setEditFormData({ 
                          ...editFormData, 
                          itr_b_count: parseInt(e.target.value) || 0 
                        })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveChanges} disabled={isUpdating} className="gap-2">
                  <Save className="w-4 h-4" />
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </TabsContent>

            {/* Subsystems Tab */}
            <TabsContent value="subsystems" className="m-0">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-muted-foreground">
                  {subsystems.length} subsystems
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export Excel
                </Button>
              </div>

              {subsystems.length > 0 ? (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subsystem ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>MC Status</TableHead>
                        <TableHead>PCC Status</TableHead>
                        <TableHead>PL-A</TableHead>
                        <TableHead>PL-B</TableHead>
                        <TableHead>ITRs</TableHead>
                        <TableHead>Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subsystems.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-mono text-xs">{sub.subsystem_id}</TableCell>
                          <TableCell>{sub.name}</TableCell>
                          <TableCell>{getStatusBadge(sub.mc_status)}</TableCell>
                          <TableCell>{getStatusBadge(sub.pcc_status)}</TableCell>
                          <TableCell>{sub.punchlist_a_count}</TableCell>
                          <TableCell>{sub.punchlist_b_count}</TableCell>
                          <TableCell>{sub.itr_count}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={sub.completion_percentage} className="w-16 h-1.5" />
                              <span className="text-xs">{sub.completion_percentage}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Layers className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">No subsystems defined</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Punchlist Tab */}
            <TabsContent value="punchlist" className="m-0">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-muted-foreground">
                  {system.punchlist_a_count + system.punchlist_b_count} total punchlist items
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export Report
                </Button>
              </div>

              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Punchlist details are synced from your completions management system.
                    Connect via API to view individual items.
                  </p>
                  <Button variant="outline" className="mt-4">
                    Connect API
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
