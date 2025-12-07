import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle,
  MinusCircle,
  Clock,
  Eye
} from 'lucide-react';
import { usePSSRChecklistResponses } from '@/hooks/usePSSRChecklistResponses';
import { SOFChecklistItemDetail } from './SOFChecklistItemDetail';

interface SOFChecklistBrowserProps {
  pssrId: string;
}

interface CategoryGroup {
  name: string;
  items: ChecklistItemWithResponse[];
  completedCount: number;
  totalCount: number;
}

interface ChecklistItemWithResponse {
  id: string;
  unique_id: string;
  description: string;
  category: string;
  topic?: string;
  response?: {
    id: string;
    response: string | null;
    status: string;
    narrative: string | null;
    deviation_reason: string | null;
    potential_risk: string | null;
    mitigations: string | null;
    follow_up_action: string | null;
    action_owner: string | null;
    justification: string | null;
  };
}

const getResponseIcon = (response: string | null | undefined) => {
  switch (response?.toUpperCase()) {
    case 'YES':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'NO':
    case 'DEVIATION':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'NA':
    case 'N/A':
      return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getResponseBadge = (response: string | null | undefined, status: string | undefined) => {
  if (status !== 'SUBMITTED') {
    return <Badge variant="secondary" className="text-[10px]">Pending</Badge>;
  }
  
  switch (response?.toUpperCase()) {
    case 'YES':
      return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 text-[10px]">Yes</Badge>;
    case 'NO':
    case 'DEVIATION':
      return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">Deviation</Badge>;
    case 'NA':
    case 'N/A':
      return <Badge variant="secondary" className="text-[10px]">N/A</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{response || 'No Response'}</Badge>;
  }
};

export const SOFChecklistBrowser: React.FC<SOFChecklistBrowserProps> = ({ pssrId }) => {
  const { responses, checklistItems, isLoading } = usePSSRChecklistResponses(pssrId);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<ChecklistItemWithResponse | null>(null);

  // Combine checklist items with their responses
  const itemsWithResponses: ChecklistItemWithResponse[] = React.useMemo(() => {
    if (!checklistItems) return [];
    
    const responseMap = new Map<string, typeof responses[0]>();
    responses?.forEach(r => responseMap.set(r.checklist_item_id, r));

    return checklistItems.map(item => ({
      id: item.unique_id || item.id || '',
      unique_id: item.unique_id || '',
      description: item.description,
      category: item.category || 'General',
      topic: item.topic,
      response: responseMap.get(item.unique_id || '') ? {
        id: responseMap.get(item.unique_id || '')!.id,
        response: responseMap.get(item.unique_id || '')!.response,
        status: responseMap.get(item.unique_id || '')!.status,
        narrative: responseMap.get(item.unique_id || '')!.narrative,
        deviation_reason: responseMap.get(item.unique_id || '')!.deviation_reason,
        potential_risk: responseMap.get(item.unique_id || '')!.potential_risk,
        mitigations: responseMap.get(item.unique_id || '')!.mitigations,
        follow_up_action: responseMap.get(item.unique_id || '')!.follow_up_action,
        action_owner: responseMap.get(item.unique_id || '')!.action_owner,
        justification: responseMap.get(item.unique_id || '')!.justification,
      } : undefined,
    }));
  }, [checklistItems, responses]);

  // Filter by search query
  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return itemsWithResponses;
    const query = searchQuery.toLowerCase();
    return itemsWithResponses.filter(item => 
      item.description.toLowerCase().includes(query) ||
      item.unique_id.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      (item.topic && item.topic.toLowerCase().includes(query))
    );
  }, [itemsWithResponses, searchQuery]);

  // Group by category
  const categoryGroups: CategoryGroup[] = React.useMemo(() => {
    const groups = new Map<string, ChecklistItemWithResponse[]>();
    
    filteredItems.forEach(item => {
      const category = item.category;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(item);
    });

    return Array.from(groups.entries()).map(([name, items]) => ({
      name,
      items,
      completedCount: items.filter(i => i.response?.status === 'SUBMITTED').length,
      totalCount: items.length,
    }));
  }, [filteredItems]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAll = () => {
    setExpandedCategories(new Set(categoryGroups.map(g => g.name)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  // If an item is selected, show the detail view
  if (selectedItem) {
    return (
      <SOFChecklistItemDetail
        item={selectedItem}
        pssrId={pssrId}
        onBack={() => setSelectedItem(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Checklist Items Browser</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Navigate and review all checklist items and their evidence before signing.
        </p>
      </div>

      {/* Search and Controls */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items by ID, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={expandAll}>
          Expand All
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          Collapse
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="text-muted-foreground">
          {filteredItems.length} items
        </span>
        <span className="text-green-600 dark:text-green-400">
          {filteredItems.filter(i => i.response?.status === 'SUBMITTED').length} completed
        </span>
        <span className="text-amber-600 dark:text-amber-400">
          {filteredItems.filter(i => i.response?.response?.toUpperCase() === 'DEVIATION' || i.response?.response?.toUpperCase() === 'NO').length} deviations
        </span>
      </div>

      {/* Category Accordion */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-4">
          {categoryGroups.map((group) => (
            <Collapsible
              key={group.name}
              open={expandedCategories.has(group.name)}
              onOpenChange={() => toggleCategory(group.name)}
            >
              <CollapsibleTrigger asChild>
                <Card 
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                    group.completedCount === group.totalCount && group.totalCount > 0
                      ? 'border-green-500/30'
                      : ''
                  }`}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedCategories.has(group.name) 
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        }
                        <span className="font-medium">{group.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${
                          group.completedCount === group.totalCount 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-muted-foreground'
                        }`}>
                          {group.completedCount}/{group.totalCount}
                        </span>
                        {group.completedCount === group.totalCount && group.totalCount > 0 && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/30 cursor-pointer group transition-colors"
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {getResponseIcon(item.response?.response)}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">
                              {item.unique_id}
                            </span>
                            {item.topic && (
                              <Badge variant="outline" className="text-[10px]">
                                {item.topic}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm truncate">{item.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getResponseBadge(item.response?.response, item.response?.status)}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}

          {categoryGroups.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Search className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery 
                    ? `No items found matching "${searchQuery}"`
                    : 'No checklist items found for this PSSR.'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SOFChecklistBrowser;
