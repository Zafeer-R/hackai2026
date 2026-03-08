'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
}

export function ProgressBar({ progress, className = '' }: ProgressBarProps) {
  return (
    <div className={`w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden ${className}`}>
      <motion.div
        className="h-full bg-accent-cyan rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ boxShadow: '0 0 10px rgba(34, 211, 238, 0.3)' }}
      />
    </div>
  );
}
