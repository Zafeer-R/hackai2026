'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled = false, placeholder = 'Type your message...' }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep focus on the textarea across re-renders
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  });

  const handleSend = () => {
    if (!message.trim() || disabled) return;
    onSend(message.trim());
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 bg-bg-surface border border-white/5 rounded-3xl p-2">
      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center justify-center rounded-xl h-9 w-9 text-text-dim hover:text-accent-purple shrink-0 disabled:opacity-50 cursor-not-allowed"
        >
          <Mic className="w-5 h-5" />
        </TooltipTrigger>
        <TooltipContent>Voice input coming soon</TooltipContent>
      </Tooltip>

      <textarea
        ref={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 bg-transparent text-text-primary placeholder:text-text-dim text-sm resize-none focus:outline-none py-2 px-2 max-h-32"
        style={{ minHeight: '2rem' }}
      />

      <Button
        onClick={handleSend}
        disabled={!message.trim() || disabled}
        size="icon"
        className="bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl shrink-0 disabled:opacity-30"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}
