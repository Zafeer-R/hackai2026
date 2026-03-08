'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Mail, Lock, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('alex.chen@email.com');
  const [password, setPassword] = useState('••••••••');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));
    router.push('/welcome');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 md:px-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-accent-cyan/4 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-accent-purple/4 rounded-full blur-[128px] pointer-events-none" />

      <motion.div
        className="w-full max-w-sm relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <motion.div
          className="flex items-center justify-center gap-2 mb-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Image src="/starlightlogo.png" alt="Lumora" width={120} height={120} />
        </motion.div>

        {/* Card */}
        <motion.div
          className="bg-bg-surface border border-white/8 rounded-2xl p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-white mb-1 text-center">Welcome back</h2>
          <p className="text-text-dim text-sm mb-8 text-center">Sign in to continue learning</p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-text-dim text-xs font-medium mb-1.5 block">Email</label>
              <div className="flex items-center gap-3 bg-bg-elevated rounded-xl px-4 py-3 border border-white/5 focus-within:border-accent-cyan/30 transition-colors">
                <Mail className="w-4 h-4 text-text-dim shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent text-text-primary text-sm focus:outline-none placeholder:text-text-dim"
                />
              </div>
            </div>

            <div>
              <label className="text-text-dim text-xs font-medium mb-1.5 block">Password</label>
              <div className="flex items-center gap-3 bg-bg-elevated rounded-xl px-4 py-3 border border-white/5 focus-within:border-accent-cyan/30 transition-colors">
                <Lock className="w-4 h-4 text-text-dim shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent text-text-primary text-sm focus:outline-none placeholder:text-text-dim"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-accent-cyan text-white font-medium text-sm hover:bg-accent-cyan/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <motion.div
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </motion.div>

      </motion.div>
    </div>
  );
}
