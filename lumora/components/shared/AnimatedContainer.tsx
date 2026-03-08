'use client';

import { motion } from 'framer-motion';
import { animations } from '@/lib/constants';

interface AnimatedContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedContainer({ children, className = '', delay = 0 }: AnimatedContainerProps) {
  return (
    <motion.div
      initial={animations.fadeInUp.initial}
      animate={animations.fadeInUp.animate}
      transition={{ ...animations.fadeInUp.transition, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
