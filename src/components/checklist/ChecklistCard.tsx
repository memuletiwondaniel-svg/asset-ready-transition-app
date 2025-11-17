import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  ListChecks, 
  Users, 
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChecklistCardProps {
  id: string;
  name: string;
  reason: string;
  itemCount: number;
  status: 'draft' | 'under_review' | 'approved' | 'rejected';
  createdAt?: string;
  onView?: () => void;
  onViewHistory?: () => void;
}

export const ChecklistCard: React.FC<ChecklistCardProps> = ({
  id,
  name,
  reason,
  itemCount,
  status,
  createdAt,
  onView,
  onViewHistory,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Draft</Badge>;
      case 'under_review':
        return <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700 dark:text-yellow-400">
          <AlertCircle className="h-3 w-3" /> Under Review
        </Badge>;
      case 'approved':
        return <Badge className="gap-1 bg-green-500"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Rejected</Badge>;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'draft': return 'border-l-gray-400';
      case 'under_review': return 'border-l-yellow-500';
      case 'approved': return 'border-l-green-500';
      case 'rejected': return 'border-l-red-500';
    }
  };

  return (
    <Card className={cn("hover:shadow-lg transition-all cursor-pointer border-l-4", getStatusColor())}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {id}
              </Badge>
              {getStatusBadge()}
            </div>
            <h3 className="font-semibold text-lg leading-tight">{name}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewHistory}>
                <Clock className="h-4 w-4 mr-2" />
                View History
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Reason</p>
              <p className="text-sm font-medium">{reason}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Items</p>
                <p className="text-lg font-bold text-primary">{itemCount}</p>
              </div>
            </div>
            {createdAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">
                    {new Date(createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
