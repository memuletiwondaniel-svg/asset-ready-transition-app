import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useP2ADeliverableCategories } from '@/hooks/useP2AHandovers';
import { Package, FileText, Users, Settings, BookOpen, Shield, TestTube, Wrench, FileSignature, ClipboardList, AlertTriangle, Award } from 'lucide-react';

interface WizardStepScopeDeliverablesProps {
  handoverScope: string;
  selectedCategories: string[];
  onScopeChange: (scope: string) => void;
  onCategoriesChange: (categories: string[]) => void;
}

const getCategoryIcon = (name: string) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'Construction & Commissioning': Package,
    'Resourcing': Users,
    'Training': BookOpen,
    'Documentation': FileText,
    'SUOP': Settings,
    'PSSR/SoF': Shield,
    'Performance Test': TestTube,
    'Maintenance Readiness': Wrench,
    'Service Contract': FileSignature,
    'PAC': ClipboardList,
    'OWL': AlertTriangle,
    'FAC': Award,
  };
  return iconMap[name] || Package;
};

export const WizardStepScopeDeliverables: React.FC<WizardStepScopeDeliverablesProps> = ({
  handoverScope,
  selectedCategories,
  onScopeChange,
  onCategoriesChange,
}) => {
  const { categories, isLoading } = useP2ADeliverableCategories();

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoriesChange(selectedCategories.filter(c => c !== categoryId));
    } else {
      onCategoriesChange([...selectedCategories, categoryId]);
    }
  };

  const selectAll = () => {
    if (categories) {
      onCategoriesChange(categories.map(c => c.id));
    }
  };

  const deselectAll = () => {
    onCategoriesChange([]);
  };

  return (
    <div className="space-y-6">
      {/* Handover Scope */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Scope of Handover</Label>
        <Textarea
          placeholder="Describe the scope of this handover (e.g., ISBL, OSBL, specific units or systems)..."
          value={handoverScope}
          onChange={(e) => onScopeChange(e.target.value)}
          rows={4}
          className="resize-none"
        />
        <p className="text-sm text-muted-foreground">
          Define what facilities, units, or systems are included in this handover package.
        </p>
      </div>

      {/* Deliverable Categories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Deliverable Categories to Track</Label>
          <div className="flex gap-2">
            <button 
              onClick={selectAll}
              className="text-sm text-primary hover:underline"
              type="button"
            >
              Select All
            </button>
            <span className="text-muted-foreground">|</span>
            <button 
              onClick={deselectAll}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              type="button"
            >
              Deselect All
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories?.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              const Icon = getCategoryIcon(category.name);
              return (
                <Card 
                  key={category.id}
                  className={`cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => toggleCategory(category.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleCategory(category.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="font-medium text-sm truncate">{category.name}</span>
                        </div>
                        {category.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        
        <p className="text-sm text-muted-foreground">
          Selected: {selectedCategories.length} of {categories?.length || 0} categories
        </p>
      </div>
    </div>
  );
};
