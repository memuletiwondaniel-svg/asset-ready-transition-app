import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Settings, ClipboardList, KeyRound, Send, Mic, ImagePlus, Clock, FileText, CheckCircle, Home, Loader2 } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import AdminHeader from './admin/AdminHeader';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { useUserTasks } from '@/hooks/useUserTasks';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface LandingPageProps {
  onBack: () => void;
  onNavigate: (section: string) => void;
}

const LandingPageContent: React.FC<LandingPageProps> = ({
  onBack,
  onNavigate
}) => {
  const { language, setLanguage, translations: t } = useLanguage();
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const { tasks, loading: tasksLoading, updateTaskStatus } = useUserTasks();
  const { isListening, startListening, stopListening, isSupported } = useVoiceInput();
  const { toast } = useToast();

  const userName = 'Daniel';

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening((transcript) => {
        setUserInput(transcript);
        toast({
          title: "Voice Input Received",
          description: transcript,
        });
      });
    }
  };

  const sendMessageToAI = async (message: string) => {
    if (!message.trim()) return;

    const userMessage = { role: 'user' as const, content: message };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoadingAI(true);

    let assistantContent = '';

    try {
      const response = await fetch(
        'https://kgnrjqjbonuvpxxfvfjq.supabase.co/functions/v1/ai-chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages: [...messages, userMessage] }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;

        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.role === 'assistant') {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('AI Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get AI response',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSend = () => {
    if (userInput.trim()) {
      sendMessageToAI(userInput);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    {
      id: 'create-pssr',
      label: 'Create a PSSR',
      icon: ClipboardList
    },
    {
      id: 'approve-pssr',
      label: 'Approve a PSSR',
      icon: CheckCircle
    },
    {
      id: 'develop-p2a',
      label: 'Develop a P2A Plan',
      icon: FileText
    }
  ];

  const workspaceCards = [
    {
      id: 'safe-startup',
      title: 'Safe Start-Up',
      description: 'Manage PSSR processes and safety checklists',
      icon: ClipboardList,
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'p2o',
      title: 'Project-to-Operations',
      description: 'Manage seamless project handovers',
      icon: KeyRound,
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      id: 'admin-tools',
      title: 'Admin & Tools',
      description: 'Manage users, roles, and permissions',
      icon: Settings,
      gradient: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <AnimatedBackground>
      <AdminHeader selectedLanguage={language} onLanguageChange={setLanguage} translations={t}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={onBack} className="cursor-pointer flex items-center gap-1.5">
                <Home className="h-4 w-4" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>AI Assistant</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </AdminHeader>

      <div className="h-[calc(100vh-5rem)] flex gap-4 p-4">
        <div className="flex-1 flex flex-col gap-4">
          <Card className="flex-1 border-border/40 shadow-lg overflow-hidden flex flex-col">
            <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5 flex-shrink-0">
              <CardTitle className="text-2xl font-bold">Welcome, {userName}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col flex-1 overflow-hidden">
              <div className="space-y-3 flex-shrink-0 mb-4">
                <div className="relative">
                  <Textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question or describe what you need..."
                    className="min-h-[100px] resize-none border-border/40 pr-24"
                    disabled={isLoadingAI}
                  />
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleVoiceInput}
                      disabled={!isSupported || isLoadingAI}
                      className="h-8 w-8"
                    >
                      <Mic className={`w-4 h-4 ${isListening ? 'text-destructive animate-pulse' : ''}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled
                      className="h-8 w-8"
                    >
                      <ImagePlus className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={isLoadingAI || !userInput.trim()}
                      className="rounded-full bg-gradient-to-br from-primary to-accent h-8 w-8"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <Button
                      key={action.id}
                      variant="outline"
                      size="sm"
                      className="text-xs border-border/40 hover:bg-accent/20"
                      onClick={() => setUserInput(action.label)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Start a conversation or select a quick action above
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isLoadingAI && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 border-border/40 shadow-lg">
            <CardHeader className="border-b border-border/40">
              <CardTitle className="text-lg">Workspaces</CardTitle>
              <CardDescription className="text-xs">Select a workspace to get started</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-3 h-full">
                {workspaceCards.map((workspace) => {
                  const Icon = workspace.icon;
                  return (
                    <Card
                      key={workspace.id}
                      onClick={() => onNavigate(workspace.id)}
                      className="cursor-pointer border-border/40 hover:border-primary/30 transition-all hover:shadow-lg hover:scale-105 group"
                    >
                      <CardContent className="p-4 flex flex-col items-center justify-center h-full text-center space-y-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${workspace.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                            {workspace.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {workspace.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="w-80 border-border/40 shadow-lg">
          <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Tasks
            </CardTitle>
            <CardDescription className="text-xs">Your action items</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-12rem)]">
            {tasksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending tasks</p>
              </div>
            ) : (
              tasks.map((task) => (
                <Card key={task.id} className="border-border/40 hover:border-primary/30 transition-all cursor-pointer hover:shadow-md">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                      <Badge 
                        variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        Due: {task.due_date ? formatDistanceToNow(new Date(task.due_date), { addSuffix: true }) : 'No deadline'}
                      </span>
                    </div>
                    {task.type === 'approval' && (
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          className="flex-1 h-7 text-xs"
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 h-7 text-xs"
                          onClick={() => updateTaskStatus(task.id, 'cancelled')}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AnimatedBackground>
  );
};

const LandingPage: React.FC<LandingPageProps> = (props) => {
  return (
    <LanguageProvider>
      <LandingPageContent {...props} />
    </LanguageProvider>
  );
};

export default LandingPage;
