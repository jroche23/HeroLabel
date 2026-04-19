import { Link } from 'react-router-dom';
import { Plus, UserPlus, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/store';

function DeliveryHeroLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="6" fill="#FF2B5E"/>
        <path d="M18 5L9 19h7l-3 8 11-13h-7l3-9z" fill="white"/>
      </svg>
      <span className="text-base font-bold tracking-tight">
        <span className="text-foreground">delivery</span>
        <span style={{ color: '#FF2B5E' }}>hero</span>
      </span>
    </div>
  );
}

export function WelcomeSection() {
  const user = useCurrentUser();

  return (
    <div className="space-y-4">
      <div className="mb-1">
        <DeliveryHeroLogo />
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome back{user.name ? `, ${user.name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Let's get you started with your annotation projects.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" className="rounded-md" asChild>
          <Link to="/projects" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create a Project
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="rounded-md" asChild>
          <Link to="/organization/members" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Members
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="rounded-md">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Member Performance
          </div>
        </Button>
      </div>
    </div>
  );
}
