import React, { useState, useEffect, useMemo } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Clock, X, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PSSR {
  id: string;
  projectId: string;
  projectName: string;
  asset: string;
  status: string;
  pssrLead: string;
  location: string;
}

interface PSSRAdvancedSearchProps {
  pssrs: PSSR[];
  value: string;
  onChange: (value: string) => void;
  onSelectPSSR?: (pssrId: string) => void;
  placeholder?: string;
}

const RECENT_SEARCHES_KEY = 'pssr_recent_searches';
const MAX_RECENT_SEARCHES = 5;

const PSSRAdvancedSearch: React.FC<PSSRAdvancedSearchProps> = ({
  pssrs,
  value,
  onChange,
  onSelectPSSR,
  placeholder = 'Search PSSRs...'
}) => {
  const [open, setOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent searches', e);
      }
    }
  }, []);

  // Save search to recent searches
  const saveSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    const updated = [
      searchTerm,
      ...recentSearches.filter(s => s !== searchTerm)
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  // Generate autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!value.trim()) return [];

    const searchLower = value.toLowerCase();
    const matches = new Set<string>();

    pssrs.forEach(pssr => {
      // Match project IDs
      if (pssr.projectId.toLowerCase().includes(searchLower)) {
        matches.add(pssr.projectId);
      }
      
      // Match project names
      if (pssr.projectName.toLowerCase().includes(searchLower)) {
        matches.add(pssr.projectName);
      }
      
      // Match PSSR IDs
      if (pssr.id.toLowerCase().includes(searchLower)) {
        matches.add(pssr.id);
      }
      
      // Match assets
      if (pssr.asset.toLowerCase().includes(searchLower)) {
        matches.add(pssr.asset);
      }
      
      // Match leads
      if (pssr.pssrLead.toLowerCase().includes(searchLower)) {
        matches.add(pssr.pssrLead);
      }
      
      // Match locations
      if (pssr.location.toLowerCase().includes(searchLower)) {
        matches.add(pssr.location);
      }
    });

    return Array.from(matches).slice(0, 8);
  }, [value, pssrs]);

  // Find matching PSSRs for direct navigation
  const matchingPSSRs = useMemo(() => {
    if (!value.trim()) return [];

    const searchLower = value.toLowerCase();
    return pssrs
      .filter(pssr => 
        pssr.id.toLowerCase().includes(searchLower) ||
        pssr.projectId.toLowerCase().includes(searchLower) ||
        pssr.projectName.toLowerCase().includes(searchLower)
      )
      .slice(0, 5);
  }, [value, pssrs]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    saveSearch(selectedValue);
    setOpen(false);
  };

  const handlePSSRSelect = (pssrId: string) => {
    if (onSelectPSSR) {
      onSelectPSSR(pssrId);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="w-full h-10 pl-10 pr-10 rounded-md border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          {value && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandList>
            {/* Recent Searches */}
            {!value && recentSearches.length > 0 && (
              <>
                <CommandGroup heading={
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs">
                      <Clock className="h-3 w-3" />
                      Recent Searches
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                }>
                  {recentSearches.map((search, index) => (
                    <CommandItem
                      key={`recent-${index}`}
                      value={search}
                      onSelect={() => handleSelect(search)}
                      className="cursor-pointer"
                    >
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{search}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Direct PSSR Matches */}
            {value && matchingPSSRs.length > 0 && (
              <>
                <CommandGroup heading="PSSRs">
                  {matchingPSSRs.map((pssr) => (
                    <CommandItem
                      key={pssr.id}
                      value={pssr.id}
                      onSelect={() => handlePSSRSelect(pssr.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="text-xs">
                              {pssr.projectId}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {pssr.id}
                            </span>
                          </div>
                          <span className="text-sm truncate">{pssr.projectName}</span>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Autocomplete Suggestions */}
            {value && suggestions.length > 0 && (
              <CommandGroup heading={
                <span className="flex items-center gap-1.5 text-xs">
                  <TrendingUp className="h-3 w-3" />
                  Suggestions
                </span>
              }>
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={`suggestion-${index}`}
                    value={suggestion}
                    onSelect={() => handleSelect(suggestion)}
                    className="cursor-pointer"
                  >
                    <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{suggestion}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Empty State */}
            {value && suggestions.length === 0 && matchingPSSRs.length === 0 && (
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  <p className="text-muted-foreground">No results found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try searching by Project ID, PSSR ID, or Project Name
                  </p>
                </div>
              </CommandEmpty>
            )}

            {/* Help Text */}
            {!value && recentSearches.length === 0 && (
              <div className="py-6 px-4 text-center text-sm text-muted-foreground">
                <p>Start typing to search PSSRs</p>
                <p className="text-xs mt-1">
                  Search by Project ID, Name, Lead, Asset, or Location
                </p>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default PSSRAdvancedSearch;
