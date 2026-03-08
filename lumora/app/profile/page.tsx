'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Target, Award, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useProgressStore } from '@/lib/store/useProgressStore';

const levelColors: Record<string, string> = {
  beginner: 'bg-accent-green/15 text-accent-green border-accent-green/20',
  intermediate: 'bg-accent-blue/15 text-accent-blue border-accent-blue/20',
  advanced: 'bg-accent-purple/15 text-accent-purple border-accent-purple/20',
  expert: 'bg-accent-orange/15 text-accent-orange border-accent-orange/20',
};

export default function ProfilePage() {
  const router = useRouter();
  const { userProfile, endGoal, roadmap, savedStudyList } = useSessionStore();
  const { completedChapters } = useProgressStore();

  const chapters = roadmap?.chapters ?? [];

  return (
    <div className="min-h-screen pt-14 px-4 md:px-6 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-text-dim hover:text-text-primary text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* User header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-full bg-accent-cyan/15 border-2 border-accent-cyan/30 flex items-center justify-center text-accent-cyan font-bold text-xl">
              {userProfile?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{userProfile?.name || 'User'}</h1>
              <p className="text-text-dim text-sm">{userProfile?.background?.slice(0, 80) || 'No profile loaded'}...</p>
            </div>
          </div>
        </motion.div>

        {/* Skill Matrix */}
        {userProfile?.skills && userProfile.skills.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
              <Award className="w-5 h-5 text-accent-cyan" />
              Skill Matrix
            </h2>
            <div className="space-y-3">
              {userProfile.skills.map((skill, i) => (
                <div key={i} className="bg-bg-surface border border-white/8 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">{skill.skill}</span>
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full border capitalize',
                      levelColors[skill.level] || levelColors.beginner
                    )}>
                      {skill.level}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-accent-cyan rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.confidence * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                    />
                  </div>
                  <p className="text-text-dim text-xs mt-1">{Math.round(skill.confidence * 100)}% confidence</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Learning Goals */}
        {endGoal && (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
              <Target className="w-5 h-5 text-accent-green" />
              Learning Goals
            </h2>
            <div className="bg-bg-surface border border-white/8 rounded-lg p-5">
              <h3 className="text-white font-semibold text-sm mb-1">{endGoal.title}</h3>
              <p className="text-text-dim text-xs leading-relaxed">{endGoal.description}</p>
              {chapters.length > 0 && (
                <p className="text-text-secondary text-xs mt-3">
                  {completedChapters.length}/{chapters.length} chapters completed
                </p>
              )}
            </div>
          </motion.section>
        )}

        {/* Completed Courses */}
        {completedChapters.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-10"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
              <BookOpen className="w-5 h-5 text-accent-purple" />
              Completed Chapters
            </h2>
            <div className="space-y-2">
              {chapters
                .filter(ch => completedChapters.includes(ch.id))
                .map(ch => (
                  <div key={ch.id} className="bg-bg-surface border border-white/8 rounded-lg px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-white text-sm font-medium">Chapter {ch.id}: {ch.title}</span>
                      <span className="text-text-dim text-xs ml-2">{ch.estimated_minutes} min</span>
                    </div>
                    <span className="text-accent-green text-xs font-medium">Completed</span>
                  </div>
                ))}
            </div>
          </motion.section>
        )}

        {/* Saved Lists */}
        {savedStudyList && (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-10"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
              <List className="w-5 h-5 text-accent-orange" />
              Saved Lists
            </h2>
            <button
              onClick={() => router.push('/further-study')}
              className="w-full bg-bg-surface border border-white/8 rounded-lg px-4 py-3 flex items-center justify-between hover:border-white/15 transition-colors text-left"
            >
              <div>
                <span className="text-white text-sm font-medium">Further Study: {endGoal?.title || 'Resources'}</span>
                <p className="text-text-dim text-xs">4 resources saved</p>
              </div>
              <span className="text-accent-cyan text-xs font-medium">View</span>
            </button>
          </motion.section>
        )}
      </div>
    </div>
  );
}
