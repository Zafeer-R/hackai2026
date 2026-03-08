'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isLatest?: boolean;
}

export function ChatBubble({ role, content, isLatest = false }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={isLatest ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[90%] md:max-w-[75%] rounded-3xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-accent-blue/25 text-text-primary rounded-br-md'
            : 'bg-bg-surface border border-white/5 text-text-primary rounded-bl-md'
        )}
      >
        {content}
      </div>
    </motion.div>
  );
}
