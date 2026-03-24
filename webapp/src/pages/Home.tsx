import { AppLayout } from '@/components/layout/AppLayout';
import { WelcomeSection } from '@/components/home/WelcomeSection';
import { RecentProjects } from '@/components/home/RecentProjects';

export default function Home() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="space-y-8">
          <WelcomeSection />
          <RecentProjects />
        </div>
      </div>
    </AppLayout>
  );
}
