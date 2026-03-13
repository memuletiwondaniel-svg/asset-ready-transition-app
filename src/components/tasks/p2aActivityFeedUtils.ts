type FeedItem = {
  type: 'submission' | 'approval_action' | 'comment';
  status: string | null;
  timestamp: string;
  cycle: number | null;
};

function statusWeight(status: string | null): number {
  if (status === 'REJECTED') return 3;
  if (status === 'APPROVED') return 2;
  if (status === 'SUBMITTED') return 1;
  return 0;
}

export function sortP2AFeedEntries<T extends FeedItem>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const aHasCycle = a.type !== 'comment' && typeof a.cycle === 'number';
    const bHasCycle = b.type !== 'comment' && typeof b.cycle === 'number';

    if (aHasCycle && bHasCycle && a.cycle !== b.cycle) {
      return (b.cycle as number) - (a.cycle as number);
    }

    const timeDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    if (timeDiff !== 0) return timeDiff;

    return statusWeight(b.status) - statusWeight(a.status);
  });
}
