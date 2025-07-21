
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ShieldCheck, Settings, BarChart3, Users, ClipboardList, AlertTriangle, CheckCircle, Clock, ArrowRight, Search, Filter, Eye, EyeOff, KeyRound, Languages, ChevronDown } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';

interface LandingPageProps {
  onBack: () => void;
  onNavigate: (section: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onBack, onNavigate }) => {
  // Mock user role - in a real app, this would come from authentication context
  const userRole = 'admin'; // Change to 'user' to test role-based access
  
  // State management
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // Language translations
  const translations = {
    English: {
      dashboard: 'Your Dashboard',
      newTasks: 'new tasks added on',
      showAll: 'Show All Tasks',
      showLess: 'Show Less',
      filter: 'Filter',
      search: 'Search',
      chooseWorkspace: 'Choose your',
      workspace: 'workspace',
      accessTools: 'Access the tools you need for operational readiness, safety compliance, and seamless project handovers',
      launch: 'Launch',
      signOut: 'Sign Out',
      viewDetails: 'View Details',
      poweredBy: 'Powered by Microsoft Fluent Design • Basrah Gas Company © 2024'
    },
    العربية: {
      dashboard: 'لوحة التحكم الخاصة بك',
      newTasks: 'مهام جديدة أضيفت في',
      showAll: 'عرض جميع المهام',
      showLess: 'عرض أقل',
      filter: 'تصفية',
      search: 'بحث',
      chooseWorkspace: 'اختر',
      workspace: 'مساحة العمل',
      accessTools: 'الوصول إلى الأدوات التي تحتاجها للاستعداد التشغيلي والامتثال للسلامة وتسليم المشاريع بسلاسة',
      launch: 'تشغيل',
      signOut: 'تسجيل الخروج',
      viewDetails: 'عرض التفاصيل',
      poweredBy: 'مدعوم من Microsoft Fluent Design • شركة البصرة للغاز © 2024'
    },
    Русский: {
      dashboard: 'Ваша панель',
      newTasks: 'новых задач добавлено',
      showAll: 'Показать все задачи',
      showLess: 'Показать меньше',
      filter: 'Фильтр',
      search: 'Поиск',
      chooseWorkspace: 'Выберите',
      workspace: 'рабочее пространство',
      accessTools: 'Доступ к инструментам, необходимым для операционной готовности, соблюдения безопасности и бесшовной передачи проектов',
      launch: 'Запустить',
      signOut: 'Выйти',
      viewDetails: 'Подробности',
      poweredBy: 'Работает на Microsoft Fluent Design • Basrah Gas Company © 2024'
    },
    Bahasa: {
      dashboard: 'Papan Pemuka Anda',
      newTasks: 'tugas baru ditambah pada',
      showAll: 'Tunjuk Semua Tugas',
      showLess: 'Tunjuk Kurang',
      filter: 'Penapis',
      search: 'Cari',
      chooseWorkspace: 'Pilih',
      workspace: 'ruang kerja',
      accessTools: 'Akses alat yang anda perlukan untuk kesediaan operasi, pematuhan keselamatan dan penyerahan projek yang lancar',
      launch: 'Lancar',
      signOut: 'Log Keluar',
      viewDetails: 'Lihat Butiran',
      poweredBy: 'Dikuasakan oleh Microsoft Fluent Design • Basrah Gas Company © 2024'
    }
  };

  // Language options
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية (Arabic)' },
    { code: 'ru', name: 'Русский (Russian)' },
    { code: 'ms', name: 'Bahasa Melayu' }
  ];

  // Get current translations
  const t = translations[selectedLanguage] || translations.English;

  // Mock pending tasks data - expanded to 8 tasks
  const pendingTasks = [
    {
      id: 1,
      title: "Authenticate 3 New Users",
      description: "BGC and Kent employees awaiting SSO setup",
      age: "2 days",
      criticality: "high",
      type: "authentication",
      icon: Users
    },
    {
      id: 2,
      title: "Approve DP300 PSSR Line Items",
      description: "Safety review items pending approval",
      age: "4 hours",
      criticality: "critical",
      type: "pssr",
      icon: ShieldCheck
    },
    {
      id: 3,
      title: "Sign PAC Certificate for DP083C UQ Jetty 2",
      description: "Project Acceptance Certificate awaiting signature",
      age: "1 day",
      criticality: "medium",
      type: "pac",
      icon: ClipboardList
    },
    {
      id: 4,
      title: "Review Emergency Shutdown Procedures",
      description: "Critical safety protocol review required",
      age: "6 hours",
      criticality: "critical",
      type: "safety",
      icon: AlertTriangle
    },
    {
      id: 5,
      title: "Complete Handover Documentation",
      description: "Project handover checklist completion",
      age: "3 days",
      criticality: "medium",
      type: "handover",
      icon: Settings
    },
    {
      id: 6,
      title: "Approve Training Certifications",
      description: "5 training certificates awaiting approval",
      age: "1 day",
      criticality: "low",
      type: "training",
      icon: CheckCircle
    },
    {
      id: 7,
      title: "Update Asset Register",
      description: "New equipment registration pending",
      age: "5 days",
      criticality: "medium",
      type: "assets",
      icon: BarChart3
    },
    {
      id: 8,
      title: "Schedule Maintenance Windows",
      description: "Q2 maintenance schedule review",
      age: "12 hours",
      criticality: "high",
      type: "maintenance",
      icon: Clock
    }
  ];

  // Filter tasks based on search and filter
  const filteredTasks = pendingTasks.filter(task => {
    const matchesSearch = searchQuery === '' || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || task.criticality === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const allSections = [
    {
      id: 'safe-startup',
      title: 'Safe Start-Up',
      description: 'Manage the safe introduction of hydrocarbons into new facilities using the Pre-Start Up Safety Review (PSSR) process and comprehensive safety checklists',
      icon: ShieldCheck,
      gradient: 'from-destructive/20 via-destructive/10 to-destructive/5',
      iconBg: 'bg-gradient-to-br from-destructive to-destructive/80',
      accentColor: 'destructive',
      allowedRoles: ['user', 'admin']
    },
    {
      id: 'p2o',
      title: 'Project-to-Operations (P2O)',
      description: 'Manage seamless transition and handover from Project team to Asset Operations Team using PAC and FAC workflows for operational readiness',
      icon: KeyRound,
      gradient: 'from-primary/20 via-primary/10 to-primary/5',
      iconBg: 'bg-gradient-to-br from-primary to-primary/80',
      accentColor: 'primary',
      allowedRoles: ['user', 'admin']
    },
    {
      id: 'admin-tools',
      title: 'Admin & Tools',
      description: 'Manage users, roles, permissions, projects, and access control across the ORSH application with comprehensive tracking and reporting',
      icon: BarChart3,
      gradient: 'from-muted-foreground/20 via-muted-foreground/10 to-muted-foreground/5',
      iconBg: 'bg-gradient-to-br from-muted-foreground to-muted-foreground/80',
      accentColor: 'muted-foreground',
      allowedRoles: ['admin']
    }
  ];

  // Filter sections based on user role
  const availableSections = allSections.filter(section => 
    section.allowedRoles.includes(userRole)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Enhanced Navigation Bar */}
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
                  Operation Readiness, Start-Up & Handover
                </h1>
                <p className="text-sm text-muted-foreground font-medium">Basrah Gas Company • ORSH Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 px-3">
                    <Languages className="h-4 w-4 mr-2" />
                    {selectedLanguage}
                    <ChevronDown className="h-3 w-3 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {languages.map((language) => (
                    <DropdownMenuItem
                      key={language.code}
                      onClick={() => setSelectedLanguage(language.name.split(' ')[0])}
                      className="cursor-pointer"
                    >
                      {language.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="outline" 
                onClick={onBack}
                className="fluent-button hover:bg-secondary/80 hover:border-primary/20 shadow-fluent-sm hover:shadow-fluent-md group"
              >
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                {t.signOut}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Pending Tasks Summary */}
        <div className="mb-12 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-3xl font-bold text-foreground">{t.dashboard}</h2>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                2 {t.newTasks} 02/04/2025
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={() => setShowAllTasks(!showAllTasks)}
              >
                <Eye className="h-3 w-3 mr-1" />
                {showAllTasks ? t.showLess : t.showAll}
              </Button>
              
              {/* Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Filter className="h-3 w-3 mr-1" />
                    {t.filter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => setFilterType('all')}
                    className={`cursor-pointer ${filterType === 'all' ? 'bg-primary/10' : ''}`}
                  >
                    All Tasks
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilterType('critical')}
                    className={`cursor-pointer ${filterType === 'critical' ? 'bg-primary/10' : ''}`}
                  >
                    Critical
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilterType('high')}
                    className={`cursor-pointer ${filterType === 'high' ? 'bg-primary/10' : ''}`}
                  >
                    High Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilterType('medium')}
                    className={`cursor-pointer ${filterType === 'medium' ? 'bg-primary/10' : ''}`}
                  >
                    Medium Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilterType('low')}
                    className={`cursor-pointer ${filterType === 'low' ? 'bg-primary/10' : ''}`}
                  >
                    Low Priority
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                <input
                  type="text"
                  placeholder={t.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 bg-white/80 backdrop-blur-sm w-32"
                />
              </div>
            </div>
          </div>

          {/* Ultra Modern Microsoft Fluent Task Cards Grid - Compact Design */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 transition-all duration-500">
            {(showAllTasks ? filteredTasks : filteredTasks.slice(0, 5)).map((task, index) => {
              const IconComponent = task.icon;
              const getCriticalityColor = (criticality: string) => {
                switch (criticality) {
                  case 'critical': return { bg: 'bg-red-50/80', text: 'text-red-800', dot: 'bg-red-500', glow: 'shadow-red-100' };
                  case 'high': return { bg: 'bg-orange-50/80', text: 'text-orange-800', dot: 'bg-orange-500', glow: 'shadow-orange-100' };
                  case 'medium': return { bg: 'bg-blue-50/80', text: 'text-blue-800', dot: 'bg-blue-500', glow: 'shadow-blue-100' };
                  default: return { bg: 'bg-gray-50/80', text: 'text-gray-800', dot: 'bg-gray-400', glow: 'shadow-gray-100' };
                }
              };
              
              const criticalityStyle = getCriticalityColor(task.criticality);
              
              return (
                <div
                  key={task.id}
                  className={`group relative overflow-hidden rounded-xl bg-white/90 backdrop-blur-md border border-gray-200/50 hover:border-primary/30 ${criticalityStyle.glow} hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer animate-fade-in-up`}
                  style={{ 
                    animationDelay: `${index * 0.05}s`,
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View task: ${task.title}`}
                >
                  {/* Fluent Material Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-gray-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Priority indicator */}
                  <div className="absolute top-2 right-2 flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${criticalityStyle.dot} animate-pulse-subtle`} />
                  </div>
                  
                  <div className="relative p-3">
                    {/* Compact header */}
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="relative flex-shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                          <IconComponent className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors duration-200 line-clamp-1">
                          {task.title}
                        </h3>
                      </div>
                    </div>

                    {/* Compact description */}
                    <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-2 group-hover:text-gray-700 transition-colors duration-200">
                      {task.description}
                    </p>

                    {/* Compact footer */}
                    <div className="flex items-center justify-between">
                      {/* Age with icon */}
                      <div className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100/60 backdrop-blur-sm">
                        <Clock className="h-3 w-3 text-gray-500 mr-1" />
                        <span className="text-xs font-medium text-gray-700">{task.age}</span>
                      </div>
                      
                      {/* Priority badge */}
                      <div className={`px-2 py-0.5 rounded-md text-xs font-medium ${criticalityStyle.bg} ${criticalityStyle.text} backdrop-blur-sm`}>
                        {task.criticality}
                      </div>
                    </div>

                    {/* Hover action overlay */}
                    <div className="absolute inset-0 bg-primary/5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl flex items-center justify-center">
                      <button className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-primary text-xs font-semibold shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <span>{t.viewDetails}</span>
                        <ArrowRight className="h-3 w-3 ml-1 transition-transform duration-200" />
                      </button>
                    </div>
                  </div>

                  {/* Modern focus ring */}
                  <div className="absolute inset-0 rounded-xl ring-2 ring-primary/0 group-focus:ring-primary/30 transition-all duration-200" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Workspace Selection */}
        <div className="mb-16 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-light text-foreground mb-4 tracking-tight">
              {t.chooseWorkspace}
              <span className="fluent-hero-text font-semibold"> {t.workspace}</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t.accessTools}
            </p>
          </div>

          {/* Enhanced Module Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {availableSections.map((section, index) => {
              const IconComponent = section.icon;
              return (
                <div
                  key={section.id}
                  className="group cursor-pointer relative overflow-hidden border border-border/20 bg-card/90 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-reveal flex flex-col h-[320px]"
                  onClick={() => onNavigate(section.id)}
                  style={{ 
                    animationDelay: `${0.4 + index * 0.1}s`,
                  }}
                >
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  {/* Content container */}
                  <div className="relative z-10 p-6 flex flex-col flex-1">
                    {/* Icon with modern styling */}
                    <div className="flex justify-center mb-6">
                      <div className={`w-16 h-16 rounded-2xl ${section.iconBg} flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-lg group-hover:shadow-xl`}>
                        <IconComponent className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="text-center space-y-4 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold text-card-foreground group-hover:text-primary transition-colors duration-300">
                        {section.title}
                      </h3>
                      
                      <p className="text-muted-foreground leading-relaxed text-sm flex-1">
                        {section.description}
                      </p>
                      
                      {/* Modern CTA Button - Always at bottom */}
                      <div className="mt-auto pt-4">
                        <Button 
                          className="w-full bg-card-foreground hover:bg-primary text-card border-0 font-semibold py-2.5 rounded-xl group-hover:scale-105 shadow-md hover:shadow-lg transition-all duration-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate(section.id);
                          }}
                        >
                          {t.launch} {section.title}
                          <ArrowLeft className="h-4 w-4 ml-2 rotate-180 group-hover:translate-x-1 transition-transform duration-200" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Decorative accent */}
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-${section.accentColor} to-${section.accentColor}/60`} />
                  
                  {/* Hover glow effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm -z-10" />
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Enhanced Footer */}
        <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-card/50 backdrop-blur-sm border border-border/50 shadow-fluent-sm">
            <div className="w-2 h-2 rounded-full bg-success mr-3 animate-pulse-subtle" />
            <p className="text-sm text-muted-foreground font-medium">
              {t.poweredBy}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
