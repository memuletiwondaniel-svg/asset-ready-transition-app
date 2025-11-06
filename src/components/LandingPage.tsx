import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  ShieldCheck, Settings, BarChart3, Users, ClipboardList, AlertTriangle, 
  CheckCircle, ArrowRight, Languages, ChevronDown, User, LogOut, 
  KeyRound, Sparkles, TrendingUp, Zap, Shield, Lock
} from 'lucide-react';

interface LandingPageProps {
  onBack: () => void;
  onNavigate: (section: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onBack, onNavigate }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Language translations
  const translations = {
    English: {
      hero: {
        title: 'Operation Readiness &',
        titleAccent: 'Start-up Handover',
        subtitle: 'Streamline your operations with intelligent safety management, seamless project handovers, and comprehensive compliance tracking',
        cta: 'Get Started',
        learn: 'Learn More'
      },
      stats: [
        { label: 'Active Projects', value: '127', icon: TrendingUp },
        { label: 'Safety Checks', value: '1,450', icon: Shield },
        { label: 'Users', value: '350+', icon: Users },
        { label: 'Compliance Rate', value: '99.8%', icon: CheckCircle }
      ],
      workspace: 'Choose Your Workspace',
      signOut: 'Sign Out'
    }
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية (Arabic)' },
    { code: 'ru', name: 'Русский (Russian)' },
    { code: 'ms', name: 'Bahasa Melayu' }
  ];

  const t = translations[selectedLanguage] || translations.English;

  const workspaces = [
    {
      id: 'safe-startup',
      title: 'Safe Start-Up',
      description: 'Pre-Start Up Safety Review (PSSR) process and checklists for safe hydrocarbon introduction',
      icon: ClipboardList,
      gradient: 'from-rose-500/20 via-rose-500/10 to-transparent',
      iconColor: 'from-rose-500 to-rose-600',
      size: 'large' // Bento grid: takes 2 columns
    },
    {
      id: 'p2o',
      title: 'Project-to-Operations',
      description: 'Seamless PAC and FAC workflows for operational readiness',
      icon: KeyRound,
      gradient: 'from-blue-500/20 via-blue-500/10 to-transparent',
      iconColor: 'from-blue-500 to-blue-600',
      size: 'large'
    },
    {
      id: 'admin-tools',
      title: 'Admin & Tools',
      description: 'Comprehensive user, role, and project management',
      icon: BarChart3,
      gradient: 'from-violet-500/20 via-violet-500/10 to-transparent',
      iconColor: 'from-violet-500 to-violet-600',
      size: 'small'
    },
    {
      id: 'security',
      title: 'Security Center',
      description: 'Advanced security monitoring and compliance',
      icon: Lock,
      gradient: 'from-amber-500/20 via-amber-500/10 to-transparent',
      iconColor: 'from-amber-500 to-amber-600',
      size: 'small'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'Real-time insights and reporting',
      icon: Sparkles,
      gradient: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
      iconColor: 'from-emerald-500 to-emerald-600',
      size: 'small'
    },
    {
      id: 'compliance',
      title: 'Compliance',
      description: 'Automated compliance tracking and alerts',
      icon: ShieldCheck,
      gradient: 'from-cyan-500/20 via-cyan-500/10 to-transparent',
      iconColor: 'from-cyan-500 to-cyan-600',
      size: 'small'
    }
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-primary/5 to-background pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      {/* Glassmorphic Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <img 
                src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" 
                alt="BGC Logo" 
                className="h-12 w-auto transition-transform duration-300 hover:scale-105"
                style={{ transform: `translateY(${scrollY * 0.05}px)` }}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 px-4 backdrop-blur-sm bg-background/50 border-border/50">
                    <Languages className="h-4 w-4 mr-2" />
                    {selectedLanguage}
                    <ChevronDown className="h-3 w-3 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 backdrop-blur-xl bg-background/95 border-border/50">
                  {languages.map(language => (
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
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 w-10 rounded-full p-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 backdrop-blur-xl bg-background/95 border-border/50">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </DropdownMenuItem>
                  <div className="h-px bg-border/50 my-1" />
                  <DropdownMenuItem className="cursor-pointer text-destructive" onClick={onBack}>
                    <LogOut className="h-4 w-4 mr-3" />
                    {t.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-16 animate-fade-in">
            <Badge variant="outline" className="mb-6 backdrop-blur-sm bg-primary/10 border-primary/20 text-primary">
              <Zap className="h-3 w-3 mr-1" />
              Next Generation ORSH Platform
            </Badge>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6">
              {t.hero.title}
              <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent mt-2">
                {t.hero.titleAccent}
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
              {t.hero.subtitle}
            </p>
            
            <div className="flex items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                onClick={() => onNavigate('safe-startup')}
              >
                {t.hero.cta}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-12 px-8 text-base font-semibold backdrop-blur-sm bg-background/50 border-border/50"
              >
                {t.hero.learn}
              </Button>
            </div>
          </div>

          {/* Stats Cards with Glassmorphism */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-20 animate-slide-up">
            {t.stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card 
                  key={index}
                  className="p-6 backdrop-blur-xl bg-card/50 border-border/40 hover:bg-card/70 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </Card>
              );
            })}
          </div>

          {/* Workspace Selection - Bento Grid */}
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-center mb-4">{t.workspace}</h2>
            <p className="text-center text-muted-foreground mb-12 text-lg">
              Access powerful tools designed for operational excellence
            </p>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[280px]">
              {workspaces.map((workspace, index) => {
                const Icon = workspace.icon;
                const isLarge = workspace.size === 'large';
                
                return (
                  <Card
                    key={workspace.id}
                    onClick={() => onNavigate(workspace.id)}
                    className={`
                      group relative overflow-hidden cursor-pointer
                      backdrop-blur-xl bg-card/50 border-border/40
                      hover:bg-card/70 hover:border-primary/40
                      transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl
                      p-8 flex flex-col
                      ${isLarge ? 'lg:col-span-2 lg:row-span-1' : 'lg:col-span-1'}
                      animate-fade-in
                    `}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Gradient Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${workspace.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    
                    {/* Content */}
                    <div className="relative z-10 flex flex-col h-full">
                      {/* Icon */}
                      <div className={`
                        w-14 h-14 rounded-2xl mb-6
                        bg-gradient-to-br ${workspace.iconColor}
                        flex items-center justify-center
                        group-hover:scale-110 group-hover:rotate-3
                        transition-all duration-500 shadow-lg
                      `}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      
                      {/* Text */}
                      <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors duration-300">
                        {workspace.title}
                      </h3>
                      
                      <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                        {workspace.description}
                      </p>
                      
                      {/* CTA */}
                      <div className="flex items-center text-primary font-semibold group-hover:translate-x-2 transition-transform duration-300">
                        Explore
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </div>
                    </div>

                    {/* Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
