'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mic, Keyboard } from 'lucide-react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { animations } from '@/lib/constants';

export default function OnboardingPage() {
  const router = useRouter();
  const setInputMode = useSessionStore((s) => s.setInputMode);
  const userProfile = useSessionStore((s) => s.userProfile);

  const handleSelect = (mode: 'voice' | 'text') => {
    setInputMode(mode);
    router.push('/chat');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 md:px-6 pt-14">
      <motion.div
        className="text-center mb-12"
        {...animations.fadeInUp}
      >
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-3">
          How would you like to explore?
        </h1>
        <p className="text-text-secondary text-lg">
          {userProfile ? `Welcome, ${userProfile.name}! ` : ''}Choose your preferred way to interact.
        </p>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-6 max-w-2xl w-full">
        {/* Voice Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelect('voice')}
          className="flex-1 bg-bg-surface border border-white/5 rounded-2xl p-6 md:p-10 cursor-pointer group hover:border-accent-purple/30 transition-all duration-300 hover:glow-purple-subtle"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-accent-purple/10 flex items-center justify-center mb-6 group-hover:bg-accent-purple/20 transition-colors">
              <Mic className="w-7 h-7 md:w-10 md:h-10 text-accent-purple" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Voice</h2>
            <p className="text-text-secondary text-sm">
              Talk naturally with Lumora using your microphone
            </p>
            <span className="text-text-dim text-xs mt-4 bg-bg-elevated px-3 py-1 rounded-full">
              Coming soon
            </span>
          </div>
        </motion.div>

        {/* Text Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelect('text')}
          className="flex-1 bg-bg-surface border border-white/5 rounded-2xl p-6 md:p-10 cursor-pointer group hover:border-accent-cyan/30 transition-all duration-300 hover:glow-cyan-subtle"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-accent-cyan/10 flex items-center justify-center mb-6 group-hover:bg-accent-cyan/20 transition-colors">
              <Keyboard className="w-7 h-7 md:w-10 md:h-10 text-accent-cyan" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Text</h2>
            <p className="text-text-secondary text-sm">
              Type your thoughts and chat with Lumora
            </p>
            <span className="text-accent-cyan text-xs mt-4 bg-accent-cyan/10 px-3 py-1 rounded-full">
              Recommended
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
