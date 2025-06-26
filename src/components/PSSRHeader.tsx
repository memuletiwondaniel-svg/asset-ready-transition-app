
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

interface PSSRHeaderProps {
  onBack: () => void;
}

const PSSRHeader: React.FC<PSSRHeaderProps> = ({ onBack }) => {
  return (
    <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200/50 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={onBack} className="hover:bg-gray-100">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                Pre-Start-Up Safety Review (PSSR)
              </h1>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PSSRHeader;
