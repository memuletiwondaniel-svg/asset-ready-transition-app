import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, ArrowRight, X, AlertTriangle, CheckCircle, Shield, Users, FileText, Wrench } from 'lucide-react';

interface CreatePSSRIntroModalProps {
  onCancel: () => void;
  onContinue: () => void;
}

const CreatePSSRIntroModal: React.FC<CreatePSSRIntroModalProps> = ({ onCancel, onContinue }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden bg-background border border-border shadow-2xl">
        {/* Header */}
        <CardHeader className="border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                <ClipboardList className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">Create New PSSR</CardTitle>
                <CardDescription className="text-base text-muted-foreground mt-1">
                  Pre-Start-Up Safety Review Process
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" onClick={onCancel} className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-8">
            {/* Critical Information Alert */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-destructive mb-2">Critical Safety Information</h3>
                  <p className="text-sm text-foreground">
                    <strong>Process Safety events are five times more likely to occur during start-ups than during normal operations.</strong> 
                    It is essential that all safety protocols are rigorously followed and verified before any hydrocarbon introduction.
                  </p>
                </div>
              </div>
            </div>

            {/* PSSR Purpose */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Purpose and Intent of PSSR</h2>
              
              <p className="text-foreground leading-relaxed">
                A PSSR aims to provide the project and asset owner with assurance that the unit has been designed according to 
                codes, standards and practices, that process risks are reduced to ALARP (As Low As Reasonably Practicable) and 
                measures are in place for the management of safety critical equipment.
              </p>

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  The PSSR Verifies Process Risk Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-foreground">Equipment Installation</h4>
                        <p className="text-sm text-muted-foreground">Equipment is installed and commissioned in accordance with design specifications.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-foreground">Procedures & Documentation</h4>
                        <p className="text-sm text-muted-foreground">Safety, operating, maintenance and emergency procedures are in place and are adequate.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Wrench className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-foreground">HEMP Analysis</h4>
                        <p className="text-sm text-muted-foreground">Relevant HEMP analysis has been performed for facility, and all recommendations have been resolved or implemented before start-up.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-foreground">Employee Readiness</h4>
                        <p className="text-sm text-muted-foreground">Employees are trained and ready to safely operate the plant.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gap Classification */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Gap Classification System</h3>
              <p className="text-muted-foreground">
                Where gaps have been identified, findings should be ranked between Priority A and Priority B:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                  <h4 className="font-semibold text-destructive mb-2">Priority A</h4>
                  <p className="text-sm text-foreground">MUST be closed out prior to start-up</p>
                </div>
                
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
                  <h4 className="font-semibold text-warning mb-2">Priority B</h4>
                  <p className="text-sm text-foreground">Can be closed out after starting up</p>
                </div>
              </div>
            </div>

            {/* PSSR Lead Responsibility */}
            <div className="bg-muted/30 border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-3">PSSR Lead Responsibility</h3>
              <p className="text-sm text-muted-foreground">
                It is the responsibility of the PSSR Lead to ensure that all suitable information is provided to the 
                approving authorities, and that sufficient time and notice is given to the required assurance team 
                to carry out required due diligence.
              </p>
            </div>
          </div>
        </CardContent>

        {/* Footer */}
        <div className="border-t border-border p-6 bg-muted/20">
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={onCancel} className="px-8">
              Cancel
            </Button>
            <Button 
              onClick={onContinue} 
              className="px-8 bg-primary hover:bg-primary/90 group"
            >
              Continue to PSSR Creation
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CreatePSSRIntroModal;