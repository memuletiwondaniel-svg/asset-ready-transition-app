import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Calendar, Users } from 'lucide-react';

interface PSSRStepFourProps {
  data: any;
  onDataUpdate: (stepData: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const PSSRStepFour: React.FC<PSSRStepFourProps> = ({ data, onDataUpdate, onNext, onBack }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule PSSR Activities
          </CardTitle>
          <CardDescription>
            Plan and schedule PSSR kick-off meetings and walkdown activities
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Calendar className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Schedule PSSR Activities</h3>
          <p className="text-muted-foreground mb-6">
            This step will allow you to schedule PSSR kick-off meetings and walkdown activities.
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

export default PSSRStepFour;