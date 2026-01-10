import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  FileText, 
  Shield,
  BookOpen,
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

type DocumentStatus = 'not_started' | 'draft' | 'in_review' | 'approved' | 'published';

interface Document {
  id: string;
  documentNumber: string;
  documentTypeCode: string;
  documentType: string;
  title: string;
  tier: 1 | 2;
  status: DocumentStatus;
  version: string;
  owner: string;
  lastUpdated: string;
}

const mockDocuments: Document[] = [
  // Tier 1 - Critical Documentation
  { id: '1', documentNumber: 'RLMU-T1-001', documentTypeCode: '2365', documentType: 'Process Engineering Flow Scheme', title: 'Operations Philosophy Document', tier: 1, status: 'published', version: '3.0', owner: 'Operations Manager', lastUpdated: '2024-01-15' },
  { id: '2', documentNumber: 'RLMU-T1-002', documentTypeCode: '2366', documentType: 'Maintenance Strategy', title: 'Maintenance Strategy & Philosophy', tier: 1, status: 'approved', version: '2.5', owner: 'Maintenance Lead', lastUpdated: '2024-01-12' },
  { id: '3', documentNumber: 'RLMU-T1-003', documentTypeCode: '2367', documentType: 'Integrity Management Plan', title: 'Asset Integrity Management Plan', tier: 1, status: 'in_review', version: '1.8', owner: 'Integrity Engineer', lastUpdated: '2024-01-10' },
  { id: '4', documentNumber: 'RLMU-T1-004', documentTypeCode: '2368', documentType: 'HSSE Manual', title: 'HSSE Management System Manual', tier: 1, status: 'published', version: '4.1', owner: 'HSSE Manager', lastUpdated: '2024-01-08' },
  { id: '5', documentNumber: 'RLMU-T1-005', documentTypeCode: '2369', documentType: 'Emergency Response Plan', title: 'Emergency Response Plan', tier: 1, status: 'published', version: '5.0', owner: 'Emergency Coordinator', lastUpdated: '2024-01-05' },
  { id: '6', documentNumber: 'RLMU-T1-006', documentTypeCode: '2370', documentType: 'Process Safety Plan', title: 'Process Safety Management Plan', tier: 1, status: 'approved', version: '2.3', owner: 'Process Safety Lead', lastUpdated: '2024-01-14' },
  { id: '7', documentNumber: 'RLMU-T1-007', documentTypeCode: '2371', documentType: 'Control Narrative', title: 'Control System Narrative', tier: 1, status: 'draft', version: '0.5', owner: 'Control Engineer', lastUpdated: '2024-01-03' },
  { id: '8', documentNumber: 'RLMU-T1-008', documentTypeCode: '2372', documentType: 'Alarm Philosophy', title: 'Alarm Management Philosophy', tier: 1, status: 'not_started', version: '-', owner: 'TBD', lastUpdated: '-' },
  // Tier 2 - Supporting Documentation
  { id: '9', documentNumber: 'RLMU-T2-001', documentTypeCode: '2401', documentType: 'Competency Framework', title: 'Competency Assurance Framework', tier: 2, status: 'published', version: '2.0', owner: 'Training Coordinator', lastUpdated: '2024-01-13' },
  { id: '10', documentNumber: 'RLMU-T2-002', documentTypeCode: '2402', documentType: 'PTW Procedure', title: 'Permit to Work Procedures', tier: 2, status: 'approved', version: '3.2', owner: 'Operations Supervisor', lastUpdated: '2024-01-11' },
  { id: '11', documentNumber: 'RLMU-T2-003', documentTypeCode: '2403', documentType: 'MOC Procedure', title: 'Management of Change Procedure', tier: 2, status: 'in_review', version: '1.5', owner: 'Technical Authority', lastUpdated: '2024-01-09' },
  { id: '12', documentNumber: 'RLMU-T2-004', documentTypeCode: '2404', documentType: 'RCM Plan', title: 'Reliability Centered Maintenance Plan', tier: 2, status: 'draft', version: '1.0', owner: 'Reliability Engineer', lastUpdated: '2024-01-07' },
  { id: '13', documentNumber: 'RLMU-T2-005', documentTypeCode: '2405', documentType: 'Spare Parts Strategy', title: 'Spare Parts Management Strategy', tier: 2, status: 'approved', version: '2.1', owner: 'Materials Manager', lastUpdated: '2024-01-06' },
  { id: '14', documentNumber: 'RLMU-T2-006', documentTypeCode: '2406', documentType: 'Contractor Management', title: 'Contractor Management Procedure', tier: 2, status: 'published', version: '2.8', owner: 'Contracts Lead', lastUpdated: '2024-01-04' },
  { id: '15', documentNumber: 'RLMU-T2-007', documentTypeCode: '2407', documentType: 'Corrosion Strategy', title: 'Corrosion Management Strategy', tier: 2, status: 'in_review', version: '1.3', owner: 'Corrosion Engineer', lastUpdated: '2024-01-03' },
  { id: '16', documentNumber: 'RLMU-T2-008', documentTypeCode: '2408', documentType: 'Environmental Plan', title: 'Environmental Management Plan', tier: 2, status: 'approved', version: '2.4', owner: 'Environmental Advisor', lastUpdated: '2024-01-02' },
  { id: '17', documentNumber: 'RLMU-T2-009', documentTypeCode: '2409', documentType: 'Isolation Procedure', title: 'Isolation & Lock-out Procedure', tier: 2, status: 'not_started', version: '-', owner: 'TBD', lastUpdated: '-' },
];

interface ORADocumentationTabProps {
  oraPlanId: string;
}

export const ORADocumentationTab: React.FC<ORADocumentationTabProps> = ({ oraPlanId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tier1Open, setTier1Open] = useState(true);
  const [tier2Open, setTier2Open] = useState(true);

  const getStatusBadge = (status: DocumentStatus) => {
    const statusConfig: Record<DocumentStatus, { label: string; className: string }> = {
      'not_started': { label: 'Not Started', className: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600' },
      'draft': { label: 'Draft', className: 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700' },
      'in_review': { label: 'In Review', className: 'bg-blue-50 text-blue-600 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700' },
      'approved': { label: 'Approved', className: 'bg-cyan-50 text-cyan-600 border-cyan-300 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-700' },
      'published': { label: 'Published', className: 'bg-green-50 text-green-600 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700' },
    };
    const config = statusConfig[status];
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentTypeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.owner.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const tier1Docs = filteredDocuments.filter(d => d.tier === 1);
  const tier2Docs = filteredDocuments.filter(d => d.tier === 2);

  const stats = {
    total: mockDocuments.length,
    tier1: mockDocuments.filter(d => d.tier === 1).length,
    tier2: mockDocuments.filter(d => d.tier === 2).length,
    published: mockDocuments.filter(d => d.status === 'published').length,
  };

  const DocumentTable = ({ documents, title, icon: Icon, iconColor, open, onOpenChange }: { 
    documents: Document[]; 
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
                <Badge variant="secondary">{documents.length}</Badge>
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
                  <TableHead className="w-[120px]">Doc #</TableHead>
                  <TableHead className="w-[220px]">Document Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[80px]">Version</TableHead>
                  <TableHead className="w-[140px]">Owner</TableHead>
                  <TableHead className="w-[100px]">Updated</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm">{doc.documentNumber}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{doc.documentTypeCode}</span>
                      <span className="text-muted-foreground"> - </span>
                      <span className="text-sm">{doc.documentType}</span>
                    </TableCell>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{doc.version}</TableCell>
                    <TableCell className="text-muted-foreground">{doc.owner}</TableCell>
                    <TableCell className="text-muted-foreground">{doc.lastUpdated}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Download</DropdownMenuItem>
                          <DropdownMenuItem>Update Status</DropdownMenuItem>
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
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.tier1}</p>
              <p className="text-sm text-muted-foreground">Tier 1</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.tier2}</p>
              <p className="text-sm text-muted-foreground">Tier 2</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.published}</p>
              <p className="text-sm text-muted-foreground">Published</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex-1" />
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Document
        </Button>
      </div>

      {/* Document Tables */}
      <div className="space-y-4">
        <DocumentTable 
          documents={tier1Docs} 
          title="Tier 1 - Critical Documentation" 
          icon={Shield}
          iconColor="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          open={tier1Open}
          onOpenChange={setTier1Open}
        />
        <DocumentTable 
          documents={tier2Docs} 
          title="Tier 2 - Supporting Documentation" 
          icon={BookOpen}
          iconColor="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          open={tier2Open}
          onOpenChange={setTier2Open}
        />
      </div>

      {filteredDocuments.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">No documents found</h3>
            <p className="text-muted-foreground">Try adjusting your search criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
