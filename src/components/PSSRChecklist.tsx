
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Save } from 'lucide-react';

interface PSSRChecklistProps {
  onSaveDraft: () => void;
}

const PSSRChecklist: React.FC<PSSRChecklistProps> = ({ onSaveDraft }) => {
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            PSSR Checklist
          </CardTitle>
          <CardDescription>
            Complete the Pre-Start-up Safety Review checklist items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Checklist Ready
            </h3>
            <p className="text-gray-600 mb-6">
              Your PSSR information has been collected. The checklist will be generated based on your project details.
            </p>
            <Button onClick={onSaveDraft} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save as Draft
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PSSRChecklist;
