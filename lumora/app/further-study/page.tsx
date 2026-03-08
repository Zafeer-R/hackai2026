'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Video, BookOpen, FileText, GraduationCap, Check, Save, ArrowRight } from 'lucide-react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import furtherStudy from '@/mocks/further-study.json';
import type { StudyRecommendation } from '@/lib/types/study';

const typeConfig: Record<string, { icon: typeof Video; color: string; label: string }> = {
  video: { icon: Video, color: 'text-accent-red', label: 'Video' },
  book: { icon: BookOpen, color: 'text-accent-blue', label: 'Book' },
  article: { icon: FileText, color: 'text-accent-purple', label: 'Article' },
  course: { icon: GraduationCap, color: 'text-accent-green', label: 'Course' },
};

export default function FurtherStudyPage() {
  const router = useRouter();
  const { endGoal, savedStudyList, setSavedStudyList } = useSessionStore();
  const recommendations = furtherStudy.recommendations as StudyRecommendation[];

  return (
    <div className="min-h-screen pt-14 px-4 md:px-6 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-text-dim hover:text-text-primary text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Further Study
          </h1>
          {endGoal && (
            <p className="text-text-secondary text-sm">
              Resources to deepen your understanding of <span className="text-accent-cyan">{endGoal.title}</span>
            </p>
          )}
        </motion.div>

        {/* Resource cards */}
        <div className="space-y-4 mb-10">
          {recommendations.map((rec, i) => {
            const config = typeConfig[rec.type] || typeConfig.article;
            const Icon = config.icon;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="bg-bg-surface border border-white/8 rounded-lg p-5 flex items-start gap-4"
              >
                <div className={`w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0 ${config.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-white font-semibold text-sm">{rec.title}</h3>
                      <span className={`text-xs ${config.color} font-medium`}>{config.label}</span>
                    </div>
                    <a
                      href={rec.reference}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center text-text-dim hover:text-text-primary transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <p className="text-text-dim text-xs mt-2 leading-relaxed">{rec.reason}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Save list button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center pb-8"
        >
          <button
            onClick={() => setSavedStudyList(true)}
            disabled={savedStudyList}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-colors ${
              savedStudyList
                ? 'bg-accent-green/10 text-accent-green border border-accent-green/20 cursor-default'
                : 'bg-accent-blue text-white hover:bg-accent-blue/90'
            }`}
          >
            {savedStudyList ? (
              <>
                <Check className="w-4 h-4" />
                List Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save List to Profile
              </>
            )}
          </button>

          <button
            onClick={() => router.push('/recommended')}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm bg-bg-surface border border-white/8 text-text-secondary hover:text-white hover:border-white/15 transition-colors"
          >
            <GraduationCap className="w-4 h-4" />
            Explore Related Courses
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
