'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Clock, GraduationCap } from 'lucide-react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { generateRoadmap } from '@/lib/api/roadmap';
import coursesData from '@/mocks/recommended-courses.json';

const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  cyan: { bg: 'bg-accent-cyan/10', border: 'border-accent-cyan/20', text: 'text-accent-cyan' },
  blue: { bg: 'bg-accent-blue/10', border: 'border-accent-blue/20', text: 'text-accent-blue' },
  purple: { bg: 'bg-accent-purple/10', border: 'border-accent-purple/20', text: 'text-accent-purple' },
  green: { bg: 'bg-accent-green/10', border: 'border-accent-green/20', text: 'text-accent-green' },
  orange: { bg: 'bg-accent-orange/10', border: 'border-accent-orange/20', text: 'text-accent-orange' },
};

const accentLeftBorder: Record<string, string> = {
  cyan: 'border-l-accent-cyan',
  blue: 'border-l-accent-blue',
  purple: 'border-l-accent-purple',
  green: 'border-l-accent-green',
  orange: 'border-l-accent-orange',
};

export default function RecommendedPage() {
  const router = useRouter();
  const { endGoal, startingPoint, setEndGoal, setRoadmap } = useSessionStore();
  const [loadingCourse, setLoadingCourse] = useState<string | null>(null);

  const handleSelectCourse = async (course: typeof coursesData.courses[0]) => {
    setLoadingCourse(course.title);

    const goal = { title: course.title, description: course.description };
    setEndGoal(goal);

    try {
      const roadmap = await generateRoadmap(
        startingPoint || { familiar_concepts: [], level: 'beginner' },
        goal
      );
      setRoadmap(roadmap);
      router.push('/roadmap');
    } catch {
      setLoadingCourse(null);
    }
  };

  // Full-page loading state
  if (loadingCourse) {
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
          <h2 className="text-xl font-semibold text-text-primary mb-2">Generating your roadmap</h2>
          <p className="text-text-secondary text-sm">Preparing {loadingCourse}...</p>
        </motion.div>
      </div>
    );
  }

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

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Recommended Courses
          </h1>
          {endGoal && (
            <p className="text-text-secondary text-sm">
              Continue your journey after <span className="text-accent-cyan">{endGoal.title}</span>
            </p>
          )}
        </motion.div>

        {/* Course cards */}
        <div className="space-y-4 mb-10">
          {coursesData.courses.map((course, i) => {
            const colors = colorMap[course.accent_color] || colorMap.cyan;
            const leftBorder = accentLeftBorder[course.accent_color] || accentLeftBorder.cyan;

            return (
              <motion.button
                key={course.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                onClick={() => handleSelectCourse(course)}
                className={`w-full text-left bg-bg-surface border border-white/8 border-l-4 ${leftBorder} rounded-lg p-5 hover:border-white/15 transition-colors group`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                        <GraduationCap className={`w-4.5 h-4.5 ${colors.text}`} />
                      </div>
                      <h3 className="text-white font-semibold text-sm">{course.title}</h3>
                    </div>
                    <p className="text-text-dim text-xs leading-relaxed mb-3 pl-12">
                      {course.description}
                    </p>
                    <div className="flex items-center gap-3 pl-12">
                      <span className="flex items-center gap-1 text-text-dim text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        {course.estimated_minutes} min
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center text-text-dim group-hover:text-accent-cyan transition-colors mt-1">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
