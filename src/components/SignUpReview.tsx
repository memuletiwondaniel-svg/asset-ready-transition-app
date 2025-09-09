import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Check, Mail, Phone, User, Building2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface SignUpReviewProps {}

const SignUpReview: React.FC<SignUpReviewProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const formData = location.state?.formData;

  if (!formData) {
    navigate('/auth');
    return null;
  }

  const authenticators = [
    { id: 'daniel-memuletiwon', name: 'Daniel Memuletiwon (ORA Lead)' },
    { id: 'john-smith', name: 'John Smith (Plant Director)' },
    { id: 'sarah-wilson', name: 'Sarah Wilson (HSE Director)' },
    { id: 'mike-johnson', name: 'Mike Johnson (P&E Director)' }
  ];

  const getCompanyLabel = (value: string) => {
    const companies = { bgc: 'BGC', kent: 'Kent', other: 'Other' };
    return companies[value as keyof typeof companies] || value;
  };

  const getAuthenticatorName = (id: string) => {
    return authenticators.find(auth => auth.id === id)?.name || 'Unknown';
  };

  const handleCancel = () => {
    navigate('/auth');
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    
    try {
      // First, create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: `${formData.firstName} ${formData.lastName}`,
          }
        }
      });

      if (authError) {
        toast.error(`Registration failed: ${authError.message}`);
        setIsSubmitting(false);
        return;
      }

      if (authData.user) {
        // Update the profile with additional information
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            company: formData.company === 'other' ? formData.companyOther : formData.company,
            job_title: formData.userRole === 'Others (specify)' ? formData.userRoleOther : formData.userRole,
            phone_number: formData.phoneNumbers?.[0] ? 
              `${formData.phoneNumbers[0].countryCode}${formData.phoneNumbers[0].number}` : null,
            personal_email: formData.functionalEmail ? formData.personalEmail : null,
            functional_email: formData.functionalEmail,
            ta2_discipline: formData.discipline || null,
            ta2_commission: formData.commission || null,
            authenticator_id: formData.authenticator ? 
              authenticators.find(auth => auth.id === formData.authenticator)?.id : null,
            status: isAdmin ? 'active' : 'pending_approval'
          })
          .eq('user_id', authData.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }

        // Add user projects if any selected
        if (formData.projects && formData.projects.length > 0) {
          const projectInserts = formData.projects.map((project: string) => ({
            user_id: authData.user.id,
            project_name: project,
            assigned_by: authData.user.id
          }));

          const { error: projectError } = await supabase
            .from('user_projects')
            .insert(projectInserts);

          if (projectError) {
            console.error('Project assignment error:', projectError);
          }
        }

        // Send notification email to authenticator (only for non-admin users)
        if (!isAdmin && formData.authenticator) {
          try {
            const { error: notificationError } = await supabase.functions.invoke('send-notification', {
              body: {
                type: 'user_registration_approval',
                recipient_user_id: formData.authenticator,
                sender_user_id: authData.user.id,
                title: 'New User Registration Approval Required',
                content: `A new user registration request has been submitted by ${formData.firstName} ${formData.lastName} (${formData.email}). Please review and approve or reject this request.`,
                recipient_email: 'authenticator@bgc.com' // This should be fetched from the authenticator's profile
              }
            });

            if (notificationError) {
              console.error('Notification error:', notificationError);
            }
          } catch (error) {
            console.error('Failed to send notification:', error);
          }
        }

        setShowConfirmation(true);
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('An unexpected error occurred during registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmationOK = () => {
    setShowConfirmation(false);
    navigate('/auth');
  };

  if (showConfirmation) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md relative z-10">
          <Card className="shadow-lg backdrop-blur-sm bg-card/95 border-2 text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-600">Request Submitted Successfully!</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? "The user account has been created and activated."
                  : "Your registration request has been submitted. If approved, login credentials will be sent to your email address."
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleConfirmationOK} className="w-full">
                OK
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          >
            <div className="w-2 h-2 bg-primary/30 rounded-full animate-bounce" 
                 style={{ animationDelay: `${Math.random() * 2}s` }} />
          </div>
        ))}
      </div>

      <div className="w-full max-w-3xl relative z-10">
        <div className="text-center mb-8">
          <img 
            src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" 
            alt="BGC Logo" 
            className="h-16 w-auto mx-auto mb-4" 
          />
          <h1 className="text-3xl font-bold text-foreground">Review Your Registration</h1>
          <p className="text-muted-foreground mt-2">Please review and confirm your information</p>
        </div>

        <Card className="shadow-lg backdrop-blur-sm bg-card/95 border-2">
          <CardHeader>
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <Check className="h-6 w-6" />
              Registration Summary
            </CardTitle>
            <CardDescription className="text-center">
              Please review all information before submitting your request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </h3>
              <div className="grid grid-cols-2 gap-4 pl-7">
                <div>
                  <span className="text-sm text-muted-foreground">First Name:</span>
                  <p className="font-medium">{formData.firstName}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Last Name:</span>
                  <p className="font-medium">{formData.lastName}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <p className="font-medium">{formData.email}</p>
                  {formData.functionalEmail && (
                    <Badge variant="secondary" className="ml-2">Functional Email</Badge>
                  )}
                </div>
                {formData.functionalEmail && formData.personalEmail && (
                  <div>
                    <span className="text-sm text-muted-foreground">Personal Email:</span>
                    <p className="font-medium">{formData.personalEmail}</p>
                  </div>
                )}
                {formData.phoneNumbers && formData.phoneNumbers.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">Phone Numbers:</span>
                    {formData.phoneNumbers.map((phone: any, index: number) => (
                      <p key={index} className="font-medium">
                        {phone.countryCode} {phone.number}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Professional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Professional Information
              </h3>
              <div className="grid grid-cols-2 gap-4 pl-7">
                <div>
                  <span className="text-sm text-muted-foreground">Company:</span>
                  <p className="font-medium">
                    {formData.company === 'other' ? formData.companyOther : getCompanyLabel(formData.company)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Role:</span>
                  <p className="font-medium">
                    {formData.userRole === 'Others (specify)' ? formData.userRoleOther : formData.userRole}
                  </p>
                </div>
                {formData.userRole === 'Technical Authority (TA2)' && (
                  <>
                    <div>
                      <span className="text-sm text-muted-foreground">Discipline:</span>
                      <p className="font-medium">{formData.discipline}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Commission:</span>
                      <p className="font-medium">{formData.commission}</p>
                    </div>
                  </>
                )}
                {formData.projects && formData.projects.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">Projects:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {formData.projects.map((project: string) => (
                        <Badge key={project} variant="outline">{project}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {!isAdmin && formData.authenticator && (
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">Authenticator:</span>
                    <p className="font-medium">{getAuthenticatorName(formData.authenticator)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="flex-1 group"
                disabled={isSubmitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                className="flex-1 group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl"
                disabled={isSubmitting}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2 relative z-10" />
                    <span className="relative z-10">Submitting...</span>
                  </>
                ) : (
                  <>
                    <span className="relative z-10">Confirm Registration</span>
                    <Check className="ml-2 h-4 w-4 relative z-10" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUpReview;