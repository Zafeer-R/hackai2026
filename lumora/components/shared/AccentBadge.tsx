import { cn } from '@/lib/utils';

interface AccentBadgeProps {
  children: React.ReactNode;
  color?: 'red' | 'cyan' | 'blue' | 'green' | 'purple' | 'orange' | 'pink';
  className?: string;
}

const bgColors: Record<string, string> = {
  red: 'bg-accent-red/15 text-accent-red',
  cyan: 'bg-accent-cyan/15 text-accent-cyan',
  blue: 'bg-accent-blue/15 text-accent-blue',
  green: 'bg-accent-green/15 text-accent-green',
  purple: 'bg-accent-purple/15 text-accent-purple',
  orange: 'bg-accent-orange/15 text-accent-orange',
  pink: 'bg-accent-pink/15 text-accent-pink',
};

export function AccentBadge({ children, color = 'blue', className = '' }: AccentBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      bgColors[color],
      className
    )}>
      {children}
    </span>
  );
}
