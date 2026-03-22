import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Plus, 
  FileText, 
  User, 
  Calendar,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileWarning,
  Layers,
  Search
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { AddDocumentSheet } from './AddDocumentSheet';
import { cn } from '@/lib/utils';

interface VCRDocumentationTabProps {
  handoverPoint: P2AHandoverPoint;
}

type DocumentStatus = 'not_started' | 'draft' | 'in_review' | 'approved' | 'published';
type DocumentCategory = 'all' | 'afc' | 'rlmu' | 'asb';

interface VCRDocument {
  id: string;
  documentNumber: string;
  documentTypeCode: string;
  documentTypeName: string;
  title: string;
  tier: 1 | 2;
  category: 'afc' | 'rlmu' | 'asb';
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
    category: 'rlmu',
    status: 'published',
    version: '3.0',
    owner: 'Operations Engineer 1',
    lastUpdated: '2024-01-15',
    systems: ['GTG-001', 'CMP-001']
  },
  {
    id: '2',
    documentNumber: 'AFC-T1-001',
    documentTypeCode: 'PX-2367',
    documentTypeName: 'Cause & Effect Diagram',
    title: 'ESD Cause & Effect Matrix',
    tier: 1,
    category: 'afc',
    status: 'approved',
    version: '2.5',
    owner: 'Process Engineer',
    lastUpdated: '2024-01-12',
    systems: ['GTG-001']
  },
  {
    id: '3',
    documentNumber: 'RLMU-T1-002',
    documentTypeCode: 'EX-3401',
    documentTypeName: 'Key Single Line Diagram',
    title: 'MV Switchgear SLD',
    tier: 1,
    category: 'rlmu',
    status: 'in_review',
    version: '1.8',
    owner: 'Mike Chen',
    lastUpdated: '2024-01-10',
    systems: ['STG-001']
  },
  {
    id: '4',
    documentNumber: 'ASB-T2-001',
    documentTypeCode: 'MN-8001',
    documentTypeName: 'RCM Plan',
    title: 'Compressor Train Maintenance Strategy',
    tier: 2,
    category: 'asb',
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

const CATEGORY_CONFIG: Record<string, { label: string; description: string }> = {
  'afc': { label: 'AFC', description: 'Approved for Construction' },
  'rlmu': { label: 'RLMU', description: 'Red Line Markup' },
  'asb': { label: 'ASB', description: 'As-Built' },
};

export const VCRDocumentationTab: React.FC<VCRDocumentationTabProps> = ({ handoverPoint }) => {
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [documents, setDocuments] = useState<VCRDocument[]>(mockDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory>('all');
  const [tier1Open, setTier1Open] = useState(false);
  const [tier2Open, setTier2Open] = useState(false);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(d => {
      const matchesSearch = searchQuery === '' ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.documentTypeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.owner.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, categoryFilter]);

  const tier1Docs = filteredDocuments.filter(d => d.tier === 1);
  const tier2Docs = filteredDocuments.filter(d => d.tier === 2);
  const publishedCount = documents.filter(d => d.status === 'published' || d.status === 'approved').length;

  const handleDocumentCreated = (newDoc: VCRDocument) => {
    setDocuments(prev => [...prev, newDoc]);
    setAddSheetOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex flex-wrap items-center gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-amber-500">{documents.length}</div>
            <div className="text-[10px] text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-orange-500">{documents.filter(d => d.tier === 1).length}</div>
            <div className="text-[10px] text-muted-foreground">Tier 1</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-blue-500">{documents.filter(d => d.tier === 2).length}</div>
            <div className="text-[10px] text-muted-foreground">Tier 2</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-green-500">{publishedCount}</div>
            <div className="text-[10px] text-muted-foreground">Complete</div>
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

      {/* Search and Category Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as DocumentCategory)}>
          <TabsList className="grid grid-cols-4 w-auto">
            <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
            <TabsTrigger value="afc" className="text-xs px-3">AFC</TabsTrigger>
            <TabsTrigger value="rlmu" className="text-xs px-3">RLMU</TabsTrigger>
            <TabsTrigger value="asb" className="text-xs px-3">ASB</TabsTrigger>
          </TabsList>
        </Tabs>
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
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No documents match your search</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-3">
            {/* Tier 1 Documents - Collapsible */}
            {tier1Docs.length > 0 && (
              <Collapsible open={tier1Open} onOpenChange={setTier1Open}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  {tier1Open ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-300">
                    Tier 1 - Critical
                  </Badge>
                  <span className="text-xs text-muted-foreground">{tier1Docs.length} documents</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 space-y-2 mt-2">
                  {tier1Docs.map((doc) => (
                    <DocumentCard key={doc.id} document={doc} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Tier 2 Documents - Collapsible */}
            {tier2Docs.length > 0 && (
              <Collapsible open={tier2Open} onOpenChange={setTier2Open}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  {tier2Open ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-300">
                    Tier 2 - Supporting
                  </Badge>
                  <span className="text-xs text-muted-foreground">{tier2Docs.length} documents</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 space-y-2 mt-2">
                  {tier2Docs.map((doc) => (
                    <DocumentCard key={doc.id} document={doc} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
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
  const categoryInfo = CATEGORY_CONFIG[document.category];

  return (
    <Card className="cursor-pointer transition-all hover:border-amber-500/50 hover:shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500 shrink-0" />
              <h4 className="font-medium text-sm truncate">{document.title}</h4>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {categoryInfo.label}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground font-mono">
                {document.documentNumber}
              </span>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground truncate">
                {document.documentTypeName}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
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

          <div className="flex items-center gap-2 shrink-0">
            <Badge 
              variant="outline"
              className={cn('whitespace-nowrap text-[10px] gap-1', statusInfo.className)}
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
