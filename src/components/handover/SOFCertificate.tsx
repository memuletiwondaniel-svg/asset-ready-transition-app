import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Save, X, Printer, PenLine } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVCRSoFApprovers } from '@/hooks/useVCRSoFApprovers';
import { GulfGasLockup } from '@/components/branding/GulfGasLogo';

interface SOFApprover {
  id: string;
  name: string;
  role: string;
}

interface SOFContent {
  openingStatement: string;
  confirmationItems: string[];
  closingStatement: string;
}

const defaultContent: SOFContent = {
  openingStatement: `This Statement of Fitness (SoF) certificate confirms that for the above referenced facility:\n\nRequirement 7 of the Asset Integrity Process Safety Management (AIPSM) Manual has been met:`,
  confirmationItems: [
    'Process safety risks have been identified and documented and are either managed to ALARP or appropriately being managed to ALARP through application of HEMP.',
    'Employees or contractors executing Safety Critical Activities are competent and fit to work.',
    'Safety Critical Equipment (SCE) meets its Technical Integrity requirements.',
    'Design and construction of Asset modifications meet the design and engineering requirements',
    'The Process Safety Basic Requirements (PSBR) are met.',
    'Procedures are in place to operate Safety Critical Equipment (SCE) within its Operational Limits.',
    'Modifications, if made, are complete and have been authorized as specified by the Management of Change (MoC) Manual.',
    'A Pre-Start-Up Safety Review (PSSR) has been completed and all priority 1 actions have been completed',
  ],
  closingStatement: 'The Facility therefore meets the criteria necessary to (re-) introduce hydrocarbons, process fluids or hazardous energy',
};

interface SOFCertificateProps {
  certificateNumber?: string;
  plantName?: string;
  facilityName?: string;
  projectName?: string;
  sofDate?: string;
  pssrNumber?: string;
  pssrReason?: string;
  sourceType?: 'PSSR' | 'VCR';
  approvers?: SOFApprover[];
  /** VCR only: when supplied, approver blocks resolve from vcr_sof_approvers. */
  handoverPointId?: string;
  /** VCR only: pre-composed "DP-300 - HM Additional Compressors". Falls back to projectName. */
  projectDisplay?: string;
  /** VCR only: plain-text scope block (sourced from p2a_handover_points.description). */
  scope?: string;
  /** VCR only: in-app navigation to the VCR Overview tab (click on Ref link). */
  onNavigateVcrOverview?: () => void;
}

const SOFCertificate: React.FC<SOFCertificateProps> = ({
  certificateNumber = "SOF-XXXX-XXX",
  plantName = "",
  facilityName = "",
  projectName = "",
  sofDate = "",
  pssrNumber = "",
  pssrReason = "",
  sourceType = "PSSR",
  approvers: approversProp,
  handoverPointId,
  projectDisplay,
  scope,
  onNavigateVcrOverview,
}) => {
  // Live approvers roster (VCR path): mirrors vcr_sof_approvers seat order.
  // Uses the shared hook so we get the same `sign` mutation the PAC cert has.
  const { data: sofRowsData = [], sign: signSof } = useVCRSoFApprovers(
    sourceType === 'VCR' ? handoverPointId : undefined,
  );
  const sofRows = sofRowsData as any[];
  const { data: currentUser } = useQuery({
    queryKey: ['sof-cert-current-user'],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  // Determine approvers based on sourceType and pssrReason
  const computedApprovers = React.useMemo(() => {
    // VCR path: ALWAYS use the ledger (no hardcoded fallback), so cert can never
    // render both roster + role-only stub blocks. Empty ledger => empty roster.
    if (sourceType === 'VCR') {
      if (approversProp) return approversProp;
      return sofRows.map((r: any) => ({
        id: r.id,
        name: r.user_id ? (r.approver_name || '') : '',
        role: r.approver_role,
      })) as SOFApprover[];
    }

    if (approversProp) return approversProp;

    const baseApprovers: SOFApprover[] = [
      { id: '1', name: '', role: 'Plant Director' },
      { id: '2', name: '', role: 'HSE Director' },
    ];
    const normalizedReason = (pssrReason || '').toLowerCase();
    const isProcessSafetyIncident = normalizedReason.includes('process safety incidence') || normalizedReason.includes('near miss');
    const isTAR = normalizedReason.includes('turn around maintenance') || normalizedReason.includes('tar');
    if (isProcessSafetyIncident || isTAR) {
      baseApprovers.push({ id: '4', name: '', role: 'P&M Director' });
    }
    return baseApprovers;
  }, [approversProp, sourceType, pssrReason, sofRows]);

  const approvers = computedApprovers;
  const isVCR = sourceType === 'VCR';
  const certificateRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState<SOFContent>(defaultContent);
  const [editContent, setEditContent] = useState<SOFContent>(defaultContent);

  // Fetch saved SOF template content from database
  const { data: templateData } = useQuery({
    queryKey: ['sof-template-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('handover_certificate_templates')
        .select('id, content')
        .eq('certificate_type', 'SOF')
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
        if (parsed.openingStatement && parsed.confirmationItems) {
          setContent({
            ...defaultContent,
            ...parsed
          });
        }
      } catch {
        // Content is not JSON (legacy format), keep defaults
      }
    }
  }, [templateData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newContent: SOFContent) => {
      if (!templateData?.id) throw new Error('No template found');
      const { error } = await supabase
        .from('handover_certificate_templates')
        .update({ content: JSON.stringify(newContent) })
        .eq('id', templateData.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sof-template-content'] });
    },
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
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      pdf.addImage(imgData, 'PNG', imgX, 10, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`SOF-Certificate-${certificateNumber}.pdf`);
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
            <Button variant="outline" onClick={handleExportPDF}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </>
        )}
      </div>

      {/* Certificate */}
      <Card className="bg-white shadow-lg print:shadow-none">
        <CardContent className="p-8" ref={certificateRef}>
          {/* Header */}
          <div className="text-center mb-6">
            <GulfGasLockup className="mx-auto mb-6" markHeight={40} />

            <h1 className="text-2xl font-bold text-foreground tracking-wide mb-2">
              STATEMENT OF FITNESS (SoF)
            </h1>
            <p className="text-muted-foreground font-medium">Certificate No: {certificateNumber}</p>
          </div>

          {/* Info Box */}
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
            {isVCR ? (
              <>
                {/* Stacked label-value rows: one field per row, values aligned. */}
                <dl className="text-sm space-y-2">
                  <div className="flex items-baseline">
                    <dt className="w-[110px] shrink-0 text-muted-foreground">Plant:</dt>
                    <dd className="text-foreground">{plantName || '[Plant Name]'}</dd>
                  </div>
                  <div className="flex items-baseline">
                    <dt className="w-[110px] shrink-0 text-muted-foreground">Project:</dt>
                    <dd className="text-foreground">{projectDisplay || projectName || '[Project Name]'}</dd>
                  </div>
                  <div className="flex items-baseline">
                    <dt className="w-[110px] shrink-0 text-muted-foreground">Ref:</dt>
                    <dd>
                      {onNavigateVcrOverview ? (
                        <button
                          type="button"
                          onClick={onNavigateVcrOverview}
                          className="text-primary hover:underline focus:underline focus:outline-none print:text-foreground print:no-underline"
                        >
                          {pssrNumber || '[VCR Ref]'}
                        </button>
                      ) : (
                        <span className="text-foreground">{pssrNumber || '[VCR Ref]'}</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-baseline min-w-0">
                    <dt className="w-[110px] shrink-0 text-muted-foreground">SoF Reason:</dt>
                    <dd className="text-foreground whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                      Start-up of a new Project or Facility
                    </dd>
                  </div>
                  {scope && (
                    <>
                      <div className="border-t border-border/50 my-2" />
                      <div className="flex items-baseline">
                        <dt className="w-[110px] shrink-0 text-muted-foreground">Scope:</dt>
                        <dd className="text-foreground whitespace-pre-wrap">{scope}</dd>
                      </div>
                    </>
                  )}
                </dl>
              </>

            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-foreground">Plant:</span>
                    <span className="ml-2 text-muted-foreground">{plantName || '[Plant Name]'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Facility:</span>
                    <span className="ml-2 text-muted-foreground">{facilityName || '[Facility Name]'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Project:</span>
                    <span className="ml-2 text-muted-foreground">{projectName || '[Project Name]'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-3 pt-3 border-t border-border/50">
                  <div>
                    <span className="font-semibold text-foreground">PSSR Ref:</span>
                    <span className="ml-2 text-muted-foreground">{pssrNumber || '[PSSR Ref]'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">SoF Reason:</span>
                    <span className="ml-2 text-muted-foreground">{pssrReason || '[SoF Reason]'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">SoF Date:</span>
                    <span className="ml-2 text-muted-foreground">{sofDate || '[SoF Date]'}</span>
                  </div>
                </div>
              </>
            )}
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
                <div className="space-y-4 ml-2">
                  {content.confirmationItems.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <span className="text-primary font-semibold whitespace-nowrap min-w-[2.5rem]">
                        {String(index + 1).padStart(2, '0')}.
                      </span>
                      <span className="text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Closing Statement */}
            <div className="mt-6">
              {isEditing ? (
                <Textarea
                  value={editContent.closingStatement}
                  onChange={(e) => setEditContent({ ...editContent, closingStatement: e.target.value })}
                  className="min-h-[60px]"
                />
              ) : (
                <p className="text-foreground">
                  {content.closingStatement}
                </p>
              )}
            </div>

            {/* Approvals Section */}
            <div className="mt-6 border-t border-border">
              <h3 className="font-bold text-foreground py-3 text-center border-b border-border">
                APPROVALS
              </h3>
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 mt-4 ${approvers.length <= 2 ? 'max-w-2xl' : 'max-w-3xl'} mx-auto`}>
                {approvers.map((approver) => {
                  const ledgerRow = (sofRows || []).find((r: any) => r.id === approver.id);
                  const signed = ledgerRow?.status === 'SIGNED';
                  const unassigned = isVCR ? (!!ledgerRow && !ledgerRow.user_id) : !approver.name;
                  const canSign =
                    !!ledgerRow &&
                    ledgerRow.status === 'PENDING' &&
                    !!currentUser?.id &&
                    ledgerRow.user_id === currentUser.id;
                  return (
                  <div
                    key={approver.id}
                    className={`border rounded-lg p-4 bg-background ${signed ? 'border-emerald-500/60' : 'border-border'} ${unassigned ? 'opacity-60' : ''}`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        {unassigned ? (
                          <p className="font-semibold italic text-muted-foreground">Unassigned</p>
                        ) : (
                          <p className="font-semibold text-foreground">{approver.name || approver.role}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{approver.role}</p>
                      </div>
                      {signed ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Signed
                        </span>
                      ) : ledgerRow?.status === 'PENDING' ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          Pending
                        </span>
                      ) : ledgerRow?.status === 'LOCKED' ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300">
                          Locked
                        </span>
                      ) : null}
                    </div>
                    <div className="border-t border-dashed border-border pt-3 mt-3">
                      <div className="h-14 flex items-end justify-center border-b border-dashed border-border pb-1">
                        {signed && approver.name ? (
                          (() => {
                            const parts = approver.name.split(' ');
                            const first = parts[0] || '';
                            const lastInitial = parts[1]?.[0] || '';
                            const seed = approver.name.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
                            const rotate = ((seed % 7) - 3);
                            const scale = 0.95 + ((seed % 11) / 100);
                            return (
                              <span
                                className="text-3xl text-foreground leading-none select-none"
                                style={{
                                  fontFamily:
                                    '"Segoe Script", "Lucida Handwriting", "Brush Script MT", "Apple Chancery", cursive',
                                  transform: `rotate(${rotate}deg) scale(${scale})`,
                                  letterSpacing: '0.5px',
                                }}
                              >
                                {first}
                                {lastInitial && <span style={{ marginLeft: '4px' }}>{lastInitial}.</span>}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Signature</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Date: {signed && ledgerRow?.signed_at ? new Date(ledgerRow.signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '____________'}
                      </p>
                      {canSign && (
                        <Button
                          size="sm"
                          variant="default"
                          className="print:hidden"
                          onClick={async () => {
                            try {
                              await signSof.mutateAsync({
                                approverId: ledgerRow.id,
                                signature_data: approver.name || ledgerRow.approver_name || '',
                              });
                              toast.success('SoF signed');
                            } catch (e: any) {
                              toast.error(e?.message || 'Failed to sign');
                            }
                          }}
                          disabled={signSof.isPending}
                        >
                          <PenLine className="w-3.5 h-3.5 mr-1.5" />
                          Sign
                        </Button>
                      )}
                    </div>
                  </div>
                  );
                })}
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
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          [ref="certificateRef"], [ref="certificateRef"] * { visibility: visible; }
          [ref="certificateRef"] { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default SOFCertificate;
