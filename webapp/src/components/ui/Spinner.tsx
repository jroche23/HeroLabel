import { cn } from '@/lib/utils';

interface SpinnerProps {
  className?: string;
  size?: number;
}

export function Spinner({ className, size = 32 }: SpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <svg
        className="animate-spin"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="#F56A28"
          strokeWidth="3"
        />
        <path
          className="opacity-90"
          d="M12 2a10 10 0 0 1 10 10"
          stroke="#F56A28"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
