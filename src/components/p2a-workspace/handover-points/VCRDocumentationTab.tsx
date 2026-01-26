import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  FileText, 
  User, 
  Calendar,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileWarning,
  Layers
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { AddDocumentSheet } from './AddDocumentSheet';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface VCRDocumentationTabProps {
  handoverPoint: P2AHandoverPoint;
}

type DocumentStatus = 'not_started' | 'draft' | 'in_review' | 'approved' | 'published';

interface VCRDocument {
  id: string;
  documentNumber: string;
  documentTypeCode: string;
  documentTypeName: string;
  title: string;
  tier: 1 | 2;
  status: DocumentStatus;
  version: string;
  owner: string;
  lastUpdated: string;
  systems: string[];
}

// Mock documents - in real implementation this would come from database
const mockDocuments: VCRDocument[] = [
  {
    id: '1',
    documentNumber: 'RLMU-T1-001',
    documentTypeCode: 'PX-2366',
    documentTypeName: 'Piping & Instrumentation Diagram (P&ID)',
    title: 'Gas Turbine P&ID Markups',
    tier: 1,
    status: 'published',
    version: '3.0',
    owner: 'John Smith',
    lastUpdated: '2024-01-15',
    systems: ['GTG-001', 'CMP-001']
  },
  {
    id: '2',
    documentNumber: 'RLMU-T1-002',
    documentTypeCode: 'PX-2367',
    documentTypeName: 'Cause & Effect Diagram',
    title: 'ESD Cause & Effect Matrix',
    tier: 1,
    status: 'approved',
    version: '2.5',
    owner: 'Sarah Johnson',
    lastUpdated: '2024-01-12',
    systems: ['GTG-001']
  },
  {
    id: '3',
    documentNumber: 'RLMU-T1-003',
    documentTypeCode: 'EX-3401',
    documentTypeName: 'Key Single Line Diagram',
    title: 'MV Switchgear SLD',
    tier: 1,
    status: 'in_review',
    version: '1.8',
    owner: 'Mike Chen',
    lastUpdated: '2024-01-10',
    systems: ['STG-001']
  },
  {
    id: '4',
    documentNumber: 'RLMU-T2-001',
    documentTypeCode: 'MN-8001',
    documentTypeName: 'RCM Plan',
    title: 'Compressor Train Maintenance Strategy',
    tier: 2,
    status: 'draft',
    version: '1.0',
    owner: 'Lisa Wong',
    lastUpdated: '2024-01-08',
    systems: ['CMP-001']
  },
];

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string; icon: React.ReactNode }> = {
  'not_started': { 
    label: 'Not Started', 
    className: 'bg-slate-100 text-slate-600 border-slate-300',
    icon: <FileWarning className="w-3 h-3" />
  },
  'draft': { 
    label: 'Draft', 
    className: 'bg-amber-50 text-amber-600 border-amber-300',
    icon: <Clock className="w-3 h-3" />
  },
  'in_review': { 
    label: 'In Review', 
    className: 'bg-blue-50 text-blue-600 border-blue-300',
    icon: <AlertCircle className="w-3 h-3" />
  },
  'approved': { 
    label: 'Approved', 
    className: 'bg-green-50 text-green-600 border-green-300',
    icon: <CheckCircle2 className="w-3 h-3" />
  },
  'published': { 
    label: 'Published', 
    className: 'bg-emerald-50 text-emerald-600 border-emerald-300',
    icon: <CheckCircle2 className="w-3 h-3" />
  },
};

export const VCRDocumentationTab: React.FC<VCRDocumentationTabProps> = ({ handoverPoint }) => {
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [documents, setDocuments] = useState<VCRDocument[]>(mockDocuments);

  const tier1Docs = documents.filter(d => d.tier === 1);
  const tier2Docs = documents.filter(d => d.tier === 2);
  const publishedCount = documents.filter(d => d.status === 'published' || d.status === 'approved').length;

  const handleDocumentCreated = (newDoc: VCRDocument) => {
    setDocuments(prev => [...prev, newDoc]);
    setAddSheetOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-wrap items-center gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-amber-500">{documents.length}</div>
            <div className="text-[10px] text-muted-foreground">Total Documents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-orange-500">{tier1Docs.length}</div>
            <div className="text-[10px] text-muted-foreground">Tier 1 (Critical)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-blue-500">{tier2Docs.length}</div>
            <div className="text-[10px] text-muted-foreground">Tier 2 (Supporting)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-green-500">{publishedCount}</div>
            <div className="text-[10px] text-muted-foreground">Approved/Published</div>
          </CardContent>
        </Card>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddSheetOpen(true)}
          className="gap-2 ml-auto"
        >
          <Plus className="w-4 h-4" />
          Add Document
        </Button>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="font-medium text-lg">No Documents</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mt-1">
              Add Red Line Markup (RLMU) documents for this handover point.
            </p>
            <Button 
              onClick={() => setAddSheetOpen(true)} 
              className="mt-4 gap-2 bg-amber-500 hover:bg-amber-600"
            >
              <Plus className="w-4 h-4" />
              Add First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {/* Tier 1 Documents */}
            {tier1Docs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-300">
                    Tier 1 - Critical
                  </Badge>
                  <span className="text-xs text-muted-foreground">{tier1Docs.length} documents</span>
                </div>
                <div className="space-y-2">
                  {tier1Docs.map((doc) => (
                    <DocumentCard key={doc.id} document={doc} />
                  ))}
                </div>
              </div>
            )}

            {/* Tier 2 Documents */}
            {tier2Docs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-300">
                    Tier 2 - Supporting
                  </Badge>
                  <span className="text-xs text-muted-foreground">{tier2Docs.length} documents</span>
                </div>
                <div className="space-y-2">
                  {tier2Docs.map((doc) => (
                    <DocumentCard key={doc.id} document={doc} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Add Document Sheet */}
      <AddDocumentSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        handoverPoint={handoverPoint}
        onDocumentCreated={handleDocumentCreated}
      />
    </div>
  );
};

// Document Card Component
const DocumentCard: React.FC<{ document: VCRDocument }> = ({ document }) => {
  const statusInfo = STATUS_CONFIG[document.status];

  return (
    <Card className="cursor-pointer transition-all hover:border-amber-500/50 hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title and Type Code */}
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500 shrink-0" />
              <h4 className="font-medium truncate">{document.title}</h4>
            </div>

            {/* Document Type and Number */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground font-mono">
                {document.documentNumber}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground truncate">
                {document.documentTypeName}
              </span>
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <User className="w-3 h-3" />
                {document.owner}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <FileText className="w-3 h-3" />
                v{document.version}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {document.lastUpdated}
              </span>
            </div>

            {/* Systems */}
            {document.systems.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Layers className="w-3 h-3 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {document.systems.map((sys, idx) => (
                    <Badge key={idx} variant="outline" className="text-[10px] font-mono">
                      {sys}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Status Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <Badge 
              variant="outline"
              className={cn('whitespace-nowrap text-xs gap-1', statusInfo.className)}
            >
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
