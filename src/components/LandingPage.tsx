import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Settings, ClipboardList, KeyRound, Send, Mic, ImagePlus, Clock, FileText, CheckCircle, Home, Loader2, History, ChevronRight, ChevronLeft, Filter, ArrowUpDown } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const {
    language,
    setLanguage,
    translations: t
  } = useLanguage();
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
  }>>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isTasksPanelCollapsed, setIsTasksPanelCollapsed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [taskSortBy, setTaskSortBy] = useState<'priority' | 'due_date' | 'type'>('priority');
  const [taskFilterType, setTaskFilterType] = useState<string>('all');
  const {
    tasks,
    loading: tasksLoading,
    updateTaskStatus
  } = useUserTasks();
  const {
    isListening,
    startListening,
    stopListening,
    isSupported
  } = useVoiceInput();
  const {
    toast
  } = useToast();
  const userName = 'Daniel';
  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(transcript => {
        setUserInput(transcript);
        toast({
          title: "Voice Input Received",
          description: transcript
        });
      });
    }
  };
  const sendMessageToAI = async (message: string) => {
    if (!message.trim()) return;
    
    // Add to search history
    setSearchHistory(prev => {
      const newHistory = [message, ...prev.filter(h => h !== message)].slice(0, 10);
      return newHistory;
    });
    
    const userMessage = {
      role: 'user' as const,
      content: message
    };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoadingAI(true);
    setShowHistory(false);
    let assistantContent = '';
    try {
      const response = await fetch('https://kgnrjqjbonuvpxxfvfjq.supabase.co/functions/v1/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }
      if (!response.body) throw new Error('No response body');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const {
          done,
          value
        } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {
          stream: true
        });
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
                  return prev.map((m, i) => i === prev.length - 1 ? {
                    ...m,
                    content: assistantContent
                  } : m);
                }
                return [...prev, {
                  role: 'assistant',
                  content: assistantContent
                }];
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
        variant: 'destructive'
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

  // Filter and sort tasks
  const filteredAndSortedTasks = React.useMemo(() => {
    let filtered = tasks;
    
    // Filter by type
    if (taskFilterType !== 'all') {
      filtered = filtered.filter(task => task.type === taskFilterType);
    }
    
    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (taskSortBy === 'priority') {
        const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      } else if (taskSortBy === 'due_date') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      } else if (taskSortBy === 'type') {
        return a.type.localeCompare(b.type);
      }
      return 0;
    });
    
    return sorted;
  }, [tasks, taskFilterType, taskSortBy]);

  const quickActions = [{
    id: 'create-pssr',
    label: 'Create a PSSR',
    icon: ClipboardList
  }, {
    id: 'approve-pssr',
    label: 'Approve a PSSR',
    icon: CheckCircle
  }, {
    id: 'develop-p2a',
    label: 'Develop a P2A Plan',
    icon: FileText
  }];
  const workspaceCards = [{
    id: 'safe-startup',
    title: 'Safe Start-Up',
    description: 'Manage PSSR processes and safety checklists',
    icon: ClipboardList,
    gradient: 'from-blue-500 to-blue-600',
    bgTone: 'bg-blue-500/5'
  }, {
    id: 'p2o',
    title: 'Project-to-Operations',
    description: 'Manage seamless project handovers',
    icon: KeyRound,
    gradient: 'from-purple-500 to-purple-600',
    bgTone: 'bg-purple-500/5'
  }, {
    id: 'admin-tools',
    title: 'Admin & Tools',
    description: 'Manage users, roles, and permissions',
    icon: Settings,
    gradient: 'from-orange-500 to-orange-600',
    bgTone: 'bg-orange-500/5'
  }];
  return <AnimatedBackground>
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
          <Card className="border-border/40 shadow-lg overflow-hidden flex flex-col" style={{ height: '35%' }}>
            <CardHeader className="border-b border-border/40 flex-shrink-0 py-4">
              <CardTitle className="text-3xl font-bold">Welcome, {userName}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col flex-1 overflow-hidden">
              <div className="space-y-2 flex-shrink-0">
                <div className="relative">
                  <Textarea value={userInput} onChange={e => setUserInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ask a question or describe what you need..." className="min-h-[120px] resize-none border-border/40 pr-24" disabled={isLoadingAI} />
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    <Button size="icon" variant="ghost" onClick={handleVoiceInput} disabled={!isSupported || isLoadingAI} className="h-7 w-7">
                      <Mic className={`w-3.5 h-3.5 ${isListening ? 'text-destructive animate-pulse' : ''}`} />
                    </Button>
                    <Button size="icon" variant="ghost" disabled className="h-7 w-7">
                      <ImagePlus className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" onClick={handleSend} disabled={isLoadingAI || !userInput.trim()} className="rounded-full bg-gradient-to-br from-primary to-accent h-7 w-7">
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowHistory(!showHistory)} 
                    className="text-[11px] h-7 px-3 border-border/40 bg-muted/30 hover:bg-muted/50"
                  >
                    <History className="w-3 h-3 mr-1.5" />
                    History
                  </Button>
                  <div className="flex flex-wrap gap-1.5">
                    {quickActions.map(action => <Button key={action.id} variant="outline" size="sm" className="text-[11px] h-7 px-3 border-border/40 bg-muted/30 hover:bg-muted/50" onClick={() => setUserInput(action.label)}>
                        {action.label}
                      </Button>)}
                  </div>
                </div>
                
                {showHistory && searchHistory.length > 0 && (
                  <Card className="border-border/40 bg-background/95 backdrop-blur">
                    <CardContent className="p-2 space-y-1">
                      <p className="text-xs text-muted-foreground px-2 py-1">Recent searches</p>
                      {searchHistory.map((item, idx) => (
                        <Button
                          key={idx}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-7 px-2"
                          onClick={() => {
                            setUserInput(item);
                            setShowHistory(false);
                          }}
                        >
                          <History className="w-3 h-3 mr-2" />
                          {item}
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-lg" style={{ height: '63%' }}>
            <CardHeader className="border-b border-border/40 py-3">
              <CardTitle className="text-lg">Workspaces</CardTitle>
              <CardDescription className="text-xs">Select a workspace to get started</CardDescription>
            </CardHeader>
            <CardContent className="p-4 h-[calc(100%-5rem)]">
              <div className="grid grid-cols-3 gap-3 h-full">
                {workspaceCards.map(workspace => {
                const Icon = workspace.icon;
                return <Card key={workspace.id} onClick={() => onNavigate(workspace.id)} className={`cursor-pointer border-border/40 hover:border-primary/30 transition-all hover:shadow-lg hover:scale-105 group ${workspace.bgTone}`}>
                      <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center space-y-4">
                        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${workspace.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-base mb-1.5 group-hover:text-primary transition-colors">
                            {workspace.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {workspace.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>;
              })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className={`border-border/40 shadow-lg transition-all duration-300 ${isTasksPanelCollapsed ? 'w-12' : 'w-80'}`}>
          <CardHeader className="border-b border-border/40 py-3">
            <div className="flex items-center justify-between">
              {!isTasksPanelCollapsed && (
                <div className="flex items-center gap-2 flex-1">
                  <Clock className="w-5 h-5" />
                  <div className="flex-1">
                    <CardTitle className="text-lg">Pending Tasks</CardTitle>
                    <CardDescription className="text-xs">Your action items</CardDescription>
                  </div>
                </div>
              )}
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => setIsTasksPanelCollapsed(!isTasksPanelCollapsed)}
                className="h-8 w-8 flex-shrink-0"
              >
                {isTasksPanelCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </CardHeader>
          {!isTasksPanelCollapsed && (
            <>
              <div className="border-b border-border/40 p-3 space-y-2">
                <div className="flex gap-2">
                  <Select value={taskFilterType} onValueChange={setTaskFilterType}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <Filter className="w-3 h-3 mr-1" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="approval">Approval</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="action">Action</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={taskSortBy} onValueChange={(value) => setTaskSortBy(value as 'priority' | 'due_date' | 'type')}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <ArrowUpDown className="w-3 h-3 mr-1" />
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="due_date">Due Date</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CardContent className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-16rem)]">
                {tasksLoading ? <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div> : filteredAndSortedTasks.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No {taskFilterType !== 'all' ? taskFilterType : ''} tasks</p>
                  </div> : filteredAndSortedTasks.map(task => <Card key={task.id} className="border-border/40 hover:border-primary/30 transition-all cursor-pointer hover:shadow-md">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                          <Badge variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'default' : 'secondary'} className="text-xs">
                            {task.priority}
                          </Badge>
                        </div>
                        {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>
                            Due: {task.due_date ? formatDistanceToNow(new Date(task.due_date), {
                        addSuffix: true
                      }) : 'No deadline'}
                          </span>
                        </div>
                        {task.type === 'approval' && <div className="flex gap-2 pt-2">
                            <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => updateTaskStatus(task.id, 'completed')}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => updateTaskStatus(task.id, 'cancelled')}>
                              Reject
                            </Button>
                          </div>}
                      </CardContent>
                    </Card>)}
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </AnimatedBackground>;
};
const LandingPage: React.FC<LandingPageProps> = props => {
  return <LanguageProvider>
      <LandingPageContent {...props} />
    </LanguageProvider>;
};
export default LandingPage;