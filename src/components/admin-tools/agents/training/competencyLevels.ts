export interface CompetencyLevel {
  key: string;
  label: string;
  min: number;
  max: number;
  color: string;       // tailwind bg class
  dotColor: string;    // tailwind text class for dot
  chartColor: string;  // HSL string for Recharts
}

export const competencyLevels: CompetencyLevel[] = [
  { key: 'not_started',  label: 'Not Started',   min: 0,  max: 24,  color: 'bg-muted',         dotColor: 'text-muted-foreground/40', chartColor: 'hsl(var(--muted-foreground))' },
  { key: 'foundational', label: 'Foundational',   min: 25, max: 49,  color: 'bg-amber-500',     dotColor: 'text-amber-500',           chartColor: 'hsl(45, 93%, 47%)' },
  { key: 'developing',   label: 'Developing',     min: 50, max: 69,  color: 'bg-blue-500',      dotColor: 'text-blue-500',            chartColor: 'hsl(217, 91%, 60%)' },
  { key: 'proficient',   label: 'Proficient',     min: 70, max: 84,  color: 'bg-emerald-500',   dotColor: 'text-emerald-500',         chartColor: 'hsl(160, 84%, 39%)' },
  { key: 'expert',       label: 'Expert',         min: 85, max: 100, color: 'bg-primary',       dotColor: 'text-primary',             chartColor: 'hsl(var(--primary))' },
];

export function getLevelFromProgress(progress: number): CompetencyLevel {
  return competencyLevels.find(l => progress >= l.min && progress <= l.max) || competencyLevels[0];
}

export function isNewCompetency(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
}
