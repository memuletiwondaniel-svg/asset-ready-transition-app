export interface ApproverStatus {
  isApprover: boolean;
  disciplineId: string | null;
  disciplineName: string | null;
  pendingCount: number;
}

// Checklist functionality has been removed, so approver status is no longer applicable
export const useUserApproverStatus = () => {
  return {
    isApprover: false,
    disciplineId: null,
    disciplineName: null,
    pendingCount: 0,
    isLoading: false,
    error: null,
  };
};
