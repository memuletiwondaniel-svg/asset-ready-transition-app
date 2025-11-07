import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck, Settings, ClipboardList, KeyRound, Languages, ChevronDown, User, LogOut, Send, Mic, ImagePlus, Sparkles, ArrowRight, Clock, FileText, CheckCircle, LayoutDashboard } from 'lucide-react';

interface LandingPageProps {
  onBack: () => void;
  onNavigate: (section: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({
  onBack,
  onNavigate
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [userInput, setUserInput] = useState('');
  const [scrollY, setScrollY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mock user data - in a real app, this would come from authentication context
  const userName = 'Daniel';

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        setScrollY(containerRef.current.scrollTop);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Language translations
  const translations = {
    English: {
      welcome: 'Welcome',
      helpPrompt: 'What can I help you with today?',
      placeholder: 'Ask a question or describe what you need...',
      send: 'Send',
      uploadImage: 'Upload Image',
      voiceInput: 'Voice Input',
      signOut: 'Sign Out',
      recentActivities: 'Recent Activities',
      viewDashboard: 'View Dashboard',
      workspaces: 'Workspaces',
      suggestions: 'Quick Actions'
    },
    العربية: {
      welcome: 'مرحباً',
      helpPrompt: 'كيف يمكنني مساعدتك اليوم؟',
      placeholder: 'اطرح سؤالاً أو صف ما تحتاجه...',
      send: 'إرسال',
      uploadImage: 'تحميل الصورة',
      voiceInput: 'إدخال صوتي',
      signOut: 'تسجيل الخروج',
      recentActivities: 'الأنشطة الأخيرة',
      viewDashboard: 'عرض لوحة التحكم',
      workspaces: 'مساحات العمل',
      suggestions: 'إجراءات سريعة'
    },
    Русский: {
      welcome: 'Добро пожаловать',
      helpPrompt: 'Чем я могу вам помочь сегодня?',
      placeholder: 'Задайте вопрос или опишите что вам нужно...',
      send: 'Отправить',
      uploadImage: 'Загрузить изображение',
      voiceInput: 'Голосовой ввод',
      signOut: 'Выйти',
      recentActivities: 'Недавняя активность',
      viewDashboard: 'Просмотр панели',
      workspaces: 'Рабочие пространства',
      suggestions: 'Быстрые действия'
    },
    Bahasa: {
      welcome: 'Selamat Datang',
      helpPrompt: 'Apa yang boleh saya bantu hari ini?',
      placeholder: 'Tanya soalan atau terangkan apa yang anda perlukan...',
      send: 'Hantar',
      uploadImage: 'Muat Naik Imej',
      voiceInput: 'Input Suara',
      signOut: 'Log Keluar',
      recentActivities: 'Aktiviti Terkini',
      viewDashboard: 'Lihat Papan Pemuka',
      workspaces: 'Ruang Kerja',
      suggestions: 'Tindakan Pantas'
    }
  };

  // Language options
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية (Arabic)' },
    { code: 'ru', name: 'Русский (Russian)' },
    { code: 'ms', name: 'Bahasa Melayu' }
  ];

  const t = translations[selectedLanguage] || translations.English;

  const quickActions = [
    {
      id: 'create-pssr',
      label: {
        English: 'Create a PSSR',
        العربية: 'إنشاء PSSR',
        Русский: 'Создать PSSR',
        Bahasa: 'Cipta PSSR'
      },
      icon: ClipboardList,
      gradient: 'from-destructive/20 to-destructive/5'
    },
    {
      id: 'approve-pssr',
      label: {
        English: 'Approve a PSSR',
        العربية: 'الموافقة على PSSR',
        Русский: 'Утвердить PSSR',
        Bahasa: 'Luluskan PSSR'
      },
      icon: CheckCircle,
      gradient: 'from-primary/20 to-primary/5'
    },
    {
      id: 'develop-p2a',
      label: {
        English: 'Develop a P2A Plan',
        العربية: 'تطوير خطة P2A',
        Русский: 'Разработать план P2A',
        Bahasa: 'Bangunkan Pelan P2A'
      },
      icon: FileText,
      gradient: 'from-accent/20 to-accent/5'
    }
  ];

  const workspaceCards = [
    {
      id: 'safe-startup',
      title: {
        English: 'Safe Start-Up',
        العربية: 'البدء الآمن',
        Русский: 'Безопасный запуск',
        Bahasa: 'Permulaan Selamat'
      },
      description: {
        English: 'Manage PSSR processes and safety checklists',
        العربية: 'إدارة عمليات PSSR وقوائم السلامة',
        Русский: 'Управление процессами PSSR и списками безопасности',
        Bahasa: 'Urus proses PSSR dan senarai semak keselamatan'
      },
      icon: ShieldCheck,
      gradient: 'from-destructive/20 to-destructive/5'
    },
    {
      id: 'p2o',
      title: {
        English: 'Project-to-Operations',
        العربية: 'المشروع إلى العمليات',
        Русский: 'Проект в Эксплуатацию',
        Bahasa: 'Projek-ke-Operasi'
      },
      description: {
        English: 'Manage seamless project handovers',
        العربية: 'إدارة تسليم المشاريع السلس',
        Русский: 'Управление передачей проектов',
        Bahasa: 'Urus penyerahan projek yang lancar'
      },
      icon: KeyRound,
      gradient: 'from-primary/20 to-primary/5'
    },
    {
      id: 'admin-tools',
      title: {
        English: 'Admin & Tools',
        العربية: 'الإدارة والأدوات',
        Русский: 'Админ и Инструменты',
        Bahasa: 'Admin & Alatan'
      },
      description: {
        English: 'Manage users, roles, and permissions',
        العربية: 'إدارة المستخدمين والأدوار والأذونات',
        Русский: 'Управление пользователями, ролями и разрешениями',
        Bahasa: 'Urus pengguna, peranan, dan kebenaran'
      },
      icon: Settings,
      gradient: 'from-accent/20 to-accent/5'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      title: {
        English: 'Approved DP300 PSSR',
        العربية: 'تمت الموافقة على DP300 PSSR',
        Русский: 'Утверждено DP300 PSSR',
        Bahasa: 'Diluluskan DP300 PSSR'
      },
      time: '2 hours ago',
      icon: CheckCircle,
      color: 'text-primary'
    },
    {
      id: 2,
      title: {
        English: 'Created new P2A checklist',
        العربية: 'تم إنشاء قائمة P2A جديدة',
        Русский: 'Создан новый список P2A',
        Bahasa: 'Dicipta senarai semak P2A baru'
      },
      time: '5 hours ago',
      icon: FileText,
      color: 'text-accent'
    },
    {
      id: 3,
      title: {
        English: 'Updated safety protocols',
        العربية: 'تم تحديث بروتوكولات السلامة',
        Русский: 'Обновлены протоколы безопасности',
        Bahasa: 'Dikemaskini protokol keselamatan'
      },
      time: '1 day ago',
      icon: ShieldCheck,
      color: 'text-destructive'
    }
  ];

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-background via-background/98 to-muted/30 overflow-y-auto scroll-smooth"
    >
      {/* Sticky Header with Glassmorphism */}
      <div 
        className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/70 transition-all duration-300"
        style={{
          transform: `translateY(${Math.min(scrollY * 0.5, 20)}px)`,
        }}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary via-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                  ORSH AI Assistant
                </h1>
                <p className="text-xs text-muted-foreground">Your intelligent operations companion</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 glass hover:bg-accent/20">
                    <Languages className="w-4 h-4" />
                    <span className="hidden md:inline text-sm">{selectedLanguage}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass border-border/50">
                  {languages.map(lang => (
                    <DropdownMenuItem 
                      key={lang.code} 
                      onClick={() => setSelectedLanguage(lang.name.split(' ')[0])}
                      className="cursor-pointer hover:bg-accent/30"
                    >
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 glass hover:bg-accent/20">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass border-border/50">
                  <DropdownMenuItem onClick={onBack} className="cursor-pointer text-destructive hover:bg-destructive/10">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12 max-w-6xl space-y-12">
        
        {/* Hero Section with AI Greeting */}
        <div 
          className="text-center space-y-6 animate-fade-in"
          style={{
            transform: `translateY(${scrollY * -0.1}px)`,
          }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <span className="text-sm text-muted-foreground">AI-Powered Operations Assistant</span>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-5xl md:text-6xl font-bold">
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                {t.welcome}, {userName}
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light">
              {t.helpPrompt}
            </p>
          </div>
        </div>

        {/* AI Input Section */}
        <div 
          className="max-w-3xl mx-auto space-y-4 animate-fade-in"
          style={{
            animationDelay: '0.2s',
            transform: `translateY(${scrollY * -0.15}px)`,
          }}
        >
          <Card className="glass border-border/40 shadow-2xl shadow-primary/5">
            <CardContent className="p-6 space-y-4">
              <div className="relative">
                <Textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={t.placeholder}
                  className="min-h-[120px] resize-none border-border/40 bg-background/50 focus:bg-background/80 transition-all pr-12"
                />
                <Button
                  size="icon"
                  className="absolute bottom-3 right-3 rounded-full bg-gradient-to-br from-primary to-accent hover:shadow-lg hover:shadow-primary/30 transition-all"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="gap-2 hover:bg-accent/20">
                    <ImagePlus className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm">{t.uploadImage}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2 hover:bg-accent/20">
                    <Mic className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm">{t.voiceInput}</span>
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  Press Enter to send
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Action Suggestions */}
        <div 
          className="max-w-3xl mx-auto space-y-4 animate-fade-in"
          style={{
            animationDelay: '0.3s',
            transform: `translateY(${scrollY * -0.2}px)`,
          }}
        >
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t.suggestions}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  className="h-auto p-4 glass hover:bg-accent/20 border-border/40 group transition-all duration-300 hover:scale-105 hover:shadow-lg animate-fade-in"
                  style={{
                    animationDelay: `${0.4 + index * 0.1}s`,
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-left flex-1">
                      {action.label[selectedLanguage] || action.label.English}
                    </span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Navigation Sections */}
        <div 
          className="grid md:grid-cols-2 gap-6 animate-fade-in"
          style={{
            animationDelay: '0.5s',
            transform: `translateY(${scrollY * -0.25}px)`,
          }}
        >
          {/* Dashboard Navigation */}
          <Card className="glass border-border/40 hover:border-primary/30 transition-all duration-300 group cursor-pointer hover:shadow-xl hover:scale-105">
            <CardHeader>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t.viewDashboard}</CardTitle>
                  <CardDescription className="text-xs">Access your activities and analytics</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Recent Activities */}
          <Card className="glass border-border/40">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {t.recentActivities}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/20 transition-all">
                    <Icon className={`w-4 h-4 ${activity.color}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {activity.title[selectedLanguage] || activity.title.English}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Workspace Cards */}
        <div 
          className="space-y-4 animate-fade-in"
          style={{
            animationDelay: '0.6s',
            transform: `translateY(${scrollY * -0.3}px)`,
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t.workspaces}
            </h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {workspaceCards.map((workspace, index) => {
              const Icon = workspace.icon;
              return (
                <Card
                  key={workspace.id}
                  onClick={() => onNavigate(workspace.id)}
                  className="glass border-border/40 hover:border-primary/30 transition-all duration-300 group cursor-pointer hover:shadow-xl hover:scale-105 animate-fade-in"
                  style={{
                    animationDelay: `${0.7 + index * 0.1}s`,
                  }}
                >
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${workspace.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {workspace.title[selectedLanguage] || workspace.title.English}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {workspace.description[selectedLanguage] || workspace.description.English}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" size="sm" className="w-full group-hover:bg-primary/10 gap-2">
                      Launch
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
