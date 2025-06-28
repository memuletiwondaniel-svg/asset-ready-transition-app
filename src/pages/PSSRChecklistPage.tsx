
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, Zap, Wrench } from 'lucide-react';

interface PSSRChecklistPageProps {
  onBack?: () => void;
}

const PSSRChecklistPage: React.FC<PSSRChecklistPageProps> = ({ onBack }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    console.log('Navigating back from PSSR Checklist Page');
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  const checklistCategories = [
    {
      id: 'safety',
      title: 'Safety Systems',
      description: 'Safety-related equipment, emergency systems, and protective devices',
      icon: Shield,
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      count: 45
    },
    {
      id: 'electrical',
      title: 'Electrical Systems',
      description: 'Power distribution, control systems, and electrical safety',
      icon: Zap,
      color: 'bg-yellow-500',
      hoverColor: 'hover:bg-yellow-600',
      count: 32
    },
    {
      id: 'mechanical',
      title: 'Mechanical Systems',
      description: 'Pumps, compressors, piping, and mechanical equipment',
      icon: Wrench,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      count: 38
    }
  ];

  const handleCategoryClick = (categoryId: string) => {
    console.log('Opening PSSR checklist category:', categoryId);
    // TODO: Navigate to specific checklist category or open modal
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PSSR Checklists</h1>
              <p className="text-gray-600">Pre-Start Up Safety Review checklist categories</p>
            </div>
          </div>
        </div>

        {/* Checklist Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {checklistCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <Card 
                key={category.id}
                className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-2 border-2 hover:border-gray-300 h-80 flex flex-col shadow-lg"
                onClick={() => handleCategoryClick(category.id)}
              >
                <CardHeader className="text-center pb-4 flex-shrink-0">
                  <div className={`mx-auto w-16 h-16 rounded-full ${category.color} ${category.hoverColor} flex items-center justify-center mb-4 transition-all duration-300 group-hover:shadow-lg group-hover:scale-110`}>
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors duration-300">
                    {category.title}
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-sm leading-relaxed min-h-[4rem]">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center mt-auto pb-6">
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">{category.count}</span>
                    <p className="text-gray-600 text-sm">checklist items</p>
                  </div>
                  <Button 
                    className={`w-full ${category.color} ${category.hoverColor} text-white transition-all duration-300 shadow-md hover:shadow-lg group-hover:scale-105`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCategoryClick(category.id);
                    }}
                  >
                    Open Checklist
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PSSRChecklistPage;
