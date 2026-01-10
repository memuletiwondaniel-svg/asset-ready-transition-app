import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  FileText, 
  FolderOpen,
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  Plus,
  Download,
  Eye,
  Shield,
  BookOpen,
  Layers
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Document {
  id: string;
  documentNumber: string;
  title: string;
  tier: 1 | 2;
  category: string;
  status: 'draft' | 'in_review' | 'approved' | 'published';
  version: string;
  lastUpdated: string;
  owner: string;
  reviewDate: string;
  completionPercentage: number;
  isCritical: boolean;
}

// Mock data for RLMU documentation
const mockDocuments: Document[] = [
  // Tier 1 - Critical Documentation
  {
    id: '1',
    documentNumber: 'RLMU-T1-001',
    title: 'Operations Philosophy Document',
    tier: 1,
    category: 'Operations',
    status: 'published',
    version: '3.0',
    lastUpdated: '2024-01-15',
    owner: 'Operations Manager',
    reviewDate: '2025-01-15',
    completionPercentage: 100,
    isCritical: true
  },
  {
    id: '2',
    documentNumber: 'RLMU-T1-002',
    title: 'Maintenance Strategy & Philosophy',
    tier: 1,
    category: 'Maintenance',
    status: 'approved',
    version: '2.5',
    lastUpdated: '2024-01-12',
    owner: 'Maintenance Lead',
    reviewDate: '2025-01-12',
    completionPercentage: 100,
    isCritical: true
  },
  {
    id: '3',
    documentNumber: 'RLMU-T1-003',
    title: 'Asset Integrity Management Plan',
    tier: 1,
    category: 'Integrity',
    status: 'in_review',
    version: '1.8',
    lastUpdated: '2024-01-10',
    owner: 'Integrity Engineer',
    reviewDate: '2024-02-10',
    completionPercentage: 85,
    isCritical: true
  },
  {
    id: '4',
    documentNumber: 'RLMU-T1-004',
    title: 'HSSE Management System Manual',
    tier: 1,
    category: 'HSSE',
    status: 'published',
    version: '4.1',
    lastUpdated: '2024-01-08',
    owner: 'HSSE Manager',
    reviewDate: '2025-01-08',
    completionPercentage: 100,
    isCritical: true
  },
  {
    id: '5',
    documentNumber: 'RLMU-T1-005',
    title: 'Emergency Response Plan',
    tier: 1,
    category: 'Emergency',
    status: 'published',
    version: '5.0',
    lastUpdated: '2024-01-05',
    owner: 'Emergency Coordinator',
    reviewDate: '2025-01-05',
    completionPercentage: 100,
    isCritical: true
  },
  {
    id: '6',
    documentNumber: 'RLMU-T1-006',
    title: 'Process Safety Management Plan',
    tier: 1,
    category: 'Safety',
    status: 'approved',
    version: '2.3',
    lastUpdated: '2024-01-14',
    owner: 'Process Safety Lead',
    reviewDate: '2025-01-14',
    completionPercentage: 100,
    isCritical: true
  },
  // Tier 2 - Supporting Documentation
  {
    id: '7',
    documentNumber: 'RLMU-T2-001',
    title: 'Competency Assurance Framework',
    tier: 2,
    category: 'Training',
    status: 'published',
    version: '2.0',
    lastUpdated: '2024-01-13',
    owner: 'Training Coordinator',
    reviewDate: '2025-01-13',
    completionPercentage: 100,
    isCritical: false
  },
  {
    id: '8',
    documentNumber: 'RLMU-T2-002',
    title: 'Permit to Work Procedures',
    tier: 2,
    category: 'Operations',
    status: 'approved',
    version: '3.2',
    lastUpdated: '2024-01-11',
    owner: 'Operations Supervisor',
    reviewDate: '2025-01-11',
    completionPercentage: 100,
    isCritical: false
  },
  {
    id: '9',
    documentNumber: 'RLMU-T2-003',
    title: 'Management of Change (MOC) Procedure',
    tier: 2,
    category: 'Management',
    status: 'in_review',
    version: '1.5',
    lastUpdated: '2024-01-09',
    owner: 'Technical Authority',
    reviewDate: '2024-02-09',
    completionPercentage: 75,
    isCritical: false
  },
  {
    id: '10',
    documentNumber: 'RLMU-T2-004',
    title: 'Reliability Centered Maintenance Plan',
    tier: 2,
    category: 'Maintenance',
    status: 'draft',
    version: '1.0',
    lastUpdated: '2024-01-07',
    owner: 'Reliability Engineer',
    reviewDate: '2024-03-07',
    completionPercentage: 45,
    isCritical: false
  },
  {
    id: '11',
    documentNumber: 'RLMU-T2-005',
    title: 'Spare Parts Management Strategy',
    tier: 2,
    category: 'Logistics',
    status: 'approved',
    version: '2.1',
    lastUpdated: '2024-01-06',
    owner: 'Materials Manager',
    reviewDate: '2025-01-06',
    completionPercentage: 100,
    isCritical: false
  },
  {
    id: '12',
    documentNumber: 'RLMU-T2-006',
    title: 'Contractor Management Procedure',
    tier: 2,
    category: 'Contracts',
    status: 'published',
    version: '2.8',
    lastUpdated: '2024-01-04',
    owner: 'Contracts Lead',
    reviewDate: '2025-01-04',
    completionPercentage: 100,
    isCritical: false
  },
  {
    id: '13',
    documentNumber: 'RLMU-T2-007',
    title: 'Corrosion Management Strategy',
    tier: 2,
    category: 'Integrity',
    status: 'in_review',
    version: '1.3',
    lastUpdated: '2024-01-03',
    owner: 'Corrosion Engineer',
    reviewDate: '2024-02-03',
    completionPercentage: 90,
    isCritical: false
  },
  {
    id: '14',
    documentNumber: 'RLMU-T2-008',
    title: 'Environmental Management Plan',
    tier: 2,
    category: 'Environment',
    status: 'approved',
    version: '2.4',
    lastUpdated: '2024-01-02',
    owner: 'Environmental Advisor',
    reviewDate: '2025-01-02',
    completionPercentage: 100,
    isCritical: false
  },
];

interface ORADocumentationTabProps {
  oraPlanId: string;
}

export const ORADocumentationTab: React.FC<ORADocumentationTabProps> = ({ oraPlanId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<'all' | 1 | 2>('all');
  const [tier1Open, setTier1Open] = useState(true);
  const [tier2Open, setTier2Open] = useState(true);

  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-300 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-700">Draft</Badge>;
      case 'in_review':
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700">In Review</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700">Approved</Badge>;
      case 'published':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700">Published</Badge>;
      default:
        return null;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      'Operations': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'Maintenance': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      'Integrity': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      'HSSE': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      'Emergency': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
      'Safety': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      'Training': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      'Management': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      'Logistics': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
      'Contracts': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
      'Environment': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    };
    return <Badge variant="secondary" className={colors[category] || 'bg-gray-100 text-gray-700'}>{category}</Badge>;
  };

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.owner.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTier = selectedTier === 'all' || doc.tier === selectedTier;
    
    return matchesSearch && matchesTier;
  });

  const tier1Docs = filteredDocuments.filter(d => d.tier === 1);
  const tier2Docs = filteredDocuments.filter(d => d.tier === 2);

  const stats = {
    total: mockDocuments.length,
    tier1: mockDocuments.filter(d => d.tier === 1).length,
    tier2: mockDocuments.filter(d => d.tier === 2).length,
    published: mockDocuments.filter(d => d.status === 'published').length,
    inReview: mockDocuments.filter(d => d.status === 'in_review').length,
  };

  const overallProgress = Math.round(
    mockDocuments.reduce((acc, d) => acc + d.completionPercentage, 0) / mockDocuments.length
  );

  const DocumentCard = ({ document }: { document: Document }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${document.tier === 1 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
              {document.tier === 1 ? (
                <Shield className={`w-5 h-5 text-red-600 dark:text-red-400`} />
              ) : (
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-sm text-muted-foreground">{document.documentNumber}</span>
                {getCategoryBadge(document.category)}
                {getStatusBadge(document.status)}
                {document.isCritical && (
                  <Badge variant="destructive" className="text-xs">Critical</Badge>
                )}
              </div>
              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {document.title}
              </h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>v{document.version}</span>
                <span>•</span>
                <span>{document.owner}</span>
                <span>•</span>
                <span>Updated {document.lastUpdated}</span>
              </div>
              {document.completionPercentage < 100 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-medium">{document.completionPercentage}%</span>
                  </div>
                  <Progress value={document.completionPercentage} className="h-1.5" />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Download className="w-4 h-4" />
            </Button>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                <Layers className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Docs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.tier1}</p>
                <p className="text-sm text-muted-foreground">Tier 1</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.tier2}</p>
                <p className="text-sm text-muted-foreground">Tier 2</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.published}</p>
                <p className="text-sm text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallProgress}%</p>
                <p className="text-sm text-muted-foreground">Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={selectedTier === 'all' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setSelectedTier('all')}
          >
            All
          </Button>
          <Button
            variant={selectedTier === 1 ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setSelectedTier(1)}
            className="gap-2"
          >
            <Shield className="w-4 h-4" />
            Tier 1
          </Button>
          <Button
            variant={selectedTier === 2 ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setSelectedTier(2)}
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Tier 2
          </Button>
        </div>
        <div className="flex-1" />
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Document
        </Button>
      </div>

      {/* Documentation List */}
      <div className="space-y-4">
        {(selectedTier === 'all' || selectedTier === 1) && tier1Docs.length > 0 && (
          <Collapsible open={tier1Open} onOpenChange={setTier1Open}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/30">
                  <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-lg font-semibold">Tier 1 - Critical Documentation</h2>
                <Badge variant="secondary">{tier1Docs.length}</Badge>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${tier1Open ? 'rotate-90' : ''}`} />
                <div className="flex-1" />
                <span className="text-sm text-muted-foreground">Core operational and safety documents</span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid gap-3 mb-6">
                {tier1Docs.map(doc => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {(selectedTier === 'all' || selectedTier === 2) && tier2Docs.length > 0 && (
          <Collapsible open={tier2Open} onOpenChange={setTier2Open}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold">Tier 2 - Supporting Documentation</h2>
                <Badge variant="secondary">{tier2Docs.length}</Badge>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${tier2Open ? 'rotate-90' : ''}`} />
                <div className="flex-1" />
                <span className="text-sm text-muted-foreground">Procedures and management plans</span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid gap-3">
                {tier2Docs.map(doc => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {filteredDocuments.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">No documents found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try adjusting your search criteria' : 'Add your first document to get started'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
