import { Construction } from 'lucide-react';

interface ComingSoonTabProps {
  tabName: string;
}

export function ComingSoonTab({ tabName }: ComingSoonTabProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-24">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Construction className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">{tabName}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This feature is under development.
      </p>
    </div>
  );
}
