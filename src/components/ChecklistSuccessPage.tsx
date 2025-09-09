import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, FileText, ArrowRight, Home } from 'lucide-react';

interface ChecklistSuccessPageProps {
  checklistName: string;
  reason: string;
  selectedItemsCount: number;
  onBackToChecklists: () => void;
  onBackToDashboard: () => void;
}

const ChecklistSuccessPage: React.FC<ChecklistSuccessPageProps> = ({
  checklistName,
  reason,
  selectedItemsCount,
  onBackToChecklists,
  onBackToDashboard
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-8">
        <Card className="border border-border/20 bg-card/90 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-green-600 mb-2">
              Checklist Created Successfully!
            </CardTitle>
            <CardDescription className="text-lg">
              Your new PSSR checklist has been created and is ready to use
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Checklist Summary */}
            <div className="bg-muted/20 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                Checklist Summary
              </h3>
              
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-lg font-semibold">{checklistName}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reason</label>
                  <p className="text-sm">{reason}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Items Included</label>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                      {selectedItemsCount} items selected
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-semibold text-yellow-800">Important Notice</h4>
                <p className="text-sm text-yellow-700">
                  This new checklist will only be available for <strong>new PSSR reviews</strong>. 
                  Existing PSSR reviews that are already completed or in progress will continue 
                  to use their original checklists and will not be affected by these changes.
                </p>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">What's Next?</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your checklist is now available when creating new PSSR reviews</li>
                <li>• You can edit or modify the checklist items at any time</li>
                <li>• Project teams can start using this checklist immediately</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border/20">
              <Button 
                onClick={onBackToChecklists}
                className="fluent-button bg-primary hover:bg-primary-hover flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                View All Checklists
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button 
                variant="outline"
                onClick={onBackToDashboard}
                className="fluent-button flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChecklistSuccessPage;