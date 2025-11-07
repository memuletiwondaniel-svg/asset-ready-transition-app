import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';

interface TourStep {
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="ai-input"]',
    title: 'AI Assistant',
    description: 'Ask questions or describe what you need. The AI will help you navigate and complete tasks.',
    position: 'bottom'
  },
  {
    target: '[data-tour="quick-actions"]',
    title: 'Quick Actions',
    description: 'Access frequently used tasks with one click to save time.',
    position: 'bottom'
  },
  {
    target: '[data-tour="workspaces"]',
    title: 'Workspaces',
    description: 'Select from different workspaces to access specialized tools and features.',
    position: 'top'
  },
  {
    target: '[data-tour="tasks"]',
    title: 'Pending Tasks',
    description: 'View and manage all your pending tasks. Filter by type and priority to stay organized.',
    position: 'left'
  }
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      updatePosition();
      setShow(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (show) {
      updatePosition();
    }
  }, [currentStep, show]);

  const updatePosition = () => {
    const step = tourSteps[currentStep];
    const element = document.querySelector(step.target);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      let top = 0;
      let left = 0;

      switch (step.position) {
        case 'bottom':
          top = rect.bottom + 20;
          left = rect.left + rect.width / 2 - 200;
          break;
        case 'top':
          top = rect.top - 220;
          left = rect.left + rect.width / 2 - 200;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - 100;
          left = rect.left - 420;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - 100;
          left = rect.right + 20;
          break;
      }

      setPosition({ top, left });

      // Highlight the target element
      element.classList.add('tour-highlight');
      
      // Remove highlight from previous elements
      document.querySelectorAll('.tour-highlight').forEach(el => {
        if (el !== element) {
          el.classList.remove('tour-highlight');
        }
      });
    }
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Remove all highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!show) return null;

  const step = tourSteps[currentStep];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in" />
      
      {/* Tour Card */}
      <Card 
        className="fixed z-[60] w-[400px] shadow-2xl border-2 border-primary/20 animate-scale-in"
        style={{ 
          top: `${position.top}px`, 
          left: `${position.left}px`,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold">{step.title}</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {currentStep + 1}/{tourSteps.length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={handleSkip}
              className="h-8 w-8 -mt-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-xs"
            >
              Skip Tour
            </Button>
            
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleNext}
                className="bg-gradient-to-r from-primary to-accent"
              >
                {currentStep < tourSteps.length - 1 ? (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  'Get Started'
                )}
              </Button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1.5 justify-center pt-2">
            {tourSteps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep 
                    ? 'w-8 bg-primary' 
                    : 'w-1.5 bg-primary/20'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tour styles */}
      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 55 !important;
          box-shadow: 0 0 0 4px rgba(var(--primary-rgb, 59 130 246), 0.5),
                      0 0 0 8px rgba(var(--primary-rgb, 59 130 246), 0.2) !important;
          border-radius: 0.5rem;
          animation: tour-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes tour-pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(var(--primary-rgb, 59 130 246), 0.5),
                        0 0 0 8px rgba(var(--primary-rgb, 59 130 246), 0.2);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(var(--primary-rgb, 59 130 246), 0.7),
                        0 0 0 12px rgba(var(--primary-rgb, 59 130 246), 0);
          }
        }
      `}</style>
    </>
  );
};
