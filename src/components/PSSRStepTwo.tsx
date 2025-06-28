
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, CheckCircle, FileText, Users, Settings } from 'lucide-react';

interface PSSRStepTwoProps {
  formData: any;
  onBack: () => void;
  onContinueToChecklist: () => void;
}

const PSSRStepTwo: React.FC<PSSRStepTwoProps> = ({ 
  formData, 
  onBack, 
  onContinueToChecklist 
}) => {
  const readinessAreas = [
    {
      id: 'operation-readiness',
      title: 'Operation Readiness Plan',
      description: 'Develop and implement credible plans to ensure that the Asset team is competent and ready to accept and operate and maintain the new facility. Includes training plans, maintenance readiness plans, documentation and information management plans',
      icon: Settings,
      status: 'pending'
    },
    {
      id: 'safety-systems',
      title: 'Safety Systems Verification',
      description: 'Comprehensive verification of all safety-critical systems and emergency response procedures',
      icon: CheckCircle,
      status: 'pending'
    },
    {
      id: 'documentation',
      title: 'Documentation Review',
      description: 'Review and approval of all operational procedures, maintenance manuals, and safety documentation',
      icon: FileText,
      status: 'pending'
    },
    {
      id: 'team-readiness',
      title: 'Team Readiness Assessment',
      description: 'Evaluation of team competency, training completion, and operational readiness',
      icon: Users,
      status: 'pending'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="pb-6">
          <CardTitle className="text-2xl font-bold text-gray-900">PSSR Readiness Areas</CardTitle>
          <CardDescription className="text-gray-600">
            Review and complete all readiness areas before proceeding to the detailed checklist
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {readinessAreas.map((area) => {
              const IconComponent = area.icon;
              return (
                <Card key={area.id} className="border-2 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                          {area.title}
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600 leading-relaxed">
                          {area.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(area.status)}`}>
                      {area.status.charAt(0).toUpperCase() + area.status.slice(1).replace('-', ' ')}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-between pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Previous Step
            </Button>
            <Button onClick={onContinueToChecklist} className="flex items-center gap-2">
              Continue to Checklist
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PSSRStepTwo;
