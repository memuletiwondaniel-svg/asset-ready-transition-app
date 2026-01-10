export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'NOT_STARTED': 'Not Started',
    'IN_PROGRESS': 'In Progress',
    'COMPLETED': 'Completed',
    'ON_HOLD': 'On Hold',
  };
  return labels[status] || status.replace('_', ' ');
};

export const getStatusBadgeClasses = (status: string): string => {
  const styles: Record<string, string> = {
    'NOT_STARTED': 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700',
    'IN_PROGRESS': 'bg-blue-50 text-blue-500 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    'COMPLETED': 'bg-green-50 text-green-500 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    'ON_HOLD': 'bg-amber-50 text-amber-500 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  };
  return styles[status] || '';
};
