import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { SOFCertificateNavigator } from '@/components/sof/SOFCertificateNavigator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const SoFReviewPage: React.FC = () => {
  const { id: pssrId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch SoF certificate data for this PSSR
  const { data: sofData, isLoading, error } = useQuery({
    queryKey: ['sof-certificate', pssrId],
    queryFn: async () => {
      if (!pssrId) throw new Error('No PSSR ID');

      // Fetch the SoF certificate
      const { data: certificate, error: certError } = await supabase
        .from('sof_certificates')
        .select('*')
        .eq('pssr_id', pssrId)
        .maybeSingle();

      if (certError) throw certError;
      if (!certificate) throw new Error('SoF certificate not found');

      // Fetch the PSSR details (may not exist for mock data)
      const { data: pssr } = await supabase
        .from('pssrs')
        .select('pssr_id, project_name, asset, scope')
        .eq('id', pssrId)
        .maybeSingle();

      // Fetch approvers
      const { data: approvers, error: approversError } = await supabase
        .from('sof_approvers')
        .select('*')
        .eq('pssr_id', pssrId)
        .order('approver_level', { ascending: true });

      if (approversError) throw approversError;

      return {
        certificate,
        pssr, // May be null for mock data
        approvers: approvers || [],
      };
    },
    enabled: !!pssrId,
  });

  const handleBack = () => {
    navigate('/my-tasks');
  };

  if (!pssrId) {
    navigate('/my-tasks');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  if (error || !sofData) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" onClick={handleBack} className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Tasks
          </Button>
          <Card className="border-destructive/50">
            <CardContent className="pt-6 text-center">
              <p className="text-destructive">
                Failed to load SoF certificate. It may not exist for this PSSR.
              </p>
              <Button variant="outline" onClick={handleBack} className="mt-4">
                Return to Tasks
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { certificate, pssr, approvers } = sofData;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl p-4 md:p-6">
        <BreadcrumbNavigation currentPageLabel="SoF Review" />
        
        <div className="flex items-center gap-3 mt-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
            <FileCheck2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Statement of Fitness Review
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {pssr?.pssr_id || 'PSSR'} • {pssr?.project_name || certificate.project_name || 'Project'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <Card>
          <CardContent className="p-0">
            <SOFCertificateNavigator
              pssrId={pssrId}
              certificateNumber={certificate.certificate_number}
              pssrReason={certificate.pssr_reason || 'Pre-Startup Safety Review'}
              plantName={certificate.plant_name}
              facilityName={certificate.facility_name}
              projectName={certificate.project_name || pssr?.project_name}
              approvers={approvers}
              issuedAt={certificate.issued_at}
              status={certificate.status}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SoFReviewPage;
