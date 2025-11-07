import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Settings, ClipboardList, KeyRound, Send, Mic, ImagePlus, Clock, FileText, CheckCircle, Home, Loader2, History, ChevronRight, ChevronLeft, Filter, ArrowUpDown, Check, X } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import AdminHeader from './admin/AdminHeader';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { AnimatedParticles } from '@/components/ui/AnimatedParticles';
import { OnboardingTour } from '@/components/OnboardingTour';
import { DashboardWidgets } from '@/components/widgets/DashboardWidgets';
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
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [taskAction, setTaskAction] = useState<'complete' | 'dismiss' | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWidgets, setShowWidgets] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Check if user has seen the tour before
  React.useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    if (!hasSeenTour) {
      // Show tour after a brief delay
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);
  const {
    tasks,
    loading: tasksLoading,
    updateTaskStatus,
    deleteTask
  } = useUserTasks();
  
  // Scroll to bottom when new messages arrive
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
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

  const handleTaskAction = async (taskId: string, action: 'complete' | 'dismiss') => {
    if (action === 'complete') {
      await updateTaskStatus(taskId, 'completed');
    } else {
      await deleteTask(taskId);
    }
    setTaskToDelete(null);
    setTaskAction(null);
    toast({
      title: action === 'complete' ? 'Task completed' : 'Task dismissed',
      description: `Task has been ${action === 'complete' ? 'marked as complete' : 'removed from your list'}`
    });
  };

  // Calculate task counts by type
  const taskCounts = React.useMemo(() => {
    return {
      all: tasks.length,
      approval: tasks.filter(t => t.type === 'approval').length,
      review: tasks.filter(t => t.type === 'review').length,
      action: tasks.filter(t => t.type === 'action').length
    };
  }, [tasks]);

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
      {/* Particle Effects */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <AnimatedParticles />
      </div>
      
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

      <div className="h-[calc(100vh-5rem)] flex gap-6 p-6">
        {/* Main Content Area */}
        {showWidgets ? (
          <div className="flex-1 animate-fade-in">
            <DashboardWidgets />
          </div>
        ) : (
        <div className="flex-1 flex flex-col gap-6">
          {/* AI Assistant Panel */}
          <Card className="border-border/40 shadow-xl overflow-hidden flex flex-col backdrop-blur-xl bg-card/95 animate-smooth-in" style={{ height: '40%' }}>
            <CardHeader className="flex-shrink-0 py-5">
              <CardTitle className="text-4xl font-bold">
                Welcome, {userName}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col flex-1 overflow-hidden">
              <div className="space-y-3 flex-shrink-0">
                <div className="relative group" data-tour="ai-input">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Textarea 
                    value={userInput} 
                    onChange={e => setUserInput(e.target.value)} 
                    onKeyPress={handleKeyPress} 
                    placeholder="Ask a question or describe what you need..." 
                    className="min-h-[100px] resize-none border-border/40 pr-24 relative backdrop-blur-sm bg-background/50 focus:bg-background/80 transition-all duration-300" 
                    disabled={isLoadingAI} 
                  />
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={handleVoiceInput} 
                      disabled={!isSupported || isLoadingAI} 
                      className="h-9 w-9 hover:bg-primary/10 transition-all duration-300"
                    >
                      <Mic className={`w-4 h-4 ${isListening ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      disabled 
                      className="h-9 w-9 hover:bg-primary/10 transition-all duration-300"
                    >
                      <ImagePlus className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button 
                      size="icon" 
                      onClick={handleSend} 
                      disabled={isLoadingAI || !userInput.trim()} 
                      className="rounded-full bg-gradient-to-br from-primary to-accent h-9 w-9 hover:scale-110 transition-transform duration-300 shadow-lg hover:shadow-xl"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 animate-smooth-in stagger-1" data-tour="quick-actions">
                  <Button 
                    size="icon"
                    variant="outline" 
                    onClick={() => setShowHistory(!showHistory)} 
                    className="h-8 w-8 border-border/40 bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 transition-all duration-300 backdrop-blur-sm"
                    title="View search history"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    {quickActions.map((action, idx) => <Button 
                      key={action.id} 
                      variant="outline" 
                      size="sm" 
                      className={`text-xs h-8 px-4 border-border/40 bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 transition-all duration-300 backdrop-blur-sm animate-smooth-in stagger-${idx + 2}`}
                      onClick={() => setUserInput(action.label)}
                    >
                      {action.label}
                    </Button>)}
                  </div>
                </div>
                
                {showHistory && searchHistory.length > 0 && (
                  <Card className="border-border/40 bg-background/98 backdrop-blur-xl shadow-2xl animate-scale-in">
                    <CardContent className="p-3 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">Recent searches</p>
                      {searchHistory.map((item, idx) => (
                        <Button
                          key={idx}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-8 px-3 hover:bg-primary/10 transition-all duration-300"
                          onClick={() => {
                            setUserInput(item);
                            setShowHistory(false);
                          }}
                        >
                          <History className="w-3.5 h-3.5 mr-2 text-primary" />
                          <span className="truncate">{item}</span>
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* AI Conversation Display */}
              {messages.length > 0 && (
                <ScrollArea className="flex-1 pr-4 mt-4">
                  <div className="space-y-4 py-2">
                    {messages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-smooth-in`}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl ${
                          msg.role === 'user' 
                            ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground' 
                            : 'bg-gradient-to-br from-muted/80 to-muted/60 border border-border/40'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isLoadingAI && (
                      <div className="flex justify-start animate-smooth-in">
                        <div className="bg-gradient-to-br from-muted/80 to-muted/60 rounded-2xl px-5 py-3 border border-border/40 backdrop-blur-sm">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Workspaces Section */}
          <Card className="border-border/40 shadow-xl backdrop-blur-xl bg-card/95 animate-smooth-in stagger-2" style={{ height: '58%' }} data-tour="workspaces">
            <CardHeader className="border-b border-border/40 py-4 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
              <CardTitle className="text-2xl font-bold">Workspaces</CardTitle>
              <CardDescription className="text-sm">Select a workspace to get started</CardDescription>
            </CardHeader>
            <CardContent className="p-6 h-[calc(100%-6rem)] overflow-auto">
              <div className="grid grid-cols-3 gap-6 h-full">
                {workspaceCards.map((workspace, idx) => {
                const Icon = workspace.icon;
                return <Card 
                  key={workspace.id} 
                  onClick={() => onNavigate(workspace.id)} 
                  className={`cursor-pointer border-border/40 hover:border-primary/40 transition-all duration-500 hover:shadow-2xl hover:scale-105 group backdrop-blur-sm overflow-hidden animate-smooth-in ${workspace.bgTone}`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-accent/0 group-hover:from-primary/5 group-hover:to-accent/5 transition-all duration-500" />
                      
                      <CardContent className="p-8 flex flex-col items-center justify-center h-full text-center space-y-5 relative z-10">
                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${workspace.gradient} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-xl`}>
                          <Icon className="w-10 h-10 text-white drop-shadow-lg" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors duration-300">
                            {workspace.title}
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
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
        )}

        {/* Tasks Panel */}
        <Card className={`border-border/40 shadow-xl transition-all duration-500 backdrop-blur-xl bg-card/95 animate-smooth-in stagger-3 ${isTasksPanelCollapsed ? 'w-16' : 'w-96'}`} data-tour="tasks">
          <CardHeader className="border-b border-border/40 py-4 bg-gradient-to-r from-primary/5 to-accent/5">
            <div className="flex items-center justify-between">
              {!isTasksPanelCollapsed && (
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl font-bold">Pending Tasks</CardTitle>
                    <CardDescription className="text-sm">Your action items</CardDescription>
                  </div>
                </div>
              )}
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => setIsTasksPanelCollapsed(!isTasksPanelCollapsed)}
                className="h-10 w-10 flex-shrink-0 hover:bg-primary/10 transition-all duration-300"
              >
                {isTasksPanelCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </Button>
            </div>
          </CardHeader>
          {!isTasksPanelCollapsed && (
            <>
              <div className="border-b border-border/40 p-4 space-y-3 bg-gradient-to-r from-muted/30 to-muted/10">
                <div className="flex gap-3">
                  <Select value={taskFilterType} onValueChange={setTaskFilterType}>
                    <SelectTrigger className="h-9 text-sm flex-1 backdrop-blur-sm bg-background/80 hover:bg-background transition-colors">
                      <Filter className="w-4 h-4 mr-2 text-primary" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-background/98">
                      <SelectItem value="all">
                        <div className="flex items-center justify-between w-full">
                          <span>All Types</span>
                          <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                            {taskCounts.all}
                          </Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="approval">
                        <div className="flex items-center justify-between w-full">
                          <span>Approval</span>
                          <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                            {taskCounts.approval}
                          </Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="review">
                        <div className="flex items-center justify-between w-full">
                          <span>Review</span>
                          <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                            {taskCounts.review}
                          </Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="action">
                        <div className="flex items-center justify-between w-full">
                          <span>Action</span>
                          <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                            {taskCounts.action}
                          </Badge>
                        </div>
                      </SelectItem>
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
                  </div> : filteredAndSortedTasks.map(task => <Card key={task.id} className="border-border/40 hover:border-primary/30 transition-all cursor-pointer hover:shadow-md group relative">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                          <div className="flex items-center gap-1">
                            <Badge variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'default' : 'secondary'} className="text-xs">
                              {task.priority}
                            </Badge>
                          </div>
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
                        <div className="flex gap-2 pt-2">
                          {task.type === 'approval' ? (
                            <>
                              <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => updateTaskStatus(task.id, 'completed')}>
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1 h-8 text-xs font-medium hover:bg-destructive/10 transition-all" 
                                onClick={() => updateTaskStatus(task.id, 'cancelled')}
                              >
                                Reject
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="flex-1 h-8 text-xs font-medium shadow-sm hover:shadow-md transition-all" 
                                onClick={() => {
                                  setTaskToDelete(task.id);
                                  setTaskAction('complete');
                                }}
                              >
                                <Check className="w-3.5 h-3.5 mr-1.5" />
                                Complete
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1 h-8 text-xs font-medium hover:bg-destructive/10 transition-all" 
                                onClick={() => {
                                  setTaskToDelete(task.id);
                                  setTaskAction('dismiss');
                                }}
                              >
                                <X className="w-3.5 h-3.5 mr-1.5" />
                                Dismiss
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>)}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Onboarding Tour */}
      {showOnboarding && (
        <OnboardingTour 
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('hasSeenTour', 'true');
          }}
        />
      )}

      {/* Task Action Confirmation Dialog */}
      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {taskAction === 'complete' ? 'Complete Task' : 'Dismiss Task'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {taskAction === 'complete' 
                ? 'Are you sure you want to mark this task as completed? This action cannot be undone.'
                : 'Are you sure you want to dismiss this task? It will be removed from your list.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => taskToDelete && taskAction && handleTaskAction(taskToDelete, taskAction)}>
              {taskAction === 'complete' ? 'Complete' : 'Dismiss'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AnimatedBackground>;
};
const LandingPage: React.FC<LandingPageProps> = props => {
  return <LanguageProvider>
      <LandingPageContent {...props} />
    </LanguageProvider>;
};
export default LandingPage;