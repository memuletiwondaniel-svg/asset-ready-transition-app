import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  FileText,
  Download,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Target,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { VCRQualification, getQualificationStatusConfig } from '../hooks/useVCRQualifications';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface QualificationDetailSheetProps {
  qualification: VCRQualification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QualificationDetailSheet: React.FC<QualificationDetailSheetProps> = ({
  qualification,
  open,
  onOpenChange,
}) => {
  if (!qualification) return null;

  const statusConfig = getQualificationStatusConfig(qualification.status);

  const ownerId = qualification.action_owner_id;
  const ownerName = qualification.action_owner_name;

  const { data: ownerProfile } = useQuery({
    queryKey: ['qualification-action-owner', ownerId, ownerName],
    enabled: !!(ownerId || ownerName),
    queryFn: async () => {
      const client = supabase as any;
      let row: any = null;
      if (ownerId) {
        const { data } = await client
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .eq('user_id', ownerId)
          .maybeSingle();
        row = data;
      }
      if (!row && ownerName) {
        const { data } = await client
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .ilike('full_name', ownerName)
          .maybeSingle();
        row = data;
      }
      if (!row) return null;
      let url = row.avatar_url as string | null;
      if (url && !url.startsWith('http')) {
        const { data } = supabase.storage.from('user-avatars').getPublicUrl(url);
        url = data.publicUrl;
      }
      return { name: row.full_name as string, avatarUrl: url || '' };
    },
  });

  const initials = (ownerName || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('') || '?';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
          </div>
          <SheetTitle className="text-lg">Qualification Request</SheetTitle>
          {qualification.prerequisite && (
            <SheetDescription>
              For: {qualification.prerequisite.summary}
            </SheetDescription>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Reason Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Reason for Qualification</h4>
              <Card className="border-amber-500/50 bg-amber-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground">{qualification.reason}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Mitigation Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Proposed Mitigation</h4>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <ArrowRight className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground">{qualification.mitigation}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {qualification.follow_up_action && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Follow-up Action</h4>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-foreground">{qualification.follow_up_action}</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            <Separator />

            {/* Owner & Target */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Action Details</h4>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2.5">
                      {ownerName ? (
                        <Avatar className="w-8 h-8 shrink-0">
                          {ownerProfile?.avatarUrl && <AvatarImage src={ownerProfile.avatarUrl} alt={ownerName} />}
                          <AvatarFallback className="text-[10px] font-medium">{initials}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">Action Owner</div>
                        <div className="text-sm font-medium truncate">
                          {ownerName || 'Not assigned'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Target Date</div>
                        <div className="text-sm font-medium">
                          {format(new Date(qualification.target_date), 'dd MMM yyyy')}
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
                    <div className="text-xs text-muted-foreground">Submitted</div>
                    <div>{format(new Date(qualification.submitted_at), 'dd MMM yyyy')}</div>
                  </div>
                </div>
                
                {qualification.reviewed_at && (
                  <div className="flex items-center gap-2 text-sm">
                    {qualification.status === 'APPROVED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <div>
                      <div className="text-xs text-muted-foreground">Reviewed</div>
                      <div>{format(new Date(qualification.reviewed_at), 'dd MMM yyyy')}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reviewer Comments */}
            {qualification.reviewer_comments && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Reviewer Comments</h4>
                  <Card className={cn(
                    qualification.status === 'REJECTED' 
                      ? "border-red-500/50 bg-red-500/5" 
                      : "border-emerald-500/50 bg-emerald-500/5"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <MessageSquare className={cn(
                          "w-5 h-5 mt-0.5",
                          qualification.status === 'REJECTED' ? "text-red-500" : "text-emerald-500"
                        )} />
                        <p className="text-sm text-foreground">{qualification.reviewer_comments}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* Evidence Section */}
            {qualification.evidence && qualification.evidence.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground">Supporting Evidence</h4>
                    <span className="text-xs text-muted-foreground">
                      {qualification.evidence.length} file(s)
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {qualification.evidence.map((file) => (
                      <Card key={file.id} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{file.file_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(file.created_at), 'dd MMM yyyy')}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            <Download className="w-4 h-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="border-t pt-4 mt-auto flex gap-2">
          {qualification.status === 'PENDING' && (
            <>
              <Button variant="outline" className="flex-1 text-red-500 border-red-500 hover:bg-red-500/10">
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button variant="default" className="flex-1">
                <CheckCircle2 className="w-4 h-4 mr-2" />
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
