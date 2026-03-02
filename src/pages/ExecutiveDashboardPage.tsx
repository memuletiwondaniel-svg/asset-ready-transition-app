import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExecutiveDashboard } from '@/components/executive/ExecutiveDashboard';

const ExecutiveDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  return <ExecutiveDashboard onBack={() => navigate('/home')} />;
};

export default ExecutiveDashboardPage;
