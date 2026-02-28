import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ClipboardList,
  FileText,
  Upload,
  Send,
  Loader2,
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
export interface OperationalRegister {
  id: string;
  title: string;
  registerNumber: string;
  category: 'safety' | 'environmental' | 'operational' | 'maintenance' | 'quality';
  status: 'draft' | 'active' | 'under_review' | 'archived';
  owner: string;
  lastUpdated: string;
}
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AddRegisterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handoverPoint: P2AHandoverPoint;
  onRegisterCreated: (register: OperationalRegister) => void;
}

const CATEGORY_OPTIONS = [
  { value: 'safety', label: 'Safety', description: 'Safety-related registers and logs' },
  { value: 'environmental', label: 'Environmental', description: 'Environmental monitoring and compliance' },
  { value: 'operational', label: 'Operational', description: 'Day-to-day operational records' },
  { value: 'maintenance', label: 'Maintenance', description: 'Equipment maintenance logs' },
  { value: 'quality', label: 'Quality', description: 'Quality assurance and control' },
] as const;

export const AddRegisterSheet: React.FC<AddRegisterSheetProps> = ({
  open,
  onOpenChange,
  handoverPoint,
  onRegisterCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<OperationalRegister['category']>('operational');
  const [owner, setOwner] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setCategory('operational');
      setOwner('');
      const seq = String(Math.floor(Math.random() * 9000) + 1000);
      setRegisterNumber(`REG-${seq}`);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Please enter a register name', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    const newRegister: OperationalRegister = {
      id: crypto.randomUUID(),
      title: title.trim(),
      registerNumber,
      category,
      status: 'draft',
      owner: owner.trim() || 'Current User',
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    onRegisterCreated(newRegister);

    toast({
      title: 'Register Created',
      description: `${title} has been created as ${registerNumber}`,
    });

    setIsSubmitting(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0">
        <SheetHeader className="px-6 py-4 border-b bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <SheetTitle>Add Operational Register</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                For {handoverPoint.name}
              </p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {/* Register Number */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Register Number</Label>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-sm">{registerNumber}</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">Auto-generated</Badge>
              </div>
            </div>

            {/* Register Name */}
            <div className="space-y-2">
              <Label htmlFor="registerTitle" className="text-sm font-medium">
                Register Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="registerTitle"
                placeholder="e.g., Permit to Work Register"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as OperationalRegister['category'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="registerDesc" className="text-sm font-medium">Description</Label>
              <Textarea
                id="registerDesc"
                placeholder="Describe the purpose and scope of this register..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <Separator />

            {/* Owner */}
            <div className="space-y-2">
              <Label htmlFor="registerOwner" className="text-sm font-medium">Owner / Responsible Person</Label>
              <Input
                id="registerOwner"
                placeholder="e.g., John Smith"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              />
            </div>

            {/* Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Upload Template (Optional)</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-500/50 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click or drag to upload register template
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  PDF, XLSX, DOC up to 50MB
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t bg-muted/30">
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || isSubmitting}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ClipboardList className="w-4 h-4" />
                  Add Register
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
