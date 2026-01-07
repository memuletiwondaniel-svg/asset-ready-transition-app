import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Shield, CheckCircle, Users, FileText } from 'lucide-react';

interface CreatePSSRIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

const CreatePSSRIntroModal: React.FC<CreatePSSRIntroModalProps> = ({ 
  isOpen, 
  onClose, 
  onContinue 
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl font-bold text-gray-900">
            <Shield className="h-6 w-6 mr-3 text-blue-600" />
            Create New Pre-Start-Up Safety Review (PSSR)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Safety Alert */}
          <Card className="border-l-4 border-l-orange-500 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-orange-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-orange-900 mb-2">Critical Safety Notice</h3>
                  <p className="text-sm text-orange-800">
                    <strong>Process Safety events are five times more likely to occur during start-ups than during normal operations</strong>, 
                    so it is essential that a PSSR aims to provide the project and asset owner with assurance that the unit has been 
                    designed according to codes, standards and practices, that process risks are reduced to ALARP and measures are in 
                    place for the management of safety critical equipment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PSSR Purpose */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">PSSR Purpose & Verification</h3>
            <p className="text-sm text-gray-700 mb-4">
              The PSSR verifies that process risks have been assessed, and technical safety management of the hazards and risks are in place and satisfy the following:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-sm text-gray-900 mb-1">Technical Integrity</h4>
                      <p className="text-xs text-gray-600">
                        Equipment has been designed, installed and tested in accordance with agreed design and engineering application.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-sm text-gray-900 mb-1">Procedures & Documentation</h4>
                      <p className="text-xs text-gray-600">
                        Safety, operating, maintenance and emergency procedures are in place and are adequate.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-sm text-gray-900 mb-1">HEMP Analysis</h4>
                      <p className="text-xs text-gray-600">
                        Relevant HEMP analysis has been performed for facility, and all recommendations have been resolved or implemented before start-up.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Users className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-sm text-gray-900 mb-1">Personnel Readiness</h4>
                      <p className="text-xs text-gray-600">
                        Employees are trained and ready to safely operate the plant.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Priority System */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h4 className="font-semibold text-blue-900 mb-3">Finding Priority System</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">Priority A</span>
                  <span className="text-sm text-blue-800">MUST be closed prior to start-up</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded">Priority B</span>
                  <span className="text-sm text-blue-800">Can be closed out after starting up</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Responsibility Notice */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <h4 className="font-semibold text-gray-900 mb-2">PSSR Lead Responsibilities</h4>
              <p className="text-sm text-gray-700">
                It is the responsibility of the PSSR Lead to ensure that all suitable information is provided to the approving authorities, 
                and that sufficient time and notice is given to the required assurance team to carry out required due diligence.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="px-6"
          >
            Cancel
          </Button>
          <Button 
            onClick={onContinue}
            className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePSSRIntroModal;