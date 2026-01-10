import React, { useState } from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, MessageSquare, FileText, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ORSHChatDialog } from '@/components/widgets/ORSHChatDialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface AIAssistantWidgetProps {
  settings: Record<string, any>;
}

export const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = ({ settings }) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const { translations: t } = useLanguage();

  const quickPrompts = [
    {
      id: 1,
      icon: MessageSquare,
      label: t.askAI || 'Ask AI',
      prompt: 'How can I help you today?'
    },
    {
      id: 2,
      icon: FileText,
      label: t.summarizePSSR || 'Summarize PSSR',
      prompt: 'Summarize my recent PSSR'
    },
    {
      id: 3,
      icon: CheckSquare,
      label: t.reviewChecklist || 'Review Checklist',
      prompt: 'Review my checklist items'
    }
  ];

  const handlePromptClick = (prompt: string) => {
    setInitialPrompt(prompt);
    setChatOpen(true);
  };

  return (
    <>
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {t.askBobTitle || 'Ask Bob'}
        </CardTitle>
        <CardDescription className="text-xs">{t.yourIntelligentAssistant || 'Your intelligent assistant'}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {quickPrompts.map((prompt, idx) => {
          const Icon = prompt.icon;
          return (
            <Button
              key={prompt.id}
              variant="outline"
              onClick={() => handlePromptClick(prompt.prompt)}
              className="w-full justify-start gap-3 h-auto py-3 hover:bg-primary/5 transition-all"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{prompt.label}</p>
              </div>
            </Button>
          );
        })}
      </CardContent>

      <ORSHChatDialog 
        open={chatOpen} 
        onOpenChange={setChatOpen}
        initialMessage={initialPrompt}
      />
    </>
  );
};
