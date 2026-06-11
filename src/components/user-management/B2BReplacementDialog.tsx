/**
 * B2B cap-2 replacement dialog.
 *
 * Shown when an admin tries to assign a user to a (role, portfolio)
 * where the back-to-back pair is already complete. The admin MUST pick
 * which existing holder is being replaced — the chosen holder's roster
 * row is deleted atomically in the same save (see
 * `set_user_region_role_holders_v2`), so the cap-2 trigger sees a
 * consistent state and the swap is loss-free.
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import type { RegionRoleHolder } from '@/hooks/usePortfolioRoleHolders';

export interface B2BReplacementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleName: string;
  regionName: string;
  newUserName: string;
  holders: RegionRoleHolder[];
  onConfirm: (replaceUserId: string) => void;
}

export const B2BReplacementDialog: React.FC<B2BReplacementDialogProps> = ({
  open,
  onOpenChange,
  roleName,
  regionName,
  newUserName,
  holders,
  onConfirm,
}) => {
  const [replaceId, setReplaceId] = useState<string>('');

  useEffect(() => {
    if (open) setReplaceId('');
  }, [open]);

  const pairText = holders.map((h) => h.full_name).join(' + ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Pair already complete
          </DialogTitle>
          <DialogDescription>
            {regionName} already has a complete {roleName} pair ({pairText}).
            To assign <span className="font-medium">{newUserName}</span>,
            choose who they replace.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={replaceId} onValueChange={setReplaceId} className="space-y-2 py-2">
          {holders.map((h) => (
            <div
              key={h.user_id}
              className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent"
            >
              <RadioGroupItem value={h.user_id} id={`replace-${h.user_id}`} />
              <Label htmlFor={`replace-${h.user_id}`} className="flex-1 cursor-pointer">
                Replace <span className="font-medium">{h.full_name}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!replaceId}
            onClick={() => {
              if (replaceId) onConfirm(replaceId);
            }}
          >
            Confirm replacement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default B2BReplacementDialog;
