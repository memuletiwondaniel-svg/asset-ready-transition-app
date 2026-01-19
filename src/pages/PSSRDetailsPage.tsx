import { useParams, useNavigate } from 'react-router-dom';
import PSSRDashboard from '@/components/PSSRDashboard';

const PSSRDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  if (!id) {
    navigate('/pssr');
    return null;
  }
  
  return (
    <PSSRDashboard 
      pssrId={id} 
      onBack={() => navigate('/pssr')}
      onNavigateToCategory={(categoryName) => navigate(`/pssr/${id}?category=${categoryName}`)}
    />
  );
};

export default PSSRDetailsPage;
