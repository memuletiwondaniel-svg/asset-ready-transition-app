import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Upload, 
  Send, 
  FileText, 
  User, 
  Clock, 
  CheckCircle2,
  Plus,
  X,
  History
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export type ProcedureStatus = 'not_started' | 'draft' | 'site_validation' | 'final_review' | 'translated' | 'approved';

export interface Procedure {
  id: string;
  procedureNumber: string;
  title: string;
  type: 'startup' | 'normal';
  status: ProcedureStatus;
  version: string;
  owner: string;
  lastUpdated: string;
}

interface ProcedureDetailModalProps {
  procedure: Procedure | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (procedureId: string, newStatus: ProcedureStatus) => void;
}

const statusOptions: { value: ProcedureStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'draft', label: 'Draft' },
  { value: 'site_validation', label: 'Site Validation' },
  { value: 'final_review', label: 'Final Review' },
  { value: 'translated', label: 'Translated' },
  { value: 'approved', label: 'Approved for Use' },
];

const mockVersions = [
  { version: '2.1', uploadedBy: 'John Smith', date: '2024-01-15', status: 'current' },
  { version: '2.0', uploadedBy: 'John Smith', date: '2024-01-10', status: 'archived' },
  { version: '1.0', uploadedBy: 'Sarah Johnson', date: '2023-12-01', status: 'archived' },
];

export const ProcedureDetailModal: React.FC<ProcedureDetailModalProps> = ({
  procedure,
  open,
  onOpenChange,
  onStatusChange,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<ProcedureStatus>(procedure?.status || 'not_started');
  const [approvers, setApprovers] = useState<string[]>(['']);
  const [comments, setComments] = useState('');

  React.useEffect(() => {
    if (procedure) {
      setSelectedStatus(procedure.status);
    }
  }, [procedure]);

  if (!procedure) return null;

  const getStatusBadge = (status: ProcedureStatus) => {
    const statusConfig: Record<ProcedureStatus, { label: string; className: string }> = {
      'not_started': { label: 'Not Started', className: 'bg-slate-100 text-slate-600 border-slate-300' },
      'draft': { label: 'Draft', className: 'bg-amber-50 text-amber-600 border-amber-300' },
      'site_validation': { label: 'Site Validation', className: 'bg-purple-50 text-purple-600 border-purple-300' },
      'final_review': { label: 'Final Review', className: 'bg-blue-50 text-blue-600 border-blue-300' },
      'translated': { label: 'Translated', className: 'bg-cyan-50 text-cyan-600 border-cyan-300' },
      'approved': { label: 'Approved for Use', className: 'bg-green-50 text-green-600 border-green-300' },
    };
    const config = statusConfig[status];
    return <Badge variant="outline" className={`${config.className} whitespace-nowrap text-xs`}>{config.label}</Badge>;
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

  const handleStatusUpdate = () => {
    if (onStatusChange) {
      onStatusChange(procedure.id, selectedStatus);
    }
    toast({
      title: "Status Updated",
      description: `Procedure status changed to ${statusOptions.find(s => s.value === selectedStatus)?.label}`,
    });
  };

  const handleSendForApproval = () => {
    const validApprovers = approvers.filter(a => a.trim() !== '');
    if (validApprovers.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one approver",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Sent for Approval",
      description: `Procedure sent to ${validApprovers.length} approver(s)`,
    });
    onOpenChange(false);
  };

  const handleUploadVersion = () => {
    toast({
      title: "Upload Started",
      description: "Select a file to upload a new version",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">{procedure.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{procedure.procedureNumber}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Current Status & Details */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Current Status</p>
              {getStatusBadge(procedure.status)}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Version</p>
              <p className="text-sm font-medium">{procedure.version}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Owner</p>
              <p className="text-sm font-medium">{procedure.owner}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last Updated</p>
              <p className="text-sm font-medium">{procedure.lastUpdated}</p>
            </div>
          </div>

          <Separator />

          {/* Workflow Status Change */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Label className="font-medium">Update Workflow Status</Label>
            </div>
            <div className="flex gap-3">
              <Select value={selectedStatus} onValueChange={(value: ProcedureStatus) => setSelectedStatus(value)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleStatusUpdate} disabled={selectedStatus === procedure.status}>
                Update Status
              </Button>
            </div>
          </div>

          <Separator />

          {/* Version History & Upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <Label className="font-medium">Version History</Label>
              </div>
              <Button variant="outline" size="sm" onClick={handleUploadVersion}>
                <Upload className="w-4 h-4 mr-2" />
                Upload New Version
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium">Version</th>
                    <th className="text-left p-2 font-medium">Uploaded By</th>
                    <th className="text-left p-2 font-medium">Date</th>
                    <th className="text-left p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockVersions.map((v, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-mono">{v.version}</td>
                      <td className="p-2">{v.uploadedBy}</td>
                      <td className="p-2">{v.date}</td>
                      <td className="p-2">
                        <Badge variant={v.status === 'current' ? 'default' : 'secondary'} className="text-xs">
                          {v.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Approvers */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <Label className="font-medium">Set Approvers</Label>
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
          <div className="space-y-3">
            <Label className="font-medium">Comments (Optional)</Label>
            <Textarea
              placeholder="Add any comments for the approvers..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendForApproval} className="gap-2">
              <Send className="w-4 h-4" />
              Send for Approval
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
