import React, { useMemo } from 'react';
import { PartyItemsDrawer, PrereqCategoryMap } from '@/components/p2a-workspace/handover-points/vcr-standard/StandardPartiesTab';
import { useVCRPartiesRollup, PartyPerson } from '@/components/p2a-workspace/handover-points/vcr-standard/useVCRPartiesRollup';
import { useVCRPrerequisites } from '@/components/p2a-workspace/hooks/useVCRPrerequisites';
import type { DisciplineAssurance } from './hooks/useVCRDisciplineAssurance';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  handoverPointId: string;
  projectId?: string;
  vcrCode?: string;
  vcrName?: string;
  roleName?: string;
  roleId?: string | null;
  assurance?: DisciplineAssurance | null;
  fallbackHolderName?: string | null;
  fallbackAvatarUrl?: string | null;
}

/**
 * Full-alignment adapter — resolves the approver PartyPerson matching the
 * discipline role and renders the same PartyItemsDrawer used from the Parties
 * tab, so clicking a discipline comment card opens the identical drawer
 * (statement + reviewed items + counters).
 */
export const DisciplineItemsDrawerAdapter: React.FC<Props> = ({
  open,
  onOpenChange,
  handoverPointId,
  projectId,
  vcrCode,
  vcrName,
  roleName,
  assurance,
  fallbackHolderName,
  fallbackAvatarUrl,
}) => {
  const { data: rollup } = useVCRPartiesRollup(handoverPointId, projectId ?? null);
  const { prerequisites } = useVCRPrerequisites(handoverPointId);

  const prereqCategoryMap: PrereqCategoryMap = useMemo(() => {
    const m: PrereqCategoryMap = new Map();
    (prerequisites || []).forEach((p: any) => {
      m.set(p.id, {
        catCode: (p.category ?? '') as string,
        displayOrder: p.display_order ?? 0,
        topic: p.topic ?? null,
        qualStage: (p.qualification_stage ?? null) as any,
      });
    });
    return m;
  }, [prerequisites]);

  const party: PartyPerson | null = useMemo(() => {
    if (!roleName || !rollup) return null;
    const key = roleName.trim().toLowerCase();
    // Prefer approver whose role matches the discipline; fall back to delivering.
    const approver = rollup.approving.find(
      (p) => (p.role_name || '').trim().toLowerCase() === key,
    );
    if (approver) return approver;
    return rollup.delivering.find(
      (p) => (p.role_name || '').trim().toLowerCase() === key,
    ) ?? null;
  }, [rollup, roleName]);

  // Synthesize a placeholder party if the rollup hasn't resolved the reviewer
  // yet (rare) so the drawer still opens with the statement.
  const shown: PartyPerson | null = party ?? (roleName
    ? {
        user_id: assurance?.reviewer_user_id || 'unknown',
        full_name: fallbackHolderName || assurance?.reviewer?.full_name || roleName,
        avatar_url: fallbackAvatarUrl || assurance?.reviewer?.avatar_url || null,
        position: null,
        role_name: roleName,
        assigned: 0,
        completed: 0,
        items: [],
      }
    : null);

  return (
    <PartyItemsDrawer
      party={open ? shown : null}
      isApprover={true}
      vcrCode={vcrCode ?? ''}
      vcrName={vcrName ?? ''}
      onOpenChange={onOpenChange}
      handoverPointId={handoverPointId}
      projectId={projectId}
      prereqCategoryMap={prereqCategoryMap}
      disciplineStatement={assurance?.assurance_statement ?? null}
      hasStatement={!!assurance}
    />
  );
};
