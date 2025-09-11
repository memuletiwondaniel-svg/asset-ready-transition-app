import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  CheckCircle, 
  X, 
  FileText, 
  Users, 
  Shield, 
  Heart, 
  ClipboardCheck, 
  Cog,
  AlertTriangle,
  Eye,
  Calendar,
  User
} from 'lucide-react';
import { useChecklistItems, ChecklistItem } from '@/hooks/useChecklistItems';
import { useToast } from '@/hooks/use-toast';

interface ChecklistReviewSummaryPageProps {
  checklistData: {
    reason: string;
    selected_items: string[];
    custom_reason?: string;
  };
  onBack: () => void;
  onConfirm: (checklistData: any) => void;
  onCancel: () => void;
}

const ChecklistReviewSummaryPage: React.FC<ChecklistReviewSummaryPageProps> = ({
  checklistData,
  onBack,
  onConfirm,
  onCancel
}) => {
  const { toast } = useToast();
  const { data: allChecklistItems = [] } = useChecklistItems();
  
  // Get selected items
  const selectedItems = allChecklistItems.filter(item => 
    checklistData.selected_items.includes(item.unique_id)
  );

  // Group selected items by category
  const itemsByCategory = selectedItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'General':
        return <FileText className="h-5 w-5" />;
      case 'Technical Integrity':
      case 'Hardware Integrity':
        return <Cog className="h-5 w-5" />;
      case 'Health & Safety':
      case 'HSE':
        return <Shield className="h-5 w-5" />;
      case 'Start-Up Readiness':
        return <CheckCircle className="h-5 w-5" />;
      case 'People':
      case 'Organization':
        return <Users className="h-5 w-5" />;
      case 'Process Safety':
        return <AlertTriangle className="h-5 w-5" />;
      case 'Documentation':
        return <ClipboardCheck className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'General':
        return 'from-blue-500 to-blue-600';
      case 'Technical Integrity':
      case 'Hardware Integrity':
        return 'from-purple-500 to-purple-600';
      case 'Health & Safety':
      case 'HSE':
        return 'from-red-500 to-red-600';
      case 'Start-Up Readiness':
        return 'from-green-500 to-green-600';
      case 'People':
      case 'Organization':
        return 'from-orange-500 to-orange-600';
      case 'Process Safety':
        return 'from-yellow-500 to-yellow-600';
      case 'Documentation':
        return 'from-indigo-500 to-indigo-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Navigation Header */}
      <div className="fluent-navigation sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="fluent-reveal">
                <img 
                  src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" 
                  alt="BGC Logo" 
                  className="h-12 w-auto animate-float" 
                />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                  Review Checklist
                </h1>
                <p className="text-sm text-muted-foreground font-medium">Review your checklist details before creation</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={onBack}
              className="fluent-button hover:bg-secondary/80 hover:border-primary/20 shadow-fluent-sm hover:shadow-fluent-md group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
              Back to Selection
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checklist Information Panel */}
          <div className="lg:col-span-1">
            <Card className="fluent-card border-border/20 bg-card/90 backdrop-blur-sm sticky top-32">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <ClipboardCheck className="h-5 w-5 text-white" />
                  </div>
                  <span>Checklist Summary</span>
                </CardTitle>
                <CardDescription>
                  Review your checklist configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-muted-foreground">Checklist Name</Label>
                      <p className="text-sm font-semibold mt-1">
                        {checklistData.reason === 'Others' 
                          ? checklistData.custom_reason 
                          : checklistData.reason
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Eye className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-muted-foreground">Selected Items</Label>
                      <p className="text-sm font-semibold mt-1">{selectedItems.length} items</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-muted-foreground">Categories</Label>
                      <p className="text-sm font-semibold mt-1">{Object.keys(itemsByCategory).length} categories</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Categories Summary */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">Category Breakdown</Label>
                  {Object.entries(itemsByCategory).map(([category, items]) => (
                    <div key={category} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 bg-gradient-to-br ${getCategoryColor(category)} rounded-lg flex items-center justify-center text-white`}>
                          {getCategoryIcon(category)}
                        </div>
                        <span className="text-sm font-medium">{category}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {items.length} items
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 space-y-3">
                  <Button 
                    onClick={() => {
                      onConfirm(checklistData);
                    }}
                    className="w-full fluent-button bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Checklist
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={onCancel}
                    className="w-full border-destructive/20 text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selected Items Detail Panel */}
          <div className="lg:col-span-2">
            <Card className="fluent-card border-border/20 bg-card/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Selected Checklist Items</span>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {selectedItems.length} Total Items
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Review all selected items organized by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    {Object.entries(itemsByCategory).map(([category, items]) => (
                      <div key={category} className="space-y-4">
                        {/* Category Header */}
                        <div className="flex items-center space-x-4 p-4 bg-muted/20 rounded-xl border border-border/10">
                          <div className={`w-12 h-12 bg-gradient-to-br ${getCategoryColor(category)} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                            {getCategoryIcon(category)}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-foreground">{category}</h3>
                            <p className="text-sm text-muted-foreground">{items.length} items in this category</p>
                          </div>
                        </div>

                        {/* Category Items */}
                        <div className="grid gap-3">
                          {items.map((item, index) => (
                            <div
                              key={item.unique_id}
                              className="group p-4 bg-white/50 border border-border/20 rounded-lg hover:shadow-md transition-all duration-200 hover:bg-white/80"
                            >
                              <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 bg-gradient-to-br from-muted to-muted/60 rounded-lg flex items-center justify-center border border-border/30">
                                    <span className="text-xs font-bold text-muted-foreground">{item.unique_id}</span>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                                    {item.description}
                                  </p>
                                  
                                  {item.required_evidence && (
                                    <div className="mt-2 p-2 bg-blue-50/50 rounded border border-blue-100/50">
                                      <p className="text-xs text-blue-700 font-medium">Evidence Required:</p>
                                      <p className="text-xs text-blue-600 mt-1 line-clamp-1">{item.required_evidence}</p>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                      {item.responsible && (
                                        <div className="flex items-center space-x-1">
                                          <Users className="h-3 w-3" />
                                          <span>{item.responsible}</span>
                                        </div>
                                      )}
                                      {item.Approver && (
                                        <div className="flex items-center space-x-1">
                                          <CheckCircle className="h-3 w-3" />
                                          <span>{item.Approver}</span>
                                        </div>
                                      )}
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      v{item.version}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistReviewSummaryPage;