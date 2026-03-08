'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Check, X, Clock, Send, Flag, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RoadmapSVG } from '@/components/roadmap/RoadmapSVG';
import { RoadmapNode } from '@/components/roadmap/RoadmapNode';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useProgressStore } from '@/lib/store/useProgressStore';
import { useCourseStore } from '@/lib/store/useCourseStore';
import { adjustRoadmap } from '@/lib/api/roadmap';
import { generateCourse, streamCourse } from '@/lib/api/course';
import { flags } from '@/lib/config';
import type { Chapter } from '@/lib/types/roadmap';

export default function RoadmapPage() {
  const router = useRouter();
  const { roadmap, endGoal, startingPoint, setCurrentChapterId, setRoadmap } = useSessionStore();
  const { completedChapters } = useProgressStore();
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [showAdjustChat, setShowAdjustChat] = useState(false);
  const [adjustMessage, setAdjustMessage] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [adjustHistory, setAdjustHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

  const chapters = roadmap?.chapters ?? [];
  const roadmapHeight = Math.max(900, chapters.length * 180 + 250);
  const hasStartedLearning = completedChapters.length > 0;

  const currentChapterIndex = useMemo(() => {
    for (let i = 0; i < chapters.length; i++) {
      if (!completedChapters.includes(chapters[i].id)) return i;
    }
    return chapters.length;
  }, [chapters, completedChapters]);

  const courseStore = useCourseStore();

  const handleStartLearning = async () => {
    const chapter = chapters[currentChapterIndex] || chapters[0];
    if (!chapter) return;

    setCurrentChapterId(chapter.id);

    if (!flags.useMocks && !courseStore.courseId) {
      // Trigger course generation via real API
      try {
        const apiRoadmapRaw = sessionStorage.getItem('api_roadmap');
        const apiGoal = sessionStorage.getItem('api_goal') || endGoal?.title || roadmap?.title || '';
        const apiRoadmap = apiRoadmapRaw ? JSON.parse(apiRoadmapRaw) : null;

        if (apiRoadmap) {
          courseStore.setGenerating(true);
          courseStore.setApiRoadmap(apiRoadmap);

          const courseId = await generateCourse({
            goal: apiGoal,
            roadmap: { modules: apiRoadmap },
            userId: 'default-user',
            expertise: 'beginner',
          });

          courseStore.setCourseId(courseId);

          // Start SSE stream in background (fire-and-forget)
          streamCourse(courseId, {
            onChapterReady: (moduleIdx, chapterIdx, content) => {
              const flatId = useCourseStore.getState().getFlatChapterId(moduleIdx, chapterIdx);
              useCourseStore.getState().addChapter(flatId, content);
            },
            onChapterFailed: (moduleIdx, chapterIdx) => {
              const flatId = useCourseStore.getState().getFlatChapterId(moduleIdx, chapterIdx);
              useCourseStore.getState().markFailed(flatId);
            },
            onComplete: () => {
              useCourseStore.getState().markComplete();
            },
            onError: (error) => {
              console.error('SSE stream error:', error);
            },
          }).catch((err) => {
            console.error('Stream failed:', err);
            useCourseStore.getState().markComplete();
          });
        }
      } catch (err) {
        console.error('Course generation failed:', err);
        courseStore.setGenerating(false);
      }
    }

    router.push('/learn');
  };

  const handleNodeClick = (chapter: Chapter) => {
    setSelectedChapter(selectedChapter?.id === chapter.id ? null : chapter);
  };

  const handleStartChapter = (chapter: Chapter) => {
    setCurrentChapterId(chapter.id);
    router.push('/learn');
  };

  const handleOpenAdjust = () => {
    setShowAdjustChat(true);
    if (adjustHistory.length === 0) {
      setAdjustHistory([{
        role: 'assistant',
        content: "What would you like to change about the roadmap? You can ask me to modify specific chapters, reorder topics, add more practical content, skip sections you already know, etc."
      }]);
    }
  };

  const handleSendAdjustment = async () => {
    if (!adjustMessage.trim() || !roadmap || isAdjusting) return;

    const userMsg = adjustMessage.trim();
    setAdjustHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setAdjustMessage('');
    setIsAdjusting(true);

    try {
      // Close modal and show full-page loading
      setShowAdjustChat(false);
      setIsRegenerating(true);

      const adjusted = await adjustRoadmap(
        roadmap.roadmap_id,
        userMsg,
        {
          startingPoint: startingPoint || { familiar_concepts: [], level: 'beginner' },
          endGoal: endGoal || { title: roadmap.title, description: '' },
          currentRoadmap: roadmap,
        }
      );

      setRoadmap(adjusted);
      setAdjustHistory(prev => [...prev, {
        role: 'assistant',
        content: "Done! I've updated the roadmap based on your feedback."
      }]);
    } catch {
      setAdjustHistory(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, something went wrong. Try again?"
      }]);
    }

    setIsAdjusting(false);
    setIsRegenerating(false);
  };

  const totalMinutes = chapters.reduce((acc, ch) => acc + ch.estimated_minutes, 0);

  if (!roadmap) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-14">
        <div className="text-center">
          <p className="text-text-secondary mb-4">No roadmap generated yet.</p>
          <Button onClick={() => router.push('/chat')} className="bg-accent-blue text-white rounded-xl">
            Start a conversation
          </Button>
        </div>
      </div>
    );
  }

  // Full-page regenerating state
  if (isRegenerating) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-14">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-accent-cyan/20 border-t-accent-cyan"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          />
          <h2 className="text-xl font-semibold text-text-primary mb-2">Regenerating your roadmap</h2>
          <p className="text-text-secondary text-sm">Applying your changes...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-14 pb-16">
      {/* Header */}
      <div className="border-b border-white/5 px-4 md:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">
              {roadmap.title}
            </h1>
            {endGoal && (
              <p className="text-text-secondary text-sm mb-4">{endGoal.description}</p>
            )}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-text-dim text-sm">
                <Clock className="w-4 h-4" />
                <span>{totalMinutes} min total</span>
              </div>
              <div className="text-text-dim text-sm">
                {chapters.length} chapters
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Roadmap visualization */}
      <div className="relative max-w-4xl mx-auto px-2 md:px-6">
        <div className="relative" style={{ height: roadmapHeight }}>
          <RoadmapSVG nodeCount={chapters.length} height={roadmapHeight} completedCount={completedChapters.length} />

          {chapters.map((chapter, i) => (
            <RoadmapNode
              key={chapter.id}
              chapter={chapter}
              index={i}
              totalCount={chapters.length}
              roadmapHeight={roadmapHeight}
              isCompleted={completedChapters.includes(chapter.id)}
              isCurrent={i === currentChapterIndex}
              isLocked={i > currentChapterIndex && !hasStartedLearning}
              onClick={() => handleNodeClick(chapter)}
            />
          ))}
        </div>
      </div>

      {/* End-of-roadmap summary card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.6, duration: 0.5 }}
        className="max-w-md mx-auto px-4 py-10"
      >
        <div className="bg-bg-surface border border-white/8 rounded-lg p-6 relative">
          {/* Further Study shortcut */}
          <div className="absolute top-4 right-4 group">
            <button
              onClick={() => router.push('/further-study')}
              className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 hover:bg-pink-500/20 hover:text-pink-300 transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <span className="absolute bottom-full right-0 mb-2 px-2.5 py-1 rounded-md bg-white/90 text-[#0d1117] text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Skip to Further Study
            </span>
          </div>

          {/* Flag + title */}
          <div className="flex items-center gap-3 mb-4 pr-10">
            <div className="w-10 h-10 rounded-full bg-accent-green/10 border-2 border-accent-green/40 flex items-center justify-center shrink-0">
              <Flag className="w-5 h-5 text-accent-green" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">End of Roadmap</h3>
              <p className="text-text-dim text-xs">{chapters.length} chapters &middot; {totalMinutes} min total</p>
            </div>
          </div>

          {/* Goal summary */}
          {endGoal && (
            <div className="mb-5">
              <p className="text-text-secondary text-sm leading-relaxed">{endGoal.description}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleStartLearning}
              className="w-full py-2.5 rounded-lg bg-accent-green text-white font-medium text-sm hover:bg-accent-green/90 transition-colors"
            >
              {hasStartedLearning ? 'Continue Learning' : "Let's Go!"}
            </button>

            <button
              onClick={handleOpenAdjust}
              className="w-full py-2.5 rounded-lg bg-bg-elevated text-text-secondary font-medium text-sm hover:text-white transition-colors border border-white/8"
            >
              Adjust Roadmap
            </button>
          </div>
        </div>
      </motion.div>

      {/* Selected chapter detail panel */}
      <AnimatePresence>
        {selectedChapter && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-14 right-0 bottom-0 w-full md:w-80 bg-bg-surface border-l border-white/5 p-6 z-50 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">
                Chapter {selectedChapter.id}
              </h3>
              <button onClick={() => setSelectedChapter(null)} className="text-text-dim hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h4 className="text-xl font-bold text-text-primary mb-3">
              {selectedChapter.title}
            </h4>
            <p className="text-text-secondary text-sm mb-4">
              {selectedChapter.summary}
            </p>

            <div className="flex items-center gap-2 text-text-dim text-sm mb-6">
              <Clock className="w-4 h-4" />
              <span>{selectedChapter.estimated_minutes} minutes</span>
            </div>

            {!completedChapters.includes(selectedChapter.id) && (
              <Button
                onClick={() => handleStartChapter(selectedChapter)}
                className="w-full bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl gap-2"
              >
                <Play className="w-4 h-4" />
                Start Chapter
              </Button>
            )}
            {completedChapters.includes(selectedChapter.id) && (
              <div className="text-accent-green text-sm font-medium flex items-center gap-2">
                <Check className="w-4 h-4" /> Completed
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adjust roadmap chat modal */}
      <AnimatePresence>
        {showAdjustChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
            onClick={() => setShowAdjustChat(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-bg-surface border border-white/5 rounded-t-3xl md:rounded-3xl w-full md:max-w-lg md:mx-4 flex flex-col"
              style={{ maxHeight: '80vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Adjust Roadmap</h3>
                  <p className="text-text-dim text-xs">Describe what you'd like to change</p>
                </div>
                <button onClick={() => setShowAdjustChat(false)} className="text-text-dim hover:text-text-primary p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-[200px]">
                {adjustHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-accent-blue/25 text-text-primary rounded-br-md'
                        : 'bg-bg-elevated text-text-secondary rounded-bl-md'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-white/5">
                <div className="flex items-center gap-2 bg-bg-elevated rounded-2xl px-3 py-1.5">
                  <input
                    type="text"
                    value={adjustMessage}
                    onChange={(e) => setAdjustMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendAdjustment()}
                    placeholder="e.g., Change chapter 3 to practical examples..."
                    className="flex-1 bg-transparent text-text-primary placeholder:text-text-dim text-sm py-2 focus:outline-none"
                    disabled={isAdjusting}
                    autoFocus
                  />
                  <button
                    onClick={handleSendAdjustment}
                    disabled={!adjustMessage.trim() || isAdjusting}
                    className="p-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white disabled:opacity-30 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
