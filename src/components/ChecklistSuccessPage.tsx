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
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
      <Card className="w-full max-w-2xl border-border/50 shadow-2xl">
        <CardHeader className="text-center pb-6 pt-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center ring-8 ring-green-500/20">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" strokeWidth={2.5} />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">
            Checklist Created Successfully!
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 pb-12">
          <div className="text-center space-y-4">
            <p className="text-lg font-medium">
              "<span className="text-primary">{checklistName}</span>" has been created.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Important:</strong> This checklist will only be available for new PSSRs. 
                It will not affect PSSRs that are already completed or currently in progress.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
            <Button 
              onClick={onViewChecklists}
              size="lg"
              className="flex-1 sm:flex-none"
            >
              View All Checklists
            </Button>
            <Button 
              variant="outline" 
              onClick={onCreateAnother}
              size="lg"
              className="flex-1 sm:flex-none"
            >
              Create Another
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
