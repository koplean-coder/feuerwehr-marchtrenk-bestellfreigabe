import { Layout } from '@/components/Layout';
import { TrainingPlanSection } from '@/components/TrainingPlanSection';
import { useNavigate } from 'react-router';

export default function TrainingPlan() {
  const navigate = useNavigate();
  
  return (
    <Layout>
      <TrainingPlanSection onBack={() => navigate('/')} />
    </Layout>
  );
}
