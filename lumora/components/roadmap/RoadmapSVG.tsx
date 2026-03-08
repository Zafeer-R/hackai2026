'use client';

import { motion } from 'framer-motion';

interface RoadmapSVGProps {
  nodeCount: number;
  height: number;
  /** How many chapters are completed (0 = none, used to illuminate the road green) */
  completedCount?: number;
}

export const ROADMAP_SVG_WIDTH = 400;
export const ROADMAP_CENTER_X = ROADMAP_SVG_WIDTH / 2;
export const ROADMAP_AMPLITUDE = 100;
export const ROADMAP_TOP_PADDING = 60;
export const ROADMAP_BOTTOM_PADDING = 80;

export function RoadmapSVG({ nodeCount, height, completedCount = 0 }: RoadmapSVGProps) {
  const usableHeight = height - ROADMAP_TOP_PADDING - ROADMAP_BOTTOM_PADDING;

  // Build node positions for the road path
  const nodePositions: { x: number; y: number }[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const t = (i + 1) / (nodeCount + 1);
    const y = ROADMAP_TOP_PADDING + t * usableHeight;
    const x = ROADMAP_CENTER_X + (i % 2 === 0 ? 1 : -1) * ROADMAP_AMPLITUDE;
    nodePositions.push({ x, y });
  }

  const startPoint = { x: ROADMAP_CENTER_X, y: ROADMAP_TOP_PADDING };
  const endPoint = { x: ROADMAP_CENTER_X, y: ROADMAP_TOP_PADDING + usableHeight + ROADMAP_BOTTOM_PADDING / 2 };

  const allPoints = [startPoint, ...nodePositions, endPoint];

  let pathD = `M ${allPoints[0].x} ${allPoints[0].y}`;
  for (let i = 0; i < allPoints.length - 1; i++) {
    const current = allPoints[i];
    const next = allPoints[i + 1];
    const midY = (current.y + next.y) / 2;
    pathD += ` C ${current.x} ${midY}, ${next.x} ${midY}, ${next.x} ${next.y}`;
  }

  // Build green progress path (from start through completed chapters)
  // completedCount chapters means the road is green from start up to the (completedCount)th node
  let progressPathD = '';
  if (completedCount > 0) {
    const progressPoints = [startPoint, ...nodePositions.slice(0, completedCount)];
    progressPathD = `M ${progressPoints[0].x} ${progressPoints[0].y}`;
    for (let i = 0; i < progressPoints.length - 1; i++) {
      const current = progressPoints[i];
      const next = progressPoints[i + 1];
      const midY = (current.y + next.y) / 2;
      progressPathD += ` C ${current.x} ${midY}, ${next.x} ${midY}, ${next.x} ${next.y}`;
    }
  }

  // All chapters done = road green all the way to the flag
  const allDone = completedCount >= nodeCount;

  return (
    <svg
      width={ROADMAP_SVG_WIDTH}
      height={height}
      viewBox={`0 0 ${ROADMAP_SVG_WIDTH} ${height}`}
      className="absolute left-1/2 -translate-x-1/2 top-0"
      style={{ zIndex: 0 }}
    >
      {/* Road background */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="rgba(255,255,255,0.03)"
        strokeWidth={52}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      />

      {/* Road edges */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      />

      {/* Center dashed line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={2}
        strokeDasharray="8 14"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.5, ease: 'easeInOut', delay: 0.3 }}
      />

      {/* Green progress overlay — illuminates completed road sections */}
      {progressPathD && (
        <motion.path
          d={progressPathD}
          fill="none"
          stroke="rgba(63, 185, 80, 0.15)"
          strokeWidth={48}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      )}
      {progressPathD && (
        <motion.path
          d={progressPathD}
          fill="none"
          stroke="rgba(63, 185, 80, 0.4)"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      )}

      {/* Flag endpoint — solid green */}
      <motion.circle
        cx={endPoint.x}
        cy={endPoint.y}
        r="24"
        fill={allDone ? '#3fb950' : '#1c2128'}
        stroke="#3fb950"
        strokeWidth={3}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2.3, duration: 0.5 }}
      />
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2.5, duration: 0.4 }}
      >
        <g transform={`translate(${endPoint.x - 7}, ${endPoint.y - 8})`}>
          <line x1="2" y1="0" x2="2" y2="16" stroke={allDone ? '#ffffff' : '#3fb950'} strokeWidth="2" strokeLinecap="round" />
          <path d="M 2 0 L 13 3.5 L 2 7 Z" fill={allDone ? '#ffffff' : '#3fb950'} />
        </g>
      </motion.g>
    </svg>
  );
}
