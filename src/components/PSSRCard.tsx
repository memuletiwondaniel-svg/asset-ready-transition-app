
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Eye, CheckCircle2, Clock, AlertCircle, Building2, Calendar, User } from 'lucide-react';

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
      case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'under review': 
      case 'under_review': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'pending_lead_review': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'draft': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
      case 'under review': return 'bg-gradient-to-r from-amber-500 to-amber-600';
      case 'draft': return 'bg-gradient-to-r from-gray-400 to-gray-500';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return <CheckCircle2 className="h-3 w-3" />;
      case 'under review': return <Clock className="h-3 w-3" />;
      case 'draft': return <AlertCircle className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getCardBorderColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'border-l-emerald-500';
      case 'under review': return 'border-l-amber-500';
      case 'draft': return 'border-l-gray-400';
      default: return 'border-l-gray-400';
    }
  };

  return (
    	<Card className={`group/pssrcard hover:shadow-lg transition-shadow duration-300 border-l-4 ${getCardBorderColor(pssr.status)} bg-white`}>
      		<CardContent className="p-2">
        			<div className="flex items-center justify-between gap-3">
          				<div className="flex-1 min-w-0">
            					{/* Header with Project ID and PSSR ID */}
            					<div className="flex items-center gap-1.5 mb-1">
              						<div className="p-0.5 bg-blue-50 rounded">
                							<Building2 className="h-2.5 w-2.5 text-blue-600" />
              						</div>
              						<div className="flex-1 flex items-center gap-2">
                							<h3 className="text-sm font-bold text-gray-900 group-hover/pssrcard:text-blue-600 transition-colors duration-200 truncate">
                  								{pssr.projectId} - {pssr.projectName}
                							</h3>
                <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 font-medium px-1.5 py-0">
                  {pssr.id}
                </Badge>
              </div>
            </div>
            
            {/* Asset and Status on same line */}
            <div className="mb-1 flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Building2 className="h-2.5 w-2.5 text-gray-500" />
                <p className="text-[11px] text-gray-600">
                  <span className="font-medium text-gray-900">{pssr.asset}</span>
                </p>
              </div>
              <Badge 
                variant="outline" 
                className={`flex items-center gap-0.5 px-1.5 py-0 text-[10px] ${getStatusColor(pssr.status)}`}
              >
                {getStatusIcon(pssr.status)}
                {pssr.status}
              </Badge>
              {pssr.pendingApprovals > 0 && (
                <span className="text-[10px] text-orange-600 font-medium bg-orange-50 px-1 py-0 rounded">
                  {pssr.pendingApprovals} pending
                </span>
              )}
            </div>
            
            {/* PSSR Lead and dates on same line */}
            <div className="flex items-center gap-2 text-[11px] text-gray-600">
              <div className="flex items-center gap-1.5">
                <Avatar className="h-4 w-4 ring-1 ring-white shadow-sm">
                  <AvatarImage src={pssr.pssrLeadAvatar} alt={pssr.pssrLead} />
                  <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                    {pssr.pssrLead.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-gray-900">{pssr.pssrLead}</span>
              </div>
              <span className="text-gray-400">•</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-2 w-2" />
                <span>{pssr.created}</span>
              </div>
              {pssr.completedDate && (
                <>
                  <span className="text-gray-400">•</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-2 w-2 text-emerald-600" />
                    <span>{pssr.completedDate}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Progress and Action Section */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-14 bg-gray-200 rounded-full h-1.5 shadow-inner">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ${getProgressBarColor(pssr.status)}`}
                  style={{ width: `${pssr.progress}%` }}
                ></div>
              </div>
              <span className="text-[11px] font-bold text-gray-900 min-w-[1.5rem]">{pssr.progress}%</span>
            </div>
            
            <Button 
              size="sm" 
              onClick={() => onViewDetails(pssr.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-2 py-0.5 text-[11px] h-6"
            >
              <Eye className="h-2.5 w-2.5 mr-0.5" />
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PSSRCard;
