'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, Lock } from 'lucide-react';
import type { Chapter } from '@/lib/types/roadmap';
import { ROADMAP_TOP_PADDING, ROADMAP_BOTTOM_PADDING } from './RoadmapSVG';

interface RoadmapNodeProps {
  chapter: Chapter;
  index: number;
  totalCount: number;
  roadmapHeight: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
  onClick: () => void;
}

const colorMap: Record<string, { text: string; bg: string; glow: string; border: string; raw: string }> = {
  red: { text: 'text-accent-red', bg: 'bg-accent-red', glow: 'glow-red', border: 'border-accent-red', raw: 'var(--color-accent-red)' },
  cyan: { text: 'text-accent-cyan', bg: 'bg-accent-cyan', glow: 'glow-cyan', border: 'border-accent-cyan', raw: 'var(--color-accent-cyan)' },
  blue: { text: 'text-accent-blue', bg: 'bg-accent-blue', glow: 'glow-blue', border: 'border-accent-blue', raw: 'var(--color-accent-blue)' },
  green: { text: 'text-accent-green', bg: 'bg-accent-green', glow: 'glow-green', border: 'border-accent-green', raw: 'var(--color-accent-green)' },
  purple: { text: 'text-accent-purple', bg: 'bg-accent-purple', glow: 'glow-purple', border: 'border-accent-purple', raw: 'var(--color-accent-purple)' },
  orange: { text: 'text-accent-orange', bg: 'bg-accent-orange', glow: 'glow-orange', border: 'border-accent-orange', raw: 'var(--color-accent-orange)' },
  pink: { text: 'text-accent-pink', bg: 'bg-accent-pink', glow: 'glow-pink', border: 'border-accent-pink', raw: 'var(--color-accent-pink)' },
};

export function RoadmapNode({
  chapter,
  index,
  totalCount,
  roadmapHeight,
  isCompleted,
  isCurrent,
  isLocked,
  onClick,
}: RoadmapNodeProps) {
  const colors = colorMap[chapter.accent_color] || colorMap.cyan;
  const isOnRight = index % 2 === 0;

  // Compute Y position (same formula as the SVG road)
  const usableHeight = roadmapHeight - ROADMAP_TOP_PADDING - ROADMAP_BOTTOM_PADDING;
  const t = (index + 1) / (totalCount + 1);
  const y = ROADMAP_TOP_PADDING + t * usableHeight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 2 + index * 0.15 }}
      className="absolute"
      style={{
        top: y - 35,
        transform: 'translateY(-50%)',
        zIndex: 5,
        // Position the node so circle sits on the inner edge of the road at the curve
        ...(isOnRight
          ? { left: '50%', paddingLeft: 110 }
          : { right: '50%', paddingRight: 110 }),
      }}
    >
      <div className={cn(
        'flex items-center gap-3',
        isOnRight ? 'flex-row' : 'flex-row-reverse',
      )}>
        {/* Connector line from road to circle */}
        <div
          className="w-5 h-0.5 shrink-0"
          style={{ backgroundColor: colors.raw }}
        />

        {/* Circle */}
        <motion.button
          onClick={onClick}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'relative w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 transition-all shrink-0',
            isCompleted && `${colors.bg} border-transparent`,
            isCurrent && `bg-bg-primary ${colors.border}`,
            isLocked && 'bg-bg-elevated border-white/10',
            !isCompleted && !isCurrent && !isLocked && `bg-bg-primary ${colors.border}`,
          )}
        >
          {isCompleted ? (
            <Check className="w-5 h-5 md:w-6 md:h-6 text-white" />
          ) : isLocked ? (
            <Lock className="w-4 h-4 md:w-5 md:h-5 text-text-dim" />
          ) : (
            <span className={cn('text-base md:text-lg font-bold', colors.text)}>
              {chapter.id}
            </span>
          )}
        </motion.button>

        {/* Card */}
        <div className="bg-bg-surface border border-white/8 rounded-lg px-4 py-3 w-[170px] md:w-[210px]">
          <h3 className={cn(
            'text-xs md:text-sm font-semibold mb-0.5',
            isLocked ? 'text-text-dim' : 'text-white'
          )}>
            {chapter.title}
          </h3>
          <p className="text-text-dim text-[11px] md:text-xs line-clamp-2">{chapter.summary}</p>
          <span className="text-text-dim text-[11px] md:text-xs mt-1 inline-block">
            {chapter.estimated_minutes} min
          </span>
        </div>
      </div>
    </motion.div>
  );
}
