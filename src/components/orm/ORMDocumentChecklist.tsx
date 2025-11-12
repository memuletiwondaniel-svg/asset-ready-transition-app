import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCheck, FileX, Plus } from 'lucide-react';

interface ORMDocumentChecklistProps {
  planId: string;
  deliverables: any[];
}

const STANDARD_DOCUMENTS = [
  { name: 'P&ID (Piping & Instrumentation Diagrams)', type: 'REFERENCE', mandatory: true },
  { name: 'Cause & Effect Documents', type: 'REFERENCE', mandatory: true },
  { name: 'Equipment List', type: 'REFERENCE', mandatory: true },
  { name: 'Vendor Manuals', type: 'REFERENCE', mandatory: false },
  { name: 'As-Built Drawings', type: 'REFERENCE', mandatory: false },
  { name: 'Equipment Datasheets', type: 'REFERENCE', mandatory: true },
  { name: 'Maintenance Philosophy', type: 'REFERENCE', mandatory: false },
  { name: 'Safety Data Sheets (SDS)', type: 'REFERENCE', mandatory: true }
];

export const ORMDocumentChecklist: React.FC<ORMDocumentChecklistProps> = ({
  planId,
  deliverables
}) => {
  const [checkedDocuments, setCheckedDocuments] = useState<Record<string, boolean>>({});

  const getDeliverableLabel = (type: string) => {
    const labels: Record<string, string> = {
      ASSET_REGISTER: 'Asset Register',
      PREVENTIVE_MAINTENANCE: 'PM Routine',
      BOM_DEVELOPMENT: 'BOM',
      OPERATING_SPARES: 'Op Spares',
      IMS_UPDATE: 'IMS',
      PM_ACTIVATION: 'PM Activation'
    };
    return labels[type] || type;
  };

  const completedCount = Object.values(checkedDocuments).filter(Boolean).length;
  const completionPercentage = STANDARD_DOCUMENTS.length > 0 
    ? Math.round((completedCount / STANDARD_DOCUMENTS.length) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Document Checklist
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {completedCount} of {STANDARD_DOCUMENTS.length} documents received
            </p>
          </div>
          <Badge variant="secondary" className="text-base px-4 py-2">
            {completionPercentage}% Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={deliverables[0]?.id || 'all'} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(deliverables.length + 1, 6)}, 1fr)` }}>
            <TabsTrigger value="all">All</TabsTrigger>
            {deliverables.slice(0, 5).map((del: any) => (
              <TabsTrigger key={del.id} value={del.id}>
                {getDeliverableLabel(del.deliverable_type)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="space-y-3">
              {STANDARD_DOCUMENTS.map((doc, index) => {
                const docKey = `all-${index}`;
                const isChecked = checkedDocuments[docKey] || false;

                return (
                  <div
                    key={docKey}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          setCheckedDocuments({
                            ...checkedDocuments,
                            [docKey]: checked as boolean
                          });
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{doc.name}</span>
                          {doc.mandatory && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{doc.type}</p>
                      </div>
                    </div>
                    {isChecked ? (
                      <FileCheck className="w-5 h-5 text-green-600" />
                    ) : (
                      <FileX className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {deliverables.map((del: any) => (
            <TabsContent key={del.id} value={del.id} className="mt-6">
              <div className="space-y-3">
                {STANDARD_DOCUMENTS.map((doc, index) => {
                  const docKey = `${del.id}-${index}`;
                  const isChecked = checkedDocuments[docKey] || false;

                  return (
                    <div
                      key={docKey}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            setCheckedDocuments({
                              ...checkedDocuments,
                              [docKey]: checked as boolean
                            });
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{doc.name}</span>
                            {doc.mandatory && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{doc.type}</p>
                        </div>
                      </div>
                      {isChecked ? (
                        <FileCheck className="w-5 h-5 text-green-600" />
                      ) : (
                        <FileX className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
