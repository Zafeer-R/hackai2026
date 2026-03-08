'use client';

import { MCQModule } from './MCQModule';
import { TextModule } from './TextModule';
import type { Module, MCQContent, TextContent } from '@/lib/types/module';

interface ModuleRendererProps {
  module: Module;
  onComplete: (correct?: boolean) => void;
}

export function ModuleRenderer({ module, onComplete }: ModuleRendererProps) {
  switch (module.type) {
    case 1:
      return (
        <MCQModule
          content={module.content as MCQContent}
          moduleId={module.id}
          onComplete={(correct) => onComplete(correct)}
        />
      );
    case 4:
      return (
        <TextModule
          content={module.content as TextContent}
          onComplete={() => onComplete()}
        />
      );
    default:
      return (
        <div className="text-text-secondary text-center py-8">
          <p className="text-sm">Module type {module.type} not yet supported.</p>
          <button
            onClick={() => onComplete()}
            className="mt-4 text-accent-blue hover:underline text-sm"
          >
            Skip to next
          </button>
        </div>
      );
  }
}
