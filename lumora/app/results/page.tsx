'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Trophy, Clock, Target, BookOpen, ArrowRight, GraduationCap } from 'lucide-react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useProgressStore } from '@/lib/store/useProgressStore';
import { accentColors } from '@/lib/constants';

const chapterAccents = [
  { border: 'border-l-accent-cyan', text: 'text-accent-cyan' },
  { border: 'border-l-accent-blue', text: 'text-accent-blue' },
  { border: 'border-l-accent-purple', text: 'text-accent-purple' },
  { border: 'border-l-accent-green', text: 'text-accent-green' },
  { border: 'border-l-accent-orange', text: 'text-accent-orange' },
  { border: 'border-l-accent-red', text: 'text-accent-red' },
];

export default function ResultsPage() {
  const router = useRouter();
  const { roadmap, endGoal } = useSessionStore();
  const { completedChapters, completedModules, quizScores } = useProgressStore();
  const resetSession = useSessionStore((s) => s.reset);
  const resetProgress = useProgressStore((s) => s.reset);

  const chapters = roadmap?.chapters ?? [];
  const totalMinutes = chapters.reduce((acc, ch) => acc + ch.estimated_minutes, 0);
  const avgScore = Object.values(quizScores).length > 0
    ? Math.round((Object.values(quizScores).reduce((a, b) => a + b, 0) / Object.values(quizScores).length) * 100)
    : 85;

  const handleStartNew = () => {
    resetSession();
    resetProgress();
    router.push('/');
  };

  const stats = [
    { icon: BookOpen, label: 'Chapters', value: `${completedChapters.length}/${chapters.length}`, color: 'text-accent-cyan', borderColor: 'border-l-accent-cyan' },
    { icon: Target, label: 'Modules', value: `${completedModules.length}`, color: 'text-accent-blue', borderColor: 'border-l-accent-blue' },
    { icon: Sparkles, label: 'Avg Score', value: `${avgScore}%`, color: 'text-accent-green', borderColor: 'border-l-accent-green' },
    { icon: Clock, label: 'Est. Time', value: `${totalMinutes}m`, color: 'text-accent-purple', borderColor: 'border-l-accent-purple' },
  ];

  return (
    <div className="min-h-screen pt-14 px-4 md:px-6 py-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        {/* Celebration header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-12"
        >
          <motion.div
            className="relative inline-block mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.3 }}
          >
            <div className="w-24 h-24 rounded-full bg-accent-green/20 flex items-center justify-center glow-green">
              <Trophy className="w-12 h-12 text-accent-green" />
            </div>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-accent-cyan rounded-full"
                initial={{ opacity: 0, x: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  x: [0, (Math.random() - 0.5) * 100],
                  y: [0, (Math.random() - 0.5) * 100],
                }}
                transition={{
                  duration: 1.5,
                  delay: 0.5 + i * 0.15,
                  ease: 'easeOut',
                }}
                style={{ top: '50%', left: '50%' }}
              />
            ))}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-2xl md:text-3xl font-bold text-text-primary mb-3"
          >
            Journey Complete!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-text-secondary text-lg"
          >
            You&apos;ve mastered <span className="text-accent-cyan font-semibold">{endGoal?.title || roadmap?.title || 'something amazing'}</span>
          </motion.p>
        </motion.div>

        {/* Stats cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-12"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + i * 0.1, duration: 0.4 }}
              className={`bg-bg-surface border border-white/8 border-l-4 ${stat.borderColor} rounded-xl p-4 text-center`}
            >
              <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
              <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
              <p className="text-text-dim text-xs">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Topics You've Mastered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-lg md:text-xl font-semibold text-text-primary mb-4">Topics You&apos;ve Mastered</h2>
          <div className="space-y-3">
            {chapters.map((ch, i) => {
              const accent = chapterAccents[i % chapterAccents.length];
              return (
                <motion.div
                  key={ch.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.3 + i * 0.06, duration: 0.3 }}
                  className={`bg-bg-surface border border-white/8 border-l-4 ${accent.border} rounded-lg px-5 py-4`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-white text-sm font-medium">
                      <span className={`${accent.text} mr-2`}>Ch {ch.id}</span>
                      {ch.title}
                    </h3>
                    <span className="text-text-dim text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {ch.estimated_minutes}m
                    </span>
                  </div>
                  <p className="text-text-dim text-xs leading-relaxed">{ch.summary}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Action cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="space-y-3 pb-12"
        >
          <h2 className="text-lg md:text-xl font-semibold text-text-primary mb-4">What&apos;s Next</h2>

          <button
            onClick={() => router.push('/further-study')}
            className="w-full bg-bg-surface border border-white/8 border-l-4 border-l-accent-cyan rounded-lg p-5 flex items-center gap-4 hover:border-white/15 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-accent-cyan/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-accent-cyan" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm">View Further Study</h3>
              <p className="text-text-dim text-xs">Curated resources to deepen your understanding</p>
            </div>
            <ArrowRight className="w-4 h-4 text-text-dim group-hover:text-accent-cyan transition-colors" />
          </button>

          <button
            onClick={() => router.push('/recommended')}
            className="w-full bg-bg-surface border border-white/8 border-l-4 border-l-accent-purple rounded-lg p-5 flex items-center gap-4 hover:border-white/15 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-accent-purple" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm">Explore Related Courses</h3>
              <p className="text-text-dim text-xs">Continue your learning journey with related topics</p>
            </div>
            <ArrowRight className="w-4 h-4 text-text-dim group-hover:text-accent-purple transition-colors" />
          </button>

          <button
            onClick={handleStartNew}
            className="w-full bg-bg-surface border border-white/8 border-l-4 border-l-accent-green rounded-lg p-5 flex items-center gap-4 hover:border-white/15 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-accent-green/10 flex items-center justify-center shrink-0">
              <ArrowRight className="w-5 h-5 text-accent-green" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm">Start Another Journey</h3>
              <p className="text-text-dim text-xs">Learn something completely new from scratch</p>
            </div>
            <ArrowRight className="w-4 h-4 text-text-dim group-hover:text-accent-green transition-colors" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
