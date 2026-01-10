import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  MinusCircle,
  FileText,
  Download,
  Eye,
  User,
  MessageSquare,
  AlertCircle,
  Shield,
  ClipboardCheck,
  Globe,
  Loader2
} from 'lucide-react';
import { useTranslateText } from '@/hooks/useChecklistTranslation';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChecklistItemResponse {
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
}

interface ChecklistItemWithResponse {
  id: string;
  unique_id: string;
  description: string;
  category: string;
  topic?: string;
  response?: ChecklistItemResponse;
}

interface SOFChecklistItemDetailProps {
  item: ChecklistItemWithResponse;
  pssrId: string;
  onBack: () => void;
}

const getResponseDisplay = (response: string | null | undefined) => {
  switch (response?.toUpperCase()) {
    case 'YES':
      return {
        icon: <CheckCircle2 className="h-5 w-5" />,
        label: 'Yes - Compliant',
        className: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
      };
    case 'NO':
    case 'DEVIATION':
      return {
        icon: <AlertTriangle className="h-5 w-5" />,
        label: 'Deviation',
        className: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
      };
    case 'NA':
    case 'N/A':
      return {
        icon: <MinusCircle className="h-5 w-5" />,
        label: 'Not Applicable',
        className: 'bg-muted text-muted-foreground border-border',
      };
    default:
      return {
        icon: <AlertCircle className="h-5 w-5" />,
        label: response || 'No Response',
        className: 'bg-muted text-muted-foreground border-border',
      };
  }
};

export const SOFChecklistItemDetail: React.FC<SOFChecklistItemDetailProps> = ({
  item,
  pssrId,
  onBack,
}) => {
  const { language } = useLanguage();
  const { translate, isTranslating, isEnglish } = useTranslateText();
  const [translatedDescription, setTranslatedDescription] = useState(item.description);
  const [translatedCategory, setTranslatedCategory] = useState(item.category);
  const [translatedTopic, setTranslatedTopic] = useState(item.topic);

  // Translate on language change
  useEffect(() => {
    const translateContent = async () => {
      if (isEnglish) {
        setTranslatedDescription(item.description);
        setTranslatedCategory(item.category);
        setTranslatedTopic(item.topic);
        return;
      }

      const [desc, cat, top] = await Promise.all([
        translate(item.description),
        translate(item.category),
        item.topic ? translate(item.topic) : Promise.resolve(undefined),
      ]);

      setTranslatedDescription(desc);
      setTranslatedCategory(cat);
      setTranslatedTopic(top);
    };

    translateContent();
  }, [item, language, translate, isEnglish]);

  const responseDisplay = getResponseDisplay(item.response?.response);
  const hasDeviation = item.response?.response?.toUpperCase() === 'NO' || 
                       item.response?.response?.toUpperCase() === 'DEVIATION';

  // TODO: In future, fetch actual evidence/attachments from a storage bucket
  // For now, we'll show a placeholder
  const evidenceFiles: { name: string; type: string; size: string }[] = [];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-4">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Checklist
        </Button>

        {/* Item Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono">
                    {item.unique_id}
                  </Badge>
                  <Badge variant="secondary">
                    {isTranslating && !isEnglish ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    {translatedCategory}
                  </Badge>
                  {translatedTopic && (
                    <Badge variant="outline">{translatedTopic}</Badge>
                  )}
                  {!isEnglish && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Globe className="h-3 w-3" />
                      {language}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg mt-2">
                  {isTranslating && !isEnglish ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {translatedDescription}
                    </span>
                  ) : (
                    translatedDescription
                  )}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Response Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${responseDisplay.className}`}>
              {responseDisplay.icon}
              <span className="font-medium">{responseDisplay.label}</span>
            </div>
            
            {item.response?.status === 'SUBMITTED' && (
              <Badge className="ml-3 bg-green-500/20 text-green-600 dark:text-green-400">
                Submitted
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Narrative/Comments */}
        {item.response?.narrative && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Narrative / Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {item.response.narrative}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Deviation Details */}
        {hasDeviation && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Deviation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.response?.deviation_reason && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Deviation Reason
                  </h4>
                  <p className="text-sm">{item.response.deviation_reason}</p>
                </div>
              )}

              {item.response?.potential_risk && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Potential Risk
                  </h4>
                  <p className="text-sm">{item.response.potential_risk}</p>
                </div>
              )}

              {item.response?.mitigations && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Mitigations
                  </h4>
                  <p className="text-sm">{item.response.mitigations}</p>
                </div>
              )}

              {item.response?.follow_up_action && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Follow-up Action
                  </h4>
                  <p className="text-sm">{item.response.follow_up_action}</p>
                </div>
              )}

              {item.response?.action_owner && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Action Owner:</span>{' '}
                    <span className="font-medium">{item.response.action_owner}</span>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Justification (for N/A responses) */}
        {item.response?.justification && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Justification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {item.response.justification}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Evidence Documents Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Evidence Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {evidenceFiles.length > 0 ? (
              <div className="space-y-2">
                {evidenceFiles.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.type} • {file.size}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border rounded-lg border-dashed">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No evidence documents attached to this item.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default SOFChecklistItemDetail;
