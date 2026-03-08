'use client';

import { motion } from 'framer-motion';
import type { TextContent } from '@/lib/types/module';

interface TextModuleProps {
  content: TextContent;
  onComplete: () => void;
}

export function TextModule({ content, onComplete }: TextModuleProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-text-primary">{content.title}</h3>

      <div className="prose prose-invert max-w-none">
        {content.body.split('\n\n').map((paragraph, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            {paragraph.startsWith('- ') || paragraph.startsWith('1.') ? (
              <ul className="space-y-2 my-4">
                {paragraph.split('\n').map((line, j) => (
                  <li key={j} className="text-text-secondary text-sm leading-relaxed flex items-start gap-2">
                    <span className="text-accent-cyan mt-1">•</span>
                    <span dangerouslySetInnerHTML={{ __html: formatText(line.replace(/^[-\d.]+\s*/, '')) }} />
                  </li>
                ))}
              </ul>
            ) : (
              <p
                className="text-text-secondary text-sm leading-relaxed mb-4"
                dangerouslySetInnerHTML={{ __html: formatText(paragraph) }}
              />
            )}
          </motion.div>
        ))}
      </div>

      <motion.button
        onClick={onComplete}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3 rounded-xl font-medium text-sm bg-accent-blue hover:bg-accent-blue/90 text-white glow-blue-subtle transition-all"
      >
        Continue
      </motion.button>
    </div>
  );
}

function formatText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-text-primary font-semibold">$1</strong>')
    .replace(/`(.*?)`/g, '<code class="bg-bg-elevated px-1.5 py-0.5 rounded text-accent-cyan text-xs font-mono">$1</code>')
    .replace(/_(.*?)_/g, '<em>$1</em>');
}
