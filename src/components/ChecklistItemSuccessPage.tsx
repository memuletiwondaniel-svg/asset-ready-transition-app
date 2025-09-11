import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText, ArrowRight, Plus } from 'lucide-react';
import { ChecklistItem } from '@/data/pssrChecklistData';

interface ChecklistItemSuccessPageProps {
  newItem: ChecklistItem;
  onBackToChecklist: () => void;
  onCreateAnother: () => void;
}

const ChecklistItemSuccessPage: React.FC<ChecklistItemSuccessPageProps> = ({
  newItem,
  onBackToChecklist,
  onCreateAnother
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
              Checklist Item Created!
            </CardTitle>
            <CardDescription className="text-lg">
              Your new checklist item has been successfully added to the library
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Item Summary */}
            <div className="bg-muted/20 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                New Checklist Item
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reference ID</label>
                  <p className="text-lg font-semibold text-green-600">{newItem.id}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Question/Description</label>
                  <p className="text-sm">{newItem.description}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Evidence Guidance</label>
                  <p className="text-sm text-muted-foreground">{newItem.supportingEvidence}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <Badge variant="outline" className="mt-1">
                      {newItem.category}
                    </Badge>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Approving Authority</label>
                    <p className="text-sm font-medium">{newItem.approvingAuthority}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">What's Next?</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• This item is now available when creating new checklists</li>
                <li>• You can edit or modify this item anytime</li>
                <li>• The item will appear in the appropriate category during checklist creation</li>
                <li>• Teams can include this item in their PSSR reviews</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border/20">
              <Button 
                onClick={onCreateAnother}
                variant="outline"
                className="fluent-button flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Another Item
              </Button>
              <Button 
                onClick={onBackToChecklist}
                className="fluent-button bg-primary hover:bg-primary-hover flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                Back to Checklist
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChecklistItemSuccessPage;