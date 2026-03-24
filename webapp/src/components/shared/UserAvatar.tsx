import { cn } from '@/lib/utils';

interface UserAvatarProps {
  initials: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-7 w-7 text-[11px]',
  lg: 'h-8 w-8 text-xs',
} as const;

export function UserAvatar({ initials, color, size = 'md', className }: UserAvatarProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium text-white shrink-0',
        sizeMap[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
