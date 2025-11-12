import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useORPResourceManagement } from '@/hooks/useORPResourceManagement';
import { Users, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const ORPResourceDashboard: React.FC = () => {
  const { resourceAllocations, conflictAnalysis, isLoading } = useORPResourceManagement();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resourceAllocations?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overallocated</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {conflictAnalysis?.overallocated_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Capacity</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {conflictAnalysis?.available_capacity?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Below 70% allocation</p>
          </CardContent>
        </Card>
      </div>

      {/* Overallocated Resources Alert */}
      {(conflictAnalysis?.overallocated_count || 0) > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {conflictAnalysis?.overallocated_count} team member(s) are allocated over 100%. 
            Please review and redistribute workload.
          </AlertDescription>
        </Alert>
      )}

      {/* Resource Allocation List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Resource Allocation Details
          </CardTitle>
          <CardDescription>
            View allocation percentages and project assignments for all team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {resourceAllocations?.map((resource) => (
                <div
                  key={resource.user_id}
                  className={`p-4 border rounded-lg ${
                    resource.is_overallocated ? 'border-destructive bg-destructive/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarImage src={resource.avatar_url} />
                      <AvatarFallback>
                        {resource.user_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{resource.user_name}</h4>
                          <p className="text-sm text-muted-foreground">{resource.position}</p>
                        </div>
                        <Badge
                          variant={resource.is_overallocated ? 'destructive' : 'secondary'}
                        >
                          {resource.total_allocation}% allocated
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Overall Allocation</span>
                          <span className="font-medium">{resource.total_allocation}%</span>
                        </div>
                        <Progress
                          value={Math.min(resource.total_allocation, 100)}
                          className={resource.is_overallocated ? '[&>div]:bg-destructive' : ''}
                        />
                      </div>

                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Project Assignments:</h5>
                        <div className="space-y-1">
                          {resource.projects.map((project, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded"
                            >
                              <div className="flex-1">
                                <div className="font-medium">{project.project_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {project.phase.replace('_', ' ')}
                                </div>
                              </div>
                              <Badge variant="outline">
                                {project.allocation_percentage}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {(!resourceAllocations || resourceAllocations.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No resource allocations found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
