'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 md:px-6 relative overflow-hidden bg-[#0a0a0a]">
      <motion.div
        className="text-center relative z-10 font-[var(--font-quicksand)]"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Logo image */}
        <motion.div
          className="mx-auto mb-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <Image src="/starlightlogo.png" alt="Lumora" width={140} height={140} className="mx-auto" />
        </motion.div>

        {/* Name */}
        <motion.h1
          className="text-6xl md:text-8xl font-light text-white mb-5"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Lumora
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="text-white/40 text-base md:text-lg font-light mb-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          Illuminate your path to mastery
        </motion.p>

        {/* Lumos button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <button
            onClick={() => router.push('/auth')}
            className="px-14 py-4 rounded-full border border-white/15 text-white/70 font-light text-lg transition-all duration-500 hover:text-white hover:border-white/50 hover:shadow-[0_0_30px_rgba(255,255,255,0.15),0_0_60px_rgba(255,255,255,0.05)] hover:bg-white/[0.03]"
          >
            Lumos
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
