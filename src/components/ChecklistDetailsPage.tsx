import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Search, Filter, Calendar, User, Activity, FileText, Edit, Trash2, Plus } from 'lucide-react';
import { pssrChecklistData, checklistCategories, ChecklistItem } from '@/data/pssrChecklistData';

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

interface ChecklistDetailsPageProps {
  checklist: ChecklistData;
  onBack: () => void;
}

const ChecklistDetailsPage: React.FC<ChecklistDetailsPageProps> = ({ checklist, onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Mock active PSSR data
  const activePSSRs = [
    { id: 'PSSR-2024-001', projectName: 'Gas Processing Unit A', status: 'In Progress', progress: 65 },
    { id: 'PSSR-2024-002', projectName: 'Compression Station B', status: 'Under Review', progress: 85 },
    { id: 'PSSR-2024-003', projectName: 'Pipeline Section C', status: 'Not Started', progress: 0 }
  ];

  // Filter and sort checklist items
  const filteredItems = useMemo(() => {
    let items = pssrChecklistData.filter(item => {
      const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.supportingEvidence.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    items.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'id':
          comparison = a.id.localeCompare(b.id);
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'authority':
          comparison = a.approvingAuthority.localeCompare(b.approvingAuthority);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return items;
  }, [searchQuery, selectedCategory, sortBy, sortOrder]);

  const getCategoryStats = (category: string) => {
    if (category === 'all') {
      return pssrChecklistData.length;
    }
    return pssrChecklistData.filter(item => item.category === category).length;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Progress':
        return <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">In Progress</Badge>;
      case 'Under Review':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-700 border-yellow-200">Under Review</Badge>;
      case 'Not Started':
        return <Badge variant="outline">Not Started</Badge>;
      case 'Completed':
        return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

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
                  {checklist.name}
                </h1>
                <p className="text-sm text-muted-foreground font-medium">Checklist Details • PSSR Microservice</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={onBack}
              className="fluent-button hover:bg-secondary/80 hover:border-primary/20 shadow-fluent-sm hover:shadow-fluent-md group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
              Back to Checklists
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Checklist Overview */}
        <div className="mb-8 animate-fade-in-up">
          <Card className="border border-border/20 bg-card/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{checklist.name}</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    {checklist.reason}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Checklist
                  </Button>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{checklist.itemsCount}</p>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Activity className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{checklist.activePSSRCount}</p>
                    <p className="text-sm text-muted-foreground">Active PSSRs</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold">{new Date(checklist.createdDate).toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground">Created Date</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <User className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm font-semibold">{checklist.createdBy}</p>
                    <p className="text-sm text-muted-foreground">Created By</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="items" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="items">Checklist Items</TabsTrigger>
            <TabsTrigger value="pssrs">Active PSSRs</TabsTrigger>
          </TabsList>

          {/* Checklist Items Tab */}
          <TabsContent value="items" className="space-y-6">
            {/* Search and Filter Controls */}
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search checklist items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-4">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories ({getCategoryStats('all')})</SelectItem>
                      {checklistCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category} ({getCategoryStats(category)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id">Item ID</SelectItem>
                      <SelectItem value="description">Description</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="authority">Authority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <Card className="border border-border/20 bg-card/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Checklist Items ({filteredItems.length})</CardTitle>
                <CardDescription>
                  Detailed view of all items in this checklist
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('id')}
                        >
                          Item ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('description')}
                        >
                          Description {sortBy === 'description' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('category')}
                        >
                          Category {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead>Supporting Evidence</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('authority')}
                        >
                          Approving Authority {sortBy === 'authority' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/20">
                          <TableCell className="font-medium">{item.id}</TableCell>
                          <TableCell className="max-w-md">
                            <div className="line-clamp-3">{item.description}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="line-clamp-2 text-sm text-muted-foreground">
                              {item.supportingEvidence}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{item.approvingAuthority}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active PSSRs Tab */}
          <TabsContent value="pssrs" className="space-y-6">
            <Card className="border border-border/20 bg-card/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Active PSSR Reviews</CardTitle>
                <CardDescription>
                  Projects currently using this checklist for PSSR reviews
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activePSSRs.map((pssr) => (
                    <div key={pssr.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-semibold">{pssr.id}</h4>
                        <p className="text-sm text-muted-foreground">{pssr.projectName}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{pssr.progress}% Complete</div>
                          <div className="w-24 bg-muted rounded-full h-2 mt-1">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${pssr.progress}%` }}
                            />
                          </div>
                        </div>
                        {getStatusBadge(pssr.status)}
                        <Button variant="outline" size="sm">
                          View PSSR
                        </Button>
                      </div>
                    </div>
                  ))}
                  {activePSSRs.length === 0 && (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Active PSSRs</h3>
                      <p className="text-muted-foreground">
                        No projects are currently using this checklist for PSSR reviews.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ChecklistDetailsPage;