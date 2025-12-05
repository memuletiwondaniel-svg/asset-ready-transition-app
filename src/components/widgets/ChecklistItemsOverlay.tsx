import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  Eye, 
  AlertCircle,
  User,
  FileText
} from 'lucide-react';

export interface ChecklistItemData {
  unique_id: string;
  description: string;
  category: string;
  topic?: string;
  status: 'draft' | 'under_review' | 'approved';
  response?: 'YES' | 'NO' | 'N/A' | null;
  responsible?: string;
  approver?: string;
  required_evidence?: string;
}

interface ChecklistItemsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  filterType: 'status' | 'category';
  filterValue: string;
  items: ChecklistItemData[];
  title: string;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'draft':
      return <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
    case 'under_review':
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Eye className="h-3 w-3 mr-1" />Under Review</Badge>;
    case 'approved':
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getResponseBadge = (response: string | null | undefined) => {
  if (!response) return null;
  
  switch (response) {
    case 'YES':
      return <Badge className="bg-green-500/20 text-green-600 hover:bg-green-500/30">YES</Badge>;
    case 'NO':
      return <Badge className="bg-red-500/20 text-red-600 hover:bg-red-500/30">NO</Badge>;
    case 'N/A':
      return <Badge className="bg-muted text-muted-foreground hover:bg-muted/80">N/A</Badge>;
    default:
      return null;
  }
};

export const ChecklistItemsOverlay: React.FC<ChecklistItemsOverlayProps> = ({
  isOpen,
  onClose,
  filterType,
  filterValue,
  items,
  title
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    let result = items;
    
    // Apply filter based on type
    if (filterType === 'status') {
      result = items.filter(item => item.status === filterValue);
    } else if (filterType === 'category') {
      result = items.filter(item => item.category === filterValue);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.unique_id?.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.responsible?.toLowerCase().includes(query) ||
        item.approver?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [items, filterType, filterValue, searchQuery]);

  const statusCounts = useMemo(() => {
    return {
      draft: filteredItems.filter(i => i.status === 'draft').length,
      underReview: filteredItems.filter(i => i.status === 'under_review').length,
      approved: filteredItems.filter(i => i.status === 'approved').length,
    };
  }, [filteredItems]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg md:max-w-xl">
        <SheetHeader className="space-y-4">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {title}
          </SheetTitle>
          
          {/* Statistics Bar */}
          <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{filteredItems.length}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
            <Separator orientation="vertical" className="h-10" />
            <div className="flex gap-3">
              <div className="text-center">
                <p className="text-lg font-semibold text-muted-foreground">{statusCounts.draft}</p>
                <p className="text-[10px] text-muted-foreground">Draft</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-yellow-600">{statusCounts.underReview}</p>
                <p className="text-[10px] text-muted-foreground">Review</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-green-600">{statusCounts.approved}</p>
                <p className="text-[10px] text-muted-foreground">Approved</p>
              </div>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </SheetHeader>
        
        <Separator className="my-4" />
        
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-3 pr-4">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No items found</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div 
                  key={item.unique_id} 
                  className="p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {item.unique_id}
                      </Badge>
                      {getResponseBadge(item.response)}
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                  
                  <p className="text-sm text-foreground mb-3 line-clamp-2">
                    {item.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                  
                  {item.topic && (
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      {item.topic}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
