import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, Award } from 'lucide-react';

interface PSSRStepEightProps {
  data: any;
  onDataUpdate: (stepData: any) => void;
  onNext?: () => void;
  onBack: () => void;
}

const PSSRStepEight: React.FC<PSSRStepEightProps> = ({ data, onDataUpdate, onBack }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Final PSSR Approval
          </CardTitle>
          <CardDescription>
            Multi-tier approval workflow for PSSR completion
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Award className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Final PSSR Approval</h3>
          <p className="text-muted-foreground mb-6">
            This step manages the final approval workflow through all three tiers.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button className="bg-success hover:bg-success/90">
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete PSSR Process
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PSSRStepEight;