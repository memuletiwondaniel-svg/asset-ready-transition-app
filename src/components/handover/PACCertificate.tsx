import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Printer, FileDown, Edit2, Save, X } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PACApprover {
  id: string;
  name: string;
  role: string;
  status?: 'pending' | 'approved' | 'rejected';
  approvedDate?: string;
  signature?: string;
}

interface VCRSystem {
  vcrCode: string;
  vcrName: string;
  systemCode: string;
  systemName: string;
}

interface PACContent {
  openingStatement: string;
  confirmationItems: string[];
  closingStatement: string;
}

interface PACCertificateProps {
  certificateNumber?: string;
  facilityName?: string;
  projectName?: string;
  pacDate?: string;
  projectId?: string;
  approvers?: PACApprover[];
}

const defaultContent: PACContent = {
  openingStatement: `This Provisional Acceptance Certificate formalizes the transfer of Operational CONTROL , CUSTODY and CARE of [Facility/Pipeline Name] from the Project Team to the Asset Team. The PAC confirms that all handover prerequisites listed in the associated Verification Certificate of Readiness (VCR) has been reviewed and satisfactorily closed out or qualified with requisite approvals.`,
  confirmationItems: [
    `All commissioning activities have been completed and that the systems necessary for the safe, stable, and compliant operation and maintenance of the facilities in scope have been handed over in a state deemed fit for use.`,
    `The Asset has assumed full responsibility for day-to-day operations of the new facility utilizing competent operators and approved procedures and management systems.`,
    `The Asset is executing the required preventive and corrective maintenance using Asset resources and the Asset Maintenance Management System (e.g., SAP) and where applicable, with the support of project team (until expiry of the aftercare support period).`,
    `The Asset would manage all changes through the Asset's Management of Change (MOC) system.`,
    `The Project shall continue closing out all punch list items and open actions from STQ, MOC, and other reviews.`,
    `The Project shall continue to provide technical clarifications, vendor liaison, and support resolution of warranty-related defects under agreed operational and environmental conditions.`
  ],
  closingStatement: `An updated Outstanding Work List (OWL) / PAC Exception Report will be jointly reviewed and issued monthly until full close-out is achieved.`
};

const PACCertificate: React.FC<PACCertificateProps> = ({
  certificateNumber = "PAC-XXXX-XXX",
  facilityName = "",
  projectName = "",
  pacDate = "",
  projectId,
  approvers = [
    { id: '1', name: '', role: 'Plant Director' },
    { id: '2', name: '', role: 'Project Hub Lead' }
  ]
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState<PACContent>(defaultContent);
  const [editContent, setEditContent] = useState<PACContent>(defaultContent);

  // Fetch saved PAC template content from database
  const { data: templateData } = useQuery({
    queryKey: ['pac-template-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('handover_certificate_templates')
        .select('id, content')
        .eq('certificate_type', 'PAC')
        .eq('is_default', true)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Parse stored content on load
  useEffect(() => {
    if (templateData?.content) {
      try {
        const parsed = JSON.parse(templateData.content);
        if (parsed.openingStatement && parsed.confirmationItems && parsed.closingStatement) {
          setContent(parsed);
        }
      } catch {
        // Content is not JSON (legacy format), keep defaults
      }
    }
  }, [templateData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newContent: PACContent) => {
      if (!templateData?.id) throw new Error('No template found');
      const { error } = await supabase
        .from('handover_certificate_templates')
        .update({ content: JSON.stringify(newContent) })
        .eq('id', templateData.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pac-template-content'] });
    },
  });

  // Fetch VCR systems for the associated project
  const { data: vcrSystems = [] } = useQuery({
    queryKey: ['pac-vcr-systems', projectId],
    queryFn: async (): Promise<VCRSystem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      const planResult = await client
        .from('p2a_handover_plans')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle();

      if (planResult.error) throw planResult.error;
      if (!planResult.data) return [];

      const hpResult = await client
        .from('p2a_handover_points')
        .select('id, vcr_code, name')
        .eq('handover_plan_id', planResult.data.id)
        .order('vcr_code', { ascending: true });

      if (hpResult.error) throw hpResult.error;
      if (!hpResult.data || hpResult.data.length === 0) return [];

      const allSystems: VCRSystem[] = [];
      for (const hp of hpResult.data) {
        const sysResult = await client
          .from('p2a_handover_point_systems')
          .select('system_id')
          .eq('handover_point_id', hp.id);
        
        if (sysResult.data && sysResult.data.length > 0) {
          const systemIds = sysResult.data.map((s: any) => s.system_id);
          const detailsResult = await client
            .from('p2a_systems')
            .select('system_id, name')
            .in('id', systemIds);

          if (detailsResult.data) {
            for (const sys of detailsResult.data) {
              allSystems.push({
                vcrCode: hp.vcr_code,
                vcrName: hp.name,
                systemCode: sys.system_id,
                systemName: sys.name,
              });
            }
          }
        }
      }
      return allSystems;
    },
    enabled: !!projectId,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!certificateRef.current) return;

    try {
      toast.info("Generating PDF...");
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`PAC-Certificate-${certificateNumber}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Failed to export PDF");
    }
  };

  const handleEdit = () => {
    setEditContent(content);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setContent(editContent);
    setIsEditing(false);
    try {
      await saveMutation.mutateAsync(editContent);
      toast.success("Certificate content saved successfully!");
    } catch (error) {
      console.error('Error saving certificate:', error);
      toast.error("Failed to save certificate content to database");
    }
  };

  const handleCancel = () => {
    setEditContent(content);
    setIsEditing(false);
  };


  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex justify-end gap-2 print:hidden">
        {isEditing ? (
          <>
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={handleEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </>
        )}
      </div>

      {/* Certificate */}
      <Card className="bg-white shadow-lg print:shadow-none">
        <CardContent className="p-8" ref={certificateRef}>
          {/* Header */}
          <div className="text-center mb-6">
            <img 
              src="/images/bgc-logo.png" 
              alt="Company Logo" 
              className="h-16 mx-auto mb-4"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20 mb-4" />
            <h1 className="text-2xl font-bold text-foreground tracking-wide mb-2">
              PROVISIONAL ACCEPTANCE CERTIFICATE
            </h1>
            <p className="text-muted-foreground font-medium">Certificate No: {certificateNumber}</p>
          </div>

          {/* Info Box */}
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-semibold text-foreground">Facility:</span>
                <span className="ml-2 text-muted-foreground">{facilityName || '[Facility Name]'}</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">Project:</span>
                <span className="ml-2 text-muted-foreground">{projectName || '[Project Name]'}</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">VCR Ref:</span>
                <span className="ml-2 text-muted-foreground">
                  {vcrSystems.length > 0
                    ? [...new Set(vcrSystems.map(s => s.vcrCode))].join(', ')
                    : '[VCR Ref]'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-foreground">PAC Date:</span>
                <span className="ml-2 text-muted-foreground">{pacDate || '[PAC Date]'}</span>
              </div>
            </div>
          </div>

          {/* Certificate Body */}
          <div className="space-y-6 text-sm leading-relaxed">
            {/* Opening Statement */}
            {isEditing ? (
              <Textarea
                value={editContent.openingStatement}
                onChange={(e) => setEditContent({ ...editContent, openingStatement: e.target.value })}
                className="min-h-[100px]"
              />
            ) : (
              <p className="text-foreground">{content.openingStatement}</p>
            )}

            {/* Systems in Scope */}
            <div>
              <h3 className="text-base font-extrabold text-foreground mb-3">Systems in Scope:</h3>
              {vcrSystems.length > 0 ? (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60">
                        <th className="text-left px-3 py-2 font-semibold text-foreground border-b border-border">#</th>
                        <th className="text-left px-3 py-2 font-semibold text-foreground border-b border-border">VCR</th>
                        <th className="text-left px-3 py-2 font-semibold text-foreground border-b border-border">System Code</th>
                        <th className="text-left px-3 py-2 font-semibold text-foreground border-b border-border">System Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vcrSystems.map((sys, idx) => (
                        <tr key={`${sys.vcrCode}-${sys.systemCode}-${idx}`} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                          <td className="px-3 py-1.5 text-muted-foreground border-b border-border/50">{idx + 1}</td>
                          <td className="px-3 py-1.5 text-foreground border-b border-border/50">
                            <span className="font-medium">{sys.vcrCode}</span>
                            <span className="text-muted-foreground ml-1.5">– {sys.vcrName}</span>
                          </td>
                          <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground border-b border-border/50">{sys.systemCode}</td>
                          <td className="px-3 py-1.5 text-foreground border-b border-border/50">{sys.systemName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground italic text-xs">
                  Systems will be auto-populated from VCRs associated with this certificate.
                </p>
              )}
            </div>

            {/* Effective Date Section */}
            <div className="border-t border-b border-border py-4 my-4">
              <p className="font-semibold text-foreground text-center">
                For the systems listed above, this PAC confirms that:
              </p>
            </div>

            {/* Confirmation Items */}
            <div>
              {isEditing ? (
                <div className="space-y-2">
                  {editContent.confirmationItems.map((item, index) => (
                    <Textarea
                      key={index}
                      value={item}
                      onChange={(e) => {
                        const newItems = [...editContent.confirmationItems];
                        newItems[index] = e.target.value;
                        setEditContent({ ...editContent, confirmationItems: newItems });
                      }}
                      className="min-h-[60px]"
                    />
                  ))}
                </div>
              ) : (
                <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
                  {content.confirmationItems.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Closing Statement */}
            <div className="border-t border-border pt-4">
              {isEditing ? (
                <Textarea
                  value={editContent.closingStatement}
                  onChange={(e) => setEditContent({ ...editContent, closingStatement: e.target.value })}
                  className="min-h-[60px]"
                />
              ) : (
                <p className="text-foreground italic">{content.closingStatement}</p>
              )}
            </div>

            {/* Approvals Section */}
            <div className="mt-8">
              <h3 className="font-bold text-foreground mb-4 text-center border-b border-border pb-2">
                APPROVALS
              </h3>
              <div className="flex flex-col md:flex-row justify-center gap-8 md:gap-24 mt-4">
                {approvers.map((approver) => (
                  <div 
                    key={approver.id} 
                    className="border border-border rounded-lg p-4 bg-background"
                  >
                    <div className="mb-3">
                      <p className="font-semibold text-foreground">{approver.role}</p>
                      {approver.name && (
                        <p className="text-xs text-muted-foreground">{approver.name}</p>
                      )}
                    </div>
                    <div className="border-t border-dashed border-border pt-3 mt-3">
                      <div className="h-12 flex items-center justify-center text-muted-foreground text-xs italic border-b border-dashed border-border">
                        Signature
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">Date: ____________</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-border text-center text-xs text-muted-foreground">
              <p>Issue Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p className="italic mt-2">
                This document is electronically generated and valid without physical signature.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          [ref="certificateRef"], [ref="certificateRef"] * {
            visibility: visible;
          }
          [ref="certificateRef"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default PACCertificate;
