import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChecklistSuccessPageProps {
  checklistName: string;
  onViewChecklists: () => void;
  onCreateAnother: () => void;
}

export const ChecklistSuccessPage = ({ 
  checklistName, 
  onViewChecklists, 
  onCreateAnother 
}: ChecklistSuccessPageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            Checklist Created Successfully!
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">
              "{checklistName}" has been created successfully.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Important:</strong> This checklist will only be available for new PSSRs. 
                It will not affect PSSRs that are already completed or currently in progress.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button 
              onClick={onViewChecklists}
              className="flex-1 sm:flex-none"
            >
              View All Checklists
            </Button>
            <Button 
              variant="outline" 
              onClick={onCreateAnother}
              className="flex-1 sm:flex-none"
            >
              Create Another Checklist
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};