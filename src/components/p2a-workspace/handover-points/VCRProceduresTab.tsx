import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  BookOpen, 
  FileText, 
  User, 
  Calendar,
  ChevronRight,
  Rocket,
  Settings
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { AddProcedureSheet } from './AddProcedureSheet';
import { ProcedureDetailModal, Procedure, ProcedureStatus } from '@/components/ora/ProcedureDetailModal';
import { format } from 'date-fns';
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

export const VCRProceduresTab: React.FC<VCRProceduresTabProps> = ({ handoverPoint }) => {
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [procedures, setProcedures] = useState<Procedure[]>(mockProcedures);

  const handleProcedureClick = (procedure: Procedure) => {
    setSelectedProcedure(procedure);
    setDetailModalOpen(true);
  };

  const handleStatusChange = (procedureId: string, newStatus: ProcedureStatus) => {
    setProcedures(prev => 
      prev.map(p => p.id === procedureId ? { ...p, status: newStatus } : p)
    );
    // Update selected procedure if it's the one being modified
    if (selectedProcedure?.id === procedureId) {
      setSelectedProcedure(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const startupCount = procedures.filter(p => p.type === 'startup').length;
  const normalCount = procedures.filter(p => p.type === 'normal').length;
  const approvedCount = procedures.filter(p => p.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-wrap items-center gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-emerald-500">{procedures.length}</div>
            <div className="text-[10px] text-muted-foreground">Total Procedures</div>
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
            <div className="text-[10px] text-muted-foreground">Normal Operating</div>
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
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {procedures.map((procedure) => (
              <ProcedureCard 
                key={procedure.id} 
                procedure={procedure}
                onClick={() => handleProcedureClick(procedure)}
              />
            ))}
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
}> = ({ procedure, onClick }) => {
  const statusInfo = STATUS_CONFIG[procedure.status];

  return (
    <Card 
      className="cursor-pointer transition-all hover:border-emerald-500/50 hover:shadow-sm"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title and Type */}
            <div className="flex items-center gap-2">
              {procedure.type === 'startup' ? (
                <Rocket className="w-4 h-4 text-orange-500 shrink-0" />
              ) : (
                <Settings className="w-4 h-4 text-blue-500 shrink-0" />
              )}
              <h4 className="font-medium truncate">{procedure.title}</h4>
            </div>

            {/* Document Number */}
            <p className="text-xs text-muted-foreground font-mono mt-1">
              {procedure.procedureNumber}
            </p>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 mt-3 text-xs">
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

          {/* Right Side - Status Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <Badge 
              variant="outline"
              className={cn('whitespace-nowrap text-xs', statusInfo.className)}
            >
              {statusInfo.label}
            </Badge>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
