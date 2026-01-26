import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText,
  Layers,
  Upload,
  Send,
  AlertCircle
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface AddDocumentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handoverPoint: P2AHandoverPoint;
  onDocumentCreated: (document: VCRDocument) => void;
}

interface VCRDocument {
  id: string;
  documentNumber: string;
  documentTypeCode: string;
  documentTypeName: string;
  title: string;
  tier: 1 | 2;
  status: 'not_started' | 'draft' | 'in_review' | 'approved' | 'published';
  version: string;
  owner: string;
  lastUpdated: string;
  systems: string[];
}

interface PLIPDocumentType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  tier: number;
  category: string;
  display_order: number;
}

// Mock systems - in real implementation this would come from VCR systems
const mockSystems = [
  { id: '1', name: 'Gas Turbine Generator', system_id: 'GTG-001' },
  { id: '2', name: 'Steam Turbine', system_id: 'STG-001' },
  { id: '3', name: 'Compressor Train A', system_id: 'CMP-001' },
  { id: '4', name: 'Heat Recovery Steam Generator', system_id: 'HRSG-001' },
  { id: '5', name: 'Cooling Water System', system_id: 'CWS-001' },
];

export const AddDocumentSheet: React.FC<AddDocumentSheetProps> = ({
  open,
  onOpenChange,
  handoverPoint,
  onDocumentCreated,
}) => {
  const [tier, setTier] = useState<'1' | '2'>('1');
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [documentNumber, setDocumentNumber] = useState('');

  // Fetch document types from database
  const { data: documentTypes, isLoading: isLoadingTypes } = useQuery({
    queryKey: ['plip-document-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plip_document_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as PLIPDocumentType[];
    },
  });

  // Filter document types by selected tier
  const filteredDocTypes = documentTypes?.filter(dt => dt.tier === parseInt(tier)) || [];

  // Group document types by category
  const groupedDocTypes = filteredDocTypes.reduce((acc, dt) => {
    if (!acc[dt.category]) {
      acc[dt.category] = [];
    }
    acc[dt.category].push(dt);
    return acc;
  }, {} as Record<string, PLIPDocumentType[]>);

  // Generate document number when type is selected
  useEffect(() => {
    if (selectedDocumentType && documentTypes) {
      const docType = documentTypes.find(dt => dt.id === selectedDocumentType);
      if (docType) {
        const tierPrefix = tier === '1' ? 'T1' : 'T2';
        const sequentialNumber = String(Math.floor(Math.random() * 900) + 100);
        setDocumentNumber(`RLMU-${tierPrefix}-${sequentialNumber}`);
      }
    }
  }, [selectedDocumentType, tier, documentTypes]);

  // Reset document type when tier changes
  useEffect(() => {
    setSelectedDocumentType('');
  }, [tier]);

  const handleSystemToggle = (systemId: string) => {
    setSelectedSystems(prev => 
      prev.includes(systemId) 
        ? prev.filter(id => id !== systemId)
        : [...prev, systemId]
    );
  };

  const handleSubmit = () => {
    if (!selectedDocumentType) {
      toast({
        title: "Error",
        description: "Please select a document type",
        variant: "destructive",
      });
      return;
    }

    if (!documentTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a document title",
        variant: "destructive",
      });
      return;
    }

    if (selectedSystems.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one applicable system",
        variant: "destructive",
      });
      return;
    }

    const docType = documentTypes?.find(dt => dt.id === selectedDocumentType);
    const systemIds = mockSystems
      .filter(s => selectedSystems.includes(s.id))
      .map(s => s.system_id);

    const newDocument: VCRDocument = {
      id: crypto.randomUUID(),
      documentNumber,
      documentTypeCode: docType?.code || '',
      documentTypeName: docType?.name || '',
      title: documentTitle,
      tier: parseInt(tier) as 1 | 2,
      status: 'draft',
      version: '1.0',
      owner: 'Current User',
      lastUpdated: new Date().toISOString().split('T')[0],
      systems: systemIds,
    };

    onDocumentCreated(newDocument);

    toast({
      title: "Document Added",
      description: `${documentTitle} has been added with number ${documentNumber}`,
    });

    resetForm();
  };

  const resetForm = () => {
    setTier('1');
    setSelectedDocumentType('');
    setDocumentTitle('');
    setDescription('');
    setSelectedSystems([]);
  };

  const selectedDocType = documentTypes?.find(dt => dt.id === selectedDocumentType);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0">
        <SheetHeader className="px-6 py-4 border-b bg-gradient-to-br from-amber-500/5 to-orange-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <SheetTitle>Add Document (RLMU)</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Red Line Markup for {handoverPoint.name}
              </p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {/* Tier Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Document Tier</Label>
              <RadioGroup 
                value={tier} 
                onValueChange={(value) => setTier(value as '1' | '2')}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="tier1"
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all",
                    tier === '1' 
                      ? "border-orange-500 bg-orange-500/5" 
                      : "border-border hover:border-orange-500/50"
                  )}
                >
                  <RadioGroupItem value="1" id="tier1" className="sr-only" />
                  <AlertCircle className={cn(
                    "w-6 h-6",
                    tier === '1' ? "text-orange-500" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    tier === '1' ? "text-orange-600" : "text-foreground"
                  )}>
                    Tier 1 - Critical
                  </span>
                  <span className="text-[10px] text-muted-foreground text-center">
                    Essential documents for safe operations
                  </span>
                </Label>

                <Label
                  htmlFor="tier2"
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all",
                    tier === '2' 
                      ? "border-blue-500 bg-blue-500/5" 
                      : "border-border hover:border-blue-500/50"
                  )}
                >
                  <RadioGroupItem value="2" id="tier2" className="sr-only" />
                  <FileText className={cn(
                    "w-6 h-6",
                    tier === '2' ? "text-blue-500" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    tier === '2' ? "text-blue-600" : "text-foreground"
                  )}>
                    Tier 2 - Supporting
                  </span>
                  <span className="text-[10px] text-muted-foreground text-center">
                    Supporting documentation
                  </span>
                </Label>
              </RadioGroup>
            </div>

            <Separator />

            {/* Document Type Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Document Type <span className="text-destructive">*</span>
              </Label>
              {isLoadingTypes ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {Object.entries(groupedDocTypes).map(([category, types]) => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                          {category}
                        </div>
                        {types.map((dt) => (
                          <SelectItem key={dt.id} value={dt.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">{dt.code}</span>
                              <span className="text-sm">{dt.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedDocType && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedDocType.code}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {selectedDocType.description || selectedDocType.name}
                  </span>
                </div>
              )}
            </div>

            {/* Document Number (Auto-generated) */}
            {selectedDocumentType && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Document Number</Label>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{documentNumber}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">Auto-generated</Badge>
                </div>
              </div>
            )}

            {/* Document Title */}
            <div className="space-y-2">
              <Label htmlFor="documentTitle" className="text-sm font-medium">
                Document Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="documentTitle"
                placeholder="e.g., Gas Turbine P&ID Red Line Markup"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Additional details about this document..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <Separator />

            {/* Applicable Systems */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">
                  Applicable Systems <span className="text-destructive">*</span>
                </Label>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3">
                {mockSystems.map((system) => (
                  <div 
                    key={system.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                      selectedSystems.includes(system.id) 
                        ? "bg-amber-500/10" 
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => handleSystemToggle(system.id)}
                  >
                    <Checkbox 
                      checked={selectedSystems.includes(system.id)}
                      onCheckedChange={() => handleSystemToggle(system.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{system.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{system.system_id}</p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedSystems.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedSystems.length} system(s) selected
                </p>
              )}
            </div>

            <Separator />

            {/* Upload Section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Upload Document</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-amber-500/50 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click or drag to upload document
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  PDF, DWG, DXF up to 100MB
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t bg-muted/30">
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1 gap-2 bg-amber-500 hover:bg-amber-600">
              <Send className="w-4 h-4" />
              Add Document
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
