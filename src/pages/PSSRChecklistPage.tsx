
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, Zap, Wrench, ChevronRight } from 'lucide-react';

interface ChecklistCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  hoverColor: string;
  itemCount: number;
}

interface PSSRChecklistPageProps {
  onBack: () => void;
}

const PSSRChecklistPage: React.FC<PSSRChecklistPageProps> = ({ onBack }) => {
  const checklistCategories: ChecklistCategory[] = [
    {
      id: 'safety',
      title: 'Safety Systems',
      description: 'Safety instrumented systems, emergency shutdown systems, and safety critical equipment verification',
      icon: Shield,
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      itemCount: 25
    },
    {
      id: 'electrical',
      title: 'Electrical Systems',
      description: 'Electrical installations, power systems, control systems, and instrumentation checks',
      icon: Zap,
      color: 'bg-yellow-500',
      hoverColor: 'hover:bg-yellow-600',
      itemCount: 18
    },
    {
      id: 'mechanical',
      title: 'Mechanical Systems',
      description: 'Mechanical equipment, piping systems, valves, and rotating equipment verification',
      icon: Wrench,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      itemCount: 32
    }
  ];

  const handleCategoryClick = (categoryId: string) => {
    console.log('Open checklist category:', categoryId);
    // TODO: Navigate to specific checklist category
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">PSSR Checklists</h1>
            <p className="text-gray-600">Pre-Start-up Safety Review checklist categories</p>
          </div>
        </div>

        {/* Overview Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Checklist Overview</CardTitle>
            <CardDescription>
              Complete all checklist categories to ensure safe startup operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {checklistCategories.reduce((sum, cat) => sum + cat.itemCount, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {checklistCategories.reduce((sum, cat) => sum + cat.itemCount, 0)}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checklist Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {checklistCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <Card 
                key={category.id}
                className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 border-2 hover:border-gray-300"
                onClick={() => handleCategoryClick(category.id)}
              >
                <CardHeader className="text-center">
                  <div className={`mx-auto w-16 h-16 rounded-full ${category.color} ${category.hoverColor} flex items-center justify-center mb-4 transition-all duration-300 group-hover:shadow-lg group-hover:scale-110`}>
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors duration-300">
                    {category.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed min-h-[3rem]">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600">Items:</span>
                    <span className="font-semibold text-gray-900">{category.itemCount}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600">Progress:</span>
                    <span className="text-sm text-orange-600">0%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div className="bg-orange-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                  <Button 
                    className={`w-full ${category.color} ${category.hoverColor} text-white transition-all duration-300 shadow-md hover:shadow-lg group-hover:scale-105 flex items-center justify-center gap-2`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCategoryClick(category.id);
                    }}
                  >
                    Open Checklist
                    <ChevronRight className="h-4 w-4" />
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
