import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Filter, Plus, FileText, Calendar, User, Activity } from 'lucide-react';
import ChecklistDetailsPage from './ChecklistDetailsPage';

interface ChecklistData {
  id: string;
  name: string;
  reason: string;
  itemsCount: number;
  createdDate: string;
  createdBy: string;
  activePSSRCount: number;
  category: string;
  status: 'Active' | 'Draft' | 'Archived';
}

interface ManageChecklistPageProps {
  onBack: () => void;
}

const ManageChecklistPage: React.FC<ManageChecklistPageProps> = ({ onBack }) => {
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // Mock checklist data - in a real app, this would come from the database
  const [checklists] = useState<ChecklistData[]>([
    {
      id: '1',
      name: 'Standard PSSR Checklist',
      reason: 'General Pre-Startup Safety Review for new facilities',
      itemsCount: 124,
      createdDate: '2024-01-15',
      createdBy: 'Ahmed Al-Rashid',
      activePSSRCount: 3,
      category: 'General',
      status: 'Active'
    },
    {
      id: '2',
      name: 'Process Safety Checklist',
      reason: 'Specialized checklist for process safety critical systems',
      itemsCount: 89,
      createdDate: '2024-02-10',
      createdBy: 'Sarah Johnson',
      activePSSRCount: 1,
      category: 'Process Safety',
      status: 'Active'
    },
    {
      id: '3',
      name: 'Emergency Systems Checklist',
      reason: 'Verification of emergency response and safety systems',
      itemsCount: 67,
      createdDate: '2024-03-05',
      createdBy: 'Mohammed Hassan',
      activePSSRCount: 0,
      category: 'Emergency Systems',
      status: 'Draft'
    }
  ]);

  const filteredChecklists = checklists.filter(checklist => {
    const matchesSearch = checklist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         checklist.reason.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || checklist.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedChecklists = [...filteredChecklists].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'date':
        return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
      case 'items':
        return b.itemsCount - a.itemsCount;
      default:
        return 0;
    }
  });

  const getStatusBadge = (status: ChecklistData['status']) => {
    switch (status) {
      case 'Active':
        return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
      case 'Draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'Archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (selectedChecklist) {
    return (
      <ChecklistDetailsPage 
        checklist={selectedChecklist}
        onBack={() => setSelectedChecklist(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Navigation Bar */}
      <div className="fluent-navigation sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6">
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
                  Manage Checklists
                </h1>
                <p className="text-sm text-muted-foreground font-medium">PSSR Microservice • Basrah Gas Company</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={onBack}
              className="fluent-button hover:bg-secondary/80 hover:border-primary/20 shadow-fluent-sm hover:shadow-fluent-md group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
              Back to Admin Tools
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-light text-foreground mb-2 tracking-tight">
                PSSR
                <span className="fluent-hero-text font-semibold"> Checklists</span>
              </h2>
              <p className="text-muted-foreground">
                Manage and configure Pre-Startup Safety Review checklists for your projects
              </p>
            </div>
            <Button className="fluent-button bg-primary hover:bg-primary-hover shadow-fluent-md hover:shadow-fluent-lg">
              <Plus className="h-4 w-4 mr-2" />
              Create New Checklist
            </Button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-8 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search checklists by name or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-4">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Process Safety">Process Safety</SelectItem>
                  <SelectItem value="Emergency Systems">Emergency Systems</SelectItem>
                  <SelectItem value="Technical Integrity">Technical Integrity</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="date">Date Created</SelectItem>
                  <SelectItem value="items">Item Count</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Checklists Grid */}
        {sortedChecklists.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Checklists Found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || filterCategory !== 'all' 
                ? 'No checklists match your current filters. Try adjusting your search criteria.'
                : 'Create your first PSSR checklist to get started with safety reviews.'
              }
            </p>
            <Button className="fluent-button bg-primary hover:bg-primary-hover">
              <Plus className="h-4 w-4 mr-2" />
              Create First Checklist
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedChecklists.map((checklist, index) => (
              <Card
                key={checklist.id}
                className="group cursor-pointer hover:shadow-fluent-lg transition-all duration-300 border border-border/20 bg-card/90 backdrop-blur-sm hover:-translate-y-1 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => setSelectedChecklist(checklist)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors duration-200">
                        {checklist.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {checklist.reason}
                      </CardDescription>
                    </div>
                    {getStatusBadge(checklist.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{checklist.itemsCount} items</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{checklist.activePSSRCount} active PSSR</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-border/10">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(checklist.createdDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{checklist.createdBy}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageChecklistPage;