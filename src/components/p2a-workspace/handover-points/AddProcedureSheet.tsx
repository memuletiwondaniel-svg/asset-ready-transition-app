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
  Rocket, 
  Settings,
  FileText,
  Layers,
  User,
  Plus,
  X,
  Upload,
  Send,
  Flame,
  Snowflake
} from 'lucide-react';
import { P2AHandoverPoint, useHandoverPointSystems } from '../hooks/useP2AHandoverPoints';
import { Procedure, ProcedureStatus } from '@/components/ora/ProcedureDetailModal';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AddProcedureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handoverPoint: P2AHandoverPoint;
  onProcedureCreated: (procedure: Procedure) => void;
}

type ProcedureType = 'startup' | 'normal';

export const AddProcedureSheet: React.FC<AddProcedureSheetProps> = ({
  open,
  onOpenChange,
  handoverPoint,
  onProcedureCreated,
}) => {
  // Fetch systems mapped to this VCR
  const { systems: vcrSystems, isLoading: systemsLoading } = useHandoverPointSystems(handoverPoint.id);
  
  const [procedureType, setProcedureType] = useState<ProcedureType>('startup');
  const [procedureName, setProcedureName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [approvers, setApprovers] = useState<string[]>(['']);
  const [comments, setComments] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');

  // Generate document number based on BGC standard
  useEffect(() => {
    if (open) {
      const projectCode = 'ISGP';
      const areaCode = 'N001';
      const docType = procedureType === 'startup' ? 'ISU' : 'NOP';
      const sequentialNumber = String(Math.floor(Math.random() * 9000) + 1000);
      const revisionNumber = '001';
      
      setDocumentNumber(`BGC-${projectCode}-${areaCode}-${docType}-${sequentialNumber}-${revisionNumber}`);
    }
  }, [open, procedureType]);

  // Reset form when sheet opens
  useEffect(() => {
    if (open) {
      setProcedureName('');
      setDescription('');
      setSelectedSystems([]);
      setApprovers(['']);
      setComments('');
    }
  }, [open]);

  const handleSystemToggle = (systemId: string) => {
    setSelectedSystems(prev => 
      prev.includes(systemId) 
        ? prev.filter(id => id !== systemId)
        : [...prev, systemId]
    );
  };

  const handleAddApprover = () => {
    setApprovers([...approvers, '']);
  };

  const handleRemoveApprover = (index: number) => {
    setApprovers(approvers.filter((_, i) => i !== index));
  };

  const handleApproverChange = (index: number, value: string) => {
    const newApprovers = [...approvers];
    newApprovers[index] = value;
    setApprovers(newApprovers);
  };

  const handleSubmit = () => {
    if (!procedureName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a procedure name",
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

    const newProcedure: Procedure = {
      id: crypto.randomUUID(),
      procedureNumber: documentNumber,
      title: procedureName,
      type: procedureType,
      status: 'draft' as ProcedureStatus,
      version: '1.0',
      owner: 'Current User',
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    onProcedureCreated(newProcedure);

    toast({
      title: "Procedure Created",
      description: `${procedureName} has been created with document number ${documentNumber}`,
    });
  };

  const handleSendForApproval = () => {
    const validApprovers = approvers.filter(a => a.trim() !== '');
    if (validApprovers.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one approver before sending for approval",
        variant: "destructive",
      });
      return;
    }

    handleSubmit();
    
    toast({
      title: "Sent for Approval",
      description: `Procedure sent to ${validApprovers.length} approver(s)`,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0">
        <SheetHeader className="px-6 py-4 border-b bg-gradient-to-br from-emerald-500/5 to-green-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <SheetTitle>Create New Procedure</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                For {handoverPoint.name}
              </p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {/* Procedure Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Procedure Type</Label>
              <RadioGroup 
                value={procedureType} 
                onValueChange={(value) => setProcedureType(value as ProcedureType)}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="startup"
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all",
                    procedureType === 'startup' 
                      ? "border-orange-500 bg-orange-500/5" 
                      : "border-border hover:border-orange-500/50"
                  )}
                >
                  <RadioGroupItem value="startup" id="startup" className="sr-only" />
                  <Rocket className={cn(
                    "w-6 h-6",
                    procedureType === 'startup' ? "text-orange-500" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    procedureType === 'startup' ? "text-orange-600" : "text-foreground"
                  )}>
                    Initial Start-up
                  </span>
                  <span className="text-[10px] text-muted-foreground text-center">
                    First-time commissioning procedures
                  </span>
                </Label>

                <Label
                  htmlFor="normal"
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all",
                    procedureType === 'normal' 
                      ? "border-blue-500 bg-blue-500/5" 
                      : "border-border hover:border-blue-500/50"
                  )}
                >
                  <RadioGroupItem value="normal" id="normal" className="sr-only" />
                  <Settings className={cn(
                    "w-6 h-6",
                    procedureType === 'normal' ? "text-blue-500" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    procedureType === 'normal' ? "text-blue-600" : "text-foreground"
                  )}>
                    Normal Operating
                  </span>
                  <span className="text-[10px] text-muted-foreground text-center">
                    Standard operation procedures
                  </span>
                </Label>
              </RadioGroup>
            </div>

            <Separator />

            {/* Document Number (Auto-generated) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Document Number</Label>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-sm">{documentNumber}</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">Auto-generated</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Following BGC document management numbering system
              </p>
            </div>

            {/* Procedure Name */}
            <div className="space-y-2">
              <Label htmlFor="procedureName" className="text-sm font-medium">
                Procedure Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="procedureName"
                placeholder="e.g., Gas Turbine Initial Start-up Procedure"
                value={procedureName}
                onChange={(e) => setProcedureName(e.target.value)}
              />
            </div>

            {/* Detailed Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Detailed Explanation
              </Label>
              <Textarea
                id="description"
                placeholder="Provide a detailed explanation of the procedure, including scope, objectives, and key steps..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <Separator />

            {/* Applicable Systems - From VCR */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">
                  Applicable Systems <span className="text-destructive">*</span>
                </Label>
              </div>
              
              {systemsLoading ? (
                <div className="space-y-2 border rounded-lg p-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : vcrSystems.length === 0 ? (
                <div className="border rounded-lg p-4 text-center text-sm text-muted-foreground">
                  No systems mapped to this VCR. Please add systems first.
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3">
                  {vcrSystems.map((system: any) => (
                    <div 
                      key={system.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                        selectedSystems.includes(system.id) 
                          ? "bg-emerald-500/10" 
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => handleSystemToggle(system.id)}
                    >
                      <Checkbox 
                        checked={selectedSystems.includes(system.id)}
                        onCheckedChange={() => handleSystemToggle(system.id)}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        {system.is_hydrocarbon ? (
                          <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                        ) : (
                          <Snowflake className="w-4 h-4 text-blue-500 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{system.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{system.system_id}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedSystems.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedSystems.length} system(s) selected
                </p>
              )}
            </div>

            <Separator />

            {/* Approvers */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Set Approvers</Label>
              </div>
              <div className="space-y-2">
                {approvers.map((approver, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Enter approver email..."
                      value={approver}
                      onChange={(e) => handleApproverChange(index, e.target.value)}
                    />
                    {approvers.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveApprover(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddApprover}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Approver
                </Button>
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <Label htmlFor="comments" className="text-sm font-medium">Comments (Optional)</Label>
              <Textarea
                id="comments"
                placeholder="Add any comments for the approvers..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
            </div>

            {/* Upload Section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Upload Document</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-emerald-500/50 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click or drag to upload procedure document
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  PDF, DOC, DOCX up to 50MB
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
            <Button onClick={handleSubmit} variant="secondary" className="flex-1">
              Save as Draft
            </Button>
            <Button onClick={handleSendForApproval} className="flex-1 gap-2 bg-emerald-500 hover:bg-emerald-600">
              <Send className="w-4 h-4" />
              Send for Approval
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
