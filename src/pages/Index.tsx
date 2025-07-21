

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
      description: "Transform your project start-up and handover experience with the ORSH comprehensive platform.",
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
      description: "حول تجربة بدء تشغيل وتسليم مشروعك مع منصة ORSH الشاملة.",
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
      description: "Transformez votre expérience de démarrage et de remise de projet avec la plateforme complète ORSH.",
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
      description: "Transformasikan pengalaman permulaan dan penyerahan projek anda dengan platform komprehensif ORSH.",
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
      description: "Преобразуйте опыт запуска и передачи проекта с помощью комплексной платформы ORSH.",
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with enhanced gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-card/5 to-secondary/5" />
      <BackgroundSlideshow showFunFacts={showAuth} />
      
      {/* Modern Navigation Header */}
      <header className="relative z-20">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-end">
            {/* Language Selector - Top Right */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white hover:bg-white/10 transition-all duration-300 rounded-xl px-4 py-2 border border-white/10 backdrop-blur-md font-medium shadow-sm hover:shadow-md group"
                >
                  <Languages className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-sm">{selectedLanguage}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card/95 border border-border/30 shadow-2xl rounded-xl p-1 backdrop-blur-xl min-w-[180px] z-50">
                {languages.map((language) => (
                  <DropdownMenuItem
                    key={language.code}
                    onClick={() => setSelectedLanguage(language.name)}
                    className="cursor-pointer hover:bg-accent/20 transition-all duration-200 rounded-lg py-2 px-3 text-sm font-medium text-foreground"
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
        <main className="relative z-10 flex items-center min-h-[calc(100vh-120px)] pt-8">
          <div className="max-w-7xl mx-auto px-8 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              
              {/* Left Column - Hero Content */}
              <div className="space-y-12 animate-fade-in-up">
                {/* Hero Heading */}
                <div className="space-y-6">
                  
                  <h1 className="font-light text-white leading-none tracking-tight">
                    <span className="text-5xl lg:text-6xl">{t.title}</span>,
                    <span className="block text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-white to-primary/90 bg-clip-text text-transparent">
                      {t.subtitle}
                    </span>
                  </h1>
                  
                  <p className="text-2xl text-white/85 font-light leading-relaxed max-w-2xl">
                    Transform your project start-up and handover experience with the{" "}
                    <span className="font-semibold bg-gradient-to-r from-primary via-primary-hover to-accent bg-clip-text text-transparent drop-shadow-lg">
                      ORSH
                    </span>{" "}
                    comprehensive platform.
                  </p>
                </div>
                
                {/* Feature Highlights - Microsoft Fluent Design */}
                <div className="grid grid-cols-2 gap-8">
                  {/* Safe Start-up Card */}
                  <div className="relative group">
                    {/* Card Background with Acrylic Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.15] to-white/[0.05] rounded-3xl backdrop-blur-xl border border-white/[0.18] shadow-2xl group-hover:shadow-fluent-2xl transition-all duration-500"></div>
                    
                    {/* Content */}
                    <div className="relative p-8 space-y-5">
                      {/* Icon with Microsoft-style layering */}
                      <div className="relative w-16 h-16 mb-6">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl backdrop-blur-sm"></div>
                        <div className="relative w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-fluent transform group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
                          <div className="w-8 h-8 bg-white/90 rounded-lg shadow-inner"></div>
                        </div>
                      </div>
                      
                      {/* Title with Microsoft Typography */}
                      <h3 className="text-xl font-semibold text-white mb-3 tracking-tight group-hover:text-white/95 transition-colors duration-200">
                        {t.safeStartup}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-white/75 text-sm leading-relaxed font-medium">
                        {t.safeStartupDesc}
                      </p>
                    </div>
                    
                    {/* Hover Effect Border */}
                    <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-white/20 transition-all duration-300"></div>
                  </div>
                  
                  {/* P2O Handover Card */}
                  <div className="relative group">
                    {/* Card Background with Acrylic Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.15] to-white/[0.05] rounded-3xl backdrop-blur-xl border border-white/[0.18] shadow-2xl group-hover:shadow-fluent-2xl transition-all duration-500"></div>
                    
                    {/* Content */}
                    <div className="relative p-8 space-y-5">
                      {/* Icon with Microsoft-style layering */}
                      <div className="relative w-16 h-16 mb-6">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl backdrop-blur-sm"></div>
                        <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-fluent transform group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
                          <div className="w-8 h-8 bg-white/90 rounded-lg shadow-inner"></div>
                        </div>
                      </div>
                      
                      {/* Title with Microsoft Typography */}
                      <h3 className="text-xl font-semibold text-white mb-3 tracking-tight group-hover:text-white/95 transition-colors duration-200">
                        {t.p2oHandover}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-white/75 text-sm leading-relaxed font-medium">
                        {t.p2oHandoverDesc}
                      </p>
                    </div>
                    
                    {/* Hover Effect Border */}
                    <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-white/20 transition-all duration-300"></div>
                  </div>
                </div>
                
                {/* CTA Section */}
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <Button 
                      onClick={() => setShowAuth(true)} 
                      size="lg"
                      className="bg-primary hover:bg-primary-hover text-primary-foreground px-12 py-6 text-xl font-semibold shadow-fluent-2xl hover:shadow-fluent-2xl/60 transform hover:scale-105 hover:-translate-y-2 transition-all duration-500 rounded-2xl group border-0 relative overflow-hidden"
                    >
                      {/* Button background effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-hover to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="relative z-10 flex items-center">
                        {t.accessButton}
                        <ArrowLeft className="h-6 w-6 ml-4 rotate-180 group-hover:translate-x-2 transition-transform duration-300" />
                      </span>
                    </Button>
                    
                  </div>
                  
                   {/* Trust Indicators */}
                   <div className="flex items-center gap-8 text-white/70">
                     <div className="flex items-center gap-3">
                       <div className="w-4 h-4 rounded-full bg-success animate-pulse-subtle" />
                       <span className="text-lg font-medium">{t.enterpriseSecure}</span>
                     </div>
                     <div className="flex items-center gap-3">
                       <div className="w-4 h-4 rounded-full bg-primary animate-pulse-subtle" />
                       <span className="text-lg font-medium">{t.isoCompliant}</span>
                     </div>
                     <div className="flex items-center gap-3">
                       <div className="w-4 h-4 rounded-full bg-warning animate-pulse-subtle" />
                       <span className="text-lg font-medium">{t.support24}</span>
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

