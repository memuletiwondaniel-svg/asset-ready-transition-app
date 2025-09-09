import React from 'react';
import { ArrowRight, Globe, Shield, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const OrshLandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {/* Logo placeholder - you can replace with actual logo */}
              <div className="w-8 h-8 bg-primary rounded"></div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Globe className="w-4 h-4" />
                <span>English</span>
              </div>
              <div className="text-primary font-semibold">Saudi Gas Company</div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/lovable-uploads/4dcb1e8d-6a4c-470a-8a5e-ed0450faddbc.png')`,
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="max-w-4xl">
            {/* Main Heading */}
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Operation<br />
              Readiness<br />
              Start-Up & Handover
            </h1>

            {/* Subtitle */}
            <p className="text-xl lg:text-2xl text-white/90 mb-12 max-w-2xl">
              Transform your project start-up and handover experience with the ORSH platform.
            </p>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {/* Safe Start-Up Card */}
              <div className="fluent-card bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-destructive rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-6 h-6 bg-white rounded-full"></div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-4">Safe Start-Up</h3>
                    <p className="text-white/80 text-lg leading-relaxed">
                      Manage the safe introduction of hydrocarbons into a new facility using the Pre-Start Up Safety Review (PSSR) process and checklists
                    </p>
                  </div>
                </div>
              </div>

              {/* P2O Handover Card */}
              <div className="fluent-card bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-6 h-6 bg-white rounded-full"></div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-4">P2O Handover</h3>
                    <p className="text-white/80 text-lg leading-relaxed">
                      Seamless transition and handover from construction and commissioning to Asset Operation
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <Button 
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary-hover text-white px-8 py-4 text-lg font-semibold rounded-lg fluent-button group"
            >
              Access ORSH Platform
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>

        {/* Bottom Features */}
        <div className="relative z-10 bg-black/20 backdrop-blur-sm border-t border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="flex flex-col items-center space-y-2">
                <Shield className="w-8 h-8 text-white" />
                <span className="text-white font-semibold">Enterprise Secure</span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <CheckCircle className="w-8 h-8 text-white" />
                <span className="text-white font-semibold">ISO Compliant</span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Clock className="w-8 h-8 text-white" />
                <span className="text-white font-semibold">24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrshLandingPage;