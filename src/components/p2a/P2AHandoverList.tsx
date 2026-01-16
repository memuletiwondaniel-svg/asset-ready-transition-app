import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useP2AHandovers, P2AHandover } from '@/hooks/useP2AHandovers';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Eye, ClipboardList, Award, FileText, MoreHorizontal, ArrowUpRight, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'PENDING_APPROVAL':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    case 'COMPLETED':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
};

const formatStatus = (status: string) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const P2AHandoverList: React.FC = () => {
  const { handovers, isLoading } = useP2AHandovers();
  const navigate = useNavigate();
  const { translations: t } = useLanguage();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');

  const handleViewHandover = (handoverId: string) => {
    navigate(`/p2a-handover/${handoverId}`);
  };

  // Filter handovers
  const filteredHandovers = useMemo(() => {
    if (!handovers) return [];
    
    return handovers.filter(h => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        h.project?.project_id_prefix?.toLowerCase().includes(searchLower) ||
        h.project?.project_id_number?.toString().includes(searchLower) ||
        h.project?.project_title?.toLowerCase().includes(searchLower) ||
        h.handover_scope?.toLowerCase().includes(searchLower);
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || h.status === statusFilter;
      
      // Phase filter
      const matchesPhase = phaseFilter === 'all' || h.phase === phaseFilter;
      
      return matchesSearch && matchesStatus && matchesPhase;
    });
  }, [handovers, searchQuery, statusFilter, phaseFilter]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Handovers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!handovers || handovers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Handovers
          </CardTitle>
          <CardDescription>
            Track and manage your P2A handover workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">No Handovers Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Get started by initiating your first P2A handover using the button above.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Handovers
            </CardTitle>
            <CardDescription>
              {filteredHandovers.length} of {handovers.length} handover{handovers.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      {/* Search and Filter Bar */}
      <div className="px-6 pb-4">
        <div className="flex flex-wrap gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by project ID, title..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Phase Filter */}
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue placeholder="Phase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              <SelectItem value="PAC">PAC</SelectItem>
              <SelectItem value="FAC">FAC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHandovers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No handovers match your search criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredHandovers.map((handover) => (
                  <TableRow 
                    key={handover.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewHandover(handover.id)}
                  >
                    <TableCell>
                      <div className="font-medium">
                        {handover.project?.project_id_prefix}-{handover.project?.project_id_number}
                      </div>
                      <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {handover.project?.project_title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {handover.phase === 'PAC' ? (
                          <>
                            <ClipboardList className="h-3 w-3" />
                            PAC
                          </>
                        ) : (
                          <>
                            <Award className="h-3 w-3" />
                            FAC
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(handover.status)}>
                        {formatStatus(handover.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground truncate max-w-[150px]">
                        {handover.handover_scope || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(handover.created_at), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleViewHandover(handover.id);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleViewHandover(handover.id);
                          }}>
                            <ArrowUpRight className="h-4 w-4 mr-2" />
                            Open Handover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};