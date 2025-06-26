import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, ArrowLeft, FileText, Users, Calendar, AlertCircle } from 'lucide-react';

interface CreatePSSRFlowProps {
  onBack: () => void;
}

const CreatePSSRFlow: React.FC<CreatePSSRFlowProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    priority: '',
    expectedStartDate: '',
    teamLead: '',
    department: '',
    riskLevel: '',
    complianceRequired: false as boolean,
    environmentalImpact: false as boolean,
    safetyRequirements: false as boolean
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    console.log('PSSR Form Data:', formData);
    // Handle form submission logic here
    onBack(); // Return to previous view after submission
  };

  const renderStepOne = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Project Information</h3>
        <p className="text-gray-600">Provide basic information about your PSSR project</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="projectName">Project Name *</Label>
          <Input
            id="projectName"
            value={formData.projectName}
            onChange={(e) => handleInputChange('projectName', e.target.value)}
            placeholder="Enter project name"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="teamLead">Team Lead *</Label>
          <Input
            id="teamLead"
            value={formData.teamLead}
            onChange={(e) => handleInputChange('teamLead', e.target.value)}
            placeholder="Enter team lead name"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Department *</Label>
          <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="safety">Safety</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority Level *</Label>
          <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Project Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Provide a detailed description of the project..."
          rows={4}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expectedStartDate">Expected Start Date *</Label>
        <Input
          id="expectedStartDate"
          type="date"
          value={formData.expectedStartDate}
          onChange={(e) => handleInputChange('expectedStartDate', e.target.value)}
          className="w-full"
        />
      </div>
    </div>
  );

  const renderStepTwo = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Risk Assessment</h3>
        <p className="text-gray-600">Evaluate the risk factors and compliance requirements</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="riskLevel">Overall Risk Level *</Label>
          <Select value={formData.riskLevel} onValueChange={(value) => handleInputChange('riskLevel', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select risk level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <Label className="text-base font-semibold">Compliance Requirements</Label>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="complianceRequired"
                checked={formData.complianceRequired}
                onChange={(e) => handleInputChange('complianceRequired', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="complianceRequired" className="text-sm font-medium text-gray-700">
                Regulatory Compliance Required
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="environmentalImpact"
                checked={formData.environmentalImpact}
                onChange={(e) => handleInputChange('environmentalImpact', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="environmentalImpact" className="text-sm font-medium text-gray-700">
                Environmental Impact Assessment Required
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="safetyRequirements"
                checked={formData.safetyRequirements}
                onChange={(e) => handleInputChange('safetyRequirements', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="safetyRequirements" className="text-sm font-medium text-gray-700">
                Additional Safety Requirements
              </Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepThree = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Review & Submit</h3>
        <p className="text-gray-600">Review your PSSR project details before submission</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-semibold text-gray-600">Project Name</Label>
            <p className="text-gray-900">{formData.projectName || 'Not specified'}</p>
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-600">Team Lead</Label>
            <p className="text-gray-900">{formData.teamLead || 'Not specified'}</p>
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-600">Department</Label>
            <p className="text-gray-900">{formData.department || 'Not specified'}</p>
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-600">Priority</Label>
            <Badge variant={formData.priority === 'high' ? 'destructive' : 'secondary'}>
              {formData.priority || 'Not specified'}
            </Badge>
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-600">Risk Level</Label>
            <Badge variant={formData.riskLevel === 'critical' || formData.riskLevel === 'high' ? 'destructive' : 'secondary'}>
              {formData.riskLevel || 'Not specified'}
            </Badge>
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-600">Expected Start Date</Label>
            <p className="text-gray-900">{formData.expectedStartDate || 'Not specified'}</p>
          </div>
        </div>
        
        <div>
          <Label className="text-sm font-semibold text-gray-600">Description</Label>
          <p className="text-gray-900 text-sm mt-1">{formData.description || 'No description provided'}</p>
        </div>

        <div>
          <Label className="text-sm font-semibold text-gray-600">Compliance Requirements</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {formData.complianceRequired && <Badge variant="outline">Regulatory Compliance</Badge>}
            {formData.environmentalImpact && <Badge variant="outline">Environmental Impact</Badge>}
            {formData.safetyRequirements && <Badge variant="outline">Safety Requirements</Badge>}
            {!formData.complianceRequired && !formData.environmentalImpact && !formData.safetyRequirements && (
              <span className="text-gray-500 text-sm">None selected</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to PSSR List
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New PSSR</h1>
            <p className="text-gray-600">Pre-Start Up Safety Review Process</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                  currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            {currentStep === 1 && renderStepOne()}
            {currentStep === 2 && renderStepTwo()}
            {currentStep === 3 && renderStepThree()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button 
            variant="outline" 
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          {currentStep < 3 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
              Submit PSSR
              <FileText className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePSSRFlow;
