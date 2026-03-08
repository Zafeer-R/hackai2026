'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { animations } from '@/lib/constants';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  accentColor?: 'red' | 'cyan' | 'blue' | 'green' | 'purple' | 'orange' | 'pink';
  onClick?: () => void;
  hoverGlow?: boolean;
}

const accentBorderColors: Record<string, string> = {
  red: 'border-l-accent-red',
  cyan: 'border-l-accent-cyan',
  blue: 'border-l-accent-blue',
  green: 'border-l-accent-green',
  purple: 'border-l-accent-purple',
  orange: 'border-l-accent-orange',
  pink: 'border-l-accent-pink',
};

const glowClasses: Record<string, string> = {
  red: 'hover:glow-red-subtle',
  cyan: 'hover:glow-cyan-subtle',
  blue: 'hover:glow-blue-subtle',
  green: 'hover:glow-green-subtle',
  purple: 'hover:glow-purple-subtle',
  orange: 'hover:glow-orange-subtle',
  pink: 'hover:glow-pink-subtle',
};

export function GlowCard({
  children,
  className = '',
  accentColor,
  onClick,
  hoverGlow = true,
}: GlowCardProps) {
  return (
    <motion.div
      {...animations.scaleOnHover}
      onClick={onClick}
      className={cn(
        'bg-bg-surface border border-white/5 rounded-2xl p-6 transition-all duration-300 hover:bg-gradient-to-br hover:from-white/[0.03] hover:to-transparent',
        accentColor && `border-l-[3px] ${accentBorderColors[accentColor]}`,
        hoverGlow && accentColor && glowClasses[accentColor],
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
