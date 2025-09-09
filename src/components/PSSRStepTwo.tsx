
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ClipboardCheck } from 'lucide-react';

interface FormData {
  asset: string;
  reason: string;
  projectId: string;
  projectName: string;
  scope: string;
  files: File[];
  teamMembers: {
    technicalAuthorities: {};
    assetTeam: {};
    projectTeam: {};
    hsse: {};
  };
}

interface PSSRStepTwoProps {
  formData: FormData;
  onBack: () => void;
  onContinueToChecklist: () => void;
}

const PSSRStepTwo: React.FC<PSSRStepTwoProps> = ({ formData, onBack, onContinueToChecklist }) => {
  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-6 p-4 bg-green-100 rounded-full w-fit">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">PSSR Created Successfully</CardTitle>
          <CardDescription className="text-lg text-gray-600 mt-2">
            Your PSSR has been created with ID: <Badge variant="secondary" className="ml-2 text-base">PSSR-2024-004</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-8">
            <p className="text-gray-600 mb-6 text-lg">
              You can now proceed to complete the PSSR checklist.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={onContinueToChecklist}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
              >
                <ClipboardCheck className="h-5 w-5 mr-2" />
                Continue to Checklist
              </Button>
              <Button 
                variant="outline" 
                onClick={onBack}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 text-lg"
              >
                Return to PSSR List
              </Button>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-8">
            <h4 className="font-bold text-xl text-gray-900 mb-6">PSSR Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {formData.asset && (
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-500 block mb-1">Asset</span>
                  <span className="text-lg font-semibold text-gray-900">{formData.asset}</span>
                </div>
              )}
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <span className="text-sm text-gray-500 block mb-1">Reason</span>
                <span className="text-lg font-semibold text-gray-900">{formData.reason}</span>
              </div>
              {formData.projectId && (
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-500 block mb-1">Project ID</span>
                  <span className="text-lg font-semibold text-gray-900">{formData.projectId}</span>
                </div>
              )}
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <span className="text-sm text-gray-500 block mb-1">Uploaded Files</span>
                <span className="text-lg font-semibold text-gray-900">{formData.files.length} files</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PSSRStepTwo;
