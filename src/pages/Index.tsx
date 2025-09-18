import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Languages, Phone } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/enhanced-auth/AuthProvider";
import EnhancedAuthModal from "@/components/enhanced-auth/EnhancedAuthModal";
import SafeStartupSummaryPage from "@/components/SafeStartupSummaryPage";
import LandingPage from "@/components/LandingPage";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import UserManagement from "@/pages/UserManagement";
import AdminToolsPage from "@/components/AdminToolsPage";
import ManageChecklistPage from "@/components/ManageChecklistPage";
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
    // Sign out and return to welcome screen
    try { signOut(); } catch {}
    navigate('/');
  };
  
  const handleNavigate = (section: string) => {
    navigate(`/${section}`);
  };
  
  const handleBackToLanding = () => {
    navigate('/');
  };
  const languages = [{
    code: "en",
    name: "English"
  }, {
    code: "ar",
    name: "العربية"
  }, {
    code: "fr",
    name: "Français"
  }, {
    code: "ms",
    name: "Bahasa Melayu"
  }, {
    code: "ru",
    name: "Русский"
  }];
  const translations = {
    en: {
      title: "Operation Readiness",
      subtitle: "Start-Up & Handover",
      description: "Transform your project start-up and handover experience with the ORSH platform.",
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
      description: "حول تجربة بدء تشغيل وتسليم مشروعك مع منصة ORSH.",
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
      description: "Transformez votre expérience de démarrage et de remise de projet avec la plateforme ORSH.",
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
      description: "Transformasikan pengalaman permulaan dan penyerahan projek anda dengan platform ORSH.",
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
      description: "Преобразуйте опыт запуска и передачи проекта с помощью платформы ORSH.",
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

  // Close auth modal when session is ready
  useEffect(() => {
    if (session && showAuth) {
      setShowAuth(false);
    }
  }, [session, showAuth]);

  // Show specific section based on navigation
  if (isAuthenticated && currentSection) {
    switch (currentSection) {
      case 'safe-startup':
        return <SafeStartupSummaryPage onBack={handleBackToLanding} />;
      case 'users':
        return <UserManagement onBack={handleBackToLanding} />;
      case 'manage-checklist':
        return <ManageChecklistPage onBack={handleBackToLanding} />;
      case 'admin-tools':
        return <AdminToolsPage onBack={handleBackToLanding} />;
      case 'p2o':
        // Placeholder for P2O Module - can be implemented later
        return <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">Project-to-Operations (P2O)</h1>
              <p className="text-gray-600 mb-6">PAC and FAC workflows - Coming Soon...</p>
              <Button onClick={handleBackToLanding}>Back to Dashboard</Button>
            </div>
          </div>;
      default:
        return <LandingPage onBack={handleBack} onNavigate={handleNavigate} />;
    }
  }

  // Show landing page after authentication
  if (isAuthenticated) {
    return <LandingPage onBack={handleBack} onNavigate={handleNavigate} />;
  }

  // Show welcome screen before authentication
  return <div className="min-h-screen relative overflow-hidden">
      {/* Background removed during sign-in */}
      {!showAuth && <>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-card/5 to-secondary/5" />
          <BackgroundSlideshow showFunFacts={false} />
        </>}
      {/* Modern Navigation Header */}
      <header className="relative z-20">
        <div className="max-w-7xl mx-auto px-8 py-0 -my-8">
          <div className="flex items-center justify-between my-[18px] mx-0 px-0 py-0">
            {/* Language Selector - Top Left */}
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 transition-all duration-300 rounded-xl px-4 py-2 border border-white/10 backdrop-blur-md font-medium shadow-sm hover:shadow-md group">
                    <Languages className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                    <span className="text-sm">{selectedLanguage}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-card/95 border border-border/30 shadow-2xl rounded-xl p-1 backdrop-blur-xl min-w-[180px] z-50">
                  {languages.map(language => <DropdownMenuItem key={language.code} onClick={() => setSelectedLanguage(language.name)} className="cursor-pointer hover:bg-accent/20 transition-all duration-200 rounded-lg py-2 px-3 text-sm font-medium text-foreground">
                      {language.name}
                    </DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* ORSH Logo - Top Center */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <img src="/images/orsh-logo.png" alt="ORSH Logo" className="h-40 w-auto" />
            </div>
            
            {/* Right side spacer for balance */}
            <div className="w-32"></div>
          </div>
        </div>
      </header>
      
      {!showAuth && <main className="relative z-10 flex items-center min-h-[calc(100vh-100px)] py-4">
          <div className="max-w-7xl mx-auto px-6 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              
              {/* Left Column - Hero Content */}
              <div className="space-y-8 animate-fade-in-up">
                {/* Hero Heading */}
                <div className="space-y-4">
                  
                  {/* Enhanced Microsoft Fluent Typography */}
                  <h1 className="font-light text-white leading-[0.9] tracking-tight">
                    <span className="text-5xl lg:text-7xl font-extralight bg-gradient-to-r from-white via-white/95 to-white/85 bg-clip-text text-transparent drop-shadow-2xl">
                      {t.title}
                    </span>
                    <span className="block text-4xl lg:text-6xl font-bold bg-gradient-to-r from-white via-cyan-100 to-blue-100 bg-clip-text text-transparent mt-2 drop-shadow-xl">
                      {t.subtitle}
                    </span>
                  </h1>
                  
                  {/* Two-line description with enhanced Microsoft typography */}
                  <div className="space-y-2 text-2xl text-white/90 font-light leading-relaxed max-w-2xl">
                    <div className="text-2xl text-white/90 font-light leading-relaxed">
                      {t.description}
                    </div>
                  </div>
                </div>
                
                {/* Feature Highlights - Enhanced Microsoft Fluent Design */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Safe Start-up Card */}
                  <div className="relative group transform hover:scale-[1.02] transition-all duration-500">
                    {/* Animated background glow */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-red-600/30 via-orange-500/20 to-yellow-400/30 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 animate-pulse-subtle"></div>
                    
                    {/* Card Background with Enhanced Acrylic Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.18] via-white/[0.12] to-white/[0.06] rounded-3xl backdrop-blur-2xl border border-white/[0.25] shadow-fluent-2xl group-hover:shadow-fluent-3xl group-hover:border-white/[0.35] transition-all duration-500"></div>
                    
                    {/* Animated border effect */}
                    <div className="absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-br from-red-500/20 via-orange-500/10 to-transparent bg-clip-border opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                    
                    {/* Content */}
                    <div className="relative p-8 space-y-4">
                      {/* Enhanced Icon with Microsoft-style layering and animation */}
                      <div className="relative w-16 h-16 mb-6">
                        {/* Icon glow effect */}
                        <div className="absolute -inset-2 bg-gradient-to-br from-red-500/40 to-orange-500/40 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                        
                        {/* Icon background layers */}
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/25 to-orange-500/25 rounded-2xl backdrop-blur-sm transform group-hover:rotate-3 transition-all duration-300"></div>
                        <div className="relative w-16 h-16 bg-gradient-to-br from-red-500 via-red-600 to-orange-500 rounded-2xl flex items-center justify-center shadow-fluent-xl transform group-hover:scale-110 group-hover:-translate-y-2 group-hover:rotate-6 transition-all duration-500">
                          {/* Inner icon element with animation */}
                          <div className="w-8 h-8 bg-gradient-to-br from-white/95 to-white/85 rounded-xl shadow-inner transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"></div>
                          
                          {/* Sparkle effects */}
                          <div className="absolute top-1 right-1 w-2 h-2 bg-white/80 rounded-full animate-ping opacity-0 group-hover:opacity-100"></div>
                          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-yellow-300/80 rounded-full animate-pulse opacity-0 group-hover:opacity-100 animation-delay-300"></div>
                        </div>
                      </div>
                      
                      {/* Enhanced Title with Microsoft Typography and animations */}
                      <h3 className="text-xl font-semibold text-white mb-3 tracking-tight group-hover:text-white/95 transform group-hover:-translate-y-1 transition-all duration-300">
                        {t.safeStartup}
                        <div className="w-0 h-0.5 bg-gradient-to-r from-red-400 to-orange-400 group-hover:w-full transition-all duration-500 mt-2"></div>
                      </h3>
                      
                      {/* Enhanced Description */}
                      <p className="text-white/80 text-sm leading-relaxed font-medium group-hover:text-white/90 transform group-hover:-translate-y-1 transition-all duration-400 delay-75">
                        {t.safeStartupDesc}
                      </p>
                      
                      {/* Floating particles effect */}
                      <div className="absolute top-4 right-4 w-1 h-1 bg-white/60 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce animation-delay-200 transition-all duration-300"></div>
                      <div className="absolute top-8 right-8 w-1.5 h-1.5 bg-red-300/60 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce animation-delay-500 transition-all duration-300"></div>
                    </div>
                    
                    {/* Enhanced Hover Effect Border with ripple */}
                    <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-gradient-to-br group-hover:from-red-400/30 group-hover:to-orange-400/30 transition-all duration-500"></div>
                  </div>
                  
                  {/* P2O Handover Card */}
                  <div className="relative group transform hover:scale-[1.02] transition-all duration-500">
                    {/* Animated background glow */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 via-cyan-500/20 to-teal-400/30 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 animate-pulse-subtle"></div>
                    
                    {/* Card Background with Enhanced Acrylic Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.18] via-white/[0.12] to-white/[0.06] rounded-3xl backdrop-blur-2xl border border-white/[0.25] shadow-fluent-2xl group-hover:shadow-fluent-3xl group-hover:border-white/[0.35] transition-all duration-500"></div>
                    
                    {/* Animated border effect */}
                    <div className="absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-transparent bg-clip-border opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                    
                    {/* Content */}
                    <div className="relative p-8 space-y-4">
                      {/* Enhanced Icon with Microsoft-style layering and animation */}
                      <div className="relative w-16 h-16 mb-6">
                        {/* Icon glow effect */}
                        <div className="absolute -inset-2 bg-gradient-to-br from-blue-500/40 to-cyan-500/40 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                        
                        {/* Icon background layers */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/25 to-cyan-500/25 rounded-2xl backdrop-blur-sm transform group-hover:-rotate-3 transition-all duration-300"></div>
                        <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-fluent-xl transform group-hover:scale-110 group-hover:-translate-y-2 group-hover:-rotate-6 transition-all duration-500">
                          {/* Inner icon element with animation */}
                          <div className="w-8 h-8 bg-gradient-to-br from-white/95 to-white/85 rounded-xl shadow-inner transform group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300"></div>
                          
                          {/* Sparkle effects */}
                          <div className="absolute top-1 left-1 w-2 h-2 bg-white/80 rounded-full animate-ping opacity-0 group-hover:opacity-100"></div>
                          <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-cyan-300/80 rounded-full animate-pulse opacity-0 group-hover:opacity-100 animation-delay-300"></div>
                        </div>
                      </div>
                      
                      {/* Enhanced Title with Microsoft Typography and animations */}
                      <h3 className="text-xl font-semibold text-white mb-3 tracking-tight group-hover:text-white/95 transform group-hover:-translate-y-1 transition-all duration-300">
                        {t.p2oHandover}
                        <div className="w-0 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 group-hover:w-full transition-all duration-500 mt-2"></div>
                      </h3>
                      
                      {/* Enhanced Description */}
                      <p className="text-white/80 text-sm leading-relaxed font-medium group-hover:text-white/90 transform group-hover:-translate-y-1 transition-all duration-400 delay-75">
                        {t.p2oHandoverDesc}
                      </p>
                      
                      {/* Floating particles effect */}
                      <div className="absolute top-4 left-4 w-1 h-1 bg-white/60 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce animation-delay-200 transition-all duration-300"></div>
                      <div className="absolute top-8 left-8 w-1.5 h-1.5 bg-blue-300/60 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce animation-delay-500 transition-all duration-300"></div>
                    </div>
                    
                    {/* Enhanced Hover Effect Border with ripple */}
                    <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-gradient-to-br group-hover:from-blue-400/30 group-hover:to-cyan-400/30 transition-all duration-500"></div>
                  </div>
                </div>
                
                {/* CTA Section */}
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    {/* Enhanced Microsoft Fluent CTA Button */}
                    <Button onClick={() => setShowAuth(true)} size="lg" className="relative group bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-500 hover:via-blue-600 hover:to-blue-700 text-white px-12 py-6 text-lg font-semibold shadow-fluent-3xl hover:shadow-fluent-4xl transform hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 rounded-2xl border-0 overflow-hidden backdrop-blur-sm">
                      {/* Microsoft Fluent Button Effects */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                      <div className="absolute inset-0 border border-white/10 rounded-2xl group-hover:border-white/20 transition-colors duration-300" />
                      
                      <span className="relative z-10 flex items-center font-medium tracking-wide">
                        {t.accessButton}
                        <ArrowLeft className="h-5 w-5 ml-4 rotate-180 group-hover:translate-x-1 transition-transform duration-300" />
                      </span>
                    </Button>
                    
                  </div>
                  
                    {/* Trust Indicators */}
                    <div className="flex items-center gap-6 text-white/70">
                     <div className="flex items-center gap-3">
                       <div className="w-4 h-4 rounded-full bg-success animate-pulse-subtle" />
                        <span className="text-base font-medium">{t.enterpriseSecure}</span>
                      </div>
                     <div className="flex items-center gap-3">
                       <div className="w-4 h-4 rounded-full bg-primary animate-pulse-subtle" />
                        <span className="text-base font-medium">{t.isoCompliant}</span>
                      </div>
                     <div className="flex items-center gap-3">
                       <div className="w-4 h-4 rounded-full bg-warning animate-pulse-subtle" />
                        <span className="text-base font-medium">{t.support24}</span>
                      </div>
                   </div>
                </div>
              </div>
              
              
            </div>
          </div>
        </main>}

      <EnhancedAuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onAuthenticated={handleAuthenticated} />
    </div>;
};
export default Index;