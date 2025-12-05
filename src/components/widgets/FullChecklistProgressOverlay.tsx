import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  Eye, 
  ChevronDown,
  ChevronRight,
  Wrench,
  Shield,
  FileText,
  Users,
  HeartPulse,
  User,
  BarChart3
} from 'lucide-react';
import { ChecklistItemData } from './ChecklistItemsOverlay';

interface CategoryProgress {
  name: string;
  completed: number;
  total: number;
  percentage: number;
}

interface FullChecklistProgressOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  categoryProgress: CategoryProgress[];
  items: ChecklistItemData[];
  statistics: {
    totalItems: number;
    draftItems: number;
    underReviewItems: number;
    approvedItems: number;
  };
  overallProgress: number;
}

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('hardware') || name.includes('integrity')) return Wrench;
  if (name.includes('process') || name.includes('safety')) return Shield;
  if (name.includes('documentation') || name.includes('document')) return FileText;
  if (name.includes('organization') || name.includes('org')) return Users;
  if (name.includes('health') || name.includes('hse')) return HeartPulse;
  return FileText;
};

const getCategoryColors = (index: number) => {
  const colors = [
    { bg: 'bg-blue-500/20', text: 'text-blue-600', progress: 'bg-blue-500' },
    { bg: 'bg-purple-500/20', text: 'text-purple-600', progress: 'bg-purple-500' },
    { bg: 'bg-amber-500/20', text: 'text-amber-600', progress: 'bg-amber-500' },
    { bg: 'bg-cyan-500/20', text: 'text-cyan-600', progress: 'bg-cyan-500' },
    { bg: 'bg-emerald-500/20', text: 'text-emerald-600', progress: 'bg-emerald-500' },
  ];
  return colors[index % colors.length];
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'draft':
      return <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted text-[10px]"><Clock className="h-2.5 w-2.5 mr-1" />Draft</Badge>;
    case 'under_review':
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-[10px]"><Eye className="h-2.5 w-2.5 mr-1" />Review</Badge>;
    case 'approved':
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px]"><CheckCircle2 className="h-2.5 w-2.5 mr-1" />Approved</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
};

const getResponseBadge = (response: string | null | undefined) => {
  if (!response) return null;
  
  switch (response) {
    case 'YES':
      return <Badge className="bg-green-500/20 text-green-600 hover:bg-green-500/30 text-[10px]">YES</Badge>;
    case 'NO':
      return <Badge className="bg-red-500/20 text-red-600 hover:bg-red-500/30 text-[10px]">NO</Badge>;
    case 'N/A':
      return <Badge className="bg-muted text-muted-foreground hover:bg-muted/80 text-[10px]">N/A</Badge>;
    default:
      return null;
  }
};

// Circular Progress Component
const CircularProgress: React.FC<{ percentage: number; size?: number }> = ({ 
  percentage, 
  size = 100 
}) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  const getProgressColor = () => {
    if (percentage >= 70) return 'stroke-green-500';
    if (percentage >= 40) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="stroke-muted/30"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${getProgressColor()} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-foreground">{percentage}%</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Complete</span>
      </div>
    </div>
  );
};

export const FullChecklistProgressOverlay: React.FC<FullChecklistProgressOverlayProps> = ({
  isOpen,
  onClose,
  categoryProgress,
  items,
  statistics,
  overallProgress
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredItems = useMemo(() => {
    let result = items;
    
    // Apply tab filter
    if (activeTab !== 'all') {
      result = result.filter(item => item.status === activeTab);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.unique_id?.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.responsible?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [items, activeTab, searchQuery]);

  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, ChecklistItemData[]> = {};
    filteredItems.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }, [filteredItems]);

  const expandAll = () => {
    setExpandedCategories(new Set(categoryProgress.map(c => c.name)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl md:max-w-3xl" side="right">
        <SheetHeader className="space-y-4">
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Checklist Progress Overview
          </SheetTitle>
          
          {/* Hero Section */}
          <div className="flex items-center gap-6 p-4 bg-muted/20 rounded-xl">
            <CircularProgress percentage={overallProgress} />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground mb-1">
                {statistics.approvedItems} of {statistics.totalItems}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">Items completed</p>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{statistics.draftItems} Draft</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-yellow-500" />
                  <span className="text-yellow-600">{statistics.underReviewItems} Review</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-green-600">{statistics.approvedItems} Approved</span>
                </div>
              </div>
            </div>
          </div>
        </SheetHeader>
        
        <Separator className="my-4" />
        
        {/* Tabs and Search */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="under_review">Review</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search all items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse
            </Button>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        {/* Category Accordion */}
        <ScrollArea className="h-[calc(100vh-420px)]">
          <div className="space-y-2 pr-4">
            {categoryProgress.map((category, index) => {
              const Icon = getCategoryIcon(category.name);
              const colors = getCategoryColors(index);
              const categoryItems = itemsByCategory[category.name] || [];
              const isExpanded = expandedCategories.has(category.name);
              
              return (
                <Collapsible 
                  key={category.name} 
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category.name)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className={`flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors ${isExpanded ? 'bg-muted/20' : ''}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">{category.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {category.completed}/{category.total}
                          </span>
                        </div>
                        <div className="relative h-1.5 bg-muted/50 rounded-full overflow-hidden">
                          <div 
                            className={`absolute inset-y-0 left-0 rounded-full ${colors.progress}`}
                            style={{ width: `${category.percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground w-12 text-right">{category.percentage}%</span>
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="ml-6 mt-2 space-y-2 border-l-2 border-border/50 pl-4">
                      {categoryItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">No items match current filters</p>
                      ) : (
                        categoryItems.map((item) => (
                          <div 
                            key={item.unique_id}
                            className="p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono text-[10px]">
                                  {item.unique_id}
                                </Badge>
                                {getResponseBadge(item.response)}
                              </div>
                              {getStatusBadge(item.status)}
                            </div>
                            
                            <p className="text-sm text-foreground mb-2 line-clamp-2">
                              {item.description}
                            </p>
                            
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {item.responsible && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{item.responsible}</span>
                                </div>
                              )}
                              {item.approver && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>{item.approver}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
