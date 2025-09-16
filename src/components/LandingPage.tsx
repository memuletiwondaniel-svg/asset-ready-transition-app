import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ShieldCheck, Settings, BarChart3, Users, ClipboardList, AlertTriangle, CheckCircle, Clock, ArrowRight, Search, Filter, Eye, EyeOff, KeyRound, Languages, ChevronDown, User, LogOut, GripVertical, Pin, PinOff, ArrowLeft, Grid3X3, List } from 'lucide-react';
import DraggableTaskCard from './DraggableTaskCard';
import DraggableTaskList from './DraggableTaskList';
interface LandingPageProps {
  onBack: () => void;
  onNavigate: (section: string) => void;
}
const LandingPage: React.FC<LandingPageProps> = ({
  onBack,
  onNavigate
}) => {
  // Mock user role - in a real app, this would come from authentication context
  const userRole = 'admin'; // Change to 'user' to test role-based access

  // State management
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [taskOrder, setTaskOrder] = useState<number[]>([]);
  const [pinnedTasks, setPinnedTasks] = useState<number[]>([]);
  const [taskViewMode, setTaskViewMode] = useState<'cards' | 'list'>('cards');

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
  const languages = [{
    code: 'en',
    name: 'English'
  }, {
    code: 'ar',
    name: 'العربية (Arabic)'
  }, {
    code: 'ru',
    name: 'Русский (Russian)'
  }, {
    code: 'ms',
    name: 'Bahasa Melayu'
  }];

  // Get current translations
  const t = translations[selectedLanguage] || translations.English;

  // Mock pending tasks data with translations
  const getTasksData = () => [{
    id: 1,
    title: {
      English: "Authenticate 3 New Users",
      العربية: "مصادقة 3 مستخدمين جدد",
      Русский: "Аутентификация 3 новых пользователей",
      Bahasa: "Sahkan 3 Pengguna Baru"
    },
    description: {
      English: "BGC and Kent employees awaiting SSO setup",
      العربية: "موظفو BGC و Kent في انتظار إعداد تسجيل الدخول الموحد",
      Русский: "Сотрудники BGC и Kent ожидают настройки SSO",
      Bahasa: "Pekerja BGC dan Kent menunggu persediaan SSO"
    },
    age: "2 days",
    criticality: "high",
    type: "authentication",
    icon: Users
  }, {
    id: 2,
    title: {
      English: "Approve DP300 PSSR Line Items",
      العربية: "الموافقة على عناصر DP300 PSSR",
      Русский: "Утвердить элементы DP300 PSSR",
      Bahasa: "Luluskan Item Barisan DP300 PSSR"
    },
    description: {
      English: "Safety review items pending approval",
      العربية: "عناصر مراجعة السلامة في انتظار الموافقة",
      Русский: "Элементы обзора безопасности ожидают утверждения",
      Bahasa: "Item kajian keselamatan menunggu kelulusan"
    },
    age: "4 hours",
    criticality: "critical",
    type: "pssr",
    icon: ShieldCheck
  }, {
    id: 3,
    title: {
      English: "Sign PAC Certificate for DP083C UQ Jetty 2",
      العربية: "توقيع شهادة PAC لـ DP083C UQ Jetty 2",
      Русский: "Подписать сертификат PAC для DP083C UQ Jetty 2",
      Bahasa: "Tandatangan Sijil PAC untuk DP083C UQ Jetty 2"
    },
    description: {
      English: "Project Acceptance Certificate awaiting signature",
      العربية: "شهادة قبول المشروع في انتظار التوقيع",
      Русский: "Сертификат принятия проекта ожидает подписи",
      Bahasa: "Sijil Penerimaan Projek menunggu tandatangan"
    },
    age: "1 day",
    criticality: "medium",
    type: "pac",
    icon: ClipboardList
  }, {
    id: 4,
    title: {
      English: "Review Emergency Shutdown Procedures",
      العربية: "مراجعة إجراءات الإغلاق الطارئ",
      Русский: "Проверить процедуры аварийного останова",
      Bahasa: "Kaji Prosedur Penutupan Kecemasan"
    },
    description: {
      English: "Critical safety protocol review required",
      العربية: "مطلوب مراجعة بروتوكول السلامة الحرج",
      Русский: "Требуется проверка критического протокола безопасности",
      Bahasa: "Kajian protokol keselamatan kritikal diperlukan"
    },
    age: "6 hours",
    criticality: "critical",
    type: "safety",
    icon: AlertTriangle
  }, {
    id: 5,
    title: {
      English: "Complete Handover Documentation",
      العربية: "إكمال وثائق التسليم",
      Русский: "Завершить документацию передачи",
      Bahasa: "Lengkapkan Dokumentasi Penyerahan"
    },
    description: {
      English: "Project handover checklist completion",
      العربية: "إكمال قائمة مراجعة تسليم المشروع",
      Русский: "Завершение контрольного списка передачи проекта",
      Bahasa: "Penyelesaian senarai semak penyerahan projek"
    },
    age: "3 days",
    criticality: "medium",
    type: "handover",
    icon: Settings
  }, {
    id: 6,
    title: {
      English: "Approve Training Certifications",
      العربية: "الموافقة على شهادات التدريب",
      Русский: "Утвердить сертификаты обучения",
      Bahasa: "Luluskan Sijil Latihan"
    },
    description: {
      English: "5 training certificates awaiting approval",
      العربية: "5 شهادات تدريب في انتظار الموافقة",
      Русский: "5 сертификатов обучения ожидают утверждения",
      Bahasa: "5 sijil latihan menunggu kelulusan"
    },
    age: "1 day",
    criticality: "low",
    type: "training",
    icon: CheckCircle
  }, {
    id: 7,
    title: {
      English: "Update Asset Register",
      العربية: "تحديث سجل الأصول",
      Русский: "Обновить реестр активов",
      Bahasa: "Kemaskini Daftar Aset"
    },
    description: {
      English: "New equipment registration pending",
      العربية: "تسجيل معدات جديدة معلق",
      Русский: "Регистрация нового оборудования ожидается",
      Bahasa: "Pendaftaran peralatan baru tertangguh"
    },
    age: "5 days",
    criticality: "medium",
    type: "assets",
    icon: BarChart3
  }, {
    id: 8,
    title: {
      English: "Schedule Maintenance Windows",
      العربية: "جدولة نوافذ الصيانة",
      Русский: "Запланировать окна обслуживания",
      Bahasa: "Jadualkan Tetingkap Penyelenggaraan"
    },
    description: {
      English: "Q2 maintenance schedule review",
      العربية: "مراجعة جدول صيانة الربع الثاني",
      Русский: "Проверка графика обслуживания Q2",
      Bahasa: "Kajian jadual penyelenggaraan Q2"
    },
    age: "12 hours",
    criticality: "high",
    type: "maintenance",
    icon: Clock
  }];
  const pendingTasks = getTasksData();

  // Initialize task order on first render
  const initializeTaskOrder = () => {
    if (taskOrder.length === 0) {
      setTaskOrder(pendingTasks.map(task => task.id));
    }
  };
  React.useEffect(() => {
    initializeTaskOrder();
  }, []);

  // Drag and drop sensors
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) {
      return;
    }
    setTaskOrder(items => {
      const oldIndex = items.indexOf(Number(active.id));
      const newIndex = items.indexOf(Number(over.id));
      return arrayMove(items, oldIndex, newIndex);
    });
  };
  const handleToggleTaskPin = (taskId: number) => {
    setPinnedTasks(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]);
  };

  // Filter tasks based on search and filter with sorting
  const filteredTasks = pendingTasks.filter(task => {
    const currentTitle = task.title[selectedLanguage] || task.title.English;
    const currentDescription = task.description[selectedLanguage] || task.description.English;
    const matchesSearch = searchQuery === '' || currentTitle.toLowerCase().includes(searchQuery.toLowerCase()) || currentDescription.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesFilter = true;
    if (filterType === 'all') {
      matchesFilter = true;
    } else if (['critical', 'high', 'medium', 'low'].includes(filterType)) {
      matchesFilter = task.criticality === filterType;
    } else if (filterType === 'pssr') {
      matchesFilter = task.type === 'pssr';
    } else if (filterType === 'pac') {
      matchesFilter = task.type === 'pac';
    } else if (filterType === 'recent') {
      matchesFilter = ['4 hours', '6 hours', '12 hours', '1 day', '2 days'].includes(task.age);
    } else if (filterType === 'older') {
      matchesFilter = ['3 days', '5 days'].includes(task.age);
    } else if (filterType === 'project') {
      matchesFilter = true; // All tasks belong to some project
    }
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    // Sort with pinned items first, then by custom order
    const aPinned = pinnedTasks.includes(a.id);
    const bPinned = pinnedTasks.includes(b.id);

    // Pinned items come first
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    // If both pinned or both unpinned, use custom order
    if (taskOrder.length > 0) {
      const aIndex = taskOrder.indexOf(a.id);
      const bIndex = taskOrder.indexOf(b.id);
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
    }
    return 0;
  });

  // Define section data with translations
  const getSectionData = () => [{
    id: 'safe-startup',
    title: {
      English: 'Safe Start-Up',
      العربية: 'البدء الآمن',
      Русский: 'Безопасный запуск',
      Bahasa: 'Permulaan Selamat'
    },
    description: {
      English: 'Manage the safe introduction of hydrocarbons into a new facility using the Pre-Start Up Safety Review (PSSR) process and checklists',
      العربية: 'إدارة الإدخال الآمن للهيدروكربونات إلى مرفق جديد باستخدام عملية مراجعة السلامة قبل البدء (PSSR) وقوائم المراجعة',
      Русский: 'Управление безопасным вводом углеводородов в новый объект с использованием процесса предпускового обзора безопасности (PSSR) и контрольных списков',
      Bahasa: 'Urus pengenalan hidrokarbon yang selamat ke dalam kemudahan baru menggunakan proses Kajian Keselamatan Pra-Permulaan (PSSR) dan senarai semak'
    },
    icon: ClipboardList,
    gradient: 'from-destructive/20 via-destructive/10 to-destructive/5',
    iconBg: 'bg-gradient-to-br from-destructive to-destructive/80',
    accentColor: 'destructive',
    allowedRoles: ['user', 'admin']
  }, {
    id: 'p2o',
    title: {
      English: 'Project-to-Operations (P2O)',
      العربية: 'المشروع إلى العمليات (P2O)',
      Русский: 'Проект в Эксплуатацию (P2O)',
      Bahasa: 'Projek-ke-Operasi (P2O)'
    },
    description: {
      English: 'Manage seamless transition and handover from Project team to Asset Operations Team using PAC and FAC workflows for operational readiness',
      العربية: 'إدارة الانتقال السلس والتسليم من فريق المشروع إلى فريق عمليات الأصول باستخدام سير عمل PAC و FAC للاستعداد التشغيلي',
      Русский: 'Управление плавным переходом и передачей от проектной команды к команде эксплуатации активов с использованием рабочих процессов PAC и FAC для операционной готовности',
      Bahasa: 'Urus peralihan dan penyerahan yang lancar dari pasukan Projek kepada Pasukan Operasi Aset menggunakan aliran kerja PAC dan FAC untuk kesediaan operasi'
    },
    icon: KeyRound,
    gradient: 'from-primary/20 via-primary/10 to-primary/5',
    iconBg: 'bg-gradient-to-br from-primary to-primary/80',
    accentColor: 'primary',
    allowedRoles: ['user', 'admin']
  }, {
    id: 'admin-tools',
    title: {
      English: 'Admin & Tools',
      العربية: 'الإدارة والأدوات',
      Русский: 'Админ и Инструменты',
      Bahasa: 'Admin & Alatan'
    },
    description: {
      English: 'Manage users, roles, permissions, projects, and access control across the ORSH application with comprehensive tracking and reporting',
      العربية: 'إدارة المستخدمين والأدوار والأذونات والمشاريع والتحكم في الوصول عبر تطبيق ORSH مع التتبع والتقارير الشاملة',
      Русский: 'Управление пользователями, ролями, разрешениями, проектами и контролем доступа в приложении ORSH с комплексным отслеживанием и отчетностью',
      Bahasa: 'Urus pengguna, peranan, kebenaran, projek, dan kawalan akses merentas aplikasi ORSH dengan penjejakan dan pelaporan yang komprehensif'
    },
    icon: BarChart3,
    gradient: 'from-muted-foreground/20 via-muted-foreground/10 to-muted-foreground/5',
    iconBg: 'bg-gradient-to-br from-muted-foreground to-muted-foreground/80',
    accentColor: 'muted-foreground',
    allowedRoles: ['admin']
  }];
  const allSections = getSectionData();

  // Filter sections based on user role
  const availableSections = allSections.filter(section => section.allowedRoles.includes(userRole));
  return <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Enhanced Navigation Bar */}
      <div className="fluent-navigation sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="fluent-reveal">
                <img src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" alt="BGC Logo" className="h-12 w-auto animate-float" />
              </div>
              <div className="animate-fade-in-up" style={{
              animationDelay: '0.2s'
            }}>
                
                
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
                  {languages.map(language => <DropdownMenuItem key={language.code} onClick={() => setSelectedLanguage(language.name.split(' ')[0])} className="cursor-pointer">
                      {language.name}
                    </DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* User Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0 relative overflow-hidden group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-sm border-border/50 shadow-lg">
                  <DropdownMenuItem className="cursor-pointer hover:bg-primary/10 group">
                    <User className="h-4 w-4 mr-3 text-muted-foreground group-hover:text-primary" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-primary/10 group">
                    <Settings className="h-4 w-4 mr-3 text-muted-foreground group-hover:text-primary" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-primary/10 group">
                    <ShieldCheck className="h-4 w-4 mr-3 text-muted-foreground group-hover:text-primary" />
                    Security
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-primary/10 group">
                    <AlertTriangle className="h-4 w-4 mr-3 text-muted-foreground group-hover:text-primary" />
                    Support
                  </DropdownMenuItem>
                  <div className="h-px bg-border/50 my-1" />
                  <DropdownMenuItem className="cursor-pointer hover:bg-red-50 text-red-600 hover:text-red-700 group font-medium" onClick={onBack}>
                    <LogOut className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform duration-200" />
                    <span className="group-hover:translate-x-0.5 transition-transform duration-200">{t.signOut}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                {filteredTasks.length} {t.newTasks} {new Date().toLocaleDateString()}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              {/* View Toggle */}
              <div className="flex rounded-lg border border-border/50 bg-muted/20 p-1">
                <button onClick={() => setTaskViewMode('cards')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${taskViewMode === 'cards' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                  <Grid3X3 className="h-3 w-3" />
                  Cards
                </button>
                <button onClick={() => setTaskViewMode('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${taskViewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                  <List className="h-3 w-3" />
                  List
                </button>
              </div>

              <Button variant="outline" size="sm" className="h-8" onClick={() => setShowAllTasks(!showAllTasks)}>
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
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setFilterType('all')} className={`cursor-pointer ${filterType === 'all' ? 'bg-primary/10' : ''}`}>
                    All Tasks
                  </DropdownMenuItem>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Project</div>
                  <DropdownMenuItem onClick={() => setFilterType('project')} className={`cursor-pointer ${filterType === 'project' ? 'bg-primary/10' : ''} pl-4`}>
                    By Project
                  </DropdownMenuItem>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Task Type</div>
                  <DropdownMenuItem onClick={() => setFilterType('pssr')} className={`cursor-pointer ${filterType === 'pssr' ? 'bg-primary/10' : ''} pl-4`}>
                    PSSR
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('pac')} className={`cursor-pointer ${filterType === 'pac' ? 'bg-primary/10' : ''} pl-4`}>
                    PAC
                  </DropdownMenuItem>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Days in Queue</div>
                  <DropdownMenuItem onClick={() => setFilterType('recent')} className={`cursor-pointer ${filterType === 'recent' ? 'bg-primary/10' : ''} pl-4`}>
                    Recent (0-2 days)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('older')} className={`cursor-pointer ${filterType === 'older' ? 'bg-primary/10' : ''} pl-4`}>
                    Older (3+ days)
                  </DropdownMenuItem>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Criticality</div>
                  <DropdownMenuItem onClick={() => setFilterType('critical')} className={`cursor-pointer ${filterType === 'critical' ? 'bg-primary/10' : ''} pl-4`}>
                    Critical
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('high')} className={`cursor-pointer ${filterType === 'high' ? 'bg-primary/10' : ''} pl-4`}>
                    High Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('medium')} className={`cursor-pointer ${filterType === 'medium' ? 'bg-primary/10' : ''} pl-4`}>
                    Medium Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('low')} className={`cursor-pointer ${filterType === 'low' ? 'bg-primary/10' : ''} pl-4`}>
                    Low Priority
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                <input type="text" placeholder={t.search} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 bg-white/80 backdrop-blur-sm w-32" />
              </div>
            </div>
          </div>

          {/* Task Display - Cards or List */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
              {taskViewMode === 'cards' ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 transition-all duration-500">
                  {(showAllTasks ? filteredTasks : filteredTasks.slice(0, 5)).map((task, index) => <DraggableTaskCard key={task.id} task={task} index={index} selectedLanguage={selectedLanguage} isPinned={pinnedTasks.includes(task.id)} onTogglePin={handleToggleTaskPin} viewDetailsText={t.viewDetails} />)}
                </div> : <div className="space-y-2 max-w-4xl">
                  {(showAllTasks ? filteredTasks : filteredTasks.slice(0, 5)).map((task, index) => <DraggableTaskList key={task.id} task={task} index={index} selectedLanguage={selectedLanguage} isPinned={pinnedTasks.includes(task.id)} onTogglePin={handleToggleTaskPin} />)}
                </div>}
            </SortableContext>

            <DragOverlay>
              {activeDragId ? <div className="bg-white/95 backdrop-blur-md border-2 border-primary/50 rounded-xl p-3 shadow-2xl">
                  <div className="text-center">
                    <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="font-semibold text-foreground text-sm">Moving Task...</p>
                    <p className="text-xs text-muted-foreground">
                      {filteredTasks.find(t => t.id === Number(activeDragId))?.title[selectedLanguage] || filteredTasks.find(t => t.id === Number(activeDragId))?.title.English}
                    </p>
                  </div>
                </div> : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Workspace Selection */}
        <div className="mb-16 animate-fade-in-up" style={{
        animationDelay: '0.3s'
      }}>
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
            return <div key={section.id} className="group cursor-pointer relative overflow-hidden border border-border/20 bg-card/90 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-reveal flex flex-col h-[320px]" onClick={() => onNavigate(section.id)} style={{
              animationDelay: `${0.4 + index * 0.1}s`
            }}>
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
                        {section.title[selectedLanguage] || section.title.English}
                      </h3>
                      
                      <p className="text-muted-foreground leading-relaxed text-sm flex-1">
                        {section.description[selectedLanguage] || section.description.English}
                      </p>
                      
                      {/* Modern CTA Button - Always at bottom */}
                      <div className="mt-auto pt-4">
                        <Button className="w-full bg-card-foreground hover:bg-primary text-card border-0 font-semibold py-2.5 rounded-xl group-hover:scale-105 shadow-md hover:shadow-lg transition-all duration-300" onClick={e => {
                      e.stopPropagation();
                      onNavigate(section.id);
                    }}>
                          {t.launch}
                          <ArrowLeft className="h-4 w-4 ml-2 rotate-180 group-hover:translate-x-1 transition-transform duration-200" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Decorative accent */}
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-${section.accentColor} to-${section.accentColor}/60`} />
                  
                  {/* Hover glow effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm -z-10" />
                </div>;
          })}
          </div>
        </div>
        
        {/* Enhanced Footer */}
        <div className="text-center animate-fade-in-up" style={{
        animationDelay: '0.8s'
      }}>
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-card/50 backdrop-blur-sm border border-border/50 shadow-fluent-sm">
            <div className="w-2 h-2 rounded-full bg-success mr-3 animate-pulse-subtle" />
            <p className="text-sm text-muted-foreground font-medium">
              {t.poweredBy}
            </p>
          </div>
        </div>
      </div>
    </div>;
};
export default LandingPage;