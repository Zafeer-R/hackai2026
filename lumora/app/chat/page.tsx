'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { flags } from '@/lib/config';
import { sendChatMessage, resetChatMockIndex } from '@/lib/api/chat';
import { ChatSocket, openNgrokWarning } from '@/lib/api/chatSocket';
import { generateRoadmap } from '@/lib/api/roadmap';
import type { ChatMessage, SuggestedGoal, DetectedStartingPoint } from '@/lib/types/chat';
import type { WSResponse } from '@/lib/api/chatSocket';

export default function ChatPage() {
  const router = useRouter();
  const { sessionId, userProfile, setStartingPoint, setEndGoal, setRoadmap } = useSessionStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const socketRef = useRef<ChatSocket | null>(null);

  // Mock-only state
  const [suggestedGoal, setSuggestedGoal] = useState<SuggestedGoal | null>(null);
  const [detectedStartingPoint, setDetectedStartingPoint] = useState<DetectedStartingPoint | null>(null);

  // Real API: pending goal confirmation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingGoal, setPendingGoal] = useState<{ title: string; rawRoadmap: any } | null>(null);

  // Connection state for ngrok workaround
  const [needsNgrokAuth, setNeedsNgrokAuth] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Handle incoming WebSocket messages
  const handleWSResponse = useCallback((data: WSResponse) => {
    setIsTyping(false);

    if (data.type === 'message') {
      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.text,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } else if (data.type === 'goal_complete') {
      // Server extracted the goal and generated a roadmap — show confirmation first
      const goalTitle = data.goal?.goal || 'Learning Goal';

      // Normalize raw roadmap: may be array of modules or wrapped in object
      const rawRoadmap = Array.isArray(data.roadmap)
        ? data.roadmap
        : (data.roadmap?.modules || data.roadmap?.roadmap || []);

      // Show a confirmation message from the assistant
      const summaryLines = Array.isArray(rawRoadmap)
        ? rawRoadmap.map((mod: { title: string; chapters?: Array<{ title: string }> }) =>
            `${mod.title} (${mod.chapters?.length || 0} chapters)`
          ).join(', ')
        : '';

      const confirmMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I've mapped out your learning path for **${goalTitle}**!\n\nHere's what I've prepared: ${summaryLines}.\n\nReady to see your roadmap?`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, confirmMsg]);

      // Store pending goal for confirmation
      setPendingGoal({ title: goalTitle, rawRoadmap });
    }
  }, []);

  // Connect/reconnect WebSocket
  const connectWebSocket = useCallback(() => {
    const socket = new ChatSocket();
    socketRef.current = socket;
    const userId = sessionId || crypto.randomUUID();

    socket.onMessage(handleWSResponse);
    setNeedsNgrokAuth(false);

    socket.connect(userId).then(() => {
      setIsTyping(true);
      // Clear any previous error messages
      setMessages(prev => prev.filter(m => !m.content.includes('connect to the server')));
    }).catch(() => {
      setIsTyping(false);
      setNeedsNgrokAuth(true);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Couldn\'t connect to the server. Please click "Connect" below to authorize the connection, then come back and click "Retry".',
        timestamp: Date.now(),
      };
      setMessages(prev => {
        if (prev.some(m => m.content.includes('connect to the server'))) return prev;
        return [...prev, errorMessage];
      });
    });
  }, [sessionId, handleWSResponse]);

  const handleNgrokConnect = () => {
    openNgrokWarning();
  };

  const handleRetryConnection = () => {
    connectWebSocket();
  };

  // Initialize
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (flags.useMocks) {
      resetChatMockIndex();
      const sendGreeting = async () => {
        setIsTyping(true);
        const response = await sendChatMessage(sessionId || '', '__greeting__', userProfile);
        setIsTyping(false);
        const aiMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.reply,
          timestamp: Date.now(),
        };
        setMessages([aiMessage]);
        if (response.detected_starting_point) {
          setDetectedStartingPoint(response.detected_starting_point);
        }
      };
      sendGreeting();
    } else {
      // WebSocket — connect to ngrok backend
      connectWebSocket();
    }

    return () => {
      socketRef.current?.disconnect();
    };
  }, [sessionId, userProfile, handleWSResponse, connectWebSocket]);

  const handleSend = async (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    if (flags.useMocks) {
      const response = await sendChatMessage(sessionId || '', content, userProfile);
      setIsTyping(false);
      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.reply,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMessage]);
      if (response.detected_starting_point) setDetectedStartingPoint(response.detected_starting_point);
      if (response.suggested_goal) setSuggestedGoal(response.suggested_goal);
      if (response.conversation_state === 'confirmed' && response.suggested_goal) {
        handleMockConfirmGoal(response.suggested_goal, response.detected_starting_point);
      }
    } else {
      // Send over WebSocket — response arrives via handleWSResponse
      socketRef.current?.send(content);
    }
  };

  // Mock-only: confirm goal and generate roadmap
  const handleMockConfirmGoal = async (goal?: SuggestedGoal, sp?: DetectedStartingPoint | null) => {
    const finalGoal = goal || suggestedGoal;
    const finalSP = sp || detectedStartingPoint;
    if (!finalGoal) return;

    setEndGoal(finalGoal);
    if (finalSP) setStartingPoint(finalSP);
    setIsGenerating(true);
    setSuggestedGoal(null);

    const roadmap = await generateRoadmap(
      finalSP || { familiar_concepts: [], level: 'beginner' },
      finalGoal
    );
    setRoadmap(roadmap);
    setIsGenerating(false);
    router.push('/roadmap');
  };

  // Real API: confirm goal and navigate to roadmap
  const handleConfirmGoal = () => {
    if (!pendingGoal) return;

    const { title: goalTitle, rawRoadmap } = pendingGoal;
    setEndGoal({ title: goalTitle, description: goalTitle });

    const accentColors = ['cyan', 'blue', 'purple', 'green', 'orange', 'red'];
    let chapterId = 1;
    const modules = Array.isArray(rawRoadmap) ? rawRoadmap : [];
    const chapters = modules.flatMap((mod: { title: string; chapters: Array<{ title: string }> }) =>
      (mod.chapters || []).map((ch: { title: string }) => ({
        id: chapterId++,
        title: ch.title,
        summary: `Part of: ${mod.title}`,
        estimated_minutes: 15,
        accent_color: accentColors[(chapterId - 2) % accentColors.length],
      }))
    );

    const roadmap = {
      roadmap_id: crypto.randomUUID(),
      title: goalTitle,
      chapters,
    };

    setRoadmap(roadmap);
    sessionStorage.setItem('api_roadmap', JSON.stringify(rawRoadmap));
    sessionStorage.setItem('api_goal', goalTitle);

    setPendingGoal(null);
    setIsGenerating(true);
    setTimeout(() => {
      router.push('/roadmap');
    }, 800);
  };

  const handleAdjustGoal = () => {
    setSuggestedGoal(null);
    setPendingGoal(null);
    if (flags.useMocks) resetChatMockIndex(1);
    const adjustMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: "I'd like to adjust the learning goal a bit.",
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, adjustMessage]);
    if (!flags.useMocks && socketRef.current?.isConnected) {
      setIsTyping(true);
      socketRef.current.send("I'd like to adjust the learning goal a bit.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-14">
      {/* Header */}
      <div className="border-b border-white/5 px-4 md:px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-lg font-semibold text-text-primary">
            {isGenerating ? 'Generating your roadmap...' : "Let's find your learning path"}
          </h1>
          <p className="text-text-dim text-sm">
            {userProfile?.name || 'Tell me what you want to learn'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <ChatBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              isLatest={i === messages.length - 1}
            />
          ))}

          {isTyping && <TypingIndicator />}

          {/* Ngrok connection fix */}
          {needsNgrokAuth && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="my-4"
            >
              <div className="bg-bg-surface border border-accent-orange/20 rounded-2xl p-5">
                <p className="text-text-secondary text-sm mb-3">
                  The server requires a one-time browser authorization.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleNgrokConnect}
                    className="px-4 py-2 rounded-lg bg-accent-orange text-white text-sm font-medium hover:bg-accent-orange/90 transition-colors"
                  >
                    Connect
                  </button>
                  <button
                    onClick={handleRetryConnection}
                    className="px-4 py-2 rounded-lg bg-accent-cyan text-white text-sm font-medium hover:bg-accent-cyan/90 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Goal confirmation — Mock mode */}
          {flags.useMocks && suggestedGoal && !isGenerating && (
            <div className="my-4">
              <div className="bg-bg-surface border border-accent-cyan/20 rounded-2xl p-5">
                <p className="text-text-secondary text-sm mb-1">Suggested goal:</p>
                <p className="text-white font-semibold mb-3">{suggestedGoal.title}</p>
                <p className="text-text-dim text-xs mb-4">{suggestedGoal.description}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMockConfirmGoal()}
                    className="px-4 py-2 rounded-lg bg-accent-cyan text-white text-sm font-medium hover:bg-accent-cyan/90 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleAdjustGoal}
                    className="px-4 py-2 rounded-lg bg-bg-elevated text-text-secondary text-sm font-medium hover:text-white transition-colors border border-white/8"
                  >
                    Adjust
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Goal confirmation — Real API */}
          {!flags.useMocks && pendingGoal && !isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="my-4"
            >
              <div className="bg-bg-surface border border-accent-cyan/20 rounded-2xl p-5">
                <p className="text-text-secondary text-sm mb-1">Your learning goal:</p>
                <p className="text-white font-semibold mb-3">{pendingGoal.title}</p>

                {/* Module/chapter summary */}
                {Array.isArray(pendingGoal.rawRoadmap) && pendingGoal.rawRoadmap.length > 0 && (
                  <div className="mb-4 space-y-1.5">
                    {pendingGoal.rawRoadmap.map((mod: { title: string; chapters?: Array<{ title: string }> }, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-accent-cyan text-xs mt-0.5">&#9679;</span>
                        <div>
                          <p className="text-text-secondary text-xs font-medium">{mod.title}</p>
                          {mod.chapters && mod.chapters.length > 0 && (
                            <p className="text-text-dim text-xs">
                              {mod.chapters.map((ch: { title: string }) => ch.title).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmGoal}
                    className="px-4 py-2 rounded-lg bg-accent-green text-white text-sm font-medium hover:bg-accent-green/90 transition-colors"
                  >
                    Looks good!
                  </button>
                  <button
                    onClick={handleAdjustGoal}
                    className="px-4 py-2 rounded-lg bg-bg-elevated text-text-secondary text-sm font-medium hover:text-white transition-colors border border-white/8"
                  >
                    Adjust
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center py-8"
            >
              <div className="flex items-center gap-3 bg-bg-surface border border-accent-cyan/20 rounded-2xl px-6 py-4 glow-cyan-subtle">
                <motion.div
                  className="w-5 h-5 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <span className="text-text-secondary text-sm">Crafting your personalized roadmap...</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/5 px-4 md:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSend={handleSend}
            disabled={isTyping || isGenerating || !!pendingGoal || (flags.useMocks && !!suggestedGoal)}
            placeholder={
              pendingGoal || (flags.useMocks && suggestedGoal)
                ? 'Confirm or adjust your goal above'
                : isGenerating
                ? 'Generating roadmap...'
                : 'Type your message...'
            }
          />
        </div>
      </div>
    </div>
  );
}
