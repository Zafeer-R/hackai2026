'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Route, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModuleRenderer } from '@/components/modules/ModuleRenderer';
import { ChapterView } from '@/components/learn/ChapterView';
import { ProgressBar } from '@/components/progress/ProgressBar';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useProgressStore } from '@/lib/store/useProgressStore';
import { useCourseStore } from '@/lib/store/useCourseStore';
import { useActionLogStore } from '@/lib/store/useActionLogStore';
import { flags } from '@/lib/config';
import { getChapterModules } from '@/lib/api/modules';
import type { Module } from '@/lib/types/module';

export default function LearnPage() {
  const router = useRouter();
  const { roadmap, currentChapterId, setCurrentChapterId } = useSessionStore();
  const { completedModules, completeModule, completeChapter, completedChapters, currentModuleIndex, setCurrentModuleIndex } = useProgressStore();
  const { logWrongAnswer, enterModule, exitModule } = useActionLogStore();

  // Course store for real API content
  const courseChapters = useCourseStore((s) => s.chapters);
  const readyChapterIds = useCourseStore((s) => s.readyChapterIds);
  const failedChapterIds = useCourseStore((s) => s.failedChapterIds);
  const isGenerating = useCourseStore((s) => s.isGenerating);
  const isCourseComplete = useCourseStore((s) => s.isComplete);

  // Mock module state
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComplete, setShowComplete] = useState(false);

  const chapters = roadmap?.chapters ?? [];
  const currentChapter = chapters.find(ch => ch.id === currentChapterId);
  const chapterIndex = chapters.findIndex(ch => ch.id === currentChapterId);

  const useRealApi = !flags.useMocks;
  const chapterContent = currentChapterId ? courseChapters[currentChapterId] : undefined;
  const isChapterReady = currentChapterId ? readyChapterIds.includes(currentChapterId) : false;
  const isChapterFailed = currentChapterId ? failedChapterIds.includes(currentChapterId) : false;

  // Load mock modules (only in mock mode)
  useEffect(() => {
    if (!currentChapterId || useRealApi) {
      setLoading(false);
      return;
    }

    const loadModules = async () => {
      setLoading(true);
      const data = await getChapterModules(currentChapterId);
      setModules(data.modules as Module[]);
      setCurrentModuleIndex(0);
      setLoading(false);
    };

    loadModules();
  }, [currentChapterId, setCurrentModuleIndex, useRealApi]);

  useEffect(() => {
    if (flags.useMocks && modules.length > 0 && modules[currentModuleIndex]) {
      enterModule(modules[currentModuleIndex].id);
    }
  }, [currentModuleIndex, modules, enterModule]);

  const currentModule = modules[currentModuleIndex];
  const progress = flags.useMocks
    ? (modules.length > 0 ? (currentModuleIndex / modules.length) * 100 : 0)
    : (chapters.length > 0 ? (completedChapters.length / chapters.length) * 100 : 0);

  // Mock module complete handler
  const handleModuleComplete = useCallback((correct?: boolean) => {
    if (!currentModule) return;

    exitModule(currentModule.id);
    completeModule(currentModule.id);

    if (correct === false && currentModule.type === 1) {
      logWrongAnswer(currentModule.id, 'q1', -1);
    }

    if (currentModuleIndex < modules.length - 1) {
      setCurrentModuleIndex(currentModuleIndex + 1);
    } else {
      if (currentChapterId) completeChapter(currentChapterId);
      setShowComplete(true);
    }
  }, [currentModule, currentModuleIndex, modules.length, currentChapterId, exitModule, completeModule, logWrongAnswer, setCurrentModuleIndex, completeChapter]);

  // Real API chapter complete handler
  const handleChapterComplete = useCallback(() => {
    if (currentChapterId) completeChapter(currentChapterId);
    setShowComplete(true);
  }, [currentChapterId, completeChapter]);

  const handleNextChapter = () => {
    const nextIndex = chapterIndex + 1;
    if (nextIndex < chapters.length) {
      setCurrentChapterId(chapters[nextIndex].id);
      setShowComplete(false);
    } else {
      router.push('/results');
    }
  };

  if (!currentChapter) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-14">
        <div className="text-center">
          <p className="text-text-secondary mb-4">No chapter selected.</p>
          <Button onClick={() => router.push('/roadmap')} className="bg-accent-blue text-white rounded-xl">
            Back to Roadmap
          </Button>
        </div>
      </div>
    );
  }

  // Real API: waiting for chapter content (not loading if failed or complete)
  const showApiLoading = useRealApi && !isChapterReady && !isChapterFailed && !showComplete && !isCourseComplete;

  return (
    <div className="min-h-screen pt-14 flex flex-col">
      {/* Top bar */}
      <div className="border-b border-white/5 px-4 md:px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/roadmap')}
                className="text-text-dim hover:text-text-primary transition-colors"
              >
                <Route className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-sm font-semibold text-text-primary">
                  Chapter {currentChapter.id}: {currentChapter.title}
                </h1>
                <p className="text-text-dim text-xs">
                  {useRealApi
                    ? `${completedChapters.length} of ${chapters.length} chapters completed`
                    : `Module ${currentModuleIndex + 1} of ${modules.length}`
                  }
                </p>
              </div>
            </div>
          </div>
          <ProgressBar progress={progress} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 md:px-6 py-4 md:py-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {/* Loading states */}
          {(loading || showApiLoading) ? (
            <div className="flex flex-col items-center justify-center py-16">
              <motion.div
                className="w-8 h-8 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full mb-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              {showApiLoading && (
                <div className="text-center">
                  <p className="text-text-dim text-sm mb-2">
                    {isGenerating ? 'Generating chapter content...' : 'Waiting for content...'}
                  </p>
                  {readyChapterIds.length > 0 && (
                    <p className="text-text-dim text-xs">
                      {readyChapterIds.length} of {chapters.length} chapters ready
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : useRealApi && isChapterFailed && !chapterContent ? (
            /* Chapter generation failed */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-accent-red/10 flex items-center justify-center mb-4">
                <span className="text-accent-red text-xl">!</span>
              </div>
              <p className="text-text-secondary text-sm mb-2">This chapter couldn&apos;t be generated.</p>
              <p className="text-text-dim text-xs mb-6">Some content may not be available. You can skip to the next chapter.</p>
              <Button
                onClick={() => {
                  if (currentChapterId) completeChapter(currentChapterId);
                  handleNextChapter();
                }}
                className="bg-accent-blue text-white rounded-xl"
              >
                Skip to Next Chapter
              </Button>
            </div>
          ) : showComplete ? (
            /* Chapter complete screen */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-accent-green/20 flex items-center justify-center mx-auto mb-6 glow-green"
              >
                <span className="text-3xl">&#10003;</span>
              </motion.div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                Chapter Complete!
              </h2>
              <p className="text-text-secondary mb-8">
                You&apos;ve finished &quot;{currentChapter.title}&quot;
              </p>
              <Button
                onClick={handleNextChapter}
                className="bg-accent-green hover:bg-accent-green/90 text-white rounded-xl gap-2 px-8 glow-green-subtle"
              >
                {chapterIndex + 1 < chapters.length ? (
                  <>
                    Next Chapter
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    See Results
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </motion.div>
          ) : useRealApi && chapterContent ? (
            /* Real API: rich chapter view */
            <AnimatePresence mode="wait">
              <motion.div
                key={currentChapterId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ChapterView
                  content={chapterContent}
                  onComplete={handleChapterComplete}
                />
              </motion.div>
            </AnimatePresence>
          ) : currentModule ? (
            /* Mock mode: sequential modules */
            <AnimatePresence mode="wait">
              <motion.div
                key={currentModule.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ModuleRenderer
                  module={currentModule}
                  onComplete={handleModuleComplete}
                />
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>
      </div>
    </div>
  );
}
