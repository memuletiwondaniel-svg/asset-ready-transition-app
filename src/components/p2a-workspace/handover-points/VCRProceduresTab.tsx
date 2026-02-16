import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  BookOpen, 
  FileText, 
  User, 
  Calendar,
  ChevronRight,
  Rocket,
  Settings,
  Search,
  Trash2
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { AddProcedureSheet } from './AddProcedureSheet';
import { ProcedureDetailModal, Procedure, ProcedureStatus } from '@/components/ora/ProcedureDetailModal';
import { cn } from '@/lib/utils';

interface VCRProceduresTabProps {
  handoverPoint: P2AHandoverPoint;
}

// Mock data for procedures - in real implementation this would come from database
const mockProcedures: Procedure[] = [
  {
    id: '1',
    procedureNumber: 'BGC-ISGP-N001-OA-6523-001',
    title: 'Gas Turbine Initial Start-up Procedure',
    type: 'startup',
    status: 'approved',
    version: '2.1',
    owner: 'John Smith',
    lastUpdated: '2024-01-15',
  },
  {
    id: '2',
    procedureNumber: 'BGC-ISGP-N001-OA-6523-002',
    title: 'Compressor Normal Operating Procedure',
    type: 'normal',
    status: 'site_validation',
    version: '1.3',
    owner: 'Sarah Johnson',
    lastUpdated: '2024-01-10',
  },
  {
    id: '3',
    procedureNumber: 'BGC-ISGP-N001-OA-6523-003',
    title: 'Emergency Shutdown Procedure',
    type: 'startup',
    status: 'draft',
    version: '1.0',
    owner: 'Mike Chen',
    lastUpdated: '2024-01-08',
  },
];

const STATUS_CONFIG: Record<ProcedureStatus, { label: string; className: string }> = {
  'not_started': { label: 'Not Started', className: 'bg-slate-100 text-slate-600 border-slate-300' },
  'draft': { label: 'Draft', className: 'bg-amber-50 text-amber-600 border-amber-300' },
  'site_validation': { label: 'Site Validation', className: 'bg-purple-50 text-purple-600 border-purple-300' },
  'final_review': { label: 'Final Review', className: 'bg-blue-50 text-blue-600 border-blue-300' },
  'translated': { label: 'Translated', className: 'bg-cyan-50 text-cyan-600 border-cyan-300' },
  'approved': { label: 'Approved for Use', className: 'bg-green-50 text-green-600 border-green-300' },
};

type ProcedureFilter = 'all' | 'startup' | 'normal';

export const VCRProceduresTab: React.FC<VCRProceduresTabProps> = ({ handoverPoint }) => {
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [procedures, setProcedures] = useState<Procedure[]>(mockProcedures);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProcedureFilter>('all');

  const handleProcedureClick = (procedure: Procedure) => {
    setSelectedProcedure(procedure);
    setDetailModalOpen(true);
  };

  const handleDeleteProcedure = (id: string) => {
    setProcedures(prev => prev.filter(p => p.id !== id));
  };

  const handleStatusChange = (procedureId: string, newStatus: ProcedureStatus) => {
    setProcedures(prev => 
      prev.map(p => p.id === procedureId ? { ...p, status: newStatus } : p)
    );
    if (selectedProcedure?.id === procedureId) {
      setSelectedProcedure(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  // Filtered procedures based on search and type
  const filteredProcedures = useMemo(() => {
    return procedures.filter(p => {
      const matchesSearch = searchQuery === '' || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.procedureNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.owner.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === 'all' || p.type === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [procedures, searchQuery, typeFilter]);

  // Grouped procedures
  const startupProcedures = filteredProcedures.filter(p => p.type === 'startup');
  const normalProcedures = filteredProcedures.filter(p => p.type === 'normal');

  const startupCount = procedures.filter(p => p.type === 'startup').length;
  const normalCount = procedures.filter(p => p.type === 'normal').length;
  const approvedCount = procedures.filter(p => p.status === 'approved').length;

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex flex-wrap items-center gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-emerald-500">{procedures.length}</div>
            <div className="text-[10px] text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-orange-500">{startupCount}</div>
            <div className="text-[10px] text-muted-foreground">Start-up</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-blue-500">{normalCount}</div>
            <div className="text-[10px] text-muted-foreground">Normal Op</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-green-500">{approvedCount}</div>
            <div className="text-[10px] text-muted-foreground">Approved</div>
          </CardContent>
        </Card>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddSheetOpen(true)}
          className="gap-2 ml-auto"
        >
          <Plus className="w-4 h-4" />
          Add Procedure
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search procedures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as ProcedureFilter)}>
          <TabsList className="grid grid-cols-3 w-auto">
            <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
            <TabsTrigger value="startup" className="text-xs px-3 gap-1">
              <Rocket className="w-3 h-3" />
              Start-up
            </TabsTrigger>
            <TabsTrigger value="normal" className="text-xs px-3 gap-1">
              <Settings className="w-3 h-3" />
              Normal
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Procedures List */}
      {procedures.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="font-medium text-lg">No Procedures</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mt-1">
              Add procedures for this handover point to track start-up and operating documentation.
            </p>
            <Button 
              onClick={() => setAddSheetOpen(true)} 
              className="mt-4 gap-2 bg-emerald-500 hover:bg-emerald-600"
            >
              <Plus className="w-4 h-4" />
              Add First Procedure
            </Button>
          </CardContent>
        </Card>
      ) : filteredProcedures.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No procedures match your search</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-4">
            {/* Grouped by type when showing all */}
            {typeFilter === 'all' ? (
              <>
                {startupProcedures.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium">Initial Start-up Procedures</span>
                      <Badge variant="outline" className="text-[10px]">{startupProcedures.length}</Badge>
                    </div>
                    <div className="space-y-2 pl-6">
                      {startupProcedures.map((procedure) => (
                        <ProcedureCard 
                          key={procedure.id} 
                          procedure={procedure}
                          onClick={() => handleProcedureClick(procedure)}
                          onDelete={handleDeleteProcedure}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {normalProcedures.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Normal Operating Procedures</span>
                      <Badge variant="outline" className="text-[10px]">{normalProcedures.length}</Badge>
                    </div>
                    <div className="space-y-2 pl-6">
                      {normalProcedures.map((procedure) => (
                        <ProcedureCard 
                          key={procedure.id} 
                          procedure={procedure}
                          onClick={() => handleProcedureClick(procedure)}
                          onDelete={handleDeleteProcedure}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                {filteredProcedures.map((procedure) => (
                  <ProcedureCard 
                    key={procedure.id} 
                    procedure={procedure}
                    onClick={() => handleProcedureClick(procedure)}
                    onDelete={handleDeleteProcedure}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Add Procedure Sheet */}
      <AddProcedureSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        handoverPoint={handoverPoint}
        onProcedureCreated={(newProcedure) => {
          setProcedures(prev => [...prev, newProcedure]);
          setAddSheetOpen(false);
        }}
      />

      {/* Procedure Detail Modal */}
      <ProcedureDetailModal
        procedure={selectedProcedure}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

// Procedure Card Component
const ProcedureCard: React.FC<{ 
  procedure: Procedure; 
  onClick: () => void;
  onDelete: (id: string) => void;
}> = ({ procedure, onClick, onDelete }) => {
  const statusInfo = STATUS_CONFIG[procedure.status];
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <Card 
        className="cursor-pointer transition-all hover:border-emerald-500/50 hover:shadow-sm group relative"
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {procedure.type === 'startup' ? (
                  <Rocket className="w-4 h-4 text-orange-500 shrink-0" />
                ) : (
                  <Settings className="w-4 h-4 text-blue-500 shrink-0" />
                )}
                <h4 className="font-medium text-sm truncate">{procedure.title}</h4>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-1">
                {procedure.procedureNumber}
              </p>
              <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <User className="w-3 h-3" />
                  {procedure.owner}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <FileText className="w-3 h-3" />
                  v{procedure.version}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {procedure.lastUpdated}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteDialogOpen(true);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
                aria-label="Delete procedure"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <Badge 
                variant="outline"
                className={cn('whitespace-nowrap text-[10px]', statusInfo.className)}
              >
                {statusInfo.label}
              </Badge>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Procedure</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">"{procedure.title}"</span>? This action cannot be undone and all associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(procedure.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
