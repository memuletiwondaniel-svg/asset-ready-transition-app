import React, { useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileDown, Edit2, Save, X } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from "sonner";
import { useFACPrerequisites } from '@/hooks/useHandoverPrerequisites';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FACApprover {
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

interface FACCertificateProps {
  certificateNumber?: string;
  facilityName?: string;
  projectName?: string;
  facDate?: string;
  projectId?: string;
  approvers?: FACApprover[];
}

const defaultContent = {
  openingStatement: `This Final Acceptance Certificate (FAC) confirms that the project has been completed in full accordance with the agreed project scope, and that all deliverables have been accepted by both the Asset and Project Teams.`,
  ownershipStatement: `Effective from the FAC sign-off date, the Asset takes over full ownership of the Operation and Maintenance, with accountability and responsibility of the facilities, systems, and sub-systems, as detailed in project scope document. The Project and Asset teams agree that:`
};

const FACCertificate: React.FC<FACCertificateProps> = ({
  certificateNumber = "FAC-XXXX-XXX",
  facilityName = "",
  projectName = "",
  facDate = "",
  projectId,
  approvers = [
    { id: '1', name: '', role: 'Plant Director' },
    { id: '2', name: '', role: 'Project Manager' }
  ]
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(defaultContent);
  const [editContent, setEditContent] = useState(defaultContent);
  
  const { data: facPrerequisites = [], isLoading: isLoadingPrerequisites } = useFACPrerequisites();

  // Fetch VCR systems for the associated project
  const { data: vcrSystems = [] } = useQuery({
    queryKey: ['fac-vcr-systems', projectId],
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
      pdf.save(`FAC-Certificate-${certificateNumber}.pdf`);
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

  const handleSave = () => {
    setContent(editContent);
    setIsEditing(false);
    toast.success("Certificate content saved successfully!");
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
              FINAL ACCEPTANCE CERTIFICATE
            </h1>
            <p className="text-muted-foreground font-medium">Certificate No: {certificateNumber}</p>
          </div>

          {/* Info Box */}
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-semibold text-foreground">Facility:</span>
                <span className="ml-2 text-muted-foreground">{facilityName || '[Facility Name]'}</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">Project:</span>
                <span className="ml-2 text-muted-foreground">{projectName || '[Project Name]'}</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">FAC Date:</span>
                <span className="ml-2 text-muted-foreground">{facDate || '[FAC Date]'}</span>
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

            {/* Ownership Statement */}
            {isEditing ? (
              <Textarea
                value={editContent.ownershipStatement}
                onChange={(e) => setEditContent({ ...editContent, ownershipStatement: e.target.value })}
                className="min-h-[120px]"
              />
            ) : (
              <p className="text-foreground">{content.ownershipStatement}</p>
            )}

            {/* Prerequisites List - Read Only */}
            <div className="mt-6 ml-6 p-5 bg-muted/30 rounded-lg border border-border/50">
              {isLoadingPrerequisites ? (
                <p className="text-muted-foreground text-sm italic">Loading prerequisites...</p>
              ) : facPrerequisites.length > 0 ? (
                <ol className="space-y-4 text-foreground">
                  {[...facPrerequisites]
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((prereq, index) => (
                      <li key={prereq.id} className="flex gap-3 leading-relaxed">
                        <span className="font-semibold text-primary min-w-[28px]">
                          {String(index + 1).padStart(2, '0')}.
                        </span>
                        <span>{prereq.summary}</span>
                      </li>
                    ))}
                </ol>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  No prerequisites defined. Add prerequisites from the Prerequisites tab.
                </p>
              )}
            </div>

            {/* Approvals Section */}
            <div className="mt-8">
              <h3 className="font-bold text-foreground mb-4 text-center border-b border-border pb-2">
                APPROVALS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-4 max-w-2xl mx-auto">
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

export default FACCertificate;
