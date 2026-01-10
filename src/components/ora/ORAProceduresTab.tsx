import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  FileText, 
  Rocket, 
  Settings, 
  Plus,
  Download,
  MoreHorizontal,
  ChevronDown
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ProcedureDetailModal, ProcedureStatus, Procedure } from './ProcedureDetailModal';
import { useLanguage } from '@/contexts/LanguageContext';

const mockProcedures: Procedure[] = [
  // Initial Start-up Procedures
  { id: '1', procedureNumber: 'ISU-001', title: 'Gas Turbine Initial Start-up Procedure', type: 'startup', status: 'approved', version: '2.1', owner: 'John Smith', lastUpdated: '2024-01-15' },
  { id: '2', procedureNumber: 'ISU-002', title: 'Compressor Train Commissioning & Start-up', type: 'startup', status: 'final_review', version: '1.3', owner: 'Sarah Johnson', lastUpdated: '2024-01-10' },
  { id: '3', procedureNumber: 'ISU-003', title: 'Heat Recovery Steam Generator (HRSG) Start-up', type: 'startup', status: 'site_validation', version: '1.0', owner: 'Mike Chen', lastUpdated: '2024-01-08' },
  { id: '4', procedureNumber: 'ISU-004', title: 'Process Gas Heater Light-off Procedure', type: 'startup', status: 'approved', version: '3.0', owner: 'Emily Davis', lastUpdated: '2024-01-12' },
  { id: '5', procedureNumber: 'ISU-005', title: 'Electrical Systems Energization Sequence', type: 'startup', status: 'translated', version: '2.5', owner: 'Robert Wilson', lastUpdated: '2024-01-05' },
  { id: '6', procedureNumber: 'ISU-006', title: 'Instrument Air System Commissioning', type: 'startup', status: 'draft', version: '0.2', owner: 'Lisa Brown', lastUpdated: '2024-01-03' },
  { id: '7', procedureNumber: 'ISU-007', title: 'Cooling Water System Start-up', type: 'startup', status: 'not_started', version: '-', owner: 'TBD', lastUpdated: '-' },
  // Normal Operating Procedures
  { id: '8', procedureNumber: 'NOP-001', title: 'Gas Turbine Normal Operating Procedure', type: 'normal', status: 'approved', version: '4.2', owner: 'John Smith', lastUpdated: '2024-01-14' },
  { id: '9', procedureNumber: 'NOP-002', title: 'Compressor Surge Control & Monitoring', type: 'normal', status: 'approved', version: '2.0', owner: 'Sarah Johnson', lastUpdated: '2024-01-11' },
  { id: '10', procedureNumber: 'NOP-003', title: 'Production Separator Operation', type: 'normal', status: 'translated', version: '1.5', owner: 'Lisa Brown', lastUpdated: '2024-01-09' },
  { id: '11', procedureNumber: 'NOP-004', title: 'Flare System Operation & Monitoring', type: 'normal', status: 'final_review', version: '1.2', owner: 'David Lee', lastUpdated: '2024-01-07' },
  { id: '12', procedureNumber: 'NOP-005', title: 'Chemical Injection System Operation', type: 'normal', status: 'site_validation', version: '2.0', owner: 'Amanda Taylor', lastUpdated: '2024-01-13' },
  { id: '13', procedureNumber: 'NOP-006', title: 'Water Treatment Plant Operation', type: 'normal', status: 'approved', version: '3.1', owner: 'Chris Martin', lastUpdated: '2024-01-06' },
  { id: '14', procedureNumber: 'NOP-007', title: 'Emergency Shutdown (ESD) System Testing', type: 'normal', status: 'draft', version: '0.5', owner: 'Jennifer White', lastUpdated: '2024-01-04' },
  { id: '15', procedureNumber: 'NOP-008', title: 'Fuel Gas System Operation', type: 'normal', status: 'not_started', version: '-', owner: 'TBD', lastUpdated: '-' },
];

interface ORAProceduresTabProps {
  oraPlanId: string;
}

type StatusFilter = ProcedureStatus | 'all' | 'in_progress';

export const ORAProceduresTab: React.FC<ORAProceduresTabProps> = ({ oraPlanId }) => {
  const { translations: t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [startupOpen, setStartupOpen] = useState(true);
  const [normalOpen, setNormalOpen] = useState(true);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [procedures, setProcedures] = useState<Procedure[]>(mockProcedures);

  const getStatusBadge = (status: ProcedureStatus) => {
    const statusConfig: Record<ProcedureStatus, { label: string; className: string }> = {
      'not_started': { label: t.statusNotStarted || 'Not Started', className: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600' },
      'draft': { label: t.statusDraft || 'Draft', className: 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700' },
      'site_validation': { label: t.statusSiteValidation || 'Site Validation', className: 'bg-purple-50 text-purple-600 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700' },
      'final_review': { label: t.statusFinalReview || 'Final Review', className: 'bg-blue-50 text-blue-600 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700' },
      'translated': { label: t.statusTranslated || 'Translated', className: 'bg-cyan-50 text-cyan-600 border-cyan-300 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-700' },
      'approved': { label: t.statusApprovedForUse || 'Approved for Use', className: 'bg-green-50 text-green-600 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700' },
    };
    const config = statusConfig[status];
    return <Badge variant="outline" className={`${config.className} whitespace-nowrap text-xs`}>{config.label}</Badge>;
  };

  const handleRowClick = (procedure: Procedure) => {
    setSelectedProcedure(procedure);
    setModalOpen(true);
  };

  const handleStatusChange = (procedureId: string, newStatus: ProcedureStatus) => {
    setProcedures(prev => prev.map(p => 
      p.id === procedureId ? { ...p, status: newStatus } : p
    ));
    setSelectedProcedure(prev => prev ? { ...prev, status: newStatus } : null);
  };

  const filteredProcedures = procedures.filter(proc => {
    const matchesSearch = 
      proc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proc.procedureNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proc.owner.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'approved') {
      matchesStatus = proc.status === 'approved';
    } else if (statusFilter === 'not_started') {
      matchesStatus = proc.status === 'not_started';
    } else if (statusFilter === 'in_progress') {
      matchesStatus = !['not_started', 'approved'].includes(proc.status);
    } else if (statusFilter !== 'all') {
      matchesStatus = proc.status === statusFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  const startupProcedures = filteredProcedures.filter(p => p.type === 'startup');
  const normalProcedures = filteredProcedures.filter(p => p.type === 'normal');

  const stats = {
    total: procedures.length,
    approved: procedures.filter(p => p.status === 'approved').length,
    inProgress: procedures.filter(p => !['not_started', 'approved'].includes(p.status)).length,
    notStarted: procedures.filter(p => p.status === 'not_started').length,
  };

  const StatCard = ({ 
    count, 
    label, 
    filter, 
    bgColor, 
    iconColor 
  }: { 
    count: number; 
    label: string; 
    filter: StatusFilter; 
    bgColor: string; 
    iconColor: string;
  }) => (
    <Card 
      className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${statusFilter === filter ? 'ring-2 ring-primary' : ''}`}
      onClick={() => setStatusFilter(statusFilter === filter ? 'all' : filter)}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <FileText className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{count}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  const ProcedureTable = ({ procedures, title, icon: Icon, iconColor, open, onOpenChange }: { 
    procedures: Procedure[]; 
    title: string; 
    icon: React.ElementType; 
    iconColor: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
                <Badge variant="secondary">{procedures.length}</Badge>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[60px]">{t.serialNumber || 'S/N'}</TableHead>
                  <TableHead>{t.title || 'Title'}</TableHead>
                  <TableHead className="w-[160px]">{t.documentNumber || 'Document #'}</TableHead>
                  <TableHead className="w-[150px]">{t.status || 'Status'}</TableHead>
                  <TableHead className="w-[80px]">{t.version || 'Version'}</TableHead>
                  <TableHead className="w-[120px] whitespace-nowrap">{t.lastUpdated || 'Last Updated'}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {procedures.map((proc, index) => (
                  <TableRow 
                    key={proc.id} 
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => handleRowClick(proc)}
                  >
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{proc.title}</TableCell>
                    <TableCell className="font-mono text-sm">{proc.procedureNumber}</TableCell>
                    <TableCell>{getStatusBadge(proc.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{proc.version}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{proc.lastUpdated}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRowClick(proc)}>{t.viewDetails || "View Details"}</DropdownMenuItem>
                          <DropdownMenuItem>{t.edit || "Edit"}</DropdownMenuItem>
                          <DropdownMenuItem>{t.download || "Download"}</DropdownMenuItem>
                          <DropdownMenuItem>{t.updateStatus || "Update Status"}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats - Clickable Filters */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          count={stats.total} 
          label={t.total || "Total"} 
          filter="all"
          bgColor="bg-slate-100 dark:bg-slate-800"
          iconColor="text-slate-600 dark:text-slate-400"
        />
        <StatCard 
          count={stats.approved} 
          label={t.approved || "Approved"} 
          filter="approved"
          bgColor="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600 dark:text-green-400"
        />
        <StatCard 
          count={stats.inProgress} 
          label={t.inProgress || "In Progress"} 
          filter="in_progress"
          bgColor="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
        />
        <StatCard 
          count={stats.notStarted} 
          label={t.statusNotStarted || "Not Started"} 
          filter="not_started"
          bgColor="bg-slate-100 dark:bg-slate-800"
          iconColor="text-slate-500 dark:text-slate-500"
        />
      </div>

      {/* Active Filter Indicator */}
      {statusFilter !== 'all' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t.filteringBy || "Filtering by"}:</span>
          <Badge variant="secondary" className="gap-1">
            {statusFilter === 'in_progress' ? (t.inProgress || 'In Progress') : 
             statusFilter === 'approved' ? (t.approved || 'Approved') :
             statusFilter === 'not_started' ? (t.statusNotStarted || 'Not Started') :
             statusFilter === 'draft' ? (t.statusDraft || 'Draft') :
             statusFilter === 'site_validation' ? (t.statusSiteValidation || 'Site Validation') :
             statusFilter === 'final_review' ? (t.statusFinalReview || 'Final Review') :
             (t.statusTranslated || 'Translated')}
            <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-destructive">×</button>
          </Badge>
        </div>
      )}

      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.searchProcedures || "Search procedures..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex-1" />
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          {t.export || "Export"}
        </Button>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          {t.addProcedure || "Add Procedure"}
        </Button>
      </div>

      {/* Procedure Tables */}
      <div className="space-y-4">
        <ProcedureTable 
          procedures={startupProcedures} 
          title={t.initialStartupProcedures || "Initial Start-up Procedures"} 
          icon={Rocket}
          iconColor="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
          open={startupOpen}
          onOpenChange={setStartupOpen}
        />
        <ProcedureTable 
          procedures={normalProcedures} 
          title={t.normalOperatingProcedures || "Normal Operating Procedures"} 
          icon={Settings}
          iconColor="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          open={normalOpen}
          onOpenChange={setNormalOpen}
        />
      </div>

      {filteredProcedures.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">{t.noProceduresFound || "No procedures found"}</h3>
            <p className="text-muted-foreground">{t.adjustSearchCriteria || "Try adjusting your search criteria or filter"}</p>
          </CardContent>
        </Card>
      )}

      {/* Procedure Detail Modal */}
      <ProcedureDetailModal
        procedure={selectedProcedure}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};
