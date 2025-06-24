import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Eye, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface PSSRCardProps {
  pssr: {
    id: string;
    projectId: string;
    projectName: string;
    asset: string;
    status: string;
    progress: number;
    created: string;
    pssrLead: string;
    pssrLeadAvatar: string;
    pendingApprovals: number;
    completedDate: string | null;
  };
  onViewDetails: (pssrId: string) => void;
}

const PSSRCard: React.FC<PSSRCardProps> = ({ pssr, onViewDetails }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'under review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-800';
      case 'under review': return 'bg-yellow-800';
      case 'draft': return 'bg-gray-800';
      default: return 'bg-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return <CheckCircle2 className="h-4 w-4" />;
      case 'under review': return <Clock className="h-4 w-4" />;
      case 'draft': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Project ID and Name with PSSR ID badge on the same row */}
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-gray-900 truncate">
                {pssr.projectId} - {pssr.projectName}
              </h3>
              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 flex-shrink-0">
                {pssr.id}
              </Badge>
            </div>
            
            {/* Plant info */}
            <div className="mb-2">
              <p className="text-sm text-gray-600">Plant: <span className="font-medium">{pssr.asset}</span></p>
            </div>

            {/* Status with pending approvals */}
            <div className="mb-2 flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`flex items-center gap-1 w-fit ${getStatusColor(pssr.status)}`}
              >
                {getStatusIcon(pssr.status)}
                {pssr.status}
              </Badge>
              {pssr.pendingApprovals > 0 && (
                <span className="text-sm text-orange-600 font-medium">
                  - {pssr.pendingApprovals} pending approvals
                </span>
              )}
            </div>
            
            {/* PSSR Lead with Avatar */}
            <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={pssr.pssrLeadAvatar} alt={pssr.pssrLead} />
                <AvatarFallback className="text-xs">
                  {pssr.pssrLead.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{pssr.pssrLead} (PSSR Lead)</span>
            </div>
            
            {/* Additional info */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
              <span>Created: {pssr.created}</span>
              {pssr.completedDate && (
                <span>Completed: {pssr.completedDate}</span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs text-gray-600 mb-1">Overall Progress</p>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${getProgressBarColor(pssr.status)}`}
                    style={{ width: `${pssr.progress}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium">{pssr.progress}%</span>
              </div>
            </div>
            
            <Button 
              size="sm" 
              onClick={() => onViewDetails(pssr.id)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PSSRCard;
