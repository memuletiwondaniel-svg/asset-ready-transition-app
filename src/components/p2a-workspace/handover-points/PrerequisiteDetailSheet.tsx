import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  User, 
  ArrowRight,
  MessageSquare,
  Calendar,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { VCRPrerequisite, getPrerequisiteStatusConfig } from '../hooks/useVCRPrerequisites';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PrerequisiteDetailSheetProps {
  prerequisite: VCRPrerequisite | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PrerequisiteDetailSheet: React.FC<PrerequisiteDetailSheetProps> = ({
  prerequisite,
  open,
  onOpenChange,
}) => {
  if (!prerequisite) return null;

  const statusConfig = getPrerequisiteStatusConfig(prerequisite.status);

  const getFileIcon = (fileType?: string) => {
    // Return appropriate icon based on file type
    return FileText;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
          </div>
          <SheetTitle className="text-lg">{prerequisite.summary}</SheetTitle>
          {prerequisite.description && (
            <SheetDescription>{prerequisite.description}</SheetDescription>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Parties Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Responsible Parties</h4>
              <div className="flex items-center gap-4">
                <Card className="flex-1">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Delivering Party</div>
                        <div className="text-sm font-medium">
                          {prerequisite.delivering_party_name || 'Not assigned'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                
                <Card className="flex-1">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Receiving Party</div>
                        <div className="text-sm font-medium">
                          {prerequisite.receiving_party_name || 'Not assigned'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            {/* Timeline Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Timeline</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Created</div>
                    <div>{format(new Date(prerequisite.created_at), 'dd MMM yyyy')}</div>
                  </div>
                </div>
                
                {prerequisite.submitted_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="text-xs text-muted-foreground">Submitted</div>
                      <div>{format(new Date(prerequisite.submitted_at), 'dd MMM yyyy')}</div>
                    </div>
                  </div>
                )}
                
                {prerequisite.reviewed_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="text-xs text-muted-foreground">Reviewed</div>
                      <div>{format(new Date(prerequisite.reviewed_at), 'dd MMM yyyy')}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Evidence Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">Supporting Evidence</h4>
                <span className="text-xs text-muted-foreground">
                  {prerequisite.evidence?.length || 0} file(s)
                </span>
              </div>
              
              {prerequisite.evidence && prerequisite.evidence.length > 0 ? (
                <div className="space-y-2">
                  {prerequisite.evidence.map((file) => {
                    const FileIcon = getFileIcon(file.file_type);
                    return (
                      <Card key={file.id} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <FileIcon className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{file.file_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatFileSize(file.file_size)} • {format(new Date(file.created_at), 'dd MMM yyyy')}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            <Download className="w-4 h-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No evidence uploaded yet</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Comments Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Comments</h4>
              {prerequisite.comments ? (
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-foreground">{prerequisite.comments}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground italic">No comments</p>
              )}
            </div>

            {/* Status-specific messages */}
            {prerequisite.status === 'QUALIFICATION_REQUESTED' && (
              <>
                <Separator />
                <Card className="border-purple-500/50 bg-purple-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-purple-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-purple-600">Qualification Raised</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          A qualification has been requested for this item. 
                          View the Qualifications tab for details.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="border-t pt-4 mt-auto flex gap-2">
          {prerequisite.status === 'NOT_STARTED' && (
            <Button className="flex-1" variant="default">
              Start Progress
            </Button>
          )}
          {prerequisite.status === 'IN_PROGRESS' && (
            <Button className="flex-1" variant="default">
              Submit for Review
            </Button>
          )}
          {prerequisite.status === 'READY_FOR_REVIEW' && (
            <>
              <Button className="flex-1" variant="outline">
                Request Qualification
              </Button>
              <Button className="flex-1" variant="default">
                Approve
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
