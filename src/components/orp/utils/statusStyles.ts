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
    'NOT_STARTED': 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
    'IN_PROGRESS': 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300',
    'COMPLETED': 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300',
    'ON_HOLD': 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300',
  };
  return styles[status] || '';
};
