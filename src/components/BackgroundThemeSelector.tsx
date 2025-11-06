import React from 'react';
import { useBackgroundTheme, BACKGROUND_THEMES, BackgroundTheme } from '@/contexts/BackgroundThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BackgroundThemeSelector: React.FC = () => {
  const { theme, setTheme } = useBackgroundTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Background Theme</CardTitle>
        <CardDescription>
          Choose a visual theme for the application background
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={theme} onValueChange={(value) => setTheme(value as BackgroundTheme)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(BACKGROUND_THEMES).map(([key, config]) => (
              <div key={key} className="relative">
                <RadioGroupItem
                  value={key}
                  id={key}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={key}
                  className={cn(
                    "flex flex-col cursor-pointer rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:border-primary/50 transition-all",
                    "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm">{config.name}</span>
                    {theme === key && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Preview */}
                  <div className="relative h-20 rounded-md overflow-hidden bg-gradient-to-br from-background to-background/50 mb-2">
                    <div className={`absolute top-0 left-0 w-12 h-12 bg-gradient-to-r ${config.gradients.orb1} rounded-full filter blur-xl opacity-70`} />
                    <div className={`absolute top-0 right-0 w-12 h-12 bg-gradient-to-l ${config.gradients.orb2} rounded-full filter blur-xl opacity-70`} />
                    <div className={`absolute bottom-0 left-1/3 w-12 h-12 bg-gradient-to-t ${config.gradients.orb3} rounded-full filter blur-xl opacity-70`} />
                  </div>
                  
                  <span className="text-xs text-muted-foreground">
                    {config.description}
                  </span>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};
