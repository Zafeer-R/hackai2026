'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Award, ChevronDown, ChevronUp, Pencil, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { loadUserProfile } from '@/lib/api/user';
import type { UserProfile } from '@/lib/types/user';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const levelColors: Record<string, string> = {
  beginner: 'bg-accent-green/15 text-accent-green border-accent-green/20',
  intermediate: 'bg-accent-blue/15 text-accent-blue border-accent-blue/20',
  advanced: 'bg-accent-purple/15 text-accent-purple border-accent-purple/20',
  expert: 'bg-accent-orange/15 text-accent-orange border-accent-orange/20',
};

export default function WelcomePage() {
  const router = useRouter();
  const setUserProfile = useSessionStore((s) => s.setUserProfile);
  const setSessionId = useSessionStore((s) => s.setSessionId);
  const [isLoading, setIsLoading] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadUserProfile().then(setProfile);
  }, []);

  const handleBeginLearning = async () => {
    if (!profile) return;
    setIsLoading(true);
    // Clear sample run flag so real API is used
    sessionStorage.removeItem('lumora_sample_run');
    await new Promise(r => setTimeout(r, 400));
    setUserProfile(profile);
    setSessionId(crypto.randomUUID());
    router.push('/onboarding');
  };

  const handleSampleRun = async () => {
    if (!profile) return;
    setIsLoading(true);
    // Enable mock mode for this session
    sessionStorage.setItem('lumora_sample_run', 'true');
    await new Promise(r => setTimeout(r, 400));
    setUserProfile(profile);
    setSessionId(crypto.randomUUID());
    router.push('/onboarding');
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-8 h-8 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 md:px-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-accent-cyan/5 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-accent-purple/5 rounded-full blur-[128px] pointer-events-none" />

      <motion.div
        className="text-center max-w-lg w-full relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* User avatar + name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-3"
        >
          <div className="w-20 h-20 rounded-full bg-accent-cyan/15 border-2 border-accent-cyan/30 flex items-center justify-center text-accent-cyan font-bold text-3xl mx-auto mb-4">
            {profile.name.charAt(0)}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
            {profile.name}
          </h2>
        </motion.div>

        {/* Background */}
        <motion.p
          className="text-text-secondary text-sm mb-6 max-w-md mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {profile.background}
        </motion.p>

        {/* Social links */}
        <motion.div
          className="flex items-center justify-center gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          {profile.linkedin && (
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-surface border border-white/8 text-text-secondary hover:text-accent-blue hover:border-accent-blue/30 transition-colors text-sm"
            >
              <LinkedInIcon className="w-4 h-4" />
              LinkedIn
            </a>
          )}
          {profile.github && (
            <a
              href={profile.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-surface border border-white/8 text-text-secondary hover:text-white hover:border-white/20 transition-colors text-sm"
            >
              <GitHubIcon className="w-4 h-4" />
              GitHub
            </a>
          )}
        </motion.div>

        {/* View Skill Matrix toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowSkills(!showSkills)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-text-secondary hover:text-white text-sm transition-colors"
            >
              <Award className="w-4 h-4 text-accent-cyan" />
              Skill Matrix
              {showSkills ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showSkills && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-text-dim hover:text-accent-cyan text-xs transition-colors border border-white/8 hover:border-accent-cyan/30"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </motion.button>
            )}
          </div>

          <AnimatePresence>
            {showSkills && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-2.5 max-w-sm mx-auto text-left">
                  {profile.skills.map((skill, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-bg-surface border border-white/8 rounded-lg px-4 py-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
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
                          transition={{ duration: 0.6, delay: 0.1 + i * 0.04 }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col items-center gap-3"
        >
          {/* Sample Run — featured at top */}
          <button
            onClick={handleSampleRun}
            disabled={isLoading}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-accent-purple/20 to-accent-cyan/20 border border-accent-purple/30 text-white font-medium text-sm hover:from-accent-purple/30 hover:to-accent-cyan/30 hover:border-accent-purple/50 transition-all duration-300 disabled:opacity-50"
          >
            <Play className="w-4 h-4 text-accent-purple" />
            Preloaded
          </button>

          {/* Begin Learning */}
          <Button
            onClick={handleBeginLearning}
            disabled={isLoading}
            size="lg"
            className="bg-accent-cyan hover:bg-accent-cyan/90 text-white rounded-xl px-10 py-6 text-base md:text-lg font-medium gap-2 transition-all duration-300"
          >
            {isLoading ? (
              <motion.div
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <>
                Begin Learning
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
