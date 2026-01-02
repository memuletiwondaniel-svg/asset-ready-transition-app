import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building2, AlertTriangle, Wrench, FileText, Loader2, PlusCircle } from 'lucide-react';
import { useActivePSSRReasonCategories } from '@/hooks/usePSSRReasonCategories';

export type SubCategoryType = 'P&E' | 'BFM' | null;

interface WizardStepCategoryProps {
  categoryId: string | null;
  subCategory: SubCategoryType;
  onCategoryChange: (categoryId: string) => void;
  onSubCategoryChange: (subCategory: SubCategoryType) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  'Building2': <Building2 className="h-5 w-5" />,
  'AlertTriangle': <AlertTriangle className="h-5 w-5" />,
  'Wrench': <Wrench className="h-5 w-5" />,
  'FileText': <FileText className="h-5 w-5" />,
  'PlusCircle': <PlusCircle className="h-5 w-5" />,
};

const WizardStepCategory: React.FC<WizardStepCategoryProps> = ({
  categoryId,
  subCategory,
  onCategoryChange,
  onSubCategoryChange,
}) => {
  const { data: categories, isLoading } = useActivePSSRReasonCategories();
  
  const selectedCategory = categories?.find(c => c.id === categoryId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Category *</Label>
        <RadioGroup
          value={categoryId || ''}
          onValueChange={(value) => {
            onCategoryChange(value);
            // Reset sub-category when category changes
            const newCategory = categories?.find(c => c.id === value);
            if (newCategory?.code !== 'PROJECT_STARTUP') {
              onSubCategoryChange(null);
            }
          }}
          className="grid gap-3"
        >
          {categories?.filter(category => category.code !== 'OTHERS').map((category) => (
            <div key={category.id} className="relative">
              <RadioGroupItem
                value={category.id}
                id={category.id}
                className="peer sr-only"
              />
              <Label
                htmlFor={category.id}
                className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:bg-accent/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
              >
                <div className="p-2 rounded-full bg-muted">
                  {iconMap[category.icon || 'FileText'] || <FileText className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{category.name}</div>
                  <div className="text-sm text-muted-foreground">{category.description}</div>
                </div>
              </Label>
            </div>
          ))}
          {/* Add New Category Option */}
          <div className="relative">
            <RadioGroupItem
              value="add_new_category"
              id="add_new_category"
              className="peer sr-only"
            />
            <Label
              htmlFor="add_new_category"
              className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:bg-accent/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 border-dashed"
            >
              <div className="p-2 rounded-full bg-muted">
                <PlusCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Add New Category</div>
                <div className="text-sm text-muted-foreground">Create a custom category for your PSSR template</div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

export default WizardStepCategory;
