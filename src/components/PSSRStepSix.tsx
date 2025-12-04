import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Link, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Info,
  Trash2,
  Plus,
  ArrowLeft,
  Save
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PSSRStepSixProps {
  data: any;
  onDataUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
  onSave: () => void;
  currentPssrId?: string;
}

interface PSSR {
  id: string;
  pssr_id: string;
  asset: string;
  reason: string;
  project_name?: string;
  status: string;
  approval_status: string;
  created_at: string;
}

interface PSSRLink {
  id: string;
  linked_pssr_id: string;
  linked_pssr: PSSR;
}

const PSSRStepSix: React.FC<PSSRStepSixProps> = ({ 
  data, 
  onDataUpdate, 
  onNext, 
  onBack, 
  onSave,
  currentPssrId 
}) => {
  const [availablePSSRs, setAvailablePSSRs] = useState<PSSR[]>([]);
  const [linkedPSSRs, setLinkedPSSRs] = useState<PSSRLink[]>([]);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedPSSR, setSelectedPSSR] = useState<string>('');
  const [selectedPSSRData, setSelectedPSSRData] = useState<PSSR | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAvailablePSSRs();
    if (currentPssrId) {
      fetchLinkedPSSRs();
    }
  }, [currentPssrId]);

  const fetchAvailablePSSRs = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      let query = supabase
        .from('pssrs')
        .select('*')
        .eq('user_id', user.user.id);

      // Only exclude current PSSR if it has an ID (i.e., already saved)
      if (currentPssrId) {
        query = query.neq('id', currentPssrId);
      }

      const { data: pssrs, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setAvailablePSSRs(pssrs || []);
    } catch (error) {
      console.error('Error fetching PSSRs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available PSSRs",
        variant: "destructive",
      });
    }
  };

  const fetchLinkedPSSRs = async () => {
    try {
      const { data: links, error } = await supabase
        .from('pssr_links')
        .select(`
          id,
          linked_pssr_id,
          linked_pssr:pssrs!linked_pssr_id(*)
        `)
        .eq('parent_pssr_id', currentPssrId);

      if (error) throw error;
      setLinkedPSSRs(links || []);
    } catch (error) {
      console.error('Error fetching linked PSSRs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch linked PSSRs",
        variant: "destructive",
      });
    }
  };

  const handleLinkPSSR = () => {
    setSelectedPSSR('');
    setSelectedPSSRData(null);
    setLinkDialogOpen(true);
  };

  const handlePSSRSelect = (pssrId: string) => {
    setSelectedPSSR(pssrId);
    const pssr = availablePSSRs.find(p => p.id === pssrId);
    setSelectedPSSRData(pssr || null);
  };

  const handleConfirmLink = () => {
    if (!selectedPSSRData) return;
    setLinkDialogOpen(false);
    setConfirmDialogOpen(true);
  };

  const handleFinalConfirm = async () => {
    if (!selectedPSSRData || !currentPssrId) return;

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('pssr_links')
        .insert({
          parent_pssr_id: currentPssrId,
          linked_pssr_id: selectedPSSRData.id,
          created_by: user.user.id
        });

      if (error) throw error;

      await fetchLinkedPSSRs();
      onDataUpdate({ 
        ...data, 
        linkedPSSRs: [...(data.linkedPSSRs || []), selectedPSSRData.id] 
      });

      toast({
        title: "Success",
        description: `PSSR ${selectedPSSRData.pssr_id} has been linked as a prerequisite`,
      });

      setConfirmDialogOpen(false);
      setSelectedPSSR('');
      setSelectedPSSRData(null);
    } catch (error) {
      console.error('Error linking PSSR:', error);
      toast({
        title: "Error",
        description: "Failed to link PSSR",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkPSSR = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('pssr_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      await fetchLinkedPSSRs();
      toast({
        title: "Success",
        description: "PSSR link has been removed",
      });
    } catch (error) {
      console.error('Error unlinking PSSR:', error);
      toast({
        title: "Error",
        description: "Failed to unlink PSSR",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, approvalStatus?: string) => {
    if (approvalStatus === 'APPROVED') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
    }
    if (status === 'COMPLETED') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Completed</Badge>;
    }
    if (status === 'FINALIZED') {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Finalized</Badge>;
    }
    return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Draft</Badge>;
  };

  const getStatusIcon = (status: string, approvalStatus?: string) => {
    if (approvalStatus === 'APPROVED') {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    if (status === 'COMPLETED') {
      return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
    }
    if (status === 'FINALIZED') {
      return <Clock className="h-4 w-4 text-amber-600" />;
    }
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const canProceed = () => {
    // Check if all linked PSSRs are approved
    return linkedPSSRs.every(link => 
      link.linked_pssr.approval_status === 'APPROVED' || 
      link.linked_pssr.status === 'COMPLETED'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Link PSSR</h2>
          <p className="text-gray-600 mt-1">Link this PSSR to other PSSRs as prerequisites or successors</p>
        </div>
        <Button onClick={handleLinkPSSR} className="bg-blue-600 hover:bg-blue-700">
          <Link className="h-4 w-4 mr-2" />
          Link PSSR
        </Button>
      </div>

      {/* Logical Map */}
      {linkedPSSRs.length > 0 && (
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Link className="h-5 w-5 mr-2" />
              PSSR Dependency Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center space-x-4 py-8">
              {/* Prerequisites */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-center text-gray-600 mb-4">Prerequisites</p>
                {linkedPSSRs.map((link, index) => (
                  <div key={link.id} className="relative">
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-200 min-w-[200px]">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(link.linked_pssr.status, link.linked_pssr.approval_status)}
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{link.linked_pssr.pssr_id}</p>
                          <p className="text-xs text-gray-600">{link.linked_pssr.asset}</p>
                        </div>
                        {getStatusBadge(link.linked_pssr.status, link.linked_pssr.approval_status)}
                      </div>
                    </div>
                    {index < linkedPSSRs.length - 1 && (
                      <div className="absolute left-1/2 -bottom-3 w-0.5 h-3 bg-gray-300" />
                    )}
                  </div>
                ))}
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500" />
                <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-12 border-l-purple-500 rotate-90" />
              </div>

              {/* Current PSSR */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-center text-gray-600 mb-4">Current PSSR</p>
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-lg shadow-lg min-w-[200px]">
                  <div className="text-white">
                    <p className="font-bold text-lg">{currentPssrId || 'PSSR-XXXX'}</p>
                    <p className="text-sm text-blue-100 mt-1">{data.asset || 'Current Asset'}</p>
                    <Badge variant="outline" className="mt-2 bg-white/20 text-white border-white/40">
                      In Progress
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Arrow for successors */}
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-0.5 bg-gradient-to-r from-purple-500 to-green-500" />
                <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-12 border-l-green-500 rotate-90" />
              </div>

              {/* Successors */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-center text-gray-600 mb-4">Successors</p>
                <div className="bg-white/50 p-3 rounded-lg border-2 border-dashed border-gray-300 min-w-[200px] text-center">
                  <p className="text-xs text-gray-500">No successor PSSRs</p>
                  <p className="text-xs text-gray-400 mt-1">Other PSSRs can depend on this one</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Linked PSSRs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Link className="h-5 w-5" />
            <span>Linked Prerequisites ({linkedPSSRs.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {linkedPSSRs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Link className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No linked PSSRs</p>
              <p className="text-sm">This PSSR has no prerequisites</p>
            </div>
          ) : (
            <div className="space-y-4">
              {linkedPSSRs.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(link.linked_pssr.status, link.linked_pssr.approval_status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">
                          {link.linked_pssr.pssr_id}
                        </span>
                        {getStatusBadge(link.linked_pssr.status, link.linked_pssr.approval_status)}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <p><strong>Asset:</strong> {link.linked_pssr.asset}</p>
                        <p><strong>Reason:</strong> {link.linked_pssr.reason}</p>
                        {link.linked_pssr.project_name && (
                          <p><strong>Project:</strong> {link.linked_pssr.project_name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnlinkPSSR(link.id)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prerequisites Status Warning */}
      {linkedPSSRs.length > 0 && !canProceed() && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900">Prerequisites Required</h3>
                <p className="text-sm text-amber-800 mt-1">
                  This PSSR cannot be approved until all linked prerequisites are completed and approved.
                </p>
                <div className="mt-2">
                  {linkedPSSRs
                    .filter(link => 
                      link.linked_pssr.approval_status !== 'APPROVED' && 
                      link.linked_pssr.status !== 'COMPLETED'
                    )
                    .map(link => (
                      <div key={link.id} className="text-xs text-amber-700 mt-1">
                        • {link.linked_pssr.pssr_id} - {link.linked_pssr.status}
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prerequisites Status Success */}
      {linkedPSSRs.length > 0 && canProceed() && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">All Prerequisites Met</h3>
                <p className="text-sm text-green-800 mt-1">
                  All linked prerequisite PSSRs have been completed and approved. This PSSR can proceed to approval.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link PSSR Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Link className="h-5 w-5" />
              <span>Link PSSR as Prerequisite</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-900 font-medium">About Linking PSSRs</p>
                  <p className="text-xs text-blue-800 mt-1">
                    Linking a PSSR creates a prerequisite relationship. The linked PSSR must be completed and approved before this PSSR can be approved.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="pssr-select">Select PSSR to Link</Label>
              <Select onValueChange={handlePSSRSelect} value={selectedPSSR}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Choose a PSSR..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePSSRs
                    .filter(pssr => !linkedPSSRs.some(link => link.linked_pssr_id === pssr.id))
                    .map((pssr) => (
                      <SelectItem key={pssr.id} value={pssr.id}>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{pssr.pssr_id}</span>
                          <span className="text-gray-500">-</span>
                          <span className="text-sm text-gray-600">{pssr.asset}</span>
                          {getStatusBadge(pssr.status, pssr.approval_status)}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPSSRData && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Selected PSSR Details</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>ID:</strong> {selectedPSSRData.pssr_id}</p>
                  <p><strong>Asset:</strong> {selectedPSSRData.asset}</p>
                  <p><strong>Reason:</strong> {selectedPSSRData.reason}</p>
                  {selectedPSSRData.project_name && (
                    <p><strong>Project:</strong> {selectedPSSRData.project_name}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-2">
                    <strong>Status:</strong>
                    {getStatusBadge(selectedPSSRData.status, selectedPSSRData.approval_status)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmLink}
                disabled={!selectedPSSR}
              >
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span>Confirm PSSR Link</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-amber-900 font-medium">
                The linked PSSR will become a prerequisite and must be completed before this PSSR can be approved.
              </p>
              {selectedPSSRData && (
                <div className="mt-3 p-3 bg-white rounded border">
                  <p className="font-medium">{selectedPSSRData.pssr_id}</p>
                  <p className="text-sm text-gray-600">{selectedPSSRData.asset} - {selectedPSSRData.reason}</p>
                </div>
              )}
            </div>

            <p className="text-gray-700">Do you want to proceed with linking this PSSR?</p>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleFinalConfirm}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Linking...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onBack} className="flex items-center space-x-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Approvers</span>
        </Button>
        
        <div className="flex space-x-3">
          <Button variant="outline" onClick={onSave} className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>Save</span>
          </Button>
          <Button onClick={onNext} className="flex items-center space-x-2">
            <span>Continue</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PSSRStepSix;