import React, { useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Printer, FileDown, Edit2, Save, X } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from "sonner";

interface PACApprover {
  id: string;
  name: string;
  role: string;
  status?: 'pending' | 'approved' | 'rejected';
  approvedDate?: string;
  signature?: string;
}

interface PACCertificateProps {
  certificateNumber?: string;
  facilityName?: string;
  projectName?: string;
  pacDate?: string;
  approvers?: PACApprover[];
}

const defaultContent = {
  openingStatement: `This Provisional Acceptance Certificate signifies the HANDOVER of Operational CONTROL and CARE of [Facility/Pipeline Name] from Project to the Asset. The PAC confirms that all systems necessary for the safe, stable, and compliant operation and maintenance of the facilities in scope have been handed over in a state deemed fit for operational use.`,
  assetResponsibilities: [
    `Assume full responsibility for day-to-day operations of [Facility Name] utilizing competent operators and approved procedures and management systems.`,
    `Perform preventive and corrective maintenance (PMs & CMs) using Asset resources and the Asset Maintenance Management System (e.g., SAP).`,
    `Manage all changes through the Asset's Management of Change (MOC) system.`
  ],
  projectResponsibilities: [
    `Continue closing out all punch list items and open actions from STQ, MOC, and other reviews.`,
    `Provide technical clarifications, vendor liaison, and support resolution of warranty-related defects under agreed operational and environmental conditions.`
  ],
  closingStatement: `An updated Outstanding Work List (OWL) / PAC Exception Report will be jointly reviewed and issued monthly until full close-out is achieved.`
};

const PACCertificate: React.FC<PACCertificateProps> = ({
  certificateNumber = "PAC-XXXX-XXX",
  facilityName = "",
  projectName = "",
  pacDate = "",
  approvers = [
    { id: '1', name: '', role: 'Plant Director' },
    { id: '2', name: '', role: 'Project Hub Lead' },
    { id: '3', name: '', role: 'MTCE Team Lead' },
    { id: '4', name: '', role: 'Central Engr. Lead' },
    { id: '5', name: '', role: 'ORA Lead' }
  ]
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(defaultContent);
  const [editContent, setEditContent] = useState(defaultContent);

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-semibold text-foreground">Facility:</span>
                <span className="ml-2 text-muted-foreground">{facilityName || '[Enter Facility Name]'}</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">Project:</span>
                <span className="ml-2 text-muted-foreground">{projectName || '[Enter Project Name]'}</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">PAC Date:</span>
                <span className="ml-2 text-muted-foreground">{pacDate || '[Enter Date]'}</span>
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

            {/* Effective Date Section */}
            <div className="border-t border-b border-border py-4 my-4">
              <p className="font-semibold text-foreground text-center">
                Effective from the PAC sign-off date:
              </p>
            </div>

            {/* Asset Responsibilities */}
            <div>
              <h3 className="font-bold text-foreground mb-3">The Asset shall:</h3>
              {isEditing ? (
                <div className="space-y-2">
                  {editContent.assetResponsibilities.map((item, index) => (
                    <Textarea
                      key={index}
                      value={item}
                      onChange={(e) => {
                        const newItems = [...editContent.assetResponsibilities];
                        newItems[index] = e.target.value;
                        setEditContent({ ...editContent, assetResponsibilities: newItems });
                      }}
                      className="min-h-[60px]"
                    />
                  ))}
                </div>
              ) : (
                <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
                  {content.assetResponsibilities.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Project Responsibilities */}
            <div>
              <h3 className="font-bold text-foreground mb-3">The Project shall:</h3>
              {isEditing ? (
                <div className="space-y-2">
                  {editContent.projectResponsibilities.map((item, index) => (
                    <Textarea
                      key={index}
                      value={item}
                      onChange={(e) => {
                        const newItems = [...editContent.projectResponsibilities];
                        newItems[index] = e.target.value;
                        setEditContent({ ...editContent, projectResponsibilities: newItems });
                      }}
                      className="min-h-[60px]"
                    />
                  ))}
                </div>
              ) : (
                <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
                  {content.projectResponsibilities.map((item, index) => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
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
