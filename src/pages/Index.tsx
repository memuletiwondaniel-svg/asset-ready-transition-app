

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages, Phone } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import AuthenticationModal from "@/components/AuthenticationModal";
import PSSRModule from "@/components/PSSRModule";
import LandingPage from "@/components/LandingPage";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import UserManagement from "@/pages/UserManagement";
import AdminToolsPage from "@/components/AdminToolsPage";

const Index = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("English");

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
    setShowAuth(false);
  };

  const handleBack = () => {
    setIsAuthenticated(false);
    setCurrentSection(null);
  };

  const handleNavigate = (section: string) => {
    setCurrentSection(section);
  };

  const handleBackToLanding = () => {
    setCurrentSection(null);
  };

  const languages = [
    { code: "en", name: "English" },
    { code: "ar", name: "العربية" },
    { code: "fr", name: "Français" },
    { code: "ms", name: "Bahasa Melayu" },
    { code: "ru", name: "Русский" }
  ];

  const translations = {
    en: {
      title: "Operation Readiness",
      subtitle: "Start-Up & Handover",
      description: "Transform your project handover experience with our comprehensive platform.",
      safeStartup: "Safe Start-Up",
      safeStartupDesc: "Manage the safe introduction of hydrocarbons into a new facility using the Pre-Start Up Safety Review (PSSR) process and checklists",
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
      description: "حول تجربة تسليم مشروعك مع منصتنا الشاملة.",
      safeStartup: "البدء الآمن",
      safeStartupDesc: "إدارة الإدخال الآمن للهيدروكربونات في منشأة جديدة باستخدام عملية مراجعة السلامة قبل البدء وقوائم التحقق",
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
      description: "Transformez votre expérience de remise de projet avec notre plateforme complète.",
      safeStartup: "Démarrage Sécurisé",
      safeStartupDesc: "Gérer l'introduction sécurisée des hydrocarbures dans une nouvelle installation en utilisant le processus de révision de sécurité avant démarrage (PSSR) et les listes de contrôle",
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
      description: "Transformasikan pengalaman penyerahan projek anda dengan platform komprehensif kami.",
      safeStartup: "Permulaan Selamat",
      safeStartupDesc: "Menguruskan pengenalan hidrokarbon yang selamat ke dalam kemudahan baru menggunakan proses Kajian Keselamatan Pra-Permulaan (PSSR) dan senarai semak",
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
      description: "Преобразуйте опыт передачи проекта с помощью нашей комплексной платформы.",
      safeStartup: "Безопасный Запуск",
      safeStartupDesc: "Управление безопасным введением углеводородов в новое предприятие с использованием процесса предпускового обзора безопасности (PSSR) и контрольных списков",
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

  // Show specific section based on navigation
  if (isAuthenticated && currentSection) {
    switch (currentSection) {
      case 'safe-startup':
        return <PSSRModule onBack={handleBackToLanding} />;
      case 'users':
        return <UserManagement onBack={handleBackToLanding} />;
      case 'admin-tools':
        return <AdminToolsPage onBack={handleBackToLanding} onNavigate={handleNavigate} />;
      case 'p2o':
        // Placeholder for P2O Module - can be implemented later
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Background with enhanced gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-indigo-500/3 to-purple-600/5" />
      <BackgroundSlideshow showFunFacts={showAuth} />
      
      {/* Fluent Design Acrylic Header */}
      <header className="relative z-20 backdrop-blur-xl bg-white/10 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* ORSH Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">ORSH</span>
              </div>
              <div className="text-white">
                <div className="font-semibold text-lg tracking-tight">Operation Readiness</div>
                <div className="text-sm text-white/70 -mt-1">Start-up & Handover</div>
              </div>
            </div>
            
            {/* Language Selector - Modern Microsoft Style */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white hover:bg-white/10 transition-all duration-200 rounded-lg px-4 py-2 border border-white/10 backdrop-blur-sm font-medium shadow-sm hover:shadow-lg hover:border-white/20 group"
                >
                  <Languages className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-sm font-medium">{selectedLanguage}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white/95 backdrop-blur-xl border border-gray-200/50 shadow-2xl rounded-xl p-2 min-w-[180px] z-50">
                {languages.map((language) => (
                  <DropdownMenuItem
                    key={language.code}
                    onClick={() => setSelectedLanguage(language.name)}
                    className="cursor-pointer hover:bg-blue-50/80 transition-all duration-200 rounded-lg py-3 px-4 text-sm font-medium text-gray-700 hover:text-blue-700"
                  >
                    {language.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      {!showAuth && (
        <main className="relative z-10 flex items-center min-h-[calc(100vh-120px)] pt-12">
          <div className="max-w-7xl mx-auto px-6 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column - Hero Content */}
              <div className="lg:col-span-7 space-y-10 animate-fade-in">
                
                {/* Hero Section with Microsoft Typography */}
                <div className="space-y-8">
                  <div className="space-y-6">
                    <h1 className="font-light text-white leading-[1.1] tracking-tight">
                      <span className="text-4xl lg:text-6xl xl:text-7xl font-light">{t.title}</span>
                      <span className="block text-3xl lg:text-5xl xl:text-6xl font-normal mt-2 bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent">
                        {t.subtitle}
                      </span>
                    </h1>
                    
                    <p className="text-xl lg:text-2xl text-white/90 font-light leading-relaxed max-w-2xl">
                      {t.description}
                    </p>
                  </div>
                </div>
                
                {/* Primary CTA - Microsoft Style */}
                <div className="space-y-6">
                  <Button 
                    onClick={() => setShowAuth(true)} 
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-medium shadow-xl hover:shadow-2xl transform hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 rounded-lg group border-0 relative overflow-hidden min-w-[280px]"
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      {t.accessButton}
                      <ArrowLeft className="h-5 w-5 ml-3 rotate-180 group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                  </Button>
                  
                  {/* Trust Indicators - Microsoft Style */}
                  <div className="flex flex-wrap items-center gap-6 text-white/80 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="font-medium">{t.enterpriseSecure}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="font-medium">{t.isoCompliant}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-400" />
                      <span className="font-medium">{t.support24}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Column - Feature Cards */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Safe Startup Card - Microsoft Fluent Design */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                  <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 hover:bg-white/15 transition-all duration-300 group-hover:transform group-hover:scale-[1.02] shadow-2xl">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg flex-shrink-0">
                        <div className="w-6 h-6 bg-white rounded-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white mb-3 text-xl leading-tight">{t.safeStartup}</h3>
                        <p className="text-white/80 text-base leading-relaxed">{t.safeStartupDesc}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* P2O Handover Card - Microsoft Fluent Design */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                  <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 hover:bg-white/15 transition-all duration-300 group-hover:transform group-hover:scale-[1.02] shadow-2xl">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg flex-shrink-0">
                        <div className="w-6 h-6 bg-white rounded-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white mb-3 text-xl leading-tight">{t.p2oHandover}</h3>
                        <p className="text-white/80 text-base leading-relaxed">{t.p2oHandoverDesc}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Additional Information Card */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                  <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 group-hover:transform group-hover:scale-[1.02] shadow-2xl">
                    <div className="text-center">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg mx-auto mb-4">
                        <div className="w-5 h-5 bg-white rounded-sm" />
                      </div>
                      <h4 className="font-semibold text-white mb-2 text-lg">Enterprise Ready</h4>
                      <p className="text-white/80 text-sm">Scalable, secure, and designed for global operations</p>
                    </div>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        </main>
      )}

      <AuthenticationModal isOpen={showAuth} onClose={() => setShowAuth(false)} onAuthenticated={handleAuthenticated} />
    </div>
  );
};

export default Index;

