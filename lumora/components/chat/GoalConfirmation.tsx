'use client';

import { motion } from 'framer-motion';
import { Target, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SuggestedGoal, DetectedStartingPoint } from '@/lib/types/chat';

interface GoalConfirmationProps {
  goal: SuggestedGoal;
  startingPoint: DetectedStartingPoint | null;
  onConfirm: () => void;
  onAdjust: () => void;
}

export function GoalConfirmation({ goal, startingPoint, onConfirm, onAdjust }: GoalConfirmationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-bg-surface border border-accent-cyan/20 rounded-3xl p-6 max-w-lg mx-auto glow-cyan-subtle"
    >
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-accent-cyan" />
        <h3 className="text-lg font-semibold text-text-primary">Your Learning Goal</h3>
      </div>

      <h4 className="text-xl font-bold text-text-primary mb-2">{goal.title}</h4>
      <p className="text-text-secondary text-sm mb-4">{goal.description}</p>

      {startingPoint && (
        <div className="mb-5 p-3 bg-bg-elevated rounded-xl">
          <p className="text-text-dim text-xs uppercase tracking-wider mb-1">Starting from</p>
          <p className="text-text-secondary text-sm">
            Level: <span className="text-text-primary capitalize">{startingPoint.level}</span>
          </p>
          <p className="text-text-secondary text-sm">
            You know: {startingPoint.familiar_concepts.slice(0, 4).join(', ')}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={onConfirm}
          className="flex-1 bg-accent-green hover:bg-accent-green/90 text-white rounded-xl gap-2"
        >
          <Check className="w-4 h-4" />
          Looks great!
        </Button>
        <Button
          onClick={onAdjust}
          variant="outline"
          className="border-white/10 text-text-secondary hover:text-text-primary rounded-xl gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Adjust
        </Button>
      </div>
    </motion.div>
  );
}
