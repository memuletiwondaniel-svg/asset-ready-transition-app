import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Languages, ArrowRight, Shield, FileCheck, Headphones, ClipboardCheck, Key } from "lucide-react";
import { useAuth } from "@/components/enhanced-auth/AuthProvider";
import EnhancedAuthModal from "@/components/enhanced-auth/EnhancedAuthModal";
import PSSRSummaryPage from "@/components/PSSRSummaryPage";
import LandingPage from "@/components/LandingPage";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import UserManagement from "@/pages/UserManagement";
import AdminToolsPage from "@/components/AdminToolsPage";
import ProjectManagementPage from "@/components/project/ProjectManagementPage";
import OrshLogo from "@/components/ui/OrshLogo";

const Index = () => {
  const [showAuth, setShowAuth] = useState(false);
  const { session, signOut } = useAuth();
  const isAuthenticated = !!session;
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  
  // Get current section from URL path
  const currentSection = location.pathname === '/' ? null : location.pathname.slice(1);
  
  const handleAuthenticated = () => {
    setShowAuth(false);
  };
  
  const handleBack = () => {
    try { signOut(); } catch {}
    navigate('/');
  };
  
  const handleNavigate = (section: string) => {
    console.log('Index handleNavigate called with section:', section);
    if (section === 'home') {
      navigate('/');
    } else if (section === 'operation-readiness') {
      navigate('/operation-readiness');
    } else if (section === 'p2a-handover') {
      navigate('/p2a-handover');
    } else {
      navigate(`/${section}`);
    }
  };
  
  const handleBackToLanding = () => {
    navigate('/');
  };

  const languages = [
    { code: "en", name: "English" },
    { code: "ar", name: "العربية" },
    { code: "fr", name: "Français" },
    { code: "ms", name: "Bahasa Melayu" },
    { code: "kk", name: "Қазақша" }
  ];

  const translations = {
    en: {
      title: "Operation Readiness",
      subtitle: "Start-Up & Handover",
      description: "Transform your project start-up and handover experience with the ORSH platform.",
      safeStartup: "PSSR",
      safeStartupDesc: "Pre-Start Up Safety Review - Manage the safe introduction of hydrocarbons into new facilities using PSSR checklists",
      p2oHandover: "P2O Handover",
      p2oHandoverDesc: "Seamless transition and handover from construction and commissioning to Asset Operation",
      accessButton: "Access ORSH Platform",
      enterpriseSecure: "Enterprise Secure",
      isoCompliant: "ISO Compliant",
      support24: "24/7 Support"
    },
    ar: {
      title: "جاهزية العمليات",
      subtitle: "البدء والتسليم",
      description: "حول تجربة بدء تشغيل وتسليم مشروعك مع منصة ORSH.",
      safeStartup: "PSSR",
      safeStartupDesc: "مراجعة السلامة قبل البدء - إدارة الإدخال الآمن للهيدروكربونات في المنشآت الجديدة باستخدام قوائم PSSR",
      p2oHandover: "تسليم P2O",
      p2oHandoverDesc: "انتقال وتسليم سلس من البناء والتشغيل إلى تشغيل الأصول",
      accessButton: "الوصول إلى منصة ORSH",
      enterpriseSecure: "أمان المؤسسة",
      isoCompliant: "متوافق مع ISO",
      support24: "دعم 24/7"
    },
    fr: {
      title: "Préparation Opérationnelle",
      subtitle: "Démarrage et Remise",
      description: "Transformez votre expérience de démarrage et de remise de projet avec la plateforme ORSH.",
      safeStartup: "PSSR",
      safeStartupDesc: "Revue de Sécurité Pré-Démarrage - Gérer l'introduction sécurisée des hydrocarbures dans de nouvelles installations avec des listes PSSR",
      p2oHandover: "Remise P2O",
      p2oHandoverDesc: "Transition et remise transparentes de la construction et de la mise en service à l'exploitation des actifs",
      accessButton: "Accéder à la Plateforme ORSH",
      enterpriseSecure: "Sécurité Entreprise",
      isoCompliant: "Conforme ISO",
      support24: "Support 24/7"
    },
    ms: {
      title: "Kesediaan Operasi",
      subtitle: "Permulaan & Penyerahan",
      description: "Transformasikan pengalaman permulaan dan penyerahan projek anda dengan platform ORSH.",
      safeStartup: "PSSR",
      safeStartupDesc: "Kajian Keselamatan Pra-Permulaan - Menguruskan pengenalan hidrokarbon yang selamat ke dalam kemudahan baru menggunakan senarai semak PSSR",
      p2oHandover: "Penyerahan P2O",
      p2oHandoverDesc: "Peralihan dan penyerahan yang lancar dari pembinaan dan komisioning kepada Operasi Aset",
      accessButton: "Akses Platform ORSH",
      enterpriseSecure: "Keselamatan Perusahaan",
      isoCompliant: "Patuh ISO",
      support24: "Sokongan 24/7"
    },
    ru: {
      title: "Операционная Готовность",
      subtitle: "Запуск и Передача",
      description: "Преобразуйте опыт запуска и передачи проекта с помощью платформы ORSH.",
      safeStartup: "PSSR",
      safeStartupDesc: "Предпусковой обзор безопасности - Управление безопасным введением углеводородов в новые объекты с использованием контрольных списков PSSR",
      p2oHandover: "Передача P2O",
      p2oHandoverDesc: "Бесшовный переход и передача от строительства и ввода в эксплуатацию к эксплуатации активов",
      accessButton: "Доступ к Платформе ORSH",
      enterpriseSecure: "Корпоративная Безопасность",
      isoCompliant: "Соответствие ISO",
      support24: "Поддержка 24/7"
    }
  };

  const getCurrentTranslation = () => {
    const langCode = languages.find(lang => lang.name === selectedLanguage)?.code || 'en';
    return translations[langCode as keyof typeof translations];
  };
  const t = getCurrentTranslation();

  useEffect(() => {
    if (session && showAuth) {
      setShowAuth(false);
    }
  }, [session, showAuth]);

  // Show specific section based on navigation
  if (isAuthenticated && currentSection) {
    switch (currentSection) {
      case 'pssr':
        return <PSSRSummaryPage onBack={handleBackToLanding} />;
      case 'users':
      case 'user-management':
        return <UserManagement onBack={handleBackToLanding} />;
      case 'admin-tools':
        return <AdminToolsPage onBack={handleBackToLanding} />;
      case 'projects':
        return <ProjectManagementPage onBack={handleBackToLanding} />;
      case 'p2o':
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">Project-to-Operations (P2O)</h1>
              <p className="text-gray-600 mb-6">PAC and FAC workflows - Coming Soon...</p>
              <Button onClick={handleBackToLanding}>Back to Dashboard</Button>
            </div>
          </div>
        );
      default:
        return <LandingPage onBack={handleBack} onNavigate={handleNavigate} />;
    }
  }

  // Show landing page after authentication
  if (isAuthenticated) {
    return <LandingPage onBack={handleBack} onNavigate={handleNavigate} />;
  }

  // Show welcome screen before authentication
  return (
    <div className="min-h-screen relative overflow-hidden">
      <BackgroundSlideshow showFunFacts={false} />
      
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Language Selector - Left */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/10 rounded-xl px-4 py-2 border border-white/20 backdrop-blur-md font-medium shadow-lg"
                >
                  <Languages className="h-4 w-4 mr-2" />
                  <span className="text-sm">{selectedLanguage}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card/95 border border-border/30 shadow-2xl rounded-xl p-1 backdrop-blur-xl min-w-[180px] z-50">
                {languages.map(language => (
                  <DropdownMenuItem 
                    key={language.code} 
                    onClick={() => setSelectedLanguage(language.name)} 
                    className="cursor-pointer hover:bg-accent/20 rounded-lg py-2 px-3 text-sm font-medium"
                  >
                    {language.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* ORSH Logo - Center */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <OrshLogo size="medium" />
            </div>
            
            {/* BGC Logo - Right */}
            <div className="flex items-center">
              <img 
                src="/lovable-uploads/421778ce-4ffe-4e3b-b370-8d1bb24a3d51.png" 
                alt="BGC Logo" 
                className="h-12 w-auto drop-shadow-lg"
              />
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      {!showAuth && (
        <main className="relative z-10 flex items-center justify-center min-h-screen pt-24 pb-12 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            
            {/* Hero Text */}
            <div className="space-y-4 animate-fade-in">
              <h1 className="font-light text-white leading-tight">
                <span className="block text-5xl md:text-6xl lg:text-7xl font-extralight tracking-tight drop-shadow-2xl">
                  {t.title}
                </span>
                <span className="block text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-cyan-100 to-blue-100 bg-clip-text text-transparent mt-2 drop-shadow-xl">
                  {t.subtitle}
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-white/85 font-light leading-relaxed max-w-2xl mx-auto">
                {t.description}
              </p>
            </div>
            
            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* PSSR Card */}
              <div className="group relative p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 hover:border-white/30 hover:scale-[1.02] transition-all duration-300 shadow-xl">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <ClipboardCheck className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{t.safeStartup}</h3>
                  <p className="text-white/75 text-sm leading-relaxed">{t.safeStartupDesc}</p>
                </div>
              </div>
              
              {/* P2O Card */}
              <div className="group relative p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 hover:border-white/30 hover:scale-[1.02] transition-all duration-300 shadow-xl">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Key className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{t.p2oHandover}</h3>
                  <p className="text-white/75 text-sm leading-relaxed">{t.p2oHandoverDesc}</p>
                </div>
              </div>
            </div>
            
            {/* CTA Button */}
            <div className="space-y-6">
              <Button 
                onClick={() => setShowAuth(true)} 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-10 py-6 text-lg font-semibold shadow-2xl hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300 rounded-xl"
              >
                {t.accessButton}
                <ArrowRight className="h-5 w-5 ml-3" />
              </Button>
              
              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-white/75">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium">{t.enterpriseSecure}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">{t.isoCompliant}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium">{t.support24}</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      <EnhancedAuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onAuthenticated={handleAuthenticated} />
    </div>
  );
};

export default Index;
