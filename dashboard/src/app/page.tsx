import LandingPage from '@/components/LandingPage';
import PremiumPageWrapper from '@/components/common/PremiumPageWrapper';

export default function Home() {
  return (
    <PremiumPageWrapper mode='none'>
      <LandingPage />
    </PremiumPageWrapper>
  );
}
