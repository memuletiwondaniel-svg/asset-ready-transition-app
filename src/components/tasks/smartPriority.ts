import { differenceInDays, isPast, isToday } from 'date-fns';
import type { CategoryFilter } from './useUnifiedTasks';

export type SmartPriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface SmartPriorityResult {
  level: SmartPriorityLevel;
  score: number; // 0-100, higher = more urgent
  reasons: string[];
  isStartingSoon: boolean;
  isOverdue: boolean;
  daysUntilDue: number | null;
  daysUntilStart: number | null;
}

// ─── Impact weights by task type ───
const IMPACT_SCORES: Record<string, number> = {
  pssr: 85,     // Safety-critical reviews
  p2a: 75,      // Handover approvals
  ora: 65,      // ORA activities
  vcr: 55,      // VCR checklists
  owl: 50,      // Outstanding work items
  action: 40,   // General tasks
};

// ─── Sub-type boosters ───
const SUBTYPE_BOOST: Record<string, number> = {
  'PSSR Review': 10,
  'P2A Approval': 10,
  'ORA Review': 8,
  'ORA Plan': 5,
  'VCR Review': 8,
  'VCR Checklist': 0,
  'PSSR Checklist': 0,
};

export function computeSmartPriority(params: {
  category: CategoryFilter;
  categoryLabel: string;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  durationDays?: number; // from ORA activity catalog
  progressPercentage?: number;
  isWaiting?: boolean;
  createdAt: string;
}): SmartPriorityResult {
  const {
    category,
    categoryLabel,
    startDate,
    endDate,
    dueDate,
    durationDays,
    progressPercentage,
    isWaiting,
    createdAt,
  } = params;

  const reasons: string[] = [];
  const now = new Date();

  // ─── 1. Determine effective end date ───
  let effectiveEndDate: Date | null = null;
  if (endDate) {
    effectiveEndDate = new Date(endDate);
  } else if (dueDate) {
    effectiveEndDate = new Date(dueDate);
  } else if (startDate && durationDays && durationDays > 0) {
    // Infer end date from start + duration
    effectiveEndDate = new Date(startDate);
    effectiveEndDate.setDate(effectiveEndDate.getDate() + durationDays);
  }

  const effectiveStartDate = startDate ? new Date(startDate) : null;

  // ─── 2. Urgency score (0-100) — 50% weight ───
  let urgencyScore = 30; // default: no date info
  let isOverdue = false;
  let isStartingSoon = false;
  let daysUntilDue: number | null = null;
  let daysUntilStart: number | null = null;

  if (effectiveEndDate) {
    daysUntilDue = differenceInDays(effectiveEndDate, now);

    if (isPast(effectiveEndDate) && !isToday(effectiveEndDate)) {
      isOverdue = true;
      const daysOverdue = differenceInDays(now, effectiveEndDate);
      urgencyScore = Math.min(100, 90 + daysOverdue); // Escalates the longer it's overdue
      reasons.push(`${daysOverdue}d overdue`);
    } else if (isToday(effectiveEndDate)) {
      urgencyScore = 90;
      reasons.push('Due today');
    } else if (daysUntilDue <= 3) {
      urgencyScore = 80;
      reasons.push(`Due in ${daysUntilDue}d`);
    } else if (daysUntilDue <= 7) {
      urgencyScore = 60;
      reasons.push(`Due in ${daysUntilDue}d`);
    } else if (daysUntilDue <= 14) {
      urgencyScore = 40;
    } else {
      urgencyScore = 20;
    }
  }

  if (effectiveStartDate && !isOverdue) {
    daysUntilStart = differenceInDays(effectiveStartDate, now);
    if (isPast(effectiveStartDate) && !isToday(effectiveStartDate)) {
      // Start date has passed but not overdue on end → should be working on it
      if (urgencyScore < 70) urgencyScore = 70;
      reasons.push('Activity started');
    } else if (daysUntilStart <= 3 && daysUntilStart >= 0) {
      isStartingSoon = true;
      if (urgencyScore < 55) urgencyScore = 55;
      reasons.push(daysUntilStart === 0 ? 'Starts today' : `Starts in ${daysUntilStart}d`);
    }
  }

  // ─── 3. Impact score (0-100) — 30% weight ───
  const baseImpact = IMPACT_SCORES[category] || 40;
  const subtypeBoost = SUBTYPE_BOOST[categoryLabel] || 0;
  const impactScore = Math.min(100, baseImpact + subtypeBoost);
  if (impactScore >= 80) reasons.push(categoryLabel);

  // ─── 4. Momentum score (0-100) — 20% weight ───
  let momentumScore = 30;
  if (isWaiting) {
    momentumScore = 10; // De-prioritize waiting tasks
  } else if (progressPercentage != null) {
    if (progressPercentage > 0 && progressPercentage < 100) {
      // Started but not done — check if stalled
      const daysSinceCreated = differenceInDays(now, new Date(createdAt));
      if (daysSinceCreated > 14 && progressPercentage < 50) {
        momentumScore = 80; // Stalled
        reasons.push('Stalled progress');
      } else if (progressPercentage > 75) {
        momentumScore = 60; // Almost done, push to finish
        reasons.push('Nearly complete');
      } else {
        momentumScore = 40;
      }
    }
  }

  // ─── 5. Weighted total ───
  const totalScore = Math.round(
    urgencyScore * 0.5 +
    impactScore * 0.3 +
    momentumScore * 0.2
  );

  // ─── 6. Map to priority level ───
  let level: SmartPriorityLevel;
  if (isWaiting) {
    level = 'low';
  } else if (totalScore >= 80 || isOverdue) {
    level = 'critical';
  } else if (totalScore >= 60) {
    level = 'high';
  } else if (totalScore >= 40) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return {
    level,
    score: totalScore,
    reasons,
    isStartingSoon,
    isOverdue,
    daysUntilDue,
    daysUntilStart,
  };
}

// ─── Map smart priority level to the legacy 3-tier system ───
export function smartPriorityToLegacy(level: SmartPriorityLevel): 'high' | 'medium' | 'low' {
  if (level === 'critical' || level === 'high') return 'high';
  if (level === 'medium') return 'medium';
  return 'low';
}
