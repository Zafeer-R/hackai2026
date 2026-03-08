'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MCQContent } from '@/lib/types/module';

interface MCQModuleProps {
  content: MCQContent;
  moduleId: string;
  onComplete: (correct: boolean) => void;
}

export function MCQModule({ content, moduleId, onComplete }: MCQModuleProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = selectedIndex === content.correct_index;

  const handleSubmit = () => {
    if (selectedIndex === null) return;
    setSubmitted(true);
  };

  const handleRetry = () => {
    setSelectedIndex(null);
    setSubmitted(false);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-text-primary">{content.question}</h3>

      <div className="space-y-3">
        {content.options.map((option, i) => {
          const isSelected = selectedIndex === i;
          const isCorrectOption = i === content.correct_index;

          let borderClass = 'border-white/5 hover:border-white/15';
          let bgClass = 'bg-bg-surface';

          if (submitted) {
            if (isCorrectOption) {
              borderClass = 'border-accent-green/50';
              bgClass = 'bg-accent-green/10';
            } else if (isSelected && !isCorrectOption) {
              borderClass = 'border-accent-red/50';
              bgClass = 'bg-accent-red/10';
            }
          } else if (isSelected) {
            borderClass = 'border-accent-blue/50';
            bgClass = 'bg-accent-blue/10';
          }

          return (
            <motion.button
              key={i}
              onClick={() => !submitted && setSelectedIndex(i)}
              whileHover={!submitted ? { scale: 1.01 } : {}}
              whileTap={!submitted ? { scale: 0.99 } : {}}
              className={cn(
                'w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 flex items-center gap-3',
                borderClass,
                bgClass,
                submitted && 'cursor-default',
                !submitted && 'cursor-pointer'
              )}
            >
              <span className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium shrink-0',
                isSelected && !submitted ? 'bg-accent-blue/20 text-accent-blue' : 'bg-bg-elevated text-text-dim'
              )}>
                {submitted && isCorrectOption ? (
                  <Check className="w-4 h-4 text-accent-green" />
                ) : submitted && isSelected && !isCorrectOption ? (
                  <X className="w-4 h-4 text-accent-red" />
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </span>
              <span className={cn(
                'text-sm',
                submitted && isCorrectOption ? 'text-accent-green' : 'text-text-primary'
              )}>
                {option}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Submit button */}
      {!submitted && (
        <motion.button
          onClick={handleSubmit}
          disabled={selectedIndex === null}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'w-full py-3 rounded-xl font-medium text-sm transition-all',
            selectedIndex !== null
              ? 'bg-accent-blue hover:bg-accent-blue/90 text-white'
              : 'bg-bg-elevated text-text-dim cursor-not-allowed'
          )}
        >
          Submit Answer
        </motion.button>
      )}

      {/* Feedback + action buttons */}
      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div
            className={cn(
              'p-4 rounded-xl border text-sm',
              isCorrect
                ? 'bg-accent-green/10 border-accent-green/20'
                : 'bg-accent-red/10 border-accent-red/20'
            )}
          >
            {isCorrect ? (
              <p className="font-medium text-accent-green">Correct!</p>
            ) : (
              <p className="font-medium text-accent-red mb-1">Not quite.</p>
            )}
            <p className="text-text-secondary mt-1">{content.explanation}</p>
          </div>

          <div className="flex gap-3">
            {!isCorrect && (
              <button
                onClick={handleRetry}
                className="flex-1 py-3 rounded-xl font-medium text-sm bg-bg-elevated text-text-secondary hover:text-white border border-white/8 transition-colors"
              >
                Try Again
              </button>
            )}
            <button
              onClick={() => onComplete(isCorrect)}
              className={cn(
                'flex-1 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors',
                isCorrect
                  ? 'bg-accent-green text-white hover:bg-accent-green/90'
                  : 'bg-bg-elevated text-text-secondary hover:text-white border border-white/8'
              )}
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
