import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

interface PSSRStepSevenProps {
  data: any;
  onDataUpdate: (stepData: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const PSSRStepSeven: React.FC<PSSRStepSevenProps> = ({ data, onDataUpdate, onNext, onBack }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Approve Checklist Items
          </CardTitle>
          <CardDescription>
            Authority approval process for individual checklist items
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Approve Checklist Items</h3>
          <p className="text-muted-foreground mb-6">
            This step handles the approval workflow for individual checklist items.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button onClick={onNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PSSRStepSeven;