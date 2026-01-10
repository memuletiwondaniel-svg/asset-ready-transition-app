import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  FileText, 
  Rocket, 
  Settings, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Plus,
  Filter,
  Download,
  Eye
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Procedure {
  id: string;
  procedureNumber: string;
  title: string;
  type: 'startup' | 'normal';
  status: 'draft' | 'in_review' | 'approved' | 'published';
  version: string;
  lastUpdated: string;
  owner: string;
  reviewDate: string;
  completionPercentage: number;
}

// Mock data for procedures
const mockProcedures: Procedure[] = [
  // Initial Start-up Procedures
  {
    id: '1',
    procedureNumber: 'ISU-001',
    title: 'Gas Turbine Initial Start-up Procedure',
    type: 'startup',
    status: 'approved',
    version: '2.1',
    lastUpdated: '2024-01-15',
    owner: 'John Smith',
    reviewDate: '2025-01-15',
    completionPercentage: 100
  },
  {
    id: '2',
    procedureNumber: 'ISU-002',
    title: 'Compressor Train Commissioning & Start-up',
    type: 'startup',
    status: 'in_review',
    version: '1.3',
    lastUpdated: '2024-01-10',
    owner: 'Sarah Johnson',
    reviewDate: '2024-02-10',
    completionPercentage: 85
  },
  {
    id: '3',
    procedureNumber: 'ISU-003',
    title: 'Heat Recovery Steam Generator (HRSG) Start-up',
    type: 'startup',
    status: 'draft',
    version: '1.0',
    lastUpdated: '2024-01-08',
    owner: 'Mike Chen',
    reviewDate: '2024-03-08',
    completionPercentage: 45
  },
  {
    id: '4',
    procedureNumber: 'ISU-004',
    title: 'Process Gas Heater Light-off Procedure',
    type: 'startup',
    status: 'approved',
    version: '3.0',
    lastUpdated: '2024-01-12',
    owner: 'Emily Davis',
    reviewDate: '2025-01-12',
    completionPercentage: 100
  },
  {
    id: '5',
    procedureNumber: 'ISU-005',
    title: 'Electrical Systems Energization Sequence',
    type: 'startup',
    status: 'published',
    version: '2.5',
    lastUpdated: '2024-01-05',
    owner: 'Robert Wilson',
    reviewDate: '2025-01-05',
    completionPercentage: 100
  },
  // Normal Operating Procedures
  {
    id: '6',
    procedureNumber: 'NOP-001',
    title: 'Gas Turbine Normal Operating Procedure',
    type: 'normal',
    status: 'published',
    version: '4.2',
    lastUpdated: '2024-01-14',
    owner: 'John Smith',
    reviewDate: '2025-01-14',
    completionPercentage: 100
  },
  {
    id: '7',
    procedureNumber: 'NOP-002',
    title: 'Compressor Surge Control & Monitoring',
    type: 'normal',
    status: 'approved',
    version: '2.0',
    lastUpdated: '2024-01-11',
    owner: 'Sarah Johnson',
    reviewDate: '2025-01-11',
    completionPercentage: 100
  },
  {
    id: '8',
    procedureNumber: 'NOP-003',
    title: 'Production Separator Operation',
    type: 'normal',
    status: 'in_review',
    version: '1.5',
    lastUpdated: '2024-01-09',
    owner: 'Lisa Brown',
    reviewDate: '2024-02-09',
    completionPercentage: 75
  },
  {
    id: '9',
    procedureNumber: 'NOP-004',
    title: 'Flare System Operation & Monitoring',
    type: 'normal',
    status: 'draft',
    version: '1.0',
    lastUpdated: '2024-01-07',
    owner: 'David Lee',
    reviewDate: '2024-03-07',
    completionPercentage: 30
  },
  {
    id: '10',
    procedureNumber: 'NOP-005',
    title: 'Chemical Injection System Operation',
    type: 'normal',
    status: 'approved',
    version: '2.3',
    lastUpdated: '2024-01-13',
    owner: 'Amanda Taylor',
    reviewDate: '2025-01-13',
    completionPercentage: 100
  },
  {
    id: '11',
    procedureNumber: 'NOP-006',
    title: 'Water Treatment Plant Operation',
    type: 'normal',
    status: 'published',
    version: '3.1',
    lastUpdated: '2024-01-06',
    owner: 'Chris Martin',
    reviewDate: '2025-01-06',
    completionPercentage: 100
  },
  {
    id: '12',
    procedureNumber: 'NOP-007',
    title: 'Emergency Shutdown (ESD) System Testing',
    type: 'normal',
    status: 'in_review',
    version: '1.8',
    lastUpdated: '2024-01-04',
    owner: 'Jennifer White',
    reviewDate: '2024-02-04',
    completionPercentage: 90
  },
];

interface ORAProceduresTabProps {
  oraPlanId: string;
}

export const ORAProceduresTab: React.FC<ORAProceduresTabProps> = ({ oraPlanId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [procedureType, setProcedureType] = useState<'all' | 'startup' | 'normal'>('all');

  const getStatusBadge = (status: Procedure['status']) => {
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

  const getStatusIcon = (status: Procedure['status']) => {
    switch (status) {
      case 'draft':
        return <FileText className="w-4 h-4 text-slate-500" />;
      case 'in_review':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      case 'published':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  const filteredProcedures = mockProcedures.filter(proc => {
    const matchesSearch = 
      proc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proc.procedureNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proc.owner.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = procedureType === 'all' || proc.type === procedureType;
    
    return matchesSearch && matchesType;
  });

  const startupProcedures = filteredProcedures.filter(p => p.type === 'startup');
  const normalProcedures = filteredProcedures.filter(p => p.type === 'normal');

  const stats = {
    total: mockProcedures.length,
    published: mockProcedures.filter(p => p.status === 'published').length,
    approved: mockProcedures.filter(p => p.status === 'approved').length,
    inReview: mockProcedures.filter(p => p.status === 'in_review').length,
    draft: mockProcedures.filter(p => p.status === 'draft').length,
  };

  const ProcedureCard = ({ procedure }: { procedure: Procedure }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${procedure.type === 'startup' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
              {procedure.type === 'startup' ? (
                <Rocket className={`w-5 h-5 ${procedure.type === 'startup' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`} />
              ) : (
                <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm text-muted-foreground">{procedure.procedureNumber}</span>
                {getStatusBadge(procedure.status)}
              </div>
              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {procedure.title}
              </h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>v{procedure.version}</span>
                <span>•</span>
                <span>{procedure.owner}</span>
                <span>•</span>
                <span>Updated {procedure.lastUpdated}</span>
              </div>
              {procedure.completionPercentage < 100 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-medium">{procedure.completionPercentage}%</span>
                  </div>
                  <Progress value={procedure.completionPercentage} className="h-1.5" />
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
                <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
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
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
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
                <p className="text-2xl font-bold">{stats.inReview}</p>
                <p className="text-sm text-muted-foreground">In Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                <AlertCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.draft}</p>
                <p className="text-sm text-muted-foreground">Draft</p>
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
            placeholder="Search procedures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={procedureType === 'all' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setProcedureType('all')}
          >
            All
          </Button>
          <Button
            variant={procedureType === 'startup' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setProcedureType('startup')}
            className="gap-2"
          >
            <Rocket className="w-4 h-4" />
            Start-up
          </Button>
          <Button
            variant={procedureType === 'normal' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setProcedureType('normal')}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Normal Ops
          </Button>
        </div>
        <div className="flex-1" />
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Procedure
        </Button>
      </div>

      {/* Procedures List */}
      <div className="space-y-6">
        {(procedureType === 'all' || procedureType === 'startup') && startupProcedures.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-md bg-orange-100 dark:bg-orange-900/30">
                <Rocket className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-lg font-semibold">Initial Start-up Procedures</h2>
              <Badge variant="secondary">{startupProcedures.length}</Badge>
            </div>
            <div className="grid gap-3">
              {startupProcedures.map(proc => (
                <ProcedureCard key={proc.id} procedure={proc} />
              ))}
            </div>
          </div>
        )}

        {(procedureType === 'all' || procedureType === 'normal') && normalProcedures.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold">Normal Operating Procedures</h2>
              <Badge variant="secondary">{normalProcedures.length}</Badge>
            </div>
            <div className="grid gap-3">
              {normalProcedures.map(proc => (
                <ProcedureCard key={proc.id} procedure={proc} />
              ))}
            </div>
          </div>
        )}

        {filteredProcedures.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">No procedures found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try adjusting your search criteria' : 'Add your first procedure to get started'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
