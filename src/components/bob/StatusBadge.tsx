import React from 'react';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  AFU: { label: 'AFU', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
  AFC: { label: 'AFC', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300' },
  IFB: { label: 'IFB', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-300' },
  IFT: { label: 'IFT', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-300' },
  IFI: { label: 'IFI', bg: 'bg-slate-100 dark:bg-slate-800/40', text: 'text-slate-600 dark:text-slate-400' },
  IFA: { label: 'IFA', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
  IFC: { label: 'IFC', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300' },
  IFR: { label: 'IFR', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300' },
  CAN: { label: 'CAN', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
  REV: { label: 'REV', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  SUP: { label: 'SUP', bg: 'bg-gray-100 dark:bg-gray-800/40', text: 'text-gray-500 dark:text-gray-400' },
  AFD: { label: 'AFD', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-800 dark:text-teal-300' },
};

export function StatusBadge({ code }: { code: string }) {
  const cfg = STATUS_CONFIG[code.toUpperCase()];
  if (!cfg) return <span>{code}</span>;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

const STATUS_PATTERN = /\b(AFU|AFC|AFD|IFB|IFT|IFI|IFA|IFC|IFR|CAN|REV|SUP)\b/g;

export function renderWithStatusBadges(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match;
  STATUS_PATTERN.lastIndex = 0;
  while ((match = STATUS_PATTERN.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<StatusBadge key={`sb-${match.index}`} code={match[0]} />);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
}
