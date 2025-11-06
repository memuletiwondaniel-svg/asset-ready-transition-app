import React, { useState } from 'react';
import { useBackgroundTheme, BACKGROUND_THEMES, BackgroundTheme, BackgroundThemeConfig } from '@/contexts/BackgroundThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, Palette, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export const BackgroundThemeSelector: React.FC = () => {
  const { theme, setTheme, customTheme, setCustomTheme, seasonalThemeEnabled, setSeasonalThemeEnabled } = useBackgroundTheme();
  const [showCustomCreator, setShowCustomCreator] = useState(false);
  const [customColors, setCustomColors] = useState({
    orb1Start: '#3b82f6',
    orb1End: '#8b5cf6',
    orb2Start: '#10b981',
    orb2End: '#f59e0b',
    orb3Start: '#f59e0b',
    orb3End: '#ef4444',
  });

  const hexToTailwind = (hex: string) => {
    // Convert hex to RGB for Tailwind
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${r} ${g} ${b})`;
  };

  const handleCreateCustomTheme = () => {
    const customConfig: BackgroundThemeConfig = {
      name: 'My Custom Theme',
      description: 'Personalized color scheme',
      gradients: {
        orb1: `from-[${customColors.orb1Start}]/15 to-[${customColors.orb1End}]/15`,
        orb2: `from-[${customColors.orb2Start}]/15 to-[${customColors.orb2End}]/15`,
        orb3: `from-[${customColors.orb3Start}]/15 to-[${customColors.orb3End}]/15`,
      },
      baseGradient: `from-background via-background to-[${customColors.orb1Start}]/5`,
      isCustom: true,
    };
    setCustomTheme(customConfig);
    setShowCustomCreator(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Background Theme</CardTitle>
          <CardDescription>
            Choose a visual theme for the application background
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seasonal Theme Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <Label className="font-semibold">Seasonal Themes</Label>
                <p className="text-xs text-muted-foreground">Automatically change theme based on current season</p>
              </div>
            </div>
            <Switch 
              checked={seasonalThemeEnabled} 
              onCheckedChange={setSeasonalThemeEnabled}
            />
          </div>

          <Separator />

          {/* Theme Selection */}
          <RadioGroup value={theme} onValueChange={(value) => setTheme(value as BackgroundTheme)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(BACKGROUND_THEMES)
                .filter(([key]) => key !== 'custom' || customTheme)
                .map(([key, config]) => (
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
                      <span className="font-semibold text-sm">
                        {key === 'custom' && customTheme ? customTheme.name : config.name}
                      </span>
                      {theme === key && (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Enhanced Preview with Animation */}
                    <div className="relative h-24 rounded-md overflow-hidden bg-gradient-to-br from-background to-background/50 mb-2">
                      <div 
                        className={`absolute top-0 left-0 w-16 h-16 bg-gradient-to-r ${config.gradients.orb1} rounded-full filter blur-xl opacity-70 animate-pulse`}
                      />
                      <div 
                        className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-l ${config.gradients.orb2} rounded-full filter blur-xl opacity-70 animate-pulse`}
                        style={{ animationDelay: '700ms' }}
                      />
                      <div 
                        className={`absolute bottom-0 left-1/3 w-16 h-16 bg-gradient-to-t ${config.gradients.orb3} rounded-full filter blur-xl opacity-70 animate-pulse`}
                        style={{ animationDelay: '1400ms' }}
                      />
                    </div>
                    
                    <span className="text-xs text-muted-foreground">
                      {key === 'custom' && customTheme ? customTheme.description : config.description}
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>

          <Separator />

          {/* Custom Theme Creator */}
          {!showCustomCreator ? (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowCustomCreator(true)}
            >
              <Palette className="h-4 w-4 mr-2" />
              Create Custom Theme
            </Button>
          ) : (
            <div className="space-y-4 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Custom Theme Creator
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowCustomCreator(false)}
                >
                  Cancel
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Orb 1 Start</Label>
                  <Input 
                    type="color" 
                    value={customColors.orb1Start}
                    onChange={(e) => setCustomColors({...customColors, orb1Start: e.target.value})}
                    className="h-10 cursor-pointer"
                  />
                </div>
                <div>
                  <Label className="text-xs">Orb 1 End</Label>
                  <Input 
                    type="color" 
                    value={customColors.orb1End}
                    onChange={(e) => setCustomColors({...customColors, orb1End: e.target.value})}
                    className="h-10 cursor-pointer"
                  />
                </div>
                <div>
                  <Label className="text-xs">Orb 2 Start</Label>
                  <Input 
                    type="color" 
                    value={customColors.orb2Start}
                    onChange={(e) => setCustomColors({...customColors, orb2Start: e.target.value})}
                    className="h-10 cursor-pointer"
                  />
                </div>
                <div>
                  <Label className="text-xs">Orb 2 End</Label>
                  <Input 
                    type="color" 
                    value={customColors.orb2End}
                    onChange={(e) => setCustomColors({...customColors, orb2End: e.target.value})}
                    className="h-10 cursor-pointer"
                  />
                </div>
                <div>
                  <Label className="text-xs">Orb 3 Start</Label>
                  <Input 
                    type="color" 
                    value={customColors.orb3Start}
                    onChange={(e) => setCustomColors({...customColors, orb3Start: e.target.value})}
                    className="h-10 cursor-pointer"
                  />
                </div>
                <div>
                  <Label className="text-xs">Orb 3 End</Label>
                  <Input 
                    type="color" 
                    value={customColors.orb3End}
                    onChange={(e) => setCustomColors({...customColors, orb3End: e.target.value})}
                    className="h-10 cursor-pointer"
                  />
                </div>
              </div>

              {/* Live Preview */}
              <div className="relative h-32 rounded-md overflow-hidden bg-gradient-to-br from-background to-background/50 border">
                <div 
                  className="absolute top-0 left-0 w-20 h-20 rounded-full filter blur-2xl opacity-70 animate-pulse"
                  style={{ 
                    background: `linear-gradient(to right, ${customColors.orb1Start}40, ${customColors.orb1End}40)` 
                  }}
                />
                <div 
                  className="absolute top-0 right-0 w-20 h-20 rounded-full filter blur-2xl opacity-70 animate-pulse"
                  style={{ 
                    background: `linear-gradient(to left, ${customColors.orb2Start}40, ${customColors.orb2End}40)`,
                    animationDelay: '700ms'
                  }}
                />
                <div 
                  className="absolute bottom-0 left-1/3 w-20 h-20 rounded-full filter blur-2xl opacity-70 animate-pulse"
                  style={{ 
                    background: `linear-gradient(to top, ${customColors.orb3Start}40, ${customColors.orb3End}40)`,
                    animationDelay: '1400ms'
                  }}
                />
              </div>

              <Button 
                onClick={handleCreateCustomTheme}
                className="w-full"
              >
                Save Custom Theme
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
